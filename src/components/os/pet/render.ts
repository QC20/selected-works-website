/**
 * One call to draw a pet.
 * -----------------------
 * Everything else in this folder is parts. This is the assembly: build the
 * species' layers for a pose, shade and outline them, put the face on, add
 * whatever it is wearing, and run the species' own after-effects (Glitch's
 * misregistration, Static's sparks).
 *
 * The buffer is square and generous — 112px at scale 1 — because the creature
 * in it can be standing, rolled onto its back, or clinging to the side of a
 * window at ninety degrees, and re-allocating per pose would be both slower
 * and a source of off-by-one jitter. The rig's origin (the ground between
 * its feet) sits at a fixed point in it, `originOf`, which is what the
 * desktop pins to the creature's position.
 */

import {
    Frame,
    Fur,
    Layer,
    clearFrame,
    makeFrame,
    measure,
    renderLayers,
} from './raster';
import { Anchors, QPose, buildQuadruped, makeXf } from './quadruped';
import { QUADRUPEDS, QuadrupedId, decorateFace, glitchPass, sparkPass } from './species';
import { BettaPose, buildBetta, decorateBetta } from './betta';
import { AccessoryId, accessoryLayers } from './wardrobe';
import { HD_FACES, decorateFaceHD } from './faceHD';

/** From this scale up there is room for a drawn face rather than a stamped one. */
export const HD_FROM = 1.4;

export type PetKind = QuadrupedId | 'pixel';

/* -------------------------------------------------------------------------
 * Coats
 * ----------------------------------------------------------------------
 * Which fur each part of each animal wears. The collie is a long, silky
 * double coat that feathers at the chest, the breeches and the tail; the
 * tabby is short and dense; the ermine is as sleek as fur gets, except for
 * the brush at the end of its tail. Sizes are rig units, and none of it is
 * drawn below about 125% — see `Fur` in `raster.ts`.
 */
const COATS: Record<QuadrupedId, Record<string, Fur>> = {
    modem: {
        body: { grain: 0.16, len: 3.4, fuzz: 0.9, lean: 0.22, feather: 0.9, dir: -1 },
        tail: { grain: 0.24, len: 3.4, fuzz: 1.4, lean: 0.3, feather: 1 },
        head: { grain: 0.1, len: 2, fuzz: 0.3, feather: 0.5, dir: -1 },
        farEar: { grain: 0.1, len: 2, fuzz: 0.2 },
        nearHind: { grain: 0.12, len: 2.6, fuzz: 0.45, feather: 0.5 },
        nearFore: { grain: 0.1, len: 2.4, fuzz: 0.3, feather: 0.5 },
        farLegs: { grain: 0.08, len: 2.4, fuzz: 0.3, feather: 0.5 },
    },
    static: {
        body: { grain: 0.13, len: 2.2, fuzz: 0.3, lean: 0.15, feather: 0.45, dir: -1 },
        tail: { grain: 0.12, len: 2.2, fuzz: 0.35, feather: 0.4 },
        head: { grain: 0.08, len: 1.6, fuzz: 0.2, feather: 0.35, dir: -1 },
        farEar: { grain: 0.06, len: 1.6 },
        nearHind: { grain: 0.08, len: 2, fuzz: 0.15, feather: 0.3 },
        nearFore: { grain: 0.08, len: 2, fuzz: 0.15, feather: 0.3 },
        farLegs: { grain: 0.06, len: 2, fuzz: 0.1, feather: 0.3 },
    },
    glitch: {
        body: { grain: 0.08, len: 2.2, fuzz: 0.16, lean: 0.1, feather: 0.3, dir: -1 },
        tail: { grain: 0.14, len: 2.4, fuzz: 0.6, lean: 0.25, feather: 0.6 },
        head: { grain: 0.05, len: 1.6, fuzz: 0.1, dir: -1 },
        farEar: { grain: 0.04, len: 1.6 },
        nearHind: { grain: 0.06, len: 2, fuzz: 0.1 },
        nearFore: { grain: 0.06, len: 2, fuzz: 0.1 },
        farLegs: { grain: 0.05, len: 2, fuzz: 0.1 },
    },
};

/** The broad forms that catch light reflected up off the ground. */
const BROAD = new Set(['body', 'head']);

/** Buffer side at scale 1 — a rig unit per pixel. The desktop draws at `PET_SIZE`. */
export const ART = 112;

/**
 * The scale the art is designed to be seen at on the desktop.
 *
 * The rig's units are small on purpose — a collie is fifty-odd of them
 * long — and at one pixel each that is an animal the size of a taskbar
 * button, with two pixels for an eye. Drawn at two pixels a unit there is
 * room for fur, a lid and a catchlight. "100%" in the size menu means this.
 */
export const PET_SIZE = 2;

export function frameFor(scale: number): Frame {
    const n = Math.ceil(ART * scale);
    return makeFrame(n, n);
}

/** Where the rig's origin sits in a buffer of this size. */
export function originOf(f: Frame): [number, number] {
    return [Math.round(f.w / 2), Math.round(f.h * 0.68)];
}

export interface DrawInput {
    kind: PetKind;
    pose: QPose | BettaPose;
    facing: 1 | -1;
    scale: number;
    /** ms, for anything that shimmers or tears on its own clock. */
    time: number;
    accessory?: AccessoryId | null;
    /** Degrees the hat lags behind the head, from the spring in DesktopPet. */
    hatSwing?: number;
    /** 0..1: how corrupted Glitch looks right now. */
    glitch?: number;
    /** 0..1: how much static Static has built up. */
    charge?: number;
    /** Eyes wide — something has startled it. */
    alarm?: boolean;
    /** 0..1: how wide the cat's pupils are. */
    dilate?: number;
}

export interface Drawn {
    anchors: Anchors;
    /** Opaque bounds in the buffer, for hit-testing. */
    bbox: Frame['bbox'];
}

export function draw(f: Frame, input: DrawInput): Drawn {
    clearFrame(f);
    const [ox, oy] = originOf(f);

    if (input.kind === 'pixel') {
        const pose = input.pose as BettaPose;
        const built = buildBetta(pose, ox, oy, input.scale, input.facing, input.time);
        const extra = input.accessory
            ? accessoryLayers(input.accessory, built.anchors, input.scale, input.hatSwing ?? 0, input.time)
            : [];
        const all: Layer[] = [...built.layers, ...extra];
        for (const l of all) l.px = input.scale;
        renderLayers(f, all, built.shadowRim);
        decorateBetta(f, built, pose, input.facing);
        measure(f, 3);
        return { anchors: built.anchors, bbox: { ...f.bbox } };
    }

    const sp = QUADRUPEDS[input.kind];
    const pose = input.pose as QPose;
    const X = makeXf(ox, oy, input.scale, input.facing, pose.rot, pose.roll, pose.tx, pose.ty);
    const built = buildQuadruped(sp, pose, X);
    const extra = input.accessory
        ? accessoryLayers(input.accessory, built.anchors, input.scale, input.hatSwing ?? 0, input.time)
        : [];
    const coat = COATS[input.kind];
    for (const l of built.layers) {
        l.px = input.scale;
        l.fur = coat[l.name];
        l.bounce = BROAD.has(l.name);
    }
    for (const l of extra) l.px = input.scale;
    const layers: Layer[] = [...built.layers, ...extra];
    renderLayers(f, layers, sp.coat.shadowRim);

    const headLayers = built.layers
        .map((l, i) => (l.name === 'head' ? i : -1))
        .filter((i) => i >= 0);
    if (input.scale >= HD_FROM) {
        decorateFaceHD(f, HD_FACES[input.kind], built.anchors, pose, input.facing, headLayers, input.scale, {
            alarm: !!input.alarm,
            dilate: input.dilate ?? 0.15,
        });
    } else {
        decorateFace(f, sp.face, built.anchors, pose, input.facing, headLayers, input.alarm);
    }

    if (input.kind === 'glitch') glitchPass(f, input.time, input.glitch ?? 0);
    if (input.kind === 'static' && input.charge) sparkPass(f, input.time, input.charge);
    // Tearing can push a band of rows ten pixels sideways, and the sparks
    // jump off the top of the fur, so both need a wider look.
    measure(f, input.kind === 'glitch' ? 12 : input.kind === 'static' ? 6 : 3);
    return { anchors: built.anchors, bbox: { ...f.bbox } };
}
