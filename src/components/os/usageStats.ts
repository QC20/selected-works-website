/**
 * What this browser has actually done here.
 * -----------------------------------------
 * The tray's hit counter can only ever show one number, because that is all
 * `increment_site_visits` gives back. This is the other half: a small local
 * tally that gives the Statistics window something worth opening.
 *
 * Deliberately *local only*. It never leaves the browser, and it is a
 * different thing from `analyticsApi.ts`, which sends anonymous events to
 * Supabase and — by design — can never read them back. So the honest split
 * this file exists to make possible is:
 *
 *   shared   the total visit count, from the counter RPC. One number.
 *   yours    everything else in the Statistics window. Never sent anywhere,
 *            and gone the moment you clear site data.
 *
 * The window says which is which, in those words. A statistics page on a site
 * that makes a point of not tracking people has to be scrupulous about not
 * implying it knows more than it does.
 */

import { useEffect, useState } from 'react';

const KEY = 'usageStats.v1';

export interface UsageStats {
    /** APPLICATIONS key -> times opened on this browser. */
    apps: Record<string, number>;
    /** Showcase route -> times visited. */
    pages: Record<string, number>;
    /** First time this browser ever loaded the desktop. */
    firstSeen: number;
    /** Distinct tab sessions. */
    sessions: number;
    lastSeen: number;
}

const EMPTY: UsageStats = {
    apps: {},
    pages: {},
    firstSeen: Date.now(),
    sessions: 0,
    lastSeen: Date.now(),
};

const load = (): UsageStats => {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { ...EMPTY };
        const parsed = JSON.parse(raw) as Partial<UsageStats>;
        return {
            apps: parsed.apps ?? {},
            pages: parsed.pages ?? {},
            firstSeen: parsed.firstSeen ?? Date.now(),
            sessions: parsed.sessions ?? 0,
            lastSeen: parsed.lastSeen ?? Date.now(),
        };
    } catch {
        return { ...EMPTY };
    }
};

let current: UsageStats = load();
const listeners = new Set<(s: UsageStats) => void>();

const persist = () => {
    try {
        localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
        /* private mode — the tally just won't survive the tab */
    }
    listeners.forEach((fn) => fn(current));
};

/** Session start, counted once per tab (same rule as the hit counter). */
const SESSION_FLAG = 'usageStats.session.v1';
export function noteSession(): void {
    try {
        if (sessionStorage.getItem(SESSION_FLAG)) return;
        sessionStorage.setItem(SESSION_FLAG, '1');
    } catch {
        /* no sessionStorage — count it, a small overcount beats none */
    }
    current.sessions += 1;
    current.lastSeen = Date.now();
    persist();
}

export function noteApp(key: string): void {
    current.apps[key] = (current.apps[key] ?? 0) + 1;
    current.lastSeen = Date.now();
    persist();
}

export function notePage(route: string): void {
    current.pages[route] = (current.pages[route] ?? 0) + 1;
    current.lastSeen = Date.now();
    persist();
}

export const getUsageStats = (): UsageStats => current;

/** Total app launches on this browser, all time. */
export const totalAppOpens = (s: UsageStats): number =>
    Object.values(s.apps).reduce((a, b) => a + b, 0);

/** Most-opened first. */
export const rankedApps = (s: UsageStats): [string, number][] =>
    Object.entries(s.apps).sort((a, b) => b[1] - a[1]);

export function useUsageStats(): UsageStats {
    const [stats, setStats] = useState<UsageStats>(current);
    useEffect(() => {
        const listener = (s: UsageStats) => setStats({ ...s });
        listeners.add(listener);
        setStats({ ...current });
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return stats;
}
