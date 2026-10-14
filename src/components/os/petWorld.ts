/**
 * What the creature can actually stand on.
 * -----------------------------------------
 * Until now the pet's entire world was the taskbar: one ledge, always in the
 * same place, thirty pixels tall. Everything it could do, it did along that
 * one line.
 *
 * Shimeji — the Japanese desktop-mascot engine from 2009, still the most
 * elaborate thing of its kind anybody has built — is legendary for exactly
 * the thing this file adds. Its behaviour table is gated on expressions like
 * `#{mascot.environment.activeIE.topBorder.isOn(mascot.anchor)}`, and the
 * behaviours behind that gate are `WalkAlongIECeiling`, `SitOnTheLeftEdgeOfIE`,
 * `JumpFromRightEdgeOfIE`, `ClimbIEWall`. The mascot does not live on your
 * desktop; it lives on your *windows*. It climbs the side of the thing you are
 * reading, sits on the title bar, and drops off the end.
 *
 * This desktop has real windows — draggable, resizable, stacking, with a real
 * title bar at a real position. They were sitting right there.
 *
 * Reading the world from the DOM
 * ------------------------------
 * The obvious implementation is a registry: every `Window` publishes its box
 * into a store on mount, move and resize, and the pet subscribes. That is a
 * lot of plumbing, and it is wrong in a specific way — it would be a *copy* of
 * the truth, updated on the events somebody remembered to wire, and it would
 * drift the first time a window moved for a reason nobody anticipated
 * (maximize, the resolution switch, a restore from session).
 *
 * So the ledges are read straight off the layout instead. `Window.tsx` marks
 * its outer box with `data-pet-ledge`, and this file asks the document where
 * those boxes are. It cannot drift, because it is not a copy: a maximized
 * window, a window being dragged, a window that moved because the browser
 * resized — all of them are simply where `getBoundingClientRect` says they
 * are. Minimized windows report a zero box and fall out on their own.
 *
 * The cost is one `querySelectorAll` plus a handful of rect reads, which is
 * why `surveyLedges` is throttled: the creature only needs an up-to-date map
 * of the world when it is *deciding where to go*. Once it has committed to a
 * ledge it holds the element itself and re-reads that one rect every frame —
 * which is what lets it ride a window you are dragging.
 */

import { TASKBAR_HEIGHT } from './metrics';
import { getResolutionScale } from './resolution';

/** How high above the bottom of the screen the taskbar's surface sits. */
export const GROUND = TASKBAR_HEIGHT - 6;

/**
 * Somewhere the creature can stand, in the pet's own coordinates: `x` across
 * the desktop from the left, `y` upward from the taskbar's surface.
 */
export interface Ledge {
    /** Stable across surveys, so "stay on the one I am on" is expressible. */
    key: string;
    left: number;
    right: number;
    /** Height above `GROUND`. The taskbar itself is 0. */
    y: number;
    /** Null for the taskbar; otherwise the window this ledge belongs to. */
    el: HTMLElement | null;
}

/** Narrower than this and there is nowhere to put four feet. */
const MIN_LEDGE_WIDTH = 72;
/** A ledge this close to the taskbar is not worth climbing onto. */
const MIN_LEDGE_HEIGHT = 46;
/** Clear space needed above a ledge for the creature standing on it. */
const MIN_HEADROOM = 72;
/** Sinks the sprite box so the drawn feet, not the box, meet the surface. */
const FOOT_INSET = 6;
/** Ledges are re-surveyed at most this often while choosing. */
const SURVEY_INTERVAL_MS = 180;

let cached: Ledge[] = [];
let cachedAt = 0;

const layerWidth = (): number =>
    window.innerWidth / (getResolutionScale() || 1);
const layerHeight = (): number =>
    window.innerHeight / (getResolutionScale() || 1);

/** The taskbar — always present, always the fallback. */
export function groundLedge(): Ledge {
    return {
        key: 'taskbar',
        left: 0,
        right: layerWidth(),
        y: 0,
        el: null,
    };
}

/**
 * Converts one window's box into the ledge along its top edge.
 *
 * Returns null for anything the creature has no business standing on: a
 * minimized window (zero box), one too narrow to stand on, one whose title bar
 * has been dragged off the top of the screen, and one sitting so low that
 * climbing it would be indistinguishable from standing on the floor.
 */
export function ledgeFor(el: HTMLElement, key: string): Ledge | null {
    const scale = getResolutionScale() || 1;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return null;

    const left = r.left / scale;
    const right = r.right / scale;
    if (right - left < MIN_LEDGE_WIDTH) return null;

    /*
     * The pet's y is measured upward from the taskbar's surface, and the DOM's
     * is measured downward from the top of the viewport.
     *
     * `FOOT_INSET` is the same six pixels the taskbar already uses: `GROUND`
     * is `TASKBAR_HEIGHT - 6`, which sinks the sprite box six pixels below the
     * bar's surface so that the *drawn* feet land on it rather than hovering.
     * The art has transparent padding under it — Modem has four empty rows out
     * of thirty-two — and without the same correction here the creature stood
     * a visible gap above every title bar it climbed onto.
     */
    const y = layerHeight() - r.top / scale - GROUND - FOOT_INSET;
    if (y < MIN_LEDGE_HEIGHT) return null;
    /*
     * Needs headroom. A creature standing on a ledge extends *upward* from
     * it, so a title bar within one sprite-height of the top of the screen
     * gets you a pet with its head cut off — verified on the near-maximized
     * My Showcase window, whose bar sits 24px down and left half the dog
     * above the viewport. Windows opened at ordinary positions clear this
     * comfortably; the ones that do not are also the ones covering the whole
     * screen, where a creature on the roof is the least interesting anyway.
     */
    if (r.top / scale < MIN_HEADROOM) return null;

    return { key, left, right, y, el };
}

/**
 * Every ledge in the world right now, taskbar last.
 *
 * Throttled, because this is called from the animation loop and the answer
 * only matters at the moment the creature picks somewhere to go. Pass
 * `force` when that moment has to be accurate — the frame a window closes,
 * say.
 */
export function surveyLedges(force = false): Ledge[] {
    const now = performance.now();
    if (!force && now - cachedAt < SURVEY_INTERVAL_MS) return cached;
    cachedAt = now;

    const out: Ledge[] = [];
    const nodes = document.querySelectorAll<HTMLElement>('[data-pet-ledge]');
    nodes.forEach((el, i) => {
        const key = el.getAttribute('data-pet-ledge') || `w${i}`;
        const ledge = ledgeFor(el, key);
        if (ledge) out.push(ledge);
    });

    // Highest first: when the creature goes looking for somewhere to climb,
    // the interesting answer is usually the window on top of the pile.
    out.sort((a, b) => b.y - a.y);
    out.push(groundLedge());
    cached = out;
    return out;
}

/** The ledge with this key, re-measured now. Null once it has gone away. */
export function refreshLedge(ledge: Ledge): Ledge | null {
    if (!ledge.el) return groundLedge();
    if (!ledge.el.isConnected) return null;
    return ledgeFor(ledge.el, ledge.key);
}

/**
 * A ledge the creature could plausibly get to from where it is standing.
 *
 * "Plausibly" is doing real work: a window on the far side of the screen is a
 * long dull walk, and one directly overhead is unreachable without a ladder.
 * So candidates are scored on how far they are horizontally and how big a step
 * up they are, and one is drawn at random from the plausible ones rather than
 * always taking the nearest — a creature that always makes the optimal choice
 * reads as a pathfinder, not an animal.
 */
export function reachableLedges(
    fromX: number,
    fromY: number,
    /*
     * Deliberately generous — nearly the whole screen.
     *
     * The first version of this capped the climb at 320px, on the reasonable-
     * sounding theory that a creature should not scale a skyscraper. Measuring
     * the actual desktop killed that theory: windows on this machine open near
     * the *top* of the screen and the pet lives at the bottom, so every title
     * bar is around 800px up. A 320px limit did not make the climb sensible,
     * it made the feature never happen at all.
     *
     * So the limit is high and `LEDGE_CLIMB_SPEED` is fast instead. A long
     * scramble up the side of a window is the good version of this; a long
     * *slow* scramble is the bad one.
     */
    maxRise = 900
): Ledge[] {
    return surveyLedges().filter((l) => {
        if (l.y <= fromY + 8) return false;
        if (l.y - fromY > maxRise) return false;
        // It climbs the nearest vertical edge of the window, so "how far away"
        // is the distance to whichever side it would scale.
        const edge = Math.abs(fromX - l.left) < Math.abs(fromX - l.right)
            ? l.left
            : l.right;
        return Math.abs(edge - fromX) < 520;
    });
}

/** True when `x` is over this ledge's surface, with a small tolerance. */
export const onLedge = (l: Ledge, x: number, pad = 0): boolean =>
    x >= l.left - pad && x <= l.right + pad;
