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

const LAST_UPDATED = '2026-08-25';

/**
 * Everything here is deliberately checkable against something else on this
 * machine — a paper on the Experience page, a project in Projects, an entry in
 * Patch Notes. A now page that drifts from the rest of the site is worse than
 * none, so when one of these stops being true, change it here and check the
 * page it points at still agrees.
 */
const NOW_TEXT = [
    "Mid-PhD at the Technical University of Denmark (DTU), looking at how AI reshapes managerial work and well-being \u2014 who absorbs the disruption, what it does to decision-making, and how organisations might handle it more thoughtfully. The Experience page has the published work; the manuscript in progress is listed there too.",
    "Before DTU: an HCI degree at the University of Copenhagen, plus PhD and elective coursework at Copenhagen Business School in 2021 and 2022. The Experience page lists which courses, if you are the sort of person who checks.",
    "Published work so far has landed at ACM CHI, GROUP and CUI, alongside practitioner writing aimed at people who have to actually use this stuff rather than cite it.",
    "Still building things that are not papers: an eye-tracking study run on twelve real participants, a game designed to be played by blind players, and a Tetris that runs on a microwave display. Those live under Projects \u2014 Software and Art.",
    "Outside the research: oil on canvas, self-taught, the newest one about two metres square; and five years of DJ sets with a Copenhagen collective. Both are in Projects rather than hidden away, because they are not a footnote to the rest of it.",
    "This desktop is the ongoing side project. Patch Notes, also in this folder, is the real dated list of what has shipped \u2014 most recently a working television with fifteen channels of archive footage.",
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
