/*
 * PORTFOLIO ADDITION — the bridge between a framed program and the shared gallery.
 *
 * Paint and Notepad each save to the fake C: drive on their own (see
 * jspaint/src/browserfs-save.js and notepad/src/file-dialogs.js). This adds the
 * two things they cannot do from inside their iframe:
 *
 *   1. A free file name. "Untitled.png" when the folder is empty, then
 *      "Untitled 1.png", "Untitled 2.png" — the rule every file manager uses,
 *      applied to the *shared* folder, which by then holds everybody's work.
 *   2. Telling the desktop a file was saved, so it can put it in the gallery.
 *      The desktop owns the Supabase credentials, not these static pages, so
 *      the file goes up as a postMessage and React does the request.
 *
 * Both programs are same-origin with the desktop, so postMessage is free and
 * needs no serialisation beyond what structured clone already does. Nothing
 * here throws: a program whose gallery is unreachable still saves normally.
 */

/* global BrowserFS, withFilesystem */

(function () {
	"use strict";

	var DIRS = {
		painting: "/my-documents/paintings",
		note: "/my-documents/notes",
	};

	/** "Untitled 3.png" -> ["Untitled 3", ".png"] */
	function splitName(name) {
		var dot = name.lastIndexOf(".");
		return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
	}

	/**
	 * The same rule as `uniqueName` in src/components/os/communityFiles.ts.
	 * Kept in step by hand: this file cannot import from the React bundle.
	 */
	function uniqueName(desired, taken) {
		var used = {};
		taken.forEach(function (n) {
			used[n.toLowerCase()] = true;
		});
		if (!used[desired.toLowerCase()]) return desired;

		var parts = splitName(desired);
		for (var n = 1; n < 10000; n++) {
			var candidate = parts[0] + " " + n + parts[1];
			if (!used[candidate.toLowerCase()]) return candidate;
		}
		return parts[0] + " " + Date.now() + parts[1];
	}

	/**
	 * Calls back with a name that is not in use in `kind`'s folder. Falls back
	 * to the name asked for if the drive cannot be read — saving under a name
	 * that already exists still prompts before it overwrites anything.
	 */
	function nextFreeName(kind, desired, callback) {
		var dir = DIRS[kind];
		if (!dir || typeof withFilesystem !== "function") return callback(desired);
		try {
			withFilesystem(function () {
				var fs = BrowserFS.BFSRequire("fs");
				fs.readdir(dir, function (error, names) {
					callback(uniqueName(desired, error || !names ? [] : names));
				});
			});
		} catch (e) {
			callback(desired);
		}
	}

	/**
	 * Hands a just-saved file to the desktop for the gallery.
	 *
	 * `content` is a data: URL for a painting and plain text for a note —
	 * whatever the row in `community_files` wants to hold.
	 */
	function publish(kind, name, content) {
		try {
			window.parent.postMessage(
				{ type: "win98:file-saved", kind: kind, name: name, content: content },
				window.location.origin
			);
		} catch (e) {
			/* no parent, or it went away: the local save already happened */
		}
	}

	/** Turns Paint's blob into the data: URL the gallery stores. */
	function blobToDataUrl(blob, callback) {
		try {
			var reader = new FileReader();
			reader.onload = function () {
				callback(String(reader.result));
			};
			reader.onerror = function () {
				callback(null);
			};
			reader.readAsDataURL(blob);
		} catch (e) {
			callback(null);
		}
	}

	/**
	 * Registers what to do when the desktop asks this program to save — the
	 * button in Clippy's balloon. The handler should open the program's own
	 * Save As box, so the visitor still names the file themselves.
	 */
	function onSaveRequest(handler) {
		window.addEventListener("message", function (event) {
			if (event.source !== window.parent) return;
			if (!event.data || event.data.type !== "win98:request-save") return;
			try {
				handler();
			} catch (e) {
				/* the program is mid-something; the menu still works */
			}
		});
	}

	/**
	 * Tells the desktop whether there is anything worth saving, so Clippy can
	 * offer at a sensible moment instead of nagging at an empty canvas.
	 */
	function reportDirty(kind, dirty) {
		try {
			window.parent.postMessage(
				{ type: "win98:dirty", kind: kind, dirty: !!dirty },
				window.location.origin
			);
		} catch (e) {
			/* as above */
		}
	}

	/**
	 * Keeps the desktop's idea of "unsaved work" in step with the program's own.
	 *
	 * Both Paint and Notepad already track a `saved` flag; neither exposes an
	 * event when it changes. Rather than reach into their internals, this reads
	 * the flag on a slow timer and only posts up when the answer is different
	 * from last time. A poll every three-quarters of a second is nothing next to
	 * what either program does per keystroke, and it means the desktop's
	 * "Do you want to save the changes?" box is driven by the program's real
	 * state rather than by a guess.
	 */
	function watchSaved(kind, isSaved) {
		var last = null;
		function check() {
			var dirty;
			try {
				dirty = !isSaved();
			} catch (e) {
				return; // program still starting up
			}
			if (dirty === last) return;
			last = dirty;
			reportDirty(kind, dirty);
		}
		check();
		setInterval(check, 750);
	}

	window.gallery = {
		DIRS: DIRS,
		uniqueName: uniqueName,
		nextFreeName: nextFreeName,
		publish: publish,
		watchSaved: watchSaved,
		blobToDataUrl: blobToDataUrl,
		onSaveRequest: onSaveRequest,
		reportDirty: reportDirty,
	};
})();
