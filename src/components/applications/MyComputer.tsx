import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { IconName } from '../../assets/icons';
import pictures from '../os/pictures';
import { PROGRAMS_CONTENTS } from './ProgramsFolder';
import { GAMES } from './games';
import { IE_FAVORITES, FAVORITE_ICONS } from '../os/websites';
import {
    NOTES_DIR,
    PAINTINGS_DIR,
    Win98File,
    documentObjectUrl,
    downloadDocument,
    listDocuments,
    seedDocuments,
} from '../os/win98fs';
import { syncCommunityFiles } from '../os/communityFiles';
import {
    reclaimStrayDocuments,
    takeDocumentToBin,
    watchDrive,
} from '../os/documentFiles';

/**
 * My Computer — one window that browses a small fake filesystem, modelled on
 * the equivalent in Yute (Yuteoctober)'s Windows95 Portfolio.
 *
 * Everything lives in one window rather than spawning a new one per folder:
 * `location` is the folder you're looking at, `history` is the Back stack, and
 * the Address combo box jumps straight to any node. That's what makes the
 * toolbar buttons meaningful — Back, Up one level, and the drop-down all
 * navigate the same view.
 *
 *   My Computer
 *   ├── Hard Disk (C:) → Programs     → Paint, Notepad, Solitaire, …
 *   │                  → Games        → every game on the machine
 *   │                  → My Documents → Notes     (what Notepad saved)
 *   │                                 → Paintings (what Paint saved)
 *   │                  → Pictures     → 19 photos, shipped with the build
 *   │                  → Favorites    → the sites Start > Projects/Resume open
 *   ├── Hard Disk (D:) → Utility      → Market Watch, Task Manager,
 *   │                                   Patch Notes, Reset Storage
 *   │                  → Control Panel → Display, System, Add/Remove Programs, Run
 *   └── CD-ROM (empty)
 *
 * Notes and Paintings are the only folders whose contents aren't known up
 * front: they show what Notepad and Paint have actually written to the fake C:
 * drive, read out of the same BrowserFS store the programs write to (see
 * `win98fs.ts`). Pictures is deliberately separate — those are photographs
 * shipped with the build, not the visitor's own work.
 */

/** A node you can navigate into. */
type FolderId =
    | 'myComputer'
    | 'diskC'
    | 'diskD'
    | 'cdRom'
    | 'programs'
    | 'games'
    | 'pictures'
    | 'myDocuments'
    | 'notes'
    | 'paintings'
    | 'favorites'
    | 'utility'
    | 'controlPanel';

interface FolderDef {
    id: FolderId;
    label: string;
    icon: IconName;
    parent: FolderId | null;
    /** How deep to indent this entry in the Address drop-down. */
    depth: number;
}

const FOLDERS: FolderDef[] = [
    { id: 'myComputer', label: 'My Computer', icon: 'myComputerIcon', parent: null, depth: 0 },
    { id: 'diskC', label: 'Hard Disk (C:)', icon: 'hardDriveIcon', parent: 'myComputer', depth: 1 },
    { id: 'programs', label: 'Programs', icon: 'programsFolderIcon', parent: 'diskC', depth: 2 },
    { id: 'games', label: 'Games', icon: 'gamesFolderIcon', parent: 'diskC', depth: 2 },
    { id: 'myDocuments', label: 'My Documents', icon: 'folderIcon', parent: 'diskC', depth: 2 },
    { id: 'notes', label: 'Notes', icon: 'folderIcon', parent: 'myDocuments', depth: 3 },
    { id: 'paintings', label: 'Paintings', icon: 'folderIcon', parent: 'myDocuments', depth: 3 },
    { id: 'pictures', label: 'Pictures', icon: 'folderIcon', parent: 'diskC', depth: 2 },
    { id: 'favorites', label: 'Favorites', icon: 'favoritesFolderIcon', parent: 'diskC', depth: 2 },
    { id: 'diskD', label: 'Hard Disk (D:)', icon: 'hardDriveIcon', parent: 'myComputer', depth: 1 },
    { id: 'utility', label: 'Utility', icon: 'folderIcon', parent: 'diskD', depth: 2 },
    { id: 'controlPanel', label: 'Control Panel', icon: 'controlPanelFolderIcon', parent: 'diskD', depth: 2 },
    { id: 'cdRom', label: 'CD-ROM', icon: 'cdRomIcon', parent: 'myComputer', depth: 1 },
];

const folderById = (id: FolderId) => FOLDERS.find((f) => f.id === id)!;

/** An item shown inside a folder: either a subfolder, a program, or a picture. */
interface Entry {
    key: string;
    label: string;
    /** Thumbnail URL wins over `icon` when present. */
    icon?: IconName;
    thumb?: string;
    size: number;
    type: string;
    /** Navigating into a folder. */
    goTo?: FolderId;
    /** Launching an app by its APPLICATIONS key. */
    launch?: string;
    /** Opening a picture in the viewer. */
    picture?: { name: string; full: string; size: number };
    /** Opening a saved text file in Notepad. */
    document?: Win98File;
}

const folderEntry = (id: FolderId, size: number, type: string): Entry => {
    const f = folderById(id);
    return { key: f.id, label: f.label, icon: f.icon, size, type, goTo: f.id };
};

const CONTENTS: { [key in FolderId]: Entry[] } = {
    myComputer: [
        folderEntry('diskC', 2_100_000, 'Local Disk'),
        folderEntry('diskD', 1_400_000, 'Local Disk'),
        folderEntry('cdRom', 0, 'CD-ROM Drive'),
    ],
    diskC: [
        folderEntry('programs', 42_000, 'File Folder'),
        folderEntry('games', 31_000, 'File Folder'),
        folderEntry('myDocuments', 0, 'File Folder'),
        folderEntry('pictures', 4300, 'File Folder'),
        folderEntry('favorites', 4, 'File Folder'),
    ],
    diskD: [
        folderEntry('utility', 40, 'File Folder'),
        folderEntry('controlPanel', 60, 'File Folder'),
    ],
    cdRom: [],
    // My Documents holds the two folders the programs write into; what's
    // inside each is read off the drive at open time (see `documents` below).
    myDocuments: [
        folderEntry('notes', 0, 'File Folder'),
        folderEntry('paintings', 0, 'File Folder'),
    ],
    notes: [],
    paintings: [],
    // Every game on the machine, from the one list `games.ts` owns — so this
    // folder and the Start menu's Games fly-out cannot disagree.
    games: GAMES.map((game) => ({
        key: game.key,
        label: game.name,
        icon: game.icon,
        size: game.size,
        type: 'Application',
        launch: game.key,
    })),
    // The same list the Programs folder window shows, so C:\Programs and the
    // Programs folder on the desktop can't disagree about what's installed.
    programs: PROGRAMS_CONTENTS.map((item) => ({
        key: item.key,
        label: item.name,
        icon: item.icon,
        size: item.size,
        type: item.type,
        launch: item.key,
    })),
    pictures: pictures.map((p) => ({
        key: p.id,
        label: p.name,
        thumb: p.thumb,
        size: p.size,
        type: 'JPEG Image',
        picture: { name: p.name, full: p.full, size: p.size },
    })),
    // The same list the browser's own Favorites drop-down offers (see
    // WebFrame's address bar), plus the two sites that leave the frame
    // instead of opening in it. One list in websites.ts, so a site added
    // there turns up here too rather than needing to be listed twice.
    favorites: [
        ...IE_FAVORITES.map((site) => ({
            key: site.key,
            label: site.label,
            icon: FAVORITE_ICONS[site.key] || 'ieIcon',
            size: 1,
            type: 'Internet Shortcut',
            launch: site.key,
        })),
        // Not in websites.ts: this one is its own standalone window rather
        // than a page opened through the shared browser (see floatingSphere.tsx).
        {
            key: 'floating',
            label: 'Interactive Attractor',
            icon: 'floatingSphere',
            size: 1,
            type: 'Internet Shortcut',
            launch: 'floating',
        },
        {
            key: 'github',
            label: 'GitHub',
            icon: 'githubIcon',
            size: 1,
            type: 'Internet Shortcut',
            launch: 'github',
        },
        {
            key: 'linkedin',
            label: 'LinkedIn',
            icon: 'linkedinIcon',
            size: 1,
            type: 'Internet Shortcut',
            launch: 'linkedin',
        },
    ],
    // Yute's original four utilities, plus three more full windows onto tray
    // applets that otherwise only lived as a popup off their tray icon.
    utility: [
        {
            key: 'stocks',
            label: 'Market Watch',
            icon: 'stocksIcon',
            size: 96,
            type: 'Application',
            launch: 'stocks',
        },
        {
            key: 'taskManager',
            label: 'Task Manager',
            icon: 'taskManagerIcon',
            size: 3500,
            type: 'Application',
            launch: 'taskManager',
        },
        {
            key: 'patchNotes',
            label: 'Patch Notes',
            icon: 'patchNotesIcon',
            size: 500,
            type: 'Application',
            launch: 'patchNotes',
        },
        {
            key: 'resetStorage',
            label: 'Reset Storage',
            icon: 'resetStorageIcon',
            size: 20,
            type: 'Application',
            launch: 'resetStorage',
        },
        // Full windows for three more tray applets, so they're reachable from
        // here too rather than only as a popup off the tray icon.
        {
            key: 'network',
            label: 'Dial-Up Networking',
            icon: 'dialupIcon',
            size: 14,
            type: 'Application',
            launch: 'network',
        },
        {
            key: 'powerMeter',
            label: 'Power Meter',
            icon: 'batteryIcon',
            size: 12,
            type: 'Application',
            launch: 'powerMeter',
        },
        {
            key: 'weatherStation',
            label: 'Weather Station',
            icon: 'weatherSunIcon',
            size: 18,
            type: 'Application',
            launch: 'weatherStation',
        },
    ],
    // The applets a real Windows 95 Control Panel held, as far as this
    // desktop has equivalents for them — reached today only from the Start
    // menu or a right-click, which a drive full of nothing but "Utility"
    // never explained. "Add/Remove Programs" is this machine's Store under
    // its official Windows name.
    controlPanel: [
        {
            key: 'settings',
            label: 'Display',
            icon: 'settingsIcon',
            size: 8,
            type: 'Application',
            launch: 'settings',
        },
        {
            key: 'systemProperties',
            label: 'System',
            icon: 'systemIcon',
            size: 12,
            type: 'Application',
            launch: 'systemProperties',
        },
        {
            key: 'store',
            label: 'Add/Remove Programs',
            icon: 'storeIcon',
            size: 40,
            type: 'Application',
            launch: 'store',
        },
        {
            key: 'run',
            label: 'Run',
            icon: 'runIcon',
            size: 4,
            type: 'Application',
            launch: 'run',
        },
    ],
};

export interface MyComputerProps extends WindowAppProps {
    /** Launches an app by APPLICATIONS key (see Desktop.tsx). */
    openApp: (key: string) => void;
    /** Opens a picture in the picture viewer. */
    openPicture: (name: string, full: string, size: number) => void;
    /**
     * Opens a saved file in the program that wrote it — Notepad for a note,
     * Paint for a painting.
     */
    openDocument: (file: Win98File) => void;
    /**
     * A document dragged clean out of this window and let go of on the desktop
     * (or on the Recycle Bin). The desktop decides where it lands and does the
     * actual move; we just refresh once it resolves, because by then the file
     * is genuinely no longer in this folder.
     */
    onDragOut?: (
        file: Win98File,
        screen: { x: number; y: number }
    ) => Promise<void>;
}

/** How far a press has to travel before it is a drag and not a click. */
const DRAG_THRESHOLD = 5;

const MyComputer: React.FC<MyComputerProps> = ({
    openApp,
    openPicture,
    openDocument,
    onDragOut,
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [location, setLocation] = useState<FolderId>('myComputer');
    const [history, setHistory] = useState<FolderId[]>(['myComputer']);
    const [selected, setSelected] = useState<string | null>(null);
    const [addressOpen, setAddressOpen] = useState(false);

    // --- Notes and Paintings ------------------------------------------------
    // The only two folders whose contents are read off the drive rather than
    // declared, and re-read every time you navigate into one, so a file saved
    // since the window was opened is there. `null` while the read is in flight.
    const [documents, setDocuments] = useState<Win98File[] | null>(null);
    const [documentsError, setDocumentsError] = useState<string | null>(null);
    /** Blob URLs for the paintings, so the folder shows the actual pictures. */
    const [thumbs, setThumbs] = useState<Record<string, string>>({});

    const isDocumentFolder = location === 'notes' || location === 'paintings';
    const documentDir = location === 'paintings' ? PAINTINGS_DIR : NOTES_DIR;

    const refreshDocuments = useCallback(
        /**
         * `quiet` re-reads without emptying the view first. The gallery sync
         * finishes long after the folder is already on screen, and blanking it
         * back to "Reading drive C:…" at that point makes a folder you are
         * looking at flicker for no reason.
         */
        (directory: string, quiet = false) => {
            setDocumentsError(null);
            if (!quiet) setDocuments(null);
            listDocuments(directory).then(
                (files) => setDocuments(files),
                (error) => {
                    setDocuments([]);
                    setDocumentsError(
                        error instanceof Error
                            ? error.message
                            : 'The drive could not be read.'
                    );
                }
            );
        },
        []
    );

    /**
     * Seeding happens once per browser and only creates files that aren't
     * there, so running it on open costs nothing after the first visit.
     *
     * The gallery sync runs straight after, and is why these folders fill up
     * over time: it writes everything other visitors have saved onto this
     * drive, so from here on the folder listing is just a folder listing. It
     * is done on open rather than at boot so a visitor who never looks in My
     * Documents never pays for it.
     */
    useEffect(() => {
        if (!isDocumentFolder) return;
        let cancelled = false;

        // Everything that has to be true of the *local* drive before the folder
        // can be listed honestly: strays walked home, seeds written. Both are
        // IndexedDB work and take milliseconds.
        const local = reclaimStrayDocuments()
            .catch(() => undefined)
            .then(() => seedDocuments())
            .catch(() => undefined)
            .then(() => {
                if (!cancelled) refreshDocuments(documentDir);
            });

        // The gallery is a network request to somebody else's server, and it is
        // deliberately *not* in that chain. It used to be, and a slow or
        // sleeping backend left the folder saying "Reading drive C:…" forever
        // over a drive that had been readable the whole time. Now the folder
        // shows what is on the machine straight away and fills in with everyone
        // else's work when — and if — it arrives.
        local
            .then(() => syncCommunityFiles())
            .then(() => {
                if (!cancelled) refreshDocuments(documentDir, true);
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [isDocumentFolder, documentDir, refreshDocuments]);

    /**
     * A document can leave this folder without this window being touched — put
     * in the bin from the desktop, or sent home from a right-click menu. Rather
     * than let the listing quietly disagree with the drive, re-read it whenever
     * something moves.
     */
    useEffect(() => {
        if (!isDocumentFolder) return;
        return watchDrive(() => refreshDocuments(documentDir, true));
    }, [isDocumentFolder, documentDir, refreshDocuments]);

    /**
     * Read each painting once and hand the folder a blob URL, so Paintings
     * shows the pictures themselves rather than a row of identical icons — the
     * way the Pictures folder next door does.
     */
    useEffect(() => {
        if (location !== 'paintings' || !documents) return;
        let cancelled = false;
        const made: string[] = [];
        Promise.all(
            documents.map(async (file) => {
                try {
                    const url = await documentObjectUrl(file);
                    made.push(url);
                    return [file.path, url] as const;
                } catch {
                    return null;
                }
            })
        ).then((pairs) => {
            if (cancelled) {
                made.forEach(URL.revokeObjectURL);
                return;
            }
            const next: Record<string, string> = {};
            pairs.forEach((pair) => {
                if (pair) next[pair[0]] = pair[1];
            });
            setThumbs(next);
        });
        return () => {
            cancelled = true;
            made.forEach(URL.revokeObjectURL);
        };
    }, [location, documents]);

    const current = folderById(location);
    const entries = useMemo<Entry[]>(() => {
        if (!isDocumentFolder) return CONTENTS[location];
        const painting = location === 'paintings';
        return (documents || []).map((file) => ({
            key: `doc:${file.name}`,
            label: file.name,
            icon: (painting ? 'paintIcon' : 'notepadIcon') as IconName,
            thumb: painting ? thumbs[file.path] : undefined,
            // The folder counts in KB; a file is measured in bytes, and
            // anything non-empty occupies at least one kilobyte on disk.
            size: Math.max(1, Math.round(file.size / 1024)),
            type: painting ? 'Bitmap Image' : 'Text Document',
            document: file,
        }));
    }, [isDocumentFolder, location, documents, thumbs]);

    const navigate = useCallback((to: FolderId) => {
        setLocation(to);
        setHistory((h) => [...h, to]);
        setSelected(null);
        setAddressOpen(false);
    }, []);

    /** Back — pops the history stack. Disabled at the start of it. */
    const back = useCallback(() => {
        setHistory((h) => {
            if (h.length < 2) return h;
            const next = h.slice(0, -1);
            setLocation(next[next.length - 1]);
            return next;
        });
        setSelected(null);
    }, []);

    /** Up one level — follows the tree rather than the history. */
    const up = useCallback(() => {
        const parent = folderById(location).parent;
        if (parent) navigate(parent);
    }, [location, navigate]);

    // Select on first press, open on a second within 300ms — the same gesture
    // the desktop icons use, so this works on touch as well as with a mouse.
    const pending = React.useRef<string | null>(null);
    const pressEntry = (entry: Entry) => {
        if (pending.current === entry.key) {
            pending.current = null;
            if (entry.goTo) navigate(entry.goTo);
            else if (entry.launch) openApp(entry.launch);
            else if (entry.picture)
                openPicture(
                    entry.picture.name,
                    entry.picture.full,
                    entry.picture.size
                );
            else if (entry.document) openDocument(entry.document);
            return;
        }
        setSelected(entry.key);
        pending.current = entry.key;
        setTimeout(() => {
            if (pending.current === entry.key) pending.current = null;
        }, 300);
    };

    // --- Carrying a file out of the folder -----------------------------------
    //
    // A file you cannot pick up is a row in a list, so the documents in Notes
    // and Paintings can be dragged straight out of this window: onto the
    // desktop, or onto the Recycle Bin. Everything else in My Computer is a
    // folder or a program and stays where it is.

    /** The window's own box, so "let go outside it" can be tested. */
    const frameRef = useRef<HTMLDivElement>(null);
    /** The ghost that follows the pointer while a file is being carried. */
    const [carrying, setCarrying] = useState<{
        entry: Entry;
        x: number;
        y: number;
    } | null>(null);
    const carryRef = useRef<{ x: number; y: number; moved: boolean } | null>(
        null
    );

    const startCarrying = (entry: Entry, e: React.PointerEvent) => {
        const document_ = entry.document;
        if (!document_ || !onDragOut) return;
        const start = { x: e.clientX, y: e.clientY, moved: false };
        carryRef.current = start;

        const onMove = (ev: PointerEvent) => {
            if (!carryRef.current) return;
            if (
                !carryRef.current.moved &&
                Math.hypot(ev.clientX - start.x, ev.clientY - start.y) <
                    DRAG_THRESHOLD
            ) {
                return;
            }
            // Carrying a file is not clicking it — don't let the second half of
            // the click-click-to-open gesture fire when the drag ends.
            carryRef.current.moved = true;
            pending.current = null;
            setCarrying({ entry, x: ev.clientX, y: ev.clientY });
        };

        const onUp = (ev: PointerEvent) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            const moved = carryRef.current?.moved;
            carryRef.current = null;
            setCarrying(null);
            if (!moved) return;

            const box = frameRef.current?.getBoundingClientRect();
            const outside =
                !!box &&
                (ev.clientX < box.left ||
                    ev.clientX > box.right ||
                    ev.clientY < box.top ||
                    ev.clientY > box.bottom);
            // Let go still inside the window and nothing happens: this is a
            // folder, not a canvas, and there is nowhere else in here to put it.
            if (!outside) return;

            onDragOut(document_, { x: ev.clientX, y: ev.clientY })
                .catch(() => undefined)
                .then(() => refreshDocuments(documentDir));
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    /** Delete, on the selected document: into the Recycle Bin, not gone. */
    const binSelected = () => {
        const file = selectedEntry?.document;
        if (!file) return;
        setSelected(null);
        takeDocumentToBin(file)
            .catch(() => undefined)
            .then(() => refreshDocuments(documentDir));
    };

    const openSelected = () => {
        const entry = entries.find((e) => e.key === selected);
        if (!entry) return;
        if (entry.goTo) navigate(entry.goTo);
        else if (entry.launch) openApp(entry.launch);
        else if (entry.picture)
            openPicture(entry.picture.name, entry.picture.full, entry.picture.size);
        else if (entry.document) openDocument(entry.document);
    };

    const formatSize = (kb: number) =>
        kb >= 1_000_000
            ? `${(kb / 1_000_000).toFixed(1)} GB`
            : kb >= 1000
              ? `${(kb / 1000).toFixed(1)} MB`
              : `${kb} KB`;

    const totalSize = useMemo(
        () => entries.reduce((sum, e) => sum + e.size, 0),
        [entries]
    );
    const selectedEntry = entries.find((e) => e.key === selected) || null;
    const status = selectedEntry
        ? `${selectedEntry.label} — ${selectedEntry.type}, ${formatSize(
              selectedEntry.size
          )}`
        : `${entries.length} object(s)   ${formatSize(totalSize)}`;

    const canGoBack = history.length > 1;
    const canGoUp = current.parent !== null;

    return (
        <Window
            top={60}
            left={110}
            width={620}
            height={460}
            windowTitle={current.label}
            windowBarIcon={current.icon}
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={status}
        >
            <div style={styles.container} ref={frameRef}>
                <div style={styles.menuBar}>
                    <span style={styles.menuItem}>
                        File<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                    <span style={styles.menuItem}>
                        Edit<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                    <span style={styles.menuItem}>
                        View<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                    <span style={styles.menuItem}>
                        Help<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                </div>

                {/* Address combo box — jumps anywhere in the tree. */}
                <div style={styles.addressBar}>
                    <span style={styles.addressLabel}>Address</span>
                    <div style={styles.combo}>
                        <div
                            style={styles.addressField}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                setAddressOpen((o) => !o);
                            }}
                        >
                            <Icon icon={current.icon} size={16} />
                            <span style={styles.addressText}>
                                {current.label}
                            </span>
                        </div>
                        <div
                            style={styles.caret}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                setAddressOpen((o) => !o);
                            }}
                        >
                            ▼
                        </div>
                        {addressOpen && (
                            <div style={styles.dropdown}>
                                {FOLDERS.map((f) => (
                                    <div
                                        key={f.id}
                                        style={Object.assign(
                                            {},
                                            styles.dropdownItem,
                                            {
                                                paddingLeft: 6 + f.depth * 16,
                                            },
                                            location === f.id &&
                                                styles.dropdownItemSelected
                                        )}
                                        onPointerDown={(e) => {
                                            e.stopPropagation();
                                            navigate(f.id);
                                        }}
                                    >
                                        <Icon icon={f.icon} size={16} />
                                        <span>{f.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation toolbar */}
                <div style={styles.toolbar}>
                    <button
                        style={Object.assign(
                            {},
                            styles.toolButton,
                            !canGoBack && styles.disabled
                        )}
                        onClick={back}
                        disabled={!canGoBack}
                        title="Back"
                    >
                        ← Back
                    </button>
                    <button
                        style={Object.assign(
                            {},
                            styles.toolButton,
                            !canGoUp && styles.disabled
                        )}
                        onClick={up}
                        disabled={!canGoUp}
                        title="Up one level"
                    >
                        ↑ Up
                    </button>
                    <div style={styles.toolSeparator} />
                    <button
                        style={Object.assign(
                            {},
                            styles.toolButton,
                            !selectedEntry && styles.disabled
                        )}
                        onClick={openSelected}
                        disabled={!selectedEntry}
                        title="Open the selected item"
                    >
                        Open
                    </button>

                    {/* Only ever useful in My Documents — the files there are
                        the only things on this desktop that live on the fake C:
                        drive rather than in the build, so they're the only ones
                        that can be handed to the real computer. */}
                    {isDocumentFolder && (
                        <>
                            <button
                                style={Object.assign(
                                    {},
                                    styles.toolButton,
                                    !selectedEntry?.document && styles.disabled
                                )}
                                onClick={() => {
                                    const file = selectedEntry?.document;
                                    if (file) downloadDocument(file);
                                }}
                                disabled={!selectedEntry?.document}
                                title="Save a copy of the selected file to your own computer"
                            >
                                ↓ Download
                            </button>
                            {/* Into the bin, not gone: it can be taken back out
                                again until the bin is emptied. */}
                            <button
                                style={Object.assign(
                                    {},
                                    styles.toolButton,
                                    !selectedEntry?.document && styles.disabled
                                )}
                                onClick={binSelected}
                                disabled={!selectedEntry?.document}
                                title="Move the selected file to the Recycle Bin"
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>

                {/* Contents */}
                <div
                    style={styles.contents}
                    onPointerDown={() => {
                        setSelected(null);
                        setAddressOpen(false);
                    }}
                >
                    {entries.length === 0 ? (
                        <div style={styles.emptyState}>
                            {isDocumentFolder ? (
                                <p style={styles.emptyText}>
                                    {documents === null
                                        ? 'Reading drive C:…'
                                        : documentsError ||
                                          'This folder is empty.'}
                                    {documents !== null && !documentsError && (
                                        <>
                                            <br />
                                            <br />
                                            {location === 'paintings'
                                                ? 'Anything you draw in Paint and save with File > Save As > My Documents\\Paintings is kept here, in this browser, and shows up in this folder.'
                                                : 'Anything you write in Notepad and save with File > Save As > My Documents\\Notes is kept here, in this browser, and shows up in this folder.'}
                                        </>
                                    )}
                                </p>
                            ) : (
                                <p style={styles.emptyText}>
                                    {location === 'cdRom'
                                        ? 'Please insert a disc into drive.'
                                        : 'This folder is empty.'}
                                </p>
                            )}
                        </div>
                    ) : (
                        entries.map((entry) => (
                            <div
                                key={entry.key}
                                id={`mc-item-${entry.key}`}
                                style={Object.assign(
                                    {},
                                    styles.item,
                                    // A document has to swallow touch panning,
                                    // or a drag off the window scrolls the
                                    // folder instead of carrying the file.
                                    entry.document && styles.draggableItem
                                )}
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    setAddressOpen(false);
                                    pressEntry(entry);
                                    startCarrying(entry, e);
                                }}
                            >
                                <div style={styles.iconBox}>
                                    {entry.thumb ? (
                                        <img
                                            src={entry.thumb}
                                            alt={entry.label}
                                            style={styles.thumb}
                                        />
                                    ) : (
                                        <Icon
                                            icon={entry.icon as IconName}
                                            style={styles.icon}
                                        />
                                    )}
                                </div>
                                <span
                                    style={Object.assign(
                                        {},
                                        styles.label,
                                        selected === entry.key &&
                                            styles.labelSelected
                                    )}
                                >
                                    {entry.label}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* The file under the pointer while it is being carried.
                Portalled to <body> on purpose: the desktop is inside a scaled
                transform, and a `position: fixed` child of that would be laid
                out in the desktop's coordinate space instead of the screen's —
                the ghost would drift away from the cursor at every resolution
                except 800x600. */}
            {carrying &&
                createPortal(
                    <div
                        style={Object.assign({}, styles.ghost, {
                            left: carrying.x + 8,
                            top: carrying.y + 8,
                        })}
                    >
                        {carrying.entry.thumb ? (
                            <img
                                src={carrying.entry.thumb}
                                alt=""
                                style={styles.thumb}
                            />
                        ) : (
                            <Icon
                                icon={carrying.entry.icon as IconName}
                                style={styles.icon}
                            />
                        )}
                        <span style={styles.ghostLabel}>
                            {carrying.entry.label}
                        </span>
                    </div>,
                    document.body
                )}
        </Window>
    );
};

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
    },
    menuBar: {
        display: 'flex',
        gap: 16,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    menuItem: {
        cursor: 'default',
        userSelect: 'none',
    },
    addressBar: {
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        flexShrink: 0,
    },
    addressLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
    },
    combo: {
        position: 'relative',
        flex: 1,
        minWidth: 0,
        alignItems: 'stretch',
    },
    addressField: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        gap: 6,
        padding: '3px 4px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        cursor: 'pointer',
        overflow: 'hidden',
    },
    addressText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        whiteSpace: 'nowrap',
    },
    caret: {
        width: 18,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 8,
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        userSelect: 'none',
        flexShrink: 0,
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        flexDirection: 'column',
        background: Colors.white,
        border: `1px solid ${Colors.black}`,
        zIndex: 40,
        // Tall enough to hold every row in FOLDERS without scrolling — it was
        // capped at 200px, which fit the original 11 rows only by chance and
        // clipped straight through the middle of the tree the moment a couple
        // more were added (Favorites, Control Panel), hiding whatever fell
        // past the fold with no visual sign it was still there to scroll to.
        // Still capped, not removed: a tree that grows enough to blow through
        // 340px should scroll rather than run off the bottom of the window.
        maxHeight: 340,
        overflowY: 'auto',
    },
    dropdownItem: {
        alignItems: 'center',
        gap: 6,
        padding: '3px 6px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
        whiteSpace: 'nowrap',
    },
    dropdownItemSelected: {
        background: Colors.blue,
        color: Colors.white,
    },
    toolbar: {
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px 5px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    toolButton: {
        padding: '3px 10px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
    },
    toolSeparator: {
        width: 1,
        height: 18,
        margin: '0 4px',
        background: Colors.darkGray,
        borderRight: `1px solid ${Colors.white}`,
    },
    disabled: {
        opacity: 0.45,
        cursor: 'not-allowed',
    },
    contents: {
        display: 'flex',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        gap: 6,
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: 10,
        margin: '4px 6px',
        background: Colors.white,
        border: `2px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    item: {
        width: 92,
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: 4,
        cursor: 'pointer',
        userSelect: 'none',
        flexShrink: 0,
        textAlign: 'center',
        touchAction: 'manipulation',
    },
    draggableItem: {
        touchAction: 'none',
    },
    ghost: {
        position: 'fixed',
        zIndex: 200000,
        pointerEvents: 'none',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        width: 92,
        opacity: 0.75,
        textAlign: 'center',
    },
    ghostLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.white,
        background: Colors.blue,
        padding: '1px 3px',
        lineHeight: '13px',
        wordBreak: 'break-word',
    },
    iconBox: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        width: 32,
        height: 32,
        objectFit: 'contain',
    },
    thumb: {
        maxWidth: 40,
        maxHeight: 40,
        objectFit: 'cover',
        border: `1px solid ${Colors.darkGray}`,
    },
    label: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        padding: '1px 3px',
        lineHeight: '13px',
        wordBreak: 'break-word',
    },
    labelSelected: {
        background: Colors.blue,
        color: Colors.white,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
    },
    emptyText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        textAlign: 'center',
        lineHeight: 1.5,
        maxWidth: 340,
    },
};

export default MyComputer;
