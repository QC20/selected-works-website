import { useEffect, useRef } from 'react';

/**
 * ↑ ↑ ↓ ↓ ← → ← → B A.
 *
 * Deliberately not documented anywhere on the desktop — no hint icon, no
 * mention in Patch Notes, no listing in the Store. The only way to this is to
 * already know the Konami code and try it on a whim, which is exactly the
 * point: it's for the few people who poke at things, not a feature meant to
 * be found by most visitors.
 */
const SEQUENCE = [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'KeyB',
    'KeyA',
];

/**
 * Fires `onActivate` once the sequence is typed anywhere on the desktop.
 *
 * Matches by `event.code` rather than `.key` so it's layout-independent (B/A
 * land in the same place on a Dvorak keyboard too), and tracks progress as a
 * simple index rather than a sliding window — a wrong key just resets it,
 * same as the arcade original.
 */
export function useKonamiCode(onActivate: () => void): void {
    const progress = useRef(0);
    const handler = useRef(onActivate);
    handler.current = onActivate;

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const expected = SEQUENCE[progress.current];
            if (e.code === expected) {
                progress.current += 1;
                if (progress.current === SEQUENCE.length) {
                    progress.current = 0;
                    handler.current();
                }
            } else {
                // A wrong key can still be the *first* key of a fresh
                // attempt (mashing ArrowUp twice in a row, say), so check
                // against the start of the sequence rather than always
                // zeroing out.
                progress.current = e.code === SEQUENCE[0] ? 1 : 0;
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);
}
