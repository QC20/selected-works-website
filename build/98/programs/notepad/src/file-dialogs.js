/*
 * PORTFOLIO ADDITION — Notepad's Open / Save As dialogs.
 *
 * Upstream, "Save As" hands the text straight to FileSaver and the browser
 * downloads "Untitled.txt"; you are never asked what to call it. These dialogs
 * put the Windows 98 file box back: a name to type, a place to put it, and a
 * list of what's already there.
 *
 * Two places to save:
 *
 *   My Documents  — /my-documents/ on the fake C: drive. BrowserFS keeps that
 *                   in IndexedDB, so the file is still there next visit and
 *                   Notepad can open it again. It lives in this browser only;
 *                   it is not uploaded anywhere.
 *   This computer — a normal browser download to the real machine.
 *
 * Everything here is built on os-gui's $Window, the same thing 98.js uses for
 * its own dialogs, so it matches the rest of the desktop.
 */

/* global $, $Window, BrowserFS, withFilesystem, saveAs */

// Notes live in their own folder now, alongside My Documents\\Paintings,
// which is what Paint writes into (jspaint/src/browserfs-save.js).
var DOCS_DIR = "/my-documents/notes";

var SAVE_LOCATIONS = [
	{ value: "documents", label: "My Documents\\Notes (C:)", icon: "folder-open" },
	{ value: "device", label: "This computer (download)", icon: "computer" },
];

/** Adds .txt unless the user typed some other extension themselves. */
function with_default_extension(name) {
	var trimmed = name.trim();
	if (!trimmed) return "";
	return /\.[a-z0-9]{1,8}$/i.test(trimmed) ? trimmed : trimmed + ".txt";
}

/** Rejects the characters Windows won't take in a file name. */
function invalid_file_name_reason(name) {
	if (!name.trim()) return "You must type a file name.";
	if (/[\\/:*?"<>|]/.test(name)) {
		return 'A file name cannot contain any of the following characters:\n            \\ / : * ? " < > |';
	}
	return null;
}

function ensure_docs_dir(fs, callback) {
	// One level at a time: BrowserFS has no mkdir -p, and now that notes live in
	// a subfolder the parent may not exist either.
	fs.exists("/my-documents", function (exists) {
		if (exists) return make_notes_dir();
		fs.mkdir("/my-documents", function () {
			make_notes_dir();
		});
	});
	function make_notes_dir() {
		fs.exists(DOCS_DIR, function (exists) {
			if (exists) return callback();
			fs.mkdir(DOCS_DIR, function () {
				// An error here just means someone else made it first.
				callback();
			});
		});
	}
}

/** Lists the .txt-ish files already in My Documents. */
function list_documents(callback) {
	withFilesystem(function () {
		var fs = BrowserFS.BFSRequire("fs");
		ensure_docs_dir(fs, function () {
			fs.readdir(DOCS_DIR, function (error, names) {
				if (error || !names) return callback([]);
				callback(
					names.filter(function (n) {
						return !n.startsWith(".");
					}).sort()
				);
			});
		});
	});
}

/**
 * The shared shell for both dialogs: title bar, "Look/Save in" combo, the file
 * list, a File name row and the two buttons.
 *
 * @param {object} options
 * @param {string} options.title
 * @param {string} options.locationLabel   "Save in:" or "Look in:"
 * @param {string} options.actionLabel     "Save" or "Open"
 * @param {string} [options.defaultName]
 * @param {boolean} [options.showLocations] false for Open, which only reads My Documents
 * @param {(name: string, location: string, $window: any) => void} options.onAction
 */
function show_file_dialog(options) {
	var $window = new $Window({
		title: options.title,
		icons: {
			16: "../../images/icons/notepad-16x16.png",
			32: "../../images/icons/notepad-32x32.png",
		},
		resizable: false,
		maximizeButton: false,
		minimizeButton: false,
		innerWidth: 420,
	});
	$window.$content.addClass("file-dialog-content");

	var $form = $("<form class='file-dialog'>").appendTo($window.$content);
	$form.on("submit", function (e) {
		e.preventDefault();
		submit();
	});

	// --- Save in / Look in -------------------------------------------------
	var $locationRow = $("<div class='fd-row'>").appendTo($form);
	$("<label class='fd-label'>").text(options.locationLabel).appendTo($locationRow);
	var $location = $("<select class='fd-select'>").appendTo($locationRow);
	if (options.showLocations === false) {
		$location.append(
			$("<option>").val("documents").text(SAVE_LOCATIONS[0].label)
		);
		$location.prop("disabled", true);
	} else {
		SAVE_LOCATIONS.forEach(function (loc) {
			$location.append($("<option>").val(loc.value).text(loc.label));
		});
	}

	// --- The list of what's already there ----------------------------------
	var $list = $("<div class='fd-list inset-deep' tabindex='0'>").appendTo($form);

	function refresh_list() {
		$list.empty();
		if ($location.val() === "device") {
			$list.append(
				$("<p class='fd-empty'>").text(
					"The file will be downloaded to wherever your browser puts downloads."
				)
			);
			return;
		}
		$list.append($("<p class='fd-empty'>").text("Reading…"));
		list_documents(function (names) {
			$list.empty();
			if (!names.length) {
				$list.append(
					$("<p class='fd-empty'>").text(
						"This folder is empty. Whatever you save here also shows " +
							"up in My Computer > Hard Disk (C:) > My Documents > Notes."
					)
				);
				return;
			}
			names.forEach(function (name) {
				var $item = $("<div class='fd-item'>")
					.attr("tabindex", "0")
					.appendTo($list);
				$("<img width='16' height='16'>")
					.attr("src", "../../images/icons/notepad-file-16x16.png")
					.appendTo($item);
				$("<span>").text(name).appendTo($item);
				$item.on("click", function () {
					$list.find(".fd-item").removeClass("selected");
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

	// --- File name ---------------------------------------------------------
	var $nameRow = $("<div class='fd-row'>").appendTo($form);
	$("<label class='fd-label'>").text("File name:").appendTo($nameRow);
	var $name = $("<input type='text' class='fd-input' spellcheck='false'>")
		.val(options.defaultName || "")
		.appendTo($nameRow);

	var $typeRow = $("<div class='fd-row'>").appendTo($form);
	$("<label class='fd-label'>").text("Save as type:").appendTo($typeRow);
	var $type = $("<select class='fd-select'>").appendTo($typeRow);
	$type.append($("<option>").val("txt").text("Text Documents (*.txt)"));
	$type.append($("<option>").val("all").text("All Files (*.*)"));
	if (options.actionLabel === "Open") {
		$typeRow.find(".fd-label").text("Files of type:");
	}

	// --- Buttons -----------------------------------------------------------
	var $buttons = $("<div class='fd-buttons'>").appendTo($form);

	function submit() {
		var typed = $name.val();
		var reason = invalid_file_name_reason(typed);
		if (reason) {
			showMessageBox({
				title: options.title,
				message: reason,
				iconID: "warning",
			});
			return;
		}
		var final_name =
			$type.val() === "all" ? typed.trim() : with_default_extension(typed);
		options.onAction(final_name, $location.val(), $window);
	}

	var $action = $window.$Button(options.actionLabel, submit);
	$action.addClass("default").appendTo($buttons);
	$window.$Button("Cancel", function () {
		$window.close();
	}).appendTo($buttons);

	$location.on("change", refresh_list);
	refresh_list();

	$window.center();
	setTimeout(function () {
		$name.focus().select();
	}, 0);

	return { $window: $window, $name: $name, refresh: refresh_list };
}

/**
 * Save As. Calls `on_saved(name, location)` once the file is written or the
 * download has been handed to the browser.
 */
function show_save_as_dialog(default_name, content, on_saved) {
	var dialog = show_file_dialog({
		title: "Save As",
		locationLabel: "Save in:",
		actionLabel: "Save",
		defaultName: default_name,
		onAction: function (name, location, $window) {
			if (location === "device") {
				// Plain "text/plain" on purpose: FileSaver prepends a UTF-8 BOM
				// whenever the type carries a charset, which shows up as a stray
				// character at the top of the file in a lot of editors.
				saveAs(new Blob([content], { type: "text/plain" }), name);
				$window.close();
				on_saved(name, location);
				return;
			}

			var path = DOCS_DIR + "/" + name;
			withFilesystem(function () {
				var fs = BrowserFS.BFSRequire("fs");
				ensure_docs_dir(fs, function () {
					fs.exists(path, function (exists) {
						if (!exists) return write();
						showMessageBox({
							title: "Save As",
							message:
								name +
								" already exists.\nDo you want to replace it?",
							iconID: "warning",
							buttons: [
								{ label: "Yes", value: "yes", default: true },
								{ label: "No", value: "no" },
							],
						}).then(function (answer) {
							if (answer === "yes") write();
						});
					});

					function write() {
						fs.writeFile(path, content, "utf8", function (error) {
							if (error) {
								showMessageBox({
									title: "Save As",
									message: "Failed to save file: " + error,
									iconID: "error",
								});
								return;
							}
							$window.close();
							on_saved(name, location, path);
						});
					}
				});
			});
		},
	});
	return dialog;
}

/** Open, reading from My Documents. Calls `on_opened(name, content, path)`. */
function show_open_dialog(on_opened) {
	show_file_dialog({
		title: "Open",
		locationLabel: "Look in:",
		actionLabel: "Open",
		showLocations: false,
		onAction: function (name, location, $window) {
			var path = DOCS_DIR + "/" + name;
			withFilesystem(function () {
				var fs = BrowserFS.BFSRequire("fs");
				fs.readFile(path, "utf8", function (error, content) {
					if (error) {
						showMessageBox({
							title: "Open",
							message:
								name +
								"\nThis file was not found in My Documents.\nCheck the file name and try again.",
							iconID: "warning",
						});
						return;
					}
					$window.close();
					on_opened(name, content, path);
				});
			});
		},
	});
}
