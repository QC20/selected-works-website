import React, { useEffect, useRef } from 'react';
import { CrtSettings } from './crt';

/**
 * The glass in front of everything.
 * ---------------------------------
 * A set of non-interactive overlays that make whatever is behind them look
 * like it is being emitted by a tube rather than a panel: scanlines, an
 * aperture grille, phosphor bloom, corner falloff, and optionally a little
 * moving grain.
 *
 * Every layer is `pointer-events: none` and sits inside a wrapper that does
 * not otherwise touch layout, so this can be dropped around the desktop, a
 * television screen or a single window without changing how any of them
 * behave. That matters more than it sounds: the first version of this used a
 * `filter` on the container, which forced a new containing block and quietly
 * broke every `position: fixed` window on the desktop.
 *
 * The grille and scanline layers are drawn with `repeating-linear-gradient`
 * rather than a tiled PNG so they stay sharp at any zoom and cost nothing to
 * ship. The grain is the only layer that needs a canvas, and it is skipped
 * entirely when `noise` is 0 — which is the case for both desktop presets.
 */

export interface CrtScreenProps {
    settings: CrtSettings;
    /** Rounds the overlays to match a screen that has rounded corners. */
    radius?: number;
    /** Fills its parent rather than sitting in flow. */
    absolute?: boolean;
    children?: React.ReactNode;
}

/**
 * Grain, drawn small and stretched.
 *
 * A full-resolution noise field is far too expensive to redraw every frame, so
 * this renders a 64×64 field and lets the browser scale it up. At the
 * intensities used here the result is indistinguishable from the real thing
 * and costs about a tenth as much.
 */
const Grain: React.FC<{ intensity: number; radius: number }> = ({
    intensity,
    radius,
}) => {
    const ref = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const reduced = window.matchMedia?.(
            '(prefers-reduced-motion: reduce)'
        )?.matches;

        const SIZE = 64;
        canvas.width = SIZE;
        canvas.height = SIZE;
        const image = ctx.createImageData(SIZE, SIZE);

        let raf = 0;
        const draw = () => {
            const data = image.data;
            for (let i = 0; i < data.length; i += 4) {
                const v = (Math.random() * 255) | 0;
                data[i] = v;
                data[i + 1] = v;
                data[i + 2] = v;
                data[i + 3] = 255;
            }
            ctx.putImageData(image, 0, 0);
            // Reduced motion still gets grain, it just stops moving.
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
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: intensity,
                mixBlendMode: 'overlay',
                pointerEvents: 'none',
                borderRadius: radius,
            }}
        />
    );
};

const CrtScreen: React.FC<CrtScreenProps> = ({
    settings,
    radius = 0,
    absolute = false,
    children,
}) => {
    const { scanlines, glow, vignette, noise, mask } = settings;
    const inert = !scanlines && !glow && !vignette && !noise && !mask;

    // Nothing switched on: render the children and get entirely out of the way,
    // rather than stacking five transparent layers over the whole desktop.
    if (inert) return <>{children}</>;

    const layer: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        borderRadius: radius,
    };

    return (
        <div
            style={{
                position: absolute ? 'absolute' : 'relative',
                inset: absolute ? 0 : undefined,
                display: 'flex',
                flexDirection: 'column',
                flex: absolute ? undefined : 1,
                minWidth: 0,
                isolation: 'isolate',
            }}
        >
            {children}

            {/* Horizontal scanlines. 3px period reads as a line rather than a
                moiré at every sensible zoom level. */}
            {scanlines > 0 && (
                <div
                    aria-hidden="true"
                    style={{
                        ...layer,
                        zIndex: 3,
                        background: `repeating-linear-gradient(
                            to bottom,
                            rgba(0,0,0,${scanlines}) 0px,
                            rgba(0,0,0,${scanlines}) 1px,
                            transparent 1px,
                            transparent 3px
                        )`,
                    }}
                />
            )}

            {/* The RGB stripe of an aperture grille, at a 3px period so each
                gun lands on its own subpixel column. */}
            {mask > 0 && (
                <div
                    aria-hidden="true"
                    style={{
                        ...layer,
                        zIndex: 4,
                        mixBlendMode: 'color',
                        opacity: mask,
                        background: `repeating-linear-gradient(
                            to right,
                            rgba(255,0,0,0.5) 0px,
                            rgba(0,255,0,0.5) 1px,
                            rgba(0,0,255,0.5) 2px,
                            rgba(255,0,0,0.5) 3px
                        )`,
                    }}
                />
            )}

            {noise > 0 && <Grain intensity={noise} radius={radius} />}

            {/* Falloff towards the corners, where a real tube loses focus. */}
            {vignette > 0 && (
                <div
                    aria-hidden="true"
                    style={{
                        ...layer,
                        zIndex: 5,
                        background: `radial-gradient(
                            ellipse at center,
                            transparent 55%,
                            rgba(0,0,0,${vignette}) 100%
                        )`,
                    }}
                />
            )}

            {/* Bloom. An inset shadow rather than a blur filter, so it cannot
                create a containing block and strand the windows inside it. */}
            {glow > 0 && (
                <div
                    aria-hidden="true"
                    style={{
                        ...layer,
                        zIndex: 6,
                        boxShadow: `inset 0 0 ${60 * glow}px rgba(180,220,255,${
                            glow * 0.35
                        })`,
                    }}
                />
            )}
        </div>
    );
};

export default CrtScreen;
