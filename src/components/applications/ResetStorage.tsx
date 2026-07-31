import React, { useCallback, useMemo, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';

/**
 * Reset Storage — My Computer > Hard Disk (D:) > Utility.
 *
 * Everything this desktop remembers between visits lives in your own browser:
 * localStorage for where you dragged the icons, which wallpaper you picked, and
 * so on, plus one IndexedDB database ("C:") holding the files Notepad saved to
 * My Documents. None of it is uploaded anywhere and none of it is shared between
 * browsers.
 *
 * So this is Disk Cleanup rather than a single destructive button: pick what to
 * throw away, see how much of it there is, and confirm before it goes. Yute's
 * Utility folder has a ResetStorage app in the same slot; this one is explicit
 * about what it's about to delete, because deleting your saved Notepad documents
 * is not something to do by accident.
 */

/** One line in the cleanup list. */
interface Category {
    id: string;
    label: string;
    description: string;
    /** localStorage keys this line owns. */
    keys: string[];
    /** IndexedDB databases this line owns. */
    databases?: string[];
    /** Off by default — the only line that destroys documents you authored. */
    optIn?: boolean;
}

const CATEGORIES: Category[] = [
    {
        id: 'layout',
        label: 'Desktop layout',
        description: 'Where you dragged the icons.',
        keys: ['desktopIconPositions'],
    },
    {
        id: 'display',
        label: 'Display settings',
        description: 'Wallpaper, colours and screen resolution.',
        keys: ['desktopTheme.v1', 'desktopResolution'],
    },
    {
        id: 'files',
        label: 'Desktop files and Recycle Bin',
        description: 'Folders you made, and anything in the bin.',
        keys: ['desktopFiles.v1'],
    },
    {
        id: 'games',
        label: 'Game settings',
        description: 'The Minesweeper difficulty you last played.',
        keys: ['minesweeperLevel'],
    },
    {
        id: 'market',
        label: 'Market Watch',
        description: 'The companies you added to the watch list.',
        keys: ['marketWatch.watchlist.v1'],
    },
    {
        id: 'msn',
        label: 'MSN Messenger',
        description: 'Your display name and local message history.',
        keys: ['guestbook_name', 'guestbook_bot', 'guestbook_messages'],
    },
    {
        id: 'documents',
        label: 'My Documents (C:)',
        description: 'Files you saved from Notepad. This cannot be undone.',
        keys: [],
        databases: ['C:'],
        optIn: true,
    },
];

/** Roughly how many bytes a category is using, for the size column. */
const sizeOf = (category: Category): number =>
    category.keys.reduce((total, key) => {
        const value = window.localStorage.getItem(key);
        // UTF-16 in practice, but the number is only ever shown as "about this
        // big", so the key name plus the value length is close enough.
        return total + (value ? value.length + key.length : 0);
    }, 0);

const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 bytes';
    if (bytes < 1024) return `${bytes} bytes`;
    return `${(bytes / 1024).toFixed(1)} KB`;
};

export interface ResetStorageProps extends WindowAppProps {}

const ResetStorage: React.FC<ResetStorageProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [checked, setChecked] = useState<{ [id: string]: boolean }>(() =>
        CATEGORIES.reduce(
            (acc, c) => ({ ...acc, [c.id]: !c.optIn }),
            {} as { [id: string]: boolean }
        )
    );
    const [confirming, setConfirming] = useState(false);
    const [done, setDone] = useState(false);

    const sizes = useMemo(
        () =>
            CATEGORIES.reduce(
                (acc, c) => ({ ...acc, [c.id]: sizeOf(c) }),
                {} as { [id: string]: number }
            ),
        // Recomputed on mount only; nothing here writes storage while it's open.
        []
    );

    const selected = CATEGORIES.filter((c) => checked[c.id]);
    const totalSelected = selected.reduce((t, c) => t + sizes[c.id], 0);

    const reset = useCallback(() => {
        selected.forEach((category) => {
            category.keys.forEach((key) => {
                try {
                    window.localStorage.removeItem(key);
                } catch {
                    /* storage disabled or full — nothing else to do */
                }
            });
            category.databases?.forEach((name) => {
                try {
                    window.indexedDB.deleteDatabase(name);
                } catch {
                    /* Safari in private mode blocks this */
                }
            });
        });
        setConfirming(false);
        setDone(true);
    }, [selected]);

    return (
        <Window
            top={110}
            left={200}
            width={420}
            // Tall enough that all six lines fit without scrolling.
            height={445}
            windowTitle="Reset Storage"
            windowBarIcon="resetStorageIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={
                done
                    ? 'Restart to finish'
                    : `${formatSize(totalSelected)} selected`
            }
        >
            <div style={styles.container}>
                {done ? (
                    <div style={styles.centered}>
                        <p style={styles.doneTitle}>Storage cleared.</p>
                        <p style={styles.text}>
                            The desktop needs to restart to go back to its
                            defaults.
                        </p>
                        <button
                            style={styles.button}
                            onClick={() => window.location.reload()}
                        >
                            Restart Now
                        </button>
                    </div>
                ) : confirming ? (
                    <div style={styles.centered}>
                        <p style={styles.doneTitle}>Are you sure?</p>
                        <p style={styles.text}>
                            {selected.length === 0
                                ? 'Nothing is selected.'
                                : `This permanently deletes: ${selected
                                      .map((c) => c.label)
                                      .join(', ')}.`}
                        </p>
                        <div style={styles.buttons}>
                            <button style={styles.button} onClick={reset}>
                                Yes
                            </button>
                            <button
                                style={styles.button}
                                onClick={() => setConfirming(false)}
                            >
                                No
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p style={styles.intro}>
                            This desktop remembers things in this browser only —
                            nothing is uploaded. Choose what to throw away:
                        </p>

                        <div style={styles.list}>
                            {CATEGORIES.map((category) => (
                                <label key={category.id} style={styles.row}>
                                    <input
                                        type="checkbox"
                                        checked={!!checked[category.id]}
                                        onChange={(e) =>
                                            setChecked((prev) => ({
                                                ...prev,
                                                [category.id]: e.target.checked,
                                            }))
                                        }
                                        style={styles.checkbox}
                                    />
                                    <span style={styles.rowText}>
                                        <span style={styles.rowLabel}>
                                            {category.label}
                                        </span>
                                        <span style={styles.rowDescription}>
                                            {category.description}
                                        </span>
                                    </span>
                                    <span style={styles.rowSize}>
                                        {category.databases
                                            ? '—'
                                            : formatSize(sizes[category.id])}
                                    </span>
                                </label>
                            ))}
                        </div>

                        <div style={styles.buttons}>
                            <button
                                style={Object.assign(
                                    {},
                                    styles.button,
                                    selected.length === 0 &&
                                        styles.buttonDisabled
                                )}
                                disabled={selected.length === 0}
                                onClick={() => setConfirming(true)}
                            >
                                Reset
                            </button>
                            <button style={styles.button} onClick={onClose}>
                                Cancel
                            </button>
                        </div>
                    </>
                )}
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
        // Padding has to come out of the 100%, or the buttons fall off the
        // bottom of the window.
        boxSizing: 'border-box',
        gap: 8,
        padding: 10,
        background: Colors.lightGray,
    },
    intro: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        lineHeight: 1.5,
        flexShrink: 0,
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    // `display: flex` is spelled out on these two because the global stylesheet
    // only flexes <div>, and these are a <label> and a <span>. Without it the
    // checkbox stretches to the full row width and the text stacks under it.
    row: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 7,
        padding: '5px 7px',
        cursor: 'pointer',
        flexShrink: 0,
    },
    checkbox: {
        width: 13,
        height: 13,
        marginTop: 1,
        flexShrink: 0,
    },
    rowText: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        gap: 1,
    },
    rowLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    rowDescription: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        lineHeight: 1.4,
    },
    rowSize: {
        width: 60,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        textAlign: 'right',
        flexShrink: 0,
    },
    centered: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 20,
    },
    doneTitle: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.black,
    },
    text: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        textAlign: 'center',
        lineHeight: 1.5,
    },
    buttons: {
        justifyContent: 'flex-end',
        gap: 6,
        flexShrink: 0,
    },
    button: {
        width: 90,
        padding: '4px 0',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        flexShrink: 0,
        justifyContent: 'center',
    },
    buttonDisabled: {
        color: Colors.darkGray,
        cursor: 'default',
    },
};

export default ResetStorage;
