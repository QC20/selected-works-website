/**
 * How much like a cathode-ray tube the screen should look.
 * --------------------------------------------------------
 * One store, two customers: the television's own picture tube, and — when the
 * visitor asks for it in Display Properties — the whole desktop.
 *
 * The brief that shaped every default in here: *the screen must not feel
 * dirty*. A portfolio behind permanent scanlines is a portfolio nobody reads,
 * and heavy CRT filters read as dust on the reader's eyes rather than
 * character on the machine's. So:
 *
 *   - The desktop ships with this off. A visitor who never opens Display
 *     Properties never sees a scanline, and that is the correct default.
 *   - `SUBTLE` is what the "on" switch actually turns on, and it is deliberately
 *     almost imperceptible — enough to warm the picture, not enough to fight
 *     the text. `PERIOD` exists for people who go looking for it.
 *   - The *television* is the exception and always wears its tube, because a
 *     television that looks like a flat panel is not a television. That is
 *     passed in directly rather than read from here.
 *
 * Removing the feature entirely: delete this file, `CrtScreen.tsx`, the
 * Appearance rows in `applications/Settings.tsx` that reference them, and the
 * `<CrtScreen>` wrapper in `os/Desktop.tsx`. The television passes its own
 * settings, so it keeps working without any of that.
 */

import { useEffect, useState } from 'react';

export interface CrtSettings {
    /** Horizontal line darkening, 0–1. */
    scanlines: number;
    /** Phosphor bloom around bright areas, 0–1. */
    glow: number;
    /** Corner darkening, 0–1. Reads as tube falloff. */
    vignette: number;
    /** Moving grain, 0–1. Costs a canvas, so 0 means "don't mount one". */
    noise: number;
    /** Aperture-grille tint, 0–1. The RGB stripe of a Trinitron. */
    mask: number;
}

export const CRT_OFF: CrtSettings = {
    scanlines: 0,
    glow: 0,
    vignette: 0,
    noise: 0,
    mask: 0,
};

/** What the desktop's "CRT monitor" switch turns on. Barely there, on purpose. */
export const CRT_SUBTLE: CrtSettings = {
    scanlines: 0.1,
    glow: 0.12,
    vignette: 0.18,
    noise: 0,
    mask: 0.05,
};

/** For visitors who want the full 1995 monitor. Still readable. */
export const CRT_PERIOD: CrtSettings = {
    scanlines: 0.22,
    glow: 0.2,
    vignette: 0.32,
    noise: 0.03,
    mask: 0.14,
};

/** The television's tube. Heavier than anything the desktop ever wears. */
export const CRT_TELEVISION: CrtSettings = {
    scanlines: 0.3,
    glow: 0.28,
    vignette: 0.42,
    noise: 0.05,
    mask: 0.18,
};

export type CrtPreset = 'off' | 'subtle' | 'period';

export const PRESETS: Record<CrtPreset, CrtSettings> = {
    off: CRT_OFF,
    subtle: CRT_SUBTLE,
    period: CRT_PERIOD,
};

export const PRESET_LABELS: { value: CrtPreset; label: string; note: string }[] =
    [
        { value: 'off', label: 'Flat panel', note: 'No tube effects at all.' },
        {
            value: 'subtle',
            label: 'CRT monitor',
            note: 'A faint tube. Text stays crisp.',
        },
        {
            value: 'period',
            label: 'CRT monitor (period)',
            note: 'Visible scanlines and grille.',
        },
    ];

const KEY = 'crt.preset.v1';

const load = (): CrtPreset => {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw === 'subtle' || raw === 'period' || raw === 'off') return raw;
    } catch {
        /* private mode — fall through to the default */
    }
    return 'off';
};

let current: CrtPreset = load();
const listeners = new Set<(p: CrtPreset) => void>();

export const getCrtPreset = (): CrtPreset => current;

export function setCrtPreset(next: CrtPreset): void {
    current = next;
    try {
        localStorage.setItem(KEY, next);
    } catch {
        /* not worth failing the click over */
    }
    listeners.forEach((fn) => fn(next));
}

/** Subscribes a component to the desktop's CRT setting. */
export function useCrtPreset(): [CrtPreset, (p: CrtPreset) => void] {
    const [preset, setPreset] = useState<CrtPreset>(current);
    useEffect(() => {
        const listener = (p: CrtPreset) => setPreset(p);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return [preset, setCrtPreset];
}
