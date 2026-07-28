/**
 * Desktop appearance.
 * -------------------
 * What the Display Properties dialog (Start → Settings) actually changes: the
 * desktop background and the active window title-bar colour. Kept as a module
 * singleton with a subscribe hook, the same shape as `resolution.ts`, because
 * both the Desktop and every open Window need to read it.
 */

import { useEffect, useState } from 'react';
import Colors from '../../constants/colors';

export interface Theme {
    /** Desktop background. */
    background: string;
    /** Active window title bar / selection colour. */
    titleBar: string;
}

export interface ThemePreset {
    name: string;
    background: string;
    titleBar: string;
}

/** Windows 95's own colour schemes, plus this site's default. */
export const PRESETS: ThemePreset[] = [
    { name: 'Portfolio (default)', background: Colors.turquoise, titleBar: Colors.blue },
    { name: 'Windows Standard', background: '#008080', titleBar: '#000080' },
    { name: 'Desert', background: '#a08963', titleBar: '#804000' },
    { name: 'Eggplant', background: '#4a4a63', titleBar: '#403050' },
    { name: 'Rose', background: '#9c6c6c', titleBar: '#803030' },
    { name: 'Slate', background: '#5c6b73', titleBar: '#2f4f4f' },
    { name: 'Storm', background: '#3a3a3a', titleBar: '#1c1c2e' },
    { name: 'Lilac', background: '#8b7e9e', titleBar: '#4b3f63' },
];

/** Background swatches offered on the Background tab. */
export const BACKGROUNDS: { name: string; color: string }[] = [
    { name: '(None)', color: Colors.turquoise },
    { name: 'Teal', color: '#008080' },
    { name: 'Midnight', color: '#1c2438' },
    { name: 'Olive', color: '#6b7042' },
    { name: 'Plum', color: '#5b3a5b' },
    { name: 'Rust', color: '#8b4a35' },
    { name: 'Slate', color: '#4a5b6b' },
    { name: 'Charcoal', color: '#2e2e2e' },
];

const KEY = 'desktopTheme.v1';

const DEFAULT: Theme = {
    background: Colors.turquoise,
    titleBar: Colors.blue,
};

function load(): Theme {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return DEFAULT;
        const stored = JSON.parse(raw) as Partial<Theme>;
        return {
            background: stored.background || DEFAULT.background,
            titleBar: stored.titleBar || DEFAULT.titleBar,
        };
    } catch {
        return DEFAULT;
    }
}

let theme: Theme = load();
const listeners = new Set<() => void>();

export function getTheme(): Theme {
    return theme;
}

export function setTheme(next: Partial<Theme>): void {
    theme = { ...theme, ...next };
    try {
        localStorage.setItem(KEY, JSON.stringify(theme));
    } catch {
        /* storage disabled — the theme just won't survive a reload */
    }
    listeners.forEach((fn) => fn());
}

export function resetTheme(): void {
    setTheme(DEFAULT);
}

/** Subscribe a component to appearance changes. */
export function useTheme(): Theme {
    const [, forceRender] = useState(0);
    useEffect(() => {
        const listener = () => forceRender((n) => n + 1);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return theme;
}
