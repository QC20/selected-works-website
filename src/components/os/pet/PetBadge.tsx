import React, { useEffect, useRef } from 'react';
import { Clip, poseAt } from './animate';
import { QPose } from './quadruped';
import { PetKind, draw, frameFor } from './render';

/**
 * The animal, small and still: for the tray, the chooser's list, anywhere
 * an icon would go.
 * ----------------------------------------------------------------------
 * The 32px icon PNGs work in the places the rest of the system's icons go,
 * but scaled to 18px by nearest neighbour they drop every other pixel and
 * the animal comes apart. Drawing straight from the rig at whatever scale
 * fits the box keeps it whole at any size — the same reason a font is
 * hinted rather than shrunk.
 *
 * Drawn once per size and species, not animated: ambient motion in the
 * system tray is the kind of thing that becomes unbearable by the second
 * visit.
 */

/** A sitting animal, turned a little toward the viewer. */
function badgePose(kind: PetKind, clip: Clip): ReturnType<typeof poseAt> {
    const pose = poseAt(kind, clip, 0, 0);
    if (kind !== 'pixel') {
        const q = pose as QPose;
        q.yaw = kind === 'static' ? 0.8 : kind === 'modem' ? 0.6 : 0.35;
        q.breath = 0;
        q.eye = 1;
    }
    return pose;
}

const cache = new Map<string, ImageData>();

function render(kind: PetKind, size: number, clip: Clip): ImageData | null {
    const key = `${kind}:${size}:${clip}`;
    const hit = cache.get(key);
    if (hit) return hit;
    if (typeof ImageData === 'undefined') return null;
    const pose = badgePose(kind, clip);

    // Measure at 100%, then draw at whatever scale fits the box.
    const probe = frameFor(1);
    draw(probe, { kind, pose, facing: 1, scale: 1, time: 4000, glitch: 0.1 });
    const pw = probe.bbox.x1 - probe.bbox.x0 + 1;
    const ph = probe.bbox.y1 - probe.bbox.y0 + 1;
    const scale = Math.min((size - 1) / pw, (size - 1) / ph) * 0.999;
    const f = frameFor(scale);
    draw(f, { kind, pose, facing: 1, scale, time: 4000, glitch: 0.1 });

    const { x0, y0, x1, y1 } = f.bbox;
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const out = new ImageData(size, size);
    const px = new Uint32Array(out.data.buffer);
    const left = Math.floor((size - bw) / 2);
    // Feet on the bottom row; the fish, which has no feet, in the middle.
    const top = kind === 'pixel' ? Math.floor((size - bh) / 2) : size - bh;
    for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
            const tx = left + x;
            const ty = top + y;
            if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;
            px[ty * size + tx] = f.px[(y0 + y) * f.w + x0 + x];
        }
    }
    cache.set(key, out);
    return out;
}

const PetBadge: React.FC<{
    kind: PetKind;
    size: number;
    clip?: Clip;
    style?: React.CSSProperties;
}> = ({ kind, size, clip = 'sit', style }) => {
    const ref = useRef<HTMLCanvasElement | null>(null);
    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        const image = render(kind, size, kind === 'glitch' && clip === 'sit' ? 'perk' : clip);
        if (ctx && image) {
            ctx.clearRect(0, 0, size, size);
            ctx.putImageData(image, 0, 0);
        }
    }, [kind, size, clip]);
    return (
        <canvas
            ref={ref}
            width={size}
            height={size}
            aria-hidden="true"
            style={{
                width: size,
                height: size,
                imageRendering: 'pixelated',
                display: 'block',
                flexShrink: 0,
                pointerEvents: 'none',
                ...style,
            }}
        />
    );
};

export default PetBadge;
