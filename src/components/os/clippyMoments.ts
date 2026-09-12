/**
 * Clippy, but about something that just happened.
 * ------------------------------------------------
 * `Clippy.tsx` runs a rotation: a shuffled deck of tips, drawn on an idle
 * timer, alternating between the desktop and the portfolio. That deck is
 * good at coverage and hopeless at timing — it cannot say anything about the
 * fact that you have just opened Minesweeper for the fourth time, or that it
 * is twenty past two in the morning, or that you have eleven windows open.
 *
 * This is the other half. Every entry below is tied to a specific thing the
 * visitor did, and fires once, shortly after they did it. That is the whole
 * difference between an assistant and a leaflet, and it is the entire reason
 * anyone ever liked the idea of the Office Assistant before they met it.
 *
 * Three rules, all of them about not becoming the thing everyone hated:
 *
 *   Nothing fires twice.  Each moment is capped — most at once per session,
 *   a few at two or three — and each has a cooldown of its own on top of the
 *   global one in `Clippy.tsx`. Noticing something once is observant.
 *   Noticing it every time is a nag.
 *
 *   Nothing fires immediately.  Every moment has a delay measured in whole
 *   seconds. Speaking on the same frame as the click reads as a popup; a
 *   beat later reads as somebody looking over and commenting.
 *
 *   Nothing here is a tip.  These lines are remarks. If a line could have
 *   been in the rotation, it belongs in the rotation — the moments pool
 *   earns its keep only by saying things the rotation could not possibly
 *   know to say.
 *
 * Variation
 * ---------
 * Every moment carries two to four lines, drawn without replacement from a
 * shuffled bag (see `drawFrom`). A visitor who triggers the same moment on
 * two separate visits gets two different remarks; the third and fourth only
 * come round once the first two are used up. `Math.random()` on a pool of
 * three repeats about a third of the time, which is exactly often enough to
 * make a person conclude there is only one line.
 */

import { Line, clippySay, isClippyEnabled, randomClippy } from './Clippy';

export type ClippyMoment =
    | 'lateNight'
    | 'returning'
    | 'firstGame'
    | 'gameOver'
    | 'sameAppAgain'
    | 'manyWindows'
    | 'muted'
    | 'konami'
    | 'bsod'
    | 'themeChanged'
    | 'trashed'
    | 'petHungry';

interface MomentDef {
    /** Two to four, so the same trigger never reads the same way twice. */
    texts: string[];
    /** Wired to an APPLICATIONS key when the remark has somewhere to point. */
    openAppKey?: string;
    action?: string;
    /** Milliseconds between the thing happening and him mentioning it. */
    delay: number;
    /** How many times in one page session. Most are 1. */
    cap: number;
}

const MOMENTS: Record<ClippyMoment, MomentDef> = {
    /* --- the clock ---------------------------------------------------- */
    lateNight: {
        texts: [
            'It is the middle of the night where you are. Jonas built most of this at roughly this hour, so you are in the right frame of mind for it.',
            'Working late, or avoiding something? Either way — the screen saver in Display Properties is genuinely nice at this hour.',
            'Past midnight. In 1995 this is the point where the machine would have started making a noise you could not identify.',
        ],
        delay: 9000,
        cap: 1,
    },

    returning: {
        texts: [
            'You have been here before. Not many people come back to a portfolio — thank you for that.',
            'Back again. The C: drive kept everything you saved last time, in case you had forgotten.',
            'Welcome back. Something in here has changed since your last visit; Patch Notes will tell you what.',
        ],
        openAppKey: 'patchNotes',
        action: 'What changed?',
        delay: 12_000,
        cap: 1,
    },

    /* --- games -------------------------------------------------------- */
    firstGame: {
        texts: [
            'Go on then. Just so you know, the rest of this machine is a portfolio, and it is more interesting than it sounds.',
            'A game. Fair enough — half of what anyone did on a machine like this in 1995 was play something.',
            'These all actually work, by the way. None of them is a screenshot with a fake score on it.',
        ],
        delay: 14_000,
        cap: 1,
    },

    gameOver: {
        texts: [
            'Unlucky. There are eight other games on this machine, if you would like to lose at something new.',
            'That happens. The Games folder in Hard Disk (C:) has the full set.',
            'Hard lines. Doom is the actual 1993 release, if you would like to take it out on something.',
        ],
        openAppKey: 'programs',
        action: 'Show me the rest',
        delay: 4000,
        cap: 2,
    },

    /* --- how the machine is being used -------------------------------- */
    sameAppAgain: {
        texts: [
            'You keep coming back to that one. It is probably worth knowing there are about forty programs on this machine.',
            'Third time in that window. If you have found something you like, the Store has more of the same sort of thing.',
            'That window again. Not a complaint — it is nice when something gets used.',
        ],
        openAppKey: 'store',
        action: 'Open the Store',
        delay: 6000,
        cap: 1,
    },

    manyWindows: {
        texts: [
            'That is a lot of windows. Windows 95 would have started swapping to disk by now, loudly.',
            'Seven windows. In 1995 this is the point at which somebody would have suggested you close a few.',
            'You have opened most of the machine at once. Task Manager will tidy it up in one go if it gets out of hand.',
        ],
        openAppKey: 'taskManager',
        action: 'Open Task Manager',
        delay: 5000,
        cap: 1,
    },

    muted: {
        texts: [
            'Sound off. Reasonable — although every noise this machine makes is generated live by an oscillator rather than played from a file, which is the sort of thing that is more interesting than it is enjoyable.',
            'Muted. The speaker in the tray turns it back on whenever you like.',
        ],
        delay: 7000,
        cap: 1,
    },

    /* --- the machine doing something ---------------------------------- */
    konami: {
        texts: [
            'Up, up, down, down. Somebody taught you well.',
            'That still works on almost nothing, and it works here.',
        ],
        delay: 3500,
        cap: 1,
    },

    bsod: {
        texts: [
            'It is fine. Nothing was lost, and that one was on purpose.',
            'A blue screen, for authenticity. The real ones were considerably less polite about it.',
            'Everything you saved is still in Hard Disk (C:). That part is real, so it survives things this one does not.',
        ],
        openAppKey: 'myComputer',
        action: 'Check the drive',
        delay: 4000,
        cap: 2,
    },

    themeChanged: {
        texts: [
            'Better. Display Properties has the wallpapers and the screen savers too, if you are redecorating properly.',
            'Good choice. That colour scheme is one of the real ones that shipped with the operating system.',
        ],
        openAppKey: 'settings',
        action: 'Keep going',
        delay: 5000,
        cap: 1,
    },

    trashed: {
        texts: [
            'Gone. The Store puts any of it back, and it never asks why.',
            'The Recycle Bin on this machine is real — open it and it is still in there.',
        ],
        openAppKey: 'recycleBin',
        action: 'Open the bin',
        delay: 5000,
        cap: 1,
    },

    petHungry: {
        texts: [
            'Whatever is living on your taskbar would like feeding, when you have a moment.',
            'Your pet has been sitting by an empty bowl for a while. It is not subtle about it.',
        ],
        openAppKey: 'pet',
        action: 'Go and see',
        delay: 8000,
        cap: 1,
    },
};

/* -------------------------------------------------------------------------
 * Drawing without replacement
 * ---------------------------------------------------------------------- */

/** Unused line indices per moment, refilled and reshuffled when exhausted. */
const bags: Partial<Record<ClippyMoment, number[]>> = {};

function drawFrom(moment: ClippyMoment): string {
    const def = MOMENTS[moment];
    let bag = bags[moment];
    if (!bag || !bag.length) {
        bag = def.texts.map((_, i) => i);
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        bags[moment] = bag;
    }
    const index = bag.pop();
    return def.texts[index ?? 0];
}

/* -------------------------------------------------------------------------
 * Firing
 * ---------------------------------------------------------------------- */

/** How many times each moment has fired in this page session. */
const fired: Partial<Record<ClippyMoment, number>> = {};
/** Pending timers, so a moment cancelled by a second call can't double up. */
const pending: Partial<Record<ClippyMoment, number>> = {};

/**
 * A floor under *all* of them together. Two different moments both deciding
 * they are worth mentioning inside the same ten seconds is how a helpful
 * remark becomes a popup storm — and the two most likely to collide (opening
 * a seventh window and opening the same app a third time) are exactly the
 * ones a visitor exploring enthusiastically will trigger back to back.
 */
const GLOBAL_GAP_MS = 45_000;
let lastMomentAt = 0;

/**
 * Notes that something happened, and has Clippy remark on it a few seconds
 * later if he is allowed to and has not already.
 *
 * Safe to call from anywhere and as often as you like — every guard is in
 * here rather than at the call sites, so a component firing this on every
 * render costs one comparison and nothing else.
 */
export function clippyMoment(moment: ClippyMoment): void {
    if (!isClippyEnabled()) return;

    const def = MOMENTS[moment];
    const count = fired[moment] ?? 0;
    if (count >= def.cap) return;
    if (pending[moment]) return;

    // The global gap is checked twice: once now, to avoid queueing something
    // that will be stale by the time it lands, and once when the timer fires,
    // because a different moment may have spoken in between.
    if (Date.now() - lastMomentAt < GLOBAL_GAP_MS) return;

    fired[moment] = count + 1;
    pending[moment] = window.setTimeout(() => {
        delete pending[moment];
        if (!isClippyEnabled()) return;
        if (Date.now() - lastMomentAt < GLOBAL_GAP_MS) return;
        lastMomentAt = Date.now();

        const line: Line = {
            text: drawFrom(moment),
            animation: randomClippy(),
        };
        if (def.openAppKey && def.action) {
            line.openAppKey = def.openAppKey;
            line.action = def.action;
        }
        clippySay(line);
    }, def.delay);
}

/**
 * Convenience for the one moment with a condition rather than an event
 * behind it: called from the desktop on mount.
 */
export function clippyNoteArrival(sessions: number): void {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
        clippyMoment('lateNight');
        return;
    }
    if (sessions > 1) clippyMoment('returning');
}
