import React from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';

/**
 * Now.txt — My Computer > Hard Disk (D:) > Utility.
 *
 * A "now page" (in the nownownow.com sense): what's actually being worked on
 * at the moment, rather than the fixed, evergreen story About tells. Content
 * lives in `NOW_TEXT` below — short, plain, and meant to be edited whenever
 * what's true changes, the way a real now page is. Update the date whenever
 * the text does; a now page nobody's touched in months is worse than no now
 * page at all.
 */

const LAST_UPDATED = '2026-08-16';

const NOW_TEXT = [
    "Mid-PhD at Copenhagen Business School, looking at how AI reshapes managerial work and well-being — see the Papers app, or the manuscript on the Experience page, for where that's currently at.",
    "Still adding to this desktop between other things — Patch Notes (also in this folder) has the real, dated list of what's shipped recently.",
];

export interface NowProps extends WindowAppProps {}

const Now: React.FC<NowProps> = ({ onInteract, onClose, onMinimize }) => (
    <Window
        top={120}
        left={200}
        width={420}
        height={320}
        windowTitle="Now.txt - Notepad"
        windowBarIcon="notepadIcon"
        closeWindow={onClose}
        onInteract={onInteract}
        minimizeWindow={onMinimize}
        bottomLeftText={`Last updated ${LAST_UPDATED}`}
    >
        <div style={styles.container}>
            <div style={styles.page}>
                {NOW_TEXT.map((line) => (
                    <p key={line} style={styles.line}>
                        {line}
                    </p>
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
        boxSizing: 'border-box',
        padding: 8,
        background: Colors.lightGray,
    },
    page: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        gap: 12,
        padding: '10px 12px',
        overflowY: 'auto',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    line: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        lineHeight: 1.6,
        color: Colors.black,
        margin: 0,
    },
};

export default Now;
