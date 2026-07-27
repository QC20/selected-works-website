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

/** Snap to the icon grid and keep the icon on screen. */
export function snap(x: number, y: number, bounds: { w: number; h: number }): IconPos {
    const sx = Math.round(x / GRID.w) * GRID.w;
    const sy = Math.round(y / GRID.h) * GRID.h;
    return {
        x: Math.max(0, Math.min(sx, Math.max(0, bounds.w - GRID.w))),
        y: Math.max(0, Math.min(sy, Math.max(0, bounds.h - GRID.h))),
    };
}
