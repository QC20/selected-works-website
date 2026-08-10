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

	/*
	 * jspaint brings its own layout CSS, and some of it applies to any element
	 * inside a window — which flattened this dialog into a single row the first
	 * time it was tried. Structure is therefore set inline (see `layout` below),
	 * where a stylesheet can't reach it; only cosmetics live in this sheet.
	 */
	var style = document.createElement("style");
	style.textContent = [
		".paint-file-dialog .pfd-item.selected { background: var(--Highlight, #000080);",
		"  color: var(--HighlightText, #fff); }",
		".paint-file-dialog .pfd-empty { color: var(--GrayText, #808080); }",
	].join("\n");
	document.head.appendChild(style);

	/** Inline layout, applied with jQuery so host CSS cannot override it. */
	var layout = {
		form: {
			display: "flex",
			flexDirection: "column",
			gap: "8px",
			padding: "10px",
			fontFamily: "'MS Sans Serif', Arial, sans-serif",
			fontSize: "12px",
			boxSizing: "border-box",
			maxHeight: "calc(100vh - 44px)",
		},
		row: { display: "flex", alignItems: "center", gap: "8px", flex: "0 0 auto" },
		label: { width: "84px", flexShrink: 0, textAlign: "right" },
		field: { flex: "1 1 auto", minWidth: 0, font: "inherit", padding: "2px 3px" },
		list: {
			display: "block",
			height: "150px",
			flex: "1 1 150px",
			minHeight: "44px",
			overflow: "auto",
			background: "var(--Window, #fff)",
			padding: "2px",
		},
		item: {
			display: "flex",
			alignItems: "center",
			gap: "6px",
			padding: "2px 4px",
			cursor: "default",
			userSelect: "none",
		},
		empty: { margin: 0, padding: "6px" },
		buttons: {
			display: "flex",
			justifyContent: "flex-end",
			gap: "6px",
			marginTop: "2px",
			flex: "0 0 auto",
		},
	};

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

	/**
	 * Sends a saved picture up to the shared gallery, so it turns up in
	 * everyone else's Paintings folder too. Local saving has already happened
	 * by the time this runs, so a failure here costs nothing.
	 */
	function publishPainting(name, blob) {
		if (!window.gallery) return;
		window.gallery.blobToDataUrl(blob, function (dataUrl) {
			if (!dataUrl) return;
			/*
			 * jspaint's blobs often carry no type, so FileReader labels them
			 * "application/octet-stream". Decoding does not care, but a row in
			 * the gallery is much more useful if its data: URL can simply be
			 * pasted into an address bar — so the real type goes back on, taken
			 * from the extension the file was saved under.
			 */
			var ext = (name.split(".").pop() || "png").toLowerCase();
			var mime =
				ext === "jpg" || ext === "jpeg"
					? "image/jpeg"
					: ext === "gif"
					? "image/gif"
					: ext === "bmp"
					? "image/bmp"
					: ext === "webp"
					? "image/webp"
					: "image/png";
			var comma = dataUrl.indexOf(",");
			if (comma > 0) {
				dataUrl = "data:" + mime + ";base64," + dataUrl.slice(comma + 1);
			}
			window.gallery.publish("painting", name, dataUrl);
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

		var $form = $("<form class='paint-file-dialog'>")
			.css(layout.form)
			.appendTo($window.$content);
		$form.on("submit", function (e) {
			e.preventDefault();
			submit();
		});

		var $locationRow = $("<div class='pfd-row'>").css(layout.row).appendTo($form);
		$("<label class='pfd-label'>")
			.text(options.mode === "save" ? "Save in:" : "Look in:")
			.css(layout.label)
			.appendTo($locationRow);
		var $location = $("<select class='pfd-select'>")
			.css(layout.field)
			.appendTo($locationRow);
		if (options.mode === "save") {
			SAVE_LOCATIONS.forEach(function (loc) {
				$location.append($("<option>").val(loc.value).text(loc.label));
			});
		} else {
			$location
				.append($("<option>").val("documents").text(SAVE_LOCATIONS[0].label))
				.prop("disabled", true);
		}

		var $list = $("<div class='pfd-list inset-deep' tabindex='0'>")
			.css(layout.list)
			.appendTo($form);

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
						$("<p class='pfd-empty'>")
							.css(layout.empty)
							.text(
								"This folder is empty. Whatever you save here also shows up " +
									"in My Computer > Hard Disk (C:) > My Documents > Paintings."
							)
					);
					return;
				}
				names.forEach(function (name) {
					var $item = $("<div class='pfd-item'>")
						.attr("tabindex", "0")
						.css(layout.item)
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

		var $nameRow = $("<div class='pfd-row'>").css(layout.row).appendTo($form);
		$("<label class='pfd-label'>")
			.text("File name:")
			.css(layout.label)
			.appendTo($nameRow);
		var $name = $("<input type='text' class='pfd-input' spellcheck='false'>")
			.val(options.defaultName || "")
			.css(layout.field)
			.appendTo($nameRow);

		var $typeRow = $("<div class='pfd-row'>").css(layout.row).appendTo($form);
		$("<label class='pfd-label'>")
			.text(options.mode === "save" ? "Save as type:" : "Files of type:")
			.css(layout.label)
			.appendTo($typeRow);
		var $type = $("<select class='pfd-select'>").css(layout.field).appendTo($typeRow);
		(options.formats || []).forEach(function (format) {
			$("<option>")
				.val(format.formatID)
				.text(format.name + " (*." + format.extensions.join(", *.") + ")")
				.appendTo($type);
		});
		if (!options.formats || !options.formats.length) {
			$typeRow.hide();
		}

		var $buttons = $("<div class='pfd-buttons'>").css(layout.buttons).appendTo($form);

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
			/*
			 * The name the box opens with. Paint suggests "Untitled" (in the
			 * browser's language — Danish gets "Ikke-navngivet"), and since the
			 * Paintings folder is shared and already full of other people's
			 * work, that suggestion is usually taken. Count up to the first
			 * free one, the way a file manager does.
			 *
			 * The extension has to go on *before* the comparison: jspaint's
			 * suggestion has none, everything in the folder does, and without
			 * this "Untitled" never matches "Untitled.png" and the dedupe
			 * silently does nothing.
			 */
			var suggested = options.defaultFileName || "Untitled";
			if (
				!/\.[a-z0-9]{1,8}$/i.test(suggested) &&
				options.formats &&
				options.formats.length
			) {
				// The first format is the one the dialog preselects.
				suggested += "." + options.formats[0].extensions[0];
			}
			var pickName = window.gallery
				? function (cb) {
						window.gallery.nextFreeName("painting", suggested, cb);
				  }
				: function (cb) {
						cb(suggested);
				  };

			pickName(function (defaultName) {
				fileDialog({
					title: "Save As",
					mode: "save",
					defaultName: defaultName,
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
								publishPainting(name, blob);
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
				// Re-saving an existing picture posts the new version rather
				// than replacing the old row: the gallery is append-only (the
				// anon key has no update policy), so both revisions survive.
				if (!error) publishPainting(name, blob);
				resolve(!error);
			});
		});
	};

	/*
	 * "Save this drawing" in Clippy's balloon.
	 *
	 * jspaint is built as ES modules, so `file_save_as` is not a global the way
	 * Notepad's is. Importing the module again is free: the browser hands back
	 * the instance already running, so this drives the same Save As the File
	 * menu does rather than a second copy of the app's state.
	 *
	 * The URL is absolute because dynamic import from a classic script resolves
	 * against the document, and this file is shared between programs.
	 */
	if (window.gallery) {
		window.gallery.onSaveRequest(function () {
			import("/98/programs/jspaint/src/functions.js")
				.then(function (module) {
					if (module && typeof module.file_save_as === "function") {
						module.file_save_as();
					}
				})
				.catch(function () {
					/* File > Save As still works */
				});
		});
	}

	/*
	 * Paint calls `window.setDocumentEdited` every time its `saved` flag moves
	 * (see functions.js) — a hook meant for a host application, which is
	 * exactly what this desktop is. Cheaper and more accurate than polling, so
	 * it is used here in preference to `gallery.watchSaved`.
	 */
	if (window.gallery) {
		var previousSetDocumentEdited = window.setDocumentEdited;
		window.setDocumentEdited = function (edited) {
			window.gallery.reportDirty("painting", edited);
			if (previousSetDocumentEdited) previousSetDocumentEdited(edited);
		};
	}

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
