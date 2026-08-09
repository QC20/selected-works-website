import { RefObject, useEffect, useState } from 'react';

/**
 * Waits until an element is near the viewport before returning true.
 * -------------------------------------------------------------------
 * Built for the showcase pages, which don't scroll the browser window at
 * all — the window itself never moves. What scrolls is `.site-page-content`,
 * a div inside the OS window, which is itself inside a desktop rendered at a
 * CSS `transform: scale()` (see `resolution.ts`). Native `loading="lazy"`
 * never fires in there: Chrome's heuristic re-checks intersection on window
 * scroll/resize, and the window never receives either. (See the project memory
 * "No lazy loading in windows" — this is why that image stayed blank forever.)
 *
 * The fix is to stop asking the browser to guess and observe the actual
 * scrolling ancestor ourselves. `IntersectionObserver`'s `root` option isn't
 * restricted to the document — any scrollable ancestor works — so pointing it
 * at the nearest `.site-page-content` sidesteps the whole problem.
 *
 * `rootMargin` starts the load before the element is actually visible, so
 * ordinary scroll speed rarely shows a blank box — by the time you reach it,
 * it has usually already arrived.
 */
export function useLazyMount<T extends Element>(
    ref: RefObject<T>,
    rootMargin: string = '600px 0px'
): boolean {
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // No IntersectionObserver (very old browser): show it, don't hide it.
        if (typeof IntersectionObserver === 'undefined') {
            setInView(true);
            return;
        }

        const root = el.closest('.site-page-content') as Element | null;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { root, rootMargin, threshold: 0.01 }
        );
        observer.observe(el);
        return () => observer.disconnect();
        // `ref` is a stable object identity for the component's lifetime, and
        // the element it points at doesn't change out from under it — so this
        // only ever needs to run once, on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return inView;
}
