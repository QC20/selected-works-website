import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import { createCrtRoomScene, CrtRoomController, CrtMode } from './CrtRoomScene';

export interface Experience3DProps {
    /** When true, mount + play the 2D->3D reveal. */
    open: boolean;
    /** Hand control back to the 2D desktop (it un-recedes behind the snow). */
    onExit: () => void;
    /** Kept for API compatibility; the transition is now TV-snow, not teal. */
    accentColor?: string;
}

// A handful of grayscale-noise frames, generated once, cycled to make TV static.
const SNOW_FRAMES = makeSnowFrames(12, 240, 160);

/**
 * Experience3D
 * ------------
 * Full-viewport overlay hosting the CRT-room scene. A 2-second-ish burst of TV
 * snow masks every crossover: it's already at full cover during the heavy work
 * (model + iframe load on the way in, teardown on the way out) and dissolves as
 * the room emerges — so the unavoidable memory-heavy hitch happens *behind* the
 * static instead of as a visible seam.
 */
const Experience3D: React.FC<Experience3DProps> = ({ open, onExit }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cssRef = useRef<HTMLDivElement>(null);
    const snowRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<CrtRoomController | null>(null);
    const closingRef = useRef(false);

    const [render, setRender] = useState(false);
    const [arrived, setArrived] = useState(false);
    const [mode, setMode] = useState<CrtMode>('loading');
    const [muted, setMuted] = useState(true);

    const flash = useAnimation();
    const reduced = !!useReducedMotion();

    // Trigger mount when opened.
    useEffect(() => {
        if (open) {
            closingRef.current = false;
            setMuted(true);
            setArrived(false);
            setMode('loading');
            setRender(true);
        }
    }, [open]);

    // Cycle the TV-snow frames while mounted (cheap; only visible when flash > 0).
    useEffect(() => {
        if (!render) return;
        let i = 0;
        const id = window.setInterval(() => {
            i = (i + 1) % SNOW_FRAMES.length;
            if (snowRef.current) {
                snowRef.current.style.backgroundImage = `url(${SNOW_FRAMES[i]})`;
            }
        }, 42);
        return () => window.clearInterval(id);
    }, [render]);

    // Create the scene once the canvas + css container exist.
    useEffect(() => {
        if (!render) return;
        const canvas = canvasRef.current;
        const cssContainer = cssRef.current;
        if (!canvas || !cssContainer) return;

        // Snow fully covers from the first frame, hiding the DOM->WebGL swap and
        // the load hitch behind it.
        flash.set({ opacity: 1 });

        const controller = createCrtRoomScene(canvas, {
            reducedMotion: reduced,
            cssContainer,
            onModeChange: (m) => setMode(m),
            onReady: () => {
                // Room is loaded: dissolve the snow as the camera pulls out.
                flash.start({
                    opacity: 0,
                    transition: { duration: reduced ? 0.6 : 1.0, ease: 'easeInOut' },
                });
                controller.enterIntro(() => setArrived(true));
            },
            onError: () => {
                flash.start({ opacity: 0, transition: { duration: 0.4 } });
                onExit();
                setRender(false);
            },
        });
        controllerRef.current = controller;

        return () => {
            controller.dispose();
            controllerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [render]);

    // Reflect mute state into the scene.
    useEffect(() => {
        controllerRef.current?.setMuted(muted);
    }, [muted]);

    const doExit = useCallback(() => {
        if (closingRef.current || !controllerRef.current) return;
        closingRef.current = true;
        setArrived(false);

        // Snow rises to cover the dive-back + teardown, then clears onto the 2D OS.
        flash.start({
            opacity: 1,
            transition: { duration: reduced ? 0.5 : 0.9, ease: 'easeIn' },
        });

        controllerRef.current.exit(() => {
            onExit();
            flash
                .start({
                    opacity: 0,
                    transition: { duration: reduced ? 0.5 : 0.8, delay: 0.25, ease: 'easeOut' },
                })
                .then(() => {
                    setRender(false);
                    closingRef.current = false;
                });
        });
    }, [flash, onExit, reduced]);

    // Esc "ladder": from the monitor, step back to the desk; otherwise leave to 2D.
    useEffect(() => {
        if (!render) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (mode === 'monitor') controllerRef.current?.backToDesk();
            else doExit();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [render, mode, doExit]);

    if (!render) return null;

    const hint =
        mode === 'monitor'
            ? "you're using the computer — Back or Esc to step away"
            : mode === 'orbit'
            ? 'drag to look around the room'
            : 'click the screen to use it · or take a free look around';

    return (
        <div style={styles.overlay}>
            {/* CSS3D layer (live OS iframe) — behind the transparent canvas. */}
            <div ref={cssRef} style={styles.cssLayer} />
            <canvas ref={canvasRef} style={styles.canvas} />

            {/* TV-snow flash bridging every transition. */}
            <motion.div
                aria-hidden
                initial={{ opacity: 0 }}
                animate={flash}
                style={styles.flash}
            >
                <div ref={snowRef} style={styles.flashSnow} />
                <div style={styles.flashScan} />
            </motion.div>

            {/* Ambient UI — appears once you've arrived in the room. */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: arrived ? 1 : 0 }}
                transition={{ duration: 0.8 }}
                style={styles.uiLayer}
            >
                <div style={styles.hint}>{hint}</div>

                {/* Always available so no one gets stuck in 3D. */}
                <button
                    type="button"
                    onClick={doExit}
                    style={Object.assign({}, styles.control, { left: 24 })}
                >
                    ‹ return to desktop
                </button>

                {mode === 'monitor' ? (
                    <button
                        type="button"
                        onClick={() => controllerRef.current?.backToDesk()}
                        style={Object.assign({}, styles.control, styles.centerBtn)}
                    >
                        step back
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() =>
                            controllerRef.current?.setFreeLook(mode !== 'orbit')
                        }
                        style={Object.assign({}, styles.control, styles.centerBtn)}
                    >
                        {mode === 'orbit' ? 'exit free look' : 'free look'}
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    style={Object.assign({}, styles.control, { right: 24 })}
                    aria-label={muted ? 'Unmute ambience' : 'Mute ambience'}
                >
                    {muted ? '🔇 sound' : '🔊 sound'}
                </button>
            </motion.div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 99999,
        overflow: 'hidden',
        backgroundColor: '#05080a',
    },
    cssLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
    },
    canvas: {
        display: 'block',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        pointerEvents: 'none',
        background: 'transparent',
        touchAction: 'none',
    },
    flash: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 3,
        pointerEvents: 'none',
        backgroundColor: '#000',
    },
    flashSnow: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        backgroundSize: 'cover',
        imageRendering: 'pixelated',
    },
    flashScan: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        mixBlendMode: 'overlay',
        opacity: 0.5,
        background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)',
    },
    uiLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 4,
        pointerEvents: 'none',
    },
    hint: {
        position: 'absolute',
        bottom: 62,
        left: 0,
        width: '100%',
        textAlign: 'center',
        fontFamily: 'MSSerif',
        fontSize: 11,
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.55)',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
        userSelect: 'none',
    },
    control: {
        position: 'absolute',
        bottom: 24,
        pointerEvents: 'auto',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.75)',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 2,
        padding: '6px 12px',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
    },
    centerBtn: {
        left: '50%',
        transform: 'translateX(-50%)',
    },
};

/** Generate `count` grayscale TV-static frames as data URLs. */
function makeSnowFrames(count: number, w: number, h: number): string[] {
    const frames: string[] = [];
    for (let f = 0; f < count; f++) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d')!;
        const img = ctx.createImageData(w, h);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = (Math.random() * 255) | 0;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        frames.push(c.toDataURL('image/png'));
    }
    return frames;
}

export default Experience3D;
