/**
 * What the pet has been through, and what it gets to wear because of it.
 * ----------------------------------------------------------------------
 * `pets.ts` knows what the animal *is* and how hungry it is. This knows what
 * has happened to it: how many times it has been thrown, how far, whether it
 * has ever climbed a wall, which of its four faces you have actually met.
 *
 * The idea is lifted, openly, from the pet Microsoft slipped into VS Code
 * 1.137 — the one they ran a naming contest for in September 2026. Almost
 * everything that makes that thing feel alive is small and cheap: a gold star
 * that appears for ten seconds when you unlock something, a wardrobe of silly
 * hats you can only get by playing with it, and a rule that the same reaction
 * never fires twice in a row. None of that needs new art or a state machine.
 * It needs a tally and some restraint.
 *
 * Why this is a separate store from `pets.ts`
 * -------------------------------------------
 * Two reasons, and the second is the real one:
 *
 *   `pets.ts` calls into here on every feed and pat. If the counters lived in
 *   `PetState` this file would have to import that module, and that module
 *   would have to import this one to check for unlocks — a cycle. Traffic
 *   only ever flows one way: pets.ts -> petAchievements.ts.
 *
 *   `pet.v1` is already on thousands of machines with a fixed shape. Adding
 *   a dozen fields to it means every one of those reads has to cope with them
 *   being absent. A new key with its own version starts clean.
 *
 * Seeding an existing save
 * ------------------------
 * Anyone who already has a pet has already fed it a hundred times, and
 * starting their tally at zero would be a lie. So `notePetMoment` accepts an
 * authoritative running total alongside the increment and takes whichever is
 * larger — a visitor who arrives with `totalFeedings: 140` is credited with
 * 140 on the first feed after this ships, not 1, and never double-counted
 * afterwards.
 */

import { useEffect, useState } from 'react';

/* -------------------------------------------------------------------------
 * The wardrobe
 * ----------------------------------------------------------------------
 * Every one of these is drawn by `DesktopPet` out of a couple of divs and a
 * border — no images, because the four animals are 32px sprites and anything
 * bitmapped would have to be redrawn per species to sit right. A shape made
 * of CSS can be positioned off the species' own hat-line and eye-line and
 * still look deliberate on all four.
 */

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

export interface AccessoryDef {
    id: AccessoryId;
    name: string;
    /** Where it sits: on the head, across the eyes, or under the chin. */
    slot: 'head' | 'eyes' | 'neck';
}

export const ACCESSORIES: Record<AccessoryId, AccessoryDef> = {
    bowtie: { id: 'bowtie', name: 'Bow tie', slot: 'neck' },
    shades: { id: 'shades', name: 'Sunglasses', slot: 'eyes' },
    partyHat: { id: 'partyHat', name: 'Party hat', slot: 'head' },
    propeller: { id: 'propeller', name: 'Propeller cap', slot: 'head' },
    antenna: { id: 'antenna', name: 'Dial-up antenna', slot: 'head' },
    floppy: { id: 'floppy', name: '3.5" floppy', slot: 'head' },
    cone: { id: 'cone', name: 'Traffic cone', slot: 'head' },
    halo: { id: 'halo', name: 'Halo', slot: 'head' },
    crt: { id: 'crt', name: 'Tiny CRT', slot: 'head' },
    crown: { id: 'crown', name: 'Crown', slot: 'head' },
};

export const ACCESSORY_LIST: AccessoryDef[] = Object.values(ACCESSORIES);

/* -------------------------------------------------------------------------
 * The tally
 * ---------------------------------------------------------------------- */

export interface PetTally {
    feedings: number;
    pats: number;
    tricks: number;
    games: number;
    treats: number;
    /** Picked up and released with some speed behind it. */
    throws: number;
    /** The best one, in desktop pixels of horizontal travel. */
    farthestThrow: number;
    /** Full climbs of a screen edge, top reached. */
    climbs: number;
    /** Times it has fallen asleep — on the bar or hanging off a wall. */
    naps: number;
    /** Times it has been spun until it staggered. */
    dizzy: number;
    /** Thrown clean off the bottom of the screen and dropped back in. */
    respawns: number;
    /** Sent away with "go on the run" and called back again. */
    runaways: number;
    /** Cumulative walking distance, in desktop pixels. */
    steps: number;
    /** Which of the seven idle reactions have been seen at least once. */
    reactions: string[];
    /** Which species have ever been adopted on this machine. */
    species: string[];
    /** ISO dates (YYYY-MM-DD) the pet was played with. Capped at 60. */
    days: string[];
}

const EMPTY_TALLY: PetTally = {
    feedings: 0,
    pats: 0,
    tricks: 0,
    games: 0,
    treats: 0,
    throws: 0,
    farthestThrow: 0,
    climbs: 0,
    naps: 0,
    dizzy: 0,
    respawns: 0,
    runaways: 0,
    steps: 0,
    reactions: [],
    species: [],
    days: [],
};

/** Everything `notePetMoment` knows how to record. */
export type Moment =
    | 'fed'
    | 'patted'
    | 'trick'
    | 'fetch'
    | 'treat'
    | 'thrown'
    | 'climbed'
    | 'napped'
    | 'dizzy'
    | 'respawned'
    | 'ranAway'
    | 'walked'
    | 'reaction'
    | 'adopted';

interface MomentMeta {
    /** The authoritative running total, when the caller has one. See the
     *  header: this is what stops an existing save from restarting at 1. */
    total?: number;
    /** Distance in px, for `thrown` and `walked`. */
    distance?: number;
    /** Which reaction, or which species. */
    id?: string;
}

/* -------------------------------------------------------------------------
 * Persisted state
 * ---------------------------------------------------------------------- */

export interface AchievementState {
    tally: PetTally;
    /** Achievement ids, in the order they were unlocked. */
    unlocked: string[];
    /** What the creature is currently wearing, if anything. */
    equipped: AccessoryId | null;
    /** 0.4 .. 2.0, in steps of 0.2. See `adjustScale`. */
    scale: number;
}

const KEY = 'pet.achievements.v1';

const DEFAULT_STATE: AchievementState = {
    tally: { ...EMPTY_TALLY },
    unlocked: [],
    equipped: null,
    scale: 1,
};

const load = (): AchievementState => {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return { ...DEFAULT_STATE, tally: { ...EMPTY_TALLY } };
        const parsed = JSON.parse(raw) as Partial<AchievementState>;
        return {
            tally: { ...EMPTY_TALLY, ...(parsed.tally ?? {}) },
            unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
            equipped: parsed.equipped ?? null,
            scale:
                typeof parsed.scale === 'number' && parsed.scale >= 0.4
                    ? Math.min(2, parsed.scale)
                    : 1,
        };
    } catch {
        return { ...DEFAULT_STATE, tally: { ...EMPTY_TALLY } };
    }
};

let current: AchievementState = load();
const listeners = new Set<() => void>();

const persist = () => {
    try {
        localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
        /* private mode — the wardrobe just won't survive the tab */
    }
    listeners.forEach((fn) => fn());
};

/* -------------------------------------------------------------------------
 * The achievements themselves
 * ----------------------------------------------------------------------
 * Twelve, of which three are secret. The split matters: a list of twelve
 * visible checkboxes reads as a chore, and a list of twelve invisible ones
 * reads as nothing at all. Nine you can see and work towards, three you can
 * only trip over.
 *
 * Every one of them is a thing a curious person would do anyway. There is no
 * achievement for feeding it a thousand times, because nobody should feed
 * anything a thousand times, and an achievement list that asks them to is a
 * list that has stopped being about the pet.
 */

export interface AchievementDef {
    id: string;
    name: string;
    /** The line shown once it is unlocked. */
    blurb: string;
    /** The line shown while it is locked. Never states the exact number. */
    hint: string;
    reward?: AccessoryId;
    /** Hidden entirely until unlocked — shown as "???" in the list. */
    secret?: boolean;
    goal: number;
    progress: (t: PetTally) => number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
    {
        id: 'firstContact',
        name: 'First Contact',
        blurb: 'You put a hand out and something on the taskbar leaned into it.',
        hint: 'Say hello to whatever is living on your taskbar.',
        reward: 'bowtie',
        goal: 1,
        progress: (t) => t.pats,
    },
    {
        id: 'tableManners',
        name: 'Table Manners',
        blurb: 'Fed, and fed again, and fed again. Nobody here is going hungry.',
        hint: 'Keep the bowl full for a while.',
        reward: 'floppy',
        goal: 12,
        progress: (t) => t.feedings,
    },
    {
        id: 'showman',
        name: 'The Showman',
        blurb: 'Fifteen tricks. At this point it is a career.',
        hint: 'Ask for the trick. Then ask again.',
        reward: 'partyHat',
        goal: 15,
        progress: (t) => t.tricks,
    },
    {
        id: 'goodArm',
        name: 'Good Arm',
        blurb: 'A throw with real distance on it. The wall took most of the impact.',
        hint: 'Pick it up and let go while your hand is still moving.',
        reward: 'propeller',
        goal: 520,
        progress: (t) => t.farthestThrow,
    },
    {
        id: 'wallCrawler',
        name: 'Wall Crawler',
        blurb: 'It went up the side of the screen and sat at the top, looking pleased.',
        hint: 'Leave it alone long enough and it will find somewhere to climb.',
        reward: 'antenna',
        goal: 1,
        progress: (t) => t.climbs,
    },
    {
        id: 'fetchQuest',
        name: 'Fetch Quest',
        blurb: 'Twenty rounds of throwing a thing and having it brought back.',
        hint: 'Play fetch. Repeatedly. That is the whole game.',
        reward: 'cone',
        goal: 20,
        progress: (t) => t.games,
    },
    {
        id: 'faceCollector',
        name: 'The Whole Menagerie',
        blurb: 'All four of them have lived on this machine at one point or another.',
        hint: 'There are four animals in the Pet window. Meet them all.',
        reward: 'crown',
        goal: 4,
        progress: (t) => t.species.length,
    },
    {
        id: 'repertoire',
        name: 'Full Repertoire',
        blurb: 'You have seen everything it knows how to do, including the sunglasses.',
        hint: 'It has more than one reaction to being poked. Find them all.',
        reward: 'shades',
        goal: 7,
        progress: (t) => t.reactions.length,
    },
    {
        id: 'oldFriends',
        name: 'Old Friends',
        blurb: 'Seven different days. It has started expecting you.',
        hint: 'Come back. Not today — another day.',
        reward: 'crt',
        goal: 7,
        progress: (t) => t.days.length,
    },

    /* --- the three you have to trip over ------------------------------ */
    {
        id: 'lostInSpace',
        name: 'Lost In Space',
        blurb: "Thrown clean off the bottom of the screen. It found its own way back, which is more than most things do.",
        hint: '???',
        secret: true,
        reward: 'halo',
        goal: 1,
        progress: (t) => t.respawns,
    },
    {
        id: 'spinCycle',
        name: 'Spin Cycle',
        blurb: 'Five separate occasions on which it needed a moment to work out which way was up.',
        hint: '???',
        secret: true,
        goal: 5,
        progress: (t) => t.dizzy,
    },
    {
        id: 'marathon',
        name: 'The Long Walk',
        blurb: 'Ten thousand pixels of taskbar, one amble at a time.',
        hint: '???',
        secret: true,
        goal: 10_000,
        progress: (t) => Math.floor(t.steps),
    },
];

export const achievementById = (id: string): AchievementDef | undefined =>
    ACHIEVEMENTS.find((a) => a.id === id);

/* -------------------------------------------------------------------------
 * The gold star
 * ----------------------------------------------------------------------
 * VS Code's pet grows a star for ten seconds when something unlocks, and
 * clicking it inside that window opens the list. That is a better idea than a
 * toast: it puts the notification *on the character*, so the thing you look
 * at is the thing that earned it, and it costs nothing if you miss it.
 */

const STAR_MS = 10_000;

let pendingUnlock: { id: string; until: number } | null = null;
let starTimer: number | undefined;

/** The achievement whose star is currently showing, if any. */
export function currentStar(): AchievementDef | null {
    if (!pendingUnlock || Date.now() > pendingUnlock.until) return null;
    return achievementById(pendingUnlock.id) ?? null;
}

export function clearStar(): void {
    if (!pendingUnlock) return;
    pendingUnlock = null;
    window.clearTimeout(starTimer);
    listeners.forEach((fn) => fn());
}

/** Fired when something unlocks, so the creature can celebrate on the spot. */
type UnlockListener = (achievement: AchievementDef) => void;
const unlockListeners = new Set<UnlockListener>();

export function onAchievementUnlocked(fn: UnlockListener): () => void {
    unlockListeners.add(fn);
    return () => {
        unlockListeners.delete(fn);
    };
}

/**
 * Re-checks every locked achievement against the tally.
 *
 * Called after every recorded moment. Twelve comparisons against an object
 * already in memory is not worth debouncing, and doing it eagerly is what
 * lets the star appear on the same frame as the feed that earned it.
 *
 * Only ever unlocks one per call, deliberately: two stars cannot both be the
 * one on the creature's head, and a visitor who crosses two thresholds at
 * once should get two celebrations a second apart rather than one that
 * silently swallows the other. The leftover unlocks on the next moment.
 */
function checkUnlocks(): void {
    const next = ACHIEVEMENTS.find(
        (a) =>
            !current.unlocked.includes(a.id) &&
            a.progress(current.tally) >= a.goal
    );
    if (!next) return;

    current = { ...current, unlocked: [...current.unlocked, next.id] };

    // The reward goes on immediately if nothing else is being worn. Silently
    // replacing a hat the visitor chose would be rude; putting the first one
    // on for them is the difference between a wardrobe and a list.
    if (next.reward && !current.equipped) {
        current = { ...current, equipped: next.reward };
    }

    pendingUnlock = { id: next.id, until: Date.now() + STAR_MS };
    window.clearTimeout(starTimer);
    starTimer = window.setTimeout(() => {
        pendingUnlock = null;
        listeners.forEach((fn) => fn());
    }, STAR_MS + 50);

    persist();
    unlockListeners.forEach((fn) => fn(next));
}

/* -------------------------------------------------------------------------
 * Recording
 * ---------------------------------------------------------------------- */

const today = (): string => new Date().toISOString().slice(0, 10);

/** Adds today to the streak list, keeping it bounded. */
function noteToday(t: PetTally): string[] {
    const day = today();
    if (t.days[t.days.length - 1] === day) return t.days;
    if (t.days.includes(day)) return t.days;
    const next = [...t.days, day];
    return next.length > 60 ? next.slice(next.length - 60) : next;
}

/**
 * Records something the creature did or had done to it.
 *
 * Everything funnels through one function on purpose. The alternative — a
 * setter per counter — means twelve exports, twelve chances to forget to call
 * `checkUnlocks`, and no single place to put the "does this count as a day
 * you played with it" rule.
 */
export function notePetMoment(kind: Moment, meta: MomentMeta = {}): void {
    const t = current.tally;
    const next: PetTally = { ...t };

    /** Counters that a legacy save may already have a bigger number for. */
    const bump = (n: number): number =>
        Math.max(n + 1, meta.total ?? 0);

    switch (kind) {
        case 'fed':
            next.feedings = bump(t.feedings);
            break;
        case 'patted':
            next.pats = bump(t.pats);
            break;
        case 'trick':
            next.tricks = bump(t.tricks);
            break;
        case 'fetch':
            next.games = bump(t.games);
            break;
        case 'treat':
            next.treats = bump(t.treats);
            break;
        case 'thrown':
            next.throws = t.throws + 1;
            next.farthestThrow = Math.max(
                t.farthestThrow,
                Math.round(meta.distance ?? 0)
            );
            break;
        case 'climbed':
            next.climbs = t.climbs + 1;
            break;
        case 'napped':
            next.naps = t.naps + 1;
            break;
        case 'dizzy':
            next.dizzy = t.dizzy + 1;
            break;
        case 'respawned':
            next.respawns = t.respawns + 1;
            break;
        case 'ranAway':
            next.runaways = t.runaways + 1;
            break;
        case 'walked':
            // Fractions of a pixel per frame; kept as a float and only
            // rounded when it is read.
            next.steps = t.steps + Math.max(0, meta.distance ?? 0);
            break;
        case 'reaction':
            if (meta.id && !t.reactions.includes(meta.id)) {
                next.reactions = [...t.reactions, meta.id];
            }
            break;
        case 'adopted':
            if (meta.id && !t.species.includes(meta.id)) {
                next.species = [...t.species, meta.id];
            }
            break;
    }

    // Walking is the one thing the creature does without anybody being
    // present, so it must not be what marks a day as "played with" — the
    // Old Friends achievement would then only measure tabs left open.
    if (kind !== 'walked') next.days = noteToday(next);

    current = { ...current, tally: next };

    // Distance accrues every frame the creature is moving. Writing to
    // localStorage sixty times a second would be absurd, so the odometer
    // banks itself on the next real interaction instead (see `flushSteps`).
    if (kind === 'walked') {
        pendingSteps = true;
        checkUnlocks();
        return;
    }

    pendingSteps = false;
    persist();
    checkUnlocks();
}

/** True when `steps` has moved since the last write. */
let pendingSteps = false;

/**
 * Writes a walking-only tally out.
 *
 * Called on unmount and on `visibilitychange`, which between them cover the
 * two ways a visitor leaves: closing the tab, and wandering off to another
 * one. A pet that ambled for twenty minutes and lost all of it because
 * nobody clicked anything would never reach The Long Walk.
 */
export function flushSteps(): void {
    if (!pendingSteps) return;
    pendingSteps = false;
    persist();
}

if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushSteps();
    });
}

/* -------------------------------------------------------------------------
 * Wardrobe and size
 * ---------------------------------------------------------------------- */

export function isUnlocked(id: string): boolean {
    return current.unlocked.includes(id);
}

/** Every accessory the visitor has actually earned, in unlock order. */
export function unlockedAccessories(): AccessoryDef[] {
    return current.unlocked
        .map((id) => achievementById(id)?.reward)
        .filter((r): r is AccessoryId => !!r)
        .map((r) => ACCESSORIES[r]);
}

export function equipAccessory(id: AccessoryId | null): void {
    if (id && !unlockedAccessories().some((a) => a.id === id)) return;
    current = { ...current, equipped: id };
    persist();
}

/** 40% to 200%, in the 20-point steps VS Code's pet uses. */
export const SCALE_MIN = 0.4;
export const SCALE_MAX = 2;
export const SCALE_STEP = 0.2;

export function adjustScale(delta: number): void {
    const raw = current.scale + delta;
    // Rounded to the step so repeated grow/shrink can't drift off the grid
    // through floating-point accumulation and strand "Reset size" as the
    // only way back to exactly 1.
    const snapped =
        Math.round(raw / SCALE_STEP) * SCALE_STEP;
    const next = Math.max(SCALE_MIN, Math.min(SCALE_MAX, snapped));
    if (Math.abs(next - current.scale) < 0.001) return;
    current = { ...current, scale: next };
    persist();
}

export function resetScale(): void {
    if (current.scale === 1) return;
    current = { ...current, scale: 1 };
    persist();
}

/* -------------------------------------------------------------------------
 * Reading
 * ---------------------------------------------------------------------- */

export const getAchievementState = (): AchievementState => current;

export function useAchievementState(): AchievementState {
    const [state, setState] = useState<AchievementState>(current);
    useEffect(() => {
        const listener = () => setState({ ...current });
        listeners.add(listener);
        setState({ ...current });
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return state;
}

/** For the Pet window's list: everything, with its progress resolved. */
export interface AchievementRow extends AchievementDef {
    unlocked: boolean;
    current: number;
}

export function achievementRows(
    state: AchievementState = current
): AchievementRow[] {
    return ACHIEVEMENTS.map((a) => ({
        ...a,
        unlocked: state.unlocked.includes(a.id),
        current: Math.min(a.goal, a.progress(state.tally)),
    }));
}
