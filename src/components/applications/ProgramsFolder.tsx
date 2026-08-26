import React, { useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { IconName } from '../../assets/icons';
import { WIN98_PROGRAMS } from './win98Programs';

/**
 * A folder window, in the spirit of the folders in Yute (Yuteoctober)'s
 * Windows95 Portfolio: its contents are icons you select and open, and the
 * status bar counts them.
 *
 * It doesn't own the apps it lists — it asks the Desktop to launch them by key
 * (`openApp`), so a program opens in exactly the same window it would from a
 * desktop shortcut.
 *
 * `PROGRAMS_CONTENTS` is the single source of truth for what's in Programs.
 * The Start menu's Programs fly-out and My Computer > Hard Disk (C:) > Programs
 * both read it, so the folder has the same contents wherever you open it from.
 */

export interface FolderItem {
    /** APPLICATIONS key in Desktop.tsx. */
    key: string;
    name: string;
    icon: IconName;
    /** Shown in the status bar when selected. */
    size: number;
    type: string;
}

/**
 * Programs that are native to this portfolio rather than vendored from 98.js:
 * this desktop's own React Minesweeper and Internet Explorer, and the Credits.
 */
const NATIVE_PROGRAMS: FolderItem[] = [
    {
        key: 'perceptionLab',
        name: 'Perception Lab',
        icon: 'perceptionLabIcon',
        size: 36,
        type: 'Application',
    },
    {
        key: 'stereogram',
        name: 'Hidden Dimension',
        icon: 'stereogramIcon',
        size: 40,
        type: 'Application',
    },
    {
        key: 'pet',
        name: 'Pet',
        icon: 'petModemIcon',
        size: 340,
        type: 'Application',
    },
    {
        key: 'television',
        name: 'Television',
        icon: 'televisionIcon',
        size: 900,
        type: 'Application',
    },
    {
        key: 'credits',
        name: 'Credits',
        icon: 'credits',
        size: 12,
        type: 'Document',
    },
    {
        key: 'internet',
        name: 'Internet Explorer',
        icon: 'internetExplorerIcon',
        size: 640,
        type: 'Application',
    },
    {
        key: 'minesweeper',
        name: 'Minesweeper',
        icon: 'minesweeperIcon',
        size: 250,
        type: 'Application',
    },
];

/** Sorted the way Windows sorts a folder by name: case-insensitively. */
export const PROGRAMS_CONTENTS: FolderItem[] = [
    ...NATIVE_PROGRAMS,
    ...WIN98_PROGRAMS.map((p) => ({
        key: p.key,
        name: p.name,
        icon: p.icon,
        size: p.size,
        type: 'Application',
    })),
].sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

export interface ProgramsFolderProps extends WindowAppProps {
    openApp: (key: string) => void;
}

const ProgramsFolder: React.FC<ProgramsFolderProps> = ({
    openApp,
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [selected, setSelected] = useState<string | null>(null);
    const current = PROGRAMS_CONTENTS.find((i) => i.key === selected) || null;

    /**
     * Select on the first tap, open on a second within 300ms — the same
     * gesture DesktopShortcut and FileIcon use. Deliberately not `onDoubleClick`:
     * that doesn't fire reliably on iPad, which would leave the folder's
     * contents unopenable on a tablet.
     */
    const openTimer = useRef<string | null>(null);
    const handleItemPress = (key: string) => {
        if (openTimer.current === key) {
            openTimer.current = null;
            openApp(key);
            return;
        }
        setSelected(key);
        openTimer.current = key;
        setTimeout(() => {
            if (openTimer.current === key) openTimer.current = null;
        }, 300);
    };

    // Paint alone is tens of megabytes, so KB stopped being readable.
    const formatSize = (kb: number) =>
        kb >= 1000 ? `${(kb / 1000).toFixed(1)} MB` : `${kb} KB`;

    const totalSize = PROGRAMS_CONTENTS.reduce((sum, i) => sum + i.size, 0);
    const status = current
        ? `${current.name} — ${current.type}, ${formatSize(current.size)}`
        : `${PROGRAMS_CONTENTS.length} object(s)   ${formatSize(totalSize)}`;

    return (
        <Window
            top={70}
            left={130}
            // Sized so all thirteen programs land in a 5x3 grid without the
            // contents pane needing to scroll.
            width={512}
            height={416}
            windowTitle="Programs"
            windowBarIcon="programsFolderIcon"
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

                {/* Click the empty area to deselect, like a real folder. */}
                <div
                    style={styles.contents}
                    onPointerDown={() => setSelected(null)}
                >
                    {PROGRAMS_CONTENTS.map((item) => (
                        <div
                            key={item.key}
                            id={`folder-item-${item.key}`}
                            style={styles.item}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                handleItemPress(item.key);
                            }}
                        >
                            <div style={styles.iconBox}>
                                <Icon icon={item.icon} style={styles.icon} />
                            </div>
                            <span
                                style={Object.assign(
                                    {},
                                    styles.label,
                                    selected === item.key &&
                                        styles.labelSelected
                                )}
                            >
                                {item.name}
                            </span>
                        </div>
                    ))}
                </div>

                <div style={styles.buttonBar}>
                    <button
                        style={Object.assign(
                            {},
                            styles.button,
                            !current && styles.disabled
                        )}
                        disabled={!current}
                        onClick={() => current && openApp(current.key)}
                    >
                        Open
                    </button>
                    <button style={styles.button} onClick={onClose}>
                        Close
                    </button>
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
    contents: {
        display: 'flex',
        flexWrap: 'wrap',
        alignContent: 'flex-start',
        gap: 10,
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
        width: 76,
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
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        width: 32,
        height: 32,
        objectFit: 'contain',
    },
    label: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        padding: '1px 3px',
        lineHeight: '13px',
    },
    labelSelected: {
        background: Colors.blue,
        color: Colors.white,
    },
    buttonBar: {
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        justifyContent: 'flex-end',
        borderTop: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    button: {
        padding: '4px 16px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        minWidth: 60,
        textAlign: 'center',
    },
    disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
};

export default ProgramsFolder;
