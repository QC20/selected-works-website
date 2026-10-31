/**
 * A tiny pixel-art renderer for the desktop pets.
 * ------------------------------------------------
 * The animals used to be one 32px PNG each, and every bit of motion was that
 * one picture being squashed and rotated by CSS. A face cannot walk, so the
 * creature bounced; a face cannot look at anything, so it leaned. That is the
 * ceiling the old design hit, and no amount of easing fixes it.
 *
 * So the animals are drawn every frame instead, out of a handful of shapes
 * placed by a skeleton (see `quadruped.ts` and `betta.ts`). This file is the
 * part that turns those shapes into pixels, and it is deliberately the dull,
 * general part: it knows nothing about dogs.
 *
 * How a frame is made
 * -------------------
 *  1. Each body part is a signed distance field: an ellipse, a tapered
 *     capsule, a polygon. A *layer* is several of them merged with a smooth
 *     minimum, which is what makes a neck flow into a chest instead of
 *     reading as two balloons touching.
 *
 *  2. The distance inside a layer becomes a height — a dome whose radius is
 *     the layer's `dome` — and the height's slope becomes a surface normal.
 *     Lit from the upper left and quantised into a five-step ramp, that is
 *     the shading a pixel artist would put on a rounded form by hand: a
 *     highlight up top, a core shadow underneath, and a dark rim where the
 *     surface turns away.
 *
 *  3. Layers composite back to front. Anything in front can cast a one-step
 *     contour onto what is behind it, which is how a near foreleg separates
 *     from the chest without a black line drawn round it.
 *
 *  4. The silhouette gets a selective outline: the darkest tone of the
 *     neighbouring material along the lit top and left, a near-black along
 *     the shadowed bottom and right. Uniform black outlines are the single
 *     quickest way to make pixel art look like a colouring book, which is
 *     most of what was wrong with the old sprites.
 *
 * Everything is integer pixels in a fixed buffer, one art pixel to one CSS
 * pixel at 100% — the same density as the Windows 95 icons it sits beside.
 */

/* -------------------------------------------------------------------------
 * Colour
 * ---------------------------------------------------------------------- */

/** Packed little-endian RGBA, the byte order `ImageData` uses. */
export type RGBA = number;

export function rgba(r: number, g: number, b: number, a = 255): RGBA {
    return (
        ((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)
    ) >>> 0;
}

export function hex(code: string, a = 255): RGBA {
    const n = parseInt(code.replace('#', ''), 16);
    return rgba((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
}

export const channel = {
    r: (c: RGBA) => c & 255,
    g: (c: RGBA) => (c >>> 8) & 255,
    b: (c: RGBA) => (c >>> 16) & 255,
    a: (c: RGBA) => (c >>> 24) & 255,
};

/** Straight-alpha "over", for the translucent layers (fins, glows). */
export function over(under: RGBA, top: RGBA): RGBA {
    const ta = channel.a(top) / 255;
    if (ta >= 1) return top;
    if (ta <= 0) return under;
    const ua = channel.a(under) / 255;
    const oa = ta + ua * (1 - ta);
    if (oa <= 0) return 0;
    const mix = (t: number, u: number) =>
        Math.round((t * ta + u * ua * (1 - ta)) / oa);
    return rgba(
        mix(channel.r(top), channel.r(under)),
        mix(channel.g(top), channel.g(under)),
        mix(channel.b(top), channel.b(under)),
        Math.round(oa * 255)
    );
}

/**
 * Five tones of one material, darkest first: deep shadow, shadow, base,
 * light, highlight. `rim` is the outline colour on the lit side — usually a
 * step darker than `deep`, tinted with the material's own hue.
 */
export interface Ramp {
    c: RGBA[];
    rim: RGBA;
}

export function ramp(tones: string[], rim: string, alpha = 255): Ramp {
    return { c: tones.map((t) => hex(t, alpha)), rim: hex(rim, alpha) };
}

/* -------------------------------------------------------------------------
 * Shapes
 * ---------------------------------------------------------------------- */

export type Prim =
    /** Ellipse, rotation stored as cos/sin so the inner loop never calls trig. */
    | { t: 0; x: number; y: number; rx: number; ry: number; c: number; s: number }
    /** Capsule from a to b, radius tapering from ra to rb. */
    | { t: 1; ax: number; ay: number; bx: number; by: number; ra: number; rb: number }
    /** Polygon, rounded by r. Points as a flat [x0, y0, x1, y1, ...] list. */
    | { t: 2; pts: number[]; r: number };

export const ell = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    angle = 0
): Prim => ({ t: 0, x, y, rx, ry, c: Math.cos(angle), s: Math.sin(angle) });

export const cap = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    ra: number,
    rb = ra
): Prim => ({ t: 1, ax, ay, bx, by, ra, rb });

export const poly = (pts: number[], r = 0): Prim => ({ t: 2, pts, r });

export interface Part {
    p: Prim;
    /** Smooth-union radius with everything before it in the layer. */
    k?: number;
    /** Subtract instead of add. */
    cut?: boolean;
}

/**
 * A region of a layer drawn in a different material, or shifted lighter or
 * darker. Collie markings, tabby stripes and a stoat's black tail tip are
 * all marks: they reuse the layer's lighting and only change which ramp the
 * light is read from, so a white blaze is shaded exactly like the black fur
 * around it.
 */
export interface Mark {
    parts?: Part[];
    /** Or a predicate in art pixels, for patterns no shape describes. */
    fn?: (x: number, y: number) => boolean;
    ramp?: Ramp;
    shift?: number;
}

export interface Layer {
    parts: Part[];
    ramp: Ramp;
    /** Radius of the height dome, in pixels. Roughly the layer's thickest radius. */
    dome: number;
    /** Shade offset for the whole layer: far legs sit a step back in shadow. */
    shift?: number;
    marks?: Mark[];
    /** Casts a one-step contour onto whatever is behind it. */
    contour?: boolean;
    /** 0..1. Fins and other gauzy things. */
    alpha?: number;
    /** No silhouette outline where this layer meets empty space. */
    noOutline?: boolean;
    /** Skip lighting and use this ramp index everywhere. */
    flat?: number;
}

/* -------------------------------------------------------------------------
 * The buffer
 * ---------------------------------------------------------------------- */

export interface Frame {
    w: number;
    h: number;
    /** Final colour. */
    px: Uint32Array;
    /** Which layer owns the pixel, or -1. Used by the contour and outline. */
    owner: Int16Array;
    /** Ramp table index of the owning material, for the outline's colour. */
    rampOf: Int16Array;
    /** The shade index the pixel was lit at, so contours can step it. */
    shade: Int8Array;
    ramps: Ramp[];
    /** Opaque bounds after the last render — the creature's hit box. */
    bbox: { x0: number; y0: number; x1: number; y1: number };
    /**
     * Everything any layer touched this frame, inclusive. The post passes
     * only look in here: the creature fills perhaps a fifth of its buffer,
     * and scanning all of it three times a frame was most of the cost.
     */
    dirty: { x0: number; y0: number; x1: number; y1: number };
}

export function makeFrame(w: number, h: number): Frame {
    const f: Frame = {
        w,
        h,
        px: new Uint32Array(w * h),
        owner: new Int16Array(w * h),
        rampOf: new Int16Array(w * h),
        shade: new Int8Array(w * h),
        ramps: [],
        bbox: { x0: 0, y0: 0, x1: 0, y1: 0 },
        dirty: { x0: 0, y0: 0, x1: w - 1, y1: h - 1 },
    };
    clearFrame(f);
    return f;
}

export function clearFrame(f: Frame): void {
    f.px.fill(0);
    f.owner.fill(-1);
    f.rampOf.fill(-1);
    f.shade.fill(0);
    f.dirty = { x0: f.w, y0: f.h, x1: -1, y1: -1 };
    f.ramps.length = 0;
}

/* -------------------------------------------------------------------------
 * Distance fields
 * ---------------------------------------------------------------------- */

function sdf(p: Prim, x: number, y: number): number {
    switch (p.t) {
        case 0: {
            const dx = x - p.x;
            const dy = y - p.y;
            const lx = dx * p.c + dy * p.s;
            const ly = -dx * p.s + dy * p.c;
            const ax = lx / p.rx;
            const ay = ly / p.ry;
            const k0 = Math.sqrt(ax * ax + ay * ay);
            const bx = lx / (p.rx * p.rx);
            const by = ly / (p.ry * p.ry);
            const k1 = Math.sqrt(bx * bx + by * by);
            if (k1 < 1e-6) return -Math.min(p.rx, p.ry);
            return (k0 * (k0 - 1)) / k1;
        }
        case 1: {
            const ex = p.bx - p.ax;
            const ey = p.by - p.ay;
            const wx = x - p.ax;
            const wy = y - p.ay;
            const ll = ex * ex + ey * ey;
            let t = ll > 1e-9 ? (wx * ex + wy * ey) / ll : 0;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const qx = wx - ex * t;
            const qy = wy - ey * t;
            return Math.sqrt(qx * qx + qy * qy) - (p.ra + (p.rb - p.ra) * t);
        }
        default: {
            const v = p.pts;
            const n = v.length >> 1;
            let d = (x - v[0]) * (x - v[0]) + (y - v[1]) * (y - v[1]);
            let s = 1;
            for (let i = 0, j = n - 1; i < n; j = i, i++) {
                const vix = v[i * 2];
                const viy = v[i * 2 + 1];
                const vjx = v[j * 2];
                const vjy = v[j * 2 + 1];
                const ex = vjx - vix;
                const ey = vjy - viy;
                const wx = x - vix;
                const wy = y - viy;
                const ee = ex * ex + ey * ey;
                let t = ee > 1e-9 ? (wx * ex + wy * ey) / ee : 0;
                t = t < 0 ? 0 : t > 1 ? 1 : t;
                const bx = wx - ex * t;
                const by = wy - ey * t;
                const dd = bx * bx + by * by;
                if (dd < d) d = dd;
                const c1 = y >= viy;
                const c2 = y < vjy;
                const c3 = ex * wy > ey * wx;
                if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
            }
            return s * Math.sqrt(d) - p.r;
        }
    }
}

function bounds(p: Prim): [number, number, number, number] {
    switch (p.t) {
        case 0: {
            const r = Math.max(p.rx, p.ry);
            return [p.x - r, p.y - r, p.x + r, p.y + r];
        }
        case 1: {
            const r = Math.max(p.ra, p.rb);
            return [
                Math.min(p.ax, p.bx) - r,
                Math.min(p.ay, p.by) - r,
                Math.max(p.ax, p.bx) + r,
                Math.max(p.ay, p.by) + r,
            ];
        }
        default: {
            let x0 = Infinity;
            let y0 = Infinity;
            let x1 = -Infinity;
            let y1 = -Infinity;
            for (let i = 0; i < p.pts.length; i += 2) {
                x0 = Math.min(x0, p.pts[i]);
                x1 = Math.max(x1, p.pts[i]);
                y0 = Math.min(y0, p.pts[i + 1]);
                y1 = Math.max(y1, p.pts[i + 1]);
            }
            return [x0 - p.r, y0 - p.r, x1 + p.r, y1 + p.r];
        }
    }
}

function evalParts(parts: Part[], x: number, y: number): number {
    let acc = Infinity;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const d = sdf(part.p, x, y);
        if (part.cut) {
            acc = Math.max(acc, -d);
        } else if (part.k && acc !== Infinity) {
            const k = part.k;
            const h = Math.max(k - Math.abs(acc - d), 0) / k;
            acc = Math.min(acc, d) - h * h * k * 0.25;
        } else {
            acc = Math.min(acc, d);
        }
    }
    return acc;
}

/* -------------------------------------------------------------------------
 * Lighting
 * ---------------------------------------------------------------------- */

/** From the upper left and a little in front, like every icon on the desktop. */
const LX = -0.52;
const LY = -0.68;
const LZ = 0.52;
const LLEN = Math.sqrt(LX * LX + LY * LY + LZ * LZ);
const L = [LX / LLEN, LY / LLEN, LZ / LLEN];

/**
 * Where the five tones change over, as values of N·L.
 *
 * Tuned so that a flat interior (normal straight out of the screen) lands on
 * the base tone, the upper-left shoulder of a dome reaches the light tone,
 * and only the very crest of the curve gets the highlight — a highlight that
 * covers a third of the body is the "pillow shading" every pixel-art guide
 * warns about.
 */
const BANDS = [0.0, 0.3, 0.68, 0.86];

function band(i: number): number {
    if (i > BANDS[3]) return 4;
    if (i > BANDS[2]) return 3;
    if (i > BANDS[1]) return 2;
    if (i > BANDS[0]) return 1;
    return 0;
}

/* Scratch grids, grown on demand and reused frame to frame. */
let gridD = new Float32Array(0);
let gridH = new Float32Array(0);

function ensureGrid(n: number): void {
    if (gridD.length < n) {
        gridD = new Float32Array(n);
        gridH = new Float32Array(n);
    }
}

/* -------------------------------------------------------------------------
 * Rendering
 * ---------------------------------------------------------------------- */

function rampIndex(f: Frame, r: Ramp): number {
    let i = f.ramps.indexOf(r);
    if (i < 0) {
        f.ramps.push(r);
        i = f.ramps.length - 1;
    }
    return i;
}

/**
 * Draws one layer into the frame, on top of whatever is there.
 *
 * `index` is the layer's place in the stack; later layers are nearer. It is
 * written into `owner` so the contour and outline passes can tell which of
 * two touching pixels is in front.
 */
export function drawLayer(f: Frame, layer: Layer, index: number): void {
    if (!layer.parts.length) return;

    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const part of layer.parts) {
        if (part.cut) continue;
        const b = bounds(part.p);
        const pad = (part.k ?? 0) * 0.5;
        x0 = Math.min(x0, b[0] - pad);
        y0 = Math.min(y0, b[1] - pad);
        x1 = Math.max(x1, b[2] + pad);
        y1 = Math.max(y1, b[3] + pad);
    }
    // One pixel of margin all round, so the normal's finite differences have
    // a neighbour to read at the edge of the box.
    const gx0 = Math.max(0, Math.floor(x0) - 1);
    const gy0 = Math.max(0, Math.floor(y0) - 1);
    const gx1 = Math.min(f.w - 1, Math.ceil(x1) + 1);
    const gy1 = Math.min(f.h - 1, Math.ceil(y1) + 1);
    if (gx1 < gx0 || gy1 < gy0) return;

    const gw = gx1 - gx0 + 1;
    const gh = gy1 - gy0 + 1;
    ensureGrid(gw * gh);

    const R = Math.max(0.5, layer.dome);
    // Per-part bounds, for skipping parts that cannot matter at a pixel: a
    // part further away than the dome radius plus its blend cannot change
    // whether the pixel is inside, nor how deep — so its field is never
    // worth computing there. This halves the work on a typical layer.
    const parts = layer.parts;
    const n = parts.length;
    const pb = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
        const b = bounds(parts[i].p);
        const reach = R + (parts[i].k ?? 0) + 1.5;
        pb[i * 4] = b[0] - reach;
        pb[i * 4 + 1] = b[1] - reach;
        pb[i * 4 + 2] = b[2] + reach;
        pb[i * 4 + 3] = b[3] + reach;
    }
    for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
            const px = gx0 + gx + 0.5;
            const py = gy0 + gy + 0.5;
            let acc = Infinity;
            for (let pi = 0; pi < n; pi++) {
                const o = pi * 4;
                if (px < pb[o] || px > pb[o + 2] || py < pb[o + 1] || py > pb[o + 3]) continue;
                const part = parts[pi];
                const dd = sdf(part.p, px, py);
                if (part.cut) {
                    acc = Math.max(acc, -dd);
                } else if (part.k && acc !== Infinity) {
                    const k = part.k;
                    const hh = Math.max(k - Math.abs(acc - dd), 0) / k;
                    acc = Math.min(acc, dd) - hh * hh * k * 0.25;
                } else {
                    acc = Math.min(acc, dd);
                }
            }
            const d = acc === Infinity ? 1e3 : acc;
            const i = gy * gw + gx;
            gridD[i] = d;
            // A quarter-circle bevel: vertical at the silhouette, flat once
            // the pixel is deeper than the dome radius.
            const depth = -d;
            if (depth <= 0) {
                gridH[i] = 0;
            } else {
                const t = depth >= R ? 1 : depth / R;
                gridH[i] = R * Math.sqrt(1 - (1 - t) * (1 - t));
            }
        }
    }

    const ri = rampIndex(f, layer.ramp);
    const marks = layer.marks ?? [];
    const markRamps = marks.map((m) => (m.ramp ? rampIndex(f, m.ramp) : -1));
    // A shape-based mark can only apply inside its own bounds; checking
    // that first skips its distance field for nearly every pixel.
    const markBox = marks.map((m) => {
        if (!m.parts) return null;
        let mx0 = Infinity;
        let my0 = Infinity;
        let mx1 = -Infinity;
        let my1 = -Infinity;
        for (const part of m.parts) {
            if (part.cut) continue;
            const b = bounds(part.p);
            const pad = (part.k ?? 0) * 0.5;
            mx0 = Math.min(mx0, b[0] - pad);
            my0 = Math.min(my0, b[1] - pad);
            mx1 = Math.max(mx1, b[2] + pad);
            my1 = Math.max(my1, b[3] + pad);
        }
        return [mx0, my0, mx1, my1];
    });
    const alpha = layer.alpha ?? 1;
    const dirty = f.dirty;
    if (gx0 < dirty.x0) dirty.x0 = gx0;
    if (gy0 < dirty.y0) dirty.y0 = gy0;
    if (gx1 > dirty.x1) dirty.x1 = gx1;
    if (gy1 > dirty.y1) dirty.y1 = gy1;

    for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
            const i = gy * gw + gx;
            if (gridD[i] >= 0) continue;
            const x = gx0 + gx;
            const y = gy0 + gy;

            let s: number;
            if (layer.flat !== undefined) {
                s = layer.flat;
            } else {
                const hl = gx > 0 ? gridH[i - 1] : 0;
                const hr = gx < gw - 1 ? gridH[i + 1] : 0;
                const hu = gy > 0 ? gridH[i - gw] : 0;
                const hd = gy < gh - 1 ? gridH[i + gw] : 0;
                let nx = -(hr - hl) * 0.5;
                let ny = -(hd - hu) * 0.5;
                let nz = 1;
                const nl = Math.sqrt(nx * nx + ny * ny + nz * nz);
                nx /= nl;
                ny /= nl;
                nz /= nl;
                s = band(nx * L[0] + ny * L[1] + nz * L[2]);
            }
            s += layer.shift ?? 0;

            let useRamp = ri;
            if (marks.length) {
                for (let m = 0; m < marks.length; m++) {
                    const mark = marks[m];
                    const box = markBox[m];
                    if (
                        box &&
                        (x + 0.5 < box[0] || x + 0.5 > box[2] || y + 0.5 < box[1] || y + 0.5 > box[3])
                    ) {
                        continue;
                    }
                    const inside = mark.parts
                        ? evalParts(mark.parts, x + 0.5, y + 0.5) < 0
                        : mark.fn
                        ? mark.fn(x + 0.5, y + 0.5)
                        : false;
                    if (!inside) continue;
                    if (markRamps[m] >= 0) useRamp = markRamps[m];
                    if (mark.shift) s += mark.shift;
                }
            }
            s = s < 0 ? 0 : s > 4 ? 4 : s;

            const p = y * f.w + x;
            const colour = f.ramps[useRamp].c[s];
            if (alpha < 1) {
                const a = Math.round(channel.a(colour) * alpha);
                f.px[p] = over(f.px[p], (colour & 0x00ffffff) | (a << 24));
            } else {
                f.px[p] = colour;
            }
            f.owner[p] = index;
            f.rampOf[p] = useRamp;
            f.shade[p] = s;
        }
    }
}

/** Per-layer flags the post passes need, by stack index. */
export interface LayerFlags {
    contour: boolean;
    noOutline: boolean;
    alpha: number;
}

/* Scratch for the post passes, grown on demand and reused. */
let scratchHit = new Uint8Array(0);
let scratchOut = new Uint32Array(0);

/** The dirty rect grown by `m` and clamped to the buffer. */
function region(f: Frame, m: number): [number, number, number, number] {
    const d = f.dirty;
    if (d.x1 < 0) return [0, 0, -1, -1];
    return [
        Math.max(0, d.x0 - m),
        Math.max(0, d.y0 - m),
        Math.min(f.w - 1, d.x1 + m),
        Math.min(f.h - 1, d.y1 + m),
    ];
}

/**
 * The one-step occlusion contour.
 *
 * A pixel belonging to something *behind* gets darkened where it touches a
 * pixel of a contour-casting layer in front. One step, not two — enough to
 * separate a foreleg from a chest, not enough to read as a drawn line.
 */
export function contourPass(f: Frame, flags: LayerFlags[]): void {
    const { w, owner } = f;
    const [x0, y0, x1, y1] = region(f, 0);
    if (x1 < x0) return;
    if (scratchHit.length < w * f.h) scratchHit = new Uint8Array(w * f.h);
    const hit = scratchHit;
    const casts = flags.map((fl) => !!fl?.contour);
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const p = y * w + x;
            hit[p] = 0;
            const o = owner[p];
            if (o < 0) continue;
            let q: number;
            if (x > 0 && (q = owner[p - 1]) > o && casts[q]) hit[p] = 1;
            else if (x < w - 1 && (q = owner[p + 1]) > o && casts[q]) hit[p] = 1;
            else if (y > 0 && (q = owner[p - w]) > o && casts[q]) hit[p] = 1;
            else if (y < f.h - 1 && (q = owner[p + w]) > o && casts[q]) hit[p] = 1;
        }
    }
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            const p = y * w + x;
            if (!hit[p]) continue;
            const r = f.ramps[f.rampOf[p]];
            if (!r) continue;
            const s = Math.max(0, f.shade[p] - 1);
            const a = flags[owner[p]]?.alpha ?? 1;
            const c = r.c[s];
            f.px[p] =
                a < 1
                    ? (c & 0x00ffffff) | (Math.round(channel.a(c) * a) << 24)
                    : c;
            f.shade[p] = s;
        }
    }
}

/**
 * The selective outline, and the opaque bounding box while we're here.
 *
 * Only empty pixels with an opaque pixel directly beside them (not
 * diagonally) are outlined. Skipping the diagonals is what keeps a curve
 * reading as a curve: an eight-way outline turns every round thing octagonal.
 */
export function outlinePass(
    f: Frame,
    flags: LayerFlags[],
    shadowRim: RGBA
): void {
    const { w, h, owner } = f;
    const [rx0, ry0, rx1, ry1] = region(f, 1);
    if (scratchOut.length < w * h) scratchOut = new Uint32Array(w * h);
    const out = scratchOut;
    const quiet = flags.map((fl) => !!fl?.noOutline);
    let x0 = w;
    let y0 = h;
    let x1 = -1;
    let y1 = -1;

    for (let y = ry0; y <= ry1; y++) {
        for (let x = rx0; x <= rx1; x++) {
            const p = y * w + x;
            out[p] = 0;
            if (owner[p] >= 0) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
                continue;
            }
            // Which side of the shape is this empty pixel on? If the solid
            // neighbour is below or to the right, we are on the lit upper
            // left; otherwise the shadowed lower right.
            let src = -1;
            let lit = false;
            const below = y < h - 1 ? owner[p + w] : -1;
            const right = x < w - 1 ? owner[p + 1] : -1;
            const above = y > 0 ? owner[p - w] : -1;
            const left = x > 0 ? owner[p - 1] : -1;
            if (below >= 0 && !quiet[below]) {
                src = p + w;
                lit = true;
            } else if (right >= 0 && !quiet[right]) {
                src = p + 1;
                lit = true;
            } else if (above >= 0 && !quiet[above]) {
                src = p - w;
            } else if (left >= 0 && !quiet[left]) {
                src = p - 1;
            }
            if (src < 0) continue;
            const r = f.ramps[f.rampOf[src]];
            let c = lit && r ? r.rim : shadowRim;
            const a = flags[owner[src]]?.alpha ?? 1;
            if (a < 1) c = (c & 0x00ffffff) | (Math.round(255 * a) << 24);
            out[p] = c;
        }
    }

    for (let y = ry0; y <= ry1; y++) {
        for (let x = rx0; x <= rx1; x++) {
            const p = y * w + x;
            if (!out[p]) continue;
            f.px[p] = out[p];
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
        }
    }
    f.bbox = x1 < 0 ? { x0: 0, y0: 0, x1: 0, y1: 0 } : { x0, y0, x1, y1 };
    // The outline sits one pixel outside what the layers drew.
    if (x1 >= 0) {
        f.dirty = { x0: rx0, y0: ry0, x1: rx1, y1: ry1 };
    }
}

/** Composites a stack, back to front, with both post passes. */
export function renderLayers(
    f: Frame,
    layers: (Layer | null | undefined | false)[],
    shadowRim: RGBA
): LayerFlags[] {
    const flags: LayerFlags[] = [];
    let index = 0;
    for (const layer of layers) {
        if (!layer) continue;
        flags[index] = {
            contour: !!layer.contour,
            noOutline: !!layer.noOutline,
            alpha: layer.alpha ?? 1,
        };
        drawLayer(f, layer, index);
        index++;
    }
    contourPass(f, flags);
    outlinePass(f, flags, shadowRim);
    return flags;
}

/* -------------------------------------------------------------------------
 * Detail work: single pixels, stamps and lines
 * ----------------------------------------------------------------------
 * Eyes, noses and mouths are not shapes. At this size an eye is two or three
 * pixels and the difference between alert and asleep is which three, so
 * they are placed by hand, snapped to whole pixels so they never shimmer as
 * the head moves underneath them.
 */

export function plot(f: Frame, x: number, y: number, c: RGBA): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= f.w || iy >= f.h) return;
    const p = iy * f.w + ix;
    f.px[p] = channel.a(c) < 255 ? over(f.px[p], c) : c;
}

/** Only where the creature already is — for details that must not spill. */
export function plotOn(f: Frame, x: number, y: number, c: RGBA): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= f.w || iy >= f.h) return;
    const p = iy * f.w + ix;
    if (f.owner[p] < 0) return;
    f.px[p] = channel.a(c) < 255 ? over(f.px[p], c) : c;
}

/**
 * A little bitmap. `rows` uses one character per pixel, `.` for nothing;
 * `ink` maps the rest to colours. Mirrored when `flip` is set, so a stamp
 * drawn for a right-facing head works on a left-facing one.
 */
export function stamp(
    f: Frame,
    x: number,
    y: number,
    rows: string[],
    ink: Record<string, RGBA>,
    flip = false,
    onlyOnBody = false
): void {
    const ox = Math.round(x);
    const oy = Math.round(y);
    for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        for (let c = 0; c < row.length; c++) {
            const ch = row[c];
            if (ch === '.' || ch === ' ') continue;
            const colour = ink[ch];
            if (colour === undefined) continue;
            const px = flip ? ox - c : ox + c;
            if (onlyOnBody) plotOn(f, px, oy + r, colour);
            else plot(f, px, oy + r, colour);
        }
    }
}

/** Bresenham, for whiskers and mouth lines. */
export function line(
    f: Frame,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    c: RGBA,
    onlyOnBody = false
): void {
    let ax = Math.round(x0);
    let ay = Math.round(y0);
    const bx = Math.round(x1);
    const by = Math.round(y1);
    const dx = Math.abs(bx - ax);
    const dy = -Math.abs(by - ay);
    const sx = ax < bx ? 1 : -1;
    const sy = ay < by ? 1 : -1;
    let err = dx + dy;
    for (let guard = 0; guard < 256; guard++) {
        if (onlyOnBody) plotOn(f, ax, ay, c);
        else plot(f, ax, ay, c);
        if (ax === bx && ay === by) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
            err += dy;
            ax += sx;
        }
        if (e2 <= dx) {
            err += dx;
            ay += sy;
        }
    }
}

/**
 * Recomputes the opaque bounds after post-effects have moved pixels about.
 * `margin` covers anything an effect may have pushed outside the dirty rect.
 */
export function measure(f: Frame, margin = 0): void {
    const [rx0, ry0, rx1, ry1] = region(f, margin);
    let x0 = f.w;
    let y0 = f.h;
    let x1 = -1;
    let y1 = -1;
    for (let y = ry0; y <= ry1; y++) {
        for (let x = rx0; x <= rx1; x++) {
            if (channel.a(f.px[y * f.w + x]) > 40) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
        }
    }
    f.bbox = x1 < 0 ? { x0: 0, y0: 0, x1: 0, y1: 0 } : { x0, y0, x1, y1 };
}
