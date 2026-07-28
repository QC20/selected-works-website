/**
 * "Shut Down Windows" — the modal that Start -> Shut down opens.
 *
 * Ported from the equivalent dialog in Yute (Yuteoctober)'s Windows95
 * Portfolio: the same three radio options, the same Yes / No / Help buttons,
 * and the same outcomes —
 *
 *   Shut down the computer?  -> runs the shutdown sequence
 *   Restart the computer?    -> reloads the page
 *   Log off?                 -> returns to the Windows 95 log-on screen
 *
 * Previously the shutdown animation fired straight from the Start menu with no
 * confirmation; this dialog now sits in front of it.
 */

import React, { useState } from 'react';
import Colors from '../../constants/colors';
import { Icon } from '../general';

export type ShutdownChoice = 'shutdown' | 'restart' | 'logoff';

export interface ShutdownDialogProps {
    onConfirm: (choice: ShutdownChoice) => void;
    onCancel: () => void;
}

const OPTIONS: { value: ShutdownChoice; label: string }[] = [
    { value: 'shutdown', label: 'Shut down the computer?' },
    { value: 'restart', label: 'Restart the computer?' },
    { value: 'logoff', label: 'Log off?' },
];

const ShutdownDialog: React.FC<ShutdownDialogProps> = ({
    onConfirm,
    onCancel,
}) => {
    const [choice, setChoice] = useState<ShutdownChoice | null>(null);
    const [help, setHelp] = useState(false);

    return (
        <div style={styles.backdrop}>
            <div style={styles.dialog}>
                <div style={styles.titleBar}>
                    <p style={styles.title}>Shut Down Windows</p>
                    <div
                        style={styles.closeButton}
                        onClick={onCancel}
                        title="Close"
                    >
                        ×
                    </div>
                </div>

                <div style={styles.body}>
                    <Icon icon="shutdownPcIcon" style={styles.pcIcon} />

                    <div style={styles.options}>
                        <p style={styles.prompt}>Are you sure you want to:</p>
                        {OPTIONS.map((opt) => (
                            <label key={opt.value} style={styles.option}>
                                <input
                                    type="radio"
                                    name="shutdown-option"
                                    value={opt.value}
                                    checked={choice === opt.value}
                                    onChange={() => setChoice(opt.value)}
                                    style={styles.radio}
                                />
                                <span
                                    style={Object.assign(
                                        {},
                                        styles.optionLabel,
                                        choice === opt.value &&
                                            styles.optionSelected
                                    )}
                                >
                                    {opt.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {help && (
                    <p style={styles.helpText}>
                        Shut down runs the shutdown sequence. Restart reloads
                        this page. Log off returns to the log-on screen — none
                        of it touches your real computer.
                    </p>
                )}

                <div style={styles.buttonBar}>
                    <button
                        style={Object.assign(
                            {},
                            styles.button,
                            !choice && styles.disabled
                        )}
                        disabled={!choice}
                        onClick={() => choice && onConfirm(choice)}
                    >
                        Yes
                    </button>
                    <button style={styles.button} onClick={onCancel}>
                        No
                    </button>
                    <button
                        style={styles.button}
                        onClick={() => setHelp((h) => !h)}
                    >
                        Help
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(1px)',
        WebkitBackdropFilter: 'blur(1px)',
        background: 'rgba(0,0,0,0.15)',
        zIndex: 1000000,
    },
    dialog: {
        flexDirection: 'column',
        width: 372,
        maxWidth: '92%',
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
        padding: 2,
    },
    titleBar: {
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 20,
        background: Colors.blue,
        paddingLeft: 4,
        paddingRight: 2,
        flexShrink: 0,
    },
    title: {
        color: Colors.white,
        fontFamily: 'MSSerif',
        fontSize: 12,
    },
    closeButton: {
        width: 16,
        height: 14,
        alignItems: 'center',
        justifyContent: 'center',
        background: Colors.lightGray,
        border: `1px solid ${Colors.black}`,
        borderTopColor: Colors.white,
        borderLeftColor: Colors.white,
        fontFamily: 'MSSerif',
        fontSize: 13,
        lineHeight: '12px',
        color: Colors.black,
        cursor: 'pointer',
        userSelect: 'none',
    },
    body: {
        gap: 14,
        padding: '18px 14px 10px 14px',
        alignItems: 'flex-start',
        flexShrink: 0,
    },
    pcIcon: {
        width: 48,
        height: 45,
        flexShrink: 0,
    },
    options: {
        flexDirection: 'column',
        gap: 6,
        flex: 1,
        minWidth: 0,
    },
    prompt: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        marginBottom: 4,
    },
    option: {
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        display: 'flex',
    },
    radio: {
        // index.css sets `input { width: 100% }` for the showcase's text
        // fields, which stretches a radio button into a full-width bar. Pin it.
        width: 13,
        minWidth: 13,
        height: 13,
        padding: 0,
        margin: 0,
        boxShadow: 'none',
        cursor: 'pointer',
        flexShrink: 0,
    },
    optionLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        padding: '1px 2px',
        border: '1px dotted transparent',
        userSelect: 'none',
        whiteSpace: 'nowrap',
    },
    optionSelected: {
        border: `1px dotted ${Colors.black}`,
    },
    helpText: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        lineHeight: 1.5,
        padding: '0 14px 6px 14px',
    },
    buttonBar: {
        gap: 8,
        justifyContent: 'center',
        padding: '4px 12px 14px 12px',
        flexShrink: 0,
    },
    button: {
        padding: '4px 12px',
        minWidth: 74,
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        textAlign: 'center',
    },
    disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
};

export default ShutdownDialog;
