/**
 * Opening an app from outside the React tree that owns `openApp`.
 * -----------------------------------------------------------------
 * `Desktop.tsx` owns the real `openApp(key, options)` — it's a `useCallback`
 * closed over the window state, and threading it down to every module that
 * might reasonably want to open something (Clippy's pet check-in, the pet
 * store itself) would mean those modules importing from Desktop, which
 * imports them back. This breaks the cycle the same way `tvState.ts` and
 * `crt.ts` avoid one: a tiny module-level slot, set once by the owner and
 * read by anyone who needs it.
 *
 * Only ever holds *the* Desktop's function, so calling `openAppGlobal` before
 * the desktop has mounted (or after it unmounts) is a safe no-op rather than
 * a crash.
 */

let openAppImpl: ((key: string, options?: LaunchOptions) => void) | null =
    null;

/** Called once by `Desktop.tsx`, with its own `openApp`, and again with
 *  `null` on unmount. */
export function registerOpenApp(
    fn: ((key: string, options?: LaunchOptions) => void) | null
): void {
    openAppImpl = fn;
}

export function openAppGlobal(key: string, options?: LaunchOptions): void {
    openAppImpl?.(key, options);
}
