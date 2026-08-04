/*
 * PORTFOLIO ADDITION — Paint saves into My Documents.
 *
 * Out of the box, jspaint's Save As hands the image to the browser and you get
 * a download. That's fine, but it means a picture drawn on this desktop has no
 * address *on* this desktop, and My Computer has nothing to show.
 *
 * jspaint is built for exactly this: `systemHooks` is its documented seam for
 * host integration (its Electron build replaces the same four functions — see
 * `electron-injected.js`). So this replaces them with the Windows 95 file box
 * Notepad already uses, and writes through BrowserFS to the same fake C: drive:
 *
 *   My Documents\Paintings  — /my-documents/paintings, kept in IndexedDB, so
 *                             the file is still there next visit and shows up
 *                             in My Computer > Hard Disk (C:) > My Documents.
 *   This computer           — an ordinary browser download, as before.
 *
 * Everything is built on os-gui's $Window and jQuery, both of which jspaint
 * already loads, so the dialog matches the rest of the desktop.
 */

/* global $, $Window, BrowserFS, withFilesystem, saveAs, show_error_message */

(function () {
	"use strict";

	var PAINTINGS_DIR = "/my-documents/paintings";

	// Kept here rather than in index.html so the whole addition is two files.
	var style = document.createElement("style");
	style.textContent = [
		".paint-file-dialog { display: flex; flex-direction: column; gap: 8px; padding: 10px;",
		"  font-family: 'MS Sans Serif', Arial, sans-serif; font-size: 12px;",
		"  box-sizing: border-box; max-height: calc(100vh - 44px); }",
		".paint-file-dialog .pfd-row { display: flex; align-items: center; gap: 8px; }",
		".paint-file-dialog .pfd-label { width: 84px; flex-shrink: 0; text-align: right; }",
		".paint-file-dialog .pfd-select, .paint-file-dialog .pfd-input {",
		"  flex: 1; min-width: 0; font-family: inherit; font-size: inherit; padding: 2px 3px; }",
		".paint-file-dialog .pfd-list { height: 150px; flex: 1 1 150px; min-height: 44px;",
		"  overflow: auto; background: var(--Window, #fff); padding: 2px; }",
		".paint-file-dialog .pfd-item { display: flex; align-items: center; gap: 6px;",
		"  padding: 2px 4px; cursor: default; user-select: none; }",
		".paint-file-dialog .pfd-item.selected { background: var(--Highlight, #000080);",
		"  color: var(--HighlightText, #fff); }",
		".paint-file-dialog .pfd-item-icon { font-size: 12px; }",
		".paint-file-dialog .pfd-empty { margin: 0; padding: 6px; color: var(--GrayText, #808080); }",
		".paint-file-dialog .pfd-buttons { display: flex; justify-content: flex-end;",
		"  gap: 6px; margin-top: 2px; }",
		".paint-file-dialog .pfd-buttons button { min-width: 75px; height: 23px; }",
	].join("\n");
	document.head.appendChild(style);

	var SAVE_LOCATIONS = [
		{ value: "documents", label: "My Documents\\Paintings (C:)" },
		{ value: "device", label: "This computer (download)" },
	];

	/** Both dialogs list these; anything else on the drive is left alone. */
	var IMAGE_PATTERN = /\.(png|jpe?g|gif|bmp|webp|tiff?|ico)$/i;

	function ensureDir(fs, callback) {
		// One level at a time: BrowserFS has no mkdir -p.
		fs.exists("/my-documents", function (exists) {
			if (exists) return mkPaintings();
			fs.mkdir("/my-documents", function () {
				mkPaintings();
			});
		});
		function mkPaintings() {
			fs.exists(PAINTINGS_DIR, function (exists) {
				if (exists) return callback();
				fs.mkdir(PAINTINGS_DIR, function () {
					callback();
				});
			});
		}
	}

	function listPaintings(callback) {
		withFilesystem(function () {
			var fs = BrowserFS.BFSRequire("fs");
			ensureDir(fs, function () {
				fs.readdir(PAINTINGS_DIR, function (error, names) {
					callback(
						error || !names
							? []
							: names.filter(function (n) {
									return IMAGE_PATTERN.test(n);
							  }).sort()
					);
				});
			});
		});
	}

	function readPainting(path, callback) {
		withFilesystem(function () {
			var fs = BrowserFS.BFSRequire("fs");
			fs.readFile(path, function (error, data) {
				callback(error, data);
			});
		});
	}

	function writePainting(name, blob, callback) {
		var path = PAINTINGS_DIR + "/" + name;
		blob.arrayBuffer().then(function (arrayBuffer) {
			withFilesystem(function () {
				var fs = BrowserFS.BFSRequire("fs");
				var Buffer = BrowserFS.BFSRequire("buffer").Buffer;
				ensureDir(fs, function () {
					fs.writeFile(
						path,
						Buffer.from(new Uint8Array(arrayBuffer)),
						function (error) {
							callback(error, path);
						}
					);
				});
			});
		});
	}

	function invalidNameReason(name) {
		if (!name.trim()) return "You must type a file name.";
		if (/[\\/:*?"<>|]/.test(name)) {
			return 'A file name cannot contain any of the following characters:\n            \\ / : * ? " < > |';
		}
		return null;
	}

	/**
	 * The shared file box. `mode` is "save" or "open"; the save version gets the
	 * location picker and a file type list, the open version reads My Documents
	 * only.
	 */
	function fileDialog(options) {
		var $window = new $Window({
			title: options.title,
			resizable: false,
			maximizeButton: false,
			minimizeButton: false,
			innerWidth: 440,
		});
		$window.$content.addClass("paint-file-dialog-content");

		var $form = $("<form class='paint-file-dialog'>").appendTo($window.$content);
		$form.on("submit", function (e) {
			e.preventDefault();
			submit();
		});

		var $locationRow = $("<div class='pfd-row'>").appendTo($form);
		$("<label class='pfd-label'>")
			.text(options.mode === "save" ? "Save in:" : "Look in:")
			.appendTo($locationRow);
		var $location = $("<select class='pfd-select'>").appendTo($locationRow);
		if (options.mode === "save") {
			SAVE_LOCATIONS.forEach(function (loc) {
				$location.append($("<option>").val(loc.value).text(loc.label));
			});
		} else {
			$location
				.append($("<option>").val("documents").text(SAVE_LOCATIONS[0].label))
				.prop("disabled", true);
		}

		var $list = $("<div class='pfd-list inset-deep' tabindex='0'>").appendTo($form);

		function refreshList() {
			$list.empty();
			if ($location.val() === "device") {
				$list.append(
					$("<p class='pfd-empty'>").text(
						"The picture will be downloaded to wherever your browser puts downloads."
					)
				);
				return;
			}
			$list.append($("<p class='pfd-empty'>").text("Reading…"));
			listPaintings(function (names) {
				$list.empty();
				if (!names.length) {
					$list.append(
						$("<p class='pfd-empty'>").text(
							"This folder is empty. Whatever you save here also shows up in " +
								"My Computer > Hard Disk (C:) > My Documents > Paintings."
						)
					);
					return;
				}
				names.forEach(function (name) {
					var $item = $("<div class='pfd-item'>")
						.attr("tabindex", "0")
						.appendTo($list);
					$("<span class='pfd-item-icon'>").text("🖼").appendTo($item);
					$("<span>").text(name).appendTo($item);
					$item.on("click", function () {
						$list.find(".pfd-item").removeClass("selected");
						$item.addClass("selected");
						$name.val(name);
					});
					$item.on("dblclick", function () {
						$name.val(name);
						submit();
					});
				});
			});
		}

		var $nameRow = $("<div class='pfd-row'>").appendTo($form);
		$("<label class='pfd-label'>").text("File name:").appendTo($nameRow);
		var $name = $("<input type='text' class='pfd-input' spellcheck='false'>")
			.val(options.defaultName || "")
			.appendTo($nameRow);

		var $typeRow = $("<div class='pfd-row'>").appendTo($form);
		$("<label class='pfd-label'>")
			.text(options.mode === "save" ? "Save as type:" : "Files of type:")
			.appendTo($typeRow);
		var $type = $("<select class='pfd-select'>").appendTo($typeRow);
		(options.formats || []).forEach(function (format) {
			$("<option>")
				.val(format.formatID)
				.text(format.name + " (*." + format.extensions.join(", *.") + ")")
				.appendTo($type);
		});
		if (!options.formats || !options.formats.length) {
			$typeRow.hide();
		}

		var $buttons = $("<div class='pfd-buttons'>").appendTo($form);

		function selectedFormat() {
			var id = $type.val();
			return (options.formats || []).find(function (f) {
				return f.formatID === id;
			});
		}

		/** Adds the selected type's extension unless one was typed already. */
		function withExtension(name) {
			var format = selectedFormat();
			if (!format || /\.[a-z0-9]{1,8}$/i.test(name.trim())) return name.trim();
			return name.trim() + "." + format.extensions[0];
		}

		function submit() {
			var typed = $name.val();
			var reason = invalidNameReason(typed);
			if (reason) {
				show_error_message(reason);
				return;
			}
			options.onAction(
				options.mode === "save" ? withExtension(typed) : typed.trim(),
				$location.val(),
				$window,
				selectedFormat()
			);
		}

		$window
			.$Button(options.mode === "save" ? "Save" : "Open", submit)
			.addClass("default")
			.appendTo($buttons);
		$window
			.$Button("Cancel", function () {
				$window.close();
				if (options.onCancel) options.onCancel();
			})
			.appendTo($buttons);

		$location.on("change", refreshList);
		refreshList();
		$window.center();
		setTimeout(function () {
			$name.focus().select();
		}, 0);

		return $window;
	}

	/*
	 * Opening a picture straight from My Computer.
	 *
	 * jspaint already knows how to load a file it was started with — app.js
	 * reads `window.initial_system_file_handle` through `readBlobFromHandle`,
	 * which is one of the hooks below. So a `?path=` on the URL is all this
	 * needs, matching how Notepad is handed a document.
	 */
	var initialPath = new URLSearchParams(location.search).get("path");
	if (initialPath && initialPath.indexOf(PAINTINGS_DIR) === 0) {
		window.initial_system_file_handle = initialPath;
	}

	window.systemHooks = window.systemHooks || {};

	window.systemHooks.showSaveFileDialog = function (options) {
		return new Promise(function (resolve) {
			fileDialog({
				title: "Save As",
				mode: "save",
				defaultName: options.defaultFileName || "Untitled.png",
				formats: options.formats,
				onCancel: resolve,
				onAction: function (name, location, $window, format) {
					if (!format) {
						show_error_message("Choose a file type to save as.");
						return;
					}
					options.getBlob(format.formatID).then(function (blob) {
						if (location === "device") {
							saveAs(blob, name);
							$window.close();
							if (options.savedCallbackUnreliable) {
								options.savedCallbackUnreliable({
									newFileName: name,
									newFileFormatID: format.formatID,
									newBlob: blob,
								});
							}
							resolve();
							return;
						}
						writePainting(name, blob, function (error, path) {
							if (error) {
								show_error_message(
									"Failed to save the picture.",
									error
								);
								return;
							}
							$window.close();
							if (options.savedCallbackUnreliable) {
								options.savedCallbackUnreliable({
									newFileName: name,
									newFileFormatID: format.formatID,
									newFileHandle: path,
									newBlob: blob,
								});
							}
							resolve();
						});
					});
				},
			});
		});
	};

	window.systemHooks.showOpenFileDialog = function (options) {
		return new Promise(function (resolve, reject) {
			fileDialog({
				title: "Open",
				mode: "open",
				defaultName: "",
				formats: options.formats,
				onCancel: function () {
					reject(new Error("user canceled"));
				},
				onAction: function (name, location, $window) {
					var path = PAINTINGS_DIR + "/" + name;
					readPainting(path, function (error, data) {
						if (error || !data) {
							show_error_message(
								name + "\nThis file was not found in My Documents."
							);
							return;
						}
						$window.close();
						resolve({
							file: new File([new Uint8Array(data)], name),
							fileHandle: path,
						});
					});
				},
			});
		});
	};

	/** Save (as opposed to Save As) on a picture already on the drive. */
	window.systemHooks.writeBlobToHandle = function (handle, blob) {
		if (typeof handle !== "string" || handle.indexOf(PAINTINGS_DIR) !== 0) {
			return Promise.resolve(false);
		}
		return new Promise(function (resolve) {
			var name = handle.split("/").pop();
			writePainting(name, blob, function (error) {
				if (error) show_error_message("Failed to save the picture.", error);
				resolve(!error);
			});
		});
	};

	window.systemHooks.readBlobFromHandle = function (handle) {
		if (typeof handle !== "string") return Promise.resolve(undefined);
		return new Promise(function (resolve) {
			readPainting(handle, function (error, data) {
				resolve(
					error || !data
						? undefined
						: new File([new Uint8Array(data)], handle.split("/").pop())
				);
			});
		});
	};
})();
