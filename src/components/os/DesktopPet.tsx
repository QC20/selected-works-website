import React, { useCallback, useEffect, useRef, useState } from 'react';
import getIconByName from '../../assets/icons';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import { openAppGlobal } from './appBridge';
import { TASKBAR_HEIGHT } from './metrics';
import {
    PET_LIST,
    PetDef,
    PetEvent,
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
import { getResolutionScale } from './resolution';
import {
    playClick,
    playPetBump,
    playPetHappy,
    playPetLift,
    playPetTreat,
    playPetVoice,
} from './sounds';

/**
 * The pet, out of the tray and onto the taskbar.
 * ------------------------------------------------
 * This is the screen-mate idea — Neko (1989), and every sheep, cat and dog
 * that wandered across a desktop after it: a small creature that lives *on*
 * the workspace rather than inside a window, notices the pointer, and can be
 * poked. The behaviour here is written from scratch for this desktop's own
 * four animals; nothing is lifted from oneko or its descendants.
 *
 * What you can do with it
 * -----------------------
 *   Click       pat it, or feed it if it's hungry — and wake it if asleep.
 *   Double-click ask for its trick: a spin, a roll, a slow blink.
 *   Drag        pick it up. It dangles from the pointer, anywhere on screen.
 *   Throw       let go while moving and it flies, bounces off the walls,
 *               lands, and is briefly too dizzy to walk straight.
 *   Right-click the full menu: feed, pat, fetch, trick, treat, sit, nap,
 *               open its window, or send it away for the rest of the visit.
 *   Hover       it perks up and looks at you.
 *   Leave it    it wanders, sits, stretches, scratches, and eventually sleeps.
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
 *   thing walking along a ledge reads as deliberate rather than as a bug. It
 *   only leaves the bar when you personally pick it up and throw it, and it
 *   walks back to its own patch afterwards.
 *
 *   It never blocks anything.  The layer is `pointer-events: none` except
 *   for the sprite itself and its right-click menu, and its walking range is
 *   the taskbar's empty middle, clear of the Start button and the tray.
 *
 *   It obeys `prefers-reduced-motion`.  A visitor who asked their OS to stop
 *   things moving gets a pet that no longer wanders, bobs or chases the
 *   pointer of its own accord — the ambient motion, which is the part that
 *   is hard to ignore, goes away. Things they deliberately ask for (a pat, a
 *   trick, dragging it across the screen) still animate, because a button
 *   that does nothing when pressed is worse than a moment of motion.
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
    /* errands, held until the creature reaches something */
    | 'fetching'
    | 'returning'
    | 'foraging'
    /* direct manipulation */
    | 'held'
    | 'falling';

/** Small extra bits of business layered on top of an idle stance. */
type PetPose = 'none' | 'blink' | 'stretch' | 'scratch' | 'sit' | 'perk';

/** Twice what it used to be. Big enough to read as a character rather than a
 *  cursor artefact, which is the whole reason the art was drawn at 32px. */
const SPRITE = 52;

/** Pixels per second. Slow enough to read as an amble, not a scuttle. */
const WALK_SPEED = 40;
const CHASE_SPEED = 92;
/** Chasing a thrown toy is the one time the creature really runs. */
const FETCH_SPEED = 165;
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
    kind: 'heart' | 'crumb' | 'sparkle' | 'star' | 'note';
    /** Horizontal drift, in px, handed to the CSS keyframes as `--dx`. */
    dx: number;
    delay: number;
    glyph: string;
}

let particleId = 0;

const DesktopPet: React.FC<{ suspended?: boolean }> = ({ suspended = false }) => {
    const state = usePetState();
    const pet: PetDef | undefined = state.species
        ? PET_LIST.find((p) => p.id === state.species)
        : undefined;

    const layerRef = useRef<HTMLDivElement | null>(null);
    const elRef = useRef<HTMLDivElement | null>(null);
    const bodyRef = useRef<HTMLDivElement | null>(null);
    const toyElRef = useRef<HTMLDivElement | null>(null);
    const treatElRef = useRef<HTMLDivElement | null>(null);
    const shadowRef = useRef<HTMLDivElement | null>(null);

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
    } | null>(null);

    const [activity, setActivity] = useState<PetActivity>('idle');
    const [bubble, setBubble] = useState<string | null>(null);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [hasToy, setHasToy] = useState(false);
    const [hasTreat, setHasTreat] = useState(false);
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
    const bubbleTimer = useRef<number | undefined>(undefined);
    /**
     * A single click is deferred by a fraction of a second so a *double*
     * click can cancel it. Without this, asking for a trick also delivers two
     * pats on the way — three reactions fighting over one animal.
     */
    const clickTimer = useRef<number | undefined>(undefined);

    // Pointer position, tracked only while it is over the taskbar strip.
    const pointerXRef = useRef<number | null>(null);

    // Suspending the pet (the 3D room, the shutdown dialog) unmounts it, and
    // a pending bubble or click would otherwise land on nothing.
    useEffect(
        () => () => {
            window.clearTimeout(bubbleTimer.current);
            window.clearTimeout(clickTimer.current);
        },
        []
    );

    const petRef = useRef<PetDef | undefined>(pet);
    petRef.current = pet;

    /* ------------------------------------------------------------------
     * Helpers shared by the pointer handlers, the menu and the event bus
     * --------------------------------------------------------------- */

    const setActivityBoth = useCallback((next: PetActivity) => {
        if (activityRef.current === next) return;
        activityRef.current = next;
        setActivity(next);
    }, []);

    const say = useCallback((text: string) => {
        setBubble(text);
        window.clearTimeout(bubbleTimer.current);
        bubbleTimer.current = window.setTimeout(() => setBubble(null), 3000);
    }, []);

    /** A short burst of whatever this moment calls for, cleaned up on a timer. */
    const burst = useCallback((kind: Particle['kind'], count: number) => {
        const glyphs: Record<Particle['kind'], string[]> = {
            heart: ['♥', '♥', '♡'],
            crumb: ['•', '·', '▪'],
            sparkle: ['✦', '✧', '+'],
            star: ['✶', '★', '✱'],
            note: ['♪', '♫'],
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
            setActivityBoth(next);
        },
        [setActivityBoth]
    );

    /* ------------------------------------------------------------------
     * Reacting to the rest of the desktop
     * ---------------------------------------------------------------
     * One subscription, four sources: the creature's own body, the tray
     * flyout, the Pet window and Clippy all end up here. Feeding from a
     * window and feeding by clicking the animal produce the same mouthful.
     */
    useEffect(() => {
        if (!pet || suspended) return;
        return onPetEvent((event: PetEvent) => {
            const p = petRef.current;
            if (!p) return;

            switch (event) {
                case 'fed':
                    react('eating', 1500);
                    burst('crumb', 5);
                    playPetVoice(p.id);
                    say(randomLine(p.feedLines));
                    break;

                case 'patted':
                    react('happy', 1100);
                    burst('heart', 3);
                    playPetVoice(p.id);
                    say(randomLine(p.petLines));
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
                    playPetVoice(p.id);
                    say(p.playLines[0] ?? '');
                    break;
                }

                case 'treat': {
                    // Dropped in from above at a random spot on the bar, so
                    // the creature has to go and find it.
                    const { min, max } = walkBounds();
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
                    playPetTreat();
                    say(`${p.treatName[0].toUpperCase()}${p.treatName.slice(1)} — ${p.name} has noticed.`);
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
            }
        });
    }, [pet, suspended, react, burst, say, setActivityBoth]);

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
            const { min, max } = walkBounds();
            const hard = hardBounds();
            const act = activityRef.current;

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

                if (yRef.current <= 0) {
                    const impact = Math.abs(vyRef.current);
                    yRef.current = 0;
                    if (impact > 150) {
                        // One bounce, then it stays down.
                        vyRef.current = impact * FLOOR_BOUNCE;
                        vxRef.current *= 0.6;
                        playPetBump();
                        squashRef.current = Math.min(1, impact / 900);
                    } else {
                        vyRef.current = 0;
                        vxRef.current = 0;
                        spinRef.current = 0;
                        squashRef.current = Math.min(1, impact / 500);
                        const p = petRef.current;
                        if (impact > DIZZY_SPEED || Math.abs(vxRef.current) > 300) {
                            react('dizzy', 1600);
                            burst('star', 4);
                        } else {
                            react('happy', 500);
                        }
                        if (p) say(randomLine(p.droppedLines));
                        lastMoveRef.current = now;
                    }
                }
            } else if (now < phaseUntilRef.current) {
                // A reaction is running (happy / eating / trick / dizzy).
                // Hold position and let the transform do the work.
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
            } else if (act === 'happy' || act === 'eating' || act === 'trick' || act === 'dizzy') {
                // The reaction just finished.
                spinRef.current = 0;
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
                        setActivityBoth('sleeping');
                    } else if (now > idleUntilRef.current) {
                        targetRef.current =
                            min + Math.random() * Math.max(1, max - min);
                        setActivityBoth('walking');
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
            yRef.current = Math.max(0, yRef.current);
            squashRef.current = Math.max(0, squashRef.current - dt * 3.2);

            const el = elRef.current;
            if (el) {
                el.style.left = `${Math.round(xRef.current - SPRITE / 2)}px`;
                el.style.bottom = `${Math.round(GROUND + yRef.current)}px`;
            }
            const body = bodyRef.current;
            if (body) {
                const t = transformFor(
                    activityRef.current,
                    poseRef.current,
                    facingRef.current,
                    now,
                    spinRef.current,
                    squashRef.current,
                    !!reduced
                );
                body.style.transform = t.transform;
                body.style.transformOrigin = t.origin;
            }
            // The contact shadow stays on the bar while the creature does
            // not, which is what makes a hop read as a hop and a throw read
            // as height rather than as the sprite simply getting smaller.
            const shadow = shadowRef.current;
            if (shadow) {
                const lift = Math.min(1, yRef.current / 160);
                const width = SPRITE * (0.62 - lift * 0.34);
                shadow.style.left = `${Math.round(xRef.current - width / 2)}px`;
                shadow.style.width = `${Math.round(width)}px`;
                shadow.style.opacity = String(
                    activityRef.current === 'held' ? 0 : 0.26 - lift * 0.2
                );
            }

            paintProjectile(toyElRef.current, toyRef.current, now, true);
            paintProjectile(treatElRef.current, treatRef.current, now, false);

            raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('pointermove', onPointerMove);
        };
    }, [pet, suspended, react, burst, say, setActivityBoth]);

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
            setActivityBoth('held');
            playPetLift();
            if (p) say(randomLine(p.heldLines));
        }
        if (!drag.moved) return;

        const local = toLocal(e.clientX, e.clientY);
        xRef.current = local.x;
        yRef.current = Math.max(0, local.y);
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
        setActivityBoth('falling');
    };

    /** A press that never became a drag: pat, feed, or wake. */
    const onSimpleClick = () => {
        const p = petRef.current;
        if (!p) return;
        playClick();

        if (activityRef.current === 'sleeping') {
            react('happy', 700);
            playPetVoice(p.id);
            say(randomLine(p.wakeLines));
            return;
        }

        const mood = computeMood();
        if (mood === 'hungry' || mood === 'starving') feedPet();
        else pettPet();
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
     * Render
     * --------------------------------------------------------------- */

    if (!pet || suspended || state.hidden) return null;

    const mood = computeMood(state);
    const hungry = mood === 'hungry' || mood === 'starving';
    const asleep = activity === 'sleeping';

    const menuItems: ContextMenuItem[] = [
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
                    lastMoveRef.current = performance.now() - SLEEP_AFTER_MS - 1;
                    phaseUntilRef.current = 0;
                    setActivityBoth('sleeping');
                }
            },
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
                    left: xRef.current - SPRITE / 2,
                    bottom: GROUND,
                }}
                aria-hidden="true"
            >
                {bubble && <div style={styles.bubble}>{bubble}</div>}

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
                    >
                        {p.glyph}
                    </span>
                ))}

                {asleep && (
                    <span style={styles.zzz} className="pet-zzz">
                        z
                    </span>
                )}
                {hungry && !asleep && activity !== 'held' && (
                    <span style={styles.hungerMark} title="Hungry">
                        !
                    </span>
                )}
                {activity === 'held' && <span style={styles.hungerMark}>!</span>}

                {/* The same art the tray and the Pet window use, so it is
                    recognisably one creature across all three — only larger,
                    and with the animation on a wrapper so the speech bubble
                    and the particles above don't spin along with it. */}
                <div ref={bodyRef} style={styles.body}>
                    <img
                        src={getIconByName(pet.icon) as unknown as string}
                        alt=""
                        width={SPRITE}
                        height={SPRITE}
                        draggable={false}
                        style={styles.sprite}
                        onPointerDown={onPointerDown}
                        onPointerMove={onSpriteMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                        onDoubleClick={onDoubleClick}
                        onPointerEnter={onEnter}
                        onContextMenu={onContextMenu}
                        title={`${pet.name} — click to ${
                            hungry ? 'feed' : 'pat'
                        }, double-click for a trick, drag to pick up, right-click for more`}
                    />
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
 * Both of these are read every frame, so they take their width from the
 * layer's own box rather than `window.innerWidth`: the whole desktop lives
 * inside a `transform: scale()` wrapper for the resolution setting, and the
 * viewport's width is the wrong number at every setting except 100%.
 */

const layerWidth = (): number => {
    const scale = getResolutionScale();
    return window.innerWidth / (scale || 1);
};

/** Where the creature will choose to walk of its own accord. */
const walkBounds = (): { min: number; max: number } => {
    const width = layerWidth();
    return {
        min: START_RESERVE + SPRITE / 2,
        max: Math.max(
            START_RESERVE + SPRITE,
            width - TRAY_RESERVE - SPRITE / 2
        ),
    };
};

/** Where it is physically allowed to be — wider, because a thrown pet is
 *  allowed to end up somewhere it would never have walked to. It ambles back
 *  into its own patch on its own within a few seconds. */
const hardBounds = (): { min: number; max: number } => {
    const width = layerWidth();
    return { min: SPRITE / 2, max: Math.max(SPRITE, width - SPRITE / 2) };
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
 * by real time — which is also why it scales to a 52px sprite without anyone
 * having to redraw anything.
 */

function pickPose(): [PetPose, number] {
    const roll = Math.random();
    if (roll < 0.34) return ['blink', 180];
    if (roll < 0.58) return ['stretch', 900];
    if (roll < 0.78) return ['scratch', 800];
    return ['sit', 2400];
}

function transformFor(
    activity: PetActivity,
    pose: PetPose,
    facing: 1 | -1,
    now: number,
    spin: number,
    squash: number,
    reduced: boolean
): { transform: string; origin: string } {
    let ty = 0;
    let rot = 0;
    let sx = 1;
    let sy = 1;
    let origin = '50% 100%';

    if (reduced && (activity === 'idle' || activity === 'walking' || activity === 'chasing')) {
        return { transform: `scaleX(${facing})`, origin };
    }

    switch (activity) {
        case 'walking':
        case 'chasing':
        case 'foraging': {
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
        transform: `translateY(${ty.toFixed(2)}px) rotate(${rot.toFixed(
            2
        )}deg) scale(${(sx * facing).toFixed(3)}, ${sy.toFixed(3)})`,
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
        width: SPRITE,
        height: SPRITE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        width: SPRITE,
        height: SPRITE,
        justifyContent: 'center',
        alignItems: 'center',
        willChange: 'transform',
        // A hard one-pixel shadow rather than a soft blur: at twice the old
        // size the creature regularly rises past the bottom edge of a window,
        // and an outline is what makes that read as standing in front of it
        // instead of as a drawing bug. Soft shadows look wrong on pixel art.
        filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.45))',
    },
    sprite: {
        width: SPRITE,
        height: SPRITE,
        imageRendering: 'pixelated',
        cursor: 'grab',
        // The one thing on this layer that accepts a click.
        pointerEvents: 'auto',
        userSelect: 'none',
        touchAction: 'none',
    },
    bubble: {
        position: 'absolute',
        bottom: SPRITE + 16,
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
        fontSize: 13,
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
        boxShadow: 'inset -2px -2px 0 rgba(0,0,0,0.22), inset 2px 2px 0 rgba(255,255,255,0.5)',
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
