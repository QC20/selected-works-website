/**
 * Desktop icon layout.
 * --------------------
 * Icons default to the classic top-left grid (filling a column, then wrapping),
 * and anything the user drags gets an explicit position stored under its id.
 * Positions are kept in *desktop* coordinates (the scaled space the icons live
 * in), not screen pixels, so they stay put when the screen resolution changes.
 *
 * Two rules the desktop enforces on top of that:
 *
 *   Nothing persists.  A rearranged desktop lasts as long as the visit. Open
 *   the site again and every icon is back where it started, because a portfolio
 *   that opens differently for the same person each time is a portfolio whose
 *   first impression they can accidentally ruin. (What the machine *does*
 *   remember is what you removed — see `installedApps.ts`.)
 *
 *   Nothing overlaps.  Two icons may never share a grid slot, so no icon can
 *   ever be hidden underneath another one. `resolveLayout` is what guarantees
 *   it, and it runs over every icon on the desktop — app shortcuts and files
 *   alike — every time the layout is drawn.
 */

import { TASKBAR_CLEARANCE } from './metrics';

export interface IconPos {
    x: number;
    y: number;
}

/** One thing sitting on the desktop grid, as far as the layout is concerned. */
export interface PlacedIcon {
    /** Stable and unique — `shortcut:doom`, `file:old-picture-of-me`. */
    id: string;
    /** The visible label. Only used to decide who yields in a collision. */
    name: string;
    /** Where it would like to be. */
    pos: IconPos;
}

/**
 * Grid metrics. `perColumn` is how long a column is *allowed* to get — the
 * desktop line-up is written as eight icons and then seven (see DESKTOP_ORDER
 * in `Desktop.tsx`) — not how long it always is. See `rowsPerColumn`.
 */
export const GRID = { w: 74, h: 104, perColumn: 8 };

/**
 * How many icons actually fit in a column right now.
 *
 * An icon with a two-line label is 92 pixels tall, so eight of them need a
 * window about 880 tall, which most laptops have and a short window does not.
 * Rather than let the eighth icon disappear behind the taskbar, or bump some
 * other icon out of the way to make room, the column simply ends early and the
 * line-up carries on in the next one — the order is preserved, and nothing is
 * ever hidden. It is also what a real desktop does when you shrink the screen.
 */
export const rowsPerColumn = (bounds: { w: number; h: number }): number =>
    Math.max(1, Math.min(GRID.perColumn, Math.floor(bounds.h / GRID.h)));

/**
 * Where the icon layer sits inside the desktop. Icon positions are relative to
 * this, so anything converting a screen point into an icon slot (dragging a
 * file out of the Recycle Bin, say) has to subtract it.
 */
export const SHORTCUT_ORIGIN: IconPos = { x: 6, y: 16 };

/** Where the nth icon of the line-up sits if the user has never moved it. */
export const defaultPosition = (
    index: number,
    rows: number = GRID.perColumn
): IconPos => ({
    x: Math.floor(index / rows) * GRID.w,
    y: (index % rows) * GRID.h,
});

/**
 * The positions the user has dragged things to, this visit.
 *
 * Deliberately a plain module variable and not localStorage: see the note at
 * the top. Keyed by `PlacedIcon.id`.
 */
let positions: Record<string, IconPos> = {};

// Positions used to be written to localStorage. They aren't any more, so clear
// out whatever an earlier visit left behind rather than leaving a dead key
// sitting in everyone's browser forever.
try {
    localStorage.removeItem('desktopIconPositions');
} catch {
    /* storage disabled — there was nothing to clear anyway */
}

export function loadPositions(): Record<string, IconPos> {
    return positions;
}

export function savePositions(next: Record<string, IconPos>): void {
    positions = next;
}

/**
 * Arrange Icons — drop a list of ids back into the default grid in the order
 * given, which is what the desktop's right-click menu offers by name and by
 * type. Anything not named keeps whatever position it had.
 */
export function arrangeIcons(
    orderedIds: string[],
    bounds: { w: number; h: number }
): Record<string, IconPos> {
    const arranged: Record<string, IconPos> = { ...positions };
    const rows = rowsPerColumn(bounds);
    orderedIds.forEach((id, i) => {
        arranged[id] = defaultPosition(i, rows);
    });
    savePositions(arranged);
    return arranged;
}

/**
 * Line Up Icons — snap every icon to the nearest grid slot without reordering
 * anything, so a hand-arranged desktop keeps its arrangement but stops looking
 * like it was dropped from a height.
 */
export function lineUpIcons(scale: number): Record<string, IconPos> {
    const bounds = iconBounds(scale);
    const lined: Record<string, IconPos> = {};
    Object.keys(positions).forEach((id) => {
        lined[id] = snap(positions[id].x, positions[id].y, bounds);
    });
    savePositions(lined);
    return lined;
}

/** Snap to the icon grid and keep the icon on screen. */
export function snap(x: number, y: number, bounds: { w: number; h: number }): IconPos {
    const sx = Math.round(x / GRID.w) * GRID.w;
    const sy = Math.round(y / GRID.h) * GRID.h;
    return {
        x: Math.max(0, Math.min(sx, Math.max(0, bounds.w - GRID.w))),
        y: Math.max(0, Math.min(sy, Math.max(0, bounds.h - GRID.h))),
    };
}

/** The desktop area icons may occupy, in desktop coords (clear of the taskbar). */
export function iconBounds(scale: number): { w: number; h: number } {
    return {
        w: window.innerWidth / scale,
        h: window.innerHeight / scale - TASKBAR_CLEARANCE,
    };
}

/**
 * Turn a screen point (a drop) into a snapped icon slot, centring the icon on
 * the cursor. Used when a file is dragged out of the Recycle Bin.
 */
export function screenToIconSlot(
    screenX: number,
    screenY: number,
    scale: number
): IconPos {
    return snap(
        screenX / scale - SHORTCUT_ORIGIN.x - GRID.w / 2,
        screenY / scale - SHORTCUT_ORIGIN.y - GRID.h / 2,
        iconBounds(scale)
    );
}

// ---- No two icons in one slot ----------------------------------------------

/** Which cell of the grid a position falls in. */
const cellOf = (pos: IconPos): string =>
    `${Math.round(pos.x / GRID.w)},${Math.round(pos.y / GRID.h)}`;

/**
 * The first cell nobody has claimed, scanned the way the default layout fills
 * the desktop: down the first column, then down the second, and so on. That's
 * the same order the eye reads the desktop in, so a displaced icon turns up in
 * the first gap you'd have pointed at yourself.
 *
 * The scan runs past the right-hand edge if it has to. On a phone held upright
 * there might be only two columns of eight, and fifteen icons plus a handful of
 * saved files will fill those; walking off the edge is worse than stacking, but
 * only barely, and it takes a genuinely tiny window to get there.
 */
function firstFreeCell(
    taken: Set<string>,
    bounds: { w: number; h: number }
): IconPos {
    const rows = rowsPerColumn(bounds);
    const columns = Math.max(1, Math.floor(bounds.w / GRID.w));
    for (let column = 0; column < columns + 64; column++) {
        for (let row = 0; row < rows; row++) {
            if (!taken.has(`${column},${row}`)) {
                return { x: column * GRID.w, y: row * GRID.h };
            }
        }
    }
    // Unreachable: 64 columns past the edge is thousands of free cells.
    return { x: 0, y: 0 };
}

/**
 * Hands every icon a slot of its own.
 *
 * Whoever claims a cell first keeps it, so the sort order *is* the rule:
 *
 *   - `pinnedId` claims before anything else. That's the icon the user has
 *     just put down, and an icon that jumps out from under your own finger is
 *     not direct manipulation. It stays where you dropped it.
 *   - after that, the alphabetically later name claims first, which is the same
 *     thing as saying the lower name is the one that yields and goes looking
 *     for somewhere else to sit.
 *
 * Yielding is not a single step aside: the displaced icon takes the first free
 * cell on the whole desktop, and if that one is claimed by the time it gets
 * there — because a chain of icons is shuffling — the next round of the scan
 * finds it another. There is always somewhere to go.
 */
export function resolveLayout(
    items: PlacedIcon[],
    bounds: { w: number; h: number },
    pinnedId?: string
): Record<string, IconPos> {
    const order = items.slice().sort((a, b) => {
        if (a.id === pinnedId) return -1;
        if (b.id === pinnedId) return 1;
        const byName = b.name.localeCompare(a.name);
        // Two icons with the same label would otherwise sort unstably, and an
        // icon that swaps places on every render is worse than either outcome.
        return byName !== 0 ? byName : b.id.localeCompare(a.id);
    });

    const taken = new Set<string>();
    const layout: Record<string, IconPos> = {};

    order.forEach((item) => {
        const wanted = snap(item.pos.x, item.pos.y, bounds);
        const pos = taken.has(cellOf(wanted))
            ? firstFreeCell(taken, bounds)
            : wanted;
        taken.add(cellOf(pos));
        layout[item.id] = pos;
    });

    return layout;
}
