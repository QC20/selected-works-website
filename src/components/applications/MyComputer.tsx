import React, { useCallback, useMemo, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { IconName } from '../../assets/icons';
import pictures from '../os/pictures';
import { PROGRAMS_CONTENTS } from './ProgramsFolder';

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
 *   ├── Hard Disk (C:) → Programs → Paint, Notepad, Solitaire, …
 *   │                  → Pictures → 19 photos
 *   ├── Hard Disk (D:) → Utility  → EUR/DKK Converter
 *   └── CD-ROM (empty)
 */

/** A node you can navigate into. */
type FolderId =
    | 'myComputer'
    | 'diskC'
    | 'diskD'
    | 'cdRom'
    | 'programs'
    | 'pictures'
    | 'utility';

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
    { id: 'pictures', label: 'Pictures', icon: 'folderIcon', parent: 'diskC', depth: 2 },
    { id: 'diskD', label: 'Hard Disk (D:)', icon: 'hardDriveIcon', parent: 'myComputer', depth: 1 },
    { id: 'utility', label: 'Utility', icon: 'folderIcon', parent: 'diskD', depth: 2 },
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
        folderEntry('pictures', 4300, 'File Folder'),
    ],
    diskD: [folderEntry('utility', 40, 'File Folder')],
    cdRom: [],
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
    utility: [
        {
            key: 'converter',
            label: 'EUR/DKK Converter',
            icon: 'eurIcon',
            size: 40,
            type: 'Application',
            launch: 'converter',
        },
    ],
};

export interface MyComputerProps extends WindowAppProps {
    /** Launches an app by APPLICATIONS key (see Desktop.tsx). */
    openApp: (key: string) => void;
    /** Opens a picture in the picture viewer. */
    openPicture: (name: string, full: string, size: number) => void;
}

const MyComputer: React.FC<MyComputerProps> = ({
    openApp,
    openPicture,
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [location, setLocation] = useState<FolderId>('myComputer');
    const [history, setHistory] = useState<FolderId[]>(['myComputer']);
    const [selected, setSelected] = useState<string | null>(null);
    const [addressOpen, setAddressOpen] = useState(false);

    const current = folderById(location);
    const entries = CONTENTS[location];

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
            return;
        }
        setSelected(entry.key);
        pending.current = entry.key;
        setTimeout(() => {
            if (pending.current === entry.key) pending.current = null;
        }, 300);
    };

    const openSelected = () => {
        const entry = entries.find((e) => e.key === selected);
        if (!entry) return;
        if (entry.goTo) navigate(entry.goTo);
        else if (entry.launch) openApp(entry.launch);
        else if (entry.picture)
            openPicture(entry.picture.name, entry.picture.full, entry.picture.size);
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
            <div style={styles.container}>
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
                            <p style={styles.emptyText}>
                                {location === 'cdRom'
                                    ? 'Please insert a disc into drive.'
                                    : 'This folder is empty.'}
                            </p>
                        </div>
                    ) : (
                        entries.map((entry) => (
                            <div
                                key={entry.key}
                                id={`mc-item-${entry.key}`}
                                style={styles.item}
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    setAddressOpen(false);
                                    pressEntry(entry);
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
        maxHeight: 200,
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
    },
};

export default MyComputer;
