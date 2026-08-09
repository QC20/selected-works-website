import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer';

/**
 * CrtRoomScene
 * -------------
 * Loads Henry Heffernan's room (baked GLB models) and embeds this site's *live*
 * 2D desktop inside the monitor via the mixed CSS3D + WebGL technique (his assets
 * and technique are MIT-licensed; notice kept in public/henry/). A transparent
 * WebGL layer on top punches a hole over the screen so the DOM iframe shows
 * through and stays clickable.
 *
 * Interaction mirrors Henry's, but the intro is reversed — you start *inside* the
 * screen and move out:
 *   intro:   screen -> desk (pull out, reveal the room)
 *   desk:    resting view; click the screen to zoom in and use the OS
 *   monitor: the OS fills the frame and is interactive; Back/Esc returns to desk
 *   orbit:   "free look" toggle -> OrbitControls around the room
 *
 * Performance: render-on-demand. The WebGL/CSS3D frame is only redrawn while the
 * camera is actually moving (a tween or an active orbit). When you're parked at
 * the monitor using the OS, the 3D render loop idles and the live DOM runs at full
 * native smoothness — the main reason this now feels as smooth as Henry's.
 */

export type CrtMode = 'loading' | 'desk' | 'monitor' | 'orbit';

export interface CrtRoomOptions {
    reducedMotion?: boolean;
    cssContainer: HTMLElement;
    onReady?: () => void;
    onError?: (err: unknown) => void;
    onModeChange?: (mode: CrtMode) => void;
    /**
     * Escape pressed *inside* the monitor's iframe. Key events don't cross a
     * frame boundary, so without this the overlay's own listener is deaf the
     * whole time you're using the OS.
     */
    onScreenEscape?: () => void;
}

export interface CrtRoomController {
    enterIntro: (onSettled?: () => void) => void;
    exit: (onDone?: () => void) => void;
    backToDesk: () => void;
    /** Swing the camera back to the straight-on view of the monitor, from anywhere. */
    resetView: () => void;
    setFreeLook: (on: boolean) => void;
    setMuted: (muted: boolean) => void;
    getMode: () => CrtMode;
    resize: () => void;
    dispose: () => void;
}

const PUBLIC = process.env.PUBLIC_URL || '';
const BASE = `${PUBLIC}/henry`;
const MODEL_SCALE = 900;
const DEG = THREE.MathUtils.DEG2RAD;

const SCREEN = {
    w: 1280,
    h: 1024,
    pos: new THREE.Vector3(0, 950, 255),
    rot: new THREE.Euler(-3 * DEG, 0, 0),
    pad: 32,
};

const POSE = {
    screen: { pos: new THREE.Vector3(0, 950, 700), foc: new THREE.Vector3(0, 950, 0) },
    monitor: { pos: new THREE.Vector3(0, 950, 2000), foc: new THREE.Vector3(0, 950, 0) },
    desk: { pos: new THREE.Vector3(0, 1800, 5500), foc: new THREE.Vector3(0, 500, 0) },
    orbit: { pos: new THREE.Vector3(-9000, 7000, 12000), foc: new THREE.Vector3(0, 500, 0) },
};

const easeInOutCubic = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const off = (p: THREE.Vector3, dx: number, dy: number, dz: number) =>
    new THREE.Vector3(p.x + dx, p.y + dy, p.z + dz);

export function createCrtRoomScene(
    canvas: HTMLCanvasElement,
    options: CrtRoomOptions
): CrtRoomController {
    const reduced = !!options.reducedMotion;

    // ---- WebGL renderer (transparent, on top of the CSS layer) ----------------
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        10,
        900000
    );
    camera.position.copy(POSE.screen.pos);
    camera.lookAt(POSE.screen.foc);

    // ---- CSS3D renderer (interactive OS) --------------------------------------
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.left = '0';
    cssRenderer.domElement.style.pointerEvents = 'none';
    options.cssContainer.appendChild(cssRenderer.domElement);

    const container = document.createElement('div');
    container.style.width = SCREEN.w + 'px';
    container.style.height = SCREEN.h + 'px';
    container.style.position = 'relative';
    container.style.background = '#1d2e2f';
    container.style.overflow = 'hidden';

    const iframe = document.createElement('iframe');
    iframe.src = `${window.location.origin}${PUBLIC}/`;
    iframe.title = 'Desktop';
    iframe.style.width = SCREEN.w + 'px';
    iframe.style.height = SCREEN.h + 'px';
    iframe.style.padding = SCREEN.pad + 'px';
    iframe.style.boxSizing = 'border-box';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    container.appendChild(iframe);

    // NOTE: the CRT snow that used to sit here (a `mix-blend-mode: screen` noise
    // div layered over the iframe) is gone on purpose. Inside the CSS3D subtree
    // iOS composited it at full opacity, screen-blending the whole monitor to a
    // white haze. The grain now lives in Experience3D as a plain alpha layer over
    // the entire viewport — same atmosphere, no blend-mode landmine, and it reads
    // as the viewer's film stock rather than the computer's own snow.

    const cssScene = new THREE.Scene();
    const cssObject = new CSS3DObject(container);
    cssObject.position.copy(SCREEN.pos);
    cssObject.rotation.copy(SCREEN.rot);
    cssScene.add(cssObject);

    // ---- Screen occluder + enclosing walls + dimmer ---------------------------
    const occluder = new THREE.Mesh(
        new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
        new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            opacity: 0,
            transparent: true,
            blending: THREE.NoBlending,
        })
    );
    occluder.position.copy(SCREEN.pos);
    occluder.rotation.copy(SCREEN.rot);
    scene.add(occluder);

    const DEPTH = 90;
    const wallMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x2b2c26 });
    const wallDefs = [
        { w: DEPTH, h: SCREEN.h, p: off(SCREEN.pos, -SCREEN.w / 2, 0, DEPTH / 2), r: new THREE.Euler(0, 90 * DEG, 0) },
        { w: DEPTH, h: SCREEN.h, p: off(SCREEN.pos, SCREEN.w / 2, 0, DEPTH / 2), r: new THREE.Euler(0, 90 * DEG, 0) },
        { w: SCREEN.w, h: DEPTH, p: off(SCREEN.pos, 0, SCREEN.h / 2, DEPTH / 2), r: new THREE.Euler(90 * DEG, 0, 0) },
        { w: SCREEN.w, h: DEPTH, p: off(SCREEN.pos, 0, -SCREEN.h / 2, DEPTH / 2), r: new THREE.Euler(90 * DEG, 0, 0) },
    ];
    wallDefs.forEach((wl) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(wl.w, wl.h), wallMat);
        m.position.copy(wl.p);
        m.rotation.copy(wl.r);
        scene.add(m);
    });

    const dimmerMat = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        color: 0x000000,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0,
    });
    const dimmer = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), dimmerMat);
    dimmer.position.copy(off(SCREEN.pos, 0, 0, DEPTH));
    dimmer.rotation.copy(SCREEN.rot);
    scene.add(dimmer);

    // ---- Model loading --------------------------------------------------------
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(`${BASE}/draco/`);
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    const textureLoader = new THREE.TextureLoader();
    const disposables: Array<{ dispose: () => void }> = [wallMat, dimmerMat];

    const loadBaked = (modelPath: string, texPath: string): Promise<THREE.Group> =>
        new Promise((resolve, reject) => {
            const texture = textureLoader.load(texPath, undefined, undefined, reject);
            texture.flipY = false;
            texture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.MeshBasicMaterial({ map: texture });
            disposables.push(texture, material);
            gltfLoader.load(
                modelPath,
                (gltf) => {
                    gltf.scene.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            const mesh = child as THREE.Mesh;
                            mesh.scale.setScalar(MODEL_SCALE);
                            mesh.material = material;
                        }
                    });
                    resolve(gltf.scene);
                },
                undefined,
                reject
            );
        });

    // ---- Readiness gating (models + iframe) -----------------------------------
    let modelsDone = false;
    let iframeDone = false;
    let firedReady = false;
    const maybeReady = () => {
        if (modelsDone && iframeDone && !firedReady) {
            firedReady = true;
            options.onReady?.();
        }
    };
    // Escape typed while the OS has focus never reaches the parent window, so
    // listen inside the frame too (same-origin, so this is readable) and hand it
    // back out. Only Escape — forwarding Enter/Space would fight with typing.
    let framedDoc: Document | null = null;
    const onFramedKey = (e: Event) => {
        if ((e as KeyboardEvent).key === 'Escape') options.onScreenEscape?.();
    };
    iframe.addEventListener('load', () => {
        iframeDone = true;
        try {
            framedDoc = iframe.contentWindow?.document ?? null;
            framedDoc?.addEventListener('keydown', onFramedKey);
        } catch {
            framedDoc = null; // cross-origin; the on-screen buttons still work
        }
        maybeReady();
    });
    Promise.all([
        loadBaked(`${BASE}/models/World/environment.glb`, `${BASE}/models/World/baked_environment.jpg`),
        loadBaked(`${BASE}/models/Computer/computer_setup.glb`, `${BASE}/models/Computer/baked_computer.jpg`),
        loadBaked(`${BASE}/models/Decor/decor.glb`, `${BASE}/models/Decor/baked_decor_modified.jpg`),
    ])
        .then((groups) => {
            groups.forEach((g) => scene.add(g));
            modelsDone = true;
            maybeReady();
        })
        .catch((err) => options.onError?.(err));

    // ---- Mode + interaction routing -------------------------------------------
    let mode: CrtMode = 'loading';
    const setMode = (m: CrtMode) => {
        mode = m;
        // Pointer routing: the OS is only clickable in 'monitor' mode; otherwise
        // the canvas takes clicks (to detect screen-clicks / drive orbit).
        canvas.style.pointerEvents = m === 'monitor' ? 'none' : 'auto';
        cssRenderer.domElement.style.pointerEvents = m === 'monitor' ? 'auto' : 'none';
        if (controls) controls.enabled = m === 'orbit';
        options.onModeChange?.(m);
    };

    // ---- Camera tweening ------------------------------------------------------
    const fromPos = new THREE.Vector3();
    const toPos = new THREE.Vector3();
    const fromFoc = new THREE.Vector3();
    const toFoc = new THREE.Vector3();
    const curFoc = new THREE.Vector3().copy(POSE.screen.foc);
    let tweening = false;
    let tweenStart = 0;
    let tweenDur = 0;
    let onTweenDone: (() => void) | undefined;
    let dirty = true;

    const startTween = (
        to: { pos: THREE.Vector3; foc: THREE.Vector3 },
        dur: number,
        done?: () => void
    ) => {
        fromPos.copy(camera.position);
        toPos.copy(to.pos);
        fromFoc.copy(curFoc);
        toFoc.copy(to.foc);
        tweenStart = performance.now();
        tweenDur = dur;
        onTweenDone = done;
        tweening = true;
        dirty = true;
    };

    // ---- Free-look orbit controls ---------------------------------------------
    let controls: OrbitControls | null = null;
    const ensureControls = () => {
        if (controls) return controls;
        controls = new OrbitControls(camera, canvas);
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.rotateSpeed = 0.5;
        controls.minDistance = 2500;
        controls.maxDistance = 26000;
        controls.maxPolarAngle = Math.PI / 2.05;
        controls.enabled = false;
        controls.addEventListener('change', () => {
            dirty = true;
        });
        return controls;
    };

    // ---- Screen-click to enter the monitor (only from desk) -------------------
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const onCanvasPointerDown = (e: PointerEvent) => {
        if (mode !== 'desk') return;
        ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
        ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.intersectObject(occluder, false).length > 0) {
            enterMonitor();
        }
    };
    canvas.addEventListener('pointerdown', onCanvasPointerDown);

    // ---- Ambient office audio (on from the moment you arrive) -----------------
    //
    // Eight recordings (public/audio/step-outside/), one picked at random each
    // time the room is entered, so it doesn't sound identical on every visit.
    // Looping is done by hand rather than with the `loop` attribute, because a
    // native loop can't be faded across its own seam — see `loopEnvelope` below,
    // which fades the last two seconds out and the first two back in every time
    // it wraps, so the restart reads as a breath rather than a splice.
    //
    // Volume is routed through a Web Audio GainNode instead of the element's own
    // `.volume`. iPhone Safari (not iPad, not Mac) ignores `.volume` on inline
    // media entirely — the hardware buttons are the only thing allowed to
    // change loudness there — so anything driven by that property is silently
    // stuck at full scale on exactly the device this most needed to be quiet
    // on. A GainNode sits downstream of that restriction and is honoured
    // everywhere.
    //
    // The eight files were peak-matched to a common, deliberately quiet
    // ceiling before they were ever added to the repo (attenuation only —
    // the quietest of the eight set the ceiling, so nothing was boosted past
    // its own original level). Everything from here on is fades and muting:
    // this only ever turns them down further, never back up past that.
    const TRACK_COUNT = 8;
    const track = 1 + Math.floor(Math.random() * TRACK_COUNT);
    const audio = new Audio(
        `${PUBLIC}/audio/step-outside/Office_Background_Sounds_${track}.mp3`
    );
    audio.preload = 'auto';

    let audioCtx: AudioContext | null = null;
    let gainNode: GainNode | null = null;
    try {
        const AudioCtxCtor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;
        if (AudioCtxCtor) {
            audioCtx = new AudioCtxCtor();
            const source = audioCtx.createMediaElementSource(audio);
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 0;
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);
        }
    } catch {
        // No Web Audio API at all (very old browser). `applyGain` below falls
        // back to the element's own volume rather than staying silent.
    }

    /** How long the top and tail of every loop take to fade, in seconds. */
    const LOOP_FADE_S = 2;
    /** How often the fade/loop envelope is recalculated. */
    const ENVELOPE_POLL_S = 0.05;

    let wantSound = true;
    /** Eases toward 0 (muted) or 1 (unmuted) — the room-level fade. */
    let muteLevel = 0;
    let muteTarget = 0;

    /** Where the current loop sits in its own fade-in/fade-out, 0..1. */
    const loopEnvelope = (): number => {
        const dur = audio.duration;
        if (!isFinite(dur) || dur <= 0) return 1;
        const fade = Math.min(LOOP_FADE_S, dur / 2);
        if (fade <= 0) return 1;
        const distanceFromEdge = Math.min(audio.currentTime, dur - audio.currentTime);
        return Math.max(0, Math.min(1, distanceFromEdge / fade));
    };

    const applyGain = () => {
        muteLevel += (muteTarget - muteLevel) * 0.12;
        if (Math.abs(muteTarget - muteLevel) < 0.002) muteLevel = muteTarget;

        const g = muteLevel * loopEnvelope();
        if (gainNode && audioCtx) {
            gainNode.gain.linearRampToValueAtTime(
                g,
                audioCtx.currentTime + ENVELOPE_POLL_S
            );
        } else {
            audio.volume = g;
        }

        // Fully faded out and staying that way: stop decoding rather than
        // idling a paused-but-loaded stream.
        if (muteLevel === 0 && muteTarget === 0 && !audio.paused) audio.pause();
    };
    const envelopeTimer = window.setInterval(applyGain, ENVELOPE_POLL_S * 1000);

    // Restart in place on end rather than the `loop` attribute — see above.
    audio.addEventListener('ended', () => {
        audio.currentTime = 0;
        if (wantSound) startPlayback();
    });

    // Autoplay policies can still refuse the first play() even though a click
    // opened the experience — iOS is strict about how far from the gesture the
    // call happens. Rather than silently failing, arm a one-shot listener so the
    // room finds its voice on the very next touch.
    const gestureEvents = ['pointerdown', 'touchend', 'keydown'] as const;
    let unlockArmed = false;
    const clearUnlock = () => {
        unlockArmed = false;
        gestureEvents.forEach((t) => window.removeEventListener(t, onUnlockGesture, true));
    };
    function onUnlockGesture() {
        clearUnlock();
        if (wantSound) startPlayback();
    }
    const armUnlock = () => {
        if (unlockArmed) return;
        unlockArmed = true;
        gestureEvents.forEach((t) => window.addEventListener(t, onUnlockGesture, true));
    };
    const startPlayback = () => {
        audioCtx?.resume();
        const p = audio.play();
        if (p && typeof p.catch === 'function') p.catch(armUnlock);
    };

    const setMuted = (muted: boolean) => {
        wantSound = !muted;
        muteTarget = muted ? 0 : 1;
        if (muted) clearUnlock();
        else startPlayback();
    };

    // Start the fade-in immediately: the click that opened the room is the most
    // recent user gesture we'll ever have, so this is the best shot at playing.
    setMuted(false);

    // ---- Dimmer (off-axis darkening), allocation-free -------------------------
    const screenNormal = new THREE.Vector3(0, 0, 1).applyEuler(SCREEN.rot);
    const tmpView = new THREE.Vector3();
    const updateDimmer = () => {
        tmpView.copy(camera.position).sub(SCREEN.pos).normalize();
        const dot = THREE.MathUtils.clamp(tmpView.dot(screenNormal), 0, 1);
        dimmerMat.opacity = (1 - dot) * 0.75;
    };

    // ---- Render-on-demand loop ------------------------------------------------
    let raf = 0;
    let running = true;

    const tick = () => {
        if (!running) return;
        raf = requestAnimationFrame(tick);

        if (tweening) {
            const t = tweenDur > 0 ? Math.min((performance.now() - tweenStart) / tweenDur, 1) : 1;
            const e = easeInOutCubic(t);
            camera.position.lerpVectors(fromPos, toPos, e);
            curFoc.lerpVectors(fromFoc, toFoc, e);
            camera.lookAt(curFoc);
            dirty = true;
            if (t >= 1) {
                tweening = false;
                const done = onTweenDone;
                onTweenDone = undefined;
                done?.();
            }
        } else if (mode === 'orbit' && controls) {
            if (controls.update()) dirty = true;
        }

        if (dirty) {
            updateDimmer();
            renderer.render(scene, camera);
            cssRenderer.render(cssScene, camera);
            // Keep drawing while animating; otherwise settle and idle the loop.
            if (!tweening && mode !== 'orbit') dirty = false;
        }
    };

    // ---- Public API -----------------------------------------------------------
    const enterIntro = (onSettled?: () => void) => {
        camera.position.copy(POSE.screen.pos);
        curFoc.copy(POSE.screen.foc);
        camera.lookAt(curFoc);
        startTween(POSE.desk, reduced ? 900 : 2200, () => {
            setMode('desk');
            onSettled?.();
        });
    };

    function enterMonitor() {
        if (mode === 'monitor') return;
        setMode('loading'); // lock interaction routing during the move
        startTween(POSE.monitor, reduced ? 500 : 900, () => setMode('monitor'));
    }

    const backToDesk = () => {
        if (mode === 'desk') return;
        resetView();
    };

    /** Unconditional "put me back in front of the monitor" — the Enter/Space key. */
    function resetView() {
        if (controls) controls.enabled = false;
        setMode('loading');
        startTween(POSE.desk, reduced ? 500 : 900, () => setMode('desk'));
    }

    const setFreeLook = (on: boolean) => {
        if (on) {
            const c = ensureControls();
            c.target.copy(POSE.orbit.foc);
            setMode('loading');
            startTween(POSE.orbit, reduced ? 500 : 900, () => {
                c.target.copy(POSE.orbit.foc);
                c.update();
                setMode('orbit');
            });
        } else {
            backToDesk();
        }
    };

    const exit = (onDone?: () => void) => {
        if (controls) controls.enabled = false;
        setMode('loading');
        startTween(POSE.screen, reduced ? 600 : 1100, onDone);
    };

    const resize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
        cssRenderer.setSize(w, h);
        dirty = true;
    };

    const onVisibility = () => {
        if (document.hidden) {
            running = false;
            cancelAnimationFrame(raf);
        } else if (!running) {
            running = true;
            dirty = true;
            raf = requestAnimationFrame(tick);
        }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(tick);

    const dispose = () => {
        running = false;
        cancelAnimationFrame(raf);
        window.clearInterval(envelopeTimer);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.removeEventListener('pointerdown', onCanvasPointerDown);
        framedDoc?.removeEventListener('keydown', onFramedKey);
        clearUnlock();

        audio.pause();
        audio.src = '';
        gainNode?.disconnect();
        audioCtx?.close().catch(() => {});
        controls?.dispose();
        dracoLoader.dispose();

        cssObject.element.remove();
        cssRenderer.domElement.remove();

        scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
        });
        disposables.forEach((d) => d.dispose());
        (occluder.material as THREE.Material).dispose();
        renderer.dispose();
    };

    return {
        enterIntro,
        exit,
        backToDesk,
        resetView,
        setFreeLook,
        setMuted,
        getMode: () => mode,
        resize,
        dispose,
    };
}
