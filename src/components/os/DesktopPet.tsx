import React, { useCallback, useEffect, useRef, useState } from 'react';
import getIconByName from '../../assets/icons';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import PetAccessory from './PetAccessory';
import { openAppGlobal } from './appBridge';
import { TASKBAR_HEIGHT } from './metrics';
import {
    PET_LIST,
    PetDef,
    PetEvent,
    PetReaction,
    REACTIONS,
    computeMood,
    feedPet,
    hidePetForNow,
    onPetEvent,
    pettPet,
    playFetch,
    randomLine,
    tossTreat,
    trickPet,
    usePetState,
} from './pets';
import {
    ACCESSORIES,
    AccessoryId,
    SCALE_STEP,
    adjustScale,
    clearStar,
    currentStar,
    equipAccessory,
    flushSteps,
    notePetMoment,
    onAchievementUnlocked,
    resetScale,
    unlockedAccessories,
    useAchievementState,
} from './petAchievements';
import { getResolutionScale } from './resolution';
import {
    playClick,
    playPetBump,
    playPetHappy,
    playPetLift,
    playPetTreat,
    playPetUnlock,
    playPetVoice,
} from './sounds';

/**
 * The pet, out of the tray and onto the taskbar.
 * ------------------------------------------------
 * This is the screen-mate idea — Neko (1989), and every sheep, cat and dog
 * that wandered across a desktop after it: a small creature that lives *on*
 * the workspace rather than inside a window, notices the pointer, and can be
 * poked. The behaviour is written from scratch for this desktop's own four
 * animals; nothing is lifted from oneko or its descendants.
 *
 * What it owes to VS Code's pet
 * ------------------------------
 * Microsoft shipped an experimental companion above the chat box in VS Code
 * 1.137 and ran a public naming contest for it in September 2026. Four of its
 * ideas were good enough to take, and all four are cheap:
 *
 *   A repertoire, not a reaction.  Poking it plays one of seven short
 *   performances, drawn from a shuffled bag so the same one never lands twice
 *   running and all seven come round before any repeats. This is the single
 *   biggest difference between a creature and a button, and it costs one
 *   array. See `nextReaction`.
 *
 *   Achievements you wear.  Milestones unlock hats. A gold star sits on the
 *   creature for ten seconds when one lands, and clicking the star opens the
 *   list. Putting the notification *on the character* rather than in a toast
 *   means the thing you look at is the thing that earned it, and costs
 *   nothing if you miss it. See `petAchievements.ts`.
 *
 *   Somewhere else to be.  Their pet can be sent away and peeks back at you.
 *   Ours can also climb the side of the screen, hang there, and fall asleep
 *   halfway up — the wall states are straight out of tonybaloney's
 *   `vscode-pets`, which has had cats scaling the editor's left edge for
 *   years. A creature that only ever walks a line is scenery.
 *
 *   Keyboard and size.  Arrow keys hop it along the bar, Shift+arrow throws
 *   it at a wall, Enter pokes it, and it grows and shrinks in 20-point steps
 *   between 40% and 200%.
 *
 * What you can do with it
 * -----------------------
 *   Click        one of seven reactions — or feed it, if it's hungry.
 *   Double-click ask for its trick: a spin, a roll, a slow blink.
 *   Drag         pick it up. It dangles from the pointer, anywhere on screen.
 *   Waggle       shake it about while holding it and it gets dizzy.
 *   Throw        let go while moving and it flies, bounces off the walls,
 *                lands, and is briefly too dizzy to walk straight.
 *   Drop it low  release it below the taskbar and it falls off the bottom of
 *                the world, then drops back in from the top.
 *   Right-click  the full menu: feed, pat, fetch, trick, treat, sit, nap,
 *                hats, size, achievements, or send it off to hide.
 *   Keyboard     Tab to it, then arrows / Shift+arrows / Enter.
 *   Hover        it perks up and looks at you.
 *   Leave it     it wanders, sits, stretches, scratches, climbs a wall, and
 *                eventually sleeps.
 *
 * Everything else on the desktop that touches the pet — the tray flyout, the
 * Pet window, Clippy — goes through `pets.ts`'s event bus, so feeding from a
 * window makes the creature on the bar actually eat. This component is the
 * only thing that knows how any of that *looks*.
 *
 * Three constraints, because a wandering sprite is exactly the kind of
 * feature that becomes intolerable on the second visit:
 *
 *   It walks the taskbar, not the whole screen.  A creature loose over the
 *   middle of the page would cross windows, steal clicks and land on top of
 *   text. The grey bar is dead space, it is always at a known height, and a
 *   thing walking along a ledge reads as deliberate rather than as a bug. The
 *   two exceptions are both edges — the walls it climbs are the far left and
 *   far right of the screen, where nothing else lives — and being thrown.
 *
 *   It never blocks anything.  The layer is `pointer-events: none` except
 *   for the sprite itself and its right-click menu, and its walking range is
 *   the taskbar's empty middle, clear of the Start button and the tray.
 *
 *   It obeys `prefers-reduced-motion`.  A visitor who asked their OS to stop
 *   things moving gets a pet that no longer wanders, bobs, climbs or chases
 *   the pointer of its own accord — the ambient motion, which is the part
 *   that is hard to ignore, goes away. Things they deliberately ask for (a
 *   pat, a trick, dragging it across the screen) still animate, because a
 *   button that does nothing when pressed is worse than a moment of motion.
 *
 * Position is kept in refs and written straight to `style`, so a walk cycle
 * at 60fps doesn't re-render React 60 times a second. React state holds only
 * the things that genuinely change rarely: the activity name, the speech
 * bubble, the particles, and the menu.
 */

type PetActivity =
    /* ambient */
    | 'idle'
    | 'walking'
    | 'chasing'
    | 'sleeping'
    /* reactions, held for a fixed time by `phaseUntil` */
    | 'happy'
    | 'eating'
    | 'trick'
    | 'dizzy'
    | 'reacting'
    /* errands, held until the creature reaches something */
    | 'fetching'
    | 'returning'
    | 'foraging'
    /* the walls */
    | 'toWall'
    | 'climbing'
    | 'wallHang'
    | 'wallNap'
    /* direct manipulation and absence */
    | 'held'
    | 'falling'
    | 'gone'
    | 'peeking';

/** Small extra bits of business layered on top of an idle stance. */
type PetPose = 'none' | 'blink' | 'stretch' | 'scratch' | 'sit' | 'perk';

/** The sprite's height at 100%. Big enough to read as a character rather
 *  than a cursor artefact, which is the whole reason the art was drawn at
 *  32px and is displayed larger. */
const BASE_SPRITE = 52;

/** Pixels per second. Slow enough to read as an amble, not a scuttle. */
const WALK_SPEED = 40;
const CHASE_SPEED = 92;
/** Chasing a thrown toy is the one time the creature really runs. */
const FETCH_SPEED = 165;
/** Going to a wall is purposeful — faster than an amble, slower than a chase. */
const WALL_APPROACH_SPEED = 70;
const CLIMB_SPEED = 58;
/** How near the pointer counts as "caught". */
const CATCH_DISTANCE = 22;
/** How near the toy or a treat counts as reached. */
const REACH_DISTANCE = 18;
/** Idle this long with no pointer nearby and the pet nods off. */
const SLEEP_AFTER_MS = 22_000;

/** Right-hand limit: the tray is roughly this wide, and the pet must never
 *  wander under it. Measured from the right edge of the window. */
const TRAY_RESERVE = 250;
/** Left-hand limit: clear of the Start button. */
const START_RESERVE = 96;

/** How high above the bottom of the screen the creature's feet rest. */
const GROUND = TASKBAR_HEIGHT - 6;

/** Thrown-pet physics. Tuned by feel: heavy enough to arc rather than float,
 *  bouncy enough that a hard throw is worth doing twice. */
const GRAVITY = 1900;
const WALL_BOUNCE = 0.55;
const FLOOR_BOUNCE = 0.38;
/** Above this landing speed the creature gets up dizzy instead of walking. */
const DIZZY_SPEED = 620;
/** A drag has to move this far before it stops counting as a click. */
const DRAG_THRESHOLD = 5;

/** How long each of the seven performances runs for. */
const REACTION_MS: Record<PetReaction, number> = {
    press: 1000,
    heart: 1200,
    cool: 1700,
    yap: 1900,
    sing: 2000,
    speechless: 1500,
    worry: 1500,
};

/** Direction reversals inside this window count towards being shaken. */
const WAGGLE_WINDOW_MS = 1200;
const WAGGLE_REVERSALS = 6;

/** Odometer writes are batched to roughly this interval. */
const STEP_FLUSH_MS = 2500;

interface Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    /** Where the toy was thrown from, so fetch has somewhere to bring it. */
    homeX: number;
    carried: boolean;
    /** Set once it has been dropped back home; fades out from here. */
    doneAt: number;
}

interface Particle {
    id: number;
    kind: 'heart' | 'crumb' | 'sparkle' | 'star' | 'note' | 'sweat';
    /** Horizontal drift, in px, handed to the CSS keyframes as `--pet-dx`. */
    dx: number;
    delay: number;
    glyph: string;
}

let particleId = 0;

/** Fisher-Yates. Used for the reaction bag, where a biased shuffle would
 *  show as one performance turning up far more often than the rest. */
function shuffled<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const DesktopPet: React.FC<{ suspended?: boolean }> = ({ suspended = false }) => {
    const state = usePetState();
    const achievements = useAchievementState();
    const pet: PetDef | undefined = state.species
        ? PET_LIST.find((p) => p.id === state.species)
        : undefined;

    const layerRef = useRef<HTMLDivElement | null>(null);
    const elRef = useRef<HTMLDivElement | null>(null);
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const toyElRef = useRef<HTMLDivElement | null>(null);
    const treatElRef = useRef<HTMLDivElement | null>(null);
    const shadowRef = useRef<HTMLDivElement | null>(null);

    /** The sprite's current pixel height. Read in the loop, so also a ref. */
    const sprite = Math.round(BASE_SPRITE * achievements.scale);
    const spriteRef = useRef(sprite);
    spriteRef.current = sprite;

    // --- the creature ------------------------------------------------------
    const xRef = useRef(START_RESERVE + 120); // centre, in desktop px
    const yRef = useRef(0); // height above `GROUND`
    const vxRef = useRef(0);
    const vyRef = useRef(0);
    const spinRef = useRef(0); // degrees, while airborne
    const squashRef = useRef(0); // 0..1, decays after a landing
    const targetRef = useRef(START_RESERVE + 120);
    const facingRef = useRef<1 | -1>(1);
    const activityRef = useRef<PetActivity>('idle');
    const phaseUntilRef = useRef(0);
    const phaseFromRef = useRef(0);
    const phaseLengthRef = useRef(1);
    const lastMoveRef = useRef(performance.now());
    const idleUntilRef = useRef(0);
    const poseRef = useRef<PetPose>('none');
    const poseUntilRef = useRef(0);
    const nextPoseRef = useRef(performance.now() + 4000);
    /** "Sit. Stay." — suppresses wandering without switching the pet off. */
    const stayRef = useRef(false);
    /** Which performance is running, while `activity === 'reacting'`. */
    const reactionRef = useRef<PetReaction | null>(null);

    // --- the walls ---------------------------------------------------------
    /** Which edge is being climbed: -1 left, 1 right, 0 not on a wall. */
    const wallRef = useRef<0 | 1 | -1>(0);
    /** How high this particular climb intends to go, above GROUND. */
    const climbTargetRef = useRef(0);
    /** Not before this — stops it living on the wall permanently. */
    const nextClimbRef = useRef(performance.now() + 45_000);

    // --- being away --------------------------------------------------------
    /** While `gone`: when to pop up and peek, and from which side. */
    const nextPeekRef = useRef(0);

    // --- falling out of the world -----------------------------------------
    /** True while the creature is below the floor on its way to respawning. */
    const despawningRef = useRef(false);
    /** Where the throw started, for the Good Arm achievement. */
    const throwFromRef = useRef(0);

    // --- the odometer ------------------------------------------------------
    const stepsRef = useRef(0);
    const nextStepFlushRef = useRef(performance.now() + STEP_FLUSH_MS);

    // --- things in the world ----------------------------------------------
    const toyRef = useRef<Projectile | null>(null);
    const treatRef = useRef<Projectile | null>(null);

    // --- dragging ----------------------------------------------------------
    const dragRef = useRef<{
        active: boolean;
        moved: boolean;
        pointerId: number;
        /** Recent pointer samples, for working out the throw velocity. */
        samples: { t: number; x: number; y: number }[];
        /** Direction reversals and when they happened — see `WAGGLE_*`. */
        reversals: number[];
        lastDx: number;
        shaken: boolean;
    } | null>(null);

    const [activity, setActivity] = useState<PetActivity>('idle');
    const [reaction, setReaction] = useState<PetReaction | null>(null);
    const [bubble, setBubble] = useState<string | null>(null);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [hasToy, setHasToy] = useState(false);
    const [hasTreat, setHasTreat] = useState(false);
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
    /** Redrawn every second or so while asleep, so the z's can accumulate. */
    const [sleepDepth, setSleepDepth] = useState(0);
    const bubbleTimer = useRef<number | undefined>(undefined);
    /**
     * A single click is deferred by a fraction of a second so a *double*
     * click can cancel it. Without this, asking for a trick also delivers two
     * pats on the way — three reactions fighting over one animal.
     */
    const clickTimer = useRef<number | undefined>(undefined);

    /**
     * True for exactly as long as it takes `pettPet()` to emit. Poking the
     * creature on the taskbar counts as a pat — it should tick the counter
     * and trigger Clippy's check-in like any other — but it should play one
     * of the seven performances rather than the plain happy hop the tray and
     * the Pet window's "Pat" button get. The flag is how the shared event
     * handler tells the two apart without a second event type.
     */
    const pokeRef = useRef(false);

    // Pointer position, tracked only while it is over the taskbar strip.
    const pointerXRef = useRef<number | null>(null);

    const petRef = useRef<PetDef | undefined>(pet);
    petRef.current = pet;

    // Suspending the pet (the 3D room, the shutdown dialog) unmounts it, and
    // a pending bubble or click would otherwise land on nothing. The odometer
    // is banked on the way out for the same reason.
    useEffect(
        () => () => {
            window.clearTimeout(bubbleTimer.current);
            window.clearTimeout(clickTimer.current);
            flushSteps();
        },
        []
    );

    /* ------------------------------------------------------------------
     * Helpers shared by the pointer handlers, the menu and the event bus
     * --------------------------------------------------------------- */

    const setActivityBoth = useCallback((next: PetActivity) => {
        if (activityRef.current === next) return;
        activityRef.current = next;
        setActivity(next);
    }, []);

    const say = useCallback((text: string) => {
        if (!text) return;
        setBubble(text);
        window.clearTimeout(bubbleTimer.current);
        bubbleTimer.current = window.setTimeout(() => setBubble(null), 3200);
    }, []);

    /** A short burst of whatever this moment calls for, cleaned up on a timer. */
    const burst = useCallback((kind: Particle['kind'], count: number) => {
        const glyphs: Record<Particle['kind'], string[]> = {
            heart: ['♥', '♥', '♡'],
            crumb: ['•', '·', '▪'],
            sparkle: ['✦', '✧', '+'],
            star: ['✶', '★', '✱'],
            note: ['♪', '♫', '♬'],
            sweat: ['💧'],
        };
        const made: Particle[] = Array.from({ length: count }, (_, i) => ({
            id: ++particleId,
            kind,
            dx: (Math.random() - 0.5) * 34,
            delay: i * 90,
            glyph: glyphs[kind][Math.floor(Math.random() * glyphs[kind].length)],
        }));
        setParticles((prev) => [...prev, ...made]);
        window.setTimeout(
            () =>
                setParticles((prev) =>
                    prev.filter((p) => !made.some((m) => m.id === p.id))
                ),
            1400 + count * 90
        );
    }, []);

    /** Locks the creature into a reaction for `ms`, interrupting an errand. */
    const react = useCallback(
        (next: PetActivity, ms: number) => {
            const now = performance.now();
            phaseFromRef.current = now;
            phaseLengthRef.current = ms;
            phaseUntilRef.current = now + ms;
            lastMoveRef.current = now;
            spinRef.current = 0;
            wallRef.current = 0;
            setActivityBoth(next);
        },
        [setActivityBoth]
    );

    /* ------------------------------------------------------------------
     * The repertoire
     * ---------------------------------------------------------------
     * A shuffled bag rather than `Math.random()` over seven options. Random
     * choice means the same performance lands twice running about one time in
     * seven, which is exactly often enough for a visitor to conclude there is
     * only one; and it means the rarest of the seven can go unseen for
     * dozens of clicks, which makes "see all seven" a chore rather than a
     * discovery. Drawing without replacement fixes both: every performance
     * appears once before any appears twice, and the refill is nudged so the
     * seam between two bags can't repeat either.
     */
    const bagRef = useRef<PetReaction[]>([]);
    const lastReactionRef = useRef<PetReaction | null>(null);

    const nextReaction = useCallback((): PetReaction => {
        if (!bagRef.current.length) {
            const bag = shuffled(REACTIONS);
            if (bag.length > 1 && bag[0] === lastReactionRef.current) {
                [bag[0], bag[1]] = [bag[1], bag[0]];
            }
            bagRef.current = bag;
        }
        const next = bagRef.current.shift() as PetReaction;
        lastReactionRef.current = next;
        return next;
    }, []);

    const perform = useCallback(
        (which?: PetReaction) => {
            const p = petRef.current;
            if (!p) return;
            const id = which ?? nextReaction();
            reactionRef.current = id;
            setReaction(id);
            react('reacting', REACTION_MS[id]);
            say(randomLine(p.reactionLines[id]));
            notePetMoment('reaction', { id });

            switch (id) {
                case 'heart':
                    burst('heart', 3);
                    playPetVoice(p.id);
                    break;
                case 'sing':
                    burst('note', 4);
                    playPetHappy();
                    break;
                case 'worry':
                    burst('sweat', 2);
                    break;
                case 'cool':
                    playPetHappy();
                    break;
                case 'press':
                    playClick();
                    break;
                case 'yap':
                    playPetVoice(p.id);
                    break;
                default:
                    break;
            }
        },
        [burst, nextReaction, react, say]
    );

    /* ------------------------------------------------------------------
     * Going away, and coming back
     * ---------------------------------------------------------------
     * "Go on the run" parks the creature entirely below the bottom edge,
     * where nothing can be clicked — so the way back cannot depend on
     * clicking it. It comes back on a peek, on the keyboard, from its own
     * menu (which is reachable during a peek), and from *any* interaction
     * anywhere else on the desktop: feed it from the tray and it turns up to
     * be fed. That last one is the important one. A hidden thing with no
     * obvious way to recall it is a thing the visitor has lost.
     */

    /** Fully below the viewport, taskbar included. */
    const hiddenY = useCallback(() => -(GROUND + spriteRef.current + 4), []);

    const goOnTheRun = useCallback(() => {
        const p = petRef.current;
        wallRef.current = 0;
        despawningRef.current = false;
        phaseUntilRef.current = 0;
        yRef.current = hiddenY();
        nextPeekRef.current = performance.now() + 3500 + Math.random() * 4500;
        setActivityBoth('gone');
        notePetMoment('ranAway');
        if (p) say(randomLine(p.runAwayLines));
    }, [hiddenY, say, setActivityBoth]);

    const comeBack = useCallback(() => {
        const p = petRef.current;
        yRef.current = 0;
        phaseUntilRef.current = 0;
        react('happy', 900);
        playPetVoice(p?.id ?? 'modem');
        burst('sparkle', 3);
        if (p) say(randomLine(p.comeBackLines));
    }, [burst, react, say]);

    /* ------------------------------------------------------------------
     * Reacting to the rest of the desktop
     * ---------------------------------------------------------------
     * One subscription, several sources: the creature's own body, the tray
     * flyout, the Pet window and Clippy all end up here. Feeding from a
     * window and feeding by clicking the animal produce the same mouthful.
     */
    useEffect(() => {
        if (!pet || suspended) return;
        return onPetEvent((event: PetEvent) => {
            const p = petRef.current;
            if (!p) return;
            // Something happening elsewhere on the desktop is a call: a
            // creature in hiding comes out for it and then reacts to it
            // normally. `appOpened` and friends are not a call — a window
            // opening is not somebody asking for the pet.
            if (
                activityRef.current === 'gone' ||
                activityRef.current === 'peeking'
            ) {
                const summons =
                    event === 'fed' ||
                    event === 'patted' ||
                    event === 'trick' ||
                    event === 'fetch' ||
                    event === 'treat';
                if (!summons) return;
                yRef.current = 0;
                setActivityBoth('idle');
            }

            switch (event) {
                case 'fed':
                    react('eating', 1500);
                    burst('crumb', 5);
                    playPetVoice(p.id);
                    say(randomLine(p.feedLines));
                    break;

                case 'patted':
                    // A poke on the creature itself gets the repertoire; a
                    // deliberate "Pat" from a menu gets the plain happy hop.
                    if (pokeRef.current) {
                        perform();
                    } else {
                        react('happy', 1100);
                        burst('heart', 3);
                        playPetVoice(p.id);
                        say(randomLine(p.petLines));
                    }
                    break;

                case 'trick':
                    react('trick', 1300);
                    burst('sparkle', 5);
                    playPetHappy();
                    say(randomLine(p.trickLines));
                    break;

                case 'fetch': {
                    // Thrown from wherever the creature is standing, so it
                    // always has somewhere to bring it back to.
                    const dir: 1 | -1 = Math.random() < 0.5 ? -1 : 1;
                    toyRef.current = {
                        x: xRef.current,
                        y: 18,
                        vx: dir * (240 + Math.random() * 180),
                        vy: 300,
                        homeX: xRef.current,
                        carried: false,
                        doneAt: 0,
                    };
                    setHasToy(true);
                    // The loop notices the toy on its own; all this has to do
                    // is cut short whatever reaction is running.
                    phaseUntilRef.current = 0;
                    wallRef.current = 0;
                    playPetVoice(p.id);
                    say(p.playLines[0] ?? '');
                    break;
                }

                case 'treat': {
                    // Dropped in from above at a random spot on the bar, so
                    // the creature has to go and find it.
                    const { min, max } = walkBounds(spriteRef.current);
                    treatRef.current = {
                        x: min + Math.random() * Math.max(1, max - min),
                        y: 150,
                        vx: 0,
                        vy: 0,
                        homeX: 0,
                        carried: false,
                        doneAt: 0,
                    };
                    setHasTreat(true);
                    phaseUntilRef.current = 0;
                    wallRef.current = 0;
                    playPetTreat();
                    say(
                        `${p.treatName[0].toUpperCase()}${p.treatName.slice(
                            1
                        )} — ${p.name} has noticed.`
                    );
                    break;
                }

                case 'appOpened':
                    // A perk-up rather than a full reaction: no bubble, no
                    // sound, just a hop. Opening a window is not about the pet.
                    if (activityRef.current === 'held') break;
                    if (
                        activityRef.current === 'sleeping' ||
                        activityRef.current === 'idle' ||
                        activityRef.current === 'walking'
                    ) {
                        react('happy', 600);
                    }
                    break;

                case 'appClosed':
                    // It watches the window go. Quiet, and only when it has
                    // nothing better to be doing.
                    if (
                        activityRef.current === 'idle' ||
                        activityRef.current === 'walking'
                    ) {
                        poseRef.current = 'perk';
                        poseUntilRef.current = performance.now() + 700;
                    }
                    break;

                case 'error':
                    // The one thing on this machine that genuinely alarms it.
                    if (activityRef.current === 'held') break;
                    perform('worry');
                    break;

                case 'music':
                    if (activityRef.current === 'held') break;
                    if (
                        activityRef.current === 'idle' ||
                        activityRef.current === 'walking' ||
                        activityRef.current === 'sleeping'
                    ) {
                        perform('sing');
                    }
                    break;
            }
        });
    }, [pet, suspended, react, burst, say, perform, setActivityBoth]);

    /* ------------------------------------------------------------------
     * Something unlocked
     * ---------------------------------------------------------------
     * The star itself is drawn from `currentStar()` during render; this is
     * only the noise and the hop, which have to happen on the creature at the
     * moment it earns something rather than the next time React re-renders.
     */
    useEffect(() => {
        if (!pet || suspended) return;
        return onAchievementUnlocked((unlocked) => {
            react('happy', 1400);
            burst('sparkle', 7);
            playPetUnlock();
            say(`${unlocked.name} — unlocked.`);
        });
    }, [pet, suspended, react, burst, say]);

    /* ------------------------------------------------------------------
     * The loop
     * --------------------------------------------------------------- */
    useEffect(() => {
        if (!pet || suspended) return;

        const reduced = window.matchMedia?.(
            '(prefers-reduced-motion: reduce)'
        )?.matches;

        const onPointerMove = (e: PointerEvent) => {
            // `clientX/Y` are screen pixels and `TASKBAR_HEIGHT` is a desktop
            // pixel, which are only the same thing at 100% — so the strip has
            // to be measured through the resolution scale in both axes.
            const scale = getResolutionScale() || 1;
            const overTaskbar =
                e.clientY > window.innerHeight - (TASKBAR_HEIGHT + 6) * scale;
            pointerXRef.current = overTaskbar ? e.clientX / scale : null;
        };
        window.addEventListener('pointermove', onPointerMove, { passive: true });

        let raf = 0;
        let last = performance.now();

        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const size = spriteRef.current;
            const { min, max } = walkBounds(size);
            const hard = hardBounds(size);
            const act = activityRef.current;
            const ceiling = layerHeight() - GROUND - size;
            /** Where the creature was, for the odometer. */
            const wasX = xRef.current;

            // --- the toy and the treat, which fall whether or not anyone is
            //     paying attention to them -------------------------------
            stepProjectile(toyRef.current, dt, hard, true);
            stepProjectile(treatRef.current, dt, hard, false);
            if (toyRef.current?.carried) {
                toyRef.current.x = xRef.current + facingRef.current * 14;
                toyRef.current.y = 10;
            }
            if (toyRef.current && toyRef.current.doneAt && now > toyRef.current.doneAt) {
                toyRef.current = null;
                setHasToy(false);
            }

            // --- the creature ------------------------------------------
            if (act === 'held') {
                // Position is written by the pointer handler; nothing to do
                // here but let the transform below do the dangling.
                lastMoveRef.current = now;
            } else if (act === 'gone') {
                // Parked below the bottom edge of the screen, where the
                // layer's `overflow: hidden` clips it completely. Every so
                // often it can't help itself and looks over the edge.
                yRef.current = hiddenY();
                if (now > nextPeekRef.current) {
                    xRef.current = min + Math.random() * Math.max(1, max - min);
                    setActivityBoth('peeking');
                    phaseFromRef.current = now;
                    phaseUntilRef.current = now + 2400;
                }
            } else if (act === 'peeking') {
                // Up far enough for its head and shoulders to clear the bar,
                // a beat at the top, and back down. A sine over the whole
                // phase does the ease-in, the hold and the ease-out in one.
                const t = Math.min(
                    1,
                    Math.max(0, (now - phaseFromRef.current) / 2400)
                );
                yRef.current =
                    hiddenY() +
                    Math.sin(t * Math.PI) * (GROUND + size * 0.6);
                if (now > phaseUntilRef.current) {
                    setActivityBoth('gone');
                    nextPeekRef.current = now + 5000 + Math.random() * 7000;
                }
            } else if (act === 'falling') {
                vyRef.current -= GRAVITY * dt;
                xRef.current += vxRef.current * dt;
                yRef.current += vyRef.current * dt;
                spinRef.current += vxRef.current * dt * 0.8;

                // Walls. Bouncing off them is most of the fun of a throw.
                if (xRef.current < hard.min) {
                    xRef.current = hard.min;
                    vxRef.current = Math.abs(vxRef.current) * WALL_BOUNCE;
                    if (Math.abs(vxRef.current) > 60) playPetBump();
                } else if (xRef.current > hard.max) {
                    xRef.current = hard.max;
                    vxRef.current = -Math.abs(vxRef.current) * WALL_BOUNCE;
                    if (Math.abs(vxRef.current) > 60) playPetBump();
                }

                if (despawningRef.current) {
                    // Off the bottom of the world. Once it is properly gone,
                    // it comes back in through the top — which is both the
                    // only graceful way out of "the visitor dropped it under
                    // the taskbar" and, as it happens, the nicest accident in
                    // the whole component.
                    if (yRef.current < -(GROUND + size * 2)) {
                        despawningRef.current = false;
                        const p = petRef.current;
                        xRef.current =
                            min + Math.random() * Math.max(1, max - min);
                        yRef.current = layerHeight() - GROUND;
                        vxRef.current = 0;
                        vyRef.current = 0;
                        spinRef.current = 0;
                        burst('sparkle', 4);
                        notePetMoment('respawned');
                        if (p) say(randomLine(p.respawnLines));
                    }
                } else if (yRef.current <= 0) {
                    const impact = Math.abs(vyRef.current);
                    yRef.current = 0;
                    if (impact > 150) {
                        // One bounce, then it stays down.
                        vyRef.current = impact * FLOOR_BOUNCE;
                        vxRef.current *= 0.6;
                        playPetBump();
                        squashRef.current = Math.min(1, impact / 900);
                    } else {
                        const horizontal = Math.abs(vxRef.current);
                        vyRef.current = 0;
                        vxRef.current = 0;
                        spinRef.current = 0;
                        squashRef.current = Math.min(1, impact / 500);
                        const p = petRef.current;

                        // The throw is only measurable now: how far it went
                        // is not known when you let go of it. Recorded at the
                        // landing, against where the drag started.
                        if (throwFromRef.current) {
                            notePetMoment('thrown', {
                                distance: Math.abs(
                                    xRef.current - throwFromRef.current
                                ),
                            });
                            throwFromRef.current = 0;
                        }
                        if (impact > DIZZY_SPEED || horizontal > 300) {
                            react('dizzy', 1600);
                            burst('star', 4);
                            notePetMoment('dizzy');
                            if (p) say(randomLine(p.dizzyLines));
                        } else {
                            react('happy', 500);
                            if (p) say(randomLine(p.droppedLines));
                        }
                        lastMoveRef.current = now;
                    }
                }
            } else if (now < phaseUntilRef.current) {
                // A reaction is running (happy / eating / trick / dizzy /
                // one of the seven). Hold position and let the transform do
                // the work.
                if (act === 'trick') {
                    // Two full turns, eased out, driven by how far through
                    // the phase we are rather than accumulated per frame —
                    // so the creature always finishes upright instead of
                    // snapping back from wherever the last frame left it.
                    const progress = Math.min(
                        1,
                        (now - phaseFromRef.current) / phaseLengthRef.current
                    );
                    spinRef.current = 720 * (1 - Math.pow(1 - progress, 3));
                }
            } else if (
                act === 'happy' ||
                act === 'eating' ||
                act === 'trick' ||
                act === 'dizzy' ||
                act === 'reacting'
            ) {
                // The reaction just finished.
                spinRef.current = 0;
                reactionRef.current = null;
                setReaction(null);
                idleUntilRef.current = now + 400;
                setActivityBoth('idle');
            } else if (toyRef.current && toyRef.current.carried) {
                // Carrying it home. Driven by where the toy *is* rather than
                // by an activity flag, so being picked up, patted or startled
                // mid-errand pauses the chase instead of abandoning it.
                setActivityBoth('returning');
                const toy = toyRef.current;
                const dist = toy.homeX - xRef.current;
                if (Math.abs(dist) < 6 || reduced) {
                    toy.carried = false;
                    toy.vx = 0;
                    toy.vy = 0;
                    toy.y = 0;
                    toy.doneAt = now + 2200;
                    const p = petRef.current;
                    react('happy', 900);
                    burst('sparkle', 3);
                    playPetHappy();
                    if (p) say(p.playLines[1] ?? randomLine(p.playLines));
                } else {
                    const dir = (Math.sign(dist) || 1) as 1 | -1;
                    facingRef.current = dir;
                    xRef.current += dir * FETCH_SPEED * 0.85 * dt;
                    lastMoveRef.current = now;
                }
            } else if (toyRef.current && !toyRef.current.doneAt) {
                setActivityBoth('fetching');
                const toy = toyRef.current;
                const dist = toy.x - xRef.current;
                if (Math.abs(dist) < REACH_DISTANCE && toy.y < 24) {
                    toy.carried = true;
                } else if (!reduced) {
                    const dir = (Math.sign(dist) || 1) as 1 | -1;
                    facingRef.current = dir;
                    xRef.current += dir * FETCH_SPEED * dt;
                    lastMoveRef.current = now;
                } else {
                    toy.carried = true;
                }
            } else if (treatRef.current) {
                setActivityBoth('foraging');
                const treat = treatRef.current;
                const dist = treat.x - xRef.current;
                if (Math.abs(dist) < REACH_DISTANCE && treat.y <= 1) {
                    treatRef.current = null;
                    setHasTreat(false);
                    feedPet(); // fires 'fed', which runs the eating animation
                } else if (!reduced) {
                    const dir = (Math.sign(dist) || 1) as 1 | -1;
                    facingRef.current = dir;
                    xRef.current += dir * FETCH_SPEED * 0.75 * dt;
                    lastMoveRef.current = now;
                } else {
                    // Reduced motion: it can't run over, so it just eats.
                    treatRef.current = null;
                    setHasTreat(false);
                    feedPet();
                }
            } else if (act === 'toWall') {
                // Walking to the foot of the chosen edge.
                const wall = wallRef.current;
                const edge = wall === -1 ? hard.min : hard.max;
                const dist = edge - xRef.current;
                facingRef.current = (wall === -1 ? -1 : 1) as 1 | -1;
                if (Math.abs(dist) < 3) {
                    xRef.current = edge;
                    setActivityBoth('climbing');
                } else {
                    xRef.current += Math.sign(dist) * WALL_APPROACH_SPEED * dt;
                }
                lastMoveRef.current = now;
            } else if (act === 'climbing') {
                yRef.current += CLIMB_SPEED * dt;
                lastMoveRef.current = now;
                if (yRef.current >= Math.min(climbTargetRef.current, ceiling)) {
                    yRef.current = Math.min(climbTargetRef.current, ceiling);
                    const p = petRef.current;
                    setActivityBoth('wallHang');
                    // Long enough to be worth having climbed, short enough
                    // that a visitor who looks away and back has not missed
                    // the whole thing.
                    phaseUntilRef.current = now + 7000 + Math.random() * 8000;
                    notePetMoment('climbed');
                    if (p) say(randomLine(p.climbLines));
                }
            } else if (act === 'wallHang' || act === 'wallNap') {
                if (act === 'wallHang' && now > phaseUntilRef.current) {
                    // Either it dozes off up there or it lets go.
                    if (Math.random() < 0.4) {
                        const p = petRef.current;
                        setActivityBoth('wallNap');
                        phaseUntilRef.current = now + 9000 + Math.random() * 9000;
                        notePetMoment('napped');
                        if (p) say(randomLine(p.wallNapLines));
                    } else {
                        dropOffWall();
                    }
                } else if (act === 'wallNap' && now > phaseUntilRef.current) {
                    dropOffWall();
                }
            } else if (reduced || stayRef.current) {
                // Motion off, or told to stay: hold position, but still
                // wake and sleep so the creature isn't inertly identical
                // forever.
                if (act !== 'sleeping' && now - lastMoveRef.current > SLEEP_AFTER_MS) {
                    setActivityBoth('sleeping');
                } else if (act !== 'sleeping') {
                    setActivityBoth('idle');
                }
            } else {
                const pointerX = pointerXRef.current;
                if (pointerX !== null) {
                    const clamped = Math.max(min, Math.min(max, pointerX));
                    const dist = clamped - xRef.current;
                    if (Math.abs(dist) > CATCH_DISTANCE) {
                        setActivityBoth('chasing');
                        const dir = Math.sign(dist) as 1 | -1;
                        facingRef.current = dir;
                        xRef.current += dir * CHASE_SPEED * dt;
                        lastMoveRef.current = now;
                    } else {
                        // Caught up — sit and look at it.
                        setActivityBoth('idle');
                        idleUntilRef.current = Math.max(
                            idleUntilRef.current,
                            now + 900
                        );
                    }
                } else if (act === 'walking') {
                    const dist = targetRef.current - xRef.current;
                    if (Math.abs(dist) < 2) {
                        setActivityBoth('idle');
                        idleUntilRef.current = now + 1500 + Math.random() * 4000;
                    } else {
                        const dir = Math.sign(dist) as 1 | -1;
                        facingRef.current = dir;
                        xRef.current += dir * WALK_SPEED * dt;
                        lastMoveRef.current = now;
                    }
                } else {
                    // idle or sleeping
                    if (now - lastMoveRef.current > SLEEP_AFTER_MS) {
                        if (act !== 'sleeping') notePetMoment('napped');
                        setActivityBoth('sleeping');
                    } else if (now > idleUntilRef.current) {
                        // Every so often, instead of another amble along the
                        // bar, it goes and climbs something. Rate-limited
                        // hard: the wall is a surprise, and a surprise that
                        // happens every thirty seconds is a routine.
                        if (now > nextClimbRef.current && Math.random() < 0.5) {
                            wallRef.current = Math.random() < 0.5 ? -1 : 1;
                            climbTargetRef.current =
                                ceiling * (0.45 + Math.random() * 0.4);
                            nextClimbRef.current =
                                now + 90_000 + Math.random() * 90_000;
                            setActivityBoth('toWall');
                        } else {
                            targetRef.current =
                                min + Math.random() * Math.max(1, max - min);
                            setActivityBoth('walking');
                        }
                    }
                }
            }

            // --- small business, layered on top of standing still --------
            if (poseRef.current !== 'none' && now > poseUntilRef.current) {
                poseRef.current = 'none';
            }
            if (
                !reduced &&
                activityRef.current === 'idle' &&
                poseRef.current === 'none' &&
                now > nextPoseRef.current
            ) {
                const [pose, ms] = pickPose();
                poseRef.current = pose;
                poseUntilRef.current = now + ms;
                nextPoseRef.current = now + ms + 2600 + Math.random() * 5000;
                if (pose === 'stretch' || pose === 'scratch') {
                    // A stretch counts as being awake, so a fidgeting pet
                    // doesn't drop straight into a nap mid-stretch.
                    lastMoveRef.current = now - SLEEP_AFTER_MS * 0.6;
                }
            }

            // --- clamp and paint ----------------------------------------
            xRef.current = Math.max(hard.min, Math.min(hard.max, xRef.current));
            if (
                activityRef.current !== 'gone' &&
                activityRef.current !== 'peeking' &&
                !despawningRef.current
            ) {
                yRef.current = Math.max(0, yRef.current);
            }
            squashRef.current = Math.max(0, squashRef.current - dt * 3.2);

            // --- the odometer -------------------------------------------
            // Only self-directed walking counts. Being thrown across the
            // screen is not a walk, and counting it would make The Long Walk
            // a test of how hard you can throw a dog.
            const a = activityRef.current;
            if (
                a === 'walking' ||
                a === 'chasing' ||
                a === 'fetching' ||
                a === 'returning' ||
                a === 'foraging' ||
                a === 'toWall'
            ) {
                stepsRef.current += Math.abs(xRef.current - wasX);
            }
            if (now > nextStepFlushRef.current) {
                nextStepFlushRef.current = now + STEP_FLUSH_MS;
                if (stepsRef.current > 0.5) {
                    notePetMoment('walked', { distance: stepsRef.current });
                    stepsRef.current = 0;
                }
            }

            // Sleep bubbles accumulate rather than sitting at one 'z'. Cheap
            // because it only ever changes while asleep and only three times.
            if (a === 'sleeping') {
                const depth = Math.min(
                    3,
                    1 + Math.floor((now - lastMoveRef.current - SLEEP_AFTER_MS) / 6000)
                );
                setSleepDepth((prev) => (prev === depth ? prev : depth));
            } else if (a === 'wallNap') {
                setSleepDepth((prev) => (prev === 2 ? prev : 2));
            }

            const el = elRef.current;
            if (el) {
                el.style.left = `${Math.round(xRef.current - size / 2)}px`;
                el.style.bottom = `${Math.round(GROUND + yRef.current)}px`;
            }
            const body = bodyRef.current;
            if (body) {
                const t = transformFor({
                    activity: activityRef.current,
                    reaction: reactionRef.current,
                    pose: poseRef.current,
                    facing: facingRef.current,
                    now,
                    spin: spinRef.current,
                    squash: squashRef.current,
                    wall: wallRef.current,
                    reduced: !!reduced,
                });
                body.style.transform = t.transform;
                body.style.transformOrigin = t.origin;
            }
            // The contact shadow stays on the bar while the creature does
            // not, which is what makes a hop read as a hop and a throw read
            // as height rather than as the sprite simply getting smaller.
            const shadow = shadowRef.current;
            if (shadow) {
                const lift = Math.min(1, Math.max(0, yRef.current) / 160);
                const width = size * (0.62 - lift * 0.34);
                const offBar =
                    activityRef.current === 'held' ||
                    activityRef.current === 'gone' ||
                    activityRef.current === 'peeking' ||
                    wallRef.current !== 0;
                shadow.style.left = `${Math.round(xRef.current - width / 2)}px`;
                shadow.style.width = `${Math.round(width)}px`;
                shadow.style.opacity = String(offBar ? 0 : 0.26 - lift * 0.2);
            }

            paintProjectile(toyElRef.current, toyRef.current, now, true);
            paintProjectile(treatElRef.current, treatRef.current, now, false);

            raf = window.requestAnimationFrame(tick);
        };

        /** Lets go of the wall and falls, which the falling branch handles. */
        function dropOffWall(): void {
            const wall = wallRef.current;
            wallRef.current = 0;
            vxRef.current = wall === -1 ? 90 : -90;
            vyRef.current = 0;
            spinRef.current = 0;
            phaseUntilRef.current = 0;
            setActivityBoth('falling');
        }

        raf = window.requestAnimationFrame(tick);

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('pointermove', onPointerMove);
        };
    }, [pet, suspended, react, burst, say, setActivityBoth, hiddenY]);

    /* ------------------------------------------------------------------
     * Direct manipulation
     * --------------------------------------------------------------- */

    /** Screen pixels to this layer's own coordinates, which are desktop px. */
    const toLocal = useCallback((clientX: number, clientY: number) => {
        const rect = layerRef.current?.getBoundingClientRect();
        const scale = getResolutionScale();
        if (!rect) return { x: clientX / scale, y: 0 };
        return {
            x: (clientX - rect.left) / scale,
            y: (rect.bottom - clientY) / scale - GROUND,
        };
    }, []);

    const onPointerDown = (e: React.PointerEvent) => {
        if (e.button === 2) return; // the context menu handler has this one
        e.stopPropagation();
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        dragRef.current = {
            active: true,
            moved: false,
            pointerId: e.pointerId,
            samples: [{ t: performance.now(), x: e.clientX, y: e.clientY }],
            reversals: [],
            lastDx: 0,
            shaken: false,
        };
    };

    const onSpriteMove = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag?.active || drag.pointerId !== e.pointerId) return;
        const first = drag.samples[0];
        const far =
            Math.abs(e.clientX - first.x) > DRAG_THRESHOLD ||
            Math.abs(e.clientY - first.y) > DRAG_THRESHOLD;

        if (!drag.moved && far) {
            drag.moved = true;
            const p = petRef.current;
            phaseUntilRef.current = 0;
            spinRef.current = 0;
            wallRef.current = 0;
            despawningRef.current = false;
            throwFromRef.current = xRef.current;
            setActivityBoth('held');
            playPetLift();
            if (p) say(randomLine(p.heldLines));
        }
        if (!drag.moved) return;

        const local = toLocal(e.clientX, e.clientY);
        // Held, the creature follows the pointer exactly — including below
        // the taskbar, which is what makes dropping it off the bottom of the
        // world possible at all.
        xRef.current = local.x;
        yRef.current = local.y;

        // Shaking it about. Every reversal of horizontal direction inside the
        // last second and a bit counts; enough of them and it comes down
        // dizzy. VS Code's pet does this and it is the single most
        // discoverable hidden interaction either of them has — everybody
        // waggles a thing they have picked up.
        const prev = drag.samples[drag.samples.length - 1];
        const dx = e.clientX - prev.x;
        if (Math.abs(dx) > 3) {
            if (drag.lastDx !== 0 && Math.sign(dx) !== Math.sign(drag.lastDx)) {
                const t = performance.now();
                drag.reversals = drag.reversals
                    .filter((r) => t - r < WAGGLE_WINDOW_MS)
                    .concat(t);
                if (drag.reversals.length >= WAGGLE_REVERSALS) drag.shaken = true;
            }
            drag.lastDx = dx;
        }

        drag.samples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
        if (drag.samples.length > 6) drag.samples.shift();
    };

    const endDrag = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag?.active || drag.pointerId !== e.pointerId) return;
        dragRef.current = null;
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

        if (!drag.moved) {
            window.clearTimeout(clickTimer.current);
            clickTimer.current = window.setTimeout(onSimpleClick, 230);
            return;
        }

        // Throw velocity from the last few samples rather than the final
        // pointer delta: one 16ms frame is far too noisy to aim with.
        const scale = getResolutionScale();
        const samples = drag.samples;
        const a = samples[0];
        const b = samples[samples.length - 1];
        const seconds = Math.max(0.016, (b.t - a.t) / 1000);
        vxRef.current = ((b.x - a.x) / scale / seconds) * 0.9;
        vyRef.current = ((a.y - b.y) / scale / seconds) * 0.9;
        // A gentle put-down shouldn't launch it across the screen.
        vxRef.current = Math.max(-1400, Math.min(1400, vxRef.current));
        vyRef.current = Math.max(-1400, Math.min(1400, vyRef.current));

        /*
         * Released *below* the taskbar: it falls out of the world instead of
         * landing, and comes back in through the top.
         *
         * The threshold has to be near the very bottom of the screen. Local y
         * runs from 0 at the creature's feet down to -GROUND at the last row
         * of pixels, so a cutoff of -4 — which is what this was — meant that
         * putting the animal down anywhere on the lower three quarters of the
         * taskbar dropped it out of the world. That is where people put it
         * down. It has to be the bottom dozen pixels, so that leaving is
         * something you did rather than something that happened.
         */
        despawningRef.current = yRef.current < -(GROUND * 0.6);
        if (despawningRef.current) burst('sparkle', 3);

        if (drag.shaken) {
            notePetMoment('dizzy');
            // Enough spin left in it that the landing reads as the end of the
            // shaking rather than an unrelated stumble.
            spinRef.current = 220;
        }
        setActivityBoth('falling');
    };

    /** A press that never became a drag: poke, feed, or wake. */
    const onSimpleClick = () => {
        const p = petRef.current;
        if (!p) return;

        // A star on its head is a button, not decoration.
        if (currentStar()) {
            playClick();
            clearStar();
            openAppGlobal('pet');
            return;
        }

        playClick();

        if (activityRef.current === 'gone' || activityRef.current === 'peeking') {
            comeBack();
            return;
        }

        if (activityRef.current === 'sleeping' || activityRef.current === 'wallNap') {
            react('happy', 700);
            playPetVoice(p.id);
            say(randomLine(p.wakeLines));
            return;
        }

        const mood = computeMood();
        if (mood === 'hungry' || mood === 'starving') {
            feedPet();
            return;
        }

        // Counts as a pat, performs as a poke. See `pokeRef`.
        pokeRef.current = true;
        pettPet();
        pokeRef.current = false;
    };

    const onDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        window.clearTimeout(clickTimer.current);
        trickPet();
    };

    const onEnter = () => {
        if (activityRef.current !== 'idle' && activityRef.current !== 'walking') {
            return;
        }
        const p = petRef.current;
        poseRef.current = 'perk';
        poseUntilRef.current = performance.now() + 500;
        lastMoveRef.current = performance.now();
        // Not every time — a line on every accidental pass of the pointer
        // would turn the creature into a nag.
        if (p && Math.random() < 0.22) say(randomLine(p.idleLines));
    };

    const onContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = layerRef.current?.getBoundingClientRect();
        const scale = getResolutionScale();
        setMenu({
            x: rect ? (e.clientX - rect.left) / scale : e.clientX / scale,
            y: rect ? (e.clientY - rect.top) / scale : e.clientY / scale,
        });
    };

    /* ------------------------------------------------------------------
     * The keyboard
     * ---------------------------------------------------------------
     * Tab to the creature and it becomes a control: arrows hop it along the
     * bar, Shift+arrows throw it at a wall, Enter and Space poke it. Straight
     * from VS Code's pet, and worth having for the same two reasons they had
     * it — it is the only way to reach any of this without a pointer, and
     * alternating the arrows fast enough is a genuinely funny way to discover
     * that the animal can get dizzy.
     */
    const arrowsRef = useRef<{ dir: number; t: number }[]>([]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        const p = petRef.current;
        if (!p) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSimpleClick();
            return;
        }

        const dir = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        if (!dir) return;
        e.preventDefault();

        if (activityRef.current === 'gone' || activityRef.current === 'peeking') {
            comeBack();
            return;
        }

        facingRef.current = dir as 1 | -1;
        wallRef.current = 0;

        if (e.shiftKey) {
            // Thrown at the wall it is facing.
            throwFromRef.current = xRef.current;
            phaseUntilRef.current = 0;
            vxRef.current = dir * 900;
            vyRef.current = 420;
            despawningRef.current = false;
            playPetLift();
            setActivityBoth('falling');
            return;
        }

        // A hop, not a slide — one clean jump per press, which is what makes
        // holding the key down read as a series of hops.
        const size = spriteRef.current;
        const { min, max } = walkBounds(size);
        xRef.current = Math.max(
            min,
            Math.min(max, xRef.current + dir * size * 0.9)
        );
        phaseUntilRef.current = 0;
        react('happy', 320);
        lastMoveRef.current = performance.now();

        // Alternating fast enough is a shake by another name.
        const t = performance.now();
        arrowsRef.current = arrowsRef.current
            .filter((a) => t - a.t < WAGGLE_WINDOW_MS)
            .concat({ dir, t });
        let flips = 0;
        for (let i = 1; i < arrowsRef.current.length; i++) {
            if (arrowsRef.current[i].dir !== arrowsRef.current[i - 1].dir) flips++;
        }
        if (flips >= WAGGLE_REVERSALS) {
            arrowsRef.current = [];
            react('dizzy', 1600);
            burst('star', 4);
            notePetMoment('dizzy');
            say(randomLine(p.dizzyLines));
        }
    };

    /* ------------------------------------------------------------------
     * Render
     * --------------------------------------------------------------- */

    if (!pet || suspended || state.hidden) return null;

    const mood = computeMood(state);
    const hungry = mood === 'hungry' || mood === 'starving';
    const asleep = activity === 'sleeping' || activity === 'wallNap';
    const away = activity === 'gone' || activity === 'peeking';
    const star = currentStar();
    const wardrobe = unlockedAccessories();
    // The sunglasses are the whole point of the "cool" performance, so they
    // go on for its duration whether or not they have been unlocked yet —
    // which is also how you find out they exist.
    const worn: AccessoryId | null =
        reaction === 'cool' ? 'shades' : achievements.equipped;

    const menuItems: ContextMenuItem[] = away
        ? [
              {
                  label: `Call ${pet.name} back`,
                  bold: true,
                  onClick: comeBack,
              },
              {
                  label: `Open ${pet.name}…`,
                  separatorBefore: true,
                  onClick: () => openAppGlobal('pet'),
              },
              { label: 'Send away for now', onClick: () => hidePetForNow() },
          ]
        : [
              {
                  label: `Feed ${pet.name}`,
                  bold: hungry,
                  onClick: () => feedPet(),
              },
              { label: `Pat ${pet.name}`, onClick: () => pettPet() },
              {
                  label: 'Play fetch',
                  onClick: () => playFetch(),
                  disabled: !!toyRef.current,
              },
              { label: `Do a trick`, onClick: () => trickPet() },
              {
                  label: `Toss ${pet.treatName}`,
                  onClick: () => tossTreat(),
                  disabled: !!treatRef.current,
              },

              {
                  label: 'Achievements…',
                  separatorBefore: true,
                  bold: !!star,
                  onClick: () => {
                      clearStar();
                      openAppGlobal('pet');
                  },
              },
              ...(wardrobe.length
                  ? [
                        {
                            label: achievements.equipped
                                ? `Take off the ${ACCESSORIES[
                                      achievements.equipped
                                  ].name.toLowerCase()}`
                                : 'Nothing to wear yet',
                            disabled: !achievements.equipped,
                            onClick: () => equipAccessory(null),
                        },
                        ...wardrobe
                            .filter((a) => a.id !== achievements.equipped)
                            .map((a) => ({
                                label: `Wear the ${a.name.toLowerCase()}`,
                                onClick: () => equipAccessory(a.id),
                            })),
                    ]
                  : []),

              {
                  label: 'Grow',
                  separatorBefore: true,
                  disabled: achievements.scale >= 2,
                  onClick: () => adjustScale(SCALE_STEP),
              },
              {
                  label: 'Shrink',
                  disabled: achievements.scale <= 0.4,
                  onClick: () => adjustScale(-SCALE_STEP),
              },
              {
                  label: 'Reset size',
                  disabled: achievements.scale === 1,
                  onClick: () => resetScale(),
              },

              {
                  label: stayRef.current ? 'Off you go' : 'Sit and stay',
                  separatorBefore: true,
                  onClick: () => {
                      stayRef.current = !stayRef.current;
                      say(
                          stayRef.current
                              ? `${pet.name} sits down where they are.`
                              : `${pet.name} is off again.`
                      );
                  },
              },
              {
                  label: asleep ? 'Wake up' : 'Have a nap',
                  onClick: () => {
                      if (asleep) {
                          react('happy', 700);
                          playPetVoice(pet.id);
                          say(randomLine(pet.wakeLines));
                      } else {
                          lastMoveRef.current =
                              performance.now() - SLEEP_AFTER_MS - 1;
                          phaseUntilRef.current = 0;
                          wallRef.current = 0;
                          setActivityBoth('sleeping');
                      }
                  },
              },
              {
                  label: `Send ${pet.name} on the run`,
                  onClick: goOnTheRun,
              },

              {
                  label: `Open ${pet.name}…`,
                  separatorBefore: true,
                  onClick: () => openAppGlobal('pet'),
              },
              {
                  label: 'Send away for now',
                  onClick: () => hidePetForNow(),
              },
          ];

    return (
        <div ref={layerRef} style={styles.layer}>
            <div ref={shadowRef} style={styles.shadow} aria-hidden="true" />

            {/* The toy and the treat sit behind the creature, so a carried
                ball reads as being in front of its face rather than in it. */}
            {hasToy && (
                <div
                    ref={toyElRef}
                    style={{ ...styles.toy, background: pet.toyColor }}
                    aria-hidden="true"
                />
            )}
            {hasTreat && (
                <div ref={treatElRef} style={styles.treat} aria-hidden="true" />
            )}

            <div
                ref={elRef}
                style={{
                    ...styles.pet,
                    width: sprite,
                    height: sprite,
                    left: xRef.current - sprite / 2,
                    bottom: GROUND,
                }}
            >
                {bubble && !away && <div style={styles.bubble}>{bubble}</div>}

                {particles.map((p) => (
                    <span
                        key={p.id}
                        className={`pet-particle pet-particle-${p.kind}`}
                        style={
                            {
                                animationDelay: `${p.delay}ms`,
                                ['--pet-dx' as string]: `${p.dx}px`,
                            } as React.CSSProperties
                        }
                        aria-hidden="true"
                    >
                        {p.glyph}
                    </span>
                ))}

                {/* Sleep accumulates. One z is a state; three rising z's of
                    increasing size is a creature that has been under for a
                    while, and it is the cheapest possible way to show the
                    difference between "just dropped off" and "deeply out". */}
                {asleep &&
                    Array.from({ length: sleepDepth }, (_, i) => (
                        <span
                            key={i}
                            className="pet-zzz"
                            style={{
                                ...styles.zzz,
                                fontSize: 11 + i * 3,
                                animationDelay: `${i * 0.55}s`,
                            }}
                            aria-hidden="true"
                        >
                            z
                        </span>
                    ))}

                {hungry && !asleep && !away && activity !== 'held' && (
                    <span style={styles.hungerMark} title="Hungry">
                        !
                    </span>
                )}

                {/* Ten seconds of gold, then it's gone. Clicking it while it
                    is up opens the list — see `onSimpleClick`. */}
                {star && (
                    <span
                        className="pet-star"
                        style={styles.star}
                        title={`${star.name} — click to see it`}
                        aria-hidden="true"
                    >
                        ★
                    </span>
                )}

                {/* The little grey button the `press` performance presses.
                    It only exists for the second the creature is pressing it,
                    which is the joke. */}
                {reaction === 'press' && (
                    <span
                        style={{
                            ...styles.startButton,
                            left: `calc(50% + ${
                                facingRef.current * sprite * 0.42
                            }px)`,
                        }}
                        aria-hidden="true"
                    >
                        Start
                    </span>
                )}

                {/* The same art the tray and the Pet window use, so it is
                    recognisably one creature across all three — only larger,
                    and with the animation on a wrapper so the speech bubble
                    and the particles above don't spin along with it. */}
                <div
                    ref={bodyRef}
                    style={{ ...styles.body, width: sprite, height: sprite }}
                >
                    <img
                        src={getIconByName(pet.icon) as unknown as string}
                        alt=""
                        width={sprite}
                        height={sprite}
                        draggable={false}
                        style={{
                            ...styles.sprite,
                            width: sprite,
                            height: sprite,
                        }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onSpriteMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        onDoubleClick={onDoubleClick}
                        onPointerEnter={onEnter}
                        onContextMenu={onContextMenu}
                        onKeyDown={onKeyDown}
                        tabIndex={0}
                        role="button"
                        aria-label={`${pet.name}, your desktop pet. Enter to poke, arrow keys to move, shift and an arrow key to throw.`}
                        title={`${pet.name} — click to ${
                            hungry ? 'feed' : 'poke'
                        }, double-click for a trick, drag to pick up, right-click for more`}
                    />
                    {worn && (
                        <PetAccessory
                            id={worn}
                            unit={sprite}
                            anatomy={pet.anatomy}
                        />
                    )}
                </div>
            </div>

            {menu && (
                <div style={styles.menuHost}>
                    <ContextMenu
                        x={menu.x}
                        y={menu.y}
                        items={menuItems}
                        onClose={() => setMenu(null)}
                        bounds={{
                            width: layerRef.current?.clientWidth ?? 800,
                            height: layerRef.current?.clientHeight ?? 600,
                        }}
                    />
                </div>
            )}
        </div>
    );
};

/* -------------------------------------------------------------------------
 * Geometry
 * ----------------------------------------------------------------------
 * All of these are read every frame, so they take their size from the layer's
 * own box rather than `window.innerWidth`: the whole desktop lives inside a
 * `transform: scale()` wrapper for the resolution setting, and the viewport's
 * width is the wrong number at every setting except 100%.
 */

const layerWidth = (): number => {
    const scale = getResolutionScale();
    return window.innerWidth / (scale || 1);
};

const layerHeight = (): number => {
    const scale = getResolutionScale();
    return window.innerHeight / (scale || 1);
};

/** Where the creature will choose to walk of its own accord. */
const walkBounds = (sprite: number): { min: number; max: number } => {
    const width = layerWidth();
    return {
        min: START_RESERVE + sprite / 2,
        max: Math.max(
            START_RESERVE + sprite,
            width - TRAY_RESERVE - sprite / 2
        ),
    };
};

/** Where it is physically allowed to be — wider, because a thrown pet is
 *  allowed to end up somewhere it would never have walked to, and because
 *  the walls it climbs are the very edges. It ambles back into its own patch
 *  on its own within a few seconds. */
const hardBounds = (sprite: number): { min: number; max: number } => {
    const width = layerWidth();
    return { min: sprite / 2, max: Math.max(sprite, width - sprite / 2) };
};

/* -------------------------------------------------------------------------
 * The toy and the treat
 * ---------------------------------------------------------------------- */

function stepProjectile(
    p: Projectile | null,
    dt: number,
    hard: { min: number; max: number },
    bounces: boolean
): void {
    if (!p || p.carried) return;
    if (p.y <= 0 && Math.abs(p.vy) < 1 && Math.abs(p.vx) < 1) return;

    p.vy -= GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < hard.min) {
        p.x = hard.min;
        p.vx = Math.abs(p.vx) * 0.6;
    } else if (p.x > hard.max) {
        p.x = hard.max;
        p.vx = -Math.abs(p.vx) * 0.6;
    }

    if (p.y <= 0) {
        p.y = 0;
        // A ball bounces and rolls to a stop; a treat lands and stays put.
        p.vy = bounces && Math.abs(p.vy) > 90 ? Math.abs(p.vy) * 0.45 : 0;
        p.vx = bounces ? p.vx * 0.7 : 0;
        if (Math.abs(p.vx) < 6) p.vx = 0;
    }
}

function paintProjectile(
    el: HTMLDivElement | null,
    p: Projectile | null,
    now: number,
    rolls: boolean
): void {
    if (!el) return;
    if (!p) {
        el.style.opacity = '0';
        return;
    }
    el.style.left = `${Math.round(p.x - 7)}px`;
    el.style.bottom = `${Math.round(GROUND + p.y)}px`;
    // A ball rolls, so its spin follows the ground it has covered. A biscuit
    // is not a wheel and falls flat.
    if (rolls) el.style.transform = `rotate(${Math.round(p.x * 6)}deg)`;
    el.style.opacity =
        p.doneAt && now > p.doneAt - 700
            ? String(Math.max(0, (p.doneAt - now) / 700))
            : '1';
}

/* -------------------------------------------------------------------------
 * The animation itself
 * ----------------------------------------------------------------------
 * One function, no spritesheet. The art is a single 32px frame per animal, so
 * every bit of life here is squash, stretch, rotation and vertical bob driven
 * by real time — which is also why it scales from 40% to 200% without anyone
 * having to redraw anything.
 */

function pickPose(): [PetPose, number] {
    const roll = Math.random();
    if (roll < 0.34) return ['blink', 180];
    if (roll < 0.58) return ['stretch', 900];
    if (roll < 0.78) return ['scratch', 800];
    return ['sit', 2400];
}

interface TransformInput {
    activity: PetActivity;
    reaction: PetReaction | null;
    pose: PetPose;
    facing: 1 | -1;
    now: number;
    spin: number;
    squash: number;
    wall: 0 | 1 | -1;
    reduced: boolean;
}

function transformFor(input: TransformInput): {
    transform: string;
    origin: string;
} {
    const { activity, reaction, pose, facing, now, spin, squash, wall, reduced } =
        input;
    let ty = 0;
    let tx = 0;
    let rot = 0;
    let sx = 1;
    let sy = 1;
    let origin = '50% 100%';

    if (
        reduced &&
        (activity === 'idle' || activity === 'walking' || activity === 'chasing')
    ) {
        return { transform: `scaleX(${facing})`, origin };
    }

    switch (activity) {
        case 'walking':
        case 'chasing':
        case 'foraging':
        case 'toWall': {
            const speed = activity === 'walking' ? 190 : 120;
            const step = Math.sin(now / speed);
            ty = -Math.abs(step) * 3.5;
            rot = step * 4;
            sy = 1 + Math.abs(step) * 0.03;
            break;
        }

        case 'fetching':
        case 'returning': {
            // A flat-out run: a bigger bound and a forward lean.
            const step = Math.sin(now / 95);
            ty = -Math.abs(step) * 6;
            rot = 8 * facing + step * 5;
            sx = 1.05;
            sy = 0.97;
            break;
        }

        /* --- the wall ------------------------------------------------
         * A quarter turn towards the edge it is on, so the creature reads as
         * clinging rather than as floating next to the screen border. The
         * scramble is a small vertical judder on the climb only. */
        case 'climbing': {
            const scramble = Math.sin(now / 90) * 2;
            rot = wall === -1 ? 78 : -78;
            ty = scramble;
            sy = 1.02;
            break;
        }

        case 'wallHang': {
            const breath = Math.sin(now / 700);
            rot = (wall === -1 ? 82 : -82) + breath * 2.5;
            sy = 1 + breath * 0.02;
            break;
        }

        case 'wallNap': {
            const breath = Math.sin(now / 1000);
            rot = (wall === -1 ? 88 : -88) + breath * 1.5;
            sy = 0.94 + breath * 0.015;
            break;
        }

        case 'gone':
        case 'peeking':
            // Both are positioned rather than posed; a peek is the element
            // rising, not the body doing anything.
            sy = 1;
            break;

        /* --- the seven performances ---------------------------------- */
        case 'reacting':
            switch (reaction) {
                case 'press': {
                    // Leans forward, presses down, comes back. Sine over the
                    // whole phase so the return is as smooth as the press.
                    const t = Math.sin(now / 150);
                    tx = facing * Math.abs(t) * 5;
                    ty = Math.abs(t) * 3;
                    rot = facing * Math.abs(t) * 14;
                    sy = 1 - Math.abs(t) * 0.06;
                    break;
                }
                case 'heart': {
                    const hop = Math.abs(Math.sin(now / 140));
                    ty = -hop * 10;
                    sy = 1 + hop * 0.07;
                    sx = 1 - hop * 0.05;
                    break;
                }
                case 'cool': {
                    // A slow lean back, as the glasses land. Deliberately the
                    // stillest of the seven — it is the only one where the
                    // joke is a prop rather than a movement.
                    const t = Math.sin(now / 420);
                    rot = -facing * 7 + t * 2;
                    ty = -2;
                    sy = 1.02;
                    break;
                }
                case 'yap': {
                    // Lies on its side and talks. The quarter turn is the
                    // whole gag, so it is fast and it stays there.
                    const yap = Math.sin(now / 80);
                    rot = facing * 84 + yap * 5;
                    ty = 6;
                    origin = '50% 70%';
                    sx = 1 + Math.abs(yap) * 0.04;
                    break;
                }
                case 'sing': {
                    const sway = Math.sin(now / 260);
                    rot = sway * 12;
                    ty = -Math.abs(Math.sin(now / 130)) * 3;
                    sy = 1 + Math.abs(sway) * 0.03;
                    break;
                }
                case 'speechless':
                    // Absolutely nothing. Which, next to six animations, is
                    // itself an animation.
                    sy = 1.005;
                    break;
                case 'worry': {
                    const shiver = Math.sin(now / 42);
                    tx = shiver * 1.6;
                    rot = shiver * 2.5;
                    sy = 0.97;
                    sx = 1.02;
                    break;
                }
                default:
                    break;
            }
            break;

        case 'happy': {
            // Two quick hops.
            const hop = Math.abs(Math.sin(now / 110));
            ty = -hop * 12;
            sy = 1 + hop * 0.06;
            sx = 1 - hop * 0.04;
            rot = Math.sin(now / 110) * 6;
            break;
        }

        case 'eating': {
            // Head down, small fast nod.
            ty = 2;
            rot = 6 * facing + Math.sin(now / 70) * 5;
            sy = 0.94;
            sx = 1.04;
            break;
        }

        case 'trick':
            rot = spin;
            origin = '50% 50%';
            sy = 1.02;
            break;

        case 'dizzy':
            rot = Math.sin(now / 90) * 9;
            ty = Math.abs(Math.sin(now / 180)) * 2;
            sy = 0.95;
            sx = 1.05;
            break;

        case 'held':
            // Dangling from the pointer: the pivot moves to the scruff, and
            // the creature swings and paddles.
            origin = '50% 10%';
            rot = Math.sin(now / 130) * 11;
            sy = 1.06;
            sx = 0.96;
            break;

        case 'falling':
            rot = spin;
            origin = '50% 50%';
            sy = 1.04;
            sx = 0.97;
            break;

        case 'sleeping': {
            // Settled down onto the bar, breathing slowly.
            const breath = Math.sin(now / 900);
            ty = 5;
            sy = 0.82 + breath * 0.015;
            sx = 1.14 - breath * 0.015;
            rot = 4 * facing;
            break;
        }

        default: {
            // Idle: breathing, plus whatever small business is running.
            const breath = Math.sin(now / 850);
            sy = 1 + breath * 0.02;
            sx = 1 - breath * 0.015;

            if (pose === 'blink') {
                sy *= 0.9;
            } else if (pose === 'stretch') {
                sy *= 1.1;
                sx *= 0.92;
                ty = -3;
                rot = -6 * facing;
            } else if (pose === 'scratch') {
                rot = Math.sin(now / 55) * 7;
                ty = -1;
            } else if (pose === 'sit') {
                sy *= 0.9;
                sx *= 1.06;
                ty = 2;
            } else if (pose === 'perk') {
                sy *= 1.06;
                ty = -4;
            }
            break;
        }
    }

    // The landing squash, which decays over about a third of a second.
    if (squash > 0) {
        sy *= 1 - squash * 0.35;
        sx *= 1 + squash * 0.3;
    }

    return {
        transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(
            2
        )}px) rotate(${rot.toFixed(2)}deg) scale(${(sx * facing).toFixed(
            3
        )}, ${sy.toFixed(3)})`,
        origin,
    };
}

const styles: StyleSheetCSS = {
    layer: {
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        // Above the taskbar's own 100000 so the creature is on the bar rather
        // than behind it, but far below the screen saver (200000).
        zIndex: 100050,
        pointerEvents: 'none',
        overflow: 'hidden',
    },
    pet: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        willChange: 'transform',
        // A hard one-pixel shadow rather than a soft blur: at this size the
        // creature regularly rises past the bottom edge of a window, and an
        // outline is what makes that read as standing in front of it instead
        // of as a drawing bug. Soft shadows look wrong on pixel art.
        filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.45))',
    },
    sprite: {
        imageRendering: 'pixelated',
        cursor: 'grab',
        // The one thing on this layer that accepts a click.
        pointerEvents: 'auto',
        userSelect: 'none',
        touchAction: 'none',
    },
    bubble: {
        position: 'absolute',
        bottom: '100%',
        marginBottom: 16,
        left: '50%',
        marginLeft: -92,
        width: 184,
        padding: '5px 7px',
        background: '#ffffe1',
        border: '1px solid #000',
        boxShadow: '2px 2px 0 rgba(0,0,0,0.3)',
        fontFamily: 'MSSerif',
        fontSize: 10,
        lineHeight: 1.4,
        color: '#000',
        textAlign: 'center',
        pointerEvents: 'none',
    },
    zzz: {
        position: 'absolute',
        top: -10,
        right: -4,
        fontFamily: 'MSSerif',
        color: '#333',
        pointerEvents: 'none',
    },
    hungerMark: {
        position: 'absolute',
        top: -10,
        right: -2,
        fontFamily: 'MSSerif',
        fontWeight: 'bold',
        fontSize: 14,
        color: '#c0392b',
        pointerEvents: 'none',
    },
    star: {
        position: 'absolute',
        top: -14,
        left: '50%',
        marginLeft: -7,
        fontSize: 15,
        lineHeight: 1,
        color: '#ffcc22',
        textShadow: '0 0 4px rgba(255,204,34,0.9), 0 1px 0 rgba(0,0,0,0.5)',
        pointerEvents: 'none',
    },
    startButton: {
        position: 'absolute',
        bottom: 0,
        marginLeft: -16,
        padding: '1px 4px',
        background: '#c0c0c0',
        border: '1px solid #fff',
        borderRightColor: '#404040',
        borderBottomColor: '#404040',
        fontFamily: 'MSSerif',
        fontSize: 8,
        color: '#000',
        pointerEvents: 'none',
    },
    shadow: {
        position: 'absolute',
        bottom: GROUND - 1,
        height: 5,
        borderRadius: '50%',
        background: '#000',
        opacity: 0.26,
        pointerEvents: 'none',
    },
    toy: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '1px solid rgba(0,0,0,0.55)',
        boxShadow:
            'inset -2px -2px 0 rgba(0,0,0,0.22), inset 2px 2px 0 rgba(255,255,255,0.5)',
        pointerEvents: 'none',
    },
    treat: {
        position: 'absolute',
        width: 10,
        height: 8,
        background: '#b5763a',
        border: '1px solid #6d4520',
        borderRadius: 2,
        boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.4)',
        pointerEvents: 'none',
    },
    menuHost: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'auto',
    },
};

export default DesktopPet;
