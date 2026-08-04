/**
 * Desktop icon layout.
 * --------------------
 * Icons default to the classic top-left grid (filling a column, then wrapping),
 * but any icon the user drags gets an explicit position stored under its name so
 * the layout survives a reload. Positions are kept in *desktop* coordinates (the
 * scaled space the icons live in), not screen pixels, so they stay put when the
 * screen resolution is changed.
 */

export interface IconPos {
    x: number;
    y: number;
}

const KEY = 'desktopIconPositions';

/** Grid metrics — must match the spacing used for the default layout. */
export const GRID = { w: 74, h: 104, perColumn: 8 };

/**
 * Where the icon layer sits inside the desktop. Icon positions are relative to
 * this, so anything converting a screen point into an icon slot (dragging a
 * file out of the Recycle Bin, say) has to subtract it.
 */
export const SHORTCUT_ORIGIN: IconPos = { x: 6, y: 16 };

/** Where an icon sits if the user has never moved it. */
export const defaultPosition = (index: number): IconPos => ({
    x: Math.floor(index / GRID.perColumn) * GRID.w,
    y: (index % GRID.perColumn) * GRID.h,
});

export function loadPositions(): Record<string, IconPos> {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export function savePositions(pos: Record<string, IconPos>): void {
    try {
        localStorage.setItem(KEY, JSON.stringify(pos));
    } catch {
        /* storage full / disabled — layout just won't persist */
    }
}

export function clearPositions(): void {
    localStorage.removeItem(KEY);
}

/**
 * Arrange Icons — drop a list of names back into the default grid in the order
 * given, which is what the desktop's right-click menu offers by name and by
 * type. Anything not named keeps whatever position it had.
 */
export function arrangeIcons(orderedNames: string[]): Record<string, IconPos> {
    const arranged: Record<string, IconPos> = { ...loadPositions() };
    orderedNames.forEach((name, i) => {
        arranged[name] = defaultPosition(i);
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
    const current = loadPositions();
    const bounds = iconBounds(scale);
    const lined: Record<string, IconPos> = {};
    Object.keys(current).forEach((name) => {
        lined[name] = snap(current[name].x, current[name].y, bounds);
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
        h: window.innerHeight / scale - 40,
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
