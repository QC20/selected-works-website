import React, { useEffect, useState } from 'react';
import Colors from '../../constants/colors';
import { TASKBAR_HEIGHT } from './metrics';
import { patiently, useIdleTrigger } from './idle';

/**
 * "Click here to begin."
 *
 * The tooltip that pointed at the Start button the first time anyone logged
 * into Windows 95 — an arrow, four words, and a generation of people who
 * suddenly knew where to click. It is probably the single most recognisable
 * detail of the whole operating system, and it costs a positioned div.
 *
 * Shown once ever, remembered in localStorage, and gone the moment Start is
 * pressed — which is the only instruction it was ever giving.
 *
 * It waits for the visitor to stop moving first (see `idle.ts`). Arriving on a
 * timer meant it appeared while someone was still taking the desktop in, which
 * turns an invitation into an instruction; now it only speaks into a pause, and
 * a long one, because the first pause of a visit comes after a good look round.
 */

const SEEN_KEY = 'startBalloon.seen.v1';

export function hasSeenStartBalloon(): boolean {
    try {
        return localStorage.getItem(SEEN_KEY) === '1';
    } catch {
        return true; // storage disabled: don't nag on every load
    }
}

export function markStartBalloonSeen(): void {
    try {
        localStorage.setItem(SEEN_KEY, '1');
    } catch {
        /* nothing to remember it with */
    }
}

export interface StartBalloonProps {
    /** Hidden once the Start menu has been opened, and while it is open. */
    dismissed: boolean;
}

const StartBalloon: React.FC<StartBalloonProps> = ({ dismissed }) => {
    const [visible, setVisible] = useState(false);
    const [seen] = useState(hasSeenStartBalloon);

    // 14–20 seconds of stillness, weighted to the long end.
    const [delay] = useState(() => patiently(14_000, 20_000));
    useIdleTrigger(
        visible ? null : delay,
        () => setVisible(true),
        !seen && !dismissed
    );

    useEffect(() => {
        if (dismissed) markStartBalloonSeen();
    }, [dismissed]);

    if (!visible || dismissed) return null;

    return (
        <div style={styles.container}>
            {/* The arrow, pointing down-left at the Start button. */}
            <div style={styles.arrowOuter} />
            <div style={styles.arrowInner} />
            <p style={styles.text}>Click here to begin</p>
        </div>
    );
};

const styles: StyleSheetCSS = {
    container: {
        position: 'absolute',
        // Just above the taskbar, a little to the right of the Start button,
        // where Windows 95 put it.
        bottom: TASKBAR_HEIGHT + 8,
        left: 60,
        alignItems: 'center',
        padding: '5px 10px 5px 22px',
        background: '#ffffe1',
        border: `1px solid ${Colors.black}`,
        boxShadow: '2px 2px 0 rgba(0,0,0,0.35)',
        zIndex: 110000,
        pointerEvents: 'none',
        // Slow, so it reads as a hint rather than an alert.
        animation: 'startBalloonPulse 2.6s ease-in-out infinite',
    },
    text: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        whiteSpace: 'nowrap',
    },
    arrowOuter: {
        position: 'absolute',
        left: 4,
        bottom: -9,
        width: 0,
        height: 0,
        borderTop: `10px solid ${Colors.black}`,
        borderRight: '12px solid transparent',
    },
    arrowInner: {
        position: 'absolute',
        left: 5,
        bottom: -7,
        width: 0,
        height: 0,
        borderTop: '8px solid #ffffe1',
        borderRight: '10px solid transparent',
    },
};

export default StartBalloon;
