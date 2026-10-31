/**
 * One call to draw a pet.
 * -----------------------
 * Everything else in this folder is parts. This is the assembly: build the
 * species' layers for a pose, shade and outline them, put the face on, add
 * whatever it is wearing, and run the species' own after-effects (Glitch's
 * misregistration, Static's sparks).
 *
 * The buffer is square and generous — 112px at 100% — because the creature
 * in it can be standing, rolled onto its back, or clinging to the side of a
 * window at ninety degrees, and re-allocating per pose would be both slower
 * and a source of off-by-one jitter. The rig's origin (the ground between
 * its feet) sits at a fixed point in it, `originOf`, which is what the
 * desktop pins to the creature's position.
 */

import {
    Frame,
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

export type PetKind = QuadrupedId | 'pixel';

/** Buffer side at 100%. */
export const ART = 112;

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
    const layers: Layer[] = [...built.layers, ...extra];
    renderLayers(f, layers, sp.coat.shadowRim);

    const headLayers = built.layers
        .map((l, i) => (l.name === 'head' ? i : -1))
        .filter((i) => i >= 0);
    decorateFace(f, sp.face, built.anchors, pose, input.facing, headLayers, input.alarm);

    if (input.kind === 'glitch') glitchPass(f, input.time, input.glitch ?? 0);
    if (input.kind === 'static' && input.charge) sparkPass(f, input.time, input.charge);
    // Tearing can push a band of rows ten pixels sideways, and the sparks
    // jump off the top of the fur, so both need a wider look.
    measure(f, input.kind === 'glitch' ? 12 : input.kind === 'static' ? 6 : 3);
    return { anchors: built.anchors, bbox: { ...f.bbox } };
}
