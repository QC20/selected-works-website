import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer';

/**
 * CrtRoomScene
 * -------------
 * Loads Henry Heffernan's room (environment / computer / decor GLB models with
 * baked-lighting textures) and embeds this site's *live* 2D desktop inside the
 * monitor as an interactive screen — the classic mixed CSS3D + WebGL technique:
 *
 *   - A CSS3DRenderer draws an <iframe> of the site, positioned in 3D exactly over
 *     the monitor's screen. Because it's real DOM, it's fully clickable.
 *   - A transparent WebGL renderer sits ON TOP; a "screen" plane rendered with
 *     NoBlending punches a hole so the iframe shows through, and room geometry in
 *     front still occludes it. Enclosing planes + a view-angle dimmer sell the
 *     "inside the CRT" depth. An animated noise layer gives the old-CRT snow.
 *
 * Camera choreography (per the brief):
 *   1. Start basically AT the screen (2D fills the frame; the teal glow bridges).
 *   2. Pop back out to a close-up where the monitor is usable.
 *   3. After ~5s of no interaction, drift further back to reveal the room, then
 *      settle into a gentle idle sway.
 *
 * Henry's assets + this technique are MIT-licensed; his notice is retained at
 * `public/henry/LICENSE-henry-heffernan.md`. His world is huge (meshes x900,
 * FOV 35, units in the thousands), so all poses below are in his world units.
 */

export interface CrtRoomOptions {
    accent: string;
    reducedMotion?: boolean;
    /** Full-screen container (behind the canvas) to host the CSS3D renderer. */
    cssContainer: HTMLElement;
    /** Fires once models AND the embedded OS iframe are loaded. */
    onReady?: () => void;
    onError?: (err: unknown) => void;
}

export interface CrtRoomController {
    enterIntro: (onSettled?: () => void) => void;
    exit: (onDone?: () => void) => void;
    setMuted: (muted: boolean) => void;
    resize: () => void;
    dispose: () => void;
}

const PUBLIC = process.env.PUBLIC_URL || '';
const BASE = `${PUBLIC}/henry`;
const MODEL_SCALE = 900;
const DEG = THREE.MathUtils.DEG2RAD;

// Monitor screen placement — Henry's exact numbers, so it fits his GLB monitor.
const SCREEN = {
    w: 1280,
    h: 1024,
    pos: new THREE.Vector3(0, 950, 255),
    rot: new THREE.Euler(-3 * DEG, 0, 0),
    pad: 32, // iframe inset within the bezel
};

// Camera poses (position + look-at focal point), in Henry's world units.
const POSE = {
    // Basically at the screen — the OS fills the frame at the crossover.
    screen: { pos: new THREE.Vector3(0, 950, 700), foc: new THREE.Vector3(0, 950, 0) },
    // Popped out: monitor is comfortably usable.
    monitor: { pos: new THREE.Vector3(0, 950, 2200), foc: new THREE.Vector3(0, 950, 0) },
    // Pulled back: the whole room is revealed.
    desk: { pos: new THREE.Vector3(0, 1850, 5600), foc: new THREE.Vector3(0, 600, 0) },
};

const IDLE_REVEAL_MS = 5000;

const easeInOutCubic = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const offset = (p: THREE.Vector3, dx: number, dy: number, dz: number) =>
    new THREE.Vector3(p.x + dx, p.y + dy, p.z + dz);

export function createCrtRoomScene(
    canvas: HTMLCanvasElement,
    options: CrtRoomOptions
): CrtRoomController {
    const reduced = !!options.reducedMotion;

    // ---- WebGL renderer (transparent, sits on top of the CSS layer) -----------
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.background = null; // transparent where no geometry, so CSS shows through

    const camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        10,
        900000
    );
    camera.position.copy(POSE.screen.pos);
    camera.lookAt(POSE.screen.foc);

    // ---- CSS3D renderer (the interactive OS lives here) -----------------------
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(window.innerWidth, window.innerHeight);
    cssRenderer.domElement.style.position = 'absolute';
    cssRenderer.domElement.style.top = '0';
    cssRenderer.domElement.style.left = '0';
    cssRenderer.domElement.style.pointerEvents = 'none';
    options.cssContainer.appendChild(cssRenderer.domElement);

    // The screen container + iframe (this very site, which auto-hides "Step
    // Outside" when it detects it's embedded).
    const container = document.createElement('div');
    container.style.width = SCREEN.w + 'px';
    container.style.height = SCREEN.h + 'px';
    container.style.position = 'relative';
    container.style.background = '#1d2e2f';

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

    // Old-CRT snow: a noise layer over the iframe (pointer-events: none).
    const noise = document.createElement('div');
    noise.style.position = 'absolute';
    noise.style.inset = '0';
    noise.style.pointerEvents = 'none';
    noise.style.mixBlendMode = 'screen';
    noise.style.opacity = reduced ? '0.05' : '0.09';
    noise.style.backgroundRepeat = 'repeat';
    noise.style.backgroundImage = `url(${makeNoiseDataUrl()})`;
    container.appendChild(noise);

    const cssScene = new THREE.Scene();
    const cssObject = new CSS3DObject(container);
    cssObject.position.copy(SCREEN.pos);
    cssObject.rotation.copy(SCREEN.rot);
    cssScene.add(cssObject);

    // ---- WebGL screen occluder + enclosing planes + dimmer --------------------
    // Occluder: transparent but with NoBlending, so it punches a hole in the
    // (otherwise opaque) WebGL frame and lets the CSS iframe show through.
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

    // Enclosing planes give the screen recessed "walls" so it reads as inside the
    // tube rather than a flat decal.
    const DEPTH = 90;
    const wallMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0x2b2c26 });
    const walls: Array<{ w: number; h: number; p: THREE.Vector3; r: THREE.Euler }> = [
        { w: DEPTH, h: SCREEN.h, p: offset(SCREEN.pos, -SCREEN.w / 2, 0, DEPTH / 2), r: new THREE.Euler(0, 90 * DEG, 0) },
        { w: DEPTH, h: SCREEN.h, p: offset(SCREEN.pos, SCREEN.w / 2, 0, DEPTH / 2), r: new THREE.Euler(0, 90 * DEG, 0) },
        { w: SCREEN.w, h: DEPTH, p: offset(SCREEN.pos, 0, SCREEN.h / 2, DEPTH / 2), r: new THREE.Euler(90 * DEG, 0, 0) },
        { w: SCREEN.w, h: DEPTH, p: offset(SCREEN.pos, 0, -SCREEN.h / 2, DEPTH / 2), r: new THREE.Euler(90 * DEG, 0, 0) },
    ];
    walls.forEach((wl) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(wl.w, wl.h), wallMat);
        m.position.copy(wl.p);
        m.rotation.copy(wl.r);
        scene.add(m);
    });

    // Dimmer: darkens the screen as you view it off-axis, like real glass.
    const dimmerMat = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        color: 0x000000,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0,
    });
    const dimmer = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), dimmerMat);
    dimmer.position.copy(offset(SCREEN.pos, 0, 0, DEPTH));
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

    iframe.addEventListener('load', () => {
        iframeDone = true;
        attachIframeIdleListeners();
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

    // ---- Idle tracking (drives the auto reveal) -------------------------------
    let lastInteraction = performance.now();
    const bumpIdle = () => {
        lastInteraction = performance.now();
    };
    const attachIframeIdleListeners = () => {
        // Same-origin iframe: we can listen to its input directly.
        try {
            const win = iframe.contentWindow;
            if (!win) return;
            win.addEventListener('pointerdown', bumpIdle, true);
            win.addEventListener('pointermove', bumpIdle, true);
            win.addEventListener('keydown', bumpIdle, true);
        } catch {
            /* cross-origin (shouldn't happen) — ignore */
        }
    };
    document.addEventListener('pointerdown', bumpIdle, true);

    // ---- Camera state machine -------------------------------------------------
    type Mode = 'idle' | 'intro' | 'interactive' | 'reveal' | 'drift' | 'exit';
    let mode: Mode = 'idle';

    const fromPos = new THREE.Vector3();
    const toPos = new THREE.Vector3();
    const fromFoc = new THREE.Vector3();
    const toFoc = new THREE.Vector3();
    const curFoc = new THREE.Vector3().copy(POSE.screen.foc);
    let tweenStart = 0;
    let tweenDur = 0;
    let onTweenDone: (() => void) | undefined;

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
    };

    const setCssInteractive = (on: boolean) => {
        cssRenderer.domElement.style.pointerEvents = on ? 'auto' : 'none';
    };

    // ---- Ambient office audio (muted by default) ------------------------------
    const audio = new Audio(`${BASE}/audio/office.mp3`);
    audio.loop = true;
    audio.volume = 0;
    let fadeTimer: number | undefined;
    const setMuted = (muted: boolean) => {
        window.clearInterval(fadeTimer);
        const target = muted ? 0 : 0.5;
        if (!muted) audio.play().catch(() => undefined);
        fadeTimer = window.setInterval(() => {
            const next = audio.volume + (target - audio.volume) * 0.12;
            audio.volume = Math.abs(next - target) < 0.01 ? target : next;
            if (audio.volume === target) {
                window.clearInterval(fadeTimer);
                if (muted) audio.pause();
            }
        }, 40);
    };

    // ---- Dimmer update (off-axis darkening) -----------------------------------
    const screenNormal = new THREE.Vector3(0, 0, 1).applyEuler(SCREEN.rot);
    const updateDimmer = () => {
        const view = new THREE.Vector3().copy(camera.position).sub(SCREEN.pos).normalize();
        const dot = THREE.MathUtils.clamp(view.dot(screenNormal), 0, 1);
        dimmerMat.opacity = (1 - dot) * 0.75;
    };

    // ---- Render loop ----------------------------------------------------------
    let raf = 0;
    let running = true;
    let noiseTick = 0;

    const tick = () => {
        if (!running) return;
        raf = requestAnimationFrame(tick);
        const now = performance.now();

        if (mode === 'intro' || mode === 'reveal' || mode === 'exit') {
            const t = tweenDur > 0 ? Math.min((now - tweenStart) / tweenDur, 1) : 1;
            const e = easeInOutCubic(t);
            camera.position.lerpVectors(fromPos, toPos, e);
            curFoc.lerpVectors(fromFoc, toFoc, e);
            camera.lookAt(curFoc);
            if (t >= 1) {
                const done = onTweenDone;
                onTweenDone = undefined;
                if (mode === 'intro') {
                    mode = 'interactive';
                    lastInteraction = now;
                    setCssInteractive(true);
                } else if (mode === 'reveal') {
                    mode = 'drift';
                }
                done?.();
            }
        } else if (mode === 'interactive') {
            if (now - lastInteraction > IDLE_REVEAL_MS) {
                setCssInteractive(false);
                mode = 'reveal';
                startTween(POSE.desk, reduced ? 1200 : 3200);
            }
        } else if (mode === 'drift') {
            // Gentle idle sway around the desk pose.
            const base = POSE.desk.pos;
            camera.position.set(
                base.x + Math.sin(now * 0.00019) * 500,
                base.y + Math.sin(now * 0.00013) * 260,
                base.z
            );
            curFoc.copy(POSE.desk.foc);
            camera.lookAt(curFoc);
        }

        updateDimmer();

        // Jitter the CRT snow.
        if (now - noiseTick > 45) {
            noiseTick = now;
            noise.style.backgroundPosition = `${(Math.random() * 100) | 0}px ${(Math.random() * 100) | 0}px`;
        }

        renderer.render(scene, camera);
        cssRenderer.render(cssScene, camera);
    };

    // ---- Public controls ------------------------------------------------------
    const enterIntro = (onSettled?: () => void) => {
        mode = 'intro';
        camera.position.copy(POSE.screen.pos);
        curFoc.copy(POSE.screen.foc);
        camera.lookAt(curFoc);
        startTween(POSE.monitor, reduced ? 700 : 1500, onSettled);
    };

    const exit = (onDone?: () => void) => {
        setCssInteractive(false);
        mode = 'exit';
        startTween(POSE.screen, reduced ? 600 : 1200, onDone);
    };

    const resize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
        cssRenderer.setSize(w, h);
    };

    const onVisibility = () => {
        if (document.hidden) {
            running = false;
            cancelAnimationFrame(raf);
        } else if (!running) {
            running = true;
            raf = requestAnimationFrame(tick);
        }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize);

    raf = requestAnimationFrame(tick);

    const dispose = () => {
        running = false;
        cancelAnimationFrame(raf);
        window.clearInterval(fadeTimer);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVisibility);
        document.removeEventListener('pointerdown', bumpIdle, true);

        audio.pause();
        audio.src = '';
        dracoLoader.dispose();

        try {
            const win = iframe.contentWindow;
            win?.removeEventListener('pointerdown', bumpIdle, true);
            win?.removeEventListener('pointermove', bumpIdle, true);
            win?.removeEventListener('keydown', bumpIdle, true);
        } catch {
            /* ignore */
        }

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

    return { enterIntro, exit, setMuted, resize, dispose };
}

/** Tiny grayscale-noise tile as a data URL, used for the CRT snow overlay. */
function makeNoiseDataUrl(): string {
    const s = 96;
    const c = document.createElement('canvas');
    c.width = s;
    c.height = s;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
}
