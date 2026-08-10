/**
 * How long since the visitor last did anything.
 * ---------------------------------------------
 * Every unprompted piece of help on this desktop — the "Click here to begin"
 * balloon, Clippy's tips, his offer to save your drawing — waits for a lull
 * before it speaks. Interrupting someone mid-click to tell them what to click is
 * the exact failure that made the real Clippy a punchline.
 *
 * Two rules the timings all follow:
 *
 *   Idle, not elapsed.  A hint is scheduled against the last *input*, not
 *   against page load. Touch anything and the clock starts over, so nothing ever
 *   appears while you are busy.
 *
 *   Never the same twice.  Each wait is drawn fresh from a range, so a returning
 *   visitor doesn't learn the rhythm and a second tab doesn't fire in unison
 *   with the first. The first wait of a session is drawn from the top of its
 *   range: someone who has just arrived is *looking*, and looking is not idling.
 */

import { useEffect, useRef, useState } from 'react';

/** Every gesture that counts as "still using the computer". */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
    'pointerdown',
    'pointermove',
    'keydown',
    'wheel',
    'touchstart',
];

/** Pointer moves fire constantly; one bump per this many ms is plenty. */
const THROTTLE_MS = 400;

let lastActivity = Date.now();
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
    let lastBump = 0;
    const bump = () => {
        const now = Date.now();
        if (now - lastBump < THROTTLE_MS) return;
        lastBump = now;
        lastActivity = now;
        listeners.forEach((fn) => fn());
    };
    ACTIVITY_EVENTS.forEach((type) =>
        window.addEventListener(type, bump, { passive: true, capture: true })
    );
}

/** Milliseconds since the last input. */
export const idleFor = (): number => Date.now() - lastActivity;

/** A whole number of milliseconds somewhere in [min, max]. */
export const between = (min: number, max: number): number =>
    Math.round(min + Math.random() * (max - min));

/**
 * A wait drawn from the top third of its range — for the first hint of a
 * session, when the visitor is still reading the screen rather than idling.
 */
export const patiently = (min: number, max: number): number =>
    between(min + (max - min) * 0.66, max);

/**
 * Fires `onIdle` once the visitor has been still for `delay` ms, then stops.
 *
 * Returns nothing and re-arms itself on every input, so the callback lands in a
 * genuine lull. Pass `delay = null` to disarm entirely (already fired, feature
 * switched off, something else owns the screen).
 */
export function useIdleTrigger(
    delay: number | null,
    onIdle: () => void,
    enabled: boolean = true
): void {
    // The callback is usually a fresh closure every render; keep the timer from
    // being torn down and rebuilt because of that alone.
    const handler = useRef(onIdle);
    handler.current = onIdle;

    useEffect(() => {
        if (!enabled || delay === null) return;

        let timer = 0;
        const arm = () => {
            window.clearTimeout(timer);
            const remaining = Math.max(0, delay - idleFor());
            timer = window.setTimeout(() => {
                // A late-arriving input can beat the timer to the punch; check
                // again rather than talking over it.
                if (idleFor() < delay) {
                    arm();
                    return;
                }
                handler.current();
            }, remaining || delay);
        };

        arm();
        listeners.add(arm);
        return () => {
            listeners.delete(arm);
            window.clearTimeout(timer);
        };
    }, [delay, enabled]);
}

/** True once the visitor has been still for `delay` ms; false again on input. */
export function useIsIdle(delay: number, enabled: boolean = true): boolean {
    const [idle, setIdle] = useState(false);
    useIdleTrigger(idle ? null : delay, () => setIdle(true), enabled);
    useEffect(() => {
        if (!idle) return;
        const wake = () => setIdle(false);
        listeners.add(wake);
        return () => {
            listeners.delete(wake);
        };
    }, [idle]);
    return idle;
}
