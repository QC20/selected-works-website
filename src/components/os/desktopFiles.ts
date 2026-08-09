/**
 * Desktop files.
 * --------------
 * The *documents* on this desktop, as opposed to the app shortcuts in
 * `Desktop.tsx`'s APPLICATIONS map. A file is the same object whether it is
 * sitting on the desktop or inside the Recycle Bin — only its `location`
 * changes — which is what lets you drag one out of the bin and have it land on
 * the desktop, the way Windows 95 actually behaves.
 *
 * Modelled on the `desktopIcon` / `folderId` array in Yute (Yuteoctober)'s
 * Windows95 Portfolio, adapted to this codebase.
 *
 * This is a module-level store rather than React state because the Recycle Bin
 * window and the desktop render in different trees and both need to read and
 * write the same list. `useDesktopFiles()` subscribes a component to it.
 */

import { useEffect, useState } from 'react';
import { IconName } from '../../assets/icons';
import { IconPos } from './iconPositions';

export type FileLocation = 'desktop' | 'recycleBin';

/**
 * A file icon that stands for a real file on the fake C: drive — something the
 * visitor wrote in Notepad or drew in Paint, carried out of My Documents.
 *
 * The drive is the truth; this is only the icon's half of it. See
 * `documentFiles.ts`, which moves the two in step.
 */
export interface DocumentRef {
    /** Where the file is *now*, which changes as it is moved about. */
    path: string;
    kind: 'note' | 'painting';
    /** Which folder it belongs to when it goes home. */
    home: string;
    /** Where Restore puts it back: out on the desktop, or in its folder. */
    restoreTo: 'desktop' | 'folder';
}

export interface DesktopFile {
    id: string;
    /** Shown under the icon and in the picture viewer's title bar. */
    name: string;
    icon: IconName;
    /** Kilobytes — the Recycle Bin's status bar totals these up. */
    size: number;
    location: FileLocation;
    /** Position on the desktop, in desktop (scaled) coordinates. */
    desktopPos: IconPos;
    /** Position inside the Recycle Bin window, relative to its content box. */
    binPos: IconPos;
    /** Set for image files: opens in the picture viewer on double-click. */
    image?: string;
    /**
     * Set when this icon is a document out of My Documents. Its presence is
     * also what keeps the icon out of localStorage — see `persist`.
     */
    doc?: DocumentRef;
}

const KEY = 'desktopFiles.v1';

/** Icon spacing inside the Recycle Bin window (matches the desktop's feel). */
export const BIN_GRID = { w: 74, h: 78, perRow: 5, padX: 8, padY: 8 };

/** Where a bin icon sits before anyone drags it: left-to-right, then wrap. */
export const defaultBinPosition = (index: number): IconPos => ({
    x: BIN_GRID.padX + (index % BIN_GRID.perRow) * BIN_GRID.w,
    y: BIN_GRID.padY + Math.floor(index / BIN_GRID.perRow) * BIN_GRID.h,
});

/**
 * The one file this desktop ships with — an old photo that has been "thrown
 * away". Point `image` at any asset under src/assets/pictures to swap it.
 */
const seedFiles = (): DesktopFile[] => [
    {
        id: 'old-picture-of-me',
        name: 'old picture of me.jpg',
        icon: 'jpegIcon',
        size: 245,
        location: 'recycleBin',
        desktopPos: { x: 148, y: 312 },
        binPos: defaultBinPosition(0),
        image: require('../../assets/pictures/meDJing1.JPG'),
    },
];

let files: DesktopFile[] = load();
const listeners = new Set<() => void>();

function load(): DesktopFile[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return seedFiles();
        const stored = JSON.parse(raw) as DesktopFile[];
        if (!Array.isArray(stored)) return seedFiles();
        // Bundled asset URLs are content-hashed, so a stored `image` goes stale
        // on every rebuild. Take it from the seed instead of from storage.
        const seeds = seedFiles();
        return stored.map((file) => {
            const seed = seeds.find((s) => s.id === file.id);
            return seed ? { ...file, image: seed.image } : file;
        });
    } catch {
        return seedFiles();
    }
}

function persist(): void {
    try {
        // Document icons are deliberately left out. A note or a painting is
        // only ever *visiting* the desktop — the drive says it lives in My
        // Documents, and on the next visit that is where it will be found (see
        // `reclaimStrayDocuments`). Writing its icon down here would leave a
        // shortcut pointing at a file that had already walked home.
        localStorage.setItem(
            KEY,
            JSON.stringify(files.filter((f) => !f.doc))
        );
    } catch {
        /* storage full / disabled — the layout just won't survive a reload */
    }
}

export function getFiles(): DesktopFile[] {
    return files;
}

export function filesIn(location: FileLocation): DesktopFile[] {
    return files.filter((f) => f.location === location);
}

/** Replace the list and tell every subscribed component to re-render. */
function commit(next: DesktopFile[]): void {
    files = next;
    persist();
    listeners.forEach((fn) => fn());
}

export function updateFile(id: string, patch: Partial<DesktopFile>): void {
    commit(files.map((f) => (f.id === id ? { ...f, ...patch } : f)));
}

/** Puts a new icon on the desktop. A repeat id replaces what was there. */
export function addFile(file: DesktopFile): void {
    commit(files.filter((f) => f.id !== file.id).concat(file));
}

/**
 * Takes an icon off the desktop without deleting anything. Used when a document
 * goes back to My Documents: the file is fine, it just isn't out here any more.
 */
export function removeFile(id: string): void {
    commit(files.filter((f) => f.id !== id));
}

/** Move a file to the desktop, landing it where it was dropped. */
export function restoreToDesktop(id: string, at?: IconPos): void {
    updateFile(id, at ? { location: 'desktop', desktopPos: at } : { location: 'desktop' });
}

/** Move a file into the Recycle Bin, parking it in the first free grid slot. */
export function moveToRecycleBin(id: string): void {
    const taken = filesIn('recycleBin').length;
    updateFile(id, { location: 'recycleBin', binPos: defaultBinPosition(taken) });
}

/** Permanently delete everything in the bin. */
export function emptyRecycleBin(): void {
    commit(files.filter((f) => f.location !== 'recycleBin'));
}

/** Subscribe a component to the store. */
export function useDesktopFiles(): DesktopFile[] {
    const [, forceRender] = useState(0);
    useEffect(() => {
        const listener = () => forceRender((n) => n + 1);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return files;
}
