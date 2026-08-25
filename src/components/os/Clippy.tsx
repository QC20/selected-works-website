import React, { useCallback, useEffect, useRef, useState } from 'react';
import Colors from '../../constants/colors';
import { TASKBAR_HEIGHT } from './metrics';
import { playChime, playClick } from './sounds';
import { between, patiently, useIdleTrigger } from './idle';
import { useSaveablePrograms } from './saveablePrograms';
import { useShowcaseVisited } from './showcaseVisited';

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
 * While My Showcase is open and not minimized, he runs on a separate, capped
 * pool instead of the ordinary one below (see `SHOWCASE_TIER1`/`TIER2_TOPICS`/
 * `SHOWCASE_TIER3` and `SHOWCASE_EVENT_CAP`): a small nudge about the desktop
 * underneath, then something personal to whatever hasn't been opened yet, then
 * the games/explore-the-desktop invitation — three appearances per visit to
 * that window, not per session. Close it and he's back on the ordinary pool,
 * which now also carries the same discoverability job (GitHub, the tray, the
 * Store's installable extras) for whenever My Showcase isn't open at all.
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
    /**
     * Opens any app by its APPLICATIONS key — GitHub, the Store, Doom,
     * Market Watch — rather than a showcase page. Goes through the same
     * `openApp` the desktop itself uses, so it opens in front of whatever's
     * already up (My Showcase included) without disturbing it.
     */
    openAppKey?: string;
    /**
     * The button also minimizes My Showcase, for the one tip whose whole
     * point is clearing it out of the way to reveal the desktop underneath.
     */
    minimizeShowcase?: boolean;
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
        text: 'His PhD at the Technical University of Denmark is about what AI is doing to managers — the people expected to absorb it on everyone else\'s behalf.',
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
        text: 'Removed an icon by accident? The Store puts every program back — and it has things that have never had a desktop icon at all.',
        animation: clippy5,
        action: 'Open the Store',
        openAppKey: 'store',
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
        action: 'Open MSN Messenger',
        openAppKey: 'guestbook',
    },
    {
        text: 'That GitHub icon is not a screenshot. It is pulling his actual repositories, live, right now.',
        animation: clippy4,
        action: 'Take a look',
        openAppKey: 'github',
    },
    {
        text: 'The little icons in the bottom-right corner are not decoration — weather, stocks, even your own IP address, all real.',
        animation: clippy3,
        action: 'Try Market Watch',
        openAppKey: 'stocks',
    },
    {
        text: 'Haven’t tried the games yet? Doom is the actual 1993 release, running in the browser.',
        animation: clippy5,
        action: 'Play Doom',
        openAppKey: 'doom',
    },
    {
        text: 'Hard Disk (C:) has a My Paintings folder — one of his real oil paintings, photographed and kept there.',
        animation: clippy2,
        action: 'Open My Computer',
        openAppKey: 'myComputer',
    },
    {
        text: 'Jonas built all of this. If it made you smile, that was the entire point.',
        animation: clippy2,
    },
];

// --- Showcase-open tips --------------------------------------------------
//
// A different pool entirely, used only while My Showcase is open and not
// minimized (see `showcaseOpen` below) — capped at three appearances per
// visit to that window, one from each of these in order, so a visitor who
// leaves it open all session is not talked at indefinitely. Closing and
// reopening My Showcase resets the count.

/**
 * First: small, low-commitment nudges about the desktop this window is
 * sitting on top of. Many variants so a visitor who opens and closes My
 * Showcase a few times in one session does not hear the same one twice in a
 * row.
 */
const SHOWCASE_TIER1: Line[] = [
    {
        text: 'Quick thing: this whole page is a real, working Windows 95 desktop underneath My Showcase, not a picture of one. Try double-clicking something back there sometime.',
        animation: clippy1,
    },
    {
        text: 'The little row of icons in the bottom-right corner is a real system tray — weather, stock prices, even your own IP address, all genuinely live.',
        animation: clippy3,
        action: 'Show me one',
        openAppKey: 'stocks',
    },
    {
        text: 'My Computer, behind this window, has real folders in it — Pictures, My Paintings, a Favorites folder with all his other projects.',
        animation: clippy2,
        action: 'Open My Computer',
        openAppKey: 'myComputer',
    },
    {
        text: 'The GitHub icon on the desktop is not a screenshot — it is live, reading his actual repositories right now.',
        animation: clippy4,
        action: 'Open GitHub',
        openAppKey: 'github',
    },
    {
        text: 'Everything on this desktop drags, resizes and right-clicks like the real thing. My Showcase is just one window among many.',
        animation: clippy6,
    },
];

/**
 * Second: personalized. `buildTier2Line` below fills this in dynamically
 * from whichever showcase pages haven't been opened yet, mixing the
 * personal (About, Art, Music) with the professional (Experience, Software)
 * rather than only ever pointing at one or the other.
 */
interface Tier2Topic {
    route: string;
    text: string;
    action: string;
    animation: string;
}
const TIER2_TOPICS: Tier2Topic[] = [
    {
        route: '/about',
        text: "You haven't opened About yet — it's where he explains why any of this looks like 1995.",
        action: 'Meet Jonas',
        animation: clippy1,
    },
    {
        route: '/experience',
        text: "The Experience page hasn't been opened yet — his research, papers and practitioner workshops live there.",
        action: 'Show me the research',
        animation: clippy6,
    },
    {
        route: '/projects/software',
        text: "Software is still unopened — there's an eye-tracking study on twelve real participants in there.",
        action: 'Show me Software',
        animation: clippy3,
    },
    {
        route: '/projects/art',
        text: "You haven't seen Art yet — a game designed for blind players, and a Tetris that runs on a microwave display.",
        action: 'Show me Art',
        animation: clippy4,
    },
    {
        route: '/projects/music',
        text: "Music is still unopened — his own paintings and five years of DJ sets with a Copenhagen collective.",
        action: 'Show me Music',
        animation: clippy7,
    },
    {
        route: '/contact',
        text: "There's a Contact page, if anything in here makes you want to actually reach him.",
        action: 'Show me Contact',
        animation: clippy2,
    },
];
/** Once every page has been seen — the congratulatory fallback. */
const TIER2_ALL_SEEN: Line = {
    text: "You've actually opened every page in My Showcase. That is more than most visitors manage — thank you for that.",
    animation: clippy2,
};

/**
 * Third: the games, or an invitation to look past My Showcase entirely. Two
 * moods rather than one fixed line, and the second carries the "acknowledge
 * and clear the way" button — it minimizes My Showcase itself, so saying
 * yes actually reveals the desktop rather than just promising to.
 */
const SHOWCASE_TIER3: Line[] = [
    {
        text: "If you'd rather play than read: Doom is on the desktop, the real 1993 release. Pinball, Solitaire and a Store full of more are all back there too.",
        animation: clippy5,
        action: 'Play Doom',
        openAppKey: 'doom',
    },
    {
        text: 'My Showcase is the point of this machine, but there is a whole desktop behind it — a 3D room you can step into, a working Winamp, games. Want a look?',
        animation: clippy6,
        action: 'Show me the desktop',
        minimizeShowcase: true,
    },
];

/**
 * Sending him away used to be permanent, which turned out to be a bug wearing
 * a feature's clothes: one idle click on "Go away", months ago, and Clippy was
 * gone for good on that browser with nothing to suggest he had ever existed.
 * Since he is the main thing pointing visitors at the parts of this site they
 * would otherwise never find, permanent is the wrong default.
 *
 * So the dismissal now expires. "Go away" means *today*, not forever, and the
 * tray paperclip still brings him back instantly. The key is versioned to v2
 * precisely so every already-stored permanent dismissal is ignored — anyone
 * who lost him under the old rule gets him back on their next visit.
 */
const DISMISSED_KEY = 'clippy.dismissed.v2';

/** How long "Go away" lasts before he is allowed to speak again. */
const DISMISS_MS = 24 * 60 * 60 * 1000;

let dismissed: boolean = loadDismissed();
const listeners = new Set<() => void>();

function loadDismissed(): boolean {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        if (!raw) return false;
        const until = Number(raw);
        if (!Number.isFinite(until)) return false;
        if (Date.now() >= until) {
            localStorage.removeItem(DISMISSED_KEY);
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

function setDismissed(next: boolean): void {
    dismissed = next;
    try {
        if (next) {
            localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_MS));
        } else {
            localStorage.removeItem(DISMISSED_KEY);
        }
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

/**
 * When he is allowed to speak.
 *
 * All three are *idle* windows, not elapsed time (see `idle.ts`): the clock only
 * runs while the visitor is still, and any input resets it. Nothing he says is
 * urgent enough to interrupt someone mid-click.
 *
 *   FIRST   the opening tip: 10–15 seconds, so a visitor who has just
 *           arrived gets a real look at the site first before he shows up.
 *   LATER   every tip after that.
 *   COOLDOWN a floor between tips, so a slow reader is not talked at every
 *           twenty seconds just for sitting still.
 */
const FIRST_IDLE = [10_000, 15_000] as const;
const LATER_IDLE = [10_000, 20_000] as const;
const COOLDOWN = 70_000;
const VISIBLE_FOR = 17000;

/**
 * How many times he'll speak up while My Showcase is open and not minimized
 * before going quiet until it's closed and reopened — see `showcaseOpen`
 * below. One tier per appearance, in order: a small nudge about the desktop,
 * then something personalized to what hasn't been opened yet, then the
 * games/explore-the-desktop invitation. Any more than that while someone is
 * genuinely reading My Showcase stops being helpful and starts being the
 * thing everyone hated about the original.
 */
const SHOWCASE_EVENT_CAP = 3;

/**
 * How long after you stop typing or drawing he offers to save it. The registry
 * only reports a program once something has actually been put into it (see
 * `saveablePrograms.ts`), so this is 10–15 seconds after real work exists — the
 * pause where you sit back and look at what you have made, which is exactly the
 * moment before people close the window without saving.
 */
const SAVE_OFFER_IDLE = [10_000, 15_000] as const;

/** The offer is worth making twice, not five times. */
const MAX_SAVE_OFFERS = 2;

export interface ClippyProps {
    /** Held off while something else owns the screen (3D room, screen saver). */
    suspended?: boolean;
    /** Opens a desktop app by its APPLICATIONS key. */
    openApp?: (key: string) => void;
    /**
     * True while My Showcase is open and not minimized — switches him onto
     * the capped, tiered showcase-open pool below instead of the ordinary
     * alternating one.
     */
    showcaseOpen?: boolean;
    /** Minimizes My Showcase — the showcase-tier-3 "show me the desktop" button. */
    onMinimizeShowcase?: () => void;
}

const Clippy: React.FC<ClippyProps> = ({
    suspended = false,
    openApp,
    showcaseOpen = false,
    onMinimizeShowcase,
}) => {
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

    // How many showcase-open tiers have fired since My Showcase was last
    // opened (see SHOWCASE_EVENT_CAP). A ref, not state: it only needs to be
    // read at the moment he'd otherwise speak, not to trigger a render of
    // its own — `show()`'s own setLine already causes the re-render that
    // matters.
    const showcaseEventCount = useRef(0);
    const wasShowcaseOpen = useRef(showcaseOpen);
    const visitedShowcase = useShowcaseVisited();

    useEffect(() => {
        // Closed (or never opened) -> open is a fresh visit to the window,
        // so it gets its own three tiers again.
        if (showcaseOpen && !wasShowcaseOpen.current) {
            showcaseEventCount.current = 0;
        }
        wasShowcaseOpen.current = showcaseOpen;
    }, [showcaseOpen]);

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

    /**
     * One tier per call, in order — tier 1 the first time My Showcase is
     * open when he speaks, tier 2 the second, tier 3 (and every call after)
     * the third. `sayNext` below is what actually gates this behind
     * `SHOWCASE_EVENT_CAP` for *unprompted* appearances; called directly
     * (from "Tell me more") it always has something to say, since a visitor
     * asking for more is not the interruption the cap exists to prevent.
     */
    const sayShowcaseTier = useCallback(() => {
        const tier = showcaseEventCount.current;
        showcaseEventCount.current += 1;
        if (tier === 0) {
            const pool = SHOWCASE_TIER1;
            show(pool[Math.floor(Math.random() * pool.length)]);
            return;
        }
        if (tier === 1) {
            const unvisited = TIER2_TOPICS.filter(
                (t) => !visitedShowcase.has(t.route)
            );
            if (!unvisited.length) {
                show(TIER2_ALL_SEEN);
                return;
            }
            const topic =
                unvisited[Math.floor(Math.random() * unvisited.length)];
            show({
                text: topic.text,
                animation: topic.animation,
                route: topic.route,
                action: topic.action,
            });
            return;
        }
        const pool = SHOWCASE_TIER3;
        show(pool[Math.floor(Math.random() * pool.length)]);
    }, [show, visitedShowcase]);

    /** What "Tell me more" (and the idle trigger) actually calls. */
    const sayNext = useCallback(() => {
        if (showcaseOpen) sayShowcaseTier();
        else say();
    }, [showcaseOpen, sayShowcaseTier, say]);

    // The next idle window he is waiting for. Re-drawn after every tip so no two
    // visits — and no two tips — have the same rhythm.
    const [waitFor, setWaitFor] = useState<number | null>(() =>
        patiently(FIRST_IDLE[0], FIRST_IDLE[1])
    );
    /** Nothing before this, however long the visitor sits still. */
    const notBefore = useRef(0);

    useEffect(() => {
        if (!enabled || suspended) {
            clearTimers();
            setLine(null);
        }
    }, [enabled, suspended]);

    // Capped out for this visit to My Showcase: unprompted appearances stop,
    // but re-opening the window (or just closing it, which switches him back
    // onto the ordinary pool) starts the count over. See SHOWCASE_EVENT_CAP.
    const showcaseCapped =
        showcaseOpen && showcaseEventCount.current >= SHOWCASE_EVENT_CAP;

    useIdleTrigger(
        waitFor,
        () => {
            // Still inside the cooldown from the last tip: go quiet and try
            // again at the next lull rather than queueing one up.
            if (Date.now() < notBefore.current) {
                setWaitFor(between(LATER_IDLE[0], LATER_IDLE[1]));
                return;
            }
            sayNext();
            notBefore.current = Date.now() + COOLDOWN;
            setWaitFor(between(LATER_IDLE[0], LATER_IDLE[1]));
        },
        enabled && !suspended && !line && !showcaseCapped
    );

    /**
     * The one genuinely Clippy-shaped thing he does: notice you have been
     * drawing, and ask whether you would like to keep it.
     *
     * Unlike the original, the offer is finite and the button does the work —
     * it opens Paint's own Save As box, so you still choose the name, and the
     * box already suggests a free one.
     */
    const [saveWait] = useState(() =>
        between(SAVE_OFFER_IDLE[0], SAVE_OFFER_IDLE[1])
    );
    useIdleTrigger(
        saveWait,
        () => {
            if (!saveable || saveOffers.current >= MAX_SAVE_OFFERS) return;
            saveOffers.current += 1;
            show({
                // Short on purpose. He is interrupting to prevent a loss, and
                // an interruption you have to read twice is worse than none.
                text:
                    saveable.kind === 'painting'
                        ? 'It looks like you are drawing. Save it before Windows does something regrettable.'
                        : 'It looks like you are writing. Save it before Windows does something regrettable.',
                animation: saveable.kind === 'painting' ? clippy2 : clippy3,
                action: 'Save it now',
                save: true,
            });
        },
        enabled &&
            !suspended &&
            !line &&
            !!saveable &&
            saveOffers.current < MAX_SAVE_OFFERS
    );

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
                                else if (line.minimizeShowcase) {
                                    onMinimizeShowcase?.();
                                } else if (line.openAppKey) {
                                    openApp?.(line.openAppKey);
                                } else if (line.route) {
                                    goToShowcase(line.route);
                                }
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
                            sayNext();
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
                    sayNext();
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
        bottom: TASKBAR_HEIGHT + 12,
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
