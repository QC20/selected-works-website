import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The screen saver.
 *
 * 3D Pipes and the Flower Box are already on this machine as programs (see
 * `win98Programs.ts`), which is exactly where Windows 95 got its screen savers
 * from too — they were ordinary executables the system ran when you stopped
 * typing. So this doesn't reimplement anything: it waits for the desktop to go
 * quiet, then puts one of those pages full-screen over the top.
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
 */

export type ScreensaverKind = 'pipes' | 'flower' | 'off';

const SAVERS: { [key in Exclude<ScreensaverKind, 'off'>]: { src: string; name: string } } = {
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

const KIND_KEY = 'screensaver.kind.v1';
const DELAY_KEY = 'screensaver.delay.v1';

/** Wait options, in minutes, as the Screen Saver tab offered them. */
export const SCREENSAVER_DELAYS = [1, 3, 5, 10, 15];

export function loadScreensaverKind(): ScreensaverKind {
    try {
        const stored = localStorage.getItem(KIND_KEY);
        return stored === 'flower' || stored === 'off' || stored === 'pipes'
            ? stored
            : 'pipes';
    } catch {
        return 'pipes';
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
    { value: 'pipes', label: '3D Pipes' },
    { value: 'flower', label: '3D Flower Box' },
];

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

const Screensaver: React.FC<ScreensaverProps> = ({
    kind,
    delayMinutes,
    suspended = false,
}) => {
    const [running, setRunning] = useState(false);
    const timer = useRef<number>();

    const stop = useCallback(() => setRunning(false), []);

    useEffect(() => {
        if (kind === 'off' || suspended) {
            setRunning(false);
            return;
        }

        const arm = () => {
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(
                () => setRunning(true),
                delayMinutes * 60 * 1000
            );
        };

        // Any of these means someone is still here.
        const activity = () => {
            if (!running) arm();
        };

        // Focus leaving the page usually means focus went *into* one of the
        // program iframes, where we can't see anything. Treat that as activity
        // and stop counting until focus comes back.
        const onBlur = () => window.clearTimeout(timer.current);
        const onFocus = () => {
            if (!running) arm();
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
    }, [kind, delayMinutes, suspended, running]);

    // While it's up, a key or a wheel dismisses it as well as the sheet's own
    // press — the iframe has focus, so these only arrive when it doesn't.
    useEffect(() => {
        if (!running) return;
        window.addEventListener('keydown', stop);
        window.addEventListener('wheel', stop);
        return () => {
            window.removeEventListener('keydown', stop);
            window.removeEventListener('wheel', stop);
        };
    }, [running, stop]);

    if (!running || kind === 'off') return null;
    const saver = SAVERS[kind];

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
