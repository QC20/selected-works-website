/**
 * Remembering that the machine was left mid-use.
 * -----------------------------------------------
 * The single most conspicuous seam in this whole illusion is the reload. A
 * real computer that you walk away from and come back to still has your
 * windows open where you left them. A web page does not: refresh, and every
 * trace that you were doing something is gone, and the "operating system"
 * turns back into a page that has just loaded. Everything else here — the
 * real C: drive, the persisted Store, the pet that gets hungry while you are
 * away — works hard to hide exactly that seam, and then the reload undoes it.
 *
 * So this closes it: which programs were open, and which were minimised, are
 * written to `sessionStorage` and restored on the next load.
 *
 * Three decisions worth stating, because each one is the difference between
 * this feeling like a machine and feeling like a bug:
 *
 *   `sessionStorage`, not `localStorage`.  Restoring a week-old set of
 *   windows to a returning stranger would be baffling, not seamless. This
 *   lasts exactly as long as the browser tab does, which is the same lifetime
 *   a real "I stepped away from my desk" session has.
 *
 *   Only programs, never documents.  A restored Notepad window pointing at a
 *   file that has since been deleted from the fake drive is a broken window.
 *   Anything opened *with* an argument — a picture, a saved note, a specific
 *   web page — is deliberately not restored. See `RESTORABLE` below.
 *
 *   Never restore a takeover.  The 3D room and the log-on screen own the
 *   whole viewport; coming back to find yourself inside one with no memory of
 *   going there is disorienting rather than convenient.
 */

const KEY = 'session.windows.v1';

export interface SessionWindow {
    key: string;
    minimized: boolean;
}

/**
 * Keys that must never be restored.
 *
 * `showcase` is excluded for a different reason from the rest: it opens by
 * itself on every visit anyway, so restoring it would either duplicate that
 * or fight it.
 */
const NEVER_RESTORE = new Set([
    'stepOutside', // fullscreen 3D takeover
    'showcase', // auto-opens on its own
    'secret', // has to be earned, every time
    'resetStorage', // a destructive dialog is a bad thing to come back to
    'shutdown',
]);

export function isRestorable(key: string): boolean {
    return !NEVER_RESTORE.has(key);
}

export function saveSession(windows: SessionWindow[]): void {
    try {
        const keep = windows.filter((w) => isRestorable(w.key));
        if (keep.length === 0) {
            sessionStorage.removeItem(KEY);
            return;
        }
        sessionStorage.setItem(KEY, JSON.stringify(keep));
    } catch {
        /* private mode — the session just won't survive the reload */
    }
}

/**
 * Reads back the previous session and *clears it immediately*.
 *
 * Clearing on read is deliberate: if one of these windows throws while
 * mounting, the very next reload would try to restore it again and hit the
 * same crash, and the visitor would be stuck in a loop with no way out but
 * clearing site data. Reading once means a bad session can break at most one
 * load.
 */
/**
 * The previous session, read exactly once per page load however many times
 * this is called.
 *
 * This indirection is load-bearing, and the bug it fixes was subtle: the
 * effect that *saves* the session runs on mount with zero windows open, which
 * cleared the stored key before the effect that *restores* it ever ran. Both
 * effects live in the same component, and effects fire in declaration order,
 * so the save always won. Capturing the value on the first call — during
 * render, before any effect — makes the ordering irrelevant. Being idempotent
 * also makes it safe under StrictMode's deliberate double-invocation.
 */
let captured: SessionWindow[] | null = null;

export function pendingSession(): SessionWindow[] {
    if (captured === null) captured = consumeSession();
    return captured;
}

export function consumeSession(): SessionWindow[] {
    try {
        const raw = sessionStorage.getItem(KEY);
        sessionStorage.removeItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(
                (w): w is SessionWindow =>
                    !!w &&
                    typeof w.key === 'string' &&
                    typeof w.minimized === 'boolean'
            )
            .filter((w) => isRestorable(w.key))
            .slice(0, 8); // a sane ceiling; nobody left 40 windows open
    } catch {
        return [];
    }
}
