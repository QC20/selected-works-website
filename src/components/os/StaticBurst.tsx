import React, { useEffect, useRef } from 'react';

/**
 * Snow.
 * -----
 * The burst of noise a set makes between channels, and the thing that sells a
 * channel change more than the channel itself does. Mounted for a few hundred
 * milliseconds and then thrown away.
 *
 * Built as its own component rather than a mode of `CrtScreen` because it is
 * reusable well beyond the television: anywhere the picture is supposed to
 * *cut* — the blue screen, the shutdown sequence, the log-on — is improved by
 * a frame or two of snow first, and all of those want it without any of the
 * scanline machinery.
 *
 * The noise is drawn at a quarter scale and stretched, for the same reason the
 * grain in `CrtScreen` is: a full-resolution field redrawn every frame is
 * pure waste at this size, and nobody can tell.
 */

export interface StaticBurstProps {
    /** 0–1. The television's STATIC knob feeds this straight through. */
    intensity?: number;
    /** Rounds to match the screen behind it. */
    radius?: number;
    /** Drawn over the whole viewport rather than the nearest positioned parent. */
    fixed?: boolean;
}

const StaticBurst: React.FC<StaticBurstProps> = ({
    intensity = 1,
    radius = 0,
    fixed = false,
}) => {
    const ref = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = 160;
        const H = 120;
        canvas.width = W;
        canvas.height = H;
        const image = ctx.createImageData(W, H);

        const reduced = window.matchMedia?.(
            '(prefers-reduced-motion: reduce)'
        )?.matches;

        let raf = 0;
        const draw = () => {
            const data = image.data;
            for (let i = 0; i < data.length; i += 4) {
                // Weighted towards the extremes: real snow is mostly black and
                // white specks, not an even grey field.
                const v = Math.random() < 0.5 ? (Math.random() * 90) | 0 : 160 + ((Math.random() * 95) | 0);
                data[i] = v;
                data[i + 1] = v;
                data[i + 2] = v;
                data[i + 3] = 255;
            }
            ctx.putImageData(image, 0, 0);
            if (!reduced) raf = window.requestAnimationFrame(draw);
        };
        draw();

        return () => window.cancelAnimationFrame(raf);
    }, []);

    return (
        <canvas
            ref={ref}
            aria-hidden="true"
            style={{
                position: fixed ? 'fixed' : 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: Math.max(0, Math.min(1, intensity)),
                pointerEvents: 'none',
                borderRadius: radius,
                zIndex: 20,
            }}
        />
    );
};

export default StaticBurst;
