/**
 * Faces, drawn rather than stamped.
 * ----------------------------------
 * Below about 140% a face is a handful of hand-placed pixels (`decorateFace`
 * in `species.ts`): at that size an eye is two pixels, and the only choice
 * is which two. Above it there is room for an actual eye — a lid, an iris, a
 * pupil that narrows and widens, a catchlight — and a stamp scaled up would
 * just be the same two decisions drawn larger.
 *
 * So this is the same face described as shapes. Everything is measured in
 * rig units and multiplied out, which is what lets one description serve
 * every size from 140% to 400%, and everything is still snapped to whole
 * pixels and clipped to the head's own pixels, so a hat brim or a raised paw
 * covers it the way it covers the stamped one.
 *
 * The eye is where nearly all of an animal's expression lives, and at this
 * size it has four moving parts:
 *
 *   the upper lid   comes down for a blink, sleep, and the half-lidded look;
 *   the lower lid   rises when the animal is content — the squint a cat
 *                   gives you, which is the cheek pushing up, not the lid
 *                   coming down, and reads completely differently;
 *   the pupil       a cat's goes from a slit to a full moon when something
 *                   has its attention, a dog's just follows what it watches;
 *   the catchlight  one pixel of the light source. It is always toward the
 *                   upper left, whichever way the animal faces, and an eye
 *                   without it looks like a button.
 */

import { Frame, RGBA, channel, hex, over, rgba } from './raster';
import { Anchors, QPose, clamp, lerp } from './quadruped';

export interface HDFace {
    eye: {
        /** Half-width and half-height, rig units. */
        rx: number;
        ry: number;
        iris: RGBA;
        /** The iris under the shadow of the lid. */
        irisDark: RGBA;
        pupil: RGBA;
        /** The dark skin round the eye. */
        rim: RGBA;
        glint: RGBA;
        /** A vertical slit that opens up, rather than a round pupil. */
        slit?: boolean;
        /** Pupil radius as a share of the eye's. */
        pupil0: number;
    };
    nose: {
        rx: number;
        ry: number;
        colour: RGBA;
        light: RGBA;
        /** How far back from the very tip of the snout its centre sits, and
         *  how far above the snout's centre line, rig units. */
        back: number;
        up: number;
    };
    /** The line of the mouth: its colour, how far back it runs and how far
     *  below the nose it starts, rig units. */
    lip?: { colour: RGBA; len: number; drop: number; smile: number };
    whiskers?: { colour: RGBA; len: number };
}

export const HD_FACES: Record<'modem' | 'static' | 'glitch', HDFace> = {
    modem: {
        eye: {
            rx: 1.0,
            ry: 0.74,
            iris: hex('#8f5a2c'),
            irisDark: hex('#57331a'),
            pupil: hex('#0d0908'),
            rim: hex('#0b0b10'),
            glint: hex('#fff8ec'),
            pupil0: 0.62,
        },
        nose: { rx: 1.25, ry: 1.0, colour: hex('#0d0e12'), light: hex('#4b5266'), back: 0.7, up: 0.35 },
        lip: { colour: hex('#7b746f'), len: 3.6, drop: 1.9, smile: 0.5 },
    },
    static: {
        eye: {
            rx: 1.08,
            ry: 0.96,
            iris: hex('#a9b848'),
            irisDark: hex('#6c7d2c'),
            pupil: hex('#0c0e0d'),
            rim: hex('#1b1d23'),
            glint: hex('#f6ffe0'),
            slit: true,
            pupil0: 0.3,
        },
        nose: { rx: 0.75, ry: 0.6, colour: hex('#b88389'), light: hex('#dcaeb2'), back: 0.35, up: 0.3 },
        lip: { colour: hex('#3b3e47'), len: 1.4, drop: 1.2, smile: 0.3 },
        whiskers: { colour: rgba(236, 238, 244, 150), len: 3.6 },
    },
    glitch: {
        eye: {
            rx: 0.72,
            ry: 0.72,
            iris: hex('#0a0a10'),
            irisDark: hex('#07070b'),
            pupil: hex('#050508'),
            rim: hex('#3d4258'),
            glint: hex('#5ff2ff'),
            pupil0: 0.8,
        },
        nose: { rx: 0.62, ry: 0.5, colour: hex('#3b2b33'), light: hex('#7a6470'), back: 0.3, up: 0.2 },
        lip: { colour: hex('#8a90a8'), len: 1.5, drop: 1.0, smile: 0.2 },
        whiskers: { colour: rgba(214, 219, 236, 140), len: 2.6 },
    },
};

/** Expression, beyond what the pose already carries. */
export interface Mood {
    /** Eyes wide. */
    alarm: boolean;
    /** 0..1: how wide a cat's pupils are. Excitement, darkness, the hunt. */
    dilate: number;
}

export function decorateFaceHD(
    f: Frame,
    face: HDFace,
    a: Anchors,
    pose: QPose,
    facing: number,
    headLayers: number[],
    S: number,
    mood: Mood
): void {
    const { w, h, owner, px } = f;
    const isHead = (o: number) => o >= 0 && headLayers.includes(o);
    /** A pixel the face may draw on: the head's own, or the outline hard up
     *  against it — which is what lets a nose be dark right to its edge. */
    const mine = (x: number, y: number, edge = false): boolean => {
        if (x < 0 || y < 0 || x >= w || y >= h) return false;
        const p = y * w + x;
        if (isHead(owner[p])) return true;
        if (!edge || owner[p] >= 0 || px[p] >>> 24 === 0) return false;
        return (
            (x > 0 && isHead(owner[p - 1])) ||
            (x < w - 1 && isHead(owner[p + 1])) ||
            (y > 0 && isHead(owner[p - w])) ||
            (y < h - 1 && isHead(owner[p + w]))
        );
    };
    const put = (x: number, y: number, c: RGBA, edge = false): void => {
        if (!mine(x, y, edge)) return;
        const p = y * w + x;
        px[p] = channel.a(c) === 255 ? c : over(px[p], c);
    };

    const front = a.yaw > 0.55;
    const flip = facing < 0;

    /* --- which way up the head is -----------------------------------------
     * The animal climbs walls, hangs by its scruff and rolls onto its back,
     * and a face drawn as if the head were always upright ends up with its
     * eyelids on its chin. `headAngle` is how far the head is turned
     * clockwise on screen. Everything soft — the nose, the mouth, the
     * whiskers — follows it exactly. The eyes follow it in quarter turns:
     * an eye is five pixels wide, and five pixels turned by eleven degrees
     * are just five different pixels every frame.
     */
    const th = a.headAngle;
    const upX = Math.sin(th);
    const upY = -Math.cos(th);
    const q = ((Math.round(th / (Math.PI / 2)) % 4) + 4) % 4;
    /** Screen offset -> the eye's own axes (x along the lids, y down the face). */
    const toEye = (dx: number, dy: number): [number, number] =>
        q === 0 ? [dx, dy] : q === 1 ? [dy, -dx] : q === 2 ? [-dx, -dy] : [-dy, dx];
    const fromEye = (lx: number, ly: number): [number, number] =>
        q === 0 ? [lx, ly] : q === 1 ? [-ly, lx] : q === 2 ? [-lx, -ly] : [ly, -lx];

    /* --- eyes ------------------------------------------------------------ */
    const E = face.eye;
    const open = clamp(pose.eye, 0, 1);
    const happy = clamp(pose.happy, 0, 1);
    const wide = mood.alarm ? 1.14 : 1;
    for (const e of a.eyes) {
        // The far eye is seen edge-on until the head has come well round.
        const narrow = e.near ? (front ? 1 : 0.9) : clamp((a.yaw - 0.2) / 0.6, 0.4, 1);
        const wpx = Math.max(2, Math.round(E.rx * S * narrow * wide * 2));
        const hpx = Math.max(2, Math.round(E.ry * S * wide * 2));
        const hx = wpx / 2;
        const hy = hpx / 2;
        // On screen the box is the other way round for a head on its side.
        const bw = q % 2 ? hpx : wpx;
        const bh = q % 2 ? wpx : hpx;
        // Centred on a pixel boundary for an even width and on a pixel for
        // an odd one, so the eye is symmetrical whichever it is.
        const x0 = Math.round(e.x - bw / 2);
        const y0 = Math.round(e.y - bh / 2);
        const cx = x0 + bw / 2;
        const cy = y0 + bh / 2;

        // Which way this eye's pupil drifts: toward what it watches.
        const lookDir = front
            ? clamp(pose.lookX, -1, 1) * (flip ? -1 : 1)
            : (flip ? -1 : 1) * (0.35 + 0.4 * clamp(pose.lookX, -1, 1));
        const plx = lookDir * hx * 0.26 * (q === 2 ? -1 : 1);
        const ply = clamp(-pose.lookY, -1, 1) * hy * 0.2 + hy * 0.06;
        const dil = E.slit ? clamp(mood.alarm ? 1 : mood.dilate, 0, 1) : 0;
        const prx = E.slit ? hx * lerp(E.pupil0, 0.86, dil) : hx * E.pupil0;
        const pry = E.slit ? hy * lerp(0.98, 0.9, dil) : hy * E.pupil0 * (hx / hy);

        if (open < 0.16) {
            // Shut: one line where the lids meet. Bowed down in sleep,
            // arched up when it is shut in pleasure.
            for (let i = 0; i < wpx; i++) {
                const nx = (i + 0.5 - hx) / hx;
                const bow = happy > 0.5 ? -(1 - nx * nx) * 0.42 + 0.2 : (1 - nx * nx) * 0.36 + 0.02;
                const [dx, dy] = fromEye(i + 0.5 - hx, bow * hy);
                put(Math.floor(cx + dx), Math.floor(cy + dy), E.rim);
            }
            continue;
        }

        const m = Math.ceil(Math.max(hx, hy)) + 1;
        const X0 = Math.floor(cx) - m;
        const Y0 = Math.floor(cy) - m;
        for (let y = Y0; y <= Y0 + m * 2; y++) {
            for (let x = X0; x <= X0 + m * 2; x++) {
                const [lx, ly] = toEye(x + 0.5 - cx, y + 0.5 - cy);
                const nx = lx / hx;
                const ny = ly / hy;
                // The lids: the upper comes down with `open`, the lower
                // comes up with `happy`, more in the middle than the corners.
                const up = lerp(1.02, -1.3, open) + (1 - open) * 0.3 * nx * nx;
                const lo = lerp(1.3, 0.02 + 0.5 * nx * nx, happy);
                const inLids = ny >= up && ny <= lo;
                if (nx * nx + ny * ny <= 1 && inLids) {
                    const dx = (lx - plx) / prx;
                    const dy = (ly - ply) / pry;
                    if (dx * dx + dy * dy <= 1) put(x, y, E.pupil);
                    else put(x, y, ny < up + 0.62 || ny < -0.32 ? E.irisDark : E.iris);
                    continue;
                }
                // The rim: one pixel round the opening. Where a lid has
                // come down it follows the lid, not the socket.
                const R2 = (lx / (hx + 1)) ** 2 + (ly / (hy + 1)) ** 2;
                if (R2 > 1) continue;
                const step = 1 / hy;
                if (ny >= up - step * 1.05 && ny <= lo + step * 1.05) {
                    // The lower rim is left to the fur unless the lid is up:
                    // a ring all the way round reads as spectacles.
                    if (ny > lo || ny < up || ny < 0.25 || happy > 0.3) put(x, y, E.rim);
                }
            }
        }

        // The catchlight: toward the light, which is up and to the left of
        // the screen whichever way the animal — or its head — is facing.
        if (open > 0.45 && happy < 0.75) {
            const g = Math.max(1, Math.round(S * 0.42));
            const gx = Math.round(cx - (bw / 2) * 0.42 - g / 2);
            const lidDrop = q === 0 ? (lerp(1.02, -1.3, open) + 1) * hy : 0;
            const gy = Math.round(Math.max(cy - bh / 2 + lidDrop + 0.6, cy - (bh / 2) * 0.55) - g / 2);
            for (let j = 0; j < g; j++) for (let i = 0; i < g; i++) put(gx + i, gy + j, E.glint);
        }
    }

    /* --- nose ------------------------------------------------------------- */
    const N = face.nose;
    // Along the snout, from the tip back toward the skull.
    let ax = a.head[0] - a.nose[0];
    let ay = a.head[1] - a.nose[1];
    const al = Math.hypot(ax, ay) || 1;
    ax /= al;
    ay /= al;
    const nrx = Math.max(1, N.rx * S * (front ? 1.15 : 1));
    const nry = Math.max(1, N.ry * S);
    const ncx = (front ? a.nose[0] : a.nose[0] + ax * N.back * S) + upX * N.up * S;
    const ncy = (front ? a.nose[1] : a.nose[1] + ay * N.back * S) + upY * N.up * S;
    for (let y = Math.floor(ncy - nrx - 1); y <= Math.ceil(ncy + nrx + 1); y++) {
        for (let x = Math.floor(ncx - nrx - 1); x <= Math.ceil(ncx + nrx + 1); x++) {
            const [lx, ly] = toEye(x + 0.5 - ncx, y + 0.5 - ncy);
            const dx = lx / nrx;
            const dy = ly / nry;
            if (dx * dx + dy * dy > 1) continue;
            // Lit from the screen's upper left, not the nose's.
            const sx = (x + 0.5 - ncx) / nrx;
            const sy = (y + 0.5 - ncy) / nrx;
            put(x, y, sx * 0.6 + sy < -0.5 ? N.light : N.colour, true);
        }
    }

    /* --- mouth ------------------------------------------------------------ */
    if (face.lip && a.jaw < 0.12) {
        const lip = face.lip;
        if (!front) {
            // In profile: back from under the nose along the muzzle, with
            // the corner turned up or down a touch.
            const sx = a.nose[0] + ax * (N.back + N.rx * 0.6) * S - upX * lip.drop * S * 0.62;
            const sy = a.nose[1] + ay * (N.back + N.rx * 0.6) * S - upY * lip.drop * S * 0.62;
            const n = Math.max(2, Math.round(lip.len * S));
            for (let i = 0; i < n; i++) {
                const t = i / (n - 1);
                const lift = t > 0.6 ? (t - 0.6) * 2.5 * lip.smile * S * (0.4 + happy * 0.9) : 0;
                const down = lip.drop * S * 0.38 * Math.min(1, t * 3) - lift;
                put(Math.round(sx + ax * i - upX * down - 0.5), Math.round(sy + ay * i - upY * down - 0.5), lip.colour);
            }
        } else {
            // Face on: the split under the nose and the two short curves.
            const rtX = -upY;
            const rtY = upX;
            const drop = Math.max(1, Math.round(lip.drop * S * 0.5));
            const bx = ncx - upX * nry;
            const by = ncy - upY * nry;
            for (let j = 0; j < drop; j++) put(Math.round(bx - upX * j - 0.5), Math.round(by - upY * j - 0.5), lip.colour);
            const span = Math.max(1, Math.round(lip.len * S * 0.4));
            for (let i = 1; i <= span; i++) {
                const d = drop - 1 - (i === span ? 1 : 0);
                for (const side of [-1, 1]) {
                    put(
                        Math.round(bx - upX * d + rtX * side * i - 0.5),
                        Math.round(by - upY * d + rtY * side * i - 0.5),
                        lip.colour
                    );
                }
            }
        }
    }

    /* --- whiskers --------------------------------------------------------- */
    if (face.whiskers) {
        const wk = face.whiskers;
        const len = wk.len * S;
        // Whiskers are not part of the head: they cross whatever is behind
        // them, and stop only for something in front.
        const frontOf = Math.max(...headLayers);
        const stroke = (x0: number, y0: number, x1: number, y1: number) => {
            const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
            for (let i = 0; i <= n; i++) {
                const x = Math.round(x0 + ((x1 - x0) * i) / n);
                const y = Math.round(y0 + ((y1 - y0) * i) / n);
                if (x < 0 || y < 0 || x >= w || y >= h) continue;
                const p = y * w + x;
                if (owner[p] > frontOf) continue;
                // Fading toward the tip, the way a hair thins.
                const fade = 1 - (i / n) * 0.55;
                const c = (wk.colour & 0x00ffffff) | (Math.round(channel.a(wk.colour) * fade) << 24);
                px[p] = over(px[p], c >>> 0);
                if (x < f.dirty.x0) f.dirty.x0 = x;
                if (x > f.dirty.x1) f.dirty.x1 = x;
                if (y < f.dirty.y0) f.dirty.y0 = y;
                if (y > f.dirty.y1) f.dirty.y1 = y;
            }
        };
        // Laid out in the head's own axes — `b` back along the muzzle, `d`
        // down the face — so the fan turns with the head.
        const dnX = -upX;
        const dnY = -upY;
        const from = (b: number, d: number): [number, number] => [
            a.nose[0] + ax * b * S + dnX * d * S,
            a.nose[1] + ay * b * S + dnY * d * S,
        ];
        if (front) {
            const rtX = -upY;
            const rtY = upX;
            const [px0, py0] = [a.nose[0] + dnX * 0.9 * S, a.nose[1] + dnY * 0.9 * S];
            for (const side of [-1, 1]) {
                const bx = px0 + rtX * side * S * 1.3;
                const by = py0 + rtY * side * S * 1.3;
                const fan: [number, number, number][] = [
                    [1, -0.22, 0],
                    [0.95, 0.12, 0.5],
                    [0.8, 0.4, 1],
                ];
                for (const [out, dn, off] of fan) {
                    const sx = bx + dnX * off * S;
                    const sy = by + dnY * off * S;
                    stroke(sx, sy, sx + rtX * side * len * out + dnX * len * dn, sy + rtY * side * len * out + dnY * len * dn);
                }
            }
        } else {
            // Splayed back and a little down from the pad, plus one that
            // comes forward — the fan seen from the side.
            const pad = N.back + 1.5;
            const fan: [number, number, number, number][] = [
                [pad, 0.7, 0.9, -0.34],
                [pad, 1.2, 1, 0.08],
                [pad, 1.7, 0.8, 0.5],
                [N.back + 0.4, 1.1, -0.55, 0.3],
            ];
            for (const [b, d, back, dn] of fan) {
                const [sx, sy] = from(b, d);
                stroke(sx, sy, sx + ax * len * back + dnX * len * dn, sy + ay * len * back + dnY * len * dn);
            }
        }
    }
}
