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
}

export interface CrtRoomController {
    enterIntro: (onSettled?: () => void) => void;
    exit: (onDone?: () => void) => void;
    backToDesk: () => void;
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

    // CRT snow over the screen — GPU-composited (transform/opacity), so it costs
    // almost nothing even when the 3D render loop is paused.
    const noise = document.createElement('div');
    noise.style.position = 'absolute';
    noise.style.top = '-25%';
    noise.style.left = '-25%';
    noise.style.width = '150%';
    noise.style.height = '150%';
    noise.style.pointerEvents = 'none';
    noise.style.mixBlendMode = 'screen';
    noise.style.backgroundRepeat = 'repeat';
    noise.style.backgroundImage = `url(${makeNoiseTile(128)})`;
    noise.style.willChange = 'transform, opacity';
    container.appendChild(noise);
    const noiseAnim = noise.animate(
        [
            { transform: 'translate3d(0,0,0)', opacity: 0.05 },
            { transform: 'translate3d(-9%, 5%, 0)', opacity: 0.11 },
            { transform: 'translate3d(7%, -7%, 0)', opacity: 0.04 },
            { transform: 'translate3d(-5%, 9%, 0)', opacity: 0.1 },
            { transform: 'translate3d(0,0,0)', opacity: 0.05 },
        ],
        { duration: 620, iterations: Infinity }
    );
    if (reduced) noiseAnim.pause();

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
    iframe.addEventListener('load', () => {
        iframeDone = true;
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
        if (controls) controls.enabled = false;
        setMode('loading');
        startTween(POSE.desk, reduced ? 500 : 900, () => setMode('desk'));
    };

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
        window.clearInterval(fadeTimer);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.removeEventListener('pointerdown', onCanvasPointerDown);
        noiseAnim.cancel();

        audio.pause();
        audio.src = '';
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
        setFreeLook,
        setMuted,
        getMode: () => mode,
        resize,
        dispose,
    };
}

/** A single grayscale-noise tile as a data URL (for the CRT snow overlay). */
function makeNoiseTile(size: number): string {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
}
