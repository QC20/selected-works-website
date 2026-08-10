/**
 * "Do you want to save the changes?"
 *
 * The box Windows 95 put in front of you every time you closed a document with
 * unsaved work in it. Same wording, same three buttons, same order — Yes is the
 * default and takes the Enter key, Cancel takes Escape and means "I did not
 * mean to close this at all", which is a different answer from No and always
 * was.
 *
 * On this desktop it earns its keep twice over. It is the period detail people
 * remember, and the files it protects are real: a note or a drawing closed
 * without saving is gone, and it was also about to be the next visitor's,
 * because everything saved here goes into the shared gallery.
 */

import React, { useEffect, useRef } from 'react';
import Colors from '../../constants/colors';

export type SaveAnswer = 'save' | 'discard' | 'cancel';

export interface SaveChangesDialogProps {
    /** The program asking — "Paint", "Notepad". Goes in the title bar. */
    programName: string;
    /** The document, if it has been named yet. */
    fileName?: string;
    onAnswer: (answer: SaveAnswer) => void;
}

const SaveChangesDialog: React.FC<SaveChangesDialogProps> = ({
    programName,
    fileName,
    onAnswer,
}) => {
    const yesRef = useRef<HTMLButtonElement>(null);

    // Focus the default button, and let the keyboard answer the question.
    useEffect(() => {
        yesRef.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onAnswer('cancel');
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onAnswer]);

    const subject = fileName || 'Untitled';

    return (
        <div style={styles.backdrop}>
            <div style={styles.dialog} role="dialog" aria-modal="true">
                <div style={styles.titleBar}>
                    <p style={styles.title}>{programName}</p>
                    <div
                        style={styles.closeButton}
                        onClick={() => onAnswer('cancel')}
                        title="Cancel"
                    >
                        ×
                    </div>
                </div>

                <div style={styles.body}>
                    {/* The exclamation roundel, drawn rather than imported —
                        it is two shapes and a full stop. */}
                    <div style={styles.warning} aria-hidden>
                        <span style={styles.warningMark}>!</span>
                    </div>
                    <div style={styles.text}>
                        <p style={styles.line}>
                            The {programName === 'Paint' ? 'image' : 'text'} in
                            the {subject} file has changed.
                        </p>
                        <p style={styles.line}>Do you want to save the changes?</p>
                    </div>
                </div>

                <div style={styles.buttons}>
                    <button
                        ref={yesRef}
                        style={Object.assign({}, styles.button, styles.default)}
                        onClick={() => onAnswer('save')}
                    >
                        Yes
                    </button>
                    <button
                        style={styles.button}
                        onClick={() => onAnswer('discard')}
                    >
                        No
                    </button>
                    <button
                        style={styles.button}
                        onClick={() => onAnswer('cancel')}
                    >
                        Cancel
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
        background: 'rgba(0,0,0,0.12)',
        zIndex: 1000001,
    },
    dialog: {
        flexDirection: 'column',
        width: 380,
        maxWidth: '92%',
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
        padding: 2,
        boxShadow: '2px 2px 8px rgba(0,0,0,0.5)',
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
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        lineHeight: '11px',
        color: Colors.black,
    },
    body: {
        alignItems: 'center',
        gap: 16,
        padding: '20px 18px 14px 18px',
    },
    warning: {
        flexShrink: 0,
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#ffffff',
        border: `2px solid ${Colors.black}`,
        alignItems: 'center',
        justifyContent: 'center',
    },
    warningMark: {
        fontFamily: 'MSSerif',
        fontSize: 22,
        fontWeight: 'bold',
        lineHeight: '22px',
        color: Colors.black,
    },
    text: {
        flexDirection: 'column',
        gap: 10,
        minWidth: 0,
    },
    line: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: Colors.black,
        lineHeight: 1.35,
    },
    buttons: {
        justifyContent: 'center',
        gap: 10,
        padding: '4px 12px 16px 12px',
    },
    button: {
        minWidth: 76,
        padding: '5px 12px',
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: Colors.black,
        cursor: 'pointer',
    },
    // The default button wears a second, darker frame — how Windows showed you
    // which one Enter would press.
    default: {
        outline: `1px solid ${Colors.black}`,
        outlineOffset: 1,
    },
};

export default SaveChangesDialog;
