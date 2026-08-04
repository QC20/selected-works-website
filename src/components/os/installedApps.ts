/**
 * What is installed on this machine.
 * ----------------------------------
 * Windows 95 shipped with an Add/Remove Programs applet, and a desktop you
 * couldn't rearrange was not really yours. This is that idea: the optional apps
 * can be taken off the desktop and put back, and the choice is remembered.
 *
 * "Uninstalling" here only removes the desktop icon. Nothing is deleted, and
 * the app is still reachable by typing its name into Run — the same way a real
 * program stayed on the disk after you deleted its shortcut. That's deliberate:
 * a visitor who removes something interesting should be able to get it back
 * without having to find the Store again.
 *
 * A module-level store rather than React state, for the same reason as
 * `desktopFiles.ts`: the Store window and the desktop render in different
 * trees and both have to agree about what's installed.
 */

import { useEffect, useState } from 'react';

const KEY = 'installedApps.v1';

/**
 * One entry in the Store. `key` is the APPLICATIONS key in `Desktop.tsx`, so
 * anything listed here must exist there and must not be `noDesktopIcon`.
 */
export interface StoreApp {
    key: string;
    /** What the Store shows. The desktop name comes from APPLICATIONS. */
    name: string;
    /** One line, in the register of a 1995 shareware catalogue. */
    blurb: string;
    /** Rough disk size in KB — cosmetic, like the sizes in My Computer. */
    size: number;
    category: 'Games' | 'Internet' | 'Multimedia' | 'Accessories';
}

/**
 * The apps that can be removed. Everything not listed here — My Showcase, My
 * Computer, Internet Explorer, Programs, the Recycle Bin — is part of the
 * system and stays put, which is also true of the real thing.
 *
 * Only apps that actually put an icon on the desktop belong here. Market Watch
 * and the Utility folder's programs are reached from the tray and from My
 * Computer, so there would be nothing for installing them to do.
 */
export const STORE_APPS: StoreApp[] = [
    {
        key: 'doom',
        name: 'Doom',
        blurb: 'id Software\'s 1993 shooter, running in the browser.',
        size: 12_000,
        category: 'Games',
    },
    {
        key: 'trail',
        name: 'The Oregon Trail',
        blurb: 'Ford the river. Lose an ox. Die of dysentery.',
        size: 8400,
        category: 'Games',
    },
    {
        key: 'scrabble',
        name: 'Scrabble',
        blurb: 'Word game for one, against a dictionary that does not lose.',
        size: 3200,
        category: 'Games',
    },
    {
        key: 'guestbook',
        name: 'MSN Messenger',
        blurb: 'Leave a message. Nudge me if it is urgent.',
        size: 1500,
        category: 'Internet',
    },
    {
        key: 'mail',
        name: 'Mail',
        blurb: 'Compose a message and send it my way.',
        size: 900,
        category: 'Internet',
    },
    {
        key: 'github',
        name: 'GitHub',
        blurb: 'Browse my public repositories without leaving the desktop.',
        size: 1100,
        category: 'Internet',
    },
    {
        key: 'floating',
        name: 'Interactive Attractor',
        blurb: 'A strange attractor you can push around with the mouse.',
        size: 4800,
        category: 'Multimedia',
    },
    {
        key: 'stepOutside',
        name: 'Step Outside',
        blurb: 'Pull back through the screen into the room the monitor is in.',
        size: 15_000,
        category: 'Multimedia',
    },
    {
        key: 'about',
        name: 'About',
        blurb: 'Who built this machine, and why it looks like 1995.',
        size: 400,
        category: 'Accessories',
    },
];

export const storeAppByKey = (key: string): StoreApp | undefined =>
    STORE_APPS.find((a) => a.key === key);

/** Can this app be uninstalled at all? */
export const isOptional = (key: string): boolean =>
    STORE_APPS.some((a) => a.key === key);

/**
 * Uninstalled app keys. Storing the *removed* set rather than the installed one
 * means anything added to STORE_APPS later shows up on existing visitors'
 * desktops instead of silently staying hidden.
 */
let uninstalled: Set<string> = load();
const listeners = new Set<() => void>();

function load(): Set<string> {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return new Set();
        const stored = JSON.parse(raw);
        return Array.isArray(stored) ? new Set<string>(stored) : new Set();
    } catch {
        return new Set();
    }
}

function commit(next: Set<string>): void {
    uninstalled = next;
    try {
        // Array.from rather than a spread: this project targets ES5, where
        // spreading a Set needs downlevelIteration.
        localStorage.setItem(KEY, JSON.stringify(Array.from(next)));
    } catch {
        /* storage full / disabled — the choice just won't survive a reload */
    }
    listeners.forEach((fn) => fn());
}

export function isInstalled(key: string): boolean {
    return !uninstalled.has(key);
}

export function install(key: string): void {
    if (!uninstalled.has(key)) return;
    const next = new Set(uninstalled);
    next.delete(key);
    commit(next);
}

export function uninstall(key: string): void {
    if (!isOptional(key) || uninstalled.has(key)) return;
    commit(new Set(uninstalled).add(key));
}

export function setInstalled(key: string, installed: boolean): void {
    installed ? install(key) : uninstall(key);
}

/** Puts every optional app back — what the Store's Restore All button does. */
export function installAll(): void {
    if (!uninstalled.size) return;
    commit(new Set());
}

/** Subscribe a component to the store (see `useDesktopFiles`). */
export function useInstalledApps(): (key: string) => boolean {
    const [, forceRender] = useState(0);
    useEffect(() => {
        const listener = () => forceRender((n) => n + 1);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return isInstalled;
}
