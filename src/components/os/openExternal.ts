/**
 * Opening a link in a new tab, reliably — including on iPad.
 *
 * `window.open()` is only honoured while the browser considers a user gesture
 * to be in progress. iOS/iPadOS Safari is the strictest about this: a call made
 * from a `pointerdown` handler (which is what the desktop icons, the Start menu
 * and the window buttons all use) is frequently treated as programmatic and
 * silently swallowed by the popup blocker, so the tap appears to do nothing.
 *
 * So: try `window.open` first and fall back to clicking a synthetic anchor,
 * which browsers treat as ordinary navigation rather than a popup.
 *
 * Two details that are easy to get wrong, both found by testing:
 *  - Do NOT pass the `noopener` window feature. Per spec that makes
 *    `window.open` return `null` even when it succeeded, so you can no longer
 *    tell success from "blocked" — and a fallback then fires on top of a tab
 *    that did open, giving the user two. We clear `opener` manually instead.
 *  - The anchor route is the fallback, not the default: clicking a detached
 *    anchor was observed opening two tabs for a single call.
 */
export function openExternal(url: string): void {
    let opened: Window | null = null;
    try {
        opened = window.open(url, '_blank');
    } catch {
        opened = null;
    }

    if (opened) {
        // Same isolation `noopener` would have given, without losing the handle.
        try {
            opened.opener = null;
        } catch {
            /* cross-origin — the browser already severed it */
        }
        return;
    }

    // Popup blocked (typically iOS/iPadOS Safari): navigate via a real link.
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
