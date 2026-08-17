import React from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import patchNotes from './patchNotesData';

/**
 * Patch Notes — My Computer > Hard Disk (D:) > Utility.
 *
 * The desktop's change log, as an app. The content lives in `patchNotes.ts`;
 * this is only the window around it. Same idea as the Patch app in Yute's
 * Utility folder.
 */

export interface PatchNotesProps extends WindowAppProps {}

const PatchNotes: React.FC<PatchNotesProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => (
    <Window
        top={100}
        left={180}
        width={440}
        height={420}
        windowTitle="Patch Notes"
        windowBarIcon="patchNotesIcon"
        closeWindow={onClose}
        onInteract={onInteract}
        minimizeWindow={onMinimize}
        bottomLeftText={`${patchNotes.length} entries — newest first`}
    >
        <div style={styles.container}>
            <div style={styles.scroll}>
                {patchNotes.map((entry) => (
                    <div key={`${entry.head}-${entry.date}`} style={styles.entry}>
                        <div style={styles.entryHead}>
                            <span style={styles.head}>{entry.head}</span>
                            <span style={styles.date}>{entry.date}</span>
                        </div>
                        {entry.why && (
                            <p style={styles.why}>{entry.why}</p>
                        )}
                        <ul style={styles.notes}>
                            {entry.notes.map((note) => (
                                <li key={note} style={styles.note}>
                                    {note}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    </Window>
);

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        // Padding has to come out of the 100%, or the list overflows the window.
        boxSizing: 'border-box',
        padding: 8,
        background: Colors.lightGray,
    },
    scroll: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        gap: 14,
        padding: '10px 12px',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    entry: {
        flexDirection: 'column',
        gap: 5,
        flexShrink: 0,
    },
    entryHead: {
        alignItems: 'baseline',
        gap: 8,
        borderBottom: `1px solid ${Colors.lightGray}`,
        paddingBottom: 3,
    },
    head: {
        flex: 1,
        minWidth: 0,
        fontFamily: 'MSSerif',
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.black,
    },
    date: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        flexShrink: 0,
    },
    why: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontStyle: 'italic',
        color: Colors.darkGray,
        lineHeight: 1.5,
        margin: 0,
    },
    notes: {
        display: 'block',
        margin: 0,
        paddingLeft: 18,
    },
    note: {
        display: 'list-item',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        lineHeight: 1.6,
    },
};

export default PatchNotes;
