import React, { useEffect, useRef } from 'react';
import Colors from '../../../constants/colors';
import { Animator, Clip } from './animate';
import { PetKind, draw, frameFor, originOf } from './render';
import { AccessoryId } from './wardrobe';
import { paintSprite, spriteSize } from './sprites';
import { playPetPurr, playPetVoice } from '../sounds';

/**
 * A pet, alive, in a little window of its own.
 * --------------------------------------------
 * The Pet window used to show the animal as a 64px copy of its tray icon.
 * Choosing between four animals by looking at four stills is choosing
 * between four drawings; you could not tell which one you would actually
 * like living on your taskbar, because none of them was doing anything.
 *
 * This is a miniature of where the animal lives — a strip of desktop teal
 * and a strip of taskbar — with the real animal on it, running through a
 * short reel of the things that species does: the collie sits and play
 * bows, the cat washes, the ermine stands up to look about, the betta
 * patrols. It watches the pointer while it is over the window, and it can
 * be stroked and poked, so the choice is made by meeting them.
 *
 * Same renderer and animator as the creature on the taskbar, so what you
 * see here is exactly what you will get.
 */

interface Beat {
    clip: Clip;
    /** How long to hold, ms. */
    ms?: number;
    /** Or walk to this fraction of the stage's width. */
    to?: number;
    /** Faster than an amble. */
    run?: boolean;
}

const REELS: Record<PetKind, Beat[]> = {
    modem: [
        { clip: 'stand', ms: 2200 },
        { clip: 'sit', ms: 3000 },
        { clip: 'walk', to: 0.72 },
        { clip: 'stretch', ms: 1500 },
        { clip: 'stand', ms: 1400 },
        { clip: 'ponder', ms: 1800 },
        { clip: 'trot', to: 0.28, run: true },
        { clip: 'lie', ms: 3200 },
        { clip: 'walk', to: 0.5 },
    ],
    static: [
        { clip: 'sit', ms: 2600 },
        { clip: 'groom', ms: 2600 },
        { clip: 'walk', to: 0.7 },
        { clip: 'stand', ms: 1600 },
        { clip: 'stretch', ms: 1600 },
        { clip: 'walk', to: 0.32 },
        { clip: 'lie', ms: 3400 },
        { clip: 'dance', ms: 2200 },
        { clip: 'walk', to: 0.5 },
    ],
    glitch: [
        { clip: 'stand', ms: 1400 },
        { clip: 'perk', ms: 2400 },
        { clip: 'walk', to: 0.75, run: true },
        { clip: 'sniff', ms: 1600 },
        { clip: 'walk', to: 0.25, run: true },
        { clip: 'perk', ms: 2000 },
        { clip: 'dance', ms: 1600 },
        { clip: 'sit', ms: 2200 },
        { clip: 'walk', to: 0.5 },
    ],
    pixel: [
        { clip: 'stand', ms: 2000 },
        { clip: 'walk', to: 0.75 },
        { clip: 'cool', ms: 1800 },
        { clip: 'stand', ms: 1200 },
        { clip: 'walk', to: 0.25 },
        { clip: 'sit', ms: 2600 },
        { clip: 'walk', to: 0.5 },
        { clip: 'yap', ms: 1400 },
    ],
};

export interface PetPortraitProps {
    kind: PetKind;
    /** Stage size in art pixels. */
    width: number;
    height: number;
    /** Whole-number upscale for display. */
    zoom?: number;
    accessory?: AccessoryId | null;
    /** Sitting by an empty bowl rather than going about its business. */
    hungry?: boolean;
    /** Hold a single clip instead of playing the reel. */
    hold?: Clip;
    /** Called when the animal is poked or stroked here. */
    onPoke?: () => void;
    onStroke?: () => void;
    style?: React.CSSProperties;
    title?: string;
}

const PetPortrait: React.FC<PetPortraitProps> = ({
    kind,
    width,
    height,
    zoom = 2,
    accessory = null,
    hungry = false,
    hold,
    onPoke,
    onStroke,
    style,
    title,
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pointerRef = useRef<{ x: number; y: number } | null>(null);
    const strokeRef = useRef({ last: 0, lastX: 0, dir: 0, travel: 0, flips: 0, until: 0, next: 0 });
    const hopUntilRef = useRef(0);
    const propsRef = useRef({ accessory, hungry, hold, onPoke, onStroke });
    propsRef.current = { accessory, hungry, hold, onPoke, onStroke };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.imageSmoothingEnabled = false;

        const frame = frameFor(1);
        const image = new ImageData(new Uint8ClampedArray(frame.px.buffer), frame.w, frame.h);
        const sprite = document.createElement('canvas');
        sprite.width = frame.w;
        sprite.height = frame.h;
        const sctx = sprite.getContext('2d');
        const [ox, oy] = originOf(frame);
        const ground = height - 9;

        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        const anim = new Animator(kind);
        const reel = REELS[kind];
        let beat = 0;
        let beatAt = performance.now();
        let x = width * 0.5;
        let facing: 1 | -1 = 1;
        let raf = 0;
        let lastDraw = 0;
        let last = performance.now();
        // A minimized window stays mounted at zero opacity, so the loop
        // would otherwise go on drawing for nobody. Checked twice a second
        // from inline styles alone, which costs no layout.
        let hiddenCheckAt = 0;
        let hidden = false;

        const tick = (now: number) => {
            if (now > hiddenCheckAt) {
                hiddenCheckAt = now + 500;
                hidden = false;
                for (let el: HTMLElement | null = canvas; el; el = el.parentElement) {
                    if (el.style.opacity === '0' || el.style.display === 'none') {
                        hidden = true;
                        break;
                    }
                }
            }
            if (hidden) {
                last = now;
                raf = window.requestAnimationFrame(tick);
                return;
            }
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const { hold: held, hungry: starving } = propsRef.current;

            // What to do: the held clip, begging, or the reel.
            let clip: Clip = 'stand';
            let moved = 0;
            if (now < hopUntilRef.current) {
                clip = 'hop';
            } else if (held) {
                clip = held;
            } else if (starving) {
                clip = 'sit';
            } else if (!reduced) {
                const b = reel[beat % reel.length];
                if (b.to !== undefined) {
                    const target = width * b.to;
                    const dist = target - x;
                    if (Math.abs(dist) < 1) {
                        beat++;
                        beatAt = now;
                    } else {
                        facing = (Math.sign(dist) || 1) as 1 | -1;
                        const speed = b.run ? 70 : 34;
                        const step = Math.min(Math.abs(dist), speed * dt);
                        x += facing * step;
                        moved = step;
                    }
                    clip = b.clip;
                } else {
                    clip = b.clip;
                    if (now - beatAt > (b.ms ?? 2000)) {
                        beat++;
                        beatAt = now;
                    }
                }
            }

            const stroked = now < strokeRef.current.until;
            const p = pointerRef.current;
            const look = starving
                ? { dx: 0, dy: 80 }
                : p
                ? { dx: p.x - x, dy: ground - p.y - 22 }
                : null;
            const pose = anim.update(now, {
                clip,
                p: clip === 'hop' ? 1 - (hopUntilRef.current - now) / 700 : 0,
                len: 700,
                moved,
                speed: moved / Math.max(dt, 1 / 240),
                vy: 0,
                spin: 0,
                squash: 0,
                facing,
                look,
                happy: stroked,
                reduced: !!reduced,
            });

            if (now - lastDraw >= 1000 / 30) {
                lastDraw = now;
                draw(frame, {
                    kind,
                    pose,
                    facing,
                    scale: 1,
                    time: now,
                    accessory: propsRef.current.accessory,
                    glitch: kind === 'glitch' ? 0.1 : 0,
                });
                sctx?.putImageData(image, 0, 0);

                // The diorama: desktop above, a strip of taskbar below.
                ctx.fillStyle = Colors.turquoise;
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = '#c0c0c0';
                ctx.fillRect(0, ground, width, height - ground);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, ground, width, 1);
                ctx.fillStyle = '#86898d';
                ctx.fillRect(0, height - 1, width, 1);
                // A soft contact shadow.
                ctx.fillStyle = kind === 'pixel' ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.22)';
                ctx.beginPath();
                ctx.ellipse(Math.round(x), ground + 1.5, 13, 1.6, 0, 0, Math.PI * 2);
                ctx.fill();
                // A hungry animal sits by its empty bowl, as on the taskbar.
                if (starving) {
                    const bowl = spriteSize('bowlEmpty');
                    paintSprite(ctx, 'bowlEmpty', x + facing * 20 - bowl.w / 2, ground - bowl.h + 1);
                }
                ctx.drawImage(sprite, Math.round(x - ox), Math.round(ground - oy));
            }
            raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(raf);
    }, [kind, width, height]);

    const toLocal = (e: React.PointerEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * width,
            y: ((e.clientY - rect.top) / rect.height) * height,
        };
    };

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            title={title}
            style={{
                width: width * zoom,
                height: height * zoom,
                imageRendering: 'pixelated',
                display: 'block',
                cursor: 'pointer',
                ...style,
            }}
            onPointerMove={(e) => {
                const local = toLocal(e);
                pointerRef.current = local;
                // Stroking, exactly as on the taskbar.
                const st = strokeRef.current;
                const now = performance.now();
                if (now - st.last > 420) {
                    st.travel = 0;
                    st.flips = 0;
                    st.dir = 0;
                    st.lastX = e.clientX;
                }
                const dx = e.clientX - st.lastX;
                st.lastX = e.clientX;
                st.last = now;
                if (Math.abs(dx) < 1 || e.buttons) return;
                const dir = Math.sign(dx);
                if (st.dir && dir !== st.dir) st.flips++;
                st.dir = dir;
                st.travel += Math.abs(dx);
                if (st.travel > 60 && st.flips >= 1) {
                    st.until = now + 650;
                    if (now > st.next) {
                        st.next = now + 2600;
                        if (kind === 'static') playPetPurr();
                        propsRef.current.onStroke?.();
                    }
                }
            }}
            onPointerLeave={() => {
                pointerRef.current = null;
            }}
            onClick={() => {
                hopUntilRef.current = performance.now() + 700;
                playPetVoice(kind);
                propsRef.current.onPoke?.();
            }}
        />
    );
};

export default PetPortrait;
