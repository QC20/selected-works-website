/**
 * What the creature decides to do next.
 * --------------------------------------
 * This is Shimeji's `behaviors.xml`, in TypeScript.
 *
 * The engine that file drives has a shape worth copying exactly. Behaviours
 * are grouped under `<Condition>` gates describing where the mascot is — on
 * the floor, on a wall, on the ceiling, on the top border of a window — and
 * within a gate each one carries a `Frequency`. The engine filters by the
 * gate, then draws by weight. A behaviour may also declare `<NextBehavior>`,
 * its own weighted list of what tends to follow it, which is how Shimeji gets
 * `CrawlAlongWorkAreaFloor` reliably followed by `LieDown` without writing a
 * state machine by hand.
 *
 * What this replaces
 * ------------------
 * An if-ladder inside the animation loop that read, in full:
 *
 *     if (ledges.length && Math.random() < 0.55) { ...climb a window... }
 *     else if (now > nextClimbRef.current && Math.random() < 0.5) { ...wall... }
 *     else { ...walk somewhere... }
 *
 * That works for three options and collapses at five. The probabilities are
 * not independent — the second branch's real chance is 0.45 x 0.5, which is
 * nowhere written down — so adding anything means recomputing every number
 * after it, and the conditions are tangled up with the selection. Separating
 * *when something is possible* from *how often it is chosen* is the whole
 * idea, and it is why adding the leap below cost one table row.
 *
 * Data, not behaviour
 * -------------------
 * Deliberately inert: this file decides *which* behaviour, and nothing about
 * how one is carried out. `behaviors.xml` is data and the Java engine executes
 * it; here the table is data and `enterBehaviour` in `DesktopPet.tsx` executes
 * it. Keeping the two apart is what lets this file be read as a description of
 * the animal's habits rather than as part of the loop.
 */

export type BehaviourId =
    /* --- on the taskbar ------------------------------------------------ */
    | 'walkFloor'
    | 'sitFloor'
    | 'climbScreenWall'
    | 'climbToLedge'
    /* --- on a window --------------------------------------------------- */
    | 'walkLedge'
    | 'sitLedgeEdge'
    | 'leapToLedge'
    | 'hopDown';

/**
 * Everything a condition is allowed to ask about.
 *
 * Shimeji's conditions are EL expressions evaluated against a live `mascot`
 * object, which is powerful and means a typo is a runtime surprise. A fixed
 * snapshot is duller and cannot be mistyped.
 */
export interface PetEnv {
    onGround: boolean;
    onLedge: boolean;
    /** Windows it could walk over and climb from where it stands. */
    reachable: number;
    /** Windows it could jump to from the one it is on. */
    jumpable: number;
    /** Rate limits — the surprise is only a surprise occasionally. */
    canClimbWall: boolean;
    canTakeLedge: boolean;
}

export interface Weighted {
    id: BehaviourId;
    weight: number;
}

export interface BehaviourDef {
    id: BehaviourId;
    /** Shimeji's `<Condition>`: is this even on the menu right now? */
    when: (env: PetEnv) => boolean;
    /** Shimeji's `Frequency`. Relative, not a percentage. */
    weight: number;
    /**
     * Shimeji's `<NextBehavior>`: what tends to follow this one.
     *
     * Weights are on the same scale as `weight` above, because by default
     * this list is *added to* the general pool rather than replacing it —
     * see `nextReplaces`.
     */
    next?: Weighted[];
    /**
     * Shimeji's `Add="false"`.
     *
     * By default a `next` list biases the ordinary pool: the chained options
     * get their weights added on top of whatever they already had, and
     * everything else is still possible. Set this and the list becomes the
     * whole menu instead.
     *
     * Getting this wrong is worth recording, because it was silent. The
     * first version implemented only the replacing form, so `walkFloor` —
     * which always passes its condition and always appears in its own `next`
     * list — meant the general pool was never once consulted. The creature
     * walked and sat for a hundred and ten seconds straight with three
     * climbable windows open and a `climbToLedge` weight of 240 sitting in a
     * branch nothing could reach.
     */
    nextReplaces?: boolean;
}

/**
 * The habits, in one table.
 *
 * Weights are relative within whatever passes the gate, so they can be read
 * against each other directly: on a window, ambling (100) happens about twice
 * as often as sitting on the edge (48), and roughly three times as often as
 * leaping to another window (34).
 *
 * `climbToLedge` is weighted far above everything else on the floor because
 * it is rate-limited elsewhere — when it is available at all it has usually
 * been a minute or more since the last one, and going to stand on a window is
 * much more interesting than another lap of the taskbar. The limiter, not the
 * weight, is what stops it dominating.
 */
export const BEHAVIOURS: BehaviourDef[] = [
    /* --- on the taskbar ------------------------------------------------ */
    {
        id: 'walkFloor',
        when: (e) => e.onGround,
        weight: 100,
        next: [
            { id: 'walkFloor', weight: 60 },
            { id: 'sitFloor', weight: 30 },
        ],
    },
    {
        id: 'sitFloor',
        when: (e) => e.onGround,
        weight: 30,
        // Sitting mostly leads to getting up again, occasionally to sitting
        // some more. It never leads straight to a climb: a creature that
        // springs from a sit to scaling a window looks startled, not restless.
        nextReplaces: true,
        next: [
            { id: 'walkFloor', weight: 5 },
            { id: 'sitFloor', weight: 1 },
        ],
    },
    {
        id: 'climbScreenWall',
        when: (e) => e.onGround && e.canClimbWall,
        weight: 26,
    },
    {
        id: 'climbToLedge',
        when: (e) => e.onGround && e.canTakeLedge && e.reachable > 0,
        weight: 240,
    },

    /* --- on a window --------------------------------------------------- */
    {
        id: 'walkLedge',
        when: (e) => e.onLedge,
        weight: 100,
        next: [
            { id: 'sitLedgeEdge', weight: 40 },
            { id: 'leapToLedge', weight: 40 },
        ],
    },
    {
        id: 'sitLedgeEdge',
        when: (e) => e.onLedge,
        weight: 48,
        nextReplaces: true,
        next: [
            { id: 'walkLedge', weight: 4 },
            { id: 'hopDown', weight: 1 },
        ],
    },
    {
        id: 'leapToLedge',
        when: (e) => e.onLedge && e.jumpable > 0,
        weight: 34,
        // Landing somewhere new, the obvious thing to do is look around it.
        nextReplaces: true,
        next: [{ id: 'walkLedge', weight: 1 }],
    },
    {
        id: 'hopDown',
        when: (e) => e.onLedge,
        weight: 26,
    },
];

const byId = (id: BehaviourId): BehaviourDef | undefined =>
    BEHAVIOURS.find((b) => b.id === id);

/** Weighted draw. Returns null when the pool is empty or all-zero. */
function draw(pool: Weighted[]): BehaviourId | null {
    const total = pool.reduce((n, p) => n + Math.max(0, p.weight), 0);
    if (total <= 0) return null;
    let roll = Math.random() * total;
    for (const entry of pool) {
        roll -= Math.max(0, entry.weight);
        if (roll <= 0) return entry.id;
    }
    return pool[pool.length - 1].id;
}

/**
 * What to do next, given where the creature is and what it just finished.
 *
 * Exactly Shimeji's order: take the finished behaviour's own `next` list if it
 * has one, keep only the entries whose condition currently passes, and draw by
 * weight. Fall back to the general pool when there is no list or nothing in it
 * applies — which is what happens when, say, the window a creature meant to
 * leap to was closed while it was sitting there.
 */
export function pickBehaviour(
    env: PetEnv,
    after?: BehaviourId | null
): BehaviourId | null {
    const pool: Weighted[] = BEHAVIOURS.filter((b) => b.when(env)).map((b) => ({
        id: b.id,
        weight: b.weight,
    }));

    const previous = after ? byId(after) : undefined;
    if (previous?.next) {
        const chained = previous.next.filter((n) => {
            const def = byId(n.id);
            return def ? def.when(env) : false;
        });

        if (previous.nextReplaces) {
            // Shimeji's `Add="false"`: this list is the entire menu.
            const picked = draw(chained);
            if (picked) return picked;
        } else {
            // The default: bias the pool rather than replace it.
            for (const entry of chained) {
                const row = pool.find((p) => p.id === entry.id);
                if (row) row.weight += entry.weight;
                else pool.push({ ...entry });
            }
        }
    }

    return draw(pool);
}
