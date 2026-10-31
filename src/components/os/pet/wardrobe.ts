/**
 * The wardrobe, drawn in the same pixels as the animal wearing it.
 * ----------------------------------------------------------------
 * The hats used to be CSS: divs and clip-paths stacked over a 32px bitmap,
 * positioned by a table of measured fractions ("Glitch's crown sits at
 * 0.5 of the sprite") because nothing knew where any head actually was.
 * They were drawn in a different idiom from the animal underneath — smooth
 * gradients on a pixelated face — and it showed.
 *
 * Now the head is solved every frame, so its crown, brow and throat are
 * simply *known*, along with the angle it is held at. A hat is a few
 * shapes in the head's own frame of reference, shaded and outlined by the
 * same renderer as the fur, which is what makes it look worn rather than
 * stuck on. The swing comes from the spring in `DesktopPet`: the hat lags a
 * few degrees behind the head and settles.
 */

import { Layer, Mark, Prim, cap, ell, hex, poly, ramp } from './raster';
import { Anchors } from './quadruped';

export type AccessoryId =
    | 'bowtie'
    | 'shades'
    | 'partyHat'
    | 'propeller'
    | 'antenna'
    | 'floppy'
    | 'cone'
    | 'halo'
    | 'crt'
    | 'crown';

/* Materials. */
const gold = ramp(['#6b4a10', '#9c6d17', '#c99a2b', '#e7c24f', '#fbe8a0'], '#4a320a');
const red = ramp(['#4a0d14', '#741622', '#a2222f', '#c8424a', '#e6767a'], '#360a0f');
const pink = ramp(['#5e1838', '#8c2552', '#c13d72', '#e0628f', '#f39bb6'], '#45102a');
const yellow = ramp(['#6e5410', '#a07c18', '#d1aa2c', '#ecd05a', '#fbeea4'], '#4e3c0c');
const orange = ramp(['#5c2306', '#8f3a0a', '#c95a12', '#ec7f26', '#f8b066'], '#401804');
const white = ramp(['#8a8a90', '#b2b2b8', '#d8d8dc', '#eeeef0', '#ffffff'], '#626268');
const black = ramp(['#07070a', '#111217', '#1d1f27', '#30333f', '#5a5f72'], '#040406');
const navy = ramp(['#0c1230', '#16204e', '#22306e', '#34468e', '#5a70b8'], '#080c22');
const silver = ramp(['#5a5e68', '#80858f', '#a6abb4', '#c8ccd3', '#e8eaee'], '#40434b');
const beige = ramp(['#6e6652', '#8f876f', '#b3ab92', '#cfc8ae', '#e6e0c9'], '#4f4939');
const phosphor = ramp(['#0b2414', '#123a20', '#1d5a32', '#2f8a4c', '#6fd08a'], '#08180e');
const blue = ramp(['#0f2050', '#1a3478', '#2850a8', '#4174d0', '#7aa6ee'], '#0a163a');

/**
 * A little coordinate frame on the head: origin at `at`, `up` rotated by
 * `angle` (radians, clockwise in the buffer, 0 upright).
 */
function frameAt(at: [number, number], angle: number, s: number) {
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    const P = (u: number, v: number): [number, number] => [
        at[0] + (u * c + v * sn) * s,
        at[1] + (u * sn - v * c) * s,
    ];
    return {
        P,
        E: (u: number, v: number, rx: number, ry: number, a = 0): Prim => {
            const [x, y] = P(u, v);
            return ell(x, y, rx * s, ry * s, angle + a);
        },
        C: (u0: number, v0: number, u1: number, v1: number, r0: number, r1 = r0): Prim => {
            const [x0, y0] = P(u0, v0);
            const [x1, y1] = P(u1, v1);
            return cap(x0, y0, x1, y1, r0 * s, r1 * s);
        },
        G: (pts: number[], r = 0): Prim => {
            const out: number[] = [];
            for (let i = 0; i < pts.length; i += 2) out.push(...P(pts[i], pts[i + 1]));
            return poly(out, r * s);
        },
    };
}

/** In hat space: is (bx, by) on a band of this frame? */
function bandsIn(
    f: ReturnType<typeof frameAt>,
    s: number,
    test: (u: number, v: number) => boolean
): (bx: number, by: number) => boolean {
    // Invert P numerically from two basis vectors.
    const [ox, oy] = f.P(0, 0);
    const [ux, uy] = f.P(1, 0);
    const [vx, vy] = f.P(0, 1);
    const ax = (ux - ox) / s;
    const ay = (uy - oy) / s;
    const bx0 = (vx - ox) / s;
    const by0 = (vy - oy) / s;
    const det = ax * by0 - ay * bx0 || 1;
    return (bx, by) => {
        const dx = (bx - ox) / s;
        const dy = (by - oy) / s;
        const u = (dx * by0 - dy * bx0) / det;
        const v = (ax * dy - ay * dx) / det;
        return test(u, v);
    };
}

export function accessoryLayers(
    id: AccessoryId,
    a: Anchors,
    scale: number,
    swingDeg: number,
    time: number
): Layer[] {
    const swing = (swingDeg * Math.PI) / 180;
    const s = scale;
    const hat = frameAt(a.crown, a.headAngle + swing, s);
    const L = (prims: Prim[], r: typeof gold, extra: Partial<Layer> = {}): Layer => ({
        parts: prims.map((p, i) => ({ p, k: i ? 0.8 : 0 })),
        ramp: r,
        dome: 2,
        contour: true,
        ...extra,
    });

    switch (id) {
        case 'partyHat': {
            const stripes: Mark = {
                ramp: yellow,
                fn: bandsIn(hat, s, (u, v) => Math.sin((u * 0.9 + v * 1.1) * 1.9) > 0.25),
            };
            return [
                L([hat.G([-3.2, -0.6, 3.2, -0.6, 0.3, 8.2], 0.4)], pink, { marks: [stripes], dome: 2.6 }),
                L([hat.E(0.3, 8.6, 1.3, 1.3)], white, { dome: 1.2 }),
            ];
        }

        case 'crown':
            return [
                L(
                    [
                        hat.G(
                            [-3.8, -0.4, 3.8, -0.4, 3.9, 4.2, 2.2, 2.0, 0.6, 4.8, -1.0, 2.0, -2.6, 4.6, -3.9, 2.2],
                            0.3
                        ),
                    ],
                    gold,
                    { dome: 2.2 }
                ),
                L([hat.E(0, 1.2, 0.85, 0.85)], red, { dome: 0.8 }),
            ];

        case 'cone': {
            const band: Mark = {
                ramp: white,
                fn: bandsIn(hat, s, (_u, v) => v > 2.6 && v < 4.0),
            };
            return [
                L([hat.G([-3.6, -0.2, 3.6, -0.2, 0.4, 8.0], 0.5)], orange, { marks: [band], dome: 2.6 }),
                L([hat.C(-4.2, -0.4, 4.2, -0.4, 0.75)], orange, { shift: -1, dome: 0.8 }),
            ];
        }

        case 'propeller': {
            const quarters: Mark[] = [
                { ramp: red, fn: bandsIn(hat, s, (u) => u < -1.4) },
                { ramp: blue, fn: bandsIn(hat, s, (u) => u > 1.4) },
                { ramp: yellow, fn: bandsIn(hat, s, (u, v) => Math.abs(u) <= 1.4 && v > 2.2) },
            ];
            const spin = Math.abs(Math.cos(time / 55));
            return [
                L([hat.E(0, 0.6, 4.2, 2.8)], white, { marks: quarters, dome: 2.6 }),
                L([hat.C(0, 3.0, 0, 4.4, 0.45)], black, { dome: 0.6 }),
                L([hat.C(-4.6 * spin - 0.4, 4.7, 4.6 * spin + 0.4, 4.7, 0.55)], black, { dome: 0.6 }),
            ];
        }

        case 'antenna': {
            const lit = Math.floor(time / 550) % 2 === 0;
            return [
                L([hat.C(0, 0, 0.3, 5.6, 0.45)], silver, { dome: 0.6 }),
                L([hat.E(0.3, 6.4, 1.15, 1.15)], lit ? red : ramp(['#2a0a0c', '#3c1014', '#521a1e', '#6a2a2e', '#8a4448'], '#1a0608'), {
                    dome: 1,
                }),
            ];
        }

        case 'floppy': {
            const tilt = -0.21;
            const disk = frameAt(a.crown, a.headAngle + swing + tilt, s);
            const shutter: Mark = {
                ramp: silver,
                fn: bandsIn(disk, s, (u, v) => u > -1.4 && u < 1.6 && v > 3.9),
            };
            const label: Mark = {
                ramp: beige,
                fn: bandsIn(disk, s, (u, v) => u > -2.4 && u < 2.4 && v > 0.6 && v < 2.8),
            };
            return [L([disk.G([-3.2, -0.2, 3.2, -0.2, 3.2, 6.0, -2.6, 6.0, -3.2, 5.4], 0.2)], navy, { marks: [shutter, label], dome: 1.4 })];
        }

        case 'halo': {
            const ring = frameAt(a.crown, a.headAngle + swing, s);
            return [
                {
                    parts: [
                        { p: ring.E(0, 3.6, 4.4, 1.5) },
                        { p: ring.E(0, 3.6, 3.0, 0.6), cut: true },
                    ],
                    ramp: gold,
                    dome: 0.8,
                    alpha: 0.95,
                },
            ];
        }

        case 'crt': {
            const screen: Mark = {
                ramp: phosphor,
                fn: bandsIn(hat, s, (u, v) => Math.abs(u) < 2.6 && v > 1.9 && v < 5.8),
            };
            return [
                L([hat.C(-1.6, 0.1, 1.6, 0.1, 0.6)], beige, { shift: -1, dome: 0.6 }),
                L([hat.G([-3.9, 0.9, 3.9, 0.9, 3.9, 6.9, -3.9, 6.9], 0.5)], beige, { marks: [screen], dome: 1.6 }),
            ];
        }

        case 'shades': {
            // Over the eyes, in the head's frame. In profile one lens and an
            // arm back toward the ear; face on, two lenses and a bridge.
            const parts: Prim[] = [];
            if (a.yaw > 0.5 && a.eyes.length > 1) {
                const [e1, e2] = a.eyes;
                parts.push(ell(e1.x, e1.y, 1.9 * s, 1.35 * s, a.headAngle));
                parts.push(ell(e2.x, e2.y, 1.9 * s, 1.35 * s, a.headAngle));
                parts.push(cap(e1.x, e1.y - 0.4 * s, e2.x, e2.y - 0.4 * s, 0.5 * s));
            } else if (a.eyes.length) {
                const e = a.eyes[0];
                const back = -Math.sign(a.faceX || 1);
                parts.push(ell(e.x + back * 0.2 * s, e.y, 2.0 * s, 1.4 * s, a.headAngle));
                parts.push(cap(e.x + back * 1.4 * s, e.y - 0.6 * s, e.x + back * 4.6 * s, e.y - 0.2 * s, 0.45 * s));
            }
            return [{ parts: parts.map((p, i) => ({ p, k: i ? 0.6 : 0 })), ramp: black, dome: 1.2, contour: true }];
        }

        case 'bowtie': {
            const bow = frameAt(a.throat, a.headAngle * 0.5 + swing * 0.5, s);
            return [
                L([bow.G([-3.4, 1.6, -0.4, 0.2, -3.4, -1.4], 0.3), bow.G([3.4, 1.6, 0.4, 0.2, 3.4, -1.4], 0.3)], red, { dome: 1.2 }),
                L([bow.E(0, 0.2, 0.9, 0.95)], red, { shift: -1, dome: 0.8 }),
            ];
        }

        default:
            return [];
    }
}

/** A drawn icon of the accessory alone, for the wardrobe list. */
export const ACCESSORY_COLOURS: Record<AccessoryId, string> = {
    bowtie: '#a2222f',
    shades: '#1d1f27',
    partyHat: '#c13d72',
    propeller: '#2850a8',
    antenna: '#a2222f',
    floppy: '#22306e',
    cone: '#c95a12',
    halo: '#c99a2b',
    crt: '#1d5a32',
    crown: '#c99a2b',
};

export { hex };
