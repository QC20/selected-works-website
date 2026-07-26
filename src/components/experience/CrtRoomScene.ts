import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * CrtRoomScene
 * -------------
 * Loads Henry Heffernan's room (environment / computer / decor GLB models with
 * baked-lighting textures) and plays a cinematic fly-in toward the computer,
 * then hands off to a look-only orbit for pure atmosphere.
 *
 * Henry's assets are MIT-licensed; his copyright/permission notice is retained in
 * `public/henry/LICENSE-henry-heffernan.md`. The models live in a huge coordinate
 * space (meshes are scaled x900, camera FOV 35, units in the thousands), so all of
 * the poses below are in *his* world units. Baked lighting means the models use an
 * unlit MeshBasicMaterial — no scene lights are required.
 *
 * The seamless 2D->3D handoff is owned by Experience3D's teal glow; this module
 * just needs to be *ready* (models loaded) before the glow lifts.
 */

export interface CrtRoomOptions {
    /** Base accent colour of the desktop (its teal), used for the screen glow. */
    accent: string;
    /** Shorten/soften motion for users who prefer reduced motion. */
    reducedMotion?: boolean;
    /** Fires once the models are loaded and the first frame is drawn. */
    onReady?: () => void;
    /** Fires if loading fails, so the caller can bail gracefully. */
    onError?: (err: unknown) => void;
}

export interface CrtRoomController {
    /** Play the fly-in toward the computer. onSettled fires as free-look begins. */
    enterIntro: (onSettled?: () => void) => void;
    /** Reverse: push toward the screen, then fire onDone (glow should cover). */
    exit: (onDone?: () => void) => void;
    /** Toggle the office ambience (first unmute needs a user gesture). */
    setMuted: (muted: boolean) => void;
    resize: () => void;
    dispose: () => void;
}

const PUBLIC = process.env.PUBLIC_URL || '';
const BASE = `${PUBLIC}/henry`;
const MODEL_SCALE = 900;

// Camera poses, in Henry's world units (position + look-at focal point).
const POSE = {
    // A wide, slightly elevated first look at the room.
    introStart: { pos: new THREE.Vector3(-13000, 9000, 16000), foc: new THREE.Vector3(0, 200, 0) },
    // Settled "desk" framing of the computer — where free-look begins.
    rest: { pos: new THREE.Vector3(0, 1800, 5500), foc: new THREE.Vector3(0, 500, 0) },
    // Pushed in toward the screen for the exit (glow covers the last stretch).
    exit: { pos: new THREE.Vector3(0, 950, 1500), foc: new THREE.Vector3(0, 950, 255) },
};

const easeInOutCubic = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function createCrtRoomScene(
    canvas: HTMLCanvasElement,
    options: CrtRoomOptions
): CrtRoomController {
    const accent = new THREE.Color(options.accent);
    const reduced = !!options.reducedMotion;

    // ---- Renderer -------------------------------------------------------------
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x140f0c);

    const camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        10,
        900000
    );
    camera.position.copy(POSE.introStart.pos);
    camera.lookAt(POSE.introStart.foc);

    // A subtle glowing screen tied to the desktop's teal, so the monitor reads as
    // "on" and the transition colour continues into the room.
    const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1150, 920),
        new THREE.MeshBasicMaterial({ color: accent.clone().multiplyScalar(1.15) })
    );
    screen.position.set(0, 950, 258);
    screen.rotation.x = -3 * THREE.MathUtils.DEG2RAD;
    scene.add(screen);

    // ---- Model loading --------------------------------------------------------
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(`${BASE}/draco/`);
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
    const textureLoader = new THREE.TextureLoader();

    const disposables: Array<{ dispose: () => void }> = [];

    const loadBaked = (
        modelPath: string,
        texturePath: string
    ): Promise<THREE.Group> =>
        new Promise((resolve, reject) => {
            const texture = textureLoader.load(texturePath, undefined, undefined, reject);
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

    let ready = false;
    Promise.all([
        loadBaked(
            `${BASE}/models/World/environment.glb`,
            `${BASE}/models/World/baked_environment.jpg`
        ),
        loadBaked(
            `${BASE}/models/Computer/computer_setup.glb`,
            `${BASE}/models/Computer/baked_computer.jpg`
        ),
        loadBaked(
            `${BASE}/models/Decor/decor.glb`,
            `${BASE}/models/Decor/baked_decor_modified.jpg`
        ),
    ])
        .then((groups) => {
            groups.forEach((g) => scene.add(g));
            ready = true;
            options.onReady?.();
        })
        .catch((err) => {
            options.onError?.(err);
        });

    // ---- Camera state machine -------------------------------------------------
    type Mode = 'idle' | 'intro' | 'free' | 'exit';
    let mode: Mode = 'idle';

    const fromPos = new THREE.Vector3();
    const toPos = new THREE.Vector3();
    const fromFoc = new THREE.Vector3();
    const toFoc = new THREE.Vector3();
    const curFoc = new THREE.Vector3().copy(POSE.introStart.foc);
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

    // Look-only orbit for the atmospheric free-look phase.
    let controls: OrbitControls | null = null;
    const enableControls = () => {
        controls = new OrbitControls(camera, canvas);
        controls.target.copy(POSE.rest.foc);
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.rotateSpeed = 0.4;
        controls.autoRotate = true;
        controls.autoRotateSpeed = reduced ? 0 : 0.25;
        controls.minPolarAngle = 0.25;
        controls.maxPolarAngle = Math.PI / 2.05;
        controls.update();
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

    // ---- Render loop ----------------------------------------------------------
    let raf = 0;
    let running = true;

    const tick = () => {
        if (!running) return;
        raf = requestAnimationFrame(tick);

        if (mode === 'intro' || mode === 'exit') {
            const t = tweenDur > 0 ? Math.min((performance.now() - tweenStart) / tweenDur, 1) : 1;
            const e = easeInOutCubic(t);
            camera.position.lerpVectors(fromPos, toPos, e);
            curFoc.lerpVectors(fromFoc, toFoc, e);
            camera.lookAt(curFoc);
            if (t >= 1) {
                const done = onTweenDone;
                onTweenDone = undefined;
                if (mode === 'intro') {
                    mode = 'free';
                    enableControls();
                }
                done?.();
            }
        } else if (mode === 'free' && controls) {
            controls.update();
        }

        // Gentle CRT flicker on the screen colour.
        const f = 0.95 + 0.05 * Math.sin(performance.now() * 0.02) + (Math.random() - 0.5) * 0.02;
        (screen.material as THREE.MeshBasicMaterial).color
            .copy(accent)
            .multiplyScalar(1.15 * f);

        renderer.render(scene, camera);
    };

    // ---- Public controls ------------------------------------------------------
    const enterIntro = (onSettled?: () => void) => {
        mode = 'intro';
        camera.position.copy(POSE.introStart.pos);
        curFoc.copy(POSE.introStart.foc);
        camera.lookAt(curFoc);
        startTween(POSE.rest, reduced ? 1400 : 4500, onSettled);
    };

    const exit = (onDone?: () => void) => {
        if (controls) {
            controls.dispose();
            controls = null;
        }
        mode = 'exit';
        startTween(POSE.exit, reduced ? 700 : 1400, onDone);
    };

    const resize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
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

        audio.pause();
        audio.src = '';
        controls?.dispose();
        dracoLoader.dispose();

        scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
        });
        disposables.forEach((d) => d.dispose());
        (screen.material as THREE.Material).dispose();
        renderer.dispose();

        // Silence "unused" while keeping the flag meaningful for future guards.
        void ready;
    };

    return { enterIntro, exit, setMuted, resize, dispose };
}
