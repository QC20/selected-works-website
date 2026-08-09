/**
 * Documents, out in the rest of the machine.
 * ------------------------------------------
 * Notes and paintings live in My Documents, but a file you cannot pick up and
 * put somewhere is not really a file — it's a row in a list. This is what makes
 * them behave: drag one out of the folder onto the desktop and it *moves*, drop
 * it on the Recycle Bin and it goes in the bin, empty the bin and it is gone.
 *
 * Two things are kept in step, and every function here moves both:
 *
 *   the drive   `win98fs` — the file itself, in `/my-documents/notes`,
 *               `/my-documents/paintings`, `/desktop` or `/recycled`. This is
 *               the one that is true; Notepad and Paint read the same drive.
 *   the icons   `desktopFiles` — what you can see and drag. Document icons are
 *               never written to localStorage, so they last exactly as long as
 *               the visit.
 *
 * Which gives the rule the desktop is supposed to follow: **the folders are the
 * only places a document can spend the night.** Leave one on the desktop, or
 * sitting in an un-emptied bin, and the next visit finds it back in Notes or
 * Paintings where it belongs (`reclaimStrayDocuments`). Nothing is lost by
 * wandering off; nothing is deleted except on purpose.
 */

import { IconName } from '../../assets/icons';
import {
    DESKTOP_DIR,
    RECYCLED_DIR,
    Win98File,
    baseName,
    deleteDocument,
    listDocuments,
    moveDocument,
} from './win98fs';
import {
    FileKind,
    directoryFor,
    rememberDeleted,
    uniqueName,
} from './communityFiles';
import {
    DesktopFile,
    addFile,
    defaultBinPosition,
    emptyRecycleBin,
    filesIn,
    moveToRecycleBin,
    removeFile,
    restoreToDesktop,
    updateFile,
} from './desktopFiles';
import { IconPos } from './iconPositions';

/**
 * Whether anything might be sitting outside its folder.
 *
 * Only set once a visitor actually drags a document somewhere, and only read at
 * boot. It exists so the tidy-up sweep — which has to open the drive, and
 * opening the drive means fetching 800KB of BrowserFS — never runs for the many
 * visitors who never touch Notepad or Paint at all.
 */
const STRAY_FLAG = 'win98fs.strays.v1';

const markStrays = (): void => {
    try {
        localStorage.setItem(STRAY_FLAG, '1');
    } catch {
        /* storage disabled: the sweep just won't run next time */
    }
};

const hasStrays = (): boolean => {
    try {
        return localStorage.getItem(STRAY_FLAG) === '1';
    } catch {
        return false;
    }
};

const clearStrays = (): void => {
    try {
        localStorage.removeItem(STRAY_FLAG);
    } catch {
        /* as above */
    }
};

/**
 * Anyone who is showing a folder listing and would like to know it has gone
 * stale. A document can leave a folder from somewhere the folder cannot see —
 * dropped in the bin from the desktop, or put back from a right-click menu —
 * and My Computer subscribes to this so an open window agrees with the drive.
 */
const watchers = new Set<() => void>();

export function watchDrive(onChange: () => void): () => void {
    watchers.add(onChange);
    return () => {
        watchers.delete(onChange);
    };
}

const driveChanged = (): void => {
    watchers.forEach((fn) => fn());
};

/** A painting or a note, going by the extension the program gave it. */
export const kindForName = (name: string): FileKind =>
    /\.(png|jpe?g|gif|bmp|webp)$/i.test(name) ? 'painting' : 'note';

const iconFor = (kind: FileKind): IconName =>
    kind === 'painting' ? 'paintIcon' : 'notepadIcon';

/** Stable across every move, so an icon keeps its identity as it travels. */
const idFor = (file: Win98File): string => `doc:${file.path}`;

/**
 * Moves a file into a folder, giving it a free name if something of that name
 * is already in there. That happens for real: drag "Untitled.png" out onto the
 * desktop, and the shared gallery can perfectly well hand you a different
 * "Untitled.png" for the folder before you put yours back.
 */
async function moveInto(
    from: string,
    directory: string
): Promise<string> {
    const name = baseName(from);
    if (from === `${directory}/${name}`) return from;
    const existing = await listDocuments(directory).catch(() => []);
    return moveDocument(
        from,
        directory,
        uniqueName(
            name,
            existing.map((f) => f.name)
        )
    );
}

/** Keeps the icon pointing at wherever the file actually ended up. */
const followMove = (id: string, doc: DesktopFile['doc'], path: string): void => {
    if (!doc) return;
    updateFile(id, { doc: { ...doc, path }, name: baseName(path) });
    driveChanged();
};

// ---- Out of the folder -------------------------------------------------------

/**
 * Carries a document out of My Documents and drops it on the desktop.
 *
 * The move is awaited rather than fired off, so the icon only appears once the
 * file has really left the folder — an icon on the desktop for a file still
 * listed in Notes would be the desktop telling two different stories.
 */
export async function takeDocumentToDesktop(
    file: Win98File,
    at: IconPos
): Promise<string> {
    const kind = kindForName(file.name);
    const id = idFor(file);
    const path = await moveInto(file.path, DESKTOP_DIR);
    markStrays();
    addFile({
        id,
        name: baseName(path),
        icon: iconFor(kind),
        // The folder counts in KB, and anything non-empty takes at least one.
        size: Math.max(1, Math.round(file.size / 1024)),
        location: 'desktop',
        desktopPos: at,
        binPos: defaultBinPosition(filesIn('recycleBin').length),
        doc: { path, kind, home: directoryFor(kind), restoreTo: 'folder' },
    });
    driveChanged();
    return id;
}

/**
 * Throws a document straight from its folder into the Recycle Bin, without it
 * ever having been on the desktop. Restore puts it back in the folder.
 */
export async function takeDocumentToBin(file: Win98File): Promise<void> {
    const kind = kindForName(file.name);
    const id = idFor(file);
    const path = await moveInto(file.path, RECYCLED_DIR);
    markStrays();
    addFile({
        id,
        name: baseName(path),
        icon: iconFor(kind),
        size: Math.max(1, Math.round(file.size / 1024)),
        location: 'recycleBin',
        desktopPos: { x: 0, y: 0 },
        binPos: defaultBinPosition(filesIn('recycleBin').length),
        doc: { path, kind, home: directoryFor(kind), restoreTo: 'folder' },
    });
    driveChanged();
}

// ---- Around the desktop ------------------------------------------------------

/**
 * Into the bin. The icon moves at once and the file follows: a drag that waited
 * on IndexedDB before the icon left your hand would feel broken even at 10ms.
 */
export function binFile(file: DesktopFile): void {
    moveToRecycleBin(file.id);
    if (!file.doc) return;
    // Remember where it was thrown away from, which is where Restore returns it.
    const restoreTo = file.location === 'desktop' ? 'desktop' : file.doc.restoreTo;
    const doc = { ...file.doc, restoreTo };
    updateFile(file.id, { doc });
    markStrays();
    moveInto(file.doc.path, RECYCLED_DIR)
        .then((path) => followMove(file.id, doc, path))
        .catch(() => undefined);
}

/** Out of the bin, to wherever it was thrown away from. */
export function restoreFile(file: DesktopFile, at?: IconPos): void {
    if (!file.doc) {
        restoreToDesktop(file.id, at);
        return;
    }
    if (at || file.doc.restoreTo === 'desktop') {
        restoreToDesktop(file.id, at);
        moveInto(file.doc.path, DESKTOP_DIR)
            .then((path) => followMove(file.id, file.doc, path))
            .catch(() => undefined);
        return;
    }
    sendDocumentHome(file);
}

/**
 * Back into My Documents. The icon goes away because the file is no longer out
 * here — it is in Notes, or in Paintings, and that folder will list it.
 */
export function sendDocumentHome(file: DesktopFile): void {
    if (!file.doc) return;
    removeFile(file.id);
    moveInto(file.doc.path, file.doc.home)
        .then(driveChanged)
        .catch(() => undefined);
}

// ---- Gone for good -----------------------------------------------------------

/** Unlinks the file behind an icon, if there is one, and marks it deleted. */
function destroy(file: DesktopFile): void {
    if (!file.doc) return;
    rememberDeleted(file.doc.kind, file.name);
    deleteDocument(file.doc.path).then(driveChanged, () => undefined);
}

/** Delete, on one file in the bin. */
export function deleteForever(file: DesktopFile): void {
    destroy(file);
    removeFile(file.id);
}

/** Empty Recycle Bin. This is the only thing on the machine that really deletes. */
export function emptyBin(): void {
    filesIn('recycleBin').forEach(destroy);
    emptyRecycleBin();
}

// ---- Tidying up --------------------------------------------------------------

/**
 * Walks anything left on the desktop or in the bin back to its own folder.
 *
 * This is the other half of "the folders are the only places a document can
 * spend the night", and it runs before My Documents is ever listed, so a
 * visitor who left a note on the desktop last week finds it in Notes today
 * rather than nowhere at all.
 */
let sweep: Promise<void> | null = null;

export function reclaimStrayDocuments(): Promise<void> {
    if (sweep) return sweep;
    if (!hasStrays()) {
        sweep = Promise.resolve();
        return sweep;
    }
    clearStrays();
    sweep = (async () => {
        for (const directory of [DESKTOP_DIR, RECYCLED_DIR]) {
            const strays = await listDocuments(directory).catch(() => []);
            for (const stray of strays) {
                await moveInto(
                    stray.path,
                    directoryFor(kindForName(stray.name))
                ).catch(() => undefined);
            }
        }
    })();
    return sweep;
}
