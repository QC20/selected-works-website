/**
 * Which pages of My Showcase this visitor has actually looked at.
 * -----------------------------------------------------------------
 * Nothing here is persisted — it's a module-level Set for the same reason as
 * `desktopFiles.ts`: Clippy and the showcase's own router render in
 * different trees, and both need to agree on what's been seen. It resets on
 * reload on purpose; a returning visitor deserves the same nudges again
 * rather than Clippy assuming a week-old visit still counts.
 *
 * Used for exactly one thing: Clippy's second showcase-open tip, which
 * points at something the visitor hasn't opened yet instead of something
 * they're already looking at.
 */

import { useEffect, useState } from 'react';

const visited = new Set<string>();
const listeners = new Set<() => void>();

/** Trailing slashes and query strings don't change what page this is. */
const normalize = (path: string): string => {
    const clean = path.split('?')[0].split('#')[0];
    return clean.length > 1 && clean.endsWith('/')
        ? clean.slice(0, -1)
        : clean;
};

export function markShowcaseVisited(path: string): void {
    const key = normalize(path);
    if (visited.has(key)) return;
    visited.add(key);
    listeners.forEach((fn) => fn());
}

export function getShowcaseVisited(): Set<string> {
    return visited;
}

/** Subscribes a component to the visited set (see `useDesktopFiles`). */
export function useShowcaseVisited(): Set<string> {
    const [, forceRender] = useState(0);
    useEffect(() => {
        const listener = () => forceRender((n) => n + 1);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return visited;
}
