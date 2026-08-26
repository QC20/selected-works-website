/**
 * System resources, for real.
 * ----------------------------
 * Windows 95 shipped a genuine "Resource Meter" accessory — Add/Remove
 * Programs > Accessories > System Resource Meter — that lived as a small bar
 * graph in the tray and warned you when the machine was running low. This is
 * that accessory, rebuilt with numbers that are actually true of the tab
 * it's running in rather than decorative:
 *
 *   Memory     `performance.memory` (Chrome/Chromium only — genuinely
 *              non-standard, not a choice made here) gives the real JS heap,
 *              used against its own limit. Where it doesn't exist, DOM node
 *              count stands in as an honest, always-available substitute for
 *              "how much is this page carrying" — never silently swapped in
 *              as if it were memory; `hasMemoryApi` says which one a reader
 *              is looking at.
 *   Frame rate  Measured from actual `requestAnimationFrame` deltas, a
 *              second at a time. This is the only number here Firefox and
 *              Safari get exactly the same treatment for.
 *   Windows    However many of this desktop's own windows are open right
 *              now — real application state, not a simulation of it.
 *   Uptime     Time since this tab's `performance.timeOrigin`.
 *
 * The tray gauge reports resources the way the original did: as percent
 * *free*, not percent used, so "78%" reads the same as it did in 1996 — high
 * is healthy, and it drops when the tab is actually working hard.
 */

import { useEffect, useState } from 'react';

export interface ResourceSnapshot {
    hasMemoryApi: boolean;
    /** 0-100. Free JS heap when available, otherwise a DOM-node-count proxy. */
    memoryFreePercent: number;
    usedHeapMB: number | null;
    limitHeapMB: number | null;
    domNodeCount: number;
    fps: number;
    openWindows: number;
    uptimeSeconds: number;
}

const EMPTY: ResourceSnapshot = {
    hasMemoryApi: false,
    memoryFreePercent: 100,
    usedHeapMB: null,
    limitHeapMB: null,
    domNodeCount: 0,
    fps: 60,
    openWindows: 0,
    uptimeSeconds: 0,
};

let current: ResourceSnapshot = EMPTY;
let openWindowCount = 0;
const listeners = new Set<(s: ResourceSnapshot) => void>();

/** Desktop.tsx calls this whenever the number of open windows changes. */
export function reportOpenWindows(n: number): void {
    openWindowCount = n;
}

const sample = (): void => {
    const mem = (performance as any).memory as
        | { usedJSHeapSize: number; jsHeapSizeLimit: number }
        | undefined;

    const domNodeCount = document.getElementsByTagName('*').length;

    let hasMemoryApi = false;
    let memoryFreePercent = 100;
    let usedHeapMB: number | null = null;
    let limitHeapMB: number | null = null;

    if (mem && mem.jsHeapSizeLimit > 0) {
        hasMemoryApi = true;
        usedHeapMB = mem.usedJSHeapSize / (1024 * 1024);
        limitHeapMB = mem.jsHeapSizeLimit / (1024 * 1024);
        memoryFreePercent = Math.round(
            (1 - mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100
        );
    } else {
        // No heap API: a DOM node count above ~4000 is a genuinely heavy page
        // by ordinary web standards, so that's the ceiling this scales
        // against — an honest proxy, never presented as memory itself.
        memoryFreePercent = Math.max(
            0,
            Math.min(100, Math.round(100 - (domNodeCount / 4000) * 100))
        );
    }

    current = {
        ...current,
        hasMemoryApi,
        memoryFreePercent,
        usedHeapMB,
        limitHeapMB,
        domNodeCount,
        openWindows: openWindowCount,
        uptimeSeconds: Math.floor(performance.now() / 1000),
    };
    listeners.forEach((fn) => fn(current));
};

// Frame-rate measurement: count frames per real second via rAF, independent
// of the once-a-second sample above so a busy render loop elsewhere can't
// starve the FPS reading itself.
let frameCount = 0;
let fpsWindowStart = performance.now();
const onFrame = () => {
    frameCount += 1;
    const now = performance.now();
    const elapsed = now - fpsWindowStart;
    if (elapsed >= 1000) {
        current = {
            ...current,
            fps: Math.round((frameCount * 1000) / elapsed),
        };
        listeners.forEach((fn) => fn(current));
        frameCount = 0;
        fpsWindowStart = now;
    }
    rafHandle = window.requestAnimationFrame(onFrame);
};

let rafHandle: number | undefined;
let sampleInterval: number | undefined;
let refCount = 0;

/** Starts sampling on first subscriber, stops on last — no point measuring a
 *  frame rate nobody is displaying. */
function start(): void {
    if (refCount === 0) {
        sample();
        sampleInterval = window.setInterval(sample, 1000);
        fpsWindowStart = performance.now();
        frameCount = 0;
        rafHandle = window.requestAnimationFrame(onFrame);
    }
    refCount += 1;
}

function stop(): void {
    refCount -= 1;
    if (refCount <= 0) {
        refCount = 0;
        window.clearInterval(sampleInterval);
        if (rafHandle) window.cancelAnimationFrame(rafHandle);
    }
}

export function useResourceSnapshot(): ResourceSnapshot {
    const [snapshot, setSnapshot] = useState<ResourceSnapshot>(current);
    useEffect(() => {
        const listener = (s: ResourceSnapshot) => setSnapshot(s);
        listeners.add(listener);
        start();
        setSnapshot(current);
        return () => {
            listeners.delete(listener);
            stop();
        };
    }, []);
    return snapshot;
}

/** A short history of memory-free% and fps, for the System Monitor's graphs.
 *  Kept here rather than per-component state so switching tabs in the app
 *  doesn't reset the trace. */
const HISTORY_LEN = 60;
export const memoryHistory: number[] = [];
export const fpsHistory: number[] = [];

listeners.add((s) => {
    memoryHistory.push(s.memoryFreePercent);
    if (memoryHistory.length > HISTORY_LEN) memoryHistory.shift();
    fpsHistory.push(s.fps);
    if (fpsHistory.length > HISTORY_LEN) fpsHistory.shift();
});
