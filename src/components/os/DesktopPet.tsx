import React, { useEffect, useRef, useState } from 'react';
import getIconByName from '../../assets/icons';
import { TASKBAR_HEIGHT } from './metrics';
import {
    PET_LIST,
    PetDef,
    computeMood,
    feedPet,
    pettPet,
    usePetState,
} from './pets';
import { playClick } from './sounds';

/**
 * The pet, out of the tray and onto the taskbar.
 * ------------------------------------------------
 * This is the screen-mate idea — Neko (1989), and every sheep, cat and dog
 * that wandered across a desktop after it: a small creature that lives *on*
 * the workspace rather than inside a window, notices the pointer, and can be
 * poked. The behaviour here is written from scratch for this desktop's own
 * four animals; nothing is lifted from oneko or its descendants.
 *
 * Three deliberate constraints, because a wandering sprite is exactly the
 * kind of feature that becomes intolerable on the second visit:
 *
 *   It walks the taskbar, not the whole screen.  A creature loose over the
 *   middle of the page would cross windows, steal clicks and land on top of
 *   text. The grey bar is dead space, it is always at a known height, and a
 *   thing walking along a ledge reads as deliberate rather than as a bug.
 *
 *   It never blocks anything.  The layer is `pointer-events: none` except
 *   for the sprite itself, and the sprite sits in the taskbar's own empty
 *   region to the left of the tray, so it cannot cover a tray icon or a
 *   window button.
 *
 *   It obeys `prefers-reduced-motion`.  A visitor who has asked their OS to
 *   stop things moving gets a pet that sits still and can still be petted,
 *   rather than one that is switched off entirely — the character stays, the
 *   motion goes.
 *
 * State machine: `walking` -> (reaches target) -> `idle` -> (timer) ->
 * `walking`, with `chasing` interrupting whenever the pointer is over the
 * taskbar, and `happy` as a brief reaction to being clicked. Position is kept
 * in a ref and written straight to `style.left`, so a walk cycle at 60fps
 * doesn't re-render React 60 times a second.
 */

type PetActivity = 'idle' | 'walking' | 'chasing' | 'happy' | 'sleeping';

const SPRITE = 26;
/** Pixels per second. Slow enough to read as an amble, not a scuttle. */
const WALK_SPEED = 34;
const CHASE_SPEED = 78;
/** How near the pointer counts as "caught". */
const CATCH_DISTANCE = 18;
/** Idle this long with no pointer nearby and the pet nods off. */
const SLEEP_AFTER_MS = 22_000;

/** Right-hand limit: the tray is roughly this wide, and the pet must never
 *  wander under it. Measured from the right edge of the window. */
const TRAY_RESERVE = 250;
/** Left-hand limit: clear of the Start button. */
const START_RESERVE = 96;

const DesktopPet: React.FC<{ suspended?: boolean }> = ({ suspended = false }) => {
    const state = usePetState();
    const pet: PetDef | undefined = state.species
        ? PET_LIST.find((p) => p.id === state.species)
        : undefined;

    const elRef = useRef<HTMLDivElement | null>(null);
    const xRef = useRef(START_RESERVE + 40);
    const targetRef = useRef(START_RESERVE + 40);
    const facingRef = useRef<1 | -1>(1);
    const activityRef = useRef<PetActivity>('idle');
    const lastMoveRef = useRef(performance.now());
    const idleUntilRef = useRef(0);

    const [activity, setActivity] = useState<PetActivity>('idle');
    const [bubble, setBubble] = useState<string | null>(null);

    // Pointer position, tracked only while it is over the taskbar strip.
    const pointerXRef = useRef<number | null>(null);

    useEffect(() => {
        if (!pet || suspended) return;

        const reduced = window.matchMedia?.(
            '(prefers-reduced-motion: reduce)'
        )?.matches;

        const bounds = () => ({
            min: START_RESERVE,
            max: Math.max(
                START_RESERVE + 40,
                window.innerWidth - TRAY_RESERVE
            ),
        });

        const onPointerMove = (e: PointerEvent) => {
            const overTaskbar = e.clientY > window.innerHeight - TASKBAR_HEIGHT - 6;
            pointerXRef.current = overTaskbar ? e.clientX : null;
        };
        window.addEventListener('pointermove', onPointerMove, { passive: true });

        let raf = 0;
        let last = performance.now();

        const setActivityBoth = (next: PetActivity) => {
            if (activityRef.current === next) return;
            activityRef.current = next;
            setActivity(next);
        };

        const tick = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const { min, max } = bounds();

            if (reduced) {
                // Motion off: hold position, but still wake/sleep so the
                // creature isn't inertly identical forever.
                setActivityBoth('idle');
            } else if (activityRef.current === 'happy') {
                // Held by the click handler's timer; don't move meanwhile.
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
                } else if (activityRef.current === 'walking') {
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

            xRef.current = Math.max(min, Math.min(max, xRef.current));
            const el = elRef.current;
            if (el) {
                el.style.left = `${Math.round(xRef.current)}px`;
                el.style.transform = `scaleX(${facingRef.current})`;
            }
            raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('pointermove', onPointerMove);
        };
    }, [pet, suspended]);

    if (!pet || suspended) return null;

    const mood = computeMood(state);
    const hungry = mood === 'hungry' || mood === 'starving';

    const say = (text: string) => {
        setBubble(text);
        window.setTimeout(() => setBubble(null), 2600);
    };

    const onPetClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        playClick();
        activityRef.current = 'happy';
        setActivity('happy');
        lastMoveRef.current = performance.now();

        if (hungry) {
            feedPet();
            say(pet.feedLines[Math.floor(Math.random() * pet.feedLines.length)]);
        } else {
            pettPet();
            say(pet.petLines[Math.floor(Math.random() * pet.petLines.length)]);
        }

        window.setTimeout(() => {
            activityRef.current = 'idle';
            setActivity('idle');
        }, 900);
    };

    // A tiny bit of vertical life without a spritesheet: the walk bob is a
    // sine of real time, and sleeping settles the creature down onto the bar.
    const bob =
        activity === 'walking' || activity === 'chasing'
            ? Math.sin(Date.now() / 90) * 1.6
            : 0;

    return (
        <div style={styles.layer} aria-hidden="true">
            <div
                ref={elRef}
                style={{
                    ...styles.pet,
                    left: xRef.current,
                    bottom:
                        TASKBAR_HEIGHT - 6 + (activity === 'sleeping' ? -3 : bob),
                }}
            >
                {bubble && (
                    <div
                        style={{
                            ...styles.bubble,
                            // Un-mirror the text when the sprite is flipped.
                            transform: `scaleX(${facingRef.current})`,
                        }}
                    >
                        {bubble}
                    </div>
                )}
                {activity === 'sleeping' && (
                    <span style={styles.zzz}>z</span>
                )}
                {hungry && activity !== 'sleeping' && (
                    <span style={styles.hungerMark} title="Hungry">
                        !
                    </span>
                )}
                {/* The same 32px art the tray and the Pet window use, so
                    it is recognisably one creature across all three. */}
                <img
                    src={getIconByName(pet.icon) as unknown as string}
                    alt=""
                    width={SPRITE}
                    height={SPRITE}
                    style={styles.sprite}
                    onClick={onPetClick}
                    title={`${pet.name} — click to ${hungry ? 'feed' : 'pat'}`}
                />
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    layer: {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: TASKBAR_HEIGHT + 60,
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
    sprite: {
        width: SPRITE,
        height: SPRITE,
        imageRendering: 'pixelated',
        cursor: 'pointer',
        // The one thing on this layer that accepts a click.
        pointerEvents: 'auto',
        userSelect: 'none',
    },
    bubble: {
        position: 'absolute',
        bottom: SPRITE + 6,
        left: '50%',
        marginLeft: -84,
        width: 168,
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
        top: -8,
        right: -4,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: '#333',
        pointerEvents: 'none',
    },
    hungerMark: {
        position: 'absolute',
        top: -8,
        right: -2,
        fontFamily: 'MSSerif',
        fontWeight: 'bold',
        fontSize: 12,
        color: '#c0392b',
        pointerEvents: 'none',
    },
};

export default DesktopPet;
