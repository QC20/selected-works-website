/**
 * What the animal is doing, as a pose, every frame.
 * --------------------------------------------------
 * `DesktopPet` decides *what* is happening — walking to a window, being
 * thrown, performing — and this decides what that looks like. Each `Clip`
 * is a function from time (and, for anything with feet, distance) to a
 * pose; the `Animator` blends from whatever was showing into the next clip
 * so nothing ever snaps, and layers the small continuous business of being
 * alive on top: breathing, blinking, and turning to look at things.
 *
 * Why poses and not a sprite sheet
 * --------------------------------
 * A sheet of drawn frames looks right at the moments somebody drew and
 * wrong everywhere else — the walk at a speed nobody animated, the head
 * turned toward a pointer at an angle nobody drew. Poses are solved, so the
 * walk matches the speed it is actually walking at, the feet stay planted,
 * and the head follows the pointer to any angle. The craft that a sheet
 * would have carried — anticipation, holds, overshoot — lives in the
 * keyframe tracks from `petMotion.ts`, which this file uses throughout.
 */

import {
    BOUND,
    GALLOP,
    Gait,
    Plan,
    QPose,
    TROT,
    WALK,
    applyGait,
    blendPose,
    clamp,
    lerp,
    smooth,
    standPose,
} from './quadruped';
import { QUADRUPEDS, QuadrupedId } from './species';
import { BettaPose, bettaRest, blendBetta } from './betta';
import type { PetKind } from './render';
import {
    JUMP_SY,
    JUMP_Y,
    PRESS,
    approach,
    backOut,
    easeIn,
    easeInOut,
    easeOut,
    sineOut,
    track,
} from '../petMotion';

export type Clip =
    /* standing about */
    | 'stand'
    | 'sit'
    | 'lie'
    | 'sleep'
    | 'perk'
    | 'watch'
    | 'ponder'
    /* going somewhere */
    | 'walk'
    | 'trot'
    | 'run'
    | 'stalk'
    | 'pounce'
    /* small business */
    | 'sniff'
    | 'dig'
    | 'groom'
    | 'scratch'
    | 'stretch'
    | 'yawn'
    | 'tailChase'
    | 'dance'
    | 'bellyUp'
    | 'eat'
    /* reactions */
    | 'hop'
    | 'trick'
    | 'dizzy'
    | 'press'
    | 'heart'
    | 'cool'
    | 'yap'
    | 'sing'
    | 'speechless'
    | 'worry'
    /* the world */
    | 'climb'
    | 'cling'
    | 'clingNap'
    | 'dangle'
    | 'tumble'
    | 'ledgeSit';

export type Pose = QPose | BettaPose;

export interface ClipCtx {
    /** Absolute time, ms. */
    now: number;
    /** ms since the clip began. */
    t: number;
    /** 0..1 through a timed clip; 0 for open-ended ones. */
    p: number;
    /** Length of a timed clip, ms. */
    len: number;
    /** Gait phase 0..1, advanced by distance rather than time. */
    gait: number;
    /** Current speed, px/s. */
    speed: number;
    /** Degrees, for tumbling and tricks driven from outside. */
    spin: number;
    /** Landing squash, 0..1. */
    squash: number;
    /** Vertical speed, px/s, up positive — for poses that ride real physics. */
    vy: number;
}

/* -------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------- */

const TAU = Math.PI * 2;
const wave = (now: number, period: number, phase = 0) =>
    Math.sin((now / period) * TAU + phase);

/** A crouch: lower the body by `d`, keeping the feet where they are. */
function crouch(p: QPose, d: number): QPose {
    return { ...p, sy: p.sy - d, hy: p.hy - d * 0.9, hdy: p.hdy - d * 0.15 };
}

/** The base standing pose for a species, breathing. */
function stand(plan: Plan, now: number, depth = 1): QPose {
    const p = standPose(plan);
    const b = wave(now, 3200);
    p.breath = b * depth;
    p.sy += b * 0.18 * depth;
    p.hdy += wave(now, 3200, -0.6) * 0.22 * depth;
    return p;
}

/** Stride for a gait at a given speed: longer strides as well as faster. */
function strideFor(g: Gait, speed: number, ref: number): number {
    return g.stride * clamp(0.72 + 0.28 * (speed / ref), 0.6, 1.25);
}

/* -------------------------------------------------------------------------
 * The four-legged clips
 * ---------------------------------------------------------------------- */

function sitPose(plan: Plan, kind: QuadrupedId): QPose {
    // Sitting is the hips coming forward *under* the body, not the back
    // end dropping where it stands — which is what makes a sitting dog
    // upright and compact rather than a dog leaning back on a stool.
    const p = standPose(plan);
    const [sx0] = plan.shoulder;
    const legs = plan.fore[0] + plan.fore[1] + plan.fore[2];
    p.sx = sx0 - 0.6;
    p.sy = legs * 0.97;
    p.hx = p.sx - (kind === 'glitch' ? 9 : kind === 'static' ? 7.4 : 8.6);
    p.hy = plan.hindR[0] + 0.7;
    p.hock = 0.08;
    p.fnx = p.sx + 0.9;
    p.ffx = p.sx - 0.4;
    p.hnx = p.hx + plan.hind[2] + 1.4;
    p.hfx = p.hx + plan.hind[2] + 0.2;
    p.hdx = plan.head.dx - 1.6;
    p.hdy = plan.head.dy + 0.6;
    // Down to the floor behind, then wrapped forward round the feet: all of
    // the cat's tail, only the end of the dog's.
    p.tailA = kind === 'static' ? -0.3 : -0.45;
    p.tailCurl = kind === 'static' ? -0.42 : -0.2;
    return p;
}

function liePose(plan: Plan, kind: QuadrupedId): QPose {
    const p = standPose(plan);
    const [sx0] = plan.shoulder;
    const [hx0] = plan.hip;
    p.sx = sx0 + 0.6;
    p.sy = plan.foreR[0] + plan.chest.ry * 0.55 + 0.4;
    p.hx = hx0 + 1.6;
    p.hy = plan.hindR[0] + 0.6;
    p.hock = 0.12;
    const reach = plan.fore[0] + plan.fore[1] * 0.9;
    p.fnx = p.sx + reach;
    p.ffx = p.sx + reach - 1.4;
    p.fny = 0;
    p.ffy = 0;
    p.hnx = p.hx + plan.hind[2] + 2.4;
    p.hfx = p.hx + plan.hind[2] + 1.2;
    p.hdx = plan.head.dx * 0.92;
    p.hdy = plan.head.dy * 0.82;
    p.tailA = kind === 'glitch' ? -0.12 : -0.35;
    p.tailCurl = kind === 'static' ? 0.5 : 0.25;
    return p;
}

function quadClip(kind: QuadrupedId, clip: Clip, c: ClipCtx): QPose {
    const plan = QUADRUPEDS[kind].plan;
    const { now, p: prog } = c;
    const cat = kind === 'static';
    const stoat = kind === 'glitch';
    const dog = kind === 'modem';

    switch (clip) {
        /* --- standing about ------------------------------------------- */
        case 'stand': {
            const p = stand(plan, now);
            p.tailWag = dog ? wave(now, 1400) * 0.12 : cat ? wave(now, 2600) * 0.06 : 0;
            if (cat) p.tailCurl += wave(now, 3100) * 0.12;
            return p;
        }

        case 'perk': {
            if (stoat) return periscope(plan, now);
            const p = stand(plan, now, 0.6);
            p.hdy += 1.4;
            p.hdx += 0.4;
            p.ear = 1;
            p.pitch = 0.12;
            p.tailA += cat ? 1.8 : 0.9;
            p.tailCurl = cat ? 0.45 : p.tailCurl * 0.4;
            return p;
        }

        case 'watch': {
            if (stoat) return periscope(plan, now);
            const p = sitPose(plan, kind);
            p.breath = wave(now, 3000);
            p.ear = 0.8;
            // Small head cocks while it watches, every couple of seconds.
            p.tilt = Math.max(0, wave(now, 2600)) * 0.22;
            return p;
        }

        case 'ponder': {
            // The head tilt. The dog's is the famous one; everybody gets it.
            const p = dog || stoat ? stand(plan, now, 0.6) : sitPose(plan, kind);
            const tl = track(Math.min(1, c.t / 900), [
                { at: 0, v: 0 },
                { at: 0.35, v: 1, ease: backOut },
                { at: 1, v: 1 },
            ]);
            p.tilt = 0.42 * tl;
            p.yaw = 0.55 * tl;
            p.ear = 0.7;
            p.hdy += 0.6 * tl;
            return p;
        }

        case 'sit': {
            // A stoat does not sit so much as sit *up*: on its haunches,
            // body vertical, looking about. It is the thing they are
            // famous for, and a stoat in a dog's sit just looks hunched.
            if (stoat) return periscope(plan, now);
            const p = sitPose(plan, kind);
            p.breath = wave(now, 3400);
            p.sy += wave(now, 3400) * 0.15;
            if (cat) p.tailCurl += wave(now, 2900) * 0.15;
            return p;
        }

        case 'lie': {
            const p = liePose(plan, kind);
            p.breath = wave(now, 3800);
            p.sy += wave(now, 3800) * 0.2;
            return p;
        }

        case 'sleep': {
            // Curled up: the lie, with the head brought down onto the
            // forepaws, the back rounded, and the tail drawn round the body.
            const p = liePose(plan, kind);
            const b = wave(now, 4600);
            p.breath = b * 1.4;
            p.sy += b * 0.25;
            p.arch = 1.6;
            p.hdx = plan.head.dx * 0.95 + 1.2;
            p.hdy = plan.skull.ry + 1.2 - p.sy;
            p.pitch = -0.18;
            p.eye = 0;
            p.ear = -0.35;
            p.fnx -= 1.5;
            p.ffx -= 2.5;
            p.tailA = -0.5;
            p.tailCurl = cat ? -0.5 : -0.38;
            return p;
        }

        case 'bellyUp': {
            // On its back, legs in the air: rolled by flipping the rig and
            // resting the topline on the ground.
            const p = standPose(plan);
            const top = plan.shoulder[1] + plan.chest.dy + plan.chest.ry;
            p.roll = -1;
            p.ty = top - 0.5;
            p.sy = plan.shoulder[1] - 0.5;
            const pad = plan.fore[0] * 0.55;
            const kick = wave(now, 900) * 0.8;
            p.fnx = p.sx + 2.5;
            p.fny = pad + kick;
            p.ffx = p.sx + 0.5;
            p.ffy = pad + 1.2 - kick;
            p.hnx = p.hx + 3;
            p.hny = pad + 0.5 - kick;
            p.hfx = p.hx + 1.5;
            p.hny = pad;
            p.hock = 0.9;
            p.yaw = 0.55;
            p.happy = 1;
            p.jaw = dog ? 0.35 : 0.1;
            p.tongue = dog ? 1 : 0;
            p.tailWag = wave(now, 300) * 0.5;
            return p;
        }

        /* --- going somewhere ------------------------------------------ */
        case 'walk': {
            if (stoat) return bound(plan, c, 0.6);
            const base = stand(plan, now, 0.5);
            const g = applyGait(base, WALK, c.gait, strideFor(WALK, c.speed, 40));
            const bob = Math.cos(c.gait * TAU * 2) * 0.45;
            g.sy += bob;
            g.hy += Math.cos(c.gait * TAU * 2 + 0.7) * 0.4;
            g.hdy += Math.cos(c.gait * TAU * 2 - 0.9) * 0.4;
            g.tailWag = Math.sin(c.gait * TAU) * (dog ? 0.25 : 0.12);
            if (cat) {
                g.tailA = 0.35;
                g.tailCurl = 0.55;
            }
            return g;
        }

        case 'trot': {
            if (stoat) return bound(plan, c, 0.9);
            const base = stand(plan, now, 0.5);
            const g = applyGait(base, TROT, c.gait, strideFor(TROT, c.speed, 92));
            g.sy += Math.cos(c.gait * TAU * 2) * 0.8 - 0.4;
            g.hy += Math.cos(c.gait * TAU * 2 + 0.4) * 0.7 - 0.4;
            g.hdx += 0.8;
            g.hdy -= 0.6;
            g.ear = 0.4;
            g.tailA += dog ? 0.5 : 0.6;
            g.tailWag = Math.sin(c.gait * TAU) * 0.2;
            return g;
        }

        case 'run': {
            if (stoat) return bound(plan, c, 1.25);
            const base = stand(plan, now, 0.3);
            const g = applyGait(base, GALLOP, c.gait, strideFor(GALLOP, c.speed, 165));
            const ph = c.gait * TAU;
            // The spine flexes: bunched as the hind feet come through,
            // stretched out as they push off.
            const flex = Math.cos(ph - 0.4);
            g.sx += flex * 1.6;
            g.hx -= flex * 1.6;
            g.sy += Math.sin(ph) * 1.0 - 0.6;
            g.hy += Math.sin(ph + Math.PI) * 1.0 - 0.6;
            g.ty = Math.max(0, Math.sin(ph - 1.2)) * 2.4;
            g.hdx += 1.6;
            g.hdy -= 1.8;
            g.pitch = -0.08;
            g.ear = -0.6;
            g.tailA = dog ? -0.2 : cat ? 0.1 : 0.2;
            g.tailCurl = 0.1;
            g.tailWag = Math.sin(ph) * 0.1;
            g.jaw = dog ? 0.35 : 0;
            g.tongue = dog ? 0.8 : 0;
            return g;
        }

        case 'stalk': {
            // Low, slow, intent. When it stops it wiggles its back end,
            // which is the half-second before a pounce.
            const base = crouch(stand(plan, now, 0.3), plan.shoulder[1] * 0.3);
            const moving = c.speed > 4;
            const g = moving
                ? applyGait(base, WALK, c.gait, strideFor(WALK, c.speed, 30) * 0.7)
                : base;
            g.hdx += 1.8;
            g.hdy -= plan.head.dy * 0.35;
            g.pitch = -0.05;
            g.ear = 1;
            g.tailA = cat ? -0.2 : dog ? -0.4 : 0.1;
            g.tailCurl = 0.2 + (cat ? wave(now, 380) * 0.3 : 0);
            if (!moving) g.hx += wave(now, 170) * 0.7;
            return g;
        }

        case 'pounce': {
            // The leap itself is physics in DesktopPet; this is only the
            // shape of a cat in the air: stretched out going up, forepaws
            // reaching down for the landing on the way down.
            const p = standPose(plan);
            const up = clamp(c.vy / 420, -1, 1);
            p.fnx += 5.5 - Math.max(0, -up) * 1.5;
            p.ffx += 4.5;
            p.fny += 3.4 + up * 1.5;
            p.ffy += 2.6 + up * 1.2;
            p.hnx -= 3.2;
            p.hfx -= 3.8;
            p.hny += 1.8;
            p.hfy += 1.2;
            p.hock = 0.6;
            p.rot = up * 0.28;
            p.ear = 1;
            p.tailA = 0.1 - up * 0.4;
            p.tailCurl = 0.1;
            p.pitch = -up * 0.15;
            return p;
        }

        /* --- small business ------------------------------------------- */
        case 'sniff': {
            const p = stand(plan, now, 0.5);
            const low = plan.shoulder[1] * 0.55;
            p.hdy = -low + plan.head.dy * 0.2;
            p.hdx = plan.head.dx + 1.2 + wave(now, 1300) * 1.2;
            p.pitch = -0.45;
            p.jaw = Math.max(0, wave(now, 160)) * 0.08;
            p.tailWag = dog ? wave(now, 700) * 0.2 : 0;
            p.ear = 0.3;
            return p;
        }

        case 'dig': {
            const p = stand(plan, now, 0.5);
            const fast = wave(now, 180);
            p.sy -= 2;
            p.hdy -= 4;
            p.hdx += 1;
            p.pitch = -0.4;
            p.fnx += 2 + fast * 2.2;
            p.fny = Math.max(0, fast) * 2.5;
            p.ffx += 1 - fast * 2.2;
            p.ffy = Math.max(0, -fast) * 2.5;
            p.tailA += 0.8;
            p.tailWag = wave(now, 260) * 0.25;
            return p;
        }

        case 'groom': {
            if (cat) {
                // Sit, lift a forepaw, lick it, draw it over the face.
                const p = sitPose(plan, kind);
                const lick = wave(now, 420);
                p.fnx = p.sx + 3.2;
                p.fny = plan.fore[0] * 0.95 + Math.max(0, lick) * 1.2;
                p.hdx -= 0.8;
                p.hdy -= 1.4;
                p.pitch = -0.35 + lick * 0.1;
                p.jaw = Math.max(0, lick) * 0.25;
                p.eye = 0.4;
                return p;
            }
            // Dog and stoat: nose down to the shoulder.
            const p = stand(plan, now, 0.5);
            p.hdx = plan.head.dx * 0.3;
            p.hdy = plan.head.dy * 0.15;
            p.pitch = -0.7;
            p.yaw = 0.4;
            p.jaw = Math.max(0, wave(now, 300)) * 0.3;
            p.eye = 0.4;
            return p;
        }

        case 'scratch': {
            // Sit, and kick a hind foot up behind the ear, fast.
            const p = sitPose(plan, kind);
            const k = wave(now, 110);
            p.hnx = p.hx + plan.hind[0] * 0.9 + k * 0.8;
            p.hny = plan.hind[0] * 0.9 + k * 1.2;
            p.hock = 0.9;
            p.tilt = -0.32;
            p.pitch = 0.15;
            p.eye = 0.35;
            p.jaw = dog ? 0.2 : 0;
            return p;
        }

        case 'stretch': {
            // The play bow: forelegs out flat, rear up, tail up.
            const p = standPose(plan);
            const s = track(Math.min(1, c.t / 700), [
                { at: 0, v: 0 },
                { at: 1, v: 1, ease: easeInOut },
            ]);
            const reach = plan.fore[0] + plan.fore[1] * 0.85;
            p.sy = lerp(p.sy, plan.foreR[0] + 2.2, s);
            p.sx = lerp(p.sx, p.sx + 1.2, s);
            p.fnx = lerp(p.fnx, p.sx + reach, s);
            p.ffx = lerp(p.ffx, p.sx + reach - 1.4, s);
            p.hy += s * 1.2;
            p.hdy = lerp(p.hdy, plan.head.dy * 0.55, s);
            p.hdx = lerp(p.hdx, plan.head.dx + 2, s);
            p.pitch = 0.1 * s;
            p.jaw = s * Math.max(0, wave(c.t, 1400, -1.2)) * 0.8;
            p.eye = 1 - s * 0.7;
            p.tailA += s * 1.1;
            return p;
        }

        case 'yawn': {
            const p = dog || stoat ? stand(plan, now, 0.3) : sitPose(plan, kind);
            const open = track(prog || Math.min(1, c.t / 1200), [
                { at: 0, v: 0 },
                { at: 0.3, v: 1, ease: easeOut },
                { at: 0.55, v: 1 },
                { at: 1, v: 0, ease: easeIn },
            ]);
            p.jaw = open;
            p.pitch = open * 0.35;
            p.eye = 1 - open;
            p.ear = -open * 0.6;
            p.tongue = dog ? open * 0.4 : 0;
            return p;
        }

        case 'tailChase': {
            // Round and round after its own tail: a fast trot in place with
            // the head turned back. The facing flips are DesktopPet's.
            const base = stand(plan, now, 0.3);
            const g = applyGait(base, TROT, (now / 380) % 1, 14);
            g.hdx = -plan.head.dx * 0.15;
            g.yaw = 0.85;
            g.tilt = 0.3;
            g.tailA = 0.6;
            g.tailCurl = 0.9;
            g.jaw = dog ? 0.4 : 0.1;
            g.arch = -1;
            return g;
        }

        case 'dance': {
            if (stoat) return warDance(plan, now);
            if (cat) {
                // Kneading: sitting, treading the forepaws alternately.
                const p = sitPose(plan, kind);
                const k = wave(now, 520);
                p.fny = Math.max(0, k) * 1.6;
                p.ffy = Math.max(0, -k) * 1.6;
                p.eye = 0.3;
                p.happy = 1;
                return p;
            }
            // The dog: play bows, bounced.
            const p = standPose(plan);
            const b = Math.abs(wave(now, 900));
            const reach = plan.fore[0] + plan.fore[1] * 0.8;
            p.sy = lerp(plan.foreR[0] + 3, plan.shoulder[1], b);
            p.fnx = p.sx + lerp(reach, 1, b);
            p.ffx = p.sx + lerp(reach - 1.4, 0, b);
            p.ty = b * 2;
            p.tailA += 1;
            p.tailWag = wave(now, 260) * 0.5;
            p.jaw = 0.4;
            p.tongue = 0.7;
            p.happy = 1;
            return p;
        }

        case 'eat': {
            const p = stand(plan, now, 0.3);
            const dive = track(prog || Math.min(1, c.t / 1500), [
                { at: 0, v: 0 },
                { at: 0.18, v: 1, ease: easeIn },
                { at: 0.82, v: 1 },
                { at: 1, v: 0, ease: easeOut },
            ]);
            const ground = plan.skull.ry + 0.4 - plan.shoulder[1];
            p.hdy = lerp(p.hdy, ground, dive);
            p.hdx = lerp(p.hdx, plan.head.dx + 2.4, dive);
            p.pitch = -0.55 * dive;
            p.jaw = dive > 0.6 ? Math.abs(wave(now, 230)) * 0.35 : 0;
            p.fnx += dive * 1.4;
            p.ffx -= dive * 1.2;
            p.tailWag = dog ? wave(now, 260) * 0.35 * dive : 0;
            return p;
        }

        /* --- reactions -------------------------------------------------- */
        case 'hop': {
            // The jump rig from petMotion: crouch, held apex, fast fall.
            const len = Math.max(1, c.len);
            const hops = Math.max(1, Math.round(len / 560));
            const hp = (prog * hops) % 1;
            const y = track(hp, JUMP_Y);
            const sy = track(hp, JUMP_SY);
            const base = stand(plan, now, 0);
            const p = crouch(base, Math.max(0, y) * 0.8 + (1 - sy) * 3);
            p.ty = Math.max(0, -y) * 0.85;
            const air = clamp(p.ty / 8, 0, 1);
            p.fny += air * 2.6;
            p.ffy += air * 2.2;
            p.fnx += air * 1.5;
            p.hny += air * 1.6;
            p.hfy += air * 1.2;
            p.ear = air > 0.3 ? -0.5 : 0.6;
            p.tailA += 0.9;
            p.tailWag = wave(now, 240) * 0.45;
            p.happy = 1;
            p.jaw = dog ? 0.4 : 0.15;
            p.tongue = dog ? 0.6 : 0;
            return p;
        }

        case 'trick':
            if (dog) return rollOver(plan, kind, prog);
            if (stoat) return warDance(plan, now);
            return slowBlink(plan, kind, prog, now);

        case 'dizzy': {
            const p = stand(plan, now, 0);
            const sway = wave(now, 700);
            p.tx = sway * 1.4;
            p.rot = sway * 0.05;
            p.fnx += 1.8;
            p.ffx -= 1.5;
            p.hnx += 1.2;
            p.hfx -= 2;
            p.tilt = wave(now, 520) * 0.3;
            p.pitch = wave(now, 520, 1.6) * 0.2;
            p.eye = 0.5;
            p.ear = -0.3;
            p.jaw = dog ? 0.25 : 0;
            p.tongue = dog ? 0.6 : 0;
            return p;
        }

        case 'press': {
            // Reach out a forepaw and press the little Start button down:
            // fast approach, a hold while it's held down, a slower release.
            const p = stand(plan, now, 0.3);
            const d = track(prog, PRESS);
            p.sx += d * 1.2;
            p.sy -= Math.max(0, d) * 1.4;
            p.fnx = p.sx + 3.4 + d * 1.6;
            p.fny = Math.max(0, 1 - d) * 3.2 + Math.max(0, d) * 0.4;
            p.hdx += 0.8;
            p.hdy -= 1.6 * Math.max(0, d);
            p.pitch = -0.4 * Math.max(0, d);
            p.ear = 0.6;
            return p;
        }

        case 'heart': {
            const p = sitPose(plan, kind);
            const s = Math.min(1, c.t / 260);
            p.yaw = 0.6 * s;
            p.happy = 1;
            p.ear = -0.4;
            p.tilt = wave(now, 1300) * 0.12;
            p.tailWag = dog ? wave(now, 220) * 0.55 : cat ? wave(now, 900) * 0.2 : wave(now, 400) * 0.3;
            if (cat) {
                p.tailA = -0.2;
                p.tailCurl = 0.9;
            }
            return p;
        }

        case 'cool': {
            const p = sitPose(plan, kind);
            const s = Math.min(1, c.t / 380);
            p.pitch = 0.22 * s;
            p.yaw = 0.35 * s;
            p.hdy += 0.5;
            p.tilt = -0.05 + wave(now, 1700) * 0.04;
            return p;
        }

        case 'yap': {
            if (cat) {
                // A single long meow, head up.
                const p = sitPose(plan, kind);
                const m = track(prog, [
                    { at: 0, v: 0 },
                    { at: 0.15, v: 0.7, ease: easeOut },
                    { at: 0.6, v: 0.5 },
                    { at: 0.8, v: 0, ease: easeIn },
                    { at: 1, v: 0 },
                ]);
                p.jaw = m;
                p.pitch = 0.3 * Math.min(1, prog * 5);
                p.eye = 0.6;
                return p;
            }
            // Barking: braced, head forward, a jolt on every bark.
            const p = stand(plan, now, 0);
            const bark = Math.max(0, Math.sin((c.t / 260) * TAU));
            p.jaw = bark * 0.8;
            p.sx -= bark * 0.6;
            p.sy -= bark * 0.5;
            p.hdx += 1 + bark * 0.6;
            p.pitch = 0.1 + bark * 0.1;
            p.ear = 0.8;
            p.fnx += 1.2;
            p.ty = stoat ? Math.max(0, Math.sin((c.t / 260) * TAU)) * 2.2 : 0;
            p.tailA += 0.6;
            p.tailWag = wave(now, 260) * 0.3;
            return p;
        }

        case 'sing': {
            // A howl: sitting, nose to the ceiling.
            const p = stoat ? periscope(plan, now) : sitPose(plan, kind);
            const s = track(Math.min(1, c.t / 450), [
                { at: 0, v: 0 },
                { at: 1, v: 1, ease: sineOut },
            ]);
            p.pitch = 0.95 * s;
            p.hdx -= 1.2 * s;
            p.hdy += 1.4 * s;
            p.jaw = 0.55 * s + wave(now, 600) * 0.08 * s;
            p.eye = 1 - s;
            p.ear = -0.6 * s;
            return p;
        }

        case 'speechless': {
            // Nothing. No breath, no blink, no tail. The stillest the
            // creature ever is, which next to everything else is the joke.
            const p = standPose(plan);
            p.ear = 0.6;
            p.yaw = 0.3;
            p.hdy += 0.8;
            return p;
        }

        case 'worry': {
            const p = crouch(stand(plan, now, 0), plan.shoulder[1] * 0.22);
            const shiver = wave(now, 90);
            p.tx = shiver * 0.35;
            p.hdy -= 2;
            p.hdx -= 0.6;
            p.ear = -1;
            p.tailA = -1.5;
            p.tailCurl = -0.4;
            p.yaw = 0.25;
            return p;
        }

        /* --- the world ---------------------------------------------- */
        case 'climb': {
            const base = stand(plan, now, 0.3);
            const g = applyGait(base, WALK, c.gait, 18, 0.9);
            g.rot = Math.PI / 2;
            g.sy -= 1.2;
            g.hy -= 1.2;
            g.tailA = -0.15;
            g.tailCurl = 0;
            g.ear = 0.3;
            return g;
        }

        case 'cling':
        case 'clingNap': {
            const nap = clip === 'clingNap';
            const p = stand(plan, now, nap ? 1.2 : 0.6);
            p.rot = Math.PI / 2;
            p.sy -= 1.6;
            p.hy -= 1.6;
            p.fnx += 1;
            p.ffx += 2;
            p.hnx -= 0.6;
            p.yaw = nap ? 0.2 : 0.65;
            p.pitch = nap ? -0.25 : -0.1;
            p.eye = nap ? 0 : 1;
            p.ear = nap ? -0.3 : 0.3;
            p.tailA = -0.1;
            p.tailCurl = 0;
            p.tailWag = wave(now, 2400) * 0.1;
            return p;
        }

        case 'dangle': {
            // Held by the scruff: body hanging below the hand, legs straight
            // down under gravity, paddling a little.
            const p = standPose(plan);
            const rot = 1.32;
            p.rot = rot;
            if (cat || stoat) p.hx -= 3; // cats and stoats go long
            // World-down, expressed in rig space.
            const dx = -Math.sin(rot);
            const dy = -Math.cos(rot);
            const paddle = wave(now, 520);
            const fl = (plan.fore[0] + plan.fore[1] + plan.fore[2]) * 0.92;
            const hl = (plan.hind[0] + plan.hind[1] + plan.hind[2]) * 0.92;
            p.fnx = p.sx + dx * fl + paddle * 1.2;
            p.fny = p.sy + dy * fl;
            p.ffx = p.sx + dx * fl * 0.96 - paddle * 1.2;
            p.ffy = p.sy + dy * fl * 0.96;
            p.hnx = p.hx + dx * hl - paddle;
            p.hny = p.hy + dy * hl;
            p.hfx = p.hx + dx * hl * 0.96 + paddle;
            p.hfy = p.hy + dy * hl * 0.96;
            p.hock = 1.1;
            p.tailA = -0.05;
            p.tailCurl = -0.1;
            p.yaw = 0.45;
            p.pitch = -0.5;
            p.ear = -0.2;
            // Pin the scruff to the origin, which is where the pointer is.
            const scx = p.sx - 1.5;
            const scy = p.sy + plan.neck.r0 * 0.6;
            const cr = Math.cos(rot);
            const sr = Math.sin(rot);
            p.tx = -(scx * cr - scy * sr);
            p.ty = -(scx * sr + scy * cr);
            return p;
        }

        case 'tumble': {
            const p = standPose(plan);
            const rot = (c.spin * Math.PI) / 180;
            p.rot = rot;
            // Legs flung out, as if reaching for a floor that is not there.
            p.fnx += 3.5;
            p.fny += 3;
            p.ffx += 2;
            p.ffy += 2;
            p.hnx -= 3;
            p.hny += 2.6;
            p.hfx -= 2;
            p.hfy += 1.6;
            p.ear = -0.8;
            p.tailA = 0.3;
            p.eye = 0.9;
            // Turn about the middle of the body, not about the feet.
            const cy = plan.shoulder[1] * 0.85;
            const cr = Math.cos(rot);
            const sr = Math.sin(rot);
            p.tx = -(0 * cr - cy * sr);
            p.ty = cy - (0 * sr + cy * cr);
            return p;
        }

        case 'ledgeSit': {
            const p = sitPose(plan, kind);
            p.pitch = -0.32;
            p.hdx += 0.8;
            p.breath = wave(now, 3400);
            p.tailA = -1.2;
            p.tailCurl = 0.1;
            return p;
        }

        default:
            return stand(plan, now);
    }
}

/** The stoat's party piece: up on its hind legs, looking about. */
function periscope(plan: Plan, now: number): QPose {
    const p = standPose(plan);
    const rot = 1.18;
    p.rot = rot;
    // Stand on the hind feet: pivot the body about them.
    const pivotX = p.hx;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    p.tx = pivotX - (pivotX * cr);
    p.ty = -(pivotX * sr);
    // Forepaws tucked up against the chest.
    p.fnx = p.sx + 2;
    p.fny = 3.2;
    p.ffx = p.sx + 1;
    p.ffy = 3.6;
    // Hind feet planted — in world terms, under the pivot.
    p.hnx = p.hx + 1.5;
    p.hny = 0.3;
    p.hfx = p.hx + 0.4;
    p.hock = 0.4;
    // Head level despite the body being upright.
    p.pitch = -rot * 0.85 + wave(now, 2200) * 0.1;
    p.hdx = plan.head.dx * 0.7;
    p.hdy = plan.head.dy * 0.4;
    p.yaw = Math.max(0, wave(now, 3000)) * 0.6;
    p.ear = 1;
    // The tail trails out behind along the ground. The whole rig is turned
    // up by `rot`, so "back and down" in the world is this far round from
    // straight back in the rig's own space.
    p.tailA = 0.95;
    p.tailCurl = -0.18;
    return p;
}

/** Bounding, for the stoat: back arched as the hind feet come forward. */
function bound(plan: Plan, c: ClipCtx, energy: number): QPose {
    const base = standPose(plan);
    const g = applyGait(base, BOUND, c.gait, strideFor(BOUND, c.speed, 70) * energy);
    const ph = c.gait * TAU;
    const gather = (Math.cos(ph) + 1) / 2; // 1 when the feet are together
    g.arch = gather * 3.4 * energy;
    g.sx -= gather * 2.2 * energy;
    g.hx += gather * 2.2 * energy;
    g.ty = Math.max(0, Math.sin(ph + 0.4)) * 2 * energy;
    g.hdy += gather * 1.2;
    g.tailA = 0.3 + gather * 0.4;
    g.tailCurl = -0.1;
    g.pitch = -0.1 + gather * 0.15;
    return g;
}

/** The weasel war dance: sideways hops with the back up, all at once. */
function warDance(plan: Plan, now: number): QPose {
    const p = standPose(plan);
    const hop = Math.abs(Math.sin((now / 210) * Math.PI));
    p.ty = hop * 5;
    p.arch = 3.5;
    p.sx -= 2;
    p.hx += 2;
    p.rot = Math.sin((now / 420) * Math.PI) * 0.25;
    p.fny += hop * 2;
    p.hny += hop * 1.4;
    p.jaw = 0.5;
    p.tailA = 0.9;
    p.tailCurl = -0.3;
    p.yaw = 0.3 + hop * 0.3;
    return p;
}

/** The dog's trick: down, over onto its back, over again, and up. */
function rollOver(plan: Plan, kind: QuadrupedId, p: number): QPose {
    const lie = liePose(plan, kind);
    const up = standPose(plan);
    if (p < 0.18) return blendPose(up, lie, smooth(p / 0.18));
    if (p > 0.85) return blendPose(lie, up, smooth((p - 0.85) / 0.15));
    const q = (p - 0.18) / 0.67;
    let roll = Math.cos(q * TAU);
    // Never quite edge-on: the frame where it would be a paper-thin line
    // is skipped, the way an animator would cut on the turn.
    if (Math.abs(roll) < 0.5) roll = roll < 0 ? -0.5 : 0.5;
    const back = { ...lie };
    back.roll = roll;
    const top = plan.shoulder[1] + plan.chest.dy + plan.chest.ry;
    back.ty = roll < 0 ? (top - lie.sy * 0.4) * -roll * 0.7 : 0;
    back.fny += roll < 0 ? 3 : 0;
    back.hny += roll < 0 ? 3 : 0;
    back.happy = 1;
    back.jaw = 0.35;
    back.tongue = 1;
    back.tailWag = Math.sin(q * TAU * 3) * 0.4;
    return back;
}

/** The cat's trick: a slow blink, sitting, face on. */
function slowBlink(plan: Plan, kind: QuadrupedId, p: number, now: number): QPose {
    const s = sitPose(plan, kind);
    s.yaw = track(p, [
        { at: 0, v: 0 },
        { at: 0.2, v: 1, ease: easeOut },
        { at: 0.85, v: 1 },
        { at: 1, v: 0.3, ease: easeIn },
    ]);
    s.eye = track(p, [
        { at: 0, v: 1 },
        { at: 0.3, v: 1 },
        { at: 0.5, v: 0, ease: easeInOut },
        { at: 0.65, v: 0 },
        { at: 0.85, v: 1, ease: easeInOut },
        { at: 1, v: 1 },
    ]);
    s.happy = p > 0.85 ? 1 : 0;
    s.breath = wave(now, 3400);
    s.tailCurl += 0.3;
    return s;
}

/* -------------------------------------------------------------------------
 * The fish
 * ---------------------------------------------------------------------- */

function bettaClip(clip: Clip, c: ClipCtx): BettaPose {
    const { now, p: prog } = c;
    const p = bettaRest();
    // Always: pectorals going, fins rippling, a slow bob.
    p.pec = now / 70;
    p.wave = now / 260;
    p.phase = now / 380;
    p.hover = 12 + wave(now, 2600) * 0.8;
    p.gill = Math.max(0, wave(now, 1500));

    switch (clip) {
        case 'walk':
        case 'trot':
        case 'run':
        case 'stalk': {
            const fast = clip === 'run' ? 1 : clip === 'trot' ? 0.75 : 0.45;
            p.phase = c.gait * TAU * 2;
            p.amp = 0.6 + fast * 0.6;
            p.flare = 1 - fast * 0.15;
            p.rot = wave(now, 1800) * 0.05;
            p.hover = 12 + wave(now, 1800, 1) * 1.4;
            return p;
        }

        case 'sit':
        case 'lie':
        case 'ledgeSit':
        case 'watch':
            p.hover = clip === 'watch' ? 11 : 5.5;
            p.rot = clip === 'ledgeSit' ? -0.12 : -0.05;
            p.amp = 0.2;
            p.flare = 0.9;
            return p;

        case 'sleep':
        case 'clingNap':
            p.hover = clip === 'sleep' ? 4.6 : 6;
            p.rot = clip === 'sleep' ? -0.14 : Math.PI / 2;
            p.amp = 0.1;
            p.phase = now / 900;
            p.wave = now / 700;
            p.pec = now / 260;
            p.flare = 0.82;
            p.eye = 0.4;
            p.gill = Math.max(0, wave(now, 2600)) * 0.6;
            return p;

        case 'eat':
        case 'sniff':
        case 'dig': {
            // Nose down, nibbling.
            const nib = Math.abs(wave(now, 280));
            p.hover = 8;
            p.rot = -0.35;
            p.mouth = nib;
            p.tx = nib * 0.8;
            p.amp = 0.5;
            return p;
        }

        case 'hop':
        case 'heart':
        case 'dance': {
            const s = wave(now, 520);
            p.rot = s * 0.25;
            p.hover = 13 + Math.abs(s) * 3;
            p.amp = 1;
            p.flare = 1.15;
            return p;
        }

        case 'cool':
        case 'perk':
        case 'stretch': {
            // Flaring: every fin out as far as it goes. It is what a betta
            // does to look impressive, and it works.
            const s = Math.min(1, c.t / 400);
            p.flare = 1 + 0.32 * s;
            p.amp = 0.25;
            p.gill = s;
            return p;
        }

        case 'yap':
        case 'sing': {
            p.mouth = Math.abs(wave(now, clip === 'sing' ? 600 : 220));
            p.rot = clip === 'sing' ? 0.25 : 0.05;
            return p;
        }

        case 'yawn':
            p.mouth = track(prog || Math.min(1, c.t / 1200), [
                { at: 0, v: 0 },
                { at: 0.3, v: 1, ease: easeOut },
                { at: 0.6, v: 1 },
                { at: 1, v: 0 },
            ]);
            p.flare = 1.15;
            return p;

        case 'speechless':
            p.amp = 0;
            p.phase = 0;
            p.wave = 0;
            p.pec = 0;
            p.hover = 12;
            return p;

        case 'worry': {
            p.flare = 0.66;
            p.tx = wave(now, 90) * 0.4;
            p.amp = 0.8;
            p.phase = now / 120;
            return p;
        }

        case 'trick': {
            // The barrel roll.
            let roll = Math.cos(prog * TAU);
            if (Math.abs(roll) < 0.3) roll = roll < 0 ? -0.3 : 0.3;
            p.roll = roll;
            p.hover = 14 + Math.sin(prog * Math.PI) * 4;
            p.amp = 0.9;
            return p;
        }

        case 'dizzy':
        case 'tailChase': {
            let roll = Math.cos(now / 160);
            if (Math.abs(roll) < 0.3) roll = roll < 0 ? -0.3 : 0.3;
            p.roll = clip === 'dizzy' ? roll : 1;
            p.rot = wave(now, 600) * 0.3;
            p.amp = 1;
            return p;
        }

        case 'press':
        case 'scratch':
        case 'groom':
        case 'pounce': {
            const d = clip === 'press' ? track(prog, PRESS) : Math.abs(wave(now, 400));
            p.tx = d * 3;
            p.mouth = Math.max(0, d) * 0.6;
            p.amp = 0.6;
            return p;
        }

        case 'climb':
            p.rot = Math.PI / 2;
            p.hover = 7;
            p.phase = c.gait * TAU * 2;
            p.amp = 0.9;
            return p;

        case 'cling':
            p.rot = Math.PI / 2;
            p.hover = 7;
            p.amp = 0.3;
            return p;

        case 'dangle':
            // Out of the water, flapping.
            p.rot = 1.15;
            p.hover = -2;
            p.phase = now / 70;
            p.amp = 1.6;
            p.flare = 1.1;
            p.mouth = Math.abs(wave(now, 300));
            return p;

        case 'tumble':
            p.rot = (c.spin * Math.PI) / 180;
            p.hover = 8;
            p.flare = 1.2;
            p.amp = 0.5;
            return p;

        case 'bellyUp':
            p.roll = -1;
            p.hover = 7;
            p.amp = 0.2;
            return p;

        default:
            return p;
    }
}

/* -------------------------------------------------------------------------
 * The animator
 * ---------------------------------------------------------------------- */

export interface AnimInput {
    clip: Clip;
    /** 0..1 progress for a timed clip. */
    p: number;
    /** Length of a timed clip, ms. */
    len: number;
    /** Distance moved since the last update, px (gait advances by this). */
    moved: number;
    speed: number;
    vy: number;
    spin: number;
    squash: number;
    facing: 1 | -1;
    /**
     * What it is looking at, relative to its own head, in world px with y
     * up. Null when there is nothing worth looking at.
     */
    look: { dx: number; dy: number } | null;
    /** Overrides for the moment: alarm widens the eyes; happy narrows them. */
    alarm?: boolean;
    happy?: boolean;
    /** No ambient motion — prefers-reduced-motion. */
    reduced?: boolean;
}

/** Clips where the animal is free to turn its head toward something. */
const ATTENTIVE = new Set<Clip>([
    'stand', 'walk', 'trot', 'sit', 'lie', 'perk', 'watch', 'stalk',
    'cling', 'ledgeSit', 'heart', 'cool', 'sniff',
]);

/** Clips where the eyes are under the clip's control, not the blink's. */
const NO_BLINK = new Set<Clip>(['sleep', 'clingNap', 'speechless', 'yawn', 'trick', 'sing']);

export class Animator {
    readonly kind: PetKind;
    private gait = 0;
    private clip: Clip = 'stand';
    private clipAt = 0;
    private from: Pose | null = null;
    private fromAt = 0;
    private fromLen = 160;
    private last: Pose | null = null;
    private nextBlink = 0;
    private blinkUntil = 0;
    private lookYaw = 0;
    private lookPitch = 0;
    private lookX = 0;
    private facing: 1 | -1 = 1;
    private turnUntil = 0;
    /** Seconds since the last update, for framerate-independent easing. */
    private dt = 1 / 60;
    private lastAt = 0;

    constructor(kind: PetKind) {
        this.kind = kind;
    }

    /** The clip currently showing. */
    current(): Clip {
        return this.clip;
    }

    update(now: number, input: AnimInput): Pose {
        this.dt = this.lastAt ? clamp((now - this.lastAt) / 1000, 0, 0.1) : 1 / 60;
        this.lastAt = now;
        // Turning round. A sprite that mirrors in a single frame reads as a
        // glitch; one whose head comes round to face you for an instant
        // while the body flips reads as a creature turning. The cheapest
        // in-between there is.
        if (input.facing !== this.facing) {
            this.facing = input.facing;
            if (!input.reduced) this.turnUntil = now + 150;
        }
        if (input.clip !== this.clip) {
            // Blend out of whatever was on screen, rather than out of the
            // clip's idea of where it starts.
            this.from = this.last;
            this.fromAt = now;
            this.fromLen =
                input.clip === 'tumble' || input.clip === 'dangle' || input.clip === 'pounce'
                    ? 90
                    : this.clip === 'sleep' || input.clip === 'sleep'
                    ? 420
                    : 180;
            this.clip = input.clip;
            this.clipAt = now;
        }

        // Distance drives the gait, so feet never skate. Capped per frame
        // so a stalled tab coming back does not spin the legs.
        const stride =
            this.kind === 'pixel'
                ? 26
                : input.clip === 'run'
                ? GALLOP.stride
                : input.clip === 'trot'
                ? TROT.stride
                : input.clip === 'climb'
                ? 18
                : WALK.stride;
        this.gait = (this.gait + Math.min(12, input.moved) / stride) % 1;

        const ctx: ClipCtx = {
            now: input.reduced ? 0 : now,
            t: now - this.clipAt,
            p: input.p,
            len: input.len,
            gait: this.gait,
            speed: input.speed,
            spin: input.spin,
            squash: input.squash,
            vy: input.vy,
        };

        let pose: Pose =
            this.kind === 'pixel'
                ? bettaClip(input.clip, ctx)
                : quadClip(this.kind, input.clip, ctx);

        if (this.kind !== 'pixel') {
            pose = this.alive(pose as QPose, now, input);
            if (now < this.turnUntil) {
                const q = pose as QPose;
                pose = { ...q, yaw: Math.max(q.yaw, 0.9) };
            }
        } else {
            const b = pose as BettaPose;
            if (input.look && ATTENTIVE.has(input.clip)) {
                const toward = input.look.dx * input.facing > 0 ? 1 : -1;
                this.lookX = approach(this.lookX, toward, this.dt, 0.2);
                b.lookX = this.lookX;
            }
            if (input.squash > 0) b.hover -= input.squash * 3;
        }

        if (this.from) {
            const t = (now - this.fromAt) / this.fromLen;
            if (t >= 1) {
                this.from = null;
            } else {
                const e = easeInOut(clamp(t, 0, 1));
                pose =
                    this.kind === 'pixel'
                        ? blendBetta(this.from as BettaPose, pose as BettaPose, e)
                        : blendPose(this.from as QPose, pose as QPose, e);
            }
        }
        this.last = pose;
        return pose;
    }

    /** Blinking, attention and the landing squash, on top of any clip. */
    private alive(p: QPose, now: number, input: AnimInput): QPose {
        const out = { ...p };

        // A landing absorbs into the legs rather than squashing the sprite.
        if (input.squash > 0) {
            const d = input.squash * 3.2;
            out.sy -= d;
            out.hy -= d * 0.9;
            out.hdy -= d * 0.4;
            out.ear = Math.min(out.ear, -input.squash);
        }

        // Blinks: every few seconds, sometimes twice.
        if (!NO_BLINK.has(input.clip) && !input.reduced) {
            if (now > this.nextBlink) {
                this.blinkUntil = now + 120;
                this.nextBlink =
                    now + (Math.random() < 0.18 ? 260 : 2400 + Math.random() * 4200);
            }
            if (now < this.blinkUntil && out.eye > 0.6) out.eye = 0.1;
        }
        if (input.alarm) out.happy = 0;
        if (input.happy) out.happy = Math.max(out.happy, 1);

        // Attention: turn the head toward the target, and if it is close and
        // above, toward the viewer. Eased, so it arrives rather than snaps.
        let yawT = 0;
        let pitchT = 0;
        let xT = 0;
        if (input.look && ATTENTIVE.has(input.clip) && !input.reduced) {
            const { dx, dy } = input.look;
            const fwd = dx * input.facing;
            const dist = Math.hypot(dx, dy);
            const near = clamp(1 - dist / 300, 0, 1);
            if (near > 0) {
                yawT = fwd > 0 ? near * 0.5 : near * 0.92;
                if (Math.abs(dx) < 46 && dy > 4) yawT = Math.max(yawT, 0.85);
                pitchT = clamp(Math.atan2(dy, Math.max(30, Math.abs(dx))) * 0.7, -0.4, 0.55) * Math.min(1, near * 2);
                xT = fwd > 0 ? 1 : -1;
            }
        }
        this.lookYaw = approach(this.lookYaw, yawT, this.dt, 0.12);
        this.lookPitch = approach(this.lookPitch, pitchT, this.dt, 0.12);
        this.lookX = approach(this.lookX, xT, this.dt, 0.2);
        out.yaw = Math.max(out.yaw, this.lookYaw);
        out.pitch += this.lookPitch * (1 - out.yaw * 0.4);
        out.lookX = this.lookX;
        return out;
    }
}

/** A single pose, for icons and previews: no animator, no blending. */
export function poseAt(kind: PetKind, clip: Clip, now: number, p = 0): Pose {
    const ctx: ClipCtx = { now, t: now, p, len: 1000, gait: (now / 600) % 1, speed: 40, spin: 0, squash: 0, vy: 0 };
    return kind === 'pixel' ? bettaClip(clip, ctx) : quadClip(kind, clip, ctx);
}
