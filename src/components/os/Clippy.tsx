import React, { useCallback, useEffect, useRef, useState } from 'react';
import Colors from '../../constants/colors';
import { playChime, playClick } from './sounds';

import clippy1 from '../../assets/clippy/clippy1.gif';
import clippy2 from '../../assets/clippy/clippy2.gif';
import clippy3 from '../../assets/clippy/clippy3.gif';
import clippy4 from '../../assets/clippy/clippy4.gif';
import clippy5 from '../../assets/clippy/clippy5.gif';
import clippy6 from '../../assets/clippy/clippy6.gif';
import clippy7 from '../../assets/clippy/clippy7.gif';

/**
 * Clippy.
 *
 * He turns up in the bottom-right corner every so often, says something, and
 * goes away again — which is exactly as much as the real one was ever wanted.
 *
 * Two decisions that keep him from becoming the thing everyone hated:
 *
 *  - He is quiet by default about *himself* and specific about the desktop. A
 *    line that tells you the C: drive is real, or that the Store puts icons
 *    back, is worth reading; "It looks like you're writing a letter" is not.
 *  - Dismissing him with the X is permanent (it's remembered), and the Start
 *    menu can bring him back. An assistant you cannot get rid of is a bug.
 *
 * The animations come from Yute's Windows95 Portfolio — see ATTRIBUTIONS.md.
 */

const ANIMATIONS = [clippy1, clippy2, clippy3, clippy4, clippy5, clippy6, clippy7];

interface Line {
    text: string;
    animation: string;
}

/**
 * What he says. Written to be about *this* machine: each line either points at
 * something a visitor might not find on their own, or is honest about how the
 * illusion is put together.
 */
const LINES: Line[] = [
    {
        text: "It looks like you're exploring a desktop. Everything here opens — try double-clicking something.",
        animation: clippy1,
    },
    {
        text: 'Hard Disk (C:) is a real drive, kept in your browser. Save a note in Notepad and it will still be there tomorrow.',
        animation: clippy3,
    },
    {
        text: 'Anything you draw in Paint can be saved to My Documents\\Paintings — and downloaded to your actual computer.',
        animation: clippy2,
    },
    {
        text: 'Right-click the desktop. There is a menu there, and it does what it says.',
        animation: clippy4,
    },
    {
        text: 'Removed an icon by accident? The Store puts every program back.',
        animation: clippy5,
    },
    {
        text: 'Stop typing for a few minutes and the screen saver starts. Display Properties decides which one.',
        animation: clippy7,
    },
    {
        text: 'Step Outside pulls you back through the screen, into the room the monitor is standing in.',
        animation: clippy6,
    },
    {
        text: 'The processor count in System Properties is your real one. The Windows 95 badge above it is not.',
        animation: clippy3,
    },
    {
        text: 'Start > Run still opens anything by name, even a program you have taken off the desktop.',
        animation: clippy1,
    },
    {
        text: 'Jonas built all of this. If it made you smile, that was the entire point.',
        animation: clippy2,
    },
    {
        text: 'Sometimes I just pop up for no particular reason. Like now.',
        animation: clippy7,
    },
];

const DISMISSED_KEY = 'clippy.dismissed.v1';

let dismissed: boolean = loadDismissed();
const listeners = new Set<() => void>();

function loadDismissed(): boolean {
    try {
        return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
        return false;
    }
}

function setDismissed(next: boolean): void {
    dismissed = next;
    try {
        localStorage.setItem(DISMISSED_KEY, next ? '1' : '0');
    } catch {
        /* storage disabled — the choice just won't survive a reload */
    }
    listeners.forEach((fn) => fn());
}

/** Start > Clippy toggles him; the menu needs to know which way round it is. */
export function isClippyEnabled(): boolean {
    return !dismissed;
}

export function toggleClippy(): void {
    setDismissed(!dismissed);
}

export function useClippyEnabled(): boolean {
    const [, forceRender] = useState(0);
    useEffect(() => {
        const listener = () => forceRender((n) => n + 1);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return !dismissed;
}

/** First appearance, then the gap between them. Long enough to be a surprise. */
const FIRST_DELAY = 20000;
const GAP = 95000;
const VISIBLE_FOR = 17000;

export interface ClippyProps {
    /** Held off while something else owns the screen (3D room, screen saver). */
    suspended?: boolean;
}

const Clippy: React.FC<ClippyProps> = ({ suspended = false }) => {
    const enabled = useClippyEnabled();
    const [line, setLine] = useState<Line | null>(null);
    // Which lines he has already used, so he works through them rather than
    // repeating himself at random.
    const unsaid = useRef<Line[]>([]);
    const timers = useRef<number[]>([]);

    const clearTimers = () => {
        timers.current.forEach(window.clearTimeout);
        timers.current = [];
    };

    const say = useCallback(() => {
        if (!unsaid.current.length) {
            unsaid.current = [...LINES].sort(() => Math.random() - 0.5);
        }
        setLine(unsaid.current.pop() || LINES[0]);
        playChime();
        timers.current.push(
            window.setTimeout(() => setLine(null), VISIBLE_FOR)
        );
    }, []);

    useEffect(() => {
        if (!enabled || suspended) {
            clearTimers();
            setLine(null);
            return;
        }
        const schedule = (delay: number) => {
            timers.current.push(
                window.setTimeout(() => {
                    say();
                    schedule(GAP);
                }, delay)
            );
        };
        schedule(FIRST_DELAY);
        return clearTimers;
    }, [enabled, suspended, say]);

    if (!enabled || !line) return null;

    return (
        <div style={styles.container}>
            <div style={styles.bubble}>
                <p style={styles.text}>{line.text}</p>
                <div style={styles.bubbleButtons}>
                    <button
                        style={styles.button}
                        onClick={() => {
                            playClick();
                            say();
                        }}
                    >
                        Tell me more
                    </button>
                    <button
                        style={styles.button}
                        onClick={() => {
                            playClick();
                            setDismissed(true);
                        }}
                        title="Hide Clippy (Start > Clippy brings him back)"
                    >
                        Go away
                    </button>
                </div>
                {/* The tail, drawn as two triangles so it has an outline. */}
                <div style={styles.tailOuter} />
                <div style={styles.tailInner} />
            </div>
            <img
                src={line.animation}
                alt="Clippy"
                style={styles.clippy}
                onClick={() => {
                    playClick();
                    say();
                }}
                title="Clippy"
            />
        </div>
    );
};

/** A random animation, for anywhere else that wants to show him. */
export const randomClippy = (): string =>
    ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)];

const styles: StyleSheetCSS = {
    container: {
        position: 'absolute',
        right: 16,
        // Clear of the taskbar.
        bottom: 44,
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2,
        // Above every window, below the screen saver and the context menu.
        zIndex: 120000,
        pointerEvents: 'none',
    },
    bubble: {
        position: 'relative',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 260,
        padding: '10px 12px',
        // The Office Assistant's balloon was the one thing on screen that
        // wasn't grey.
        background: '#ffffe1',
        border: `1px solid ${Colors.black}`,
        boxShadow: '2px 2px 0 rgba(0,0,0,0.35)',
        pointerEvents: 'auto',
    },
    text: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        lineHeight: 1.5,
    },
    bubbleButtons: {
        justifyContent: 'flex-end',
        gap: 6,
    },
    button: {
        padding: '3px 8px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        cursor: 'pointer',
    },
    tailOuter: {
        position: 'absolute',
        right: 26,
        bottom: -10,
        width: 0,
        height: 0,
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderTop: `10px solid ${Colors.black}`,
    },
    tailInner: {
        position: 'absolute',
        right: 27,
        bottom: -8,
        width: 0,
        height: 0,
        borderLeft: '9px solid transparent',
        borderRight: '9px solid transparent',
        borderTop: '9px solid #ffffe1',
    },
    clippy: {
        width: 92,
        height: 92,
        objectFit: 'contain',
        cursor: 'pointer',
        pointerEvents: 'auto',
    },
};

export default Clippy;
