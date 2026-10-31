/**
 * Pixel — a halfmoon betta.
 * -------------------------
 * The fish used to be a fish *in a bowl*, and the bowl walked. A bowl
 * walking along a taskbar is a cartoon, and so is the bright orange fish
 * peering over its rim.
 *
 * A betta is the fish people actually keep on a desk, and it is a
 * remarkable-looking animal: a small cobalt body and fins larger than the
 * rest of it put together, flowing out behind it like a gown. So the bowl
 * is gone and the desktop is the tank. Pixel swims through the air a little
 * above the taskbar, rests on title bars the way a real betta rests on a
 * leaf near the surface, and drifts down when dropped rather than falling.
 *
 * The fins are translucent — the desktop shows through them — and they are
 * drawn as fans whose edges ripple on their own clock, so the animal is
 * never entirely still even when it is hovering in one place. That is most
 * of what makes a betta a betta.
 */

import {
    Frame,
    Layer,
    Part,
    Prim,
    RGBA,
    hex,
    line,
    ramp,
    stamp,
} from './raster';
import { Anchors, C, E, Pg, Xf, bp, clamp, lerp, makeXf, toRig } from './quadruped';

export interface BettaPose {
    /** Height of the body's centre above the origin. */
    hover: number;
    /** Forward offset of the body from the origin. */
    tx: number;
    /** Pitch, radians counter-clockwise (nose up is positive). */
    rot: number;
    /** 1 upright, -1 upside down; between, partway through a barrel roll. */
    roll: number;
    /** Undulation phase, radians, and how strongly. */
    phase: number;
    amp: number;
    /** A held curve along the body: + bends the tail up. */
    bend: number;
    /** 0.6 folded .. 1.25 flared. */
    flare: number;
    /** Phase of the ripple along the fin edges. */
    wave: number;
    /** Pectoral flutter phase. */
    pec: number;
    /** 0..1. */
    mouth: number;
    /** 0..1, the gill cover lifting. */
    gill: number;
    /** 1 awake; lower reads as resting. */
    eye: number;
    lookX: number;
}

export const BETTA_KEYS = [
    'hover', 'tx', 'rot', 'roll', 'phase', 'amp', 'bend', 'flare', 'wave',
    'pec', 'mouth', 'gill', 'eye', 'lookX',
] as const;

export function bettaRest(): BettaPose {
    return {
        hover: 12,
        tx: 0,
        rot: 0,
        roll: 1,
        phase: 0,
        amp: 0.35,
        bend: 0,
        flare: 1,
        wave: 0,
        pec: 0,
        mouth: 0,
        gill: 0,
        eye: 1,
        lookX: 0,
    };
}

export function blendBetta(a: BettaPose, b: BettaPose, t: number): BettaPose {
    if (t <= 0) return a;
    if (t >= 1) return b;
    const out = { ...a };
    for (const k of BETTA_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
    return out;
}

/* -------------------------------------------------------------------------
 * Colour
 * ---------------------------------------------------------------------- */

const body = ramp(['#0c1340', '#16246c', '#2141a2', '#3a6bd2', '#86c0f6'], '#090e2e');
/**
 * The fins: cobalt at the root, through crimson, to a pale translucent
 * edge — the gradient real halfmoons have, and the reason they look lit
 * from inside.
 */
const finBlue = ramp(['#121a52', '#1e2e80', '#2b48ad', '#4370d0', '#7aa8ec'], '#0e1440', 240);
const finRed = ramp(['#4a0a26', '#781238', '#a91d4c', '#d23a62', '#f2738c'], '#320618', 240);
const finViolet = ramp(['#30104a', '#4d1a6e', '#702a92', '#9a46b6', '#c47ed6'], '#200a32', 240);
const finPale = ramp(['#7a2048', '#a8325e', '#d04f7a', '#ec7f9e', '#ffbccc'], '#561434', 190);

const ink: Record<string, RGBA> = {
    r: hex('#c79f4c'),
    P: hex('#05060a'),
    h: hex('#ffffff'),
    g: hex('#0d1440'),
};

/* -------------------------------------------------------------------------
 * Building
 * ---------------------------------------------------------------------- */

export interface BuiltBetta {
    layers: Layer[];
    anchors: Anchors;
    shadowRim: RGBA;
    X: Xf;
    eye: [number, number];
    gillA: [number, number];
    gillB: [number, number];
}

/** A fan of a fin: root at (cx, cy), from angle a0 to a1, radius r(θ). */
function fan(
    X: Xf,
    cx: number,
    cy: number,
    a0: number,
    a1: number,
    r: (a: number) => number,
    steps: number,
    squeezeX = 1
): Prim {
    const pts: number[] = [cx, cy];
    for (let i = 0; i <= steps; i++) {
        const a = lerp(a0, a1, i / steps);
        const rr = r(a);
        pts.push(cx + Math.cos(a) * rr * squeezeX, cy + Math.sin(a) * rr);
    }
    return Pg(X, pts, 0.3);
}

export function buildBetta(
    pose: BettaPose,
    ox: number,
    oy: number,
    scale: number,
    facing: number,
    time: number
): BuiltBetta {
    // The fish pivots about its own middle, not about the ground under it,
    // so rotation is applied around (0, hover) by offsetting the root.
    const h = pose.hover;
    const c = Math.cos(pose.rot);
    const s = Math.sin(pose.rot);
    const tx = pose.tx - (0 * c - h * s * pose.roll) + 0;
    const ty = h - (0 * s + h * c * pose.roll);
    const X = makeXf(ox, oy, scale, facing, pose.rot, pose.roll, tx, ty);

    // A gentle travelling wave down the body, felt most at the tail.
    const wave = (x: number): number => {
        const along = clamp((9 - x) / 18, 0, 1);
        return (
            Math.sin(pose.phase - along * 3.2) * pose.amp * (0.15 + along * along * 1.6) +
            pose.bend * along * along * 3
        );
    };

    const yb = h;
    const head: [number, number] = [7.4, yb + 0.3 + wave(7.4)];
    const mid: [number, number] = [1.4, yb + wave(1.4)];
    const rear: [number, number] = [-5.2, yb + wave(-5.2)];
    const ped: [number, number] = [-10.2, yb + wave(-10.2)];

    // The tail fin swings toward and away from the viewer as the body
    // undulates, which in profile is a change in its apparent length.
    const fx = 0.8 + 0.2 * Math.cos(pose.phase + 0.6);
    const fl = pose.flare;

    /*
     * The fins are ribbons, not fans: a veiltail's tail falls away behind
     * and below the body like a train, and the dorsal sweeps back over it.
     * Each point is displaced by a wave that travels down the fin and grows
     * toward its free edge, which is what makes them read as cloth moving
     * through water rather than as a shape being wobbled.
     */
    const silk = (pts: number[], rootX: number, amp: number, off: number): number[] => {
        const out: number[] = [];
        for (let i = 0; i < pts.length; i += 2) {
            const x = pts[i];
            const y = pts[i + 1];
            const d = Math.max(0, rootX - x);
            const w = Math.sin(pose.wave * 1.15 - d * 0.42 + off) * amp * Math.min(1, d / 9);
            out.push(x, y + w + wave(x) * 0.6);
        }
        return out;
    };

    const caudalTrail = 16.5 * fl * fx;
    const caudal = Pg(
        X,
        silk(
            [
                ped[0] + 0.6, ped[1] + 1.6,
                ped[0] - caudalTrail * 0.4, ped[1] + 3.0 * fl,
                ped[0] - caudalTrail * 0.8, ped[1] + 1.2 * fl,
                ped[0] - caudalTrail * 1.02, ped[1] - 3.2 * fl,
                ped[0] - caudalTrail * 0.96, ped[1] - 8.4 * fl,
                ped[0] - caudalTrail * 0.72, ped[1] - 11.6 * fl,
                ped[0] - caudalTrail * 0.36, ped[1] - 10.2 * fl,
                ped[0] - caudalTrail * 0.1, ped[1] - 5.0 * fl,
                ped[0] + 0.4, ped[1] - 1.8,
            ],
            ped[0],
            1.4,
            0
        ),
        0.6
    );

    const topY = (x: number) =>
        yb + wave(x) + (x > 3.5 ? 4.3 : lerp(1.8, 4.6, (x + 10.2) / 13.7));
    const botY = (x: number) =>
        yb + wave(x) - (x > 3.5 ? 4.1 : lerp(1.8, 4.3, (x + 10.2) / 13.7));
    const dorsal = Pg(
        X,
        silk(
            [
                2.4, topY(2.4) - 0.8,
                -0.6, topY(-0.6) + 4.2 * fl,
                -5.0, topY(-5.0) + 6.8 * fl,
                -10.4, topY(-10.4) + 6.2 * fl,
                -14.6, ped[1] + 3.8 * fl,
                -10.8, ped[1] + 1.2,
                -5.0, topY(-5.0) - 1.0,
            ],
            2.4,
            1.0,
            0.6
        ),
        0.5
    );
    const anal = Pg(
        X,
        silk(
            [
                3.2, botY(3.2) + 0.8,
                0.4, botY(0.4) - 4.0 * fl,
                -4.4, botY(-4.4) - 7.0 * fl,
                -9.8, botY(-9.8) - 8.2 * fl,
                -13.6, ped[1] - 7.4 * fl,
                -10.8, ped[1] - 1.4,
                -4.8, botY(-4.8) + 1.0,
            ],
            3.2,
            1.2,
            1.3
        ),
        0.5
    );

    // Pelvic fins: two long thin streamers under the throat.
    const pelvic = (dx: number, sw: number): Prim =>
        C(
            X,
            4.4 + dx,
            botY(4.4) + 0.9,
            2.0 + dx - sw,
            botY(4.4) - 6.8 * fl + Math.abs(sw) * 0.4,
            0.8,
            0.35
        );
    const swing = Math.sin(pose.wave * 0.7) * 0.8;

    // The pectoral fin, a small fan that flutters quickly.
    const pecOpen = 0.55 + 0.45 * Math.abs(Math.sin(pose.pec));
    const pectoral = fan(
        X,
        4.8,
        yb + wave(4.8) - 0.9,
        Math.PI * 0.85,
        Math.PI * 1.3,
        () => 3.8,
        6,
        pecOpen
    );

    const bodyParts: Part[] = [
        { p: E(X, head[0], head[1], 4.5, 3.8) },
        { p: E(X, mid[0], mid[1], 7.6, 4.1), k: 2.8 },
        { p: E(X, rear[0], rear[1], 5.2, 2.8), k: 2.8 },
        { p: C(X, rear[0] - 2, rear[1], ped[0], ped[1], 2.1, 1.6), k: 2.4 },
    ];
    if (pose.mouth > 0.1) {
        bodyParts.push({
            p: Pg(X, [12.2, head[1] + 1.5, 10.4, head[1] + 0.4, 12.2, head[1] - 0.2 - pose.mouth]),
            cut: true,
        });
    }

    // Shimmer: a soft band of brighter scales that slides along the body.
    const sweep = ((time / 1400) % 1) * 34 - 14;
    const bodyLayer: Layer = {
        parts: bodyParts,
        ramp: body,
        dome: 4.5,
        contour: false,
        marks: [
            {
                shift: 1,
                fn: (bx, by) => {
                    const [x, y] = toRig(X, bx, by);
                    const d = x - sweep - (y - yb) * 0.6;
                    return d > 0 && d < 1.8 && y > yb - 1.5;
                },
            },
            {
                // Faint scale rows: a diagonal hatch one step down.
                shift: -1,
                fn: (bx, by) => {
                    const [x, y] = toRig(X, bx, by);
                    if (x > 5.2) return false;
                    return ((Math.round(x * 0.9 + y * 0.9) % 3) + 3) % 3 === 0 && y < yb + 2;
                },
            },
        ],
    };

    /** Blue at the root, the fin's own colour through the middle, pale at the edge, with rays. */
    const finMarks = (rx: number, ry: number, reach: number) => [
        {
            ramp: finBlue,
            fn: (bx: number, by: number) => {
                const [x, y] = toRig(X, bx, by);
                return Math.hypot(x - rx, y - ry) < reach * 0.3;
            },
        },
        {
            ramp: finPale,
            fn: (bx: number, by: number) => {
                const [x, y] = toRig(X, bx, by);
                return Math.hypot(x - rx, y - ry) > reach * 0.84;
            },
        },
        {
            shift: -1,
            fn: (bx: number, by: number) => {
                const [x, y] = toRig(X, bx, by);
                const a = Math.atan2(y - ry, x - rx);
                return Math.sin(a * 16) > 0.86 && Math.hypot(x - rx, y - ry) > reach * 0.3;
            },
        },
    ];

    const layers: Layer[] = [
        { parts: [{ p: pelvic(-1.3, -swing) }], ramp: finRed, dome: 0.8, shift: -1, alpha: 0.92 },
        { parts: [{ p: caudal }], ramp: finRed, dome: 3.2, alpha: 0.93, marks: finMarks(ped[0], ped[1], 13 * fl) },
        { parts: [{ p: anal }], ramp: finViolet, dome: 2.4, alpha: 0.93, contour: true, marks: finMarks(0, yb - 3.4, 12 * fl) },
        { parts: [{ p: dorsal }], ramp: finViolet, dome: 2.4, alpha: 0.93, contour: true, marks: finMarks(0, yb + 3.4, 12 * fl) },
        bodyLayer,
        { parts: [{ p: pelvic(0, swing) }], ramp: finRed, dome: 0.8, alpha: 0.95, contour: true },
        { parts: [{ p: pectoral }], ramp: finBlue, dome: 1.2, alpha: 0.6, noOutline: true },
    ];

    const toB = (p: [number, number]) => bp(X, p[0], p[1]);
    const eye = toB([8.6, head[1] + 1.1]);
    const crown = toB([6.2, head[1] + 4.2]);
    const anchors: Anchors = {
        head: toB(head),
        crown,
        headAngle: -pose.rot * facing,
        brow: toB([9.2, head[1] + 1.3]),
        throat: toB([6.0, head[1] - 3.9]),
        mouth: toB([12.0, head[1] + 0.2]),
        nose: toB([12.1, head[1] + 0.6]),
        eyes: [{ x: eye[0], y: eye[1], near: true }],
        scruff: toB([0.6, yb + 4.2]),
        feet: [toB([4, yb - 4])[0], toB([-4, yb - 3])[0]],
        faceX: facing,
        yaw: 0,
        pitch: pose.rot,
        jaw: pose.mouth,
    };

    return {
        layers,
        anchors,
        shadowRim: hex('#070a22'),
        X,
        eye,
        gillA: toB([5.8, head[1] + 2.8]),
        gillB: toB([5.0, head[1] - 2.6 - pose.gill * 0.6]),
    };
}

/** The eye and the gill line, placed by hand like every other face here. */
export function decorateBetta(
    f: Frame,
    b: BuiltBetta,
    pose: BettaPose,
    facing: number
): void {
    const flip = facing < 0;
    const [ex, ey] = b.eye;
    const look = Math.round(clamp(pose.lookX, -1, 1));
    const rows =
        pose.eye > 0.6
            ? look > 0
                ? ['rrr', 'rPP', 'rPh']
                : ['rrr', 'PPr', 'Phr']
            : ['rrr', 'rPP', 'rPP'];
    stamp(f, Math.round(ex) + (flip ? 1 : -1), Math.round(ey) - 1, rows, ink, flip, true);
    const [ax, ay] = b.gillA;
    const [bx, by] = b.gillB;
    line(f, ax, ay, (ax + bx) / 2 - facing * 0.6, (ay + by) / 2, ink.g, true);
    line(f, (ax + bx) / 2 - facing * 0.6, (ay + by) / 2, bx, by, ink.g, true);
}

/** Exported so the wardrobe can find the betta's frame of reference. */
export { makeXf };
