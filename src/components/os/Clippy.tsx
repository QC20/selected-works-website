import React, { useCallback, useEffect, useRef, useState } from 'react';
import Colors from '../../constants/colors';
import { playChime, playClick } from './sounds';
import { useSaveablePrograms } from './saveablePrograms';

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
    /** A page inside My Showcase this line is about. */
    route?: string;
    /** The label on the button that goes there. */
    action?: string;
    /** Counted separately when choosing what to say next (see `pickNext`). */
    showcase?: boolean;
    /** The button saves the open program's file rather than navigating. */
    save?: boolean;
}

/**
 * What he says.
 *
 * Two kinds of line, and the split is the whole design:
 *
 *  - **Desktop lines** point at something a visitor might not find on their
 *    own, or are honest about how the illusion is put together.
 *  - **Showcase lines** are the ones that matter. They open with something
 *    true and slightly surprising about Jonas, and their button takes you
 *    straight to the page that backs it up. This is a portfolio wearing an
 *    operating system as a costume; the assistant's real job is to make sure
 *    nobody leaves having only played Doom.
 *
 * A line with a `route` gets a second button that opens My Showcase there. The
 * showcase is weighted deliberately: it comes up first, and then roughly every
 * other time (see `pickNext`).
 */
const LINES: Line[] = [
    // --- The showcase ------------------------------------------------------
    {
        text: 'Did you know Jonas paints? Oil on canvas, self-taught, and the newest one is two metres square.',
        animation: clippy2,
        route: '/projects/music',
        action: 'Show me the paintings',
        showcase: true,
    },
    {
        text: 'Before the PhD he DJed for five years with a Copenhagen collective called Dubkultur. There are recorded sets in here.',
        animation: clippy7,
        route: '/projects/music',
        action: 'Play me a set',
        showcase: true,
    },
    {
        text: 'He built a game you play entirely by touch, with no screen at all. It was designed for blind players.',
        animation: clippy4,
        route: '/projects/art',
        action: 'Show me HapNav',
        showcase: true,
    },
    {
        text: 'He wired an eye-tracker to 12 people to find out whether music actually helps you read. It does not.',
        animation: clippy3,
        route: '/projects/software',
        action: 'Show me the study',
        showcase: true,
    },
    {
        text: 'His PhD at Copenhagen Business School is about what AI is doing to managers — the people expected to absorb it on everyone else\'s behalf.',
        animation: clippy1,
        route: '/about',
        action: 'Tell me about Jonas',
        showcase: true,
    },
    {
        text: 'There is a Tetris in here that runs on a two-line LCD screen. The kind of display you normally find on a microwave.',
        animation: clippy5,
        route: '/projects/art',
        action: 'Show me Tromino',
        showcase: true,
    },
    {
        text: 'Curious what he has actually published? The papers and the practitioner workshops are both in My Showcase.',
        animation: clippy6,
        route: '/experience',
        action: 'Show me the research',
        showcase: true,
    },
    {
        text: 'My Showcase is the real reason this desktop exists. Everything else is scenery.',
        animation: clippy2,
        route: '/',
        action: 'Open My Showcase',
        showcase: true,
    },

    // --- The desktop -------------------------------------------------------
    {
        text: "It looks like you're exploring a desktop. Everything here opens. Try double-clicking something.",
        animation: clippy1,
    },
    {
        text: 'Hard Disk (C:) is a real drive, kept in your browser. Save a note in Notepad and it will still be there tomorrow.',
        animation: clippy3,
    },
    {
        text: 'My Documents fills up with what other visitors have drawn and written. Add something and the next person will find it.',
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
        text: 'The MSN window is a real message board. Say something and it stays there for the next visitor.',
        animation: clippy7,
    },
    {
        text: 'Jonas built all of this. If it made you smile, that was the entire point.',
        animation: clippy2,
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

/**
 * How long Paint or Notepad has to be open before he offers to save what is in
 * it. Short enough to catch someone who has finished, long enough that it does
 * not land the second the window opens.
 */
const SAVE_OFFER_AFTER = 45000;

/** The offer is worth making twice, not five times. */
const MAX_SAVE_OFFERS = 2;

export interface ClippyProps {
    /** Held off while something else owns the screen (3D room, screen saver). */
    suspended?: boolean;
    /** Opens a desktop app by its APPLICATIONS key. */
    openApp?: (key: string) => void;
}

const Clippy: React.FC<ClippyProps> = ({ suspended = false, openApp }) => {
    const enabled = useClippyEnabled();
    const [line, setLine] = useState<Line | null>(null);
    // Which lines he has already used, so he works through them rather than
    // repeating himself at random.
    const unsaid = useRef<Line[]>([]);
    const timers = useRef<number[]>([]);
    // How many lines have been said, so the showcase can be given every other
    // turn rather than being left to chance.
    const saidCount = useRef(0);

    // The Paint or Notepad window currently holding unsaved work, if any.
    const saveable = useSaveablePrograms();
    const saveOffers = useRef(0);

    const clearTimers = () => {
        timers.current.forEach(window.clearTimeout);
        timers.current = [];
    };

    /**
     * The next thing to say.
     *
     * Alternating between the two pools is the point: left to a shuffled deck
     * a visitor can easily get four desktop tips in a row and never hear that
     * there is a portfolio behind all this. Each pool is worked through in a
     * shuffled order before it repeats, so nothing comes round twice while
     * something else has not been said at all.
     */
    const pickNext = useCallback((): Line => {
        const wantShowcase = saidCount.current % 2 === 0;
        const pool = unsaid.current.filter(
            (l) => !!l.showcase === wantShowcase
        );
        const source = pool.length ? pool : unsaid.current;
        if (!source.length) {
            unsaid.current = [...LINES].sort(() => Math.random() - 0.5);
            return pickNext();
        }
        const chosen = source[source.length - 1];
        unsaid.current = unsaid.current.filter((l) => l !== chosen);
        return chosen;
    }, []);

    const show = useCallback((next: Line) => {
        setLine(next);
        playChime();
        timers.current.push(
            window.setTimeout(() => setLine(null), VISIBLE_FOR)
        );
    }, []);

    const say = useCallback(() => {
        if (!unsaid.current.length) {
            unsaid.current = [...LINES].sort(() => Math.random() - 0.5);
        }
        show(pickNext());
        saidCount.current += 1;
    }, [pickNext, show]);

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

    /**
     * The one genuinely Clippy-shaped thing he does: notice you have been
     * drawing, and ask whether you would like to keep it.
     *
     * Unlike the original, the offer is finite and the button does the work —
     * it opens Paint's own Save As box, so you still choose the name, and the
     * box already suggests a free one.
     */
    useEffect(() => {
        if (!enabled || suspended || !saveable) return;
        if (saveOffers.current >= MAX_SAVE_OFFERS) return;
        const id = window.setTimeout(() => {
            saveOffers.current += 1;
            show({
                text:
                    saveable.kind === 'painting'
                        ? 'It looks like you are drawing something. Save it and it goes in My Documents\\Paintings, where every future visitor will see it.'
                        : 'It looks like you are writing something. Save it and it goes in My Documents\\Notes, where every future visitor will read it.',
                animation: saveable.kind === 'painting' ? clippy2 : clippy3,
                action:
                    saveable.kind === 'painting'
                        ? 'Save this drawing'
                        : 'Save this note',
                save: true,
            });
        }, SAVE_OFFER_AFTER);
        return () => window.clearTimeout(id);
        // `saveable.id` rather than the object: a re-register with the same
        // program must not restart the clock.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, suspended, saveable?.id, saveable?.kind, show]);

    /**
     * Opens My Showcase on a particular page.
     *
     * The showcase runs its own BrowserRouter inside its window, and a
     * BrowserRouter follows the address bar — so pushing the URL and firing a
     * popstate navigates it whether it was already open or has just been
     * opened by `openApp`.
     */
    const goToShowcase = useCallback(
        (route: string) => {
            window.history.pushState({}, '', route);
            window.dispatchEvent(new PopStateEvent('popstate'));
            openApp?.('showcase');
        },
        [openApp]
    );

    if (!enabled || !line) return null;

    return (
        <div style={styles.container}>
            <div style={styles.bubble}>
                <p style={styles.text}>{line.text}</p>
                <div style={styles.bubbleButtons}>
                    {line.action && (
                        <button
                            style={Object.assign({}, styles.button, styles.primary)}
                            onClick={() => {
                                playClick();
                                if (line.save) saveable?.requestSave();
                                else if (line.route) goToShowcase(line.route);
                                setLine(null);
                            }}
                        >
                            {line.action}
                        </button>
                    )}
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
    /** The button that actually does something, given the default's outline. */
    primary: {
        fontWeight: 'bold',
        outline: `1px solid ${Colors.black}`,
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
