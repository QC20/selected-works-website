/**
 * The three four-legged animals, as proportions, coats and faces.
 * ----------------------------------------------------------------
 * Everything here is data for `quadruped.ts`. The numbers are rig units —
 * one art pixel at 100% — and were set by drawing each animal standing,
 * sitting and walking and adjusting until the silhouette read at a glance.
 *
 * The brief was "less childish", and the single biggest lever on that is
 * proportion. The old sprites were all head: a 32px face with eyes a fifth
 * of its width, which is the infant schema every mascot is built on. These
 * are adult animals. A collie's skull is about a fifth of its body length,
 * a cat's eyes are three pixels rather than ten, and the ermine is as long
 * and low as the real thing.
 *
 * Palettes are hue-shifted rather than darkened: shadows lean cool and
 * highlights lean warm, which is what stops a five-tone ramp from looking
 * like a grey ramp with a tint over it.
 */

import { Frame, Mark, RGBA, channel, hex, line, plot, ramp, rgba, stamp } from './raster';
import {
    Anchors,
    C,
    E,
    Plan,
    QPose,
    Skeleton,
    Species,
    clamp,
    lerp,
    toRig,
} from './quadruped';

/* -------------------------------------------------------------------------
 * Faces: the hand-placed pixels
 * ---------------------------------------------------------------------- */

export interface Face {
    /** Stamps, drawn facing right; `.` is nothing. */
    eye: {
        open: string[];
        half: string[];
        closed: string[];
        happy: string[];
        wide: string[];
    };
    /** Offset of the stamp's top-left from the eye anchor. */
    eyeAt: [number, number];
    nose: string[];
    noseAt: [number, number];
    ink: Record<string, RGBA>;
    /** The lip line under the nose, and how far back it runs. */
    lip?: { colour: RGBA; len: number };
    whiskers?: RGBA;
}

/**
 * Picks the eye stamp for the moment.
 *
 * Sleep and blinks close it; contentment narrows it into a squint; alarm
 * opens it wide. Five stamps are enough — at two or three pixels across
 * there are not many more states an eye can visibly be in.
 */
function eyeStamp(face: Face, pose: QPose, alarm: boolean): string[] {
    if (pose.eye < 0.2) return face.eye.closed;
    if (pose.happy > 0.5) return face.eye.happy;
    if (pose.eye < 0.6) return face.eye.half;
    if (alarm) return face.eye.wide;
    return face.eye.open;
}

/**
 * Draws eyes, nose and mouth on top of the shaded head.
 *
 * Only onto pixels the head itself owns: sunglasses, a paw raised in front
 * of the face or a hat brim must win, and checking ownership here means no
 * accessory has to know where the eyes are.
 */
export function decorateFace(
    f: Frame,
    face: Face,
    a: Anchors,
    pose: QPose,
    facing: number,
    headLayers: number[],
    alarm = false
): void {
    const flip = facing < 0;
    const mine = (x: number, y: number) => {
        const ix = Math.round(x);
        const iy = Math.round(y);
        if (ix < 0 || iy < 0 || ix >= f.w || iy >= f.h) return false;
        return headLayers.includes(f.owner[iy * f.w + ix]);
    };

    const rows = eyeStamp(face, pose, alarm);
    for (const e of a.eyes) {
        if (!mine(e.x, e.y)) continue;
        // In profile the stamp is drawn facing the way the animal does; face
        // on, the eye on the viewer's left is the mirror of the right one.
        const leftOfFace = a.yaw > 0.5 && (e.x < a.head[0]) !== flip;
        const f2 = a.yaw > 0.5 ? leftOfFace !== flip : flip;
        const ox = Math.round(e.x) + (f2 ? -face.eyeAt[0] : face.eyeAt[0]);
        const oy = Math.round(e.y) + face.eyeAt[1];
        // Pupils follow what the animal is looking at, by one pixel at most.
        const look = Math.round(clamp(pose.lookX, -1, 1) * (rows === face.eye.open ? 1 : 0));
        drawEye(f, ox, oy, rows, face.ink, f2, look * (flip ? -1 : 1));
    }

    // The nose, at the tip of the snout.
    if (mine(a.nose[0], a.nose[1]) || mine(a.nose[0] - facing, a.nose[1])) {
        const nx = Math.round(a.nose[0]) + (flip ? -face.noseAt[0] : face.noseAt[0]);
        const ny = Math.round(a.nose[1]) + face.noseAt[1];
        stamp(f, nx, ny, face.nose, face.ink, flip, true);
    }

    // The lip line, in profile, with the mouth shut.
    if (face.lip && a.yaw < 0.55 && a.jaw < 0.12) {
        const x0 = Math.round(a.nose[0]) - facing * 1;
        const y0 = Math.round(a.nose[1]) + 2;
        const x1 = x0 - facing * face.lip.len;
        line(f, x0, y0, x1, y0 + (face.lip.len > 2 ? 1 : 0), face.lip.colour, true);
    } else if (face.lip && a.yaw >= 0.55 && a.jaw < 0.12) {
        // Face-on: the little split under the nose.
        const x = Math.round(a.nose[0]);
        const y = Math.round(a.nose[1]) + 2;
        plot(f, x, y, face.lip.colour);
        plot(f, x - 1, y + 1, face.lip.colour);
        plot(f, x + 1, y + 1, face.lip.colour);
    }

    if (face.whiskers) {
        const x = Math.round(a.nose[0]) - facing * 2;
        const y = Math.round(a.nose[1]) + 1;
        const w = face.whiskers;
        if (a.yaw < 0.55) {
            line(f, x, y, x + facing * 4, y - 1, w);
            line(f, x, y + 1, x + facing * 4, y + 2, w);
        } else {
            line(f, x - 2, y, x - 6, y - 1, w);
            line(f, x + 2, y, x + 6, y - 1, w);
            line(f, x - 2, y + 1, x - 6, y + 2, w);
            line(f, x + 2, y + 1, x + 6, y + 2, w);
        }
    }
}

function drawEye(
    f: Frame,
    ox: number,
    oy: number,
    rows: string[],
    ink: Record<string, RGBA>,
    flip: boolean,
    look: number
): void {
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
            let ch = rows[r][c];
            if (ch === '.') continue;
            // A look shifts the pupil column, never the outline of the eye.
            if (look !== 0 && (ch === 'P' || ch === 'p')) {
                const nc = c + look;
                if (nc >= 0 && nc < rows[r].length && rows[r][nc] !== '.') {
                    const x = flip ? ox - nc : ox + nc;
                    plot(f, x, oy + r, ink[ch]);
                    ch = 'I';
                }
            }
            const colour = ink[ch];
            if (colour === undefined) continue;
            const x = flip ? ox - c : ox + c;
            if (channel.a(colour) === 0) continue;
            plot(f, x, oy + r, colour);
        }
    }
}

/* -------------------------------------------------------------------------
 * Modem — a border collie
 * ----------------------------------------------------------------------
 * Black and white, the most legible coat a small dog can have: the white
 * blaze, collar, socks and tail tip are what make it a collie and not a
 * black dog, and they read at forty pixels. Semi-erect ears with the tips
 * folded forward. A working dog's build — deep chest, tucked waist, a tail
 * carried low with a hook at the end.
 */

const collieBlack = ramp(
    ['#101118', '#1a1c25', '#272a35', '#3a3f50', '#586077'],
    '#0b0c12'
);
const collieWhite = ramp(
    ['#857f7a', '#aaa49c', '#cfc9bf', '#e8e3d9', '#f9f7f1'],
    '#5f5a56'
);

const collie: Species & { face: Face } = {
    plan: {
        shoulder: [8.2, 17.0],
        hip: [-9.8, 17.2],
        fore: [7.6, 7.4, 2.4],
        hind: [7.8, 8.2, 5.6],
        foreR: [3.0, 1.9, 1.4],
        hindR: [4.2, 2.2, 1.35],
        paw: [2.0, 1.3],
        chest: { dx: -2.6, dy: -0.6, rx: 8.6, ry: 6.0 },
        rump: { dx: 1.2, dy: 0.6, rx: 6.0, ry: 5.0 },
        waist: { r: 4.4, lift: 1.3 },
        neck: { base: [1.0, 3.2], r0: 4.4, r1: 3.1 },
        head: { dx: 7.6, dy: 10.4 },
        skull: { rx: 4.8, ry: 4.0 },
        snout: { len: 5.0, r0: 2.6, r1: 1.6, drop: 1.5 },
        jaw: { r: 1.25 },
        tailRoot: [-5.4, 3.6],
        tail: {
            len: 16,
            r: [1.5, 1.9, 2.3, 2.3, 1.8, 1.0],
            angle: -1.38,
            curl: 0.5,
        },
        blend: 4.2,
        dome: { body: 6.6, head: 4.2, leg: 2.4, tail: 2.2 },
    },
    coat: {
        fur: collieBlack,
        pale: collieWhite,
        mouth: ramp(['#2a1014', '#4a1c22', '#6a2a31', '#7f3a40', '#8f4a50'], '#1a0a0c'),
        tongue: ramp(['#8a3a45', '#b04f5c', '#cf6f78', '#e18f95', '#efb0b3'], '#5c2028'),
        shadowRim: hex('#08090d'),
    },
    head: {
        ear: { w: 1.9, h: 4.4, spread: 1.25, back: 1.0, fold: 1.4 },
    },
    headMarks: (k) => {
        const X = k.X;
        const [hx, hy] = k.head;
        const fc = k.face;
        const sk = k.plan.skull;
        const sn = k.plan.snout;
        // The blaze runs up the centre of the face from the muzzle; in profile
        // that is the front edge of the forehead.
        const browX = hx + fc[0] * sk.rx * 0.55;
        const browY = hy + sk.ry * 0.9;
        const stopX = hx + fc[0] * (sk.rx * 0.85);
        const stopY = hy + fc[1] * sk.rx * 0.6 + 0.4;
        const tipX = k.nose[0];
        const tipY = k.nose[1];
        return [
            {
                ramp: collieWhite,
                parts: [
                    { p: C(X, browX, browY, stopX, stopY, 0.75 + k.pose.yaw * 0.5, 1.1 + k.pose.yaw * 0.4) },
                    {
                        p: C(
                            X,
                            lerp(stopX, tipX, 0.15),
                            lerp(stopY, tipY, 0.15) - 0.5,
                            tipX,
                            tipY,
                            sn.r0 * 1.02,
                            sn.r1 * 1.25
                        ),
                        k: 1.5,
                    },
                    // Chin and the white of the throat.
                    { p: E(X, hx + fc[0] * 1.2, hy - sk.ry * 0.95, sk.rx * 0.62, sk.ry * 0.42) , k: 1.2 },
                ],
            },
        ];
    },
    bodyMarks: (k) => {
        const X = k.X;
        const sp = Math.atan2(k.shoulder[1] - k.hip[1], k.shoulder[0] - k.hip[0]);
        return [
            {
                ramp: collieWhite,
                parts: [
                    // The ruff: a white collar right round the neck...
                    {
                        p: C(
                            X,
                            k.shoulder[0] + 1.2,
                            k.shoulder[1] - 1.5,
                            lerp(k.shoulder[0], k.head[0], 0.55),
                            lerp(k.shoulder[1], k.head[1], 0.55) - 1,
                            3.6,
                            3.0
                        ),
                    },
                    // ...the shirt front down the chest...
                    {
                        p: E(
                            X,
                            k.chest[0] + 5.2,
                            k.chest[1] - 1.5,
                            4.4,
                            5.4,
                            sp + 0.5
                        ),
                        k: 2.5,
                    },
                    // ...and a pale belly line under the ribs.
                    {
                        p: C(
                            X,
                            k.chest[0] + 2,
                            k.chest[1] - k.plan.chest.ry * 0.85,
                            k.chest[0] - 7,
                            k.chest[1] - k.plan.chest.ry * 0.7,
                            1.6,
                            1.0
                        ),
                        k: 1.5,
                    },
                ],
            },
        ];
    },
    legMarks: (k, leg, _near, fore) => {
        const [ax, ay, kx, ky, ex, ey, px, py] = leg;
        const X = k.X;
        void ax;
        void ay;
        // White socks: forelegs from just above the wrist, hind from the hock.
        const from = fore
            ? [lerp(kx, ex, 0.35), lerp(ky, ey, 0.35)]
            : [lerp(kx, ex, 0.75), lerp(ky, ey, 0.75)];
        return [
            {
                ramp: collieWhite,
                parts: [{ p: C(X, from[0], from[1], px + 1, py + 1, 3.2, 3.0) }],
            },
        ];
    },
    tailMarks: (k) => {
        const tip = k.tail[k.tail.length - 1];
        const pre = k.tail[k.tail.length - 2];
        return [
            {
                ramp: collieWhite,
                parts: [
                    {
                        p: C(
                            k.X,
                            lerp(pre[0], tip[0], 0.25),
                            lerp(pre[1], tip[1], 0.25),
                            tip[0],
                            tip[1],
                            3,
                            2.4
                        ),
                    },
                ],
            },
        ];
    },
    face: {
        eye: {
            open: ['hP', 'PI'],
            half: ['PP'],
            closed: ['..', 'LL'],
            happy: ['.L.', 'L.L'],
            wide: ['hP', 'PP'],
        },
        eyeAt: [0, -1],
        nose: ['NN', 'Nn'],
        noseAt: [-1, -1],
        ink: {
            h: hex('#f2ece0'),
            P: hex('#120b08'),
            p: hex('#120b08'),
            I: hex('#6a3d22'),
            L: hex('#5b6276'),
            N: hex('#0d0e12'),
            n: hex('#3a3f50'),
        },
        lip: { colour: hex('#8f8a84'), len: 3 },
    },
};

/* -------------------------------------------------------------------------
 * Static — a grey tabby
 * ----------------------------------------------------------------------
 * The grey of a dead channel, with the stripes faint enough to read as a
 * texture rather than a pattern. Long-bodied, long-tailed, with the small
 * round skull and short face that make a cat a cat at any size, and eyes
 * the colour of the phosphor on the Television window.
 */

const tabbyGrey = ramp(
    ['#2c2f38', '#41454f', '#5b606b', '#7c818c', '#a2a7b1'],
    '#22242b'
);
const tabbyPale = ramp(
    ['#6a6b73', '#8b8c94', '#adaeb4', '#cbccd0', '#e6e6e9'],
    '#4d4e55'
);
const tabbyNose = hex('#b88389');

/** Stripes across the back, read in rig space so they follow the body. */
function tabbyStripes(k: Skeleton): Mark[] {
    const X = k.X;
    const hx = k.hip[0];
    const hy = k.hip[1];
    const sx = k.shoulder[0];
    const sy = k.shoulder[1];
    const len = Math.max(1, Math.hypot(sx - hx, sy - hy));
    const ux = (sx - hx) / len;
    const uy = (sy - hy) / len;
    const chestBottom = k.plan.chest.ry * 0.75;
    return [
        {
            // Mackerel stripes on the flank, thinning toward the belly.
            shift: -1,
            fn: (bx, by) => {
                const [x, y] = toRig(X, bx, by);
                const along = (x - hx) * ux + (y - hy) * uy;
                const up = -(x - hx) * uy + (y - hy) * ux;
                if (up < -chestBottom * 0.4) return false;
                const band = Math.sin(along * 0.92 + up * 0.25);
                return band > (up > 1 ? 0.38 : 0.62);
            },
        },
        {
            // A dark line along the spine.
            shift: -1,
            fn: (bx, by) => {
                const [x, y] = toRig(X, bx, by);
                const up = -(x - hx) * uy + (y - hy) * ux;
                return up > 3.6;
            },
        },
        {
            // The pale underside.
            ramp: tabbyPale,
            fn: (bx, by) => {
                const [x, y] = toRig(X, bx, by);
                const up = -(x - hx) * uy + (y - hy) * ux;
                const along = (x - hx) * ux + (y - hy) * uy;
                return up < -chestBottom * 0.9 && along > len * 0.35;
            },
        },
    ];
}

const tabby: Species & { face: Face } = {
    plan: {
        shoulder: [7.2, 11.6],
        hip: [-8.4, 12.4],
        fore: [5.6, 5.4, 1.8],
        hind: [6.0, 6.4, 4.4],
        foreR: [2.2, 1.3, 1.0],
        hindR: [3.3, 1.5, 1.0],
        paw: [1.5, 1.05],
        chest: { dx: -2.4, dy: 0.2, rx: 7.0, ry: 4.4 },
        rump: { dx: 0.6, dy: 0.8, rx: 5.6, ry: 4.4 },
        waist: { r: 3.7, lift: 0.9 },
        neck: { base: [1.2, 3.0], r0: 3.2, r1: 2.6 },
        head: { dx: 6.6, dy: 5.0 },
        skull: { rx: 4.1, ry: 3.7 },
        snout: { len: 1.4, r0: 2.2, r1: 1.7, drop: 1.4 },
        jaw: { r: 0.95 },
        tailRoot: [-5.0, 3.0],
        tail: {
            len: 18,
            r: [1.45, 1.3, 1.25, 1.2, 1.2, 1.15, 1.15],
            angle: -0.75,
            curl: 0.55,
        },
        blend: 3.6,
        dome: { body: 5.0, head: 3.8, leg: 1.8, tail: 1.4 },
    },
    coat: {
        fur: tabbyGrey,
        pale: tabbyPale,
        mouth: ramp(['#2a1418', '#46202a', '#653039', '#7a4049', '#8a5059'], '#1a0a0c'),
        tongue: ramp(['#8a4651', '#b25f6c', '#cc7f8a', '#de9ea6', '#ecbcc1'], '#5c2028'),
        shadowRim: hex('#14151a'),
    },
    head: {
        ear: { w: 1.9, h: 4.2, spread: 1.05, back: 0.4, fold: 0 },
        cheek: 0.78,
    },
    bodyMarks: tabbyStripes,
    headMarks: (k) => {
        const X = k.X;
        const [hx, hy] = k.head;
        const fc = k.face;
        const sk = k.plan.skull;
        const sn = k.plan.snout;
        return [
            {
                // Pale muzzle and chin.
                ramp: tabbyPale,
                parts: [
                    {
                        p: E(
                            X,
                            lerp(hx, k.nose[0], 0.6),
                            k.nose[1] - 0.6,
                            sn.r0 * 1.15 + sk.rx * 0.18 * (1 - k.pose.yaw),
                            sn.r0 * 0.95
                        ),
                    },
                    { p: E(X, hx + fc[0] * 1.0, hy - sk.ry * 0.95, sk.rx * 0.55, 1.4), k: 1 },
                ],
            },
            {
                // Forehead stripes: the "M".
                shift: -1,
                fn: (bx, by) => {
                    const [x, y] = toRig(X, bx, by);
                    const dx = x - hx - fc[0] * sk.rx * 0.15;
                    const dy = y - hy;
                    if (dy < sk.ry * 0.45 || dy > sk.ry * 1.1) return false;
                    return Math.abs(Math.sin(dx * 1.35)) > 0.82;
                },
            },
            {
                // Inner ear, a dusty pink.
                ramp: ramp(['#5a4549', '#76585d', '#94717a', '#ab8890', '#c4a2a8'], '#3e2f32'),
                fn: (bx, by) => {
                    const [x, y] = toRig(X, bx, by);
                    const dy = y - hy;
                    const dx = x - hx;
                    return dy > sk.ry * 1.05 && Math.abs(dx - fc[0] * 0.2) < 1.0;
                },
            },
        ];
    },
    legMarks: (k, leg, _near, fore) => {
        const [, , kx, ky, ex, ey, px, py] = leg;
        const X = k.X;
        // Faint bracelets, and pale toes.
        const marks: Mark[] = [
            {
                shift: -1,
                fn: (bx, by) => {
                    const [x, y] = toRig(X, bx, by);
                    const t = (y - py) / Math.max(1, ky - py);
                    void x;
                    return t > 0.25 && t < 1.2 && Math.sin(t * 9.5) > 0.7;
                },
            },
            {
                ramp: tabbyPale,
                parts: [{ p: C(X, lerp(ex, px, 0.5), lerp(ey, py, 0.5) + 0.5, px + 1, py + 0.8, 1.6, 1.8) }],
            },
        ];
        void kx;
        void fore;
        return marks;
    },
    tailMarks: (k) => {
        const X = k.X;
        const pts = k.tail;
        const total = pts.length - 1;
        return [
            {
                shift: -1,
                fn: (bx, by) => {
                    const [x, y] = toRig(X, bx, by);
                    // Distance along the tail chain, roughly: index of the
                    // nearest joint plus a fraction.
                    let best = 0;
                    let bd = Infinity;
                    for (let i = 0; i < pts.length; i++) {
                        const d = Math.hypot(x - pts[i][0], y - pts[i][1]);
                        if (d < bd) {
                            bd = d;
                            best = i;
                        }
                    }
                    const t = best / total;
                    return t > 0.85 || Math.sin(t * 22) > 0.55;
                },
            },
        ];
    },
    face: {
        eye: {
            open: ['gG.', 'GPh', '.g.'],
            half: ['ggg', 'GPG'],
            closed: ['...', 'LLL'],
            happy: ['.L.', 'L.L'],
            wide: ['gGg', 'GPG', 'hgg'],
        },
        eyeAt: [-1, -1],
        nose: ['N', 'n'],
        noseAt: [0, -1],
        ink: {
            g: hex('#6d8a2a'),
            G: hex('#a9c24a'),
            P: hex('#0f1012'),
            p: hex('#0f1012'),
            I: hex('#a9c24a'),
            h: hex('#eef5d2'),
            L: hex('#23252c'),
            N: tabbyNose,
            n: hex('#7e5a5f'),
        },
        lip: { colour: hex('#3b3e47'), len: 1 },
    },
};

/* -------------------------------------------------------------------------
 * Glitch — an ermine, corrupted
 * ----------------------------------------------------------------------
 * A stoat in its white winter coat, with the black tail tip every ermine
 * has. What makes it Glitch is not the animal but the rendering: its
 * outline carries a cyan and magenta fringe, as if its colour channels are
 * a pixel out of register, and every so often a band of it slips sideways
 * for a frame. See `glitchPass`. The slime it replaces was a joke about
 * corrupted data; this is what corrupted data actually looks like.
 */

const ermineWhite = ramp(
    ['#717790', '#9aa0b6', '#c3c8d6', '#e1e4ed', '#f6f7fb'],
    '#535870'
);
const ermineBlack = ramp(
    ['#0b0b10', '#15161d', '#22232c', '#33353f', '#4a4c58'],
    '#06060a'
);

const ermine: Species & { face: Face } = {
    plan: {
        shoulder: [8.4, 6.6],
        hip: [-9.0, 7.0],
        fore: [3.4, 3.2, 1.2],
        hind: [4.0, 3.8, 2.4],
        foreR: [2.0, 1.25, 0.9],
        hindR: [2.8, 1.4, 0.9],
        paw: [1.35, 0.9],
        chest: { dx: -2.4, dy: 1.0, rx: 6.6, ry: 3.6 },
        rump: { dx: 0.6, dy: 1.2, rx: 5.4, ry: 3.8 },
        waist: { r: 3.1, lift: 1.4 },
        neck: { base: [1.5, 2.0], r0: 2.9, r1: 2.4 },
        head: { dx: 7.0, dy: 4.4 },
        skull: { rx: 3.4, ry: 2.8 },
        snout: { len: 2.6, r0: 1.9, r1: 1.05, drop: 0.7 },
        jaw: { r: 0.8 },
        tailRoot: [-4.6, 2.6],
        tail: { len: 12, r: [1.3, 1.35, 1.55, 1.8, 1.55], angle: 0.15, curl: -0.1 },
        blend: 3.0,
        dome: { body: 4.0, head: 3.0, leg: 1.6, tail: 1.6 },
    },
    coat: {
        fur: ermineWhite,
        mouth: ramp(['#2a1418', '#46202a', '#653039', '#7a4049', '#8a5059'], '#1a0a0c'),
        tongue: ramp(['#8a4651', '#b25f6c', '#cc7f8a', '#de9ea6', '#ecbcc1'], '#5c2028'),
        shadowRim: hex('#1d2030'),
    },
    head: {
        ear: { w: 1.45, h: 1.7, spread: 1.35, back: 0.9, fold: 0 },
        roundEars: true,
    },
    tailMarks: (k) => {
        const tip = k.tail[k.tail.length - 1];
        const pre = k.tail[k.tail.length - 3];
        return [
            {
                ramp: ermineBlack,
                parts: [{ p: C(k.X, lerp(pre[0], tip[0], 0.35), lerp(pre[1], tip[1], 0.35), tip[0] + 1, tip[1], 2.4, 2.4) }],
            },
        ];
    },
    face: {
        eye: {
            open: ['PP', 'Pc'],
            half: ['PP'],
            closed: ['LL'],
            happy: ['.L.', 'L.L'],
            wide: ['Pc', 'PP'],
        },
        eyeAt: [0, -1],
        nose: ['N'],
        noseAt: [0, 0],
        ink: {
            P: hex('#07070b'),
            p: hex('#07070b'),
            I: hex('#07070b'),
            c: hex('#5ff2ff'),
            L: hex('#535870'),
            N: hex('#3b2b33'),
        },
        lip: { colour: hex('#9aa0b6'), len: 1 },
    },
};

export const QUADRUPEDS = { modem: collie, static: tabby, glitch: ermine };
export type QuadrupedId = keyof typeof QUADRUPEDS;

/* -------------------------------------------------------------------------
 * The glitch pass
 * ----------------------------------------------------------------------
 * Run on the finished frame. Two effects, one constant and one rare.
 *
 *   Misregistration, always on. A cyan pixel just outside the silhouette on
 *   the left, magenta on the right, at low alpha. Constant, quiet, and the
 *   thing that makes it read as *made of* data rather than as a white stoat.
 *
 *   Tearing, occasionally. A band of rows slides a few pixels sideways for a
 *   frame or two, the way a corrupt scanline does. Seeded from a slot of
 *   time rather than `Math.random`, so the same moment always tears the same
 *   way and a frame drawn twice does not flicker between two answers.
 */

const CYAN = [62, 232, 255];
const MAGENTA = [255, 62, 200];

function hash(n: number): number {
    let x = (n | 0) ^ 0x9e3779b9;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function glitchPass(f: Frame, time: number, intensity: number): void {
    const { w, h, px } = f;
    const a = (c: RGBA) => channel.a(c);

    // Tearing first, so the fringe follows the torn edge.
    const slot = Math.floor(time / 90);
    const roll = hash(slot);
    const tearing = intensity > 0.9 ? roll < 0.55 : roll < 0.035 + intensity * 0.12;
    if (tearing) {
        const bands = 1 + Math.floor(hash(slot * 7 + 1) * (1 + intensity * 2));
        const { y0, y1 } = f.bbox;
        for (let b = 0; b < bands; b++) {
            const start = y0 + Math.floor(hash(slot * 13 + b) * Math.max(1, y1 - y0));
            const rows = 1 + Math.floor(hash(slot * 17 + b) * 3);
            const shift = Math.round((hash(slot * 19 + b) - 0.5) * (4 + intensity * 6));
            if (!shift) continue;
            for (let y = start; y < Math.min(h, start + rows); y++) {
                const row = px.slice(y * w, y * w + w);
                for (let x = 0; x < w; x++) {
                    const sx = x - shift;
                    px[y * w + x] = sx >= 0 && sx < w ? row[sx] : 0;
                }
            }
        }
    }

    // Misregistration, looked for only around the creature itself.
    const fringe = Math.min(1, 0.32 + intensity * 0.6);
    const add: [number, number[]][] = [];
    const bx0 = Math.max(1, f.bbox.x0 - 12);
    const bx1 = Math.min(w - 2, f.bbox.x1 + 12);
    const by0 = Math.max(0, f.bbox.y0 - 1);
    const by1 = Math.min(h - 1, f.bbox.y1 + 1);
    for (let y = by0; y <= by1; y++) {
        for (let x = bx0; x <= bx1; x++) {
            const p = y * w + x;
            if (a(px[p]) !== 0) continue;
            if (a(px[p + 1]) > 200) add.push([p, CYAN]);
            else if (a(px[p - 1]) > 200) add.push([p, MAGENTA]);
        }
    }
    for (const [p, c] of add) {
        px[p] = rgba(c[0], c[1], c[2], Math.round(255 * fringe * 0.55));
    }
}

/**
 * Static's static. Stroke a cat enough and she crackles: a few one-pixel
 * sparks jump off the fur. `charge` is 0..1; nothing at all below a third.
 */
export function sparkPass(f: Frame, time: number, charge: number): void {
    if (charge < 0.33) return;
    const { x0, y0, x1, y1 } = f.bbox;
    const slot = Math.floor(time / 70);
    const count = Math.floor((charge - 0.33) * 9);
    for (let i = 0; i < count; i++) {
        if (hash(slot * 31 + i) > 0.55) continue;
        // Somewhere on the top edge of the silhouette.
        const x = Math.round(lerp(x0 + 2, x1 - 2, hash(slot * 37 + i)));
        let y = y0;
        while (y < y1 && channel.a(f.px[y * f.w + x]) < 200) y++;
        const bright = rgba(214, 236, 255);
        const blue = rgba(120, 180, 255, 210);
        const dir = hash(slot * 41 + i) < 0.5 ? -1 : 1;
        plot(f, x, y - 2, bright);
        plot(f, x + dir, y - 3, blue);
        plot(f, x, y - 4, bright);
        if (charge > 0.7) plot(f, x - dir, y - 5, blue);
    }
}

/** Kept for symmetry with the fish, whose module exports its own plan. */
export type { Plan };
