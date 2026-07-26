import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import { createCrtRoomScene, CrtRoomController } from './CrtRoomScene';

export interface Experience3DProps {
    /** When true, mount + play the 2D->3D reveal. */
    open: boolean;
    /** Called mid-exit, once the camera is back at the screen, to hand control
     *  back to the 2D desktop (which un-recedes behind our teal glow). */
    onExit: () => void;
    /** The desktop's accent teal — bridges the seam between DOM and WebGL. */
    accentColor: string;
}

/** Lighten (amt>0) or darken (amt<0) a #rrggbb hex by a 0..1 amount. */
const shade = (hex: string, amt: number): string => {
    const n = parseInt(hex.replace('#', ''), 16);
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    let r = (n >> 16) & 0xff;
    let g = (n >> 8) & 0xff;
    let b = n & 0xff;
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    r = clamp(Math.round((t - r) * p + r));
    g = clamp(Math.round((t - g) * p + g));
    b = clamp(Math.round((t - b) * p + b));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

/**
 * Experience3D
 * ------------
 * Full-viewport overlay that hosts the CRT-room Three.js scene and choreographs
 * the seamless 2D<->3D handoff. A teal radial "glow" layer swells at each crossover
 * so the eye never sees a cut between the DOM desktop and the WebGL room — only
 * teal light that then recedes into (or bursts out of) the monitor.
 */
const Experience3D: React.FC<Experience3DProps> = ({ open, onExit, accentColor }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const controllerRef = useRef<CrtRoomController | null>(null);
    const closingRef = useRef(false);

    const [render, setRender] = useState(false);
    const [showUi, setShowUi] = useState(false);
    const [muted, setMuted] = useState(true);

    const glow = useAnimation();
    const reduced = !!useReducedMotion();

    const bright = shade(accentColor, 0.4);
    const deep = shade(accentColor, -0.35);

    // Trigger mount when opened.
    useEffect(() => {
        if (open) {
            closingRef.current = false;
            setMuted(true);
            setRender(true);
        }
    }, [open]);

    // Create the scene once the canvas exists, then play the intro + glow bridge.
    useEffect(() => {
        if (!render) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const controller = createCrtRoomScene(canvas, {
            accent: accentColor,
            reducedMotion: reduced,
            onReady: () => {
                // The room finished loading: lift the teal veil and fly in.
                glow.start({
                    opacity: 0,
                    transition: { duration: reduced ? 0.8 : 1.6, ease: 'easeInOut' },
                });
                controller.enterIntro(() => setShowUi(true));
            },
            onError: () => {
                // Loading failed — hand back to the desktop without a glitch.
                glow.start({ opacity: 0, transition: { duration: 0.4 } });
                onExit();
                setRender(false);
            },
        });
        controllerRef.current = controller;

        // Hold a teal veil over the DOM->WebGL swap AND the model load, so the
        // room only appears once it's fully ready (no pop-in).
        glow.set({ opacity: reduced ? 0.7 : 0 });
        glow.start({ opacity: 0.96, transition: { duration: 0.7, ease: 'easeOut' } });

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
        setShowUi(false);

        // Fill the frame with teal as the camera dives back into the screen.
        glow.start({
            opacity: 1,
            transition: { duration: reduced ? 0.6 : 1.4, ease: 'easeIn' },
        });

        controllerRef.current.exit(() => {
            // Camera is back at the screen — hand the desktop back (it un-recedes
            // behind our now-full teal glow), then fade the glow to reveal it.
            onExit();
            glow
                .start({
                    opacity: 0,
                    transition: { duration: 0.7, delay: 0.25, ease: 'easeOut' },
                })
                .then(() => {
                    setRender(false);
                    closingRef.current = false;
                });
        });
    }, [glow, onExit, reduced]);

    // ESC to return.
    useEffect(() => {
        if (!render) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') doExit();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [render, doExit]);

    if (!render) return null;

    return (
        <div style={styles.overlay}>
            <canvas ref={canvasRef} style={styles.canvas} />

            {/* Teal glow bridge — hides every crossover seam. */}
            <motion.div
                aria-hidden
                initial={{ opacity: 0 }}
                animate={glow}
                style={Object.assign({}, styles.glow, {
                    background: `radial-gradient(circle at 50% 45%, ${bright} 0%, ${accentColor} 55%, ${deep} 100%)`,
                })}
            />

            {/* Ambient UI — fades in only once you've arrived. */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showUi ? 1 : 0 }}
                transition={{ duration: 1.2 }}
                style={styles.uiLayer}
            >
                <div style={styles.hint}>drag to look around</div>

                <button
                    type="button"
                    onClick={doExit}
                    style={Object.assign({}, styles.control, styles.returnBtn)}
                >
                    ‹ return to desktop
                </button>

                <button
                    type="button"
                    onClick={() => setMuted((m) => !m)}
                    style={Object.assign({}, styles.control, styles.soundBtn)}
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
        cursor: 'grab',
    },
    canvas: {
        display: 'block',
        width: '100%',
        height: '100%',
        touchAction: 'none',
    },
    glow: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
    },
    uiLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
    },
    hint: {
        position: 'absolute',
        bottom: 28,
        left: 0,
        width: '100%',
        textAlign: 'center',
        fontFamily: 'MSSerif',
        fontSize: 11,
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.5)',
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
        color: 'rgba(255,255,255,0.7)',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 2,
        padding: '6px 12px',
        backdropFilter: 'blur(2px)',
        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
    },
    returnBtn: {
        left: 24,
    },
    soundBtn: {
        right: 24,
    },
};

export default Experience3D;
