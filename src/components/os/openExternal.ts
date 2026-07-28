/**
 * Opening a link in a new tab, reliably — including on iPad.
 *
 * `window.open()` is only honoured while the browser considers a user gesture
 * to be in progress. iOS/iPadOS Safari is the strictest about this: a call made
 * from a `pointerdown` handler (which is what the desktop icons, the Start menu
 * and the window buttons all use) is frequently treated as programmatic and
 * silently swallowed by the popup blocker, so the tap appears to do nothing.
 *
 * Clicking a real anchor is never treated as a popup, so that is all we do.
 * Note this deliberately avoids `window.open(url, '_blank', 'noopener')` — that
 * call returns `null` even when it succeeds (per spec, `noopener` severs the
 * handle), which makes "did it work?" impossible to detect and leads to
 * double-opening if you try.
 *
 * `rel="noopener noreferrer"` gives the new tab the same isolation the
 * `noopener` window feature would have.
 */
export function openExternal(url: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
