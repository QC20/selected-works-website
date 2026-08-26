import React, { useCallback, useEffect, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { playClick } from '../os/sounds';

/**
 * Hidden Dimension — a single-image random-dot stereogram generator.
 * ---------------------------------------------------------------------
 * The genre that was everywhere in the mid-90s — posters, cereal boxes, the
 * backs of magazines — a field of what looks like pure static that resolves
 * into a 3D shape once your eyes decouple focus from convergence. This is a
 * real generator, not a picture of one: every image is computed on the fly
 * from an actual depth map using the constraint-satisfaction algorithm
 * published by Thimbleby, Inglis and Witten ("Displaying 3D Images:
 * Algorithms for Single Image Random Dot Stereograms", IEEE Computer, 1994).
 * The idea is public domain applied mathematics, the same as any sorting
 * algorithm; the implementation below is written from that description.
 *
 * How the algorithm actually works, briefly: for each row, a pixel at column
 * `x` and one at `x + separation(x)` are forced to always share a colour,
 * where `separation` shrinks for "nearer" points on the depth map. Do that
 * for every row with fresh random noise as the base colour, and the shared
 * pairs are exactly `separation` pixels apart everywhere *except* where depth
 * changes — which is precisely the offset your brain needs between your two
 * eyes to read a point as nearer or farther once you defocus.
 *
 * Depth maps are computed procedurally (a sphere, a heart, a stepped
 * pyramid, a wave) rather than loaded from images, so the whole app has no
 * external assets at all.
 */

type Preset = 'sphere' | 'heart' | 'steps' | 'wave';

const PRESETS: { id: Preset; label: string }[] = [
    { id: 'sphere', label: 'Sphere' },
    { id: 'heart', label: 'Heart' },
    { id: 'steps', label: 'Ziggurat' },
    { id: 'wave', label: 'Wave Field' },
];

const WIDTH = 560;
const HEIGHT = 380;
/** Base separation, in pixels, for the background plane. Also sets how wide
 *  the repeating pattern reads — too small and the eye can't lock onto it. */
const EYE_SEPARATION = 74;
/** How much separation shrinks for the nearest points. 0 = flat, 1 = extreme. */
const DEPTH_STRENGTH = 0.34;

/** Depth at (x, y), normalised to image space [-1, 1] on both axes. 0 is the
 *  background plane; 1 is as near as this generator goes. */
function depthAt(preset: Preset, u: number, v: number): number {
    switch (preset) {
        case 'sphere': {
            const d = Math.sqrt(u * u + v * v);
            const r = 0.62;
            if (d > r) return 0;
            // A real hemisphere profile, not just a linear cone — this is
            // what makes it read as a ball rather than a cardboard cutout.
            return Math.sqrt(Math.max(0, 1 - (d / r) * (d / r)));
        }
        case 'heart': {
            // The standard implicit heart curve: (u^2+v^2-1)^3 - u^2 v^3 <= 0
            // defines the interior. Flipping v because image-space y grows
            // downward while the curve is defined with y growing upward.
            const x = u * 1.15;
            const y = -v * 1.15 + 0.35;
            const val =
                Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
            if (val > 0) return 0;
            // Depth rises toward the heart's own centre of mass.
            const cy = 0.25;
            const dist = Math.sqrt(x * x + (y - cy) * (y - cy));
            return Math.max(0, 1 - dist * 0.9);
        }
        case 'steps': {
            const d = Math.sqrt(u * u + v * v);
            const rings = 5;
            const ring = Math.floor((1 - Math.min(d, 1)) * rings);
            return Math.max(0, ring / rings);
        }
        case 'wave': {
            const w = Math.sin(u * 7) * Math.cos(v * 7);
            return (w + 1) / 2;
        }
    }
}

/**
 * The Thimbleby/Inglis/Witten constraint algorithm. Returns an ImageData
 * ready to blit — grayscale noise, the traditional look, rather than colour,
 * since colour makes the underlying repeat easier to spot and harder to fuse.
 */
function renderStereogram(preset: Preset): ImageData {
    const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
    const same = new Int32Array(WIDTH);
    const rowGray = new Uint8ClampedArray(WIDTH);

    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) same[x] = x;

        const v = (y / HEIGHT) * 2 - 1;
        for (let x = 0; x < WIDTH; x++) {
            const u = (x / WIDTH) * 2 - 1;
            const z = depthAt(preset, u, v); // 0 far .. 1 near
            const sep = Math.round(
                EYE_SEPARATION * (1 - DEPTH_STRENGTH * z)
            );
            const left = x - (sep >> 1);
            const right = left + sep;
            if (left >= 0 && right < WIDTH) {
                // Union-find with the link written to the already-resolved
                // root, which is what lets colour resolution below run in a
                // single left-to-right pass with no re-walking.
                let root = left;
                while (same[root] !== root) root = same[root];
                same[right] = root;
            }
        }

        for (let x = 0; x < WIDTH; x++) {
            rowGray[x] =
                same[x] === x
                    ? Math.floor(Math.random() * 256)
                    : rowGray[same[x]];
        }

        const rowStart = y * WIDTH * 4;
        for (let x = 0; x < WIDTH; x++) {
            const g = rowGray[x];
            const i = rowStart + x * 4;
            data[i] = g;
            data[i + 1] = g;
            data[i + 2] = g;
            data[i + 3] = 255;
        }
    }

    return new ImageData(data, WIDTH, HEIGHT);
}

export interface StereogramProps extends WindowAppProps {}

const Stereogram: React.FC<StereogramProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [preset, setPreset] = useState<Preset>('sphere');
    const [mirrored, setMirrored] = useState(false);
    const [busy, setBusy] = useState(false);

    const draw = useCallback((which: Preset) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        setBusy(true);
        // One frame of "generating" text before the (synchronous, but not
        // instant) computation — a full row-by-row pass over 560x380 pixels
        // is a few tens of milliseconds, enough to want the busy state.
        window.setTimeout(() => {
            const image = renderStereogram(which);
            ctx.putImageData(image, 0, 0);
            setBusy(false);
        }, 30);
    }, []);

    useEffect(() => {
        draw(preset);
    }, [preset, draw]);

    return (
        <Window
            top={70}
            left={160}
            width={620}
            height={640}
            windowTitle="Hidden Dimension"
            windowBarIcon="stereogramIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText="Single-image random-dot stereogram"
        >
            <div style={styles.root}>
                <div style={styles.toolbar}>
                    {PRESETS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            style={{
                                ...styles.presetButton,
                                ...(preset === p.id
                                    ? styles.presetButtonActive
                                    : null),
                            }}
                            onClick={() => {
                                playClick();
                                setPreset(p.id);
                            }}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        style={styles.regenButton}
                        onClick={() => {
                            playClick();
                            draw(preset);
                        }}
                        title="New random noise, same shape"
                    >
                        Regenerate
                    </button>
                </div>

                <div style={styles.canvasFrame}>
                    <canvas
                        ref={canvasRef}
                        width={WIDTH}
                        height={HEIGHT}
                        style={{
                            ...styles.canvas,
                            transform: mirrored ? 'scaleX(-1)' : undefined,
                            opacity: busy ? 0.4 : 1,
                        }}
                    />
                    {busy && <span style={styles.busyLabel}>rendering…</span>}
                </div>

                <fieldset style={styles.instructions}>
                    <legend style={styles.legend}>How to see it</legend>
                    <p style={styles.line}>
                        Hold the screen at arm's length. Relax your focus as
                        if looking <em>through</em> it at something far away —
                        don't try to focus on the dots themselves. A shape
                        should lift out of the noise after a few seconds.
                    </p>
                    <p style={styles.line}>
                        Seeing it inverted (a hole instead of a bump)? Try{' '}
                        <button
                            type="button"
                            style={styles.inlineButton}
                            onClick={() => {
                                playClick();
                                setMirrored((m) => !m);
                            }}
                        >
                            mirroring the image
                        </button>{' '}
                        — some people find the effect easier the other way
                        round.
                    </p>
                </fieldset>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    root: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: Colors.lightGray,
        padding: 10,
        gap: 8,
    },
    toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    presetButton: {
        padding: '5px 10px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
    presetButtonActive: {
        borderColor: Colors.darkGray,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: '#b0b0b0',
    },
    regenButton: {
        marginLeft: 'auto',
        padding: '5px 10px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
    canvasFrame: {
        position: 'relative',
        alignSelf: 'center',
        border: `2px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    canvas: { display: 'block', imageRendering: 'pixelated' },
    busyLabel: {
        position: 'absolute',
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: '#ccc',
    },
    instructions: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        margin: 0,
        padding: '4px 10px 10px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    legend: { fontFamily: 'MSSerif', fontSize: 11, color: Colors.black },
    line: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        lineHeight: 1.5,
        color: Colors.black,
        margin: 0,
    },
    inlineButton: {
        padding: '0 4px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: '#1a1a8c',
        background: 'transparent',
        border: 'none',
        textDecoration: 'underline',
    },
};

export default Stereogram;
