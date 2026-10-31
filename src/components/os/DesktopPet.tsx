import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import { openAppGlobal } from './appBridge';
import { Animator, Clip } from './pet/animate';
import { Frame } from './pet/raster';
import { PetKind, draw, frameFor, originOf } from './pet/render';
import { SpriteName, TOY_SPRITE, TREAT_SPRITE, sprite as pixelSprite } from './pet/sprites';
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
import { BehaviourId, PetEnv, pickBehaviour } from './petBehaviour';
import {
    GROUND,
    Ledge,
    groundLedge,
    jumpableLedges,
    onLedge as xOverLedge,
    reachableLedges,
    refreshLedge,
    surveyLedges,
} from './petWorld';
import { getResolutionScale } from './resolution';
import {
    playClick,
    playPetBump,
    playPetHappy,
    playPetLift,
    playPetPurr,
    playPetTreat,
    playPetUnlock,
    playPetVoice,
    playPetZap,
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
 *   Stroke       move the pointer back and forth across it: it sits, leans
 *                in and squints. Static builds up a charge doing this.
 *   Double-click ask for its trick: a roll, a war dance, a slow blink.
 *   Drag         pick it up by the scruff. It dangles, anywhere on screen.
 *   Waggle       shake it about while holding it and it gets dizzy.
 *   Throw        let go while moving and it flies, bounces off the walls,
 *                lands, and is briefly too dizzy to walk straight.
 *   Drop it low  release it below the taskbar and it falls off the bottom of
 *                the world, then drops back in from the top.
 *   Right-click  the full menu: feed, pat, fetch, trick, treat, sit, nap,
 *                hats, size, achievements, or send it off to hide.
 *   Keyboard     Tab to it, then arrows / Shift+arrows / Enter.
 *   Hover        it turns its head to look at the pointer — and at you, if
 *                the pointer comes close.
 *   The taskbar  put the pointer on the bar and the collie herds it, the
 *                cat stalks it and pounces, the others come over.
 *   Leave it     it wanders, sits, grooms, climbs onto your windows, and
 *                eventually sleeps. Hungry, it sits by its bowl.
 *
 * What it looks like is drawn, not pictured: `pet/render.ts` paints the
 * animal from a skeleton every frame (see the note at the top of
 * `pet/raster.ts`), and `pet/animate.ts` decides the pose. Everything in
 * this file is behaviour — where the creature is and what it is doing.
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
    /* the windows — see `petWorld.ts` */
    | 'toLedge'
    | 'climbLedge'
    | 'onLedge'
    | 'ledgeSit'
    /* direct manipulation and absence */
    | 'held'
    | 'falling'
    /** The cat's leap at the pointer: thrown-pet physics, a hunter's pose. */
    | 'pouncing'
    | 'gone'
    | 'peeking';

/** Small extra bits of business layered on top of an idle stance. */
/**
 * Small business layered on top of standing still.
 *
 * Shimeji's idle repertoire is the reason it still reads as alive after
 * twenty minutes: `Sprawl`, `Creep`, `SitAndSpinHead`, `SitWhileDanglingLegs`,
 * `LieDown` — a dozen things to do while doing nothing, picked by weight, some
 * chaining into others. Four fidgets was not enough to carry the long stretches
 * where nobody is touching the creature, which is most of its life.
 */
type PetPose =
    | 'none'
    | 'blink'
    | 'stretch'
    | 'scratch'
    | 'sit'
    | 'perk'
    /** Somebody is typing. See `typingUntilRef`. */
    | 'watch'
    /* --- the long tail ------------------------------------------------- */
    | 'lie'
    | 'groom'
    | 'dig'
    | 'yawn'
    | 'tailChase'
    | 'sniff'
    | 'dance'
    | 'ponder';

/** The creature's nominal size at 100%, roughly nose to tail. Everything
 *  that needs to know how big the animal is — walking bounds, how close
 *  counts as caught, where the bowl goes — measures in these. */
const BASE_SPRITE = 52;

/** Pixels per second. Slow enough to read as an amble, not a scuttle. */
const WALK_SPEED = 40;
const CHASE_SPEED = 92;

/**
 * How each animal moves, relative to the numbers above.
 *
 * The four used to share one set of physics because they were four
 * pictures. They are four animals now: the ermine is quicker than anything
 * else on the bar, and the fish does not so much fall as sink — through
 * the desktop as if it were water, slowly, and without bouncing.
 */
const FEEL: Record<string, { pace: number; gravity: number; drag: number; bounce: number }> = {
    modem: { pace: 1, gravity: 1, drag: 0, bounce: 1 },
    static: { pace: 0.95, gravity: 1, drag: 0, bounce: 0.8 },
    glitch: { pace: 1.3, gravity: 1, drag: 0, bounce: 1 },
    pixel: { pace: 0.8, gravity: 0.24, drag: 1.6, bounce: 0.15 },
};
const feelOf = (id: string | undefined) => FEEL[id ?? 'modem'] ?? FEEL.modem;
/** Chasing a thrown toy is the one time the creature really runs. */
const FETCH_SPEED = 165;
/** Going to a wall is purposeful — faster than an amble, slower than a chase. */
const WALL_APPROACH_SPEED = 70;
const CLIMB_SPEED = 58;
/**
 * Scaling the side of a window, which is a much longer haul than the screen
 * edge: windows open near the top of the desktop and the creature lives at the
 * bottom, so a title bar is typically 800px up. At the screen-edge speed that
 * is a fourteen-second climb, which nobody is going to watch. At this speed it
 * is about four, which reads as a scramble.
 */
const LEDGE_CLIMB_SPEED = 215;
/** How near the pointer counts as "caught". */
const CATCH_DISTANCE = 22;
/** How near the toy or a treat counts as reached. */
const REACH_DISTANCE = 18;
/** Idle this long with no pointer nearby and the pet nods off. */
const SLEEP_AFTER_MS = 22_000;

/**
 * How long before it nods off, allowing for the hour.
 *
 * Between eleven at night and five in the morning the creature gives up on
 * staying awake in about half the usual time. It is a cheap effect — one
 * comparison against the system clock — and it is the sort of thing that only
 * pays off for the visitor who comes back at a different time of day and
 * notices that the animal is keeping different hours than it was. The site
 * already has a Clippy remark about the small hours; this is the same idea
 * expressed as behaviour rather than dialogue.
 */
function sleepAfterMs(): number {
    const hour = new Date().getHours();
    const small = hour >= 23 || hour < 5;
    return small ? SLEEP_AFTER_MS * 0.55 : SLEEP_AFTER_MS;
}

/** Right-hand limit: the tray is roughly this wide, and the pet must never
 *  wander under it. Measured from the right edge of the window. */
const TRAY_RESERVE = 250;
/** Left-hand limit: clear of the Start button. */
const START_RESERVE = 96;

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
    kind: 'heart' | 'crumb' | 'sparkle' | 'star' | 'note' | 'sweat' | 'spark' | 'bubble';
    /** Horizontal drift, in px, handed to the CSS keyframes as `--pet-dx`. */
    dx: number;
    delay: number;
    sprite: SpriteName;
}

/**
 * Where y = 0 sits, in screen pixels from the bottom: the top edge of the
 * taskbar. The old sprite had four empty rows under the paws and was sunk
 * six pixels into the bar to compensate (that is what `GROUND` is); the
 * drawn animals stand on their own feet, so they stand on the bar itself.
 */
const FOOT = GROUND + 6;

/** The sprite is redrawn at most this often; it moves at full frame rate. */
const DRAW_EVERY_MS = 1000 / 30;

/** How long a stroke has to keep going to count as one, and how often it pays out. */
const STROKE_TRAVEL = 46;
const STROKE_PAT_EVERY_MS = 2600;

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
    /** A zero-size anchor at the creature's feet; everything hangs off it. */
    const elRef = useRef<HTMLDivElement | null>(null);
    const toyElRef = useRef<HTMLDivElement | null>(null);
    const treatElRef = useRef<HTMLDivElement | null>(null);
    const shadowRef = useRef<HTMLDivElement | null>(null);
    const bowlElRef = useRef<HTMLDivElement | null>(null);

    /* --- the drawing ------------------------------------------------------
     * The animal is painted into a canvas by `pet/render.ts` rather than
     * being an <img> moved by CSS. The canvas is not clickable — its box is
     * mostly empty air round the animal — so a separate hit box is fitted
     * to the drawn pixels on every frame, and the bubble, particles and
     * star hang off a little anchor that follows the head.
     */
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const hitRef = useRef<HTMLDivElement | null>(null);
    /** Sits on the centre of the head: particles, sleep, the star. */
    const headElRef = useRef<HTMLDivElement | null>(null);
    /** Sits on top of the drawing, over the head: the speech bubble. */
    const bubbleElRef = useRef<HTMLDivElement | null>(null);
    const bubbleBoxRef = useRef<HTMLDivElement | null>(null);
    const bubbleTailRef = useRef<HTMLSpanElement | null>(null);
    const frameRef = useRef<Frame | null>(null);
    const imageRef = useRef<ImageData | null>(null);
    const animatorRef = useRef<Animator | null>(null);
    const lastDrawRef = useRef(0);
    /** The head and mouth as last drawn, relative to the feet, y up. */
    const headAtRef = useRef({ x: 12, y: 26, top: 36 });
    const mouthAtRef = useRef({ x: 18, y: 22 });
    /** The head's angle as last drawn, in degrees — what swings the hat. */
    const headAngleRef = useRef(0);
    /** What it is wearing this frame; read by the loop, so a ref. */
    const wornRef = useRef<AccessoryId | null>(null);

    /** The sprite's nominal size in px. Read in the loop, so also a ref. */
    const sprite = Math.round(BASE_SPRITE * achievements.scale);
    const spriteRef = useRef(sprite);
    spriteRef.current = sprite;
    const scaleRef = useRef(achievements.scale);
    scaleRef.current = achievements.scale;

    /* --- being stroked ----------------------------------------------------
     * Moving the pointer back and forth across the animal, without
     * pressing anything, is stroking it — the most natural thing anybody
     * does to a creature on a screen, and the one thing the old pet could
     * not notice. See `onStroke`.
     */
    const strokeRef = useRef({
        last: 0,
        lastX: 0,
        dir: 0,
        travel: 0,
        flips: 0,
        until: 0,
        nextPat: 0,
    });
    /** True while `pettPet` is being called from a stroke rather than a poke. */
    const strokingPatRef = useRef(false);
    /** Static's static: built by stroking, discharged all at once. 0..1. */
    const chargeRef = useRef(0);
    /** Glitch's corruption spikes: when it last went wrong on purpose. */
    const glitchUntilRef = useRef(0);
    /** When the pointer last moved, so the cat can wait for it to settle. */
    const pointerMovedAtRef = useRef(0);
    /** Not before this — a cat that pounces every second is a toy. */
    const nextPounceRef = useRef(0);
    /** The collie has dropped into the crouch and is giving the pointer the eye. */
    const herdingRef = useRef(false);
    /** Since when — after a while it goes down, still watching, as collies do. */
    const herdingSinceRef = useRef(0);
    /** Small ambient business: Glitch's next tear, Pixel's next bubble. */
    const nextAmbientRef = useRef(performance.now() + 8000);

    /* --- the bowl ---------------------------------------------------------
     * Hunger used to be a red "!" over the head. Now it is a bowl on the
     * taskbar, and an animal that goes and sits by it and looks at you,
     * which is what animals actually do. Feeding fills it; it is eaten
     * from; it goes away.
     */
    const bowlRef = useRef<{ x: number; full: boolean; until: number } | null>(null);
    const [bowl, setBowl] = useState<'none' | 'empty' | 'full'>('none');

    // --- the creature ------------------------------------------------------
    const xRef = useRef(START_RESERVE + 120); // centre, in desktop px
    const yRef = useRef(0); // height above the taskbar's top edge (`FOOT`)
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
    /** When the current pose began, so keyframed ones know their progress. */
    const poseFromRef = useRef(0);
    const nextPoseRef = useRef(performance.now() + 4000);
    /** "Sit. Stay." — suppresses wandering without switching the pet off. */
    const stayRef = useRef(false);
    /** Which performance is running, while `activity === 'reacting'`. */
    const reactionRef = useRef<PetReaction | null>(null);

    // --- the walls ---------------------------------------------------------
    /** Which edge is being climbed: -1 left, 1 right, 0 not on a wall. */
    const wallRef = useRef<0 | 1 | -1>(0);
    /** How high this particular climb intends to go, above the taskbar. */
    const climbTargetRef = useRef(0);
    /** Not before this — stops it living on the wall permanently. */
    const nextClimbRef = useRef(performance.now() + 45_000);

    /**
     * The window ledge the creature is on, or on its way to.
     *
     * Held as the object from `petWorld` rather than as coordinates, because
     * it carries the element: re-measuring that one rect every frame is what
     * lets the creature ride a window you are dragging, and what tells it the
     * floor has gone when you close one underneath it.
     */
    const ledgeRef = useRef<Ledge | null>(null);
    /** Which end of the ledge it is scaling, while `toLedge`/`climbLedge`. */
    const ledgeSideRef = useRef<1 | -1>(1);
    /** Where along the ledge it is ambling to, while `onLedge`. */
    const ledgeTargetRef = useRef(0);
    /** Rate limit, same reasoning as `nextClimbRef`. */
    const nextLedgeRef = useRef(performance.now() + 11_000);
    /** What it last finished, so `<NextBehavior>` chaining has an antecedent. */
    const lastBehaviourRef = useRef<BehaviourId | null>(null);
    /**
     * When it will wake up by itself.
     *
     * Sleeping used to be a one-way door. The condition for falling asleep is
     * "nothing has moved me for a while", and since a sleeping creature does
     * not move, it stayed true forever — so a visitor who opened the desktop
     * and read My Showcase without ever passing the pointer over the taskbar
     * got an animal that nodded off once and was still there, in the same
     * spot, when they left. Verified: two behaviour decisions in sixty
     * seconds, and the second one never carried out.
     *
     * Shimeji does not have this problem because sleep is an ordinary
     * behaviour with a duration rather than a terminal state, which is what
     * this makes it.
     */
    const wakeAtRef = useRef(0);

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
    /** The pointer anywhere on screen, in desktop px measured from the
     *  bottom-left — what the creature turns to look at. */
    const lookRef = useRef<{ x: number; y: number } | null>(null);
    /**
     * Until when the creature should look like it is watching you work.
     *
     * The one habit worth taking from Claude Code's own terminal mascot and
     * from VS Code's: it animates while the *machine* is doing something and
     * goes still when it stops, rather than only ever responding to being
     * poked. A creature that reacts to you is a toy; one that reacts to what
     * is happening is company.
     *
     * Typing is the version of that which is both cheap and actually visible
     * on this desktop — Notepad, the guestbook, Jonordle, Run, the address
     * bar. Deliberately a *pose* rather than an activity, so it layers over
     * an ordinary amble instead of interrupting one, and deliberately small:
     * something that reacted loudly to every keystroke would be the single
     * most irritating thing on the machine.
     */
    const typingUntilRef = useRef(0);
    /**
     * The hat, lagging behind the head.
     *
     * A light spring: the body's angular velocity drives it, its own
     * stiffness pulls it back to level, and damping stops it ringing. This is
     * the one place the wardrobe gets to be more than a decal — Codrops'
     * flag-waver does the same thing in reverse, moving the *hand* against the
     * flag's swing to keep the wrist attached.
     */
    const hatAngleRef = useRef(0);
    const hatVelRef = useRef(0);

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
        const made: Particle[] = Array.from({ length: count }, (_, i) => ({
            id: ++particleId,
            kind,
            dx: (Math.random() - 0.5) * 30,
            delay: i * 110,
            sprite: kind,
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
            // Clinging to the side of the screen, a reaction is a reason to
            // let go, not something to perform up there. It used to release
            // the wall and play the hop in mid-air — and the first climb
            // unlocks Wall Crawler, whose celebration is exactly such a
            // reaction, so nearly every visitor's pet ended up strolling
            // along nothing halfway up the screen.
            const act = activityRef.current;
            if (
                wallRef.current !== 0 &&
                (act === 'climbing' || act === 'wallHang' || act === 'wallNap')
            ) {
                wallRef.current = 0;
                vxRef.current = 0;
                vyRef.current = 0;
                spinRef.current = 0;
                phaseUntilRef.current = 0;
                // Whatever performance asked for this is not going to
                // happen, so it must not linger — `cool` would otherwise
                // leave the sunglasses on until some later reaction ended.
                reactionRef.current = null;
                setReaction(null);
                setActivityBoth('falling');
                return;
            }
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
                    burst('heart', 2);
                    if (p.id === 'static') playPetPurr();
                    else playPetVoice(p.id);
                    break;
                case 'sing':
                    // The fish sings in bubbles; everybody else in notes.
                    burst(p.id === 'pixel' ? 'bubble' : 'note', p.id === 'pixel' ? 5 : 3);
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
                    if (p.id === 'pixel') burst('bubble', 3);
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
    const hiddenY = useCallback(() => -(FOOT + spriteRef.current + 4), []);

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
                case 'fed': {
                    // Into a bowl in front of its nose, if it is standing on
                    // the taskbar — the empty one it was sitting by, moved
                    // the last few pixels, or a fresh one.
                    if (!ledgeRef.current && yRef.current < 4 && wallRef.current === 0) {
                        bowlRef.current = {
                            x: xRef.current + facingRef.current * spriteRef.current * 0.42,
                            full: true,
                            until: performance.now() + 2400,
                        };
                        setBowl('full');
                    }
                    react('eating', 1500);
                    burst('crumb', 4);
                    playPetVoice(p.id);
                    say(randomLine(p.feedLines));
                    break;
                }

                case 'patted':
                    // A stroke gets contentment: it sits, squints, and leans
                    // into the hand. A poke on the creature itself gets the
                    // repertoire; a deliberate "Pat" from a menu gets the
                    // plain happy hop.
                    if (strokingPatRef.current) {
                        reactionRef.current = 'heart';
                        setReaction('heart');
                        react('reacting', 1600);
                        notePetMoment('reaction', { id: 'heart' });
                        burst('heart', 2);
                        if (p.id === 'static') playPetPurr();
                        else playPetVoice(p.id);
                        say(randomLine(p.petLines));
                    } else if (pokeRef.current) {
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
                    // Glitch, being made of the same stuff as the error,
                    // also briefly comes apart.
                    if (p.id === 'glitch') glitchUntilRef.current = performance.now() + 700;
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
            // The hop only where there is something to hop from: not while
            // clinging to a wall (the first climb unlocks Wall Crawler at
            // the very moment it reaches the top), and not in a hand.
            const act = activityRef.current;
            const grounded =
                wallRef.current === 0 &&
                act !== 'held' &&
                act !== 'falling' &&
                act !== 'pouncing' &&
                act !== 'climbing' &&
                act !== 'climbLedge';
            if (grounded) react('happy', 1400);
            burst('sparkle', 5);
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

            // Chasing only happens along the bar, but *looking* happens
            // wherever the pointer is — so this one is tracked unconditionally
            // and in both axes. See the attention note in `petMotion.ts`.
            lookRef.current = {
                x: e.clientX / scale,
                y: (window.innerHeight - e.clientY) / scale,
            };
            pointerMovedAtRef.current = performance.now();
        };
        window.addEventListener('pointermove', onPointerMove, { passive: true });

        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement | null;
            if (!el) return;
            const tag = el.tagName;
            const typing =
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                el.isContentEditable === true;
            if (typing) typingUntilRef.current = performance.now() + 1500;
        };
        window.addEventListener('keydown', onKey, { passive: true, capture: true });

        let raf = 0;
        let last = performance.now();
        /** A finger needs a bigger target than a pointer does. */
        const coarse = !!window.matchMedia?.('(pointer: coarse)')?.matches;
        /**
         * How often to redraw, adapting to the machine: a slow phone that
         * takes more than a few milliseconds per paint drops from thirty
         * drawings a second to twenty. Movement stays at full rate either
         * way; only the sprite's cadence changes.
         */
        let drawEvery = DRAW_EVERY_MS;
        let paintCost = 0;
        /** Hunger, re-read twice a second rather than sixty times. */
        let nextMoodCheck = 0;
        let hungryNow = false;

        /** How corrupted Glitch looks right now, 0..1. */
        const glitchLevel = (now: number): number => {
            if (now < glitchUntilRef.current) return 1;
            switch (activityRef.current) {
                case 'trick':
                    return 1;
                case 'dizzy':
                    return 0.85;
                case 'held':
                    return 0.5;
                case 'falling':
                    return 0.35;
                case 'sleeping':
                case 'wallNap':
                    return 0.02;
                default:
                    return 0.08;
            }
        };

        /**
         * Draws the pose into the canvas, then fits everything that hangs
         * off the drawing to it: the hit box to the pixels, the bubble and
         * particles to the head, the hat's swing to how fast the head moved.
         */
        function paint(pose: ReturnType<Animator['update']>, kind: PetKind, now: number, since: number): void {
            const frame = frameRef.current;
            const image = imageRef.current;
            const canvas = canvasRef.current;
            if (!frame || !image || !canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const drawn = draw(frame, {
                kind,
                pose,
                facing: facingRef.current,
                scale: scaleRef.current,
                time: now,
                accessory: wornRef.current,
                hatSwing: hatAngleRef.current,
                glitch: kind === 'glitch' ? glitchLevel(now) : 0,
                charge: kind === 'static' ? chargeRef.current : 0,
                alarm: reactionRef.current === 'worry' || reactionRef.current === 'speechless',
            });
            ctx.putImageData(image, 0, 0);

            const [ox, oy] = originOf(frame);
            const b = drawn.bbox;
            const a = drawn.anchors;

            // The hit box hugs what was drawn, with a little slack, and is
            // never smaller than a fingertip.
            const hit = hitRef.current;
            if (hit) {
                const minSide = coarse ? 40 : 26;
                let w = b.x1 - b.x0 + 7;
                let h = b.y1 - b.y0 + 7;
                let left = b.x0 - ox - 3;
                let top = b.y0 - oy - 3;
                if (w < minSide) {
                    left -= (minSide - w) / 2;
                    w = minSide;
                }
                if (h < minSide) {
                    top -= (minSide - h) / 2;
                    h = minSide;
                }
                hit.style.left = `${Math.round(left)}px`;
                hit.style.top = `${Math.round(top)}px`;
                hit.style.width = `${Math.round(w)}px`;
                hit.style.height = `${Math.round(h)}px`;
            }

            headAtRef.current = {
                x: a.head[0] - ox,
                y: oy - a.head[1],
                top: oy - b.y0,
            };
            mouthAtRef.current = { x: a.mouth[0] - ox, y: oy - a.mouth[1] };
            const head = headElRef.current;
            if (head) {
                head.style.left = `${Math.round(a.head[0] - ox)}px`;
                head.style.top = `${Math.round(a.head[1] - oy)}px`;
            }
            const talk = bubbleElRef.current;
            if (talk) {
                talk.style.left = `${Math.round(a.head[0] - ox)}px`;
                talk.style.top = `${Math.round(b.y0 - oy)}px`;
                // Keep the balloon on screen near either edge, sliding it
                // sideways while its tail stays pointed at whoever spoke.
                const box = bubbleBoxRef.current;
                const tail = bubbleTailRef.current;
                if (box && tail) {
                    const headX = xRef.current + (a.head[0] - ox);
                    const half = 96;
                    const lo = 4 + half - headX;
                    const hi = layerWidth() - 4 - half - headX;
                    const shift = Math.round(Math.max(lo, Math.min(hi, 0)));
                    box.style.marginLeft = `${-half + shift}px`;
                    tail.style.left = `${Math.max(6, Math.min(176, half - 6 - shift))}px`;
                }
            }

            /* --- the hat, one beat behind ---------------------------------
             * Driven by how fast the head just turned, pulled back to level
             * by its own stiffness, and damped so it settles rather than
             * ringing. Clamped hard: a hat that swings further than this
             * stops looking like inertia and starts looking like it has
             * come off.
             */
            const angle = (a.headAngle * 180) / Math.PI;
            let drive = angle - headAngleRef.current;
            if (drive > 180) drive -= 360;
            if (drive < -180) drive += 360;
            drive = Math.max(-30, Math.min(30, drive));
            headAngleRef.current = angle;
            if (!wornRef.current || reduced) {
                hatAngleRef.current = 0;
                hatVelRef.current = 0;
            } else {
                const step = Math.min(2.5, since * 60);
                hatVelRef.current +=
                    (-hatAngleRef.current * 0.16 - hatVelRef.current * 0.22) * step -
                    drive * 0.42;
                hatAngleRef.current = Math.max(
                    -17,
                    Math.min(17, hatAngleRef.current + hatVelRef.current * step)
                );
            }
        }

        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const size = spriteRef.current;
            const { min, max } = walkBounds(size);
            const hard = hardBounds(size);
            const act = activityRef.current;
            const ceiling = layerHeight() - FOOT - size;
            /** Where the creature was, for the odometer. */
            const wasX = xRef.current;
            const wasY = yRef.current;

            // --- the toy and the treat, which fall whether or not anyone is
            //     paying attention to them -------------------------------
            stepProjectile(toyRef.current, dt, hard, true);
            stepProjectile(treatRef.current, dt, hard, false);
            if (toyRef.current?.carried) {
                // In its mouth — wherever the mouth was last drawn.
                toyRef.current.x = xRef.current + mouthAtRef.current.x;
                toyRef.current.y = Math.max(0, mouthAtRef.current.y - 2);
            }
            if (toyRef.current && toyRef.current.doneAt && now > toyRef.current.doneAt) {
                toyRef.current = null;
                setHasToy(false);
            }

            /**
             * Carries out a behaviour the table chose.
             *
             * The split is Shimeji's: `petBehaviour.ts` is data describing
             * when each habit applies and how often it wins, and this is the
             * engine that knows what any of them actually means. Nothing here
             * decides anything.
             */
            function enterBehaviour(id: BehaviourId): void {
                lastBehaviourRef.current = id;
                switch (id) {
                    case 'walkFloor': {
                        // A hungry animal with a bowl out mostly walks to
                        // it, and sits beside it, and looks at you.
                        const bw = bowlRef.current;
                        if (hungryNow && bw && !bw.full && Math.random() < 0.7) {
                            const side = xRef.current < bw.x ? -1 : 1;
                            targetRef.current = Math.max(
                                min,
                                Math.min(max, bw.x + side * size * 0.75)
                            );
                        } else {
                            targetRef.current =
                                min + Math.random() * Math.max(1, max - min);
                        }
                        setActivityBoth('walking');
                        break;
                    }

                    case 'sitFloor':
                        poseRef.current = 'sit';
                        poseFromRef.current = now;
                        poseUntilRef.current =
                            now + 2600 + Math.random() * 4200;
                        idleUntilRef.current = poseUntilRef.current;
                        // Deliberately sitting is being awake. Without this the
                        // sit counts towards nodding off, and a creature that
                        // sits down twice in a row drops straight into a nap.
                        lastMoveRef.current = now;
                        setActivityBoth('idle');
                        break;

                    case 'climbScreenWall':
                        wallRef.current = Math.random() < 0.5 ? -1 : 1;
                        climbTargetRef.current =
                            ceiling * (0.45 + Math.random() * 0.4);
                        nextClimbRef.current =
                            now + 90_000 + Math.random() * 90_000;
                        setActivityBoth('toWall');
                        break;

                    case 'climbToLedge': {
                        const options = reachableLedges(
                            xRef.current,
                            yRef.current
                        );
                        if (!options.length) {
                            enterBehaviour('walkFloor');
                            return;
                        }
                        const pick =
                            options[Math.floor(Math.random() * options.length)];
                        ledgeRef.current = pick;
                        ledgeSideRef.current =
                            Math.abs(xRef.current - pick.left) <
                            Math.abs(xRef.current - pick.right)
                                ? -1
                                : 1;
                        nextLedgeRef.current =
                            now + 28_000 + Math.random() * 40_000;
                        setActivityBoth('toLedge');
                        break;
                    }

                    case 'walkLedge': {
                        const l = ledgeRef.current;
                        if (!l) {
                            enterBehaviour('walkFloor');
                            return;
                        }
                        const pad = size * 0.5;
                        const lo = l.left + pad;
                        const hi = Math.max(lo, l.right - pad);
                        ledgeTargetRef.current =
                            lo + Math.random() * Math.max(1, hi - lo);
                        setActivityBoth('onLedge');
                        break;
                    }

                    case 'sitLedgeEdge': {
                        const l = ledgeRef.current;
                        if (!l) {
                            enterBehaviour('walkFloor');
                            return;
                        }
                        const pad = size * 0.5;
                        const lo = l.left + pad;
                        const hi = Math.max(lo, l.right - pad);
                        const nearLeft =
                            Math.abs(xRef.current - lo) <
                            Math.abs(xRef.current - hi);
                        xRef.current = nearLeft ? lo : hi;
                        facingRef.current = (nearLeft ? -1 : 1) as 1 | -1;
                        setActivityBoth('ledgeSit');
                        phaseUntilRef.current =
                            now + 4000 + Math.random() * 7000;
                        notePetMoment('napped');
                        break;
                    }

                    case 'leapToLedge': {
                        /*
                         * The jump between windows, and the reason the table
                         * was worth building: it is one row there and a
                         * ballistic launch here, because everything else it
                         * needs already existed. The arc is ordinary
                         * projectile motion and the arrival is handled by
                         * `landingLedge`, which has been catching thrown pets
                         * on title bars since windows became solid.
                         */
                        const from = ledgeRef.current;
                        const options = from
                            ? jumpableLedges(from, xRef.current)
                            : [];
                        if (!from || !options.length) {
                            enterBehaviour('walkLedge');
                            return;
                        }
                        const to =
                            options[Math.floor(Math.random() * options.length)];
                        // Aim a little way onto the target rather than at its
                        // very lip, so a slight undershoot still lands.
                        const aim =
                            xRef.current < to.left
                                ? Math.min(to.right - size * 0.5, to.left + size)
                                : Math.max(to.left + size * 0.5, to.right - size);
                        const dx = aim - xRef.current;
                        const dy = to.y - yRef.current;
                        // Flight time from the distance, so a short hop is
                        // quick and a long one hangs.
                        const T = Math.max(
                            0.42,
                            Math.min(0.9, Math.abs(dx) / 300 + 0.4)
                        );
                        facingRef.current = (Math.sign(dx) || 1) as 1 | -1;
                        vxRef.current = dx / T;
                        vyRef.current = (dy + 0.5 * GRAVITY * T * T) / T;
                        ledgeRef.current = null;
                        phaseUntilRef.current = 0;
                        spinRef.current = 0;
                        playPetLift();
                        setActivityBoth('falling');
                        break;
                    }

                    case 'hopDown': {
                        const p = petRef.current;
                        ledgeRef.current = null;
                        vxRef.current = facingRef.current * 70;
                        vyRef.current = 60;
                        phaseUntilRef.current = 0;
                        setActivityBoth('falling');
                        if (p) say(randomLine(p.hopOffLines));
                        break;
                    }
                }
            }

            /** The snapshot the table's conditions are evaluated against. */
            function readEnv(): PetEnv {
                const standing = ledgeRef.current;
                return {
                    onGround: !standing,
                    onLedge: !!standing,
                    reachable:
                        now > nextLedgeRef.current
                            ? reachableLedges(xRef.current, yRef.current).length
                            : 0,
                    jumpable: standing
                        ? jumpableLedges(standing, xRef.current).length
                        : 0,
                    canClimbWall: now > nextClimbRef.current,
                    canTakeLedge: now > nextLedgeRef.current,
                };
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
                    Math.sin(t * Math.PI) * (FOOT + size * 0.6);
                if (now > phaseUntilRef.current) {
                    setActivityBoth('gone');
                    nextPeekRef.current = now + 5000 + Math.random() * 7000;
                }
            } else if (act === 'falling' || act === 'pouncing') {
                const prevY = yRef.current;
                const feel = feelOf(petRef.current?.id);
                vyRef.current -= GRAVITY * feel.gravity * dt;
                if (feel.drag) {
                    // Water: everything bleeds away, and a sinking fish
                    // settles at a gentle terminal speed.
                    const k = Math.max(0, 1 - feel.drag * dt);
                    vxRef.current *= k;
                    vyRef.current = Math.max(-140, vyRef.current * k);
                }
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
                    if (yRef.current < -(FOOT + size * 2)) {
                        despawningRef.current = false;
                        const p = petRef.current;
                        xRef.current =
                            min + Math.random() * Math.max(1, max - min);
                        yRef.current = layerHeight() - FOOT;
                        vxRef.current = 0;
                        vyRef.current = 0;
                        spinRef.current = 0;
                        burst('sparkle', 4);
                        notePetMoment('respawned');
                        if (p) say(randomLine(p.respawnLines));
                    }
                } else if (vyRef.current < 0 && landingLedge(
                    xRef.current, yRef.current, prevY, size
                )) {
                    /* Caught by a window on the way down.
                     *
                     * Checked as a *crossing* rather than a containment test:
                     * a fast fall covers more than a window's thickness in one
                     * frame, so asking "is it inside the ledge now" misses
                     * entirely. Asking "did it pass through the surface since
                     * last frame, while moving downward" does not. Windows are
                     * only solid from above, which is both the cheap option
                     * and the correct one — a creature thrown upward should
                     * pass a title bar, not bonk its head on it.
                     */
                    const caught = landingLedge(
                        xRef.current, yRef.current, prevY, size
                    ) as Ledge;
                    const impact = Math.abs(vyRef.current);
                    ledgeRef.current = caught;
                    yRef.current = caught.y;
                    vyRef.current = 0;
                    vxRef.current = 0;
                    spinRef.current = 0;
                    squashRef.current = Math.min(1, impact / 500);
                    playPetBump();
                    const pad = size * 0.5;
                    ledgeTargetRef.current =
                        caught.left + pad +
                        Math.random() * Math.max(1, caught.right - caught.left - pad * 2);
                    react('happy', 420);
                    setActivityBoth('onLedge');
                    lastMoveRef.current = now;
                } else if (yRef.current <= 0) {
                    const impact = Math.abs(vyRef.current);
                    yRef.current = 0;
                    if (impact > 150 && feelOf(petRef.current?.id).bounce > 0.5) {
                        // One bounce, then it stays down.
                        vyRef.current = impact * FLOOR_BOUNCE * feelOf(petRef.current?.id).bounce;
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
                        if (act === 'pouncing') {
                            // Landed on nothing, as cats generally do when
                            // the thing was a pointer. A beat of composure.
                            react('happy', 380);
                            if (p?.pounceLines && Math.random() < 0.35) {
                                say(randomLine(p.pounceLines));
                            }
                        } else if (impact > DIZZY_SPEED || horizontal > 300) {
                            react('dizzy', 1600);
                            burst('star', 3);
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
                // The reaction just finished. If it happened somewhere with
                // nothing underneath — off a wall, or mid-climb with the
                // window it was climbing gone — the next thing is falling,
                // not standing about in the air.
                spinRef.current = 0;
                reactionRef.current = null;
                setReaction(null);
                if (yRef.current > 0.5 && !ledgeRef.current) {
                    vxRef.current = 0;
                    vyRef.current = 0;
                    setActivityBoth('falling');
                } else {
                    idleUntilRef.current = now + 400;
                    setActivityBoth('idle');
                }
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
                // Rearing up onto the wall: the feet go to the edge itself,
                // since it is the drawn paws that hold on, not a sprite box.
                const wallX = wallRef.current === -1 ? 1 : layerWidth() - 1;
                xRef.current += (wallX - xRef.current) * Math.min(1, dt * 10);
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
            } else if (
                act === 'toLedge' ||
                act === 'climbLedge' ||
                act === 'onLedge' ||
                act === 'ledgeSit'
            ) {
                /* --- life on the windows ---------------------------------
                 * Re-measured every frame rather than remembered. A window
                 * you drag carries the creature with it, a window you resize
                 * changes the length of its walk, and a window you close out
                 * from under it drops it — all for free, because the ledge is
                 * read from the layout rather than from a copy of it.
                 */
                const live = ledgeRef.current
                    ? refreshLedge(ledgeRef.current)
                    : null;
                if (!live) {
                    // The floor went away. So does the creature.
                    ledgeRef.current = null;
                    vxRef.current = 0;
                    vyRef.current = 0;
                    phaseUntilRef.current = 0;
                    setActivityBoth('falling');
                } else {
                    const prev = ledgeRef.current as Ledge;
                    // Ride it: hold position *relative to the ledge* so a
                    // window dragged sideways takes the creature along
                    // instead of sliding out from under it.
                    if (act === 'onLedge' || act === 'ledgeSit') {
                        xRef.current += live.left - prev.left;
                        ledgeTargetRef.current += live.left - prev.left;
                    }
                    ledgeRef.current = live;

                    const pad = size * 0.5;
                    const lo = live.left + pad;
                    const hi = Math.max(lo, live.right - pad);

                    if (act === 'toLedge') {
                        // Walk to whichever vertical edge of the window it
                        // decided to scale.
                        const edge =
                            ledgeSideRef.current === -1 ? live.left : live.right;
                        const dist = edge - xRef.current;
                        facingRef.current = (Math.sign(dist) || 1) as 1 | -1;
                        if (Math.abs(dist) < 4) {
                            xRef.current = edge;
                            setActivityBoth('climbLedge');
                        } else {
                            xRef.current +=
                                Math.sign(dist) * WALL_APPROACH_SPEED * dt;
                        }
                        lastMoveRef.current = now;
                    } else if (act === 'climbLedge') {
                        yRef.current += LEDGE_CLIMB_SPEED * dt;
                        // The edge may have moved while it was climbing.
                        xRef.current =
                            ledgeSideRef.current === -1 ? live.left : live.right;
                        // Paws on the window, body outside it. It may have
                        // walked to this edge from underneath the window, in
                        // which case it was facing away; the old face sprite
                        // hid that, a body with legs does not.
                        facingRef.current = (ledgeSideRef.current === -1 ? 1 : -1) as 1 | -1;
                        lastMoveRef.current = now;
                        if (yRef.current >= live.y) {
                            yRef.current = live.y;
                            // Step onto the surface rather than balancing on
                            // the corner.
                            xRef.current =
                                ledgeSideRef.current === -1 ? lo : hi;
                            ledgeTargetRef.current =
                                lo + Math.random() * Math.max(1, hi - lo);
                            setActivityBoth('onLedge');
                            lastBehaviourRef.current = 'climbToLedge';
                            notePetMoment('climbed');
                            const p = petRef.current;
                            if (p) say(randomLine(p.ledgeLines));
                        }
                    } else {
                        // Standing on it. Pinned to the surface so a window
                        // dragged upward lifts the creature too.
                        yRef.current = live.y;
                        xRef.current = Math.max(lo, Math.min(hi, xRef.current));

                        if (act === 'ledgeSit') {
                            if (now > phaseUntilRef.current) {
                                ledgeTargetRef.current =
                                    lo + Math.random() * Math.max(1, hi - lo);
                                setActivityBoth('onLedge');
                            }
                        } else {
                            const dist = ledgeTargetRef.current - xRef.current;
                            if (Math.abs(dist) < 3) {
                                // Arrived at its wander target. What happens
                                // next is the table's business too, which is
                                // how leaping to another window became
                                // possible without touching this branch.
                                const next = pickBehaviour(
                                    readEnv(),
                                    lastBehaviourRef.current
                                );
                                if (next) enterBehaviour(next);
                                else enterBehaviour('walkLedge');
                            } else {
                                const dir = (Math.sign(dist) || 1) as 1 | -1;
                                facingRef.current = dir;
                                xRef.current += dir * WALK_SPEED * feelOf(petRef.current?.id).pace * dt;
                                lastMoveRef.current = now;
                                stepsRef.current += Math.abs(
                                    dir * WALK_SPEED * dt
                                );
                            }
                        }
                    }
                }
            } else if (reduced || stayRef.current) {
                // Motion off, or told to stay: hold position, but still
                // wake and sleep so the creature isn't inertly identical
                // forever.
                if (act !== 'sleeping' && now - lastMoveRef.current > sleepAfterMs()) {
                    setActivityBoth('sleeping');
                } else if (act !== 'sleeping') {
                    setActivityBoth('idle');
                }
            } else {
                const pointerX = pointerXRef.current;
                if (pointerX !== null) {
                    const clamped = Math.max(min, Math.min(max, pointerX));
                    const dist = clamped - xRef.current;
                    /*
                     * The cat hunts it. It creeps to within a short leap,
                     * holds there with its back end wiggling, waits for the
                     * pointer to go still — that is the cue every cat waits
                     * for — and pounces. The dog and the others just come.
                     */
                    const hunter = petRef.current?.id === 'static';
                    const holdOff = hunter ? size * 1.25 : CATCH_DISTANCE;
                    // Landed on it, or close enough: caught. Sit with it.
                    const caught = hunter && Math.abs(dist) <= size * 0.35;
                    if (caught) {
                        herdingRef.current = false;
                        setActivityBoth('idle');
                        idleUntilRef.current = Math.max(idleUntilRef.current, now + 900);
                    } else if (
                        hunter &&
                        Math.abs(dist) < size * 1.75 &&
                        Math.abs(dist) > size * 0.3 &&
                        now > nextPounceRef.current &&
                        now - pointerMovedAtRef.current > 340
                    ) {
                        const dir = (Math.sign(dist) || 1) as 1 | -1;
                        facingRef.current = dir;
                        const T = 0.42;
                        vxRef.current = dist / T;
                        vyRef.current = 0.5 * GRAVITY * T;
                        spinRef.current = 0;
                        nextPounceRef.current = now + 3600 + Math.random() * 3000;
                        playPetLift();
                        setActivityBoth('pouncing');
                    } else if (
                        petRef.current?.id === 'modem' &&
                        Math.abs(dist) < size * 2.6 &&
                        now - pointerMovedAtRef.current > 450
                    ) {
                        // The collie's eye: when the thing it is herding
                        // stops, it drops into a crouch and holds, staring,
                        // ready to go the moment it moves again.
                        if (!herdingRef.current) herdingSinceRef.current = now;
                        herdingRef.current = true;
                        setActivityBoth('chasing');
                        facingRef.current = (Math.sign(dist) || facingRef.current) as 1 | -1;
                        lastMoveRef.current = now;
                    } else if (Math.abs(dist) > holdOff) {
                        herdingRef.current = false;
                        setActivityBoth('chasing');
                        const dir = Math.sign(dist) as 1 | -1;
                        facingRef.current = dir;
                        xRef.current +=
                            dir *
                            CHASE_SPEED *
                            (hunter ? 0.42 : 1) *
                            feelOf(petRef.current?.id).pace *
                            dt;
                        lastMoveRef.current = now;
                    } else if (hunter) {
                        // In range: crouched and still, waiting.
                        setActivityBoth('chasing');
                        facingRef.current = (Math.sign(dist) || facingRef.current) as 1 | -1;
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
                        xRef.current += dir * WALK_SPEED * feelOf(petRef.current?.id).pace * dt;
                        lastMoveRef.current = now;
                    }
                } else {
                    // idle or sleeping
                    if (act === 'sleeping' && now > wakeAtRef.current) {
                        // Slept it off. Waking resets the idle clock, which is
                        // the thing that was missing: without it the sleep
                        // condition below is true again on the very next frame.
                        lastMoveRef.current = now;
                        idleUntilRef.current = now + 600 + Math.random() * 1200;
                        poseRef.current = 'none';
                        setActivityBoth('idle');
                    } else if (
                        act !== 'sleeping' &&
                        now - lastMoveRef.current > sleepAfterMs()
                    ) {
                        notePetMoment('napped');
                        // A nap, not a coma.
                        wakeAtRef.current = now + 24_000 + Math.random() * 46_000;
                        setActivityBoth('sleeping');
                    } else if (act !== 'sleeping' && now > idleUntilRef.current) {
                        // Hand the decision to the table. See
                        // `petBehaviour.ts` — this used to be an if-ladder
                        // whose second branch had a real probability of
                        // 0.45 x 0.5 that was written down nowhere.
                        const next = pickBehaviour(
                            readEnv(),
                            lastBehaviourRef.current
                        );
                        if (next) enterBehaviour(next);
                        else enterBehaviour('walkFloor');
                    }
                }
            }

            // --- small business, layered on top of standing still --------
            if (poseRef.current !== 'none' && now > poseUntilRef.current) {
                poseRef.current = 'none';
            }
            // Watching you type outranks the idle fidgets — a creature that
            // stops to scratch itself halfway through noticing something is
            // not noticing anything.
            const watching =
                !reduced &&
                now < typingUntilRef.current &&
                (activityRef.current === 'idle' ||
                    activityRef.current === 'walking');
            if (watching) {
                if (poseRef.current !== 'watch') poseFromRef.current = now;
                poseRef.current = 'watch';
                poseUntilRef.current = typingUntilRef.current;
                lastMoveRef.current = now;
            } else if (poseRef.current === 'watch') {
                poseRef.current = 'none';
            }
            if (
                !reduced &&
                !watching &&
                activityRef.current === 'idle' &&
                poseRef.current === 'none' &&
                now > nextPoseRef.current
            ) {
                const [pose, ms] = pickPose(petRef.current?.id);
                poseRef.current = pose;
                poseFromRef.current = now;
                poseUntilRef.current = now + ms;
                nextPoseRef.current = now + ms + 2600 + Math.random() * 5000;
                if (pose === 'stretch' || pose === 'scratch') {
                    // A stretch counts as being awake, so a fidgeting pet
                    // doesn't drop straight into a nap mid-stretch.
                    lastMoveRef.current = now - SLEEP_AFTER_MS * 0.6;
                }
            }

            // --- clamp and paint ----------------------------------------
            if (wallRef.current === 0) {
                xRef.current = Math.max(hard.min, Math.min(hard.max, xRef.current));
            } else {
                xRef.current = Math.max(0, Math.min(layerWidth(), xRef.current));
            }
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

            // --- the bowl ------------------------------------------------
            // Full bowls are eaten from and then taken away; an empty one
            // appears when the animal gets hungry and stays until it isn't.
            const bw = bowlRef.current;
            if (now > nextMoodCheck) {
                nextMoodCheck = now + 500;
                const mood = computeMood();
                hungryNow = mood === 'hungry' || mood === 'starving';
            }
            if (bw && bw.full && now > bw.until) {
                bowlRef.current = null;
                setBowl('none');
            } else if (bw && !bw.full && !hungryNow) {
                bowlRef.current = null;
                setBowl('none');
            } else if (
                !bw &&
                hungryNow &&
                !ledgeRef.current &&
                yRef.current < 2 &&
                (activityRef.current === 'idle' || activityRef.current === 'walking')
            ) {
                const side = facingRef.current;
                bowlRef.current = {
                    x: Math.max(min, Math.min(max, xRef.current + side * size * 0.8)),
                    full: false,
                    until: Infinity,
                };
                setBowl('empty');
            }
            const bowlEl = bowlElRef.current;
            if (bowlEl && bowlRef.current) {
                bowlEl.style.left = `${Math.round(bowlRef.current.x)}px`;
                bowlEl.style.opacity =
                    bowlRef.current.full && now > bowlRef.current.until - 500
                        ? String(Math.max(0, (bowlRef.current.until - now) / 500))
                        : '1';
            }

            const el = elRef.current;
            if (el) {
                el.style.left = `${Math.round(xRef.current)}px`;
                el.style.bottom = `${Math.round(FOOT + yRef.current)}px`;
            }

            /* --- the animal ----------------------------------------------
             * Which clip, from what it is doing; a pose, from the animator;
             * and at most thirty times a second, the pixels. Position moves
             * every frame — only the drawing is rate-limited — so motion
             * across the screen stays smooth while the sprite keeps the
             * cadence of hand-drawn animation.
             */
            const act2 = activityRef.current;
            const kind = (petRef.current?.id ?? 'modem') as PetKind;
            const movedNow =
                Math.abs(xRef.current - wasX) +
                (act2 === 'climbing' || act2 === 'climbLedge'
                    ? Math.abs(yRef.current - wasY)
                    : 0);
            const begging =
                hungryNow &&
                !!bowlRef.current &&
                !bowlRef.current.full &&
                act2 === 'idle' &&
                Math.abs(xRef.current - bowlRef.current.x) < size * 1.1;
            if (act2 !== 'chasing') herdingRef.current = false;
            const clip: Clip = begging
                ? 'sit'
                : act2 === 'chasing' && herdingRef.current
                ? // Held long enough, the crouch becomes a down — still
                  // facing it, still watching.
                  now - herdingSinceRef.current > 5000
                    ? 'lie'
                    : 'stalk'
                : clipFor(kind, act2, reactionRef.current, poseRef.current, movedNow > 0.05);

            // Small ambient business that belongs to one animal each.
            if (now > nextAmbientRef.current && !reduced) {
                if (kind === 'glitch' && (act2 === 'idle' || act2 === 'walking')) {
                    glitchUntilRef.current = now + 160 + Math.random() * 200;
                    nextAmbientRef.current = now + 9000 + Math.random() * 16000;
                } else if (kind === 'pixel' && act2 !== 'gone' && act2 !== 'peeking') {
                    burst('bubble', 1);
                    nextAmbientRef.current = now + 4500 + Math.random() * 6000;
                } else {
                    nextAmbientRef.current = now + 5000;
                }
            }
            // Chasing its tail is a lot of turning round.
            if (poseRef.current === 'tailChase' && act2 === 'idle' && !reduced) {
                const turn = Math.floor(now / 330) % 2 === 0 ? 1 : -1;
                facingRef.current = turn as 1 | -1;
            }
            const phaseMs = Math.max(1, phaseLengthRef.current);
            const phase = Math.min(
                1,
                Math.max(0, (now - phaseFromRef.current) / phaseMs)
            );
            // What it is looking at, relative to its own head. A hungry
            // animal by its bowl looks at *you*.
            let look: { dx: number; dy: number } | null = null;
            if (begging) {
                look = { dx: 0, dy: 80 };
            } else if (lookRef.current) {
                look = {
                    dx: lookRef.current.x - (xRef.current + headAtRef.current.x),
                    dy: lookRef.current.y - (FOOT + yRef.current + headAtRef.current.y),
                };
            }
            const stroked = now < strokeRef.current.until;
            chargeRef.current = Math.max(0, chargeRef.current - dt * 0.12);

            let anim = animatorRef.current;
            if (!anim || anim.kind !== kind) {
                anim = new Animator(kind);
                animatorRef.current = anim;
            }
            {
                const pose = anim.update(now, {
                    clip,
                    p: phase,
                    len: phaseMs,
                    moved: movedNow,
                    speed: movedNow / Math.max(dt, 1 / 240),
                    vy: vyRef.current,
                    spin: spinRef.current,
                    squash: squashRef.current,
                    facing: facingRef.current,
                    look,
                    alarm: clip === 'worry' || clip === 'speechless',
                    happy: stroked,
                    reduced: !!reduced,
                });
                if (now - lastDrawRef.current >= drawEvery) {
                    const since = Math.min(0.1, (now - lastDrawRef.current) / 1000);
                    lastDrawRef.current = now;
                    const t0 = performance.now();
                    paint(pose, kind, now, since);
                    paintCost = paintCost * 0.9 + (performance.now() - t0) * 0.1;
                    drawEvery = paintCost > 4 ? 1000 / 20 : DRAW_EVERY_MS;
                }
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
                // The fish is always a little way above its shadow.
                const base = kind === 'pixel' ? 0.15 : 0.26;
                shadow.style.left = `${Math.round(xRef.current - width / 2)}px`;
                shadow.style.width = `${Math.round(width)}px`;
                shadow.style.opacity = String(offBar ? 0 : base - lift * (base - 0.06));
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
            window.removeEventListener('keydown', onKey, { capture: true });
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
            y: (rect.bottom - clientY) / scale - FOOT,
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

    /**
     * Stroking: the pointer moving back and forth across the animal with no
     * button held. A couple of reversals over a short stretch counts; it
     * keeps counting for as long as the hand keeps moving, and pays out as
     * a pat every few seconds rather than on every pass.
     *
     * Static keeps a running charge while it happens. Stroke her long
     * enough and it discharges — a crackle, a flinch, and she walks off.
     */
    const onStroke = (clientX: number) => {
        const p = petRef.current;
        if (!p) return;
        const act = activityRef.current;
        if (
            act === 'held' ||
            act === 'falling' ||
            act === 'pouncing' ||
            act === 'gone' ||
            act === 'peeking' ||
            act === 'climbing' ||
            act === 'climbLedge'
        ) {
            return;
        }
        const st = strokeRef.current;
        const now = performance.now();
        if (now - st.last > 420) {
            st.travel = 0;
            st.flips = 0;
            st.dir = 0;
            st.lastX = clientX;
        }
        const dx = clientX - st.lastX;
        st.lastX = clientX;
        st.last = now;
        if (Math.abs(dx) < 1) return;
        const dir = Math.sign(dx);
        if (st.dir !== 0 && dir !== st.dir) st.flips++;
        st.dir = dir;
        st.travel += Math.abs(dx);
        if (p.id === 'static') {
            chargeRef.current = Math.min(1.1, chargeRef.current + Math.abs(dx) * 0.0011);
        }
        if (st.travel < STROKE_TRAVEL || st.flips < 1) return;

        st.until = now + 650;
        lastMoveRef.current = now;

        if (p.id === 'static' && chargeRef.current >= 1) {
            dischargeStatic();
            return;
        }
        if (now < st.nextPat) return;
        st.nextPat = now + STROKE_PAT_EVERY_MS;
        if (act === 'sleeping' || act === 'wallNap') {
            // A stroke wakes it gently, without the startle of a poke.
            react('happy', 600);
            say(randomLine(p.wakeLines));
            return;
        }
        strokingPatRef.current = true;
        pettPet();
        strokingPatRef.current = false;
    };

    /** Static, discharged. */
    const dischargeStatic = () => {
        const p = petRef.current;
        if (!p) return;
        chargeRef.current = 0;
        strokeRef.current.until = 0;
        strokeRef.current.nextPat = performance.now() + 4000;
        burst('spark', 4);
        playPetZap();
        // Away from the hand, briskly, and not looking back.
        const { min, max } = walkBounds(spriteRef.current);
        const away = -facingRef.current * spriteRef.current * (2.4 + Math.random());
        targetRef.current = Math.max(min, Math.min(max, xRef.current + away));
        phaseUntilRef.current = 0;
        setActivityBoth('walking');
        if (p.dischargeLines) say(randomLine(p.dischargeLines));
    };

    const onSpriteMove = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        if (!drag?.active || drag.pointerId !== e.pointerId) {
            if (e.pointerType !== 'touch' && e.buttons === 0) onStroke(e.clientX);
            return;
        }
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
         * runs from 0 at the creature's feet down to -FOOT at the last row
         * of pixels, so a cutoff of -4 — which is what this was — meant that
         * putting the animal down anywhere on the lower three quarters of the
         * taskbar dropped it out of the world. That is where people put it
         * down. It has to be the bottom dozen pixels, so that leaving is
         * something you did rather than something that happened.
         */
        despawningRef.current = yRef.current < -(FOOT - 12);
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

    // The buffer is sized for the creature's scale and only rebuilt when that
    // changes; the ImageData is a view onto it, so drawing needs no copy.
    const frame = useMemo(() => frameFor(achievements.scale), [achievements.scale]);
    if (frameRef.current !== frame) {
        frameRef.current = frame;
        imageRef.current =
            typeof ImageData !== 'undefined'
                ? new ImageData(new Uint8ClampedArray(frame.px.buffer), frame.w, frame.h)
                : null;
        lastDrawRef.current = 0;
    }
    // The sunglasses are the whole point of the "cool" performance, so they
    // go on for its duration whether or not they have been unlocked yet —
    // which is also how you find out they exist.
    wornRef.current = reaction === 'cool' ? 'shades' : achievements.equipped;

    if (!pet || suspended || state.hidden) return null;

    const mood = computeMood(state);
    const hungry = mood === 'hungry' || mood === 'starving';
    const asleep = activity === 'sleeping' || activity === 'wallNap';
    const away = activity === 'gone' || activity === 'peeking';
    const star = currentStar();
    const wardrobe = unlockedAccessories();

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

    const [ox, oy] = originOf(frame);
    /** Pixel size for the particles and props: whole pixels, never fractions. */
    const px = Math.max(1, Math.round(achievements.scale));
    const toyArt = pixelSprite(TOY_SPRITE[pet.id] ?? 'ball', px);
    const treatArt = pixelSprite(TREAT_SPRITE[pet.id] ?? 'biscuit', px);
    const bowlArt = pixelSprite(bowl === 'full' ? 'bowlFull' : 'bowlEmpty', px);

    return (
        <div ref={layerRef} style={styles.layer}>
            <div ref={shadowRef} style={styles.shadow} aria-hidden="true" />

            {bowl !== 'none' && (
                <div
                    ref={bowlElRef}
                    style={{
                        ...styles.bowl,
                        bottom: FOOT - 1,
                        marginLeft: -bowlArt.w / 2,
                        cursor: bowl === 'empty' ? 'pointer' : 'default',
                        pointerEvents: bowl === 'empty' ? 'auto' : 'none',
                    }}
                    title={bowl === 'empty' ? `Feed ${pet.name}` : undefined}
                    onClick={() => {
                        if (bowl !== 'empty') return;
                        playClick();
                        feedPet();
                    }}
                >
                    <img
                        src={bowlArt.url}
                        width={bowlArt.w}
                        height={bowlArt.h}
                        alt=""
                        draggable={false}
                        style={styles.pixelated}
                    />
                </div>
            )}

            {/* The toy and the treat sit behind the creature, so a carried
                ball reads as being in front of its face rather than in it. */}
            {hasToy && (
                <div
                    ref={toyElRef}
                    style={{ ...styles.prop, width: toyArt.w, height: toyArt.h }}
                    aria-hidden="true"
                >
                    <img src={toyArt.url} width={toyArt.w} height={toyArt.h} alt="" style={styles.pixelated} />
                </div>
            )}
            {hasTreat && (
                <div
                    ref={treatElRef}
                    style={{ ...styles.prop, width: treatArt.w, height: treatArt.h }}
                    aria-hidden="true"
                >
                    <img src={treatArt.url} width={treatArt.w} height={treatArt.h} alt="" style={styles.pixelated} />
                </div>
            )}

            <div
                ref={elRef}
                style={{
                    ...styles.pet,
                    left: Math.round(xRef.current),
                    bottom: FOOT,
                }}
            >
                {/* The animal, painted every frame by `pet/render.ts`. One
                    art pixel to one screen pixel, the density of every icon
                    on the desktop. */}
                <canvas
                    ref={canvasRef}
                    width={frame.w}
                    height={frame.h}
                    style={{
                        ...styles.canvas,
                        left: -ox,
                        top: -oy,
                        width: frame.w,
                        height: frame.h,
                    }}
                    aria-hidden="true"
                />

                {/* The little grey button the `press` performance presses.
                    It only exists for the second the creature is pressing it,
                    which is the joke. */}
                {reaction === 'press' && (
                    <span
                        style={{
                            ...styles.startButton,
                            left: facingRef.current * sprite * 0.62 - 16,
                        }}
                        aria-hidden="true"
                    >
                        Start
                    </span>
                )}

                {/* Fitted to the drawn pixels every frame — see `paint`. */}
                <div
                    ref={hitRef}
                    style={styles.hit}
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
                    }, stroke with the pointer, double-click for a trick, drag to pick up, right-click for more`}
                />

                {/* The speech bubble, over the top of whatever was drawn. */}
                <div ref={bubbleElRef} style={styles.headAnchor}>
                    {bubble && !away && (
                        <div ref={bubbleBoxRef} style={styles.bubble}>
                            {bubble}
                            <span
                                ref={bubbleTailRef}
                                style={styles.bubbleTail}
                                aria-hidden="true"
                            />
                        </div>
                    )}
                </div>

                {/* Everything that belongs to the head itself: particles,
                    sleep, and the achievement star. */}
                <div ref={headElRef} style={styles.headAnchor}>

                    {particles.map((p) => {
                        const art = pixelSprite(p.sprite, px);
                        return (
                            <img
                                key={p.id}
                                src={art.url}
                                width={art.w}
                                height={art.h}
                                alt=""
                                className={`pet-particle pet-particle-${p.kind}`}
                                style={
                                    {
                                        animationDelay: `${p.delay}ms`,
                                        ['--pet-dx' as string]: `${p.dx}px`,
                                    } as React.CSSProperties
                                }
                                aria-hidden="true"
                            />
                        );
                    })}

                    {/* Sleep accumulates: one z is a state, three rising z's
                        is a creature that has been under for a while. */}
                    {asleep &&
                        Array.from({ length: sleepDepth }, (_, i) => {
                            const art = pixelSprite('zed', px);
                            return (
                                <img
                                    key={i}
                                    src={art.url}
                                    width={art.w}
                                    height={art.h}
                                    alt=""
                                    className="pet-zzz"
                                    style={{
                                        ...styles.zzz,
                                        animationDelay: `${i * 0.7}s`,
                                    }}
                                    aria-hidden="true"
                                />
                            );
                        })}

                    {/* Ten seconds of gold, then it's gone. Clicking the
                        animal while it is up opens the list. */}
                    {star && (
                        <img
                            src={pixelSprite('star', px).url}
                            alt=""
                            className="pet-star"
                            style={styles.star}
                            title={`${star.name} — click to see it`}
                            aria-hidden="true"
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

/**
 * The window ledge a falling creature just passed through, if any.
 *
 * `prevY` is where it was last frame and `y` is where it is now; a landing is
 * a downward crossing of a ledge's surface while horizontally over it. The
 * small tolerance on the surface stops a creature that is already standing on
 * a ledge from re-landing on it every frame.
 */
function landingLedge(
    x: number,
    y: number,
    prevY: number,
    sprite: number
): Ledge | null {
    const all = surveyLedges();
    let best: Ledge | null = null;
    for (const l of all) {
        if (l.y <= 0) continue; // the taskbar has its own branch
        if (prevY < l.y - 1) continue; // was already below it
        if (y > l.y) continue; // has not reached it yet
        if (!xOverLedge(l, x, -sprite * 0.25)) continue;
        if (!best || l.y > best.y) best = l; // the highest one it met first
    }
    return best;
}

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
    el.style.left = `${Math.round(p.x - el.offsetWidth / 2)}px`;
    el.style.bottom = `${Math.round(FOOT + p.y)}px`;
    // A ball rolls, so its spin follows the ground it has covered. A biscuit
    // is not a wheel and falls flat.
    if (rolls) el.style.transform = `rotate(${Math.round(p.x * 6)}deg)`;
    el.style.opacity =
        p.doneAt && now > p.doneAt - 700
            ? String(Math.max(0, (p.doneAt - now) / 700))
            : '1';
}

/* -------------------------------------------------------------------------
 * The idle repertoire
 * ----------------------------------------------------------------------
 * What the animal does while standing about. The poses themselves — what a
 * groom or a stretch actually looks like for a collie as opposed to a cat —
 * live in `pet/animate.ts`; this decides only which one, and how often.
 */

/**
 * The idle repertoire, as a weighted table.
 *
 * Shimeji picks behaviours by `Frequency` out of a gated pool rather than by
 * an if-ladder of `Math.random()` thresholds, and the difference matters once
 * there are more than about four of them: weights can be read and retuned at a
 * glance, and adding one does not mean recalculating every threshold after it.
 *
 * The weights are roughly "how often would an animal actually do this". A
 * blink is constant; chasing your own tail is not.
 */
const POSE_TABLE: { pose: PetPose; weight: number; ms: [number, number] }[] = [
    { pose: 'blink', weight: 30, ms: [160, 220] },
    { pose: 'sniff', weight: 16, ms: [900, 1600] },
    { pose: 'stretch', weight: 14, ms: [800, 1100] },
    { pose: 'scratch', weight: 13, ms: [700, 1100] },
    { pose: 'sit', weight: 12, ms: [2000, 4000] },
    { pose: 'groom', weight: 11, ms: [1400, 2600] },
    { pose: 'yawn', weight: 9, ms: [1100, 1400] },
    { pose: 'ponder', weight: 8, ms: [1800, 3200] },
    { pose: 'lie', weight: 7, ms: [3500, 7000] },
    { pose: 'dig', weight: 5, ms: [1100, 1900] },
    { pose: 'dance', weight: 4, ms: [2200, 3400] },
    { pose: 'tailChase', weight: 3, ms: [1300, 2000] },
];

/**
 * Each species' own habits, as multipliers on the table above.
 *
 * Four animals with one shared list of fidgets is four costumes. A cat
 * washes far more than a dog and almost never chases its tail; a stoat
 * spends half its life up on its hind legs looking about; a betta flares.
 * Anything not listed keeps its weight.
 */
const HABITS: Record<string, Partial<Record<PetPose, number>>> = {
    modem: { dig: 1.4, tailChase: 1.3, groom: 0.6 },
    static: { groom: 2.2, stretch: 1.4, lie: 1.6, dance: 1.5, tailChase: 0.15, dig: 0.3, sniff: 0.7 },
    glitch: { perk: 3.2, dance: 1.6, sniff: 1.5, tailChase: 1.2, lie: 0.6, groom: 0.7 },
    pixel: { perk: 1.6, stretch: 1.6, scratch: 0.3, dig: 0.5, tailChase: 0.6, groom: 0.5 },
};

function pickPose(species?: string): [PetPose, number] {
    const habits = (species && HABITS[species]) || {};
    const weight = (e: (typeof POSE_TABLE)[number]) => e.weight * (habits[e.pose] ?? 1);
    const total = POSE_TABLE.reduce((n, e) => n + weight(e), 0);
    let roll = Math.random() * total;
    for (const entry of POSE_TABLE) {
        roll -= weight(entry);
        if (roll <= 0) {
            const [lo, hi] = entry.ms;
            return [entry.pose, lo + Math.random() * (hi - lo)];
        }
    }
    return ['blink', 180];
}

/**
 * Which clip shows what the creature is doing.
 *
 * The behaviour engine above thinks in activities — walking to a wall,
 * being thrown, performing one of the seven reactions — and the animator in
 * `pet/animate.ts` thinks in clips. This is the whole of the translation.
 * Several activities share a clip (anything purposeful trots; anything
 * airborne tumbles), and the idle fidgets map one to one.
 */
function clipFor(
    kind: PetKind,
    activity: PetActivity,
    reaction: PetReaction | null,
    pose: PetPose,
    moving: boolean
): Clip {
    switch (activity) {
        case 'walking':
            return moving ? 'walk' : 'stand';
        case 'chasing':
            // The cat stalks; everybody else simply comes over.
            return kind === 'static' ? 'stalk' : moving ? 'trot' : 'stand';
        case 'fetching':
        case 'returning':
        case 'foraging':
            return moving ? 'run' : 'stand';
        case 'toWall':
        case 'toLedge':
            return moving ? 'trot' : 'stand';
        case 'onLedge':
            return moving ? 'walk' : 'stand';
        case 'climbing':
        case 'climbLedge':
            return 'climb';
        case 'wallHang':
            return 'cling';
        case 'wallNap':
            return 'clingNap';
        case 'ledgeSit':
            return 'ledgeSit';
        case 'sleeping':
            return 'sleep';
        case 'happy':
            return 'hop';
        case 'eating':
            return 'eat';
        case 'trick':
            return 'trick';
        case 'dizzy':
            return 'dizzy';
        case 'held':
            return 'dangle';
        case 'falling':
            return 'tumble';
        case 'pouncing':
            return 'pounce';
        case 'gone':
            return 'stand';
        case 'peeking':
            return 'perk';
        case 'reacting':
            return reaction ?? 'stand';
        default:
            switch (pose) {
                case 'none':
                case 'blink':
                    return 'stand';
                default:
                    return pose;
            }
    }
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
    /** Zero-size: its top-left corner *is* the point between the feet. */
    pet: {
        position: 'absolute',
        width: 0,
        height: 0,
    },
    canvas: {
        position: 'absolute',
        imageRendering: 'pixelated',
        pointerEvents: 'none',
    },
    /** The one thing on this layer that accepts a click. Sized every frame. */
    hit: {
        position: 'absolute',
        left: -16,
        top: -32,
        width: 32,
        height: 32,
        cursor: 'grab',
        pointerEvents: 'auto',
        userSelect: 'none',
        touchAction: 'none',
        outline: 'none',
    },
    /** Follows the head; zero-size, like the feet anchor. */
    headAnchor: {
        position: 'absolute',
        width: 0,
        height: 0,
        pointerEvents: 'none',
    },
    pixelated: {
        imageRendering: 'pixelated',
        display: 'block',
    },
    /**
     * A Windows 95 balloon tip: tooltip yellow, a hard one-pixel border, and
     * a little tail pointing down at whoever is talking.
     */
    bubble: {
        position: 'absolute',
        bottom: 10,
        left: 0,
        marginLeft: -96,
        width: 192,
        padding: '5px 8px',
        background: '#ffffe1',
        border: '1px solid #000',
        boxShadow: '2px 2px 0 rgba(0,0,0,0.25)',
        fontFamily: 'MSSerif',
        fontSize: 10,
        lineHeight: 1.4,
        color: '#000',
        textAlign: 'center',
        pointerEvents: 'none',
        boxSizing: 'border-box',
    },
    bubbleTail: {
        position: 'absolute',
        left: 90,
        bottom: -7,
        width: 10,
        height: 7,
        background: '#ffffe1',
        clipPath: 'polygon(0 0, 100% 0, 30% 100%)',
        filter: 'drop-shadow(0 1px 0 #000)',
    },
    zzz: {
        position: 'absolute',
        top: -10,
        left: 4,
        pointerEvents: 'none',
        imageRendering: 'pixelated',
    },
    star: {
        position: 'absolute',
        top: -20,
        left: -4,
        imageRendering: 'pixelated',
        filter: 'drop-shadow(0 0 2px rgba(255,204,34,0.85))',
        pointerEvents: 'none',
    },
    startButton: {
        position: 'absolute',
        bottom: 0,
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
        bottom: FOOT - 3,
        height: 4,
        borderRadius: '50%',
        background: '#000',
        opacity: 0.26,
        pointerEvents: 'none',
    },
    /** A toy or a treat: a little bitmap that falls, rolls and is carried. */
    prop: {
        position: 'absolute',
        pointerEvents: 'none',
    },
    bowl: {
        position: 'absolute',
        transition: 'opacity 200ms linear',
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
