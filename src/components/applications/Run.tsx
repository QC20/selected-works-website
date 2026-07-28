import React, { useMemo, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';

/** A program Run can launch, supplied by the Desktop. */
export interface RunProgram {
    key: string;
    name: string;
}

export interface RunProps extends WindowAppProps {
    programs: RunProgram[];
    launch: (key: string) => void;
}

/**
 * Start → Run. Type (or pick) the name of anything on the desktop and it opens.
 * Follows Yute's version: an icon and blurb, an "Open:" combo box listing every
 * launchable program, OK / Cancel / Browse, Enter to run, and a Windows-style
 * "cannot find the file" error when the name doesn't match anything.
 */
const Run: React.FC<RunProps> = ({
    programs,
    launch,
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [value, setValue] = useState('');
    const [listOpen, setListOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Match on the display name or the internal key, case- and space-insensitive.
    const normalise = (s: string) => s.toLowerCase().replace(/\s+/g, '');
    const index = useMemo(() => {
        const map = new Map<string, string>();
        programs.forEach((p) => {
            map.set(normalise(p.name), p.key);
            map.set(normalise(p.key), p.key);
        });
        return map;
    }, [programs]);

    const run = () => {
        const typed = value.trim();
        if (!typed) return;
        const key = index.get(normalise(typed));
        if (!key) {
            setError(typed);
            return;
        }
        launch(key);
        onClose();
    };

    return (
        <Window
            top={200}
            left={120}
            width={400}
            height={215}
            windowTitle="Run"
            windowBarIcon="runIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText=""
        >
            <div style={styles.container}>
                <div style={styles.top}>
                    <Icon icon="runIcon" style={styles.runIcon} />
                    <p style={styles.blurb}>
                        Type the name of a program, folder, or document, and
                        Windows will open it for you.
                    </p>
                </div>

                <div style={styles.row}>
                    <p style={styles.openLabel}>Open:</p>
                    <div style={styles.combo}>
                        <input
                            ref={inputRef}
                            style={styles.input}
                            maxLength={40}
                            value={value}
                            autoFocus
                            onChange={(e) => {
                                setValue(e.target.value);
                                setError(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') run();
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                        <div
                            style={styles.caret}
                            title="Show the list of programs"
                            onClick={() => setListOpen((o) => !o)}
                        >
                            ▼
                        </div>

                        {listOpen && (
                            <div style={styles.dropdown}>
                                {programs.map((p) => (
                                    <p
                                        key={p.key}
                                        style={styles.dropdownItem}
                                        onClick={() => {
                                            setValue(p.name);
                                            setListOpen(false);
                                            setError(null);
                                            inputRef.current?.focus();
                                        }}
                                    >
                                        {p.name}
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={styles.buttonBar}>
                    <button
                        style={Object.assign(
                            {},
                            styles.button,
                            !value.trim() && styles.disabled
                        )}
                        onClick={run}
                        disabled={!value.trim()}
                    >
                        OK
                    </button>
                    <button style={styles.button} onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        style={styles.button}
                        onClick={() => setListOpen((o) => !o)}
                    >
                        Browse...
                    </button>
                </div>

                {/* Windows 95's "cannot find the file" box. */}
                {error && (
                    <div style={styles.errorOverlay}>
                        <div style={styles.errorBox}>
                            <div style={styles.errorTitleBar}>
                                <span style={styles.errorTitle}>Error</span>
                            </div>
                            <div style={styles.errorBody}>
                                <p style={styles.errorText}>
                                    Cannot find the file '{error}' (or one of its
                                    components). Make sure the path and filename
                                    are correct and that all required libraries
                                    are available.
                                </p>
                            </div>
                            <div style={styles.errorButtons}>
                                <button
                                    style={styles.button}
                                    onClick={() => {
                                        setError(null);
                                        inputRef.current?.focus();
                                    }}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
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
        position: 'relative',
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        padding: 12,
    },
    top: {
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 14,
        flexShrink: 0,
    },
    runIcon: {
        width: 32,
        height: 32,
        flexShrink: 0,
    },
    blurb: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        lineHeight: 1.5,
        color: Colors.black,
    },
    row: {
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
    },
    openLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        width: 40,
    },
    combo: {
        position: 'relative',
        flex: 1,
        alignItems: 'stretch',
    },
    input: {
        flex: 1,
        minWidth: 0,
        padding: '3px 4px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
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
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 18,
        maxHeight: 120,
        overflowY: 'auto',
        overflowX: 'hidden',
        flexDirection: 'column',
        background: Colors.white,
        border: `1px solid ${Colors.black}`,
        zIndex: 30,
    },
    dropdownItem: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        padding: '3px 6px',
        cursor: 'pointer',
        flexShrink: 0,
    },
    buttonBar: {
        gap: 8,
        justifyContent: 'flex-end',
        marginTop: 'auto',
        paddingTop: 12,
        flexShrink: 0,
    },
    button: {
        padding: '4px 14px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        minWidth: 66,
        textAlign: 'center',
    },
    disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    errorOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.15)',
        zIndex: 40,
    },
    errorBox: {
        flexDirection: 'column',
        width: 300,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
        padding: 2,
    },
    errorTitleBar: {
        background: Colors.blue,
        padding: '2px 4px',
        flexShrink: 0,
    },
    errorTitle: {
        color: Colors.white,
        fontFamily: 'MSSerif',
        fontSize: 11,
    },
    errorBody: {
        padding: 12,
    },
    errorText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        lineHeight: 1.5,
        color: Colors.black,
    },
    errorButtons: {
        justifyContent: 'center',
        paddingBottom: 10,
        flexShrink: 0,
    },
};

export default Run;
