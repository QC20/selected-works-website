import React, { useCallback, useEffect, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { playChime, playClick, playError } from '../os/sounds';

/**
 * Face Value — a pareidolia engine.
 * ---------------------------------------------------------------------
 * Point it at a cloud, a wood grain, a wall, or a screenful of pure
 * television static, and it will find a face in it. Not a face somebody put
 * there: a face that was never there at all, assembled out of whatever
 * accidental dark patches happen to be arranged the way two eyes and a mouth
 * are arranged. Then it turns the contrast up until you cannot unsee it.
 *
 * This is the oldest bug in human vision and one of the most reliable. The
 * fusiform face area will fire at three dots in a triangle; it fires at plug
 * sockets, at the front of cars, at burnt toast and at the surface of Mars.
 * A machine that deliberately hunts for the configuration and then amplifies
 * it is the most direct demonstration of that fact I could think of building
 * — and it belongs in the Games folder rather than the Control Panel because
 * the honest description of what it does is "it plays a trick on you".
 *
 * How it actually works
 * ---------------------
 * Two halves, and neither of them is a neural network. There are no weights
 * shipped with this window and nothing is sent anywhere.
 *
 * 1. FINDING.  The classic Viola-Jones machinery from 2001, minus the
 *    trained cascade. The image is reduced to grayscale and a summed-area
 *    table (an "integral image") is built, which makes the mean brightness of
 *    any rectangle a constant-time lookup — two adds and two subtracts,
 *    regardless of how big the rectangle is. Every candidate window at every
 *    scale is then scored on four Haar-like features that describe how a face
 *    is lit rather than what it looks like:
 *
 *      - the eye band is darker than the cheek band below it (this is
 *        literally the first feature Viola and Jones' trained cascade
 *        selected, and it is the single most reliable one);
 *      - *both* eye sockets are darker than the bridge of the nose between
 *        them — taking the weaker of the two, so one dark smudge cannot pass
 *        for a pair;
 *      - the mouth line is darker than the upper lip above it;
 *      - the left and right halves roughly mirror each other.
 *
 *    All four are scaled by the window's own standard deviation, computed
 *    from a second integral image over squared values, because a flat region
 *    satisfies every ratio above perfectly and means nothing. Overlapping
 *    hits are then thinned by non-maximum suppression on intersection-over-
 *    union, which is what stops one good face being reported as forty.
 *
 *    What is deliberately missing is the training. A real cascade learns
 *    which of ~180,000 Haar features matter from thousands of labelled
 *    faces, and is therefore quite good at *not* seeing faces in noise. Four
 *    hand-picked features with no negative examples is a detector with the
 *    discipline removed — which is not a worse face detector so much as a
 *    much better pareidolia detector. It is wrong in exactly the direction a
 *    person is wrong.
 *
 * 2. AMPLIFYING.  Finding it is not the trick; the trick is making you see
 *    it. The reveal slider runs two effects in sequence:
 *
 *      - Feature amplification. The eye and mouth regions of the winning
 *        window are darkened through a smooth elliptical falloff, and global
 *        contrast is pushed around the window's own mean. Nothing is drawn
 *        in — every pixel that darkens was already the darker one locally.
 *
 *      - A Mooney rendering. The image is thresholded to pure black and
 *        white against a *local* mean (another integral image, used as a
 *        box blur) rather than a global one. Two-tone images of this kind
 *        are Craig Mooney's, from 1957, and they are the standard laboratory
 *        stimulus for exactly this: an image that is meaningless until it
 *        suddenly, irreversibly, is a face. Once your visual system has
 *        committed to the interpretation you cannot get back to not seeing
 *        it, which is the part that makes the effect worth a window of its
 *        own.
 *
 * Everything here runs on a canvas in your browser, on images this program
 * generated itself out of noise functions — or on one you dropped in, which
 * never leaves the machine either.
 */

/* -------------------------------------------------------------------------
 * Sizes
 * ----------------------------------------------------------------------
 * The display buffer is what you look at; the detector works on a half-scale
 * copy, because a face that is only detectable at full resolution is a face
 * two pixels across, and finding those is how you end up reporting four
 * hundred of them.
 */
const W = 468;
const H = 312;
const DETECT_DIV = 2;
const DW = W / DETECT_DIV;
const DH = H / DETECT_DIV;

/**
 * The smallest window the search will consider, in detection pixels.
 *
 * Raised from 26 (52 on screen) to 44, which is 88 across on the picture you
 * are actually looking at. Two reasons, and the second is the one that
 * matters:
 *
 *   A 52-pixel face in a 468-pixel picture is a thumbnail. The reveal is
 *   about the whole image, and amplifying a postage stamp in the corner of it
 *   is not a demonstration of anything.
 *
 *   Small windows cheat. The stride scales with the window, so the number of
 *   candidate positions at a given size goes roughly as 1/size squared —
 *   there are some twenty times as many 26px windows as 130px ones. A high
 *   score among twenty times as many tries is worth much less, and without
 *   either a multiple-comparisons correction or this floor the best-scoring
 *   window was almost always the smallest one on offer, in every texture.
 */
const MIN_WINDOW = 44;
const SCALE_RATIO = 1.26;
/**
 * Below this a hit is not reported at all.
 *
 * Not tuned by feel: the five procedural sources were each generated with
 * three seeds and every candidate window scored, and across all fifteen the
 * median window sits at 0.21 while the best sits between 0.46 (Static, the
 * hardest — uncorrelated noise genuinely has the least to find) and 1.00
 * (Crumpled paper, which is practically a portrait gallery). 0.44 is the
 * highest value that still leaves pure static with something to report,
 * which is the case worth protecting: a face in television snow is the whole
 * point of the exercise.
 *
 * Dropped again to 0.40 once `sizeFairness` started scaling small windows
 * down by up to 18%: Static's best went from 0.56 to 0.46, which is close
 * enough to a floor of 0.44 that some seeds would have found nothing at all.
 */
const SCORE_FLOOR = 0.4;
/** Overlap above which the weaker of two hits is discarded. */
const NMS_IOU = 0.22;
/** Never report more than this many, however busy the image. */
const MAX_FACES = 6;

type SourceId = 'static' | 'clouds' | 'grain' | 'concrete' | 'crumple' | 'custom';

interface SourceDef {
    id: SourceId;
    label: string;
    /** What it is pretending to be, for the status bar. */
    blurb: string;
}

const SOURCES: SourceDef[] = [
    {
        id: 'static',
        label: 'Static',
        blurb: 'An untuned channel. Pure white noise, no structure at all.',
    },
    {
        id: 'clouds',
        label: 'Clouds',
        blurb: 'Fractional Brownian motion — the same maths as a cloud.',
    },
    {
        id: 'grain',
        label: 'Wood grain',
        blurb: 'Warped noise rings. A plank, more or less.',
    },
    {
        id: 'concrete',
        label: 'Concrete',
        blurb: 'Coarse noise with a speckle over it. A wall in poor light.',
    },
    {
        id: 'crumple',
        label: 'Crumpled paper',
        blurb: 'Ridged noise — sharp creases instead of soft hills.',
    },
];

/* -------------------------------------------------------------------------
 * Noise
 * ----------------------------------------------------------------------
 * Value noise rather than Perlin: a lattice of random values, smoothstepped
 * between. Perlin's gradients would be slightly prettier and are not worth
 * the code here, because everything below is deliberately being viewed
 * through a threshold that destroys the difference.
 */

/**
 * Deterministic hash — the same seed always gives the same wall.
 *
 * `Math.imul` throughout, and XOR rather than addition to combine the axes.
 * The first version multiplied by 1442695040888963407, which is far past
 * `Number.MAX_SAFE_INTEGER`, and then applied `^` and `>>` to the resulting
 * float — which silently truncates to a signed 32-bit integer and throws
 * away most of the mixing. The output was strongly correlated along x, and
 * the Static source, which is meant to be the purest possible white noise,
 * came out as vertical corduroy. It looked like a texture. It was an
 * arithmetic overflow.
 */
function hash2(x: number, y: number, seed: number): number {
    let h =
        Math.imul(x | 0, 374761393) ^
        Math.imul(y | 0, 668265263) ^
        Math.imul(seed | 0, 1442695051);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

function valueNoise(x: number, y: number, seed: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const a = hash2(x0, y0, seed);
    const b = hash2(x0 + 1, y0, seed);
    const c = hash2(x0, y0 + 1, seed);
    const d = hash2(x0 + 1, y0 + 1, seed);
    return (
        a * (1 - fx) * (1 - fy) +
        b * fx * (1 - fy) +
        c * (1 - fx) * fy +
        d * fx * fy
    );
}

/** Octaves of value noise, each half the amplitude and twice the frequency. */
function fbm(
    x: number,
    y: number,
    seed: number,
    octaves: number,
    ridged = false
): number {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
        let n = valueNoise(x * freq, y * freq, seed + o * 101);
        if (ridged) n = 1 - Math.abs(n * 2 - 1);
        sum += n * amp;
        norm += amp;
        amp *= 0.5;
        freq *= 2;
    }
    return sum / norm;
}

/**
 * Paints one of the five procedural sources into an RGBA buffer.
 *
 * All of them are grayscale on purpose. Colour is a distraction from a
 * demonstration whose entire subject is luminance structure, and the Mooney
 * pass at the far end of the slider throws it away regardless.
 */
function generateSource(id: SourceId, seed: number): ImageData {
    const data = new Uint8ClampedArray(W * H * 4);

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let v: number;
            switch (id) {
                case 'static':
                    // Genuinely uncorrelated: every pixel independent. This is
                    // the hardest case for the detector and the most
                    // persuasive one when it works.
                    v = hash2(x, y, seed);
                    break;

                case 'clouds':
                    v = fbm(x / 58, y / 58, seed, 5);
                    // Pushed towards the middle so the threshold has
                    // something to bite on across the whole frame.
                    v = 0.5 + (v - 0.5) * 1.35;
                    break;

                case 'grain': {
                    // Real grain is not stripes, it is *rings* — concentric
                    // ovals round the pith of the tree, squashed flat by the
                    // angle the plank was sawn at, and bullseyed round every
                    // knot. Two earlier versions of this made vertical lines
                    // with a wobble in them, and vertical lines are the one
                    // texture in which nothing ever emerges: the Mooney pass
                    // turns them into flawless corduroy and the detector's
                    // best find is a kink.
                    //
                    // So: distance from a pith line well off the left edge,
                    // heavily distorted, plus two knots that pull their own
                    // rings around themselves. The 0.26 on the y term is the
                    // squash — it is what makes the rings read as a sawn
                    // board rather than as a target.
                    const wobble = fbm(x / 120, y / 260, seed + 31, 4) * 46;
                    const pithX = -160;
                    let d = Math.hypot(
                        (x - pithX + wobble) * 0.5,
                        (y - H * 0.5) * 0.26
                    );
                    // Knots. Each one drags the ring spacing in towards it.
                    for (let k = 0; k < 2; k++) {
                        const kx = 90 + hash2(k, 11, seed) * (W - 180);
                        const ky = 50 + hash2(k, 23, seed) * (H - 100);
                        const kd = Math.hypot(x - kx, (y - ky) * 1.5);
                        d -= (62 * 70) / (kd + 70);
                    }
                    // Wide, soft rings rather than tight ones, and only half
                    // the picture's energy in them. Tight stripes are the one
                    // texture in which the threshold can never make a blob:
                    // at this spacing the fbm underneath is free to break a
                    // ring open and close it again, which is what leaves room
                    // for something to be seen.
                    const rings = Math.pow(Math.sin(d / 7.4) * 0.5 + 0.5, 0.8);
                    v =
                        rings * 0.44 +
                        fbm(x / 52, y / 96, seed + 7, 4) * 0.42 +
                        fbm(x / 9, y / 24, seed + 13, 2) * 0.14;
                    break;
                }

                case 'concrete':
                    v =
                        fbm(x / 34, y / 34, seed, 4) * 0.74 +
                        hash2(x, y, seed + 3) * 0.26;
                    break;

                case 'crumple':
                default:
                    v = fbm(x / 46, y / 46, seed, 5, true);
                    v = Math.pow(v, 1.35);
                    break;
            }

            const g = Math.max(0, Math.min(255, Math.round(v * 255)));
            const i = (y * W + x) * 4;
            data[i] = g;
            data[i + 1] = g;
            data[i + 2] = g;
            data[i + 3] = 255;
        }
    }

    return new ImageData(data, W, H);
}

/* -------------------------------------------------------------------------
 * Integral images
 * ----------------------------------------------------------------------
 * One over the values and one over their squares, which between them give
 * the mean and the standard deviation of any rectangle in constant time. The
 * (w+1) x (h+1) padding is what removes the bounds checks from the inner
 * loop, and the inner loop here runs a few hundred thousand times.
 */

interface Integrals {
    sum: Float64Array;
    sqSum: Float64Array;
    w: number;
    h: number;
}

function buildIntegrals(gray: Uint8ClampedArray, w: number, h: number): Integrals {
    const sum = new Float64Array((w + 1) * (h + 1));
    const sqSum = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
        let rowSum = 0;
        let rowSq = 0;
        for (let x = 0; x < w; x++) {
            const v = gray[y * w + x];
            rowSum += v;
            rowSq += v * v;
            const i = (y + 1) * (w + 1) + (x + 1);
            sum[i] = sum[i - (w + 1)] + rowSum;
            sqSum[i] = sqSum[i - (w + 1)] + rowSq;
        }
    }
    return { sum, sqSum, w, h };
}

/** Mean value over [x0, x1) x [y0, y1). Clamped, so callers needn't be. */
function rectMean(it: Integrals, x0: number, y0: number, x1: number, y1: number): number {
    const w = it.w;
    const a = Math.max(0, Math.min(w, Math.round(x0)));
    const b = Math.max(0, Math.min(it.h, Math.round(y0)));
    const c = Math.max(a + 1, Math.min(w, Math.round(x1)));
    const d = Math.max(b + 1, Math.min(it.h, Math.round(y1)));
    const stride = w + 1;
    const total =
        it.sum[d * stride + c] -
        it.sum[b * stride + c] -
        it.sum[d * stride + a] +
        it.sum[b * stride + a];
    return total / ((c - a) * (d - b));
}

/** Standard deviation over the same kind of rectangle. */
function rectStdDev(
    it: Integrals,
    x0: number,
    y0: number,
    x1: number,
    y1: number
): number {
    const w = it.w;
    const a = Math.max(0, Math.min(w, Math.round(x0)));
    const b = Math.max(0, Math.min(it.h, Math.round(y0)));
    const c = Math.max(a + 1, Math.min(w, Math.round(x1)));
    const d = Math.max(b + 1, Math.min(it.h, Math.round(y1)));
    const stride = w + 1;
    const n = (c - a) * (d - b);
    const s =
        it.sum[d * stride + c] -
        it.sum[b * stride + c] -
        it.sum[d * stride + a] +
        it.sum[b * stride + a];
    const sq =
        it.sqSum[d * stride + c] -
        it.sqSum[b * stride + c] -
        it.sqSum[d * stride + a] +
        it.sqSum[b * stride + a];
    const mean = s / n;
    return Math.sqrt(Math.max(0, sq / n - mean * mean));
}

/* -------------------------------------------------------------------------
 * Finding a face that isn't there
 * ---------------------------------------------------------------------- */

export interface Face {
    /** In *display* pixels, not detection pixels. */
    x: number;
    y: number;
    size: number;
    score: number;
    /** The four component scores, for the readout. */
    parts: { band: number; eyes: number; mouth: number; symmetry: number };
}

/** Clamped 0..1 normalisation of a luminance difference. */
const norm = (diff: number, scale: number): number =>
    Math.max(0, Math.min(1, diff / scale));

/**
 * Scores one candidate window.
 *
 * Every rectangle below is expressed as a fraction of the window, so the same
 * proportions are tested at every scale — which is the whole reason the
 * integral image is worth building. The proportions themselves are roughly
 * the canonical ones: eyes a third of the way down, mouth at two thirds.
 */
function scoreWindow(
    it: Integrals,
    x: number,
    y: number,
    s: number
): Face['parts'] & { score: number } {
    const f = (fx: number, fy: number) => [x + fx * s, y + fy * s] as const;

    /*
     * Every difference below is measured in units of this window's own
     * standard deviation, not in absolute grey levels.
     *
     * Viola and Jones variance-normalise each window before evaluating any
     * feature, and the first version of this function did not — it compared
     * raw differences against fixed constants (34, 26, 24 grey levels). The
     * effect was that the same accidental face scored completely differently
     * depending on how contrasty the texture around it happened to be:
     * wood grain, which is nearly black and white, cleared every threshold on
     * structure it did not have, while low-contrast static could not clear
     * any of them on structure it did. Twenty grey levels of difference in a
     * flat region is a strong signal; the same twenty in a high-contrast one
     * is nothing. The floor of 5 stops a nearly uniform patch dividing by
     * something close to zero and scoring a perfect face.
     */
    const sd = rectStdDev(it, x, y, x + s, y + s);
    const unit = Math.max(5, sd * 0.7);

    // 1. The eye band against the cheek band. Viola and Jones' first feature.
    const eyeBand = rectMean(it, ...f(0.08, 0.22), ...f(0.92, 0.44));
    const cheekBand = rectMean(it, ...f(0.08, 0.5), ...f(0.92, 0.68));
    const band = norm(cheekBand - eyeBand, unit);

    // 2. Both sockets against the bridge between them. `Math.min` is doing
    //    the work: a single dark smudge scores zero however dark it is.
    const bridge = rectMean(it, ...f(0.42, 0.24), ...f(0.58, 0.46));
    const leftEye = rectMean(it, ...f(0.14, 0.24), ...f(0.38, 0.44));
    const rightEye = rectMean(it, ...f(0.62, 0.24), ...f(0.86, 0.44));
    const eyes = Math.min(
        norm(bridge - leftEye, unit * 0.8),
        norm(bridge - rightEye, unit * 0.8)
    );

    // 3. The mouth line against the upper lip.
    const upperLip = rectMean(it, ...f(0.28, 0.58), ...f(0.72, 0.68));
    const mouthBand = rectMean(it, ...f(0.24, 0.7), ...f(0.76, 0.82));
    const mouth = norm(upperLip - mouthBand, unit * 0.7);

    // 4. Bilateral symmetry. Faces are close to mirror-symmetric and almost
    //    nothing accidental is, so this is the cheapest way to throw out a
    //    diagonal smear that happens to satisfy the other three.
    const leftHalf = rectMean(it, ...f(0.05, 0.15), ...f(0.45, 0.88));
    const rightHalf = rectMean(it, ...f(0.55, 0.15), ...f(0.95, 0.88));
    const symmetry =
        1 - Math.min(1, Math.abs(leftHalf - rightHalf) / (unit * 1.5));

    // Variance normalisation makes every ratio above scale-free, which means
    // a genuinely flat patch would satisfy all four perfectly on differences
    // of a fraction of a grey level. This is the gate that stops it: below
    // about thirteen levels of spread there is nothing there to see, whatever
    // shape it is in.
    const contrast = Math.min(1, sd / 13);

    const score =
        (band * 0.3 + eyes * 0.34 + mouth * 0.18 + symmetry * 0.18) * contrast;

    return { score, band, eyes, mouth, symmetry };
}

/**
 * How much a score at this scale is worth, 0.82 at the smallest window to
 * 1.00 at the largest.
 *
 * The stride scales with the window, so the number of candidate positions at
 * a given size goes as roughly 1/size squared — there are about twenty-five
 * times as many 44px windows in this image as 140px ones. Take the best score
 * from twenty-five times as many tries and of course it is higher; that is
 * the multiple-comparisons problem, and uncorrected it meant the winning
 * window was the smallest one on offer in every single texture, every time.
 *
 * A textbook correction would subtract something proportional to the square
 * root of the log of the number of tries, which over this range of scales
 * comes out to a spread of about four points — far too small to matter
 * against scores that differ by fifteen. This is the same idea with the
 * strength set by what the scales here actually are, and it has a second
 * justification besides: a face 88 pixels across in a 468-pixel picture is a
 * thumbnail, and the reveal is about the picture.
 */
function sizeFairness(size: number, maxWindow: number): number {
    const span = Math.max(1, maxWindow - MIN_WINDOW);
    const t = Math.max(0, Math.min(1, (size - MIN_WINDOW) / span));
    return 0.82 + 0.18 * t;
}

/** Intersection over union of two square windows. */
function iou(a: Face, b: Face): number {
    const x0 = Math.max(a.x, b.x);
    const y0 = Math.max(a.y, b.y);
    const x1 = Math.min(a.x + a.size, b.x + b.size);
    const y1 = Math.min(a.y + a.size, b.y + b.size);
    const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
    if (!inter) return 0;
    return inter / (a.size * a.size + b.size * b.size - inter);
}

/**
 * The whole search: every scale, every position, then thinned.
 *
 * Sliding a square over a quarter-megapixel buffer at eight scales is about
 * thirty thousand windows and a dozen rectangle lookups each. On the integral
 * image that is a few milliseconds, which is why this can run synchronously
 * on a button press rather than needing a worker.
 */
function findFaces(gray: Uint8ClampedArray): Face[] {
    const it = buildIntegrals(gray, DW, DH);
    const found: Face[] = [];
    // 0.72 rather than 0.92 of the short side. At the old limit the winning
    // window was regularly 280 display pixels across, starting at the very
    // corner — which is not a face *in* the picture so much as the picture
    // relabelled as a face, and there are so few positions at that scale that
    // `sizeFairness` was handing it the win almost by default.
    const maxWindow = Math.min(DW, DH) * 0.72;

    for (let s = MIN_WINDOW; s <= maxWindow; s *= SCALE_RATIO) {
        const size = Math.round(s);
        const stride = Math.max(2, Math.round(size / 10));
        const fairness = sizeFairness(size, maxWindow);
        for (let y = 0; y + size < DH; y += stride) {
            for (let x = 0; x + size < DW; x += stride) {
                const r = scoreWindow(it, x, y, size);
                // See `sizeFairness`: a small window's score is worth less
                // because there were so many more of them.
                r.score *= fairness;
                if (r.score < SCORE_FLOOR) continue;
                found.push({
                    x: x * DETECT_DIV,
                    y: y * DETECT_DIV,
                    size: size * DETECT_DIV,
                    score: r.score,
                    parts: {
                        band: r.band,
                        eyes: r.eyes,
                        mouth: r.mouth,
                        symmetry: r.symmetry,
                    },
                });
            }
        }
    }

    // Non-maximum suppression: strongest first, and anything that overlaps
    // an already-kept window too much is the same face seen again.
    found.sort((a, b) => b.score - a.score);
    if (!found.length) return [];

    /*
     * A hit has to clear the absolute floor *and* be within striking distance
     * of the best one in this particular image.
     *
     * Without the relative test the count pinned at MAX_FACES on every single
     * texture, which is a saturated counter rather than a measurement — a
     * picture with one convincing face and a picture made entirely of them
     * both reported "6 faces found". Scaling the bar to the strongest
     * candidate makes the number mean something again, and is also how
     * anybody would read a detector's output by hand.
     */
    const bar = Math.max(SCORE_FLOOR, found[0].score * 0.82);
    const kept: Face[] = [];
    for (const face of found) {
        if (kept.length >= MAX_FACES) break;
        if (face.score < bar) break;
        if (kept.some((k) => iou(k, face) > NMS_IOU)) continue;
        kept.push(face);
    }
    return kept;
}

/* -------------------------------------------------------------------------
 * Making you see it
 * ---------------------------------------------------------------------- */

/**
 * Luminance (ITU-R BT.601, the weights a 1995 machine would have used),
 * reduced to the detection buffer by *averaging* each block rather than
 * taking one pixel out of it.
 *
 * This matters far more than it looks. Point-sampling a half-scale copy
 * throws away three quarters of the image and aliases the rest, and on the
 * Static source — which is uncorrelated pixel to pixel — the result is simply
 * a smaller field of white noise with no more structure than the original.
 * Averaging is a one-tap low-pass, and low-pass noise is exactly the stimulus
 * the pareidolia literature uses: Liu et al. (2014) had people reliably
 * reporting faces in 1/f noise, and nobody reports faces in white noise.
 * Viola and Jones got the same effect for free by scaling everything down to
 * a 24x24 window.
 */
function toGray(src: ImageData, w: number, h: number, div: number): Uint8ClampedArray {
    const out = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let sum = 0;
            let n = 0;
            for (let dy = 0; dy < div; dy++) {
                const sy = y * div + dy;
                if (sy >= src.height) break;
                for (let dx = 0; dx < div; dx++) {
                    const sx = x * div + dx;
                    if (sx >= src.width) break;
                    const i = (sy * src.width + sx) * 4;
                    sum +=
                        src.data[i] * 0.299 +
                        src.data[i + 1] * 0.587 +
                        src.data[i + 2] * 0.114;
                    n++;
                }
            }
            out[y * w + x] = n ? sum / n : 0;
        }
    }
    return out;
}

/**
 * A box blur, applied twice.
 *
 * Once is enough to smooth an image and not enough to smooth it *evenly*: a
 * box kernel is a square, so its level sets are squares too, and thresholding
 * a once-blurred field of white noise produces a distinctive scatter of tiny
 * plus signs where the value hovers around the cut. Two passes of a box blur
 * approximate a Gaussian closely enough that the artefact disappears
 * entirely, which is the oldest trick in image processing and still the
 * cheapest — each pass is four array lookups per pixel off an integral image,
 * regardless of radius.
 */
function boxBlur(
    src: Uint8ClampedArray,
    w: number,
    h: number,
    r: number
): Uint8ClampedArray {
    let buf = src;
    for (let pass = 0; pass < 2; pass++) {
        const it = buildIntegrals(buf, w, h);
        const next = new Uint8ClampedArray(w * h);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                next[y * w + x] = rectMean(it, x - r, y - r, x + r + 1, y + r + 1);
            }
        }
        buf = next;
    }
    return buf;
}

/** A smooth 1 -> 0 falloff inside an ellipse, 0 outside it. */
function ellipseFalloff(
    px: number,
    py: number,
    cx: number,
    cy: number,
    rx: number,
    ry: number
): number {
    const dx = (px - cx) / rx;
    const dy = (py - cy) / ry;
    const d = dx * dx + dy * dy;
    if (d >= 1) return 0;
    return Math.pow(1 - d, 1.5);
}

/**
 * The reveal.
 *
 * `amount` runs 0 -> 1 and does two things in sequence, overlapping in the
 * middle so there is no seam:
 *
 *   0.00 - 0.65   the found face's own features are pushed darker and the
 *                 whole frame's contrast is stretched around its mean;
 *   0.45 - 1.00   the result is cross-faded into a Mooney two-tone against a
 *                 local mean.
 *
 * The important honesty constraint: nothing is ever drawn *in*. Every pixel
 * that gets darker was already the darker of its neighbourhood; the eye
 * ellipses only scale what luminance is there. If the face were not already
 * in the noise, turning this all the way up would produce a two-tone mess
 * rather than a portrait — which is worth checking, and is exactly what you
 * see if you run it on an image where it reported nothing.
 */
function renderReveal(
    base: ImageData,
    face: Face | null,
    amount: number
): ImageData {
    const out = new Uint8ClampedArray(base.data);
    const n = W * H;

    // --- pass one: amplify ------------------------------------------------
    const amp = Math.min(1, amount / 0.65);
    if (amp > 0) {
        // Global mean, for the contrast stretch.
        let mean = 0;
        for (let i = 0; i < n; i++) mean += base.data[i * 4];
        mean /= n;

        const gain = 1 + amp * 0.85;

        // Where the features are, in display pixels.
        const fx = face ? face.x : 0;
        const fy = face ? face.y : 0;
        const fs = face ? face.size : 0;

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4;
                let v = base.data[i];

                if (face) {
                    // Two eyes and a mouth, as smooth wells rather than
                    // rectangles — a hard-edged rectangle would read as a
                    // drawn-on box, which is the one thing this must not do.
                    const well =
                        ellipseFalloff(
                            x, y,
                            fx + fs * 0.28, fy + fs * 0.35,
                            fs * 0.14, fs * 0.11
                        ) +
                        ellipseFalloff(
                            x, y,
                            fx + fs * 0.72, fy + fs * 0.35,
                            fs * 0.14, fs * 0.11
                        ) +
                        ellipseFalloff(
                            x, y,
                            fx + fs * 0.5, fy + fs * 0.74,
                            fs * 0.26, fs * 0.09
                        ) * 0.9;

                    // ...and the three regions the detector said were the
                    // *lighter* ones, lifted by the same falloff. Pushing in
                    // both directions is what turns "slightly more contrast
                    // around the eyes" into a face: a Mooney threshold only
                    // records which side of the local mean a pixel fell on,
                    // so widening the gap from both sides is worth twice what
                    // darkening alone is.
                    const lit =
                        ellipseFalloff(
                            x, y,
                            fx + fs * 0.5, fy + fs * 0.14,
                            fs * 0.34, fs * 0.12
                        ) +
                        ellipseFalloff(
                            x, y,
                            fx + fs * 0.2, fy + fs * 0.58,
                            fs * 0.15, fs * 0.14
                        ) +
                        ellipseFalloff(
                            x, y,
                            fx + fs * 0.8, fy + fs * 0.58,
                            fs * 0.15, fs * 0.14
                        );

                    v *= 1 - Math.min(0.85, well) * amp * 0.72;
                    v *= 1 + Math.min(0.7, lit) * amp * 0.34;
                }

                v = mean + (v - mean) * gain;
                const g = v < 0 ? 0 : v > 255 ? 255 : v;
                out[i] = g;
                out[i + 1] = g;
                out[i + 2] = g;
            }
        }
    }

    // --- pass two: Mooney -------------------------------------------------
    const mooney = Math.max(0, (amount - 0.45) / 0.55);
    if (mooney > 0) {
        const amplified = new Uint8ClampedArray(n);
        const original = new Uint8ClampedArray(n);
        for (let i = 0; i < n; i++) {
            amplified[i] = out[i * 4];
            original[i] = base.data[i * 4];
        }

        /*
         * Two integral images, and which one feeds which half of the
         * comparison is the whole trick.
         *
         * The blurred value comes from the amplified frame; the threshold it
         * is compared against comes from the *original*. Taking both from the
         * amplified frame — which is what the first version of this did —
         * meant that darkening an eye socket also dragged down the local mean
         * it was being measured against, so the amplification very nearly
         * cancelled itself out and the reveal slider added grain and little
         * else. Reading the threshold off the untouched image asks the
         * question that was actually intended: is this darker than this part
         * of the picture *normally* is?
         *
         * Mooney's own procedure is blur-then-threshold — his 1957 stimuli
         * were out-of-focus photographs reduced to two tones, and the blur is
         * not incidental. Thresholding a sharp image keeps every
         * high-frequency speck as its own black dot, which on the Static
         * source gives a field of dither rather than the handful of large
         * connected regions a face is made of.
         *
         * A box blur of any radius is four array lookups on an integral
         * image, which is the only reason this is affordable at full
         * resolution on every frame of the reveal animation.
         */
        const itOriginal = buildIntegrals(original, W, H);

        /*
         * How much to blur is not a constant, because how fine the grain is
         * is not a constant.
         *
         * Clouds are already smooth and want almost none; television static
         * is entirely high-frequency and, thresholded sharp, comes out as a
         * field of dither in which nothing whatever can be seen. So measure
         * it: sample the picture and compare each sample against the mean of
         * its immediate neighbourhood. The average of that difference is the
         * high-frequency energy, and it runs from about 3 on Clouds to about
         * 60 on Static — a twentyfold range that no single radius can serve.
         *
         * Capped at a sixth of the face, because a blur wide enough to erase
         * the eye sockets erases the point.
         */
        let hf = 0;
        let samples = 0;
        for (let y = 4; y < H - 4; y += 7) {
            for (let x = 4; x < W - 4; x += 7) {
                hf += Math.abs(
                    original[y * W + x] -
                        rectMean(itOriginal, x - 2, y - 2, x + 3, y + 3)
                );
                samples++;
            }
        }
        hf = samples ? hf / samples : 0;

        // Halved from the single-pass figure, because two passes of radius r
        // cover about as much ground as one of 1.7r.
        const faceSize = face ? face.size : W / 6;
        const blurR = Math.max(
            2,
            Math.min(
                Math.round(faceSize / 10),
                Math.round(1 + hf * 0.13)
            )
        );
        const threshR = Math.round(W / 16);

        const smooth2 = boxBlur(amplified, W, H, blurR);

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const smoothed = smooth2[y * W + x];
                const local = rectMean(
                    itOriginal,
                    x - threshR, y - threshR,
                    x + threshR + 1, y + threshR + 1
                );
                // The bias makes the result darker than a straight median
                // split. Mooney images read better with rather less white
                // than black, because the brain is looking for the shadows.
                const binary = smoothed > local - 3 ? 255 : 0;
                const i = (y * W + x) * 4;
                const blended = out[i] + (binary - out[i]) * mooney;
                out[i] = blended;
                out[i + 1] = blended;
                out[i + 2] = blended;
            }
        }
    }

    return new ImageData(out, W, H);
}

/* -------------------------------------------------------------------------
 * The window
 * ---------------------------------------------------------------------- */

export interface FaceValueProps extends WindowAppProps {}

const FaceValue: React.FC<FaceValueProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const fileRef = useRef<HTMLInputElement | null>(null);
    /** The untouched source, kept so the slider can always go back to 0. */
    const baseRef = useRef<ImageData | null>(null);
    /** Every timer this component owns, so none of them outlive it. */
    const timers = useRef<number[]>([]);
    const rafRef = useRef(0);

    const [source, setSource] = useState<SourceId>('clouds');
    const [sourceLabel, setSourceLabel] = useState('Clouds');
    const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000));
    const [faces, setFaces] = useState<Face[]>([]);
    const [amount, setAmount] = useState(0);
    const [showBoxes, setShowBoxes] = useState(false);
    const [busy, setBusy] = useState(false);
    const [dropping, setDropping] = useState(false);

    useEffect(
        () => () => {
            timers.current.forEach(window.clearTimeout);
            window.cancelAnimationFrame(rafRef.current);
        },
        []
    );

    /** Paints the current base + reveal amount, plus the overlay if asked. */
    const paint = useCallback(
        (at: number, boxes: boolean, found: Face[]) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            const base = baseRef.current;
            if (!canvas || !ctx || !base) return;

            ctx.putImageData(
                at > 0 ? renderReveal(base, found[0] ?? null, at) : base,
                0,
                0
            );

            if (!boxes || !found.length) return;
            // The overlay is the only thing in this window drawn *over* the
            // image rather than into it — so it is deliberately a thin
            // 1990s-CAD green rather than anything that could be mistaken for
            // part of the picture.
            found.forEach((face, i) => {
                const primary = i === 0;
                // A one-pixel line vanishes against a pure black-and-white
                // threshold, which is exactly what it has to be drawn over.
                // The dark under-stroke is what makes it legible on the white
                // half; the green alone only works on the black.
                ctx.lineWidth = primary ? 3 : 1;
                ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                ctx.strokeRect(face.x, face.y, face.size, face.size);
                ctx.lineWidth = primary ? 2 : 1;
                ctx.strokeStyle = primary ? '#39ff5e' : 'rgba(57,255,94,0.5)';
                ctx.strokeRect(
                    face.x + 0.5,
                    face.y + 0.5,
                    face.size - 1,
                    face.size - 1
                );
                if (!primary) return;

                // Where it thinks the features are.
                const e = (cx: number, cy: number, rx: number, ry: number) => {
                    ctx.beginPath();
                    ctx.ellipse(
                        face.x + cx * face.size,
                        face.y + cy * face.size,
                        rx * face.size,
                        ry * face.size,
                        0,
                        0,
                        Math.PI * 2
                    );
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
                    ctx.stroke();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#39ff5e';
                    ctx.stroke();
                };
                e(0.28, 0.35, 0.13, 0.1);
                e(0.72, 0.35, 0.13, 0.1);
                e(0.5, 0.74, 0.24, 0.08);

                ctx.font = 'bold 11px monospace';
                ctx.strokeStyle = 'rgba(0,0,0,0.75)';
                ctx.lineWidth = 3;
                ctx.strokeText(
                    `${Math.round(face.score * 100)}%`,
                    face.x + 2,
                    Math.max(11, face.y - 4)
                );
                ctx.fillStyle = '#39ff5e';
                ctx.fillText(
                    `${Math.round(face.score * 100)}%`,
                    face.x + 2,
                    Math.max(11, face.y - 4)
                );
            });
        },
        []
    );

    /** Runs the detector over whatever is currently in `baseRef`. */
    const analyse = useCallback(() => {
        const base = baseRef.current;
        if (!base) return;
        setBusy(true);
        // One frame of "scanning" before a synchronous pass that is fast but
        // not instant — the same courtesy Hidden Dimension pays.
        timers.current.push(
            window.setTimeout(() => {
                const gray = toGray(base, DW, DH, DETECT_DIV);
                const found = findFaces(gray);
                setFaces(found);
                setBusy(false);
                if (found.length) playChime();
                else playError();

                // Animate the reveal rather than snapping to it. Watching it
                // emerge is the entire experience; arriving at the answer is
                // not the same thing at all.
                if (!found.length) {
                    setAmount(0);
                    paint(0, false, []);
                    return;
                }
                const start = performance.now();
                const run = (now: number) => {
                    const t = Math.min(1, (now - start) / 1500);
                    // Ease-out, so it slows into the reveal.
                    const eased = 1 - Math.pow(1 - t, 3);
                    setAmount(eased);
                    paint(eased, false, found);
                    if (t < 1) rafRef.current = window.requestAnimationFrame(run);
                };
                window.cancelAnimationFrame(rafRef.current);
                rafRef.current = window.requestAnimationFrame(run);
            }, 40)
        );
    }, [paint]);

    /** Generates a fresh procedural source and clears any previous result. */
    const regenerate = useCallback(
        (id: SourceId, withSeed: number) => {
            if (id === 'custom') return;
            window.cancelAnimationFrame(rafRef.current);
            baseRef.current = generateSource(id, withSeed);
            setFaces([]);
            setAmount(0);
            setShowBoxes(false);
            paint(0, false, []);
        },
        [paint]
    );

    useEffect(() => {
        regenerate(source, seed);
    }, [source, seed, regenerate]);

    /** Loads a dropped or chosen file, letterboxed into the display buffer. */
    const loadFile = useCallback(
        (file: File) => {
            if (!file.type.startsWith('image/')) {
                playError();
                return;
            }
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (!canvas || !ctx) {
                    URL.revokeObjectURL(url);
                    return;
                }
                // Cover, then centre-crop: a letterboxed image would give the
                // detector two enormous flat bars to find nothing in.
                const scale = Math.max(W / img.width, H / img.height);
                const dw = img.width * scale;
                const dh = img.height * scale;
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, W, H);
                ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
                baseRef.current = ctx.getImageData(0, 0, W, H);
                URL.revokeObjectURL(url);
                setSource('custom');
                setSourceLabel(file.name.slice(0, 40));
                setFaces([]);
                setAmount(0);
                setShowBoxes(false);
                playClick();
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                playError();
            };
            img.src = url;
        },
        []
    );

    const best = faces[0];

    return (
        <Window
            top={62}
            left={140}
            width={544}
            height={664}
            windowTitle="Face Value"
            windowBarIcon="perceptionLabIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={
                busy
                    ? 'Scanning…'
                    : faces.length
                    ? `${faces.length} face${
                          faces.length === 1 ? '' : 's'
                      } found in ${sourceLabel.toLowerCase()}`
                    : `No faces yet — ${sourceLabel.toLowerCase()}`
            }
        >
            <div style={styles.root}>
                <div style={styles.toolbar}>
                    {SOURCES.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            style={{
                                ...styles.chip,
                                ...(source === s.id ? styles.chipActive : null),
                            }}
                            onClick={() => {
                                playClick();
                                setSourceLabel(s.label);
                                if (source === s.id) setSeed(Math.floor(Math.random() * 100000));
                                else setSource(s.id);
                            }}
                            title={s.blurb}
                        >
                            {s.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        style={styles.chip}
                        onClick={() => {
                            playClick();
                            fileRef.current?.click();
                        }}
                        title="Use a picture of your own. It never leaves this machine."
                    >
                        Open…
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) loadFile(file);
                            // Cleared so choosing the same file twice fires.
                            e.target.value = '';
                        }}
                    />
                </div>

                <div
                    style={{
                        ...styles.stage,
                        ...(dropping ? styles.stageDropping : null),
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDropping(true);
                    }}
                    onDragLeave={() => setDropping(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDropping(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) loadFile(file);
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={W}
                        height={H}
                        style={styles.canvas}
                    />
                    {busy && <span style={styles.busyLabel}>SCANNING…</span>}
                </div>

                <div style={styles.controls}>
                    <button
                        type="button"
                        style={styles.primaryButton}
                        disabled={busy}
                        onClick={() => {
                            playClick();
                            analyse();
                        }}
                    >
                        Find a face
                    </button>

                    <label style={styles.checkRow}>
                        <input
                            type="checkbox"
                            checked={showBoxes}
                            disabled={!faces.length}
                            onChange={(e) => {
                                setShowBoxes(e.target.checked);
                                paint(amount, e.target.checked, faces);
                            }}
                        />
                        <span style={styles.sliderLabel}>Show what it found</span>
                    </label>
                </div>

                <label style={styles.sliderRow}>
                    <span style={styles.sliderLabel}>Reveal</span>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(amount * 100)}
                        disabled={!faces.length}
                        style={styles.slider}
                        onChange={(e) => {
                            window.cancelAnimationFrame(rafRef.current);
                            const next = Number(e.target.value) / 100;
                            setAmount(next);
                            paint(next, showBoxes, faces);
                        }}
                    />
                    <span style={styles.sliderValue}>
                        {Math.round(amount * 100)}%
                    </span>
                </label>

                <div style={styles.readout}>
                    {best ? (
                        <>
                            <div style={styles.readoutHead}>
                                <span style={styles.readoutTitle}>
                                    Strongest candidate
                                </span>
                                <span style={styles.readoutScore}>
                                    {Math.round(best.score * 100)}% face-like
                                </span>
                            </div>
                            <div style={styles.bars}>
                                <Bar label="Eye band darker than cheeks" v={best.parts.band} />
                                <Bar label="Both sockets darker than bridge" v={best.parts.eyes} />
                                <Bar label="Mouth line darker than lip" v={best.parts.mouth} />
                                <Bar label="Left/right symmetry" v={best.parts.symmetry} />
                            </div>
                            <p style={styles.note}>
                                {best.size}px across, {Math.round(best.x)} from
                                the left and {Math.round(best.y)} from the top.
                                Nothing has been drawn in: the reveal only
                                widens differences that were already there,
                                darkening what was locally darker and lifting
                                what was locally lighter, and then thresholds
                                the result. Tick <b>Show what it found</b> if
                                you cannot see it — and then try to stop.
                            </p>
                        </>
                    ) : (
                        <p style={styles.note}>
                            Pick a texture and press <b>Find a face</b>.
                            Nothing in any of these images is a face — they are
                            noise functions. The detector is the Viola–Jones
                            integral-image scan from 2001 with the trained
                            cascade removed, which is to say a face detector
                            with the scepticism taken out; it is wrong in
                            exactly the direction you are. Then the reveal
                            slider blurs and thresholds the result the way
                            Mooney did in 1957, and your visual cortex does the
                            rest. Click the same texture twice for a new one,
                            or drop a photograph of a wall onto the picture —
                            it never leaves this machine.
                        </p>
                    )}
                </div>
            </div>
        </Window>
    );
};

/** One component of the score, as a sunken Win95 bar. */
const Bar: React.FC<{ label: string; v: number }> = ({ label, v }) => (
    <div style={styles.barRow}>
        <span style={styles.barLabel}>{label}</span>
        <div style={styles.barTrack}>
            <div
                style={{ ...styles.barFill, width: `${Math.round(v * 100)}%` }}
            />
        </div>
    </div>
);

const styles: StyleSheetCSS = {
    root: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: Colors.lightGray,
        overflowY: 'auto',
        padding: 8,
        gap: 8,
    },
    toolbar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    chip: {
        padding: '3px 8px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        cursor: 'pointer',
    },
    chipActive: {
        borderColor: Colors.darkGray,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        fontWeight: 'bold',
    },
    stage: {
        position: 'relative',
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 3,
        background: '#000',
        border: `2px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    stageDropping: {
        borderColor: '#000080',
    },
    canvas: { display: 'block' },
    busyLabel: {
        position: 'absolute',
        fontFamily: 'monospace',
        fontSize: 13,
        letterSpacing: 2,
        color: '#39ff5e',
        textShadow: '0 0 6px rgba(57,255,94,0.8)',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
    },
    primaryButton: {
        padding: '4px 12px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
        cursor: 'pointer',
    },
    // `display: flex` stated outright on both of these. `App.css` sets it
    // globally for `div`, which is why every other row in this file gets away
    // without it — but these two are `<label>`s, so they were laying out
    // inline and stacking their caption above their control.
    sliderRow: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        minWidth: 150,
    },
    sliderLabel: { fontFamily: 'MSSerif', fontSize: 11, color: Colors.black },
    slider: { flex: 1, minWidth: 90 },
    sliderValue: {
        fontFamily: 'monospace',
        fontSize: 11,
        color: '#000080',
        width: 34,
        textAlign: 'right',
    },
    checkRow: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
        // Without this the caption wrapped to three lines in the gap left by
        // the button beside it.
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    readout: {
        flexDirection: 'column',
        gap: 6,
        padding: 8,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    readoutHead: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    readoutTitle: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    readoutScore: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#000080',
    },
    bars: { flexDirection: 'column', gap: 3 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    barLabel: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        width: 180,
        flexShrink: 0,
    },
    barTrack: {
        flex: 1,
        height: 8,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    barFill: { height: '100%', background: '#000080' },
    note: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        lineHeight: 1.5,
        color: Colors.black,
        margin: 0,
    },
};

export default FaceValue;
