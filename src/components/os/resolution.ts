/**
 * Desktop "resolution" toggle.
 * ----------------------------
 * A retro screen-resolution switch that lives in the taskbar. It scales the whole
 * 2D desktop: a *lower* resolution makes everything bigger (fewer virtual pixels),
 * a *higher* resolution fits more on screen. It's applied as a transform on a
 * wrapper whose size is inversely scaled, so the desktop still fills the viewport.
 *
 * Because it lives on the desktop itself, it only ever affects the flat 2D image —
 * including the copy shown inside the 3D monitor (you press it there through the
 * iframe, exactly like changing resolution on a real monitor). The 3D room is
 * never touched.
 */

export type Resolution = 1 | 2 | 3 | 4;

export interface ResolutionOption {
    value: Resolution;
    label: string;
    /** Multiplier applied to the desktop (larger = lower resolution). */
    scale: number;
}

export const RESOLUTIONS: ResolutionOption[] = [
    { value: 1, label: '640 × 480', scale: 1.3 },
    { value: 2, label: '800 × 600', scale: 1.0 },
    { value: 3, label: '1024 × 768', scale: 0.82 },
    { value: 4, label: '1280 × 1024', scale: 0.66 },
];

const KEY = 'desktopResolution';
const DEFAULT: Resolution = 2;

export const scaleFor = (r: Resolution): number =>
    RESOLUTIONS.find((o) => o.value === r)?.scale ?? 1;

export function loadResolution(): Resolution {
    const v = Number(localStorage.getItem(KEY));
    return (RESOLUTIONS.some((o) => o.value === v) ? v : DEFAULT) as Resolution;
}

export function saveResolution(r: Resolution): void {
    localStorage.setItem(KEY, String(r));
}

// Shared with Window dragging/resizing so pointer deltas stay correct while the
// desktop is scaled. Kept as a module singleton so components don't have to
// thread it through props.
let currentScale = 1;
export const setCurrentScale = (s: number): void => {
    currentScale = s;
};
export const getResolutionScale = (): number => currentScale;
