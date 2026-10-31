/**
 * The bit of animation craft the desktop pet was missing.
 * --------------------------------------------------------
 * Everything the creature did before this file was a sine wave. `ty =
 * -Math.abs(Math.sin(now / 110)) * 12` is a hop, technically: the sprite goes
 * up, the sprite comes down, the timing is perfectly smooth. It is also
 * unmistakably a *sprite being moved by a formula* rather than a thing that
 * jumped, and the reason is that real motion is not smooth. It hesitates
 * before it commits, it accelerates downhill, it overshoots on arrival, and
 * it holds still on the poses that carry the meaning.
 *
 * Where this came from
 * --------------------
 * Codrops published a reverse-engineering of Anthropic's own Claude mascot
 * animations in May 2026 — the walking, flag-waving, dumbbell-lifting pixel
 * character built out of SVG `<rect>`s and driven by GSAP. Three things in it
 * are worth more than the rest of the article put together, and all three are
 * implemented below:
 *
 *   Frames are not evenly timed.  Their gym animation runs most frames at
 *   85ms, but holds frames 6-7 — the top of the lift, where the effort is —
 *   for 270ms, and the two rep-change frames for 400ms. A quarter of a second
 *   of *nothing happening* is what makes the other frames read as effort.
 *   Even timing is what makes an animation look like a flipbook.
 *
 *   The jump is asymmetric.  Ascent 0.42s on `sine.out`; descent 0.2s on
 *   `power3.in`. Going up takes twice as long as coming down and uses the
 *   opposite easing, because that is what gravity does. `Math.abs(Math.sin())`
 *   is perfectly symmetric and therefore perfectly wrong.
 *
 *   There is anticipation.  Before the jump, a 0.1s crouch: `.to(body, { y: 8,
 *   duration: 0.1, ease: "power3.in" })`. Nothing in nature launches from
 *   rest. The crouch is what tells you a jump is coming, and it costs one
 *   keyframe.
 *
 * The same ideas turn up in OpenAI's Codex CLI pets, which ship as a fixed
 * 8x9 sprite atlas of 192x208 cells — nine states, each with its own frame
 * count rather than a uniform eight (idle 6, running 8, waving 4, jumping 5,
 * failed 8, waiting 6, review 6). Different states get different numbers of
 * frames because different actions need different amounts of dwell.
 *
 * Why a keyframe track rather than a spritesheet
 * ----------------------------------------------
 * Both of those mascots have dozens of drawn frames to hold *on*. This
 * desktop's animals are posed by a skeleton instead (`pet/animate.ts`), so
 * there is no frame to hold — but a hold is just two keyframes with the same
 * value, and an asymmetric arc is just two keyframes with different easings.
 * The track below gets the timing right for a rig exactly as it would for a
 * sheet, and the pet's jumps, presses and yawns are all driven by it.
 */

/* -------------------------------------------------------------------------
 * Easing
 * ----------------------------------------------------------------------
 * Named after GSAP's, because that is what the reference animations used and
 * matching the names makes them comparable.
 */

/** Linear. The default between keys, and almost never the right choice. */
export const linear = (t: number): number => t;

/** `power3.in` — creeps, then rushes. Falling, and the crouch before a jump. */
export const easeIn = (t: number): number => t * t * t;

/** `power3.out` — rushes, then settles. Arrivals and recoveries. */
export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/** `sine.out` — gentler than cubic. The rise into the apex of a jump. */
export const sineOut = (t: number): number => Math.sin((t * Math.PI) / 2);

/** `power2.inOut` — eases both ends. Sways and leans. */
export const easeInOut = (t: number): number =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** Overshoots and comes back. The landing bounce, and a hat settling. */
export const backOut = (t: number): number => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/* -------------------------------------------------------------------------
 * The keyframe track
 * ---------------------------------------------------------------------- */

export interface Keyframe {
    /** Where in the phase this value is reached, 0..1. Must ascend. */
    at: number;
    /** The value at that moment. */
    v: number;
    /**
     * How to get here from the previous key. Applied across the *incoming*
     * segment, which is the convention every timeline tool uses and the one
     * that makes a hold readable: repeat a value and the easing is irrelevant.
     */
    ease?: (t: number) => number;
}

/**
 * Samples a keyframed value at phase `t` (0..1).
 *
 * Deliberately tiny and allocation-free — this runs several times per frame
 * per creature, inside a `requestAnimationFrame` loop that is also doing
 * physics for a ball and a biscuit.
 *
 * Two adjacent keys with the same `v` produce a hold, which is the entire
 * point of the exercise: it is how the reference animations buy a quarter of
 * a second of stillness at the top of a lift without drawing anything.
 */
export function track(t: number, keys: Keyframe[]): number {
    const n = keys.length;
    if (!n) return 0;
    const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;

    if (clamped <= keys[0].at) return keys[0].v;
    if (clamped >= keys[n - 1].at) return keys[n - 1].v;

    for (let i = 1; i < n; i++) {
        const b = keys[i];
        if (clamped > b.at) continue;
        const a = keys[i - 1];
        const span = b.at - a.at;
        // Zero-length segments are a legitimate way to write a hard cut, and
        // dividing by the span would turn one into a NaN that propagates into
        // the transform string and blanks the sprite.
        if (span <= 0) return b.v;
        const local = (clamped - a.at) / span;
        const eased = (b.ease ?? linear)(local);
        return a.v + (b.v - a.v) * eased;
    }
    return keys[n - 1].v;
}

/* -------------------------------------------------------------------------
 * A jump that reads as a jump
 * ----------------------------------------------------------------------
 * Five beats, and only one of them is the part where it is off the ground:
 *
 *   0.00-0.14  crouch. Anticipation. Squashes down and *stays* down for a
 *              moment — the hold is what makes the launch read as effort
 *              rather than as a float.
 *   0.14-0.52  ascent, `sine.out`. Decelerating into the apex.
 *   0.52-0.60  the apex, held. Eight percent of nothing at all, which is the
 *              single cheapest thing on this list and the most effective.
 *   0.60-0.82  descent, `power3.in`. Accelerating, and covering the same
 *              distance in well under half the time the rise took.
 *   0.82-1.00  land, squash, recover with a small overshoot.
 *
 * There is no horizontal squash to key: the rig in `pet/animate.ts` takes
 * `JUMP_SY` as how deep to crouch, so the squash happens in bent legs
 * rather than in a sprite being flattened, and the animal keeps its mass.
 */
export const JUMP_Y: Keyframe[] = [
    { at: 0, v: 0 },
    { at: 0.1, v: 3, ease: easeIn },
    { at: 0.14, v: 3 },
    { at: 0.52, v: -13, ease: sineOut },
    { at: 0.6, v: -13 },
    { at: 0.82, v: 0, ease: easeIn },
    { at: 0.88, v: 2.5, ease: easeOut },
    { at: 1, v: 0, ease: backOut },
];

export const JUMP_SY: Keyframe[] = [
    { at: 0, v: 1 },
    { at: 0.1, v: 0.86, ease: easeIn },
    { at: 0.14, v: 0.86 },
    { at: 0.26, v: 1.12, ease: easeOut },
    { at: 0.52, v: 1.0, ease: easeInOut },
    { at: 0.6, v: 1.0 },
    { at: 0.82, v: 1.08, ease: easeIn },
    { at: 0.88, v: 0.84, ease: easeOut },
    { at: 1, v: 1, ease: backOut },
];

/* -------------------------------------------------------------------------
 * A press that actually presses
 * ----------------------------------------------------------------------
 * The `press` reaction leans on a Start button. Driven by a sine it looked
 * like a creature rocking; what a press needs is a fast approach, a *hold* at
 * the bottom while the button is down, and a slower release. Same shape as
 * the gym animation's effort frames.
 */
export const PRESS: Keyframe[] = [
    { at: 0, v: 0 },
    { at: 0.06, v: -0.15, ease: easeOut },
    { at: 0.3, v: 1, ease: easeIn },
    { at: 0.62, v: 1 },
    { at: 0.85, v: 0, ease: easeOut },
    { at: 1, v: 0 },
];

/* -------------------------------------------------------------------------
 * Attention
 * ----------------------------------------------------------------------
 * OpenAI's Codex pets ship sixteen distinct "look" directions in their sprite
 * atlas, and it is the thing that makes them feel awake: the creature is
 * plainly *aimed at something*. The drawn animals do it properly now — the
 * head turns on its rig and the pupils move (see `Animator` in
 * `pet/animate.ts`) — and the helper below is what eases the turn so it
 * arrives with a little momentum rather than snapping.
 */

/**
 * Eases a value toward its target rather than setting it — the head turn,
 * and where the pupils point.
 *
 * Framerate-independent: the coefficient is derived from `dt`, so a 144Hz
 * display and a throttled background tab converge at the same speed instead
 * of the fast one snapping. `1 - Math.pow(1 - rate, dt * 60)` is the standard
 * correction and is the difference between "damped" and "damped on my
 * machine".
 */
export function approach(
    current: number,
    target: number,
    dt: number,
    rate = 0.12
): number {
    const k = 1 - Math.pow(1 - rate, Math.max(0, dt) * 60);
    return current + (target - current) * k;
}
