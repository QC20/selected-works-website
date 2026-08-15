/**
 * What is installed on this machine.
 * ----------------------------------
 * Windows 95 shipped with an Add/Remove Programs applet, and a desktop you
 * couldn't rearrange was not really yours. This is that idea, in both
 * directions: the ten apps that ship on the desktop can be taken off and put
 * back, and everything else that already runs on this machine but has never
 * had a desktop icon — the games and programs reachable so far only from
 * Programs, Games, or Run — can be *added* one for the first time. Either
 * way the choice is remembered.
 *
 * "Uninstalling" only ever removes the desktop icon. Nothing is deleted, and
 * the app is still reachable by typing its name into Run — the same way a real
 * program stayed on the disk after you deleted its shortcut. "Installing" is
 * the same idea run the other way: the program already exists and already
 * works, and this just gives it the icon it never had. Neither direction
 * touches anything the visitor has actually saved.
 *
 * A module-level store rather than React state, for the same reason as
 * `desktopFiles.ts`: the Store window and the desktop render in different
 * trees and both have to agree about what's installed.
 */

import { useEffect, useState } from 'react';

const KEY = 'installedApps.v1';

/**
 * One entry in the Store. `key` is the APPLICATIONS key in `Desktop.tsx`.
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
    /**
     * Whether this one already has a desktop icon before a visitor has ever
     * opened the Store. True for the original ten (removable); false for
     * everything only the Store itself can add. `DESKTOP_ORDER` in
     * `Desktop.tsx` must list every key here, defaulted-on or not — that's
     * what makes it eligible to appear on the desktop at all.
     */
    defaultInstalled: boolean;
}

export const STORE_APPS: StoreApp[] = [
    {
        key: 'doom',
        name: 'Doom',
        blurb: "id Software's 1993 shooter, running in the browser.",
        size: 12_000,
        category: 'Games',
        defaultInstalled: true,
    },
    {
        key: 'pinball',
        name: 'Pinball',
        blurb: '3D Pinball: Space Cadet. Still the best thing Windows shipped.',
        size: 6700,
        category: 'Games',
        defaultInstalled: true,
    },
    {
        key: 'trail',
        name: 'The Oregon Trail',
        blurb: 'You have died of dysentery. Now on the desktop, not just Games.',
        size: 3200,
        category: 'Games',
        defaultInstalled: false,
    },
    {
        key: 'scrabble',
        name: 'Scrabble',
        blurb: 'The board game. Play a round, or just admire the tile rack.',
        size: 2100,
        category: 'Games',
        defaultInstalled: false,
    },
    {
        key: 'minesweeper',
        name: 'Minesweeper',
        blurb: "Windows' own timer. Left click to clear, right click to flag.",
        size: 250,
        category: 'Games',
        defaultInstalled: false,
    },
    {
        key: 'snake',
        name: 'Snake',
        blurb: 'Grows by one every time it eats. So does the danger.',
        size: 180,
        category: 'Games',
        defaultInstalled: false,
    },
    {
        key: 'tetris',
        name: 'Tetris',
        blurb: 'Four blocks, seven shapes, one very old idea done right.',
        size: 190,
        category: 'Games',
        defaultInstalled: false,
    },
    {
        key: 'solitaire',
        name: 'Solitaire',
        blurb: "The reason floppy disks existed, allegedly. Klondike rules.",
        size: 612,
        category: 'Games',
        defaultInstalled: false,
    },
    {
        key: 'jonordle',
        name: 'Jonordle',
        blurb: 'Wordle, but the answer is always something about this desktop.',
        size: 140,
        category: 'Games',
        defaultInstalled: false,
    },
    {
        key: 'guestbook',
        name: 'MSN Messenger',
        blurb: 'Leave a message. Nudge me if it is urgent.',
        size: 1500,
        category: 'Internet',
        defaultInstalled: true,
    },
    {
        key: 'mail',
        name: 'Mail',
        blurb: 'Compose a message and send it my way.',
        size: 900,
        category: 'Internet',
        defaultInstalled: true,
    },
    {
        key: 'github',
        name: 'GitHub',
        blurb: 'Browse my public repositories without leaving the desktop.',
        size: 1100,
        category: 'Internet',
        defaultInstalled: true,
    },
    {
        key: 'floating',
        name: 'Interactive Attractor',
        blurb: 'A strange attractor you can push around with the mouse.',
        size: 4800,
        category: 'Multimedia',
        defaultInstalled: true,
    },
    {
        key: 'stepOutside',
        name: 'Step Outside',
        blurb: 'Pull back through the screen into the room the monitor is in.',
        size: 15_000,
        category: 'Multimedia',
        defaultInstalled: true,
    },
    {
        key: 'winamp',
        name: 'Winamp',
        blurb: 'It really whips the llama\'s ass. Now loaded with real DJ sets.',
        size: 1800,
        category: 'Multimedia',
        defaultInstalled: false,
    },
    {
        key: 'soundRecorder',
        name: 'Sound Recorder',
        blurb: 'Record from the microphone, if the browser will allow it.',
        size: 628,
        category: 'Multimedia',
        defaultInstalled: false,
    },
    {
        key: 'pipes',
        name: '3D Pipes',
        blurb: "The screensaver everyone actually left running on purpose.",
        size: 1100,
        category: 'Multimedia',
        defaultInstalled: false,
    },
    {
        key: 'flowerBox',
        name: '3D Flower Box',
        blurb: 'Pipes, but blooming instead of plumbing.',
        size: 220,
        category: 'Multimedia',
        defaultInstalled: false,
    },
    {
        key: 'about',
        name: 'About',
        blurb: 'Who built this machine, and why it looks like 1995.',
        size: 400,
        category: 'Accessories',
        defaultInstalled: true,
    },
    // The two programs that write files you keep. Removing the icon does not
    // touch anything already saved in My Documents — as ever, it only takes the
    // shortcut off the desktop.
    {
        key: 'paint',
        name: 'Paint',
        blurb: 'Draw something. It is saved, and everyone else can see it.',
        size: 29_000,
        category: 'Accessories',
        defaultInstalled: true,
    },
    {
        key: 'notepad',
        name: 'Notes',
        blurb: 'Notepad. Write something down and leave it on the drive.',
        size: 160,
        category: 'Accessories',
        defaultInstalled: true,
    },
    {
        key: 'calculator',
        name: 'Calculator',
        blurb: 'Does what it says. Still faster than reaching for a phone.',
        size: 1500,
        category: 'Accessories',
        defaultInstalled: false,
    },
    {
        key: 'msDos',
        name: 'MS-DOS Prompt',
        blurb: 'A real command line, emulated. Type HELP if you mean it.',
        size: 12,
        category: 'Accessories',
        defaultInstalled: false,
    },
];

export const storeAppByKey = (key: string): StoreApp | undefined =>
    STORE_APPS.find((a) => a.key === key);

/** Can this app be installed or removed at all? */
export const isOptional = (key: string): boolean =>
    STORE_APPS.some((a) => a.key === key);

/**
 * Keys currently toggled away from their own `defaultInstalled` — not "the
 * uninstalled set". For the original ten (default on) that still means
 * "removed"; for anything the Store can newly add (default off) it means
 * "installed". Framing it as a deviation rather than an absolute state is
 * what lets the two directions share one Set, one storage key and one
 * listener list instead of needing a second copy of all of this.
 */
let toggled: Set<string> = load();
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
    toggled = next;
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
    const app = storeAppByKey(key);
    // Anything not in STORE_APPS at all (My Showcase, My Computer, the
    // system icons) is permanent — it was never optional to begin with.
    const def = app ? app.defaultInstalled : true;
    return toggled.has(key) ? !def : def;
}

export function setInstalled(key: string, installed: boolean): void {
    const app = storeAppByKey(key);
    if (!app) return;
    const shouldBeToggled = installed !== app.defaultInstalled;
    if (shouldBeToggled === toggled.has(key)) return;
    const next = new Set(toggled);
    if (shouldBeToggled) next.add(key);
    else next.delete(key);
    commit(next);
}

export const install = (key: string): void => setInstalled(key, true);
export const uninstall = (key: string): void => setInstalled(key, false);

/**
 * Reinstalls anything removed from the original ten. Deliberately leaves any
 * Store-added extras alone — "restore" undoes a removal, not the installs a
 * visitor asked for on purpose.
 */
export function installAll(): void {
    const next = new Set(
        Array.from(toggled).filter((key) => {
            const app = storeAppByKey(key);
            return app ? !app.defaultInstalled : false;
        })
    );
    if (next.size === toggled.size) return;
    commit(next);
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
