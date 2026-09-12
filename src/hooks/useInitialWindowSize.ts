import { useEffect, useState } from 'react';
import { getResolutionScale } from '../components/os/resolution';

/**
 * The viewport, in the desktop's own coordinates, kept up to date.
 * ---------------------------------------------------------------
 * Two things were wrong with the version this replaces, and they were the
 * same two things that were wrong with `Window`'s maximize:
 *
 *   It read `window.innerWidth` directly. The whole 2D desktop lives inside a
 *   `transform: scale()` wrapper for the retro resolution setting, so raw
 *   viewport pixels are the wrong number at every setting except 100% — and
 *   My Showcase, its only caller, sized itself from them.
 *
 *   It measured once, at call time, with no listener at all. Rotating a phone
 *   or dragging the browser window never changed the answer.
 */
export default function useInitialWindowSize({ margin }: { margin?: number }) {
    const m = margin || 0;

    const [size, setSize] = useState(() => measure(m));

    useEffect(() => {
        const onResize = () => setSize(measure(m));
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
        };
    }, [m]);

    return size;
}

function measure(m: number): { initWidth: number; initHeight: number } {
    const scale = getResolutionScale() || 1;
    return {
        initWidth: window.innerWidth / scale - m,
        initHeight: window.innerHeight / scale - m,
    };
}
