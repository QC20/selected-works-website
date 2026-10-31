/**
 * Four legs, a spine, a head and a tail.
 * ---------------------------------------
 * The collie, the tabby and the ermine are the same machine with different
 * proportions, which is how real quadrupeds work too: a cat is a dog with a
 * shorter face and a longer tail, and a stoat is a cat that has been
 * stretched and had its legs cut down. So there is one rig here and three
 * `Plan`s in `species.ts`.
 *
 * Space
 * -----
 * The rig works in its own space: x forward toward the nose, y *up*, origin
 * on the ground under the middle of the body, one unit per art pixel at
 * 100%. A `Xf` carries it into the buffer — rotation for climbing a wall,
 * a mirror for facing left, a vertical flip for rolling onto its back — so
 * none of the anatomy below has to know any of that is happening.
 *
 * Legs
 * ----
 * Feet are placed and the joints are solved, not the other way round. A
 * pose says where each paw is; two-bone IK finds the elbow or the stifle.
 * That is what lets the walk cycle plant a foot and *keep it planted* while
 * the body moves over it: the gait below advances the cycle by distance
 * travelled rather than by time, so a paw in contact with the taskbar moves
 * backward at exactly the speed the creature moves forward. Feet that skate
 * are the most common tell of a cheap walk, and this is the whole fix.
 *
 * The hind leg has the extra joint every dog and cat has and every cartoon
 * leaves out: the hock, the backward-pointing heel halfway down. It is
 * placed from the paw first and the IK solves hip-to-hock above it, which
 * keeps the silhouette's most recognisable angle no matter what the leg is
 * doing.
 *
 * The head
 * --------
 * Projected from a small 3D model rather than drawn in profile: a skull
 * with a face direction, eyes forty degrees either side of it and ears
 * further round. Turn the face toward the viewer and the snout foreshortens,
 * the far eye comes round, and both ears appear — which is what lets the
 * animal look *at you* when the pointer comes near, instead of leaning.
 */

import {
    Frame,
    Layer,
    Mark,
    Part,
    Prim,
    Ramp,
    RGBA,
    cap,
    ell,
    poly,
} from './raster';

/* -------------------------------------------------------------------------
 * The transform from rig space to the buffer
 * ---------------------------------------------------------------------- */

export interface Xf {
    /** Buffer position of the rig origin. */
    ox: number;
    oy: number;
    /** Art pixels per rig unit. */
    s: number;
    /** 1 facing right, -1 facing left. */
    f: number;
    /** cos and sin of the body rotation, counter-clockwise, rig space. */
    c: number;
    sn: number;
    /** -1..1. 1 is upright, -1 belly-up, between is partway through a roll. */
    fy: number;
    /** World offset after rotation, in rig units: x forward, y up. */
    tx: number;
    ty: number;
}

export function makeXf(
    ox: number,
    oy: number,
    s: number,
    facing: number,
    rot = 0,
    fy = 1,
    tx = 0,
    ty = 0
): Xf {
    return { ox, oy, s, f: facing, c: Math.cos(rot), sn: Math.sin(rot), fy, tx, ty };
}

/** A rig point in the buffer. */
export function bp(X: Xf, x: number, y: number): [number, number] {
    const yy = y * X.fy;
    const rx = x * X.c - yy * X.sn + X.tx;
    const ry = x * X.sn + yy * X.c + X.ty;
    return [X.ox + X.s * X.f * rx, X.oy - X.s * ry];
}

/**
 * A buffer pixel back in rig space — for patterns (stripes, rings) that are
 * easier to describe along the body than across the screen.
 */
export function toRig(X: Xf, bx: number, by: number): [number, number] {
    const rx = (bx - X.ox) / (X.s * X.f) - X.tx;
    const ry = (X.oy - by) / X.s - X.ty;
    const x = rx * X.c + ry * X.sn;
    const yy = -rx * X.sn + ry * X.c;
    const fy = Math.abs(X.fy) < 0.05 ? (X.fy < 0 ? -0.05 : 0.05) : X.fy;
    return [x, yy / fy];
}

/** A rig direction in the buffer, as an angle (buffer y runs down). */
function bAngle(X: Xf, a: number): number {
    const dx = Math.cos(a);
    const dy = Math.sin(a) * X.fy;
    const rx = dx * X.c - dy * X.sn;
    const ry = dx * X.sn + dy * X.c;
    return Math.atan2(-ry, X.f * rx);
}

export const E = (
    X: Xf,
    x: number,
    y: number,
    rx: number,
    ry: number,
    a = 0
): Prim => {
    const [px, py] = bp(X, x, y);
    return ell(px, py, rx * X.s, ry * X.s, bAngle(X, a));
};

export const C = (
    X: Xf,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    ra: number,
    rb = ra
): Prim => {
    const [pax, pay] = bp(X, ax, ay);
    const [pbx, pby] = bp(X, bx, by);
    return cap(pax, pay, pbx, pby, ra * X.s, rb * X.s);
};

export const Pg = (X: Xf, pts: number[], r = 0): Prim => {
    const out: number[] = [];
    for (let i = 0; i < pts.length; i += 2) {
        const [x, y] = bp(X, pts[i], pts[i + 1]);
        out.push(x, y);
    }
    return poly(out, r * X.s);
};

/* -------------------------------------------------------------------------
 * Small maths
 * ---------------------------------------------------------------------- */

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number): number =>
    v < lo ? lo : v > hi ? hi : v;
export const smooth = (t: number): number => {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
};

/**
 * Two-bone inverse kinematics.
 *
 * From joint (ax, ay) toward target (tx, ty) with bones l1 and l2. `bend`
 * picks the side the middle joint goes: +1 puts it forward (a stifle), -1
 * back (an elbow). An unreachable target is pulled in along the line rather
 * than refused, so a leg asked to reach too far straightens instead of
 * snapping somewhere odd.
 */
export function ik(
    ax: number,
    ay: number,
    tx: number,
    ty: number,
    l1: number,
    l2: number,
    bend: number
): { kx: number; ky: number; ex: number; ey: number } {
    let dx = tx - ax;
    let dy = ty - ay;
    let d = Math.sqrt(dx * dx + dy * dy);
    const max = (l1 + l2) * 0.998;
    const min = Math.abs(l1 - l2) + 0.05;
    if (d > max) {
        dx *= max / d;
        dy *= max / d;
        d = max;
    } else if (d < min) {
        const k = d > 1e-6 ? min / d : 0;
        dx = d > 1e-6 ? dx * k : 0;
        dy = d > 1e-6 ? dy * k : -min;
        d = min;
    }
    const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const a = Math.acos(cosA);
    const base = Math.atan2(dy, dx);
    const ang = base + bend * a;
    return {
        kx: ax + Math.cos(ang) * l1,
        ky: ay + Math.sin(ang) * l1,
        ex: ax + dx,
        ey: ay + dy,
    };
}

/* -------------------------------------------------------------------------
 * The plan: what kind of animal this is
 * ---------------------------------------------------------------------- */

export interface Plan {
    shoulder: [number, number];
    hip: [number, number];
    /** Upper arm, forearm, pastern. */
    fore: [number, number, number];
    /** Femur, tibia, metatarsus. */
    hind: [number, number, number];
    /** Radii down the foreleg: shoulder, elbow, wrist. */
    foreR: [number, number, number];
    /** Radii down the hind leg: thigh, stifle, hock. */
    hindR: [number, number, number];
    /** Paw half-length and half-height. */
    paw: [number, number];
    /** Chest centre relative to the shoulder joint, and its radii. */
    chest: { dx: number; dy: number; rx: number; ry: number };
    /** Rump centre relative to the hip joint, and its radii. */
    rump: { dx: number; dy: number; rx: number; ry: number };
    /** Radius of the waist between them, and how far it rides up (tuck). */
    waist: { r: number; lift: number };
    /** Where the neck leaves the chest (relative to the shoulder joint,
     *  along the spine), and its radius there and at the head. */
    neck: { base: [number, number]; r0: number; r1: number };
    /** Head centre relative to the shoulder joint when standing. */
    head: { dx: number; dy: number };
    skull: { rx: number; ry: number };
    /** Snout: length beyond the skull, radius at base and tip, drop below the eye line. */
    snout: { len: number; r0: number; r1: number; drop: number };
    jaw: { r: number };
    /** Where the tail leaves the rump, relative to the hip joint. */
    tailRoot: [number, number];
    tail: { len: number; r: number[]; angle: number; curl: number };
    /** How smoothly the torso's pieces merge. */
    blend: number;
    /** Shading dome radii. */
    dome: { body: number; head: number; leg: number; tail: number };
}

/* -------------------------------------------------------------------------
 * The pose: what the animal is doing with it
 * ----------------------------------------------------------------------
 * Flat on purpose. Every field is a number, so blending one pose into the
 * next is a field-by-field lerp and nothing else — which is what lets any
 * clip hand over to any other without a transition table.
 */

export interface QPose {
    /** Root rotation, radians counter-clockwise. */
    rot: number;
    /** 1 upright, -1 belly-up. */
    roll: number;
    /** Root offset in world rig units, after rotation: x forward, y up. */
    tx: number;
    ty: number;

    /** Shoulder and hip joints. */
    sx: number;
    sy: number;
    hx: number;
    hy: number;
    /** Spine curvature: + arches the back up, - sags it. */
    arch: number;
    /** -1..1, the chest filling and emptying. */
    breath: number;

    /** Head centre relative to the shoulder joint. */
    hdx: number;
    hdy: number;
    /** 0 profile .. 1 facing the viewer. */
    yaw: number;
    /** Nose up (+) or down (-), radians. */
    pitch: number;
    /** In-plane roll of the head, radians — the head tilt. */
    tilt: number;
    /** 0..1. */
    jaw: number;
    tongue: number;
    /** -1 pinned back .. 0 neutral .. 1 pricked forward. */
    ear: number;
    /** 0..1, eyelids. */
    eye: number;
    /** 0..1, the contented squint. */
    happy: number;
    lookX: number;
    lookY: number;

    /** Hock angle, both hind legs: ~1.25 standing, near 0 sitting flat. */
    hock: number;
    /** Paws: fore near, fore far, hind near, hind far. */
    fnx: number;
    fny: number;
    ffx: number;
    ffy: number;
    hnx: number;
    hny: number;
    hfx: number;
    hfy: number;

    /** Tail base angle (0 straight back, + up), curl per segment, wag. */
    tailA: number;
    tailCurl: number;
    tailWag: number;
}

export const POSE_KEYS = [
    'rot', 'roll', 'tx', 'ty', 'sx', 'sy', 'hx', 'hy', 'arch', 'breath',
    'hdx', 'hdy', 'yaw', 'pitch', 'tilt', 'jaw', 'tongue', 'ear', 'eye',
    'happy', 'lookX', 'lookY', 'hock', 'fnx', 'fny', 'ffx', 'ffy', 'hnx', 'hny',
    'hfx', 'hfy', 'tailA', 'tailCurl', 'tailWag',
] as const;

export function blendPose(a: QPose, b: QPose, t: number): QPose {
    if (t <= 0) return a;
    if (t >= 1) return b;
    const out = { ...a };
    for (const k of POSE_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
    return out;
}

/** Standing square, looking ahead. Every clip starts from this. */
export function standPose(plan: Plan): QPose {
    const [sx, sy] = plan.shoulder;
    const [hx, hy] = plan.hip;
    return {
        rot: 0,
        roll: 1,
        tx: 0,
        ty: 0,
        sx,
        sy,
        hx,
        hy,
        arch: 0,
        breath: 0,
        hdx: plan.head.dx,
        hdy: plan.head.dy,
        yaw: 0,
        pitch: 0,
        tilt: 0,
        jaw: 0,
        tongue: 0,
        ear: 0,
        eye: 1,
        happy: 0,
        lookX: 0,
        lookY: 0,
        hock: 1.26,
        fnx: sx + 0.6,
        fny: 0,
        ffx: sx - 1.2,
        ffy: 0,
        hnx: hx + 1.4,
        hny: 0,
        hfx: hx - 0.6,
        hfy: 0,
        tailA: plan.tail.angle,
        tailCurl: plan.tail.curl,
        tailWag: 0,
    };
}

/* -------------------------------------------------------------------------
 * Gaits
 * ----------------------------------------------------------------------
 * A gait is when each paw lifts, for how much of the cycle it is down
 * (`duty`), and how high it swings. The walk is a four-beat lateral
 * sequence; the trot moves diagonal pairs together; the gallop puts the
 * hind pair down together and then the fore pair, with the body in the air
 * between them. Phases are fore-near, fore-far, hind-near, hind-far.
 */

export interface Gait {
    duty: number;
    phase: [number, number, number, number];
    lift: [number, number];
    /** Distance covered per full cycle, at the gait's reference speed. */
    stride: number;
}

export const WALK: Gait = {
    duty: 0.64,
    phase: [0.25, 0.75, 0.0, 0.5],
    lift: [2.6, 2.2],
    stride: 22,
};

export const TROT: Gait = {
    duty: 0.5,
    phase: [0.5, 0.0, 0.0, 0.5],
    lift: [3.4, 3.0],
    stride: 34,
};

export const GALLOP: Gait = {
    duty: 0.38,
    phase: [0.56, 0.64, 0.0, 0.1],
    lift: [4.6, 3.8],
    stride: 50,
};

/** The stoat's: both hind feet land where both forefeet just left. */
export const BOUND: Gait = {
    duty: 0.42,
    phase: [0.5, 0.53, 0.0, 0.03],
    lift: [2.8, 2.4],
    stride: 30,
};

/** Paw position for one leg, relative to its home, at gait phase `p`. */
function pawAt(
    p: number,
    duty: number,
    stride: number,
    lift: number
): [number, number] {
    const q = ((p % 1) + 1) % 1;
    if (q < duty) {
        // Planted: moving backward under the body at exactly body speed.
        return [stride * (duty * 0.5 - q), 0];
    }
    const s = (q - duty) / (1 - duty);
    // Swing forward, eased so the paw accelerates off the ground and
    // decelerates into the next contact, on a lopsided arc that peaks early
    // — a paw lifts high and then reaches.
    const e = s * s * (3 - 2 * s);
    const x = stride * duty * (-0.5 + e);
    const y = lift * Math.sin(Math.PI * Math.pow(s, 0.8));
    return [x, y];
}

/**
 * Applies a gait to a pose at cycle phase `phase` (0..1, advanced by
 * distance), over a stride scaled to how fast the creature is actually
 * going.
 */
export function applyGait(
    pose: QPose,
    gait: Gait,
    phase: number,
    stride: number,
    reach = 1
): QPose {
    const [fn, ff, hn, hf] = gait.phase;
    const out = { ...pose };
    const L = stride * reach;
    const a = pawAt(phase + fn, gait.duty, L, gait.lift[0]);
    const b = pawAt(phase + ff, gait.duty, L, gait.lift[0]);
    const c = pawAt(phase + hn, gait.duty, L, gait.lift[1]);
    const d = pawAt(phase + hf, gait.duty, L, gait.lift[1]);
    out.fnx = pose.fnx + a[0];
    out.fny = pose.fny + a[1];
    out.ffx = pose.ffx + b[0];
    out.ffy = pose.ffy + b[1];
    out.hnx = pose.hnx + c[0];
    out.hny = pose.hny + c[1];
    out.hfx = pose.hfx + d[0];
    out.hfy = pose.hfy + d[1];
    return out;
}

/* -------------------------------------------------------------------------
 * Drawing
 * ---------------------------------------------------------------------- */

/** Materials and the bits of a species that are not proportions. */
export interface Coat {
    /** Main fur. */
    fur: Ramp;
    /** The underside, muzzle, socks — whatever the markings are drawn in. */
    pale?: Ramp;
    /** Tail tip, ear tips, nose leather. */
    dark?: Ramp;
    /** Inside the mouth. */
    mouth: Ramp;
    tongue: Ramp;
    /** The outline on the shadowed side. */
    shadowRim: RGBA;
}

/** Everything the post-render details need, in buffer pixels. */
export interface Anchors {
    head: [number, number];
    /** Top of the skull, and the head's angle in the buffer (radians). */
    crown: [number, number];
    headAngle: number;
    /** Between the eyes, for sunglasses. */
    brow: [number, number];
    /** Under the chin, for a bow tie. */
    throat: [number, number];
    /** Where something carried in the mouth sits. */
    mouth: [number, number];
    nose: [number, number];
    /** Eyes visible to the viewer: near first. */
    eyes: { x: number; y: number; near: boolean }[];
    /** The scruff — what the pointer holds when the creature is picked up. */
    scruff: [number, number];
    /** The two-ish points of the body nearest the ground, for the shadow. */
    feet: [number, number];
    /** Unit vector for the face's direction in the buffer (x only matters). */
    faceX: number;
    yaw: number;
    pitch: number;
    jaw: number;
}

export interface HeadStyle {
    /** Ear base half-width, height, and how far round from the face they sit. */
    ear: { w: number; h: number; spread: number; back: number; fold: number };
    /** Round ears instead of pointed (the stoat's). */
    roundEars?: boolean;
    /** Extra cheek ruff, for a cat's fuller face. */
    cheek?: number;
}

/** Layers out, plus where everything ended up. */
export interface Built {
    layers: (Layer & { name: string })[];
    anchors: Anchors;
    X: Xf;
}

/** Markings, supplied by the species as functions of the solved skeleton. */
export interface Skeleton {
    X: Xf;
    pose: QPose;
    plan: Plan;
    chest: [number, number];
    rump: [number, number];
    shoulder: [number, number];
    hip: [number, number];
    head: [number, number];
    /** Face direction, 3D, unit. */
    face: [number, number, number];
    /** Nose tip in rig space. */
    nose: [number, number];
    legs: {
        fn: number[];
        ff: number[];
        hn: number[];
        hf: number[];
    };
    tail: [number, number][];
}

export interface Species {
    plan: Plan;
    coat: Coat;
    head: HeadStyle;
    /** Markings on the body layer, built from the skeleton. */
    bodyMarks?: (k: Skeleton) => Mark[];
    headMarks?: (k: Skeleton) => Mark[];
    legMarks?: (k: Skeleton, leg: number[], near: boolean, fore: boolean) => Mark[];
    tailMarks?: (k: Skeleton) => Mark[];
}

/**
 * Projects a direction on the skull into rig space.
 *
 * `face` is the face's 3D direction; `around` rotates horizontally from it
 * (positive toward the viewer's right in profile), `up` lifts. Returns the
 * rig-space offset and whether that point faces the viewer.
 */
function onSkull(
    face: [number, number, number],
    around: number,
    up: number
): { x: number; y: number; z: number } {
    // Heading round the vertical axis from the face, and elevation above
    // the horizontal, carrying a share of the head's own pitch with it.
    const heading = Math.atan2(face[2], face[0]) + around;
    const pitch = Math.asin(clamp(face[1], -1, 1));
    const e = up + pitch * 0.6;
    return {
        x: Math.cos(e) * Math.cos(heading),
        y: Math.sin(e),
        z: Math.cos(e) * Math.sin(heading),
    };
}

/** Solves the skeleton for a pose: joints, legs, head, tail. */
export function solve(plan: Plan, pose: QPose, X: Xf): Skeleton {
    const shoulder: [number, number] = [pose.sx, pose.sy];
    const hip: [number, number] = [pose.hx, pose.hy];

    // The torso follows the line from hip to shoulder, so a crouch or a sit
    // tilts the chest and rump with it.
    const spineA = Math.atan2(pose.sy - pose.hy, pose.sx - pose.hx);
    const cs = Math.cos(spineA);
    const ss = Math.sin(spineA);
    const rot = (dx: number, dy: number): [number, number] => [
        dx * cs - dy * ss,
        dx * ss + dy * cs,
    ];
    const cOff = rot(plan.chest.dx, plan.chest.dy);
    const rOff = rot(plan.rump.dx, plan.rump.dy);
    const chest: [number, number] = [pose.sx + cOff[0], pose.sy + cOff[1]];
    const rump: [number, number] = [pose.hx + rOff[0], pose.hy + rOff[1]];

    const head: [number, number] = [pose.sx + pose.hdx, pose.sy + pose.hdy];
    const yawA = clamp(pose.yaw, 0, 1) * (Math.PI / 2);
    const face: [number, number, number] = [
        Math.cos(yawA) * Math.cos(pose.pitch),
        Math.sin(pose.pitch),
        Math.sin(yawA) * Math.cos(pose.pitch),
    ];
    const reach = plan.skull.rx * 0.82 + plan.snout.len;
    const nose: [number, number] = [
        head[0] + face[0] * reach,
        head[1] + face[1] * reach - plan.snout.drop,
    ];

    // --- legs --------------------------------------------------------------
    const [fu, fl, fp] = plan.fore;
    const [hu, hl, hm] = plan.hind;
    const foreLeg = (px: number, py: number, bend = -1): number[] => {
        // The wrist sits a pastern above the paw, leaning a touch forward.
        const wx = px - fp * 0.18;
        const wy = py + fp;
        const j = ik(shoulder[0], shoulder[1], wx, wy, fu, fl, bend);
        return [shoulder[0], shoulder[1], j.kx, j.ky, j.ex, j.ey, px, py];
    };
    const hindLeg = (px: number, py: number): number[] => {
        // Hock first: up and back from the paw at the pose's lean — nearly
        // upright when standing, flat along the ground when sitting.
        const jx = px - hm * Math.cos(pose.hock);
        const jy = py + hm * Math.sin(pose.hock);
        const j = ik(hip[0], hip[1], jx, jy, hu, hl, 1);
        return [hip[0], hip[1], j.kx, j.ky, j.ex, j.ey, px, py];
    };

    // --- tail --------------------------------------------------------------
    const tailRoot: [number, number] = [
        pose.hx + plan.tailRoot[0],
        pose.hy + plan.tailRoot[1],
    ];
    const tail: [number, number][] = [tailRoot];
    const segs = plan.tail.r.length - 1;
    const segLen = plan.tail.len / segs;
    // `tailA` is measured from straight back, positive up, so the heading
    // starts pointing backward and swings up as tailA grows.
    let a = Math.PI - pose.tailA + spineA;
    let tx = tailRoot[0];
    let ty = tailRoot[1];
    for (let i = 0; i < segs; i++) {
        // Curl is felt mostly toward the tip — a tail hangs straight from
        // the root and hooks at the end, it does not bend evenly along its
        // length like a hose. Wag swings the whole thing from the root.
        const t = segs > 1 ? i / (segs - 1) : 1;
        a += -pose.tailCurl * t * t * 1.6;
        a += -pose.tailWag * (i === 0 ? 0.55 : 0.12);
        tx += Math.cos(a) * segLen;
        ty += Math.sin(a) * segLen;
        // A tail that reaches the floor lies along it instead of going
        // through it — which is how a sitting cat's tail ends up wrapped
        // round its feet without anybody having to animate that.
        const floor = -pose.ty + plan.tail.r[i + 1] * 0.85;
        if (Math.abs(pose.rot) < 0.3 && pose.roll > 0.5 && ty < floor) {
            ty = floor;
            // Carry on along the floor in whichever direction the curl is
            // turning: a tail curling forward wraps round toward the paws,
            // one curling back trails out behind.
            if (Math.sin(a) < 0) a = pose.tailCurl < 0 ? 0 : Math.PI;
        }
        tail.push([tx, ty]);
    }

    return {
        X,
        pose,
        plan,
        chest,
        rump,
        shoulder,
        hip,
        head,
        face,
        nose,
        legs: {
            fn: foreLeg(pose.fnx, pose.fny),
            ff: foreLeg(pose.ffx, pose.ffy),
            hn: hindLeg(pose.hnx, pose.hny),
            hf: hindLeg(pose.hfx, pose.hfy),
        },
        tail,
    };
}

/** One leg's shapes. `leg` is the flat joint list from `solve`. */
function legParts(
    X: Xf,
    plan: Plan,
    leg: number[],
    fore: boolean
): Part[] {
    const [ax, ay, kx, ky, ex, ey, px, py] = leg;
    const R = fore ? plan.foreR : plan.hindR;
    const [pr, ph] = plan.paw;
    const parts: Part[] = [
        { p: C(X, ax, ay, kx, ky, R[0], R[1]) },
        { p: C(X, kx, ky, ex, ey, R[1], R[2]), k: 1.6 },
    ];
    if (fore) {
        parts.push({ p: C(X, ex, ey, px + pr * 0.15, py + ph, R[2], ph * 1.05), k: 1.2 });
    } else {
        parts.push({ p: C(X, ex, ey, px, py + ph, R[2], ph * 1.05), k: 1.2 });
    }
    // The paw: a low oval, longer than it is tall, sitting on its contact.
    parts.push({ p: E(X, px + pr * 0.35, py + ph * 0.95, pr, ph), k: 1.2 });
    return parts;
}

/**
 * Builds the full layer stack for one frame.
 *
 * The order is the painter's order for a right-facing animal seen from its
 * left side: far ear, far legs, tail, body, near hind leg, head, near
 * foreleg. Rolling onto its back keeps the order — the viewer is still on
 * the same side of it.
 */
export function buildQuadruped(sp: Species, pose: QPose, X: Xf): Built {
    const { plan, coat } = sp;
    const k = solve(plan, pose, X);
    const layers: (Layer & { name: string })[] = [];

    /* --- far legs, in shadow ------------------------------------------ */
    const farParts = [
        ...legParts(X, plan, k.legs.ff, true),
        ...legParts(X, plan, k.legs.hf, false),
    ];
    layers.push({
        name: 'farLegs',
        parts: farParts,
        ramp: coat.fur,
        dome: plan.dome.leg,
        shift: -1,
        marks: [
            ...(sp.legMarks?.(k, k.legs.ff, false, true) ?? []),
            ...(sp.legMarks?.(k, k.legs.hf, false, false) ?? []),
        ],
    });

    /* --- tail ----------------------------------------------------------- */
    const tailParts: Part[] = [];
    for (let i = 0; i < k.tail.length - 1; i++) {
        const [ax, ay] = k.tail[i];
        const [bx, by] = k.tail[i + 1];
        tailParts.push({
            p: C(X, ax, ay, bx, by, plan.tail.r[i], plan.tail.r[i + 1]),
            k: i ? 1.4 : 0,
        });
    }
    const tailLayer: Layer & { name: string } = {
        name: 'tail',
        parts: tailParts,
        ramp: coat.fur,
        dome: plan.dome.tail,
        marks: sp.tailMarks?.(k) ?? [],
    };

    /* --- body: chest, waist, rump, neck --------------------------------- */
    const breath = pose.breath * 0.35;
    const spineMid: [number, number] = [
        (k.chest[0] + k.rump[0]) / 2,
        (k.chest[1] + k.rump[1]) / 2 + plan.waist.lift + pose.arch,
    ];
    const spineA = Math.atan2(k.shoulder[1] - k.hip[1], k.shoulder[0] - k.hip[0]);
    const [nbx, nby] = plan.neck.base;
    const neckBase: [number, number] = [
        k.shoulder[0] + Math.cos(spineA) * nbx - Math.sin(spineA) * nby,
        k.shoulder[1] + Math.sin(spineA) * nbx + Math.cos(spineA) * nby,
    ];
    const bodyParts: Part[] = [
        {
            p: E(
                X,
                k.chest[0],
                k.chest[1],
                plan.chest.rx + breath * 0.3,
                plan.chest.ry + breath,
                spineA
            ),
        },
        {
            p: E(X, k.rump[0], k.rump[1], plan.rump.rx, plan.rump.ry, spineA),
            k: plan.blend,
        },
        {
            p: C(
                X,
                k.chest[0],
                k.chest[1] + 0.6,
                spineMid[0],
                spineMid[1],
                plan.waist.r + 0.6,
                plan.waist.r
            ),
            k: plan.blend,
        },
        {
            p: C(
                X,
                spineMid[0],
                spineMid[1],
                k.rump[0],
                k.rump[1],
                plan.waist.r,
                plan.rump.ry * 0.9
            ),
            k: plan.blend,
        },
        {
            p: C(
                X,
                neckBase[0],
                neckBase[1],
                k.head[0],
                k.head[1],
                plan.neck.r0,
                plan.neck.r1
            ),
            k: plan.blend * 0.9,
        },
    ];
    const bodyLayer: Layer & { name: string } = {
        name: 'body',
        parts: bodyParts,
        ramp: coat.fur,
        dome: plan.dome.body,
        marks: sp.bodyMarks?.(k) ?? [],
    };

    /* --- the head ------------------------------------------------------- */
    const face = k.face;
    const yaw = clamp(pose.yaw, 0, 1);
    const sk = plan.skull;
    const sn = plan.snout;
    const hx = k.head[0];
    const hy = k.head[1];
    // In-plane tilt, applied to every head feature about the head centre.
    const tc = Math.cos(pose.tilt);
    const ts = Math.sin(pose.tilt);
    const tilt = (x: number, y: number): [number, number] => {
        const dx = x - hx;
        const dy = y - hy;
        return [hx + dx * tc - dy * ts, hy + dx * ts + dy * tc];
    };

    // The skull: wider than tall in profile, rounder face-on.
    const skullRx = lerp(sk.rx, sk.ry * 1.02, yaw);
    const skullA = pose.pitch * (1 - yaw) + pose.tilt;

    // The snout runs from inside the skull to the nose, foreshortening as the
    // face turns toward the viewer.
    const snoutBase = tilt(
        hx + face[0] * sk.rx * 0.35,
        hy + face[1] * sk.rx * 0.35 - sn.drop * 0.7
    );
    const noseTip = tilt(k.nose[0], k.nose[1]);
    const snoutR1 = lerp(sn.r1, sn.r0 * 0.92, yaw * 0.8);

    // The lower jaw hinges under the back of the snout and swings open.
    const jawOpen = clamp(pose.jaw, 0, 1);
    const hinge = tilt(
        hx + face[0] * sk.rx * 0.2,
        hy - sn.drop - sn.r0 * 0.55
    );
    const jawLen = sk.rx * 0.6 + sn.len * 0.9;
    const jawA =
        Math.atan2(face[1], Math.max(0.15, face[0])) -
        jawOpen * 0.75 +
        pose.tilt;
    const chin: [number, number] = [
        hinge[0] + Math.cos(jawA) * jawLen * Math.max(0.25, face[0]),
        hinge[1] + Math.sin(jawA) * jawLen - yaw * sn.r0 * 0.4,
    ];

    const headParts: Part[] = [
        { p: E(X, hx, hy, skullRx, sk.ry, skullA) },
        {
            p: C(
                X,
                snoutBase[0],
                snoutBase[1],
                noseTip[0],
                noseTip[1],
                sn.r0,
                snoutR1
            ),
            k: 2.2,
        },
        {
            p: C(X, hinge[0], hinge[1], chin[0], chin[1], plan.jaw.r * 1.1, plan.jaw.r * 0.85),
            k: jawOpen > 0.15 ? 0.6 : 1.6,
        },
    ];
    if (sp.head.cheek) {
        const ch = tilt(
            hx - face[0] * sk.rx * 0.15,
            hy - sk.ry * 0.45
        );
        headParts.push({
            p: E(X, ch[0], ch[1], sk.rx * sp.head.cheek, sk.ry * 0.62, skullA),
            k: 1.6,
        });
    }

    // Ears, projected off the skull. Near ear joins the head; the far one is
    // its own layer behind everything so the skull overlaps its base.
    const st = sp.head.ear;
    const earPoly = (side: number): { pts: number[]; z: number; tip: [number, number] } => {
        const dir = onSkull(face, side * st.spread, 1.05);
        // The far ear sits a touch forward of the near one, the way a real
        // profile shows it peeking past the skull rather than hidden behind.
        const baseX =
            hx + dir.x * sk.rx * 0.7 - face[0] * st.back - dir.z * sk.rx * 0.32;
        const baseY = hy + sk.ry * 0.62;
        // Ear posture: pricked forward, neutral, or pinned back.
        const lean = -pose.ear * 0.35 + 0.15;
        const ca = Math.cos(lean);
        const sa = Math.sin(lean);
        const w = st.w * lerp(0.78, 1, yaw);
        const hgt = st.h * (pose.ear < 0 ? 1 + pose.ear * 0.35 : 1);
        // Base corners and tip, in a frame leaning back by `lean`.
        const corner = (u: number, v: number): [number, number] =>
            tilt(baseX + u * ca + v * sa, baseY - u * sa + v * ca);
        // A folded ear (the collie's) leans its tip forward and stands a
        // little shorter; a pricked one (the cat's) is upright.
        const fold = st.fold * (1 - Math.max(0, pose.ear) * 0.6);
        const tip = corner(w * 0.1 + fold, hgt - fold * 0.45);
        const pts = [...corner(-w, 0), ...corner(w, 0), ...tip];
        return { pts, z: dir.z, tip };
    };

    const ears = [earPoly(1), earPoly(-1)];
    // In profile one ear is nearer; face-on both are visible and equal.
    const nearEar = ears[0].z >= ears[1].z ? ears[0] : ears[1];
    const farEar = nearEar === ears[0] ? ears[1] : ears[0];
    const earPrim = (e: { pts: number[] }): Prim => {
        if (sp.head.roundEars) {
            const cx = (e.pts[0] + e.pts[2]) / 2;
            const cy = (e.pts[1] + e.pts[3]) / 2 + st.h * 0.35;
            return E(X, cx, cy, st.w * 0.9, st.h * 0.7);
        }
        return Pg(X, e.pts, 0.45);
    };
    headParts.push({ p: earPrim(nearEar), k: 1.1 });

    const headLayer: Layer & { name: string } = {
        name: 'head',
        parts: headParts,
        ramp: coat.fur,
        dome: plan.dome.head,
        contour: true,
        marks: sp.headMarks?.(k) ?? [],
    };
    const farEarLayer: Layer & { name: string } = {
        name: 'farEar',
        parts: [{ p: earPrim(farEar) }],
        ramp: coat.fur,
        dome: plan.dome.head * 0.6,
        shift: yaw > 0.6 ? 0 : -1,
        marks: sp.headMarks?.(k) ?? [],
    };

    // The mouth's inside, behind the head, showing only in the gap.
    const mouthLayer: Layer & { name: string } | null =
        jawOpen > 0.08
            ? {
                  name: 'mouth',
                  parts: [
                      {
                          p: Pg(X, [
                              hinge[0] - 0.6, hinge[1] + 0.4,
                              noseTip[0] - 0.4, noseTip[1] - sn.r1 * 0.9,
                              chin[0], chin[1],
                          ]),
                      },
                  ],
                  ramp: coat.mouth,
                  dome: 1,
                  flat: 1,
                  noOutline: true,
              }
            : null;

    const tongueLayer: Layer & { name: string } | null =
        pose.tongue > 0.05 && jawOpen > 0.15
            ? {
                  name: 'tongue',
                  parts: [
                      {
                          p: C(
                              X,
                              lerp(hinge[0], chin[0], 0.45),
                              lerp(hinge[1], chin[1], 0.45) + 0.5,
                              chin[0] + face[0] * 1.2,
                              chin[1] - pose.tongue * 2.6,
                              plan.jaw.r * 0.9,
                              plan.jaw.r * 0.85
                          ),
                      },
                  ],
                  ramp: coat.tongue,
                  dome: 1.4,
                  contour: true,
              }
            : null;

    /* --- near legs ------------------------------------------------------ */
    const nearHind: Layer & { name: string } = {
        name: 'nearHind',
        parts: legParts(X, plan, k.legs.hn, false),
        ramp: coat.fur,
        dome: plan.dome.leg + 1,
        contour: true,
        marks: sp.legMarks?.(k, k.legs.hn, true, false) ?? [],
    };
    const nearFore: Layer & { name: string } = {
        name: 'nearFore',
        parts: legParts(X, plan, k.legs.fn, true),
        ramp: coat.fur,
        dome: plan.dome.leg,
        contour: true,
        marks: sp.legMarks?.(k, k.legs.fn, true, true) ?? [],
    };

    // A raised tail goes behind the body; one hanging down or curled round
    // the feet is still behind it in depth — the body is always in front of
    // the root of its own tail.
    layers.push(farEarLayer);
    layers.push(tailLayer);
    layers.push(bodyLayer);
    layers.push(nearHind);
    if (mouthLayer) layers.push(mouthLayer);
    layers.push(headLayer);
    if (tongueLayer) layers.push(tongueLayer);
    layers.push(nearFore);

    /* --- anchors -------------------------------------------------------- */
    const toB = (p: [number, number]): [number, number] => bp(X, p[0], p[1]);
    const eyes: Anchors['eyes'] = [];
    for (const side of [1, -1]) {
        const d = onSkull(face, side * 0.72, 0.2);
        if (d.z < -0.05 && !(yaw < 0.05 && side === 1)) continue;
        const e = tilt(hx + d.x * sk.rx * 0.78, hy + sk.ry * 0.12 + d.y * 0.4);
        const [ex, ey] = toB(e);
        eyes.push({ x: ex, y: ey, near: side === 1 || d.z > 0.4 });
    }
    eyes.sort((a, b) => (a.near === b.near ? 0 : a.near ? -1 : 1));

    const crownR = tilt(hx - face[0] * sk.rx * 0.1, hy + sk.ry * 0.95);
    const browR = tilt(hx + face[0] * sk.rx * 0.6, hy + sk.ry * 0.12);
    const throatR = tilt(hx - face[0] * sk.rx * 0.2, hy - sk.ry * 1.05);
    const mouthR: [number, number] = [
        lerp(noseTip[0], chin[0], 0.5),
        lerp(noseTip[1], chin[1], 0.5) - 0.4,
    ];
    const scruffR: [number, number] = [
        k.shoulder[0] - 1.5,
        k.shoulder[1] + plan.neck.r0 * 0.6,
    ];
    const headAngle = bAngle(X, pose.tilt + pose.pitch * (1 - yaw) + Math.PI / 2) + Math.PI / 2;

    const lowest = [k.legs.fn, k.legs.hn].map((l) => toB([l[6], l[7]]));

    return {
        layers,
        X,
        anchors: {
            head: toB(k.head),
            crown: toB(crownR),
            headAngle,
            brow: toB(browR),
            throat: toB(throatR),
            mouth: toB(mouthR),
            nose: toB(noseTip),
            eyes,
            scruff: toB(scruffR),
            feet: [lowest[0][0], lowest[1][0]],
            faceX: X.f * face[0],
            yaw,
            pitch: pose.pitch,
            jaw: jawOpen,
        },
    };
}

/** Convenience for species files: a mark that is just a few shapes. */
export const markOf = (ramp: Ramp | undefined, ...prims: Prim[]): Mark => ({
    ramp,
    parts: prims.map((p) => ({ p, k: 1 })),
});

/** Unused-variable guard for builds with `noUnusedLocals`. */
export type { Frame };
