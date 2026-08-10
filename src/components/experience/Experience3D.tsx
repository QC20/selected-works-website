import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';
import { createCrtRoomScene, CrtRoomController, CrtMode } from './CrtRoomScene';
import './Experience3D.css';

export interface Experience3DProps {
    /** When true, mount + play the 2D->3D reveal. */
    open: boolean;
    /** Hand control back to the 2D desktop (it un-recedes behind the snow). */
    onExit: () => void;
    /** Kept for API compatibility; the transition is now TV-snow, not teal. */
    accentColor?: string;
}

/**
 * Experience3D
 * ------------
 * Full-viewport overlay hosting the CRT-room scene. A 2-second-ish burst of TV
 * snow masks every crossover: it's already at full cover during the heavy work
 * (model + iframe load on the way in, teardown on the way out) and dissolves as
 * the room emerges — so the unavoidable memory-heavy hitch happens *behind* the
 * static instead of as a visible seam.
 *
 * Over the settled room sits a permanent film-grain pass (see Experience3D.css):
 * light static from the viewer's point of view, which is what makes the room read
 * as something being *watched* in 1997 rather than a clean render.
 *
 * Keys: Esc leaves 3D entirely, Enter/Space swings back to face the monitor.
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
    // Ambience is part of the room: it comes up with it, not on request.
    const [muted, setMuted] = useState(false);
    /** Free-look dolly, 0..1. Two-way: the slider drives it, so do wheel/pinch. */
    const [zoom, setZoom] = useState(0.55);
    /**
     * Which radio stays lit during a camera move. `loading` is a real mode but
     * not a real *view*, and letting the group go blank for a second every time
     * you change view is exactly the flicker radio buttons exist to prevent.
     */
    const lastViewRef = useRef<'monitor' | 'desk' | 'orbit'>('desk');

    const flash = useAnimation();
    const reduced = !!useReducedMotion();
    const touch = useIsTouch();

    // Both noise textures are built on first open, never at import time — the
    // module is pulled in by Desktop.tsx, so generating them eagerly cost every
    // visitor (and the copy of the site inside the CRT) a synchronous stall.
    const snowFrames = useMemo(() => (render ? getSnowFrames() : []), [render]);
    const grainTile = useMemo(() => (render ? getGrainTile() : ''), [render]);
    const coarseGrainTile = useMemo(
        () => (render ? getCoarseGrainTile() : ''),
        [render]
    );

    // Trigger mount when opened.
    useEffect(() => {
        if (open) {
            closingRef.current = false;
            setMuted(false);
            setArrived(false);
            setMode('loading');
            setRender(true);
        }
    }, [open]);

    // Cycle the TV-snow frames while mounted (cheap; only visible when flash > 0).
    useEffect(() => {
        if (!render || !snowFrames.length) return;
        let i = 0;
        const id = window.setInterval(() => {
            i = (i + 1) % snowFrames.length;
            if (snowRef.current) {
                snowRef.current.style.backgroundImage = `url(${snowFrames[i]})`;
            }
        }, 42);
        return () => window.clearInterval(id);
    }, [render, snowFrames]);

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

    // The scene is created once and outlives any given `doExit` identity, so it
    // reaches the current one through a ref rather than re-creating on change.
    const doExitRef = useRef(doExit);
    doExitRef.current = doExit;

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
            onZoomChange: (t) => setZoom(t),
            onScreenEscape: () => doExitRef.current(),
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

    // Reflect mute state into the scene (the scene itself starts unmuted).
    useEffect(() => {
        controllerRef.current?.setMuted(muted);
    }, [muted]);

    // Esc always drops back to 2D; Enter/Space re-centres on the monitor.
    useEffect(() => {
        if (!render) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                doExit();
                return;
            }
            if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
            // Let a focused control keep its own Enter/Space activation.
            if ((e.target as HTMLElement | null)?.tagName === 'BUTTON') return;
            if (!arrived) return;
            e.preventDefault();
            controllerRef.current?.resetView();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [render, arrived, doExit]);

    // A clicked button keeps focus, which would swallow every later Enter/Space
    // (they'd re-fire that button instead of re-centring the camera). Drop focus
    // after pointer activation only — `detail === 0` means the keyboard did it,
    // and those users need to keep their place.
    const dropFocus = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (e.detail > 0) e.currentTarget.blur();
    };

    if (!render) return null;

    /**
     * The status line.
     *
     * One sentence, in the imperative, describing what this view is *for* —
     * plus the keyboard equivalent where there is one. It changes with the
     * view because the answer to "what can I do here" changes with the view,
     * which is the entire job of a status bar.
     */
    const hint =
        mode === 'monitor'
            ? touch
                ? 'The computer is yours. Choose Desk to step back.'
                : 'The computer is yours.  Esc leaves the room.'
            : mode === 'orbit'
            ? touch
                ? 'Drag to walk around it. Pinch, or use Zoom, to get closer.'
                : 'Drag to walk around it.  Scroll or drag Zoom to get closer.'
            : mode === 'desk'
            ? touch
                ? 'Tap the screen to use the computer.'
                : 'Click the screen to use the computer.  Enter re-centres.'
            : 'Please wait…';

    /** Which view the radio group is showing as current. */
    const view: 'monitor' | 'desk' | 'orbit' =
        mode === 'loading' ? lastViewRef.current : mode;
    lastViewRef.current = view;

    const chooseView = (next: 'monitor' | 'desk' | 'orbit') => {
        const c = controllerRef.current;
        if (!c || next === view) return;
        if (next === 'monitor') c.enterMonitor();
        else if (next === 'desk') c.backToDesk();
        else c.setFreeLook(true);
    };

    return (
        <div style={styles.overlay}>
            {/* CSS3D layer (live OS iframe) — behind the transparent canvas. */}
            <div ref={cssRef} style={styles.cssLayer} />
            <canvas ref={canvasRef} style={styles.canvas} />

            {/* Film grain + vignette over the whole scene, room and monitor alike. */}
            <div
                aria-hidden
                className={
                    'crt3d-grain' + (mode === 'monitor' ? ' crt3d-grain--monitor' : '')
                }
                style={styles.grain}
            >
                <div
                    className="crt3d-grain__noise"
                    style={{ backgroundImage: `url(${grainTile})` }}
                />
                <div
                    className="crt3d-grain__noise crt3d-grain__noise--coarse"
                    style={{ backgroundImage: `url(${coarseGrainTile})` }}
                />
                <div className="crt3d-grain__vignette" />
            </div>

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
                className="crt3d-ui"
                initial={{ opacity: 0 }}
                animate={{ opacity: arrived ? 1 : 0 }}
                transition={{ duration: 0.8 }}
                style={styles.uiLayer}
            >
                <div className="crt3d-panel" role="group" aria-label="Room controls">
                    <div className="crt3d-titlebar">
                        <span className="crt3d-title">Step Outside</span>
                        {/* The close box means what it has always meant: this
                            goes away and you are back where you started. It is
                            the one control that is never disabled. */}
                        <button
                            type="button"
                            className="crt3d-close"
                            title="Return to the desktop"
                            aria-label="Return to the desktop"
                            onClick={(e) => {
                                dropFocus(e);
                                doExit();
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    <div className="crt3d-body">
                        <div className="crt3d-row">
                            <span className="crt3d-row__label" id="crt3d-view-label">
                                View:
                            </span>
                            <div
                                className="crt3d-row__control"
                                role="radiogroup"
                                aria-labelledby="crt3d-view-label"
                            >
                                {VIEWS.map((v) => (
                                    <label className="crt3d-radio" key={v.key}>
                                        <input
                                            type="radio"
                                            name="crt3d-view"
                                            checked={view === v.key}
                                            onChange={() => chooseView(v.key)}
                                        />
                                        <span className="crt3d-radio__dot" />
                                        <span>{v.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="crt3d-row">
                            <span className="crt3d-row__label" id="crt3d-zoom-label">
                                Zoom:
                            </span>
                            <div className="crt3d-row__control">
                                {/* Only meaningful in Room, so it greys out
                                    elsewhere rather than disappearing — a
                                    control that vanishes teaches nothing. */}
                                <input
                                    className="crt3d-track"
                                    type="range"
                                    min={0}
                                    max={1000}
                                    value={Math.round(zoom * 1000)}
                                    disabled={mode !== 'orbit'}
                                    aria-labelledby="crt3d-zoom-label"
                                    onChange={(e) => {
                                        const t = Number(e.target.value) / 1000;
                                        setZoom(t);
                                        controllerRef.current?.setZoom(t);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="crt3d-row">
                            <span className="crt3d-row__label" />
                            <div className="crt3d-row__control">
                                <label className="crt3d-check">
                                    <input
                                        type="checkbox"
                                        checked={!muted}
                                        onChange={() => setMuted((m) => !m)}
                                    />
                                    <span className="crt3d-check__box" />
                                    <span>Room sound</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="crt3d-status">{hint}</div>
                </div>
            </motion.div>
        </div>
    );
};

/**
 * The three places the camera can be, near to far.
 *
 * Ordered as a journey rather than alphabetically: Screen is where you came
 * from, Room is as far out as it goes, and Desk is the resting point between
 * them. A radio group read left to right should describe a distance.
 */
const VIEWS: { key: 'monitor' | 'desk' | 'orbit'; label: string }[] = [
    { key: 'monitor', label: 'Screen' },
    { key: 'desk', label: 'Desk' },
    { key: 'orbit', label: 'Room' },
];

/** Coarse-pointer devices get hints that don't mention keys they don't have. */
function useIsTouch(): boolean {
    const [touch, setTouch] = useState(false);
    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
        setTouch(mq.matches);
        const onChange = (e: MediaQueryListEvent) => setTouch(e.matches);
        // Safari only grew addEventListener on MediaQueryList in 14.
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else mq.addListener(onChange);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener('change', onChange);
            else mq.removeListener(onChange);
        };
    }, []);
    return touch;
}

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
    grain: {
        zIndex: 3,
    },
    flash: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 4,
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
    // Scanlines + falloff as plain alpha. This used to be `mix-blend-mode:
    // overlay`; blend modes over a CSS3D subtree are exactly what washed the
    // monitor white on iOS, so none survive anywhere in this overlay.
    flashScan: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.55,
        background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.55) 1px, transparent 1px, transparent 3px), radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)',
    },
    uiLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 5,
        pointerEvents: 'none',
    },
};

let snowFramesCache: string[] | null = null;
/** Grayscale TV-static frames for the transition flash, built once per session. */
function getSnowFrames(): string[] {
    if (!snowFramesCache) {
        snowFramesCache = [];
        for (let f = 0; f < 12; f++) {
            snowFramesCache.push(
                paintNoise(240, 160, () => {
                    const v = (Math.random() * 255) | 0;
                    return [v, v, v, 255];
                })
            );
        }
    }
    return snowFramesCache;
}

let grainTileCache: string | null = null;
/**
 * A tileable film-grain speckle. Half the specks lighten and half darken, so the
 * layer adds texture without shifting the scene's overall brightness, and most
 * are near-transparent (alpha is a product of two randoms) so it scatters like
 * dust rather than sitting there as a flat grey sheet.
 */
function getGrainTile(): string {
    if (!grainTileCache) {
        grainTileCache = paintNoise(256, 256, () => {
            const v = Math.random() < 0.5 ? 0 : 255;
            return [v, v, v, (Math.random() * Math.random() * 255) | 0];
        });
    }
    return grainTileCache;
}

let coarseGrainCache: string | null = null;
/**
 * The second grain pass: fewer, larger, softer specks. Drawn at half the
 * resolution and then scaled up by CSS, which is what gives it a chunkier
 * particle than the fine layer without a second full-size tile in memory.
 */
function getCoarseGrainTile(): string {
    if (!coarseGrainCache) {
        coarseGrainCache = paintNoise(232, 232, () => {
            const v = Math.random() < 0.5 ? 0 : 255;
            // Sparse: about one speck in six, so it reads as a second, slower
            // layer of dust rather than doubling the first one's density.
            return [v, v, v, Math.random() < 0.17 ? (Math.random() * 210) | 0 : 0];
        });
    }
    return coarseGrainCache;
}

/** Fill a canvas pixel-by-pixel from `sample` and hand back a data URL. */
function paintNoise(
    w: number,
    h: number,
    sample: () => [number, number, number, number]
): string {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    for (let i = 0; i < img.data.length; i += 4) {
        const [r, g, b, a] = sample();
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
}

export default Experience3D;
