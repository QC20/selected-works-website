import React, { useCallback, useEffect, useRef, useState } from 'react';
import Bsod from './Bsod';
import Starfield from './screensavers/Starfield';
import Mystify from './screensavers/Mystify';
import FlyingIcons from './screensavers/FlyingIcons';

/**
 * The screen saver.
 *
 * 3D Pipes and the Flower Box run as the two programs this machine already
 * has (see `win98Programs.ts`) full-screen with no chrome — which is exactly
 * where Windows 95 got its screen savers from too, ordinary executables the
 * system ran when you stopped typing. Starfield, Mystify and Flying Windows
 * are the other three that actually shipped on a stock Windows 95 install
 * (Plus! added more, but those needed the Plus! pack); this machine doesn't
 * have those as standalone programs, so they're small canvas/DOM
 * recreations under `screensavers/` instead — same look, no iframe.
 *
 * Two details that matter more than they look:
 *
 *  - The countdown is driven by real input on the *desktop*, but a click inside
 *    a program's iframe never reaches us. Playing Doom would therefore trip the
 *    screen saver mid-game. `window.blur` is the one signal we do get when
 *    focus moves into a frame, so that counts as activity too, and the timer
 *    restarts whenever focus comes back.
 *  - Dismissing has to survive the saver's own iframe swallowing the click, so
 *    a transparent sheet sits over it and takes the first press itself. That is
 *    also what the real thing did: the first movement only wakes the screen.
 *
 * A third thing lives here too: the Blue Screen of Death. Real Windows 9x
 * machines didn't crash on a schedule — they crashed rarely, at the worst
 * possible moment, which for an idle machine means "instead of the screen
 * saver". `BSOD_CHANCE` is how often that coin flip goes the wrong way. It's
 * deliberately small: most visitors idle out at least once in a longer visit,
 * and this should stay a rare thing a handful of them see, not something
 * everyone runs into by the second time they look away.
 */

/** One idle timeout in twenty lands on the BSOD instead of the normal saver. */
const BSOD_CHANCE = 0.05;

export type ScreensaverKind =
    | 'pipes'
    | 'flower'
    | 'starfield'
    | 'mystify'
    | 'flying'
    | 'random'
    | 'off';

/** Every concrete saver — everything `'random'` picks between. */
const CONCRETE_KINDS: Exclude<ScreensaverKind, 'off' | 'random'>[] = [
    'pipes',
    'flower',
    'starfield',
    'mystify',
    'flying',
];

type ConcreteKind = (typeof CONCRETE_KINDS)[number];

const IFRAME_SAVERS: { [key in 'pipes' | 'flower']: { src: string; name: string } } = {
    pipes: {
        // Same options 98.js passes when it runs this as a screen saver: no
        // overlaid controls, just the pipes.
        src: `/98/programs/pipes/index.html#${encodeURIComponent(
            JSON.stringify({ hideUI: true })
        )}`,
        name: '3D Pipes',
    },
    flower: {
        src: '/98/programs/3D-FlowerBox/index.html',
        name: '3D Flower Box',
    },
};

const isIframeSaver = (k: ConcreteKind): k is 'pipes' | 'flower' =>
    k === 'pipes' || k === 'flower';

const KIND_KEY = 'screensaver.kind.v1';
const DELAY_KEY = 'screensaver.delay.v1';
const BAG_KEY = 'screensaver.bag.v1';

/** Wait options, in minutes, as the Screen Saver tab offered them. */
export const SCREENSAVER_DELAYS = [1, 3, 5, 10, 15];

const VALID_KINDS: ScreensaverKind[] = [
    'off',
    'random',
    ...CONCRETE_KINDS,
];

export function loadScreensaverKind(): ScreensaverKind {
    try {
        const stored = localStorage.getItem(KIND_KEY);
        return stored && (VALID_KINDS as string[]).includes(stored)
            ? (stored as ScreensaverKind)
            : // Nobody has ever visited Display Properties to say otherwise —
              // default to seeing a different one each time, not always Pipes.
              'random';
    } catch {
        return 'random';
    }
}

/**
 * Display Properties writes these and the desktop reads them, so they need the
 * same subscribe-and-rerender treatment as the theme (see `theme.ts`) —
 * otherwise picking a different saver wouldn't take effect until a reload.
 */
const listeners = new Set<() => void>();
let kind: ScreensaverKind = loadScreensaverKind();
let delay: number = loadScreensaverDelay();

export function saveScreensaverKind(next: ScreensaverKind): void {
    kind = next;
    try {
        localStorage.setItem(KIND_KEY, next);
    } catch {
        /* storage disabled — the choice just won't survive a reload */
    }
    listeners.forEach((fn) => fn());
}

/** Subscribes a component to the screen saver settings. */
export function useScreensaverSettings(): {
    kind: ScreensaverKind;
    delayMinutes: number;
} {
    const [, forceRender] = useState(0);
    useEffect(() => {
        const listener = () => forceRender((n) => n + 1);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return { kind, delayMinutes: delay };
}

export function loadScreensaverDelay(): number {
    try {
        const stored = Number(localStorage.getItem(DELAY_KEY));
        return SCREENSAVER_DELAYS.includes(stored) ? stored : 5;
    } catch {
        return 5;
    }
}

export function saveScreensaverDelay(minutes: number): void {
    delay = minutes;
    try {
        localStorage.setItem(DELAY_KEY, String(minutes));
    } catch {
        /* as above */
    }
    listeners.forEach((fn) => fn());
}

/** Human labels for the savers, for the Display Properties list. */
export const SCREENSAVER_OPTIONS: { value: ScreensaverKind; label: string }[] = [
    { value: 'off', label: '(None)' },
    { value: 'random', label: 'Random (a different one each time)' },
    { value: 'pipes', label: '3D Pipes' },
    { value: 'flower', label: '3D Flower Box' },
    { value: 'starfield', label: 'Starfield Simulation' },
    { value: 'mystify', label: 'Mystify Your Mind' },
    { value: 'flying', label: 'Flying Windows' },
];

// ---- The "random" bag ------------------------------------------------------
// A shuffled queue rather than a fresh dice roll each time: a plain random
// pick repeats itself constantly over a long enough visit (birthday-paradox
// odds with only five savers), which reads as broken variety, not real
// variety. Dealing from a shuffled bag and reshuffling once it's empty means
// every saver is guaranteed to come up once before any of them repeats, and
// persisting the bag means that guarantee survives a reload and carries over
// to the next visit too.

function shuffled<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a;
}

function loadBag(): ConcreteKind[] {
    try {
        const raw = localStorage.getItem(BAG_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (
            Array.isArray(parsed) &&
            parsed.every((k) => (CONCRETE_KINDS as string[]).includes(k))
        ) {
            return parsed as ConcreteKind[];
        }
    } catch {
        /* fall through to an empty bag, which just reshuffles immediately */
    }
    return [];
}

let bag: ConcreteKind[] = loadBag();
let lastShown: ConcreteKind | null = null;

/** Pulls the next kind out of the bag, reshuffling once it runs out — never
 * letting the fresh shuffle's first card repeat whatever was just shown. */
function nextFromBag(): ConcreteKind {
    if (bag.length === 0) {
        bag = shuffled(CONCRETE_KINDS);
        if (bag.length > 1 && bag[0] === lastShown) {
            const tmp = bag[0];
            bag[0] = bag[1];
            bag[1] = tmp;
        }
    }
    const next = bag.shift() as ConcreteKind;
    try {
        localStorage.setItem(BAG_KEY, JSON.stringify(bag));
    } catch {
        /* the guarantee just won't survive a reload */
    }
    lastShown = next;
    return next;
}

export interface ScreensaverProps {
    kind: ScreensaverKind;
    /** Minutes of quiet before it starts. */
    delayMinutes: number;
    /**
     * Held off while something else already owns the whole screen — the 3D
     * room, the shutdown sequence, the log-on screen.
     */
    suspended?: boolean;
}

type Mode = 'off' | 'saver' | 'bsod';

const Screensaver: React.FC<ScreensaverProps> = ({
    kind,
    delayMinutes,
    suspended = false,
}) => {
    const [mode, setMode] = useState<Mode>('off');
    const [activeKind, setActiveKind] = useState<ConcreteKind>('pipes');
    const timer = useRef<number>();

    const stop = useCallback(() => setMode('off'), []);

    useEffect(() => {
        if (kind === 'off' || suspended) {
            setMode('off');
            return;
        }

        const arm = () => {
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => {
                if (Math.random() < BSOD_CHANCE) {
                    setMode('bsod');
                    return;
                }
                setActiveKind(kind === 'random' ? nextFromBag() : kind);
                setMode('saver');
            }, delayMinutes * 60 * 1000);
        };

        // Any of these means someone is still here.
        const activity = () => {
            if (mode === 'off') arm();
        };

        // Focus leaving the page usually means focus went *into* one of the
        // program iframes, where we can't see anything. Treat that as activity
        // and stop counting until focus comes back.
        const onBlur = () => window.clearTimeout(timer.current);
        const onFocus = () => {
            if (mode === 'off') arm();
        };

        const events: (keyof WindowEventMap)[] = [
            'pointerdown',
            'pointermove',
            'keydown',
            'wheel',
            'touchstart',
        ];
        events.forEach((event) =>
            window.addEventListener(event, activity, { passive: true })
        );
        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);
        arm();

        return () => {
            window.clearTimeout(timer.current);
            events.forEach((event) =>
                window.removeEventListener(event, activity)
            );
            window.removeEventListener('blur', onBlur);
            window.removeEventListener('focus', onFocus);
        };
    }, [kind, delayMinutes, suspended, mode]);

    // While it's up, a key or a wheel dismisses it as well as the sheet's own
    // press — the iframe has focus, so these only arrive when it doesn't.
    useEffect(() => {
        if (mode === 'off') return;
        window.addEventListener('keydown', stop);
        window.addEventListener('wheel', stop);
        return () => {
            window.removeEventListener('keydown', stop);
            window.removeEventListener('wheel', stop);
        };
    }, [mode, stop]);

    if (mode === 'off') return null;
    if (mode === 'bsod') return <Bsod onDismiss={stop} />;

    if (!isIframeSaver(activeKind)) {
        const Canvas =
            activeKind === 'starfield'
                ? Starfield
                : activeKind === 'mystify'
                ? Mystify
                : FlyingIcons;
        return (
            <div style={styles.overlay}>
                <Canvas />
                <div
                    style={styles.sheet}
                    onPointerDown={stop}
                    onPointerMove={stop}
                    title="Click to return to the desktop"
                />
            </div>
        );
    }

    const saver = IFRAME_SAVERS[activeKind];

    return (
        <div style={styles.overlay}>
            <iframe
                src={saver.src}
                title={saver.name}
                style={styles.frame}
                tabIndex={-1}
            />
            {/* Takes the press the iframe would otherwise swallow. */}
            <div
                style={styles.sheet}
                onPointerDown={stop}
                onPointerMove={stop}
                title="Click to return to the desktop"
            />
        </div>
    );
};

const styles: StyleSheetCSS = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        // Over the taskbar (100000) and every window, under nothing.
        zIndex: 200000,
        cursor: 'none',
    },
    frame: {
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        background: '#000',
    },
    sheet: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
};

export default Screensaver;
