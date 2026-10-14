import React from 'react';

/**
 * Loading a program only when somebody opens it.
 * ------------------------------------------------
 * Every one of the forty-odd applications on this desktop used to be a static
 * import at the top of `Desktop.tsx`, which meant every one of them was in the
 * first JavaScript file the browser downloaded. That file was 1.6MB — 526KB
 * over the wire — and it contained Doom's loader, a DOS emulator, a three.js
 * scene, a face detector and a Tetris, none of which the visitor had asked
 * for. The thing they *had* asked for, My Showcase, was in there too,
 * queued behind all of it.
 *
 * The fix is ordinary code-splitting, with one wrinkle worth the extra few
 * lines: `React.lazy` gives you a component but hides the loader, so there is
 * no way to start a download before render. Keeping a reference to it makes
 * the chunk *preloadable*, and preloading is what turns code-splitting from a
 * trade (smaller first load, slower first open) into a straight win — by the
 * time a double-click resolves, the program is usually already there.
 *
 *     const Minesweeper = lazyApp(() => import('../applications/Minesweeper'));
 *     ...
 *     preload(Minesweeper);   // on hover, on idle, whenever
 *
 * The one program deliberately *not* loaded this way is My Showcase. It opens
 * by itself on arrival, so deferring it would only add a round trip to the
 * exact thing the site is for.
 */

export interface Preloadable {
    /** Starts the chunk download. Safe to call repeatedly; the import cache
     *  means only the first one costs anything. */
    preload: () => Promise<unknown>;
}

export type LazyApp<P = any> = React.LazyExoticComponent<
    React.ComponentType<P>
> &
    Preloadable;

/**
 * Generic in the component's props, so the prop types survive the split.
 *
 * Without the type parameter every lazy program becomes `ComponentType<any>`,
 * and the handful that are rendered directly with extra props — Run, the
 * Store, the 98 program frame — silently lose their callback signatures.
 * Inferring it from the dynamic import keeps them checked.
 */
export function lazyApp<P>(
    loader: () => Promise<{ default: React.ComponentType<P> }>
): LazyApp<P> {
    const Component = React.lazy(loader) as LazyApp<P>;
    // `React.lazy` keeps the loader to itself, so it is stashed here. Webpack
    // dedupes concurrent requests for the same chunk, so a hover that fires
    // this forty times costs one download.
    Component.preload = loader;
    return Component;
}

/** Starts a program's download without rendering it. Never throws. */
export function preload(app: unknown): void {
    const candidate = app as Partial<Preloadable> | undefined;
    if (typeof candidate?.preload !== 'function') return;
    // A failed prefetch must stay silent: it is speculative, the real open
    // will retry, and an unhandled rejection in the console for something
    // nobody asked for is worse than the wasted request.
    candidate.preload().catch(() => undefined);
}

/**
 * Warms a set of programs once the browser is doing nothing else.
 *
 * Called after first paint with the handful a visitor is most likely to reach
 * for. `requestIdleCallback` is the point: this must never compete with the
 * desktop actually rendering, and on a slow connection it should simply lose.
 */
export function preloadWhenIdle(apps: unknown[], delayMs = 1200): void {
    const run = () => apps.forEach(preload);
    const idle = (window as any).requestIdleCallback as
        | ((cb: () => void, opts?: { timeout: number }) => number)
        | undefined;
    window.setTimeout(() => {
        if (idle) idle(run, { timeout: 4000 });
        else run();
    }, delayMs);
}
