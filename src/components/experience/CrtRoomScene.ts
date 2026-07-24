import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

/**
 * CrtRoomScene
 * -------------
 * A dependency-light Three.js scene: a lone CRT monitor glowing in a dark studio
 * room. The camera begins *inside* the screen (so the screen's teal glow fills the
 * frame — this is what lets the 2D->3D handoff feel seamless) and dollies back to
 * reveal the room, then hands off to a look-only orbit controller. Everything is
 * built from primitives + a CanvasTexture, so no external assets are needed.
 *
 * The intro and the free-look share ONE spherical camera model, so the handoff has
 * no snap: the intro just animates the same (radius, phi, theta) the user then drives.
 */

export interface CrtRoomOptions {
    /** Base accent colour of the desktop (its teal), used for the screen + glow. */
    accent: string;
    /** Shorten/soften motion for users who prefer reduced motion. */
    reducedMotion?: boolean;
}

export interface CrtRoomController {
    /** Play the dolly-back reveal. onSettled fires once free-look takes over. */
    enterIntro: (onSettled?: () => void) => void;
    /** Reverse: dolly back into the screen, then fire onDone (glow should cover). */
    exit: (onDone?: () => void) => void;
    /** Toggle the ambient hum (first unmute resumes the AudioContext). */
    setMuted: (muted: boolean) => void;
    resize: () => void;
    dispose: () => void;
}

// Rest pose the camera settles into after the intro (spherical around the screen).
const REST = { radius: 3.4, phi: 1.34, theta: 0.28 };
// Start pose: essentially at the screen surface, looking straight in.
const START = { radius: 0.32, phi: Math.PI / 2, theta: 0 };

const easeInOutCubic = (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05080a);
    scene.fog = new THREE.Fog(0x05080a, 2.5, 15);

    const camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        0.05,
        100
    );

    // Everything orbits/looks at the screen centre (world origin).
    const orbitTarget = new THREE.Vector3(0, 0, 0);

    // ---- Room -----------------------------------------------------------------
    const room = new THREE.Mesh(
        new THREE.BoxGeometry(22, 13, 22),
        new THREE.MeshStandardMaterial({
            color: 0x0b0f10,
            roughness: 1,
            metalness: 0,
            side: THREE.BackSide,
        })
    );
    room.position.set(0, 4, -3);
    scene.add(room);

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(24, 24),
        new THREE.MeshStandardMaterial({ color: 0x0a0d0e, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.4;
    scene.add(floor);

    // ---- Desk -----------------------------------------------------------------
    const desk = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.3, 2.4),
        new THREE.MeshStandardMaterial({ color: 0x161210, roughness: 0.85 })
    );
    desk.position.set(0, -0.55, 0.1);
    scene.add(desk);

    // ---- CRT monitor ----------------------------------------------------------
    const monitor = new THREE.Group();
    scene.add(monitor);

    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x3b3a34,
        roughness: 0.7,
        metalness: 0.1,
    });

    // Main body (tapered look faked with a box) — front face sits at z = 0.
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.42, 1.15), bodyMat);
    body.position.set(0, 0, -0.55);
    monitor.add(body);

    // Bezel around the screen.
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.62, 1.24, 0.06), bodyMat);
    bezel.position.set(0, 0, 0.01);
    monitor.add(bezel);

    // Stand.
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.7), bodyMat);
    stand.position.set(0, -0.78, -0.45);
    monitor.add(stand);

    // ---- Screen (the key light) ----------------------------------------------
    const screenTexture = buildScreenTexture(accent);
    const screenMat = new THREE.MeshStandardMaterial({
        map: screenTexture,
        emissive: new THREE.Color(0xffffff),
        emissiveMap: screenTexture,
        emissiveIntensity: 1.35,
        roughness: 0.4,
        metalness: 0,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 1.06), screenMat);
    screen.position.set(0, 0, 0.05);
    monitor.add(screen);

    // Lift the monitor so it rests on the desk.
    monitor.position.y = 0.28;

    // ---- Lighting -------------------------------------------------------------
    scene.add(new THREE.AmbientLight(0x2a3638, 0.35));

    // The screen spills teal light into the room — the main source.
    const screenLight = new THREE.PointLight(accent.clone(), 2.6, 12, 2);
    screenLight.position.set(0, 0.3, 0.9);
    scene.add(screenLight);

    // Cool rim from behind to peel the monitor off the dark.
    const rim = new THREE.PointLight(0x304a6a, 0.6, 14, 2);
    rim.position.set(-3, 2.5, -4);
    scene.add(rim);

    // ---- Dust motes -----------------------------------------------------------
    const DUST = 500;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(DUST * 3);
    const dustSpeed = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
        dustPos[i * 3] = (Math.random() - 0.5) * 10;
        dustPos[i * 3 + 1] = Math.random() * 6 - 1.5;
        dustPos[i * 3 + 2] = (Math.random() - 0.5) * 8;
        dustSpeed[i] = 0.05 + Math.random() * 0.12;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(
        dustGeo,
        new THREE.PointsMaterial({
            color: accent.clone().lerp(new THREE.Color(0xffffff), 0.4),
            size: 0.03,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
        })
    );
    scene.add(dust);

    // ---- Post-processing (gentle bloom on the screen) -------------------------
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.85, // strength
        0.5, // radius
        0.82 // threshold — only the bright screen blooms
    );
    composer.addPass(bloom);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // ---- Camera model (shared by intro + free-look) ---------------------------
    // goal.* is where we want to be; cur.* is damped toward it every frame.
    const cur = { ...START };
    const goal = { ...START };
    let userTheta = REST.theta;
    let userPhi = REST.phi;

    type Mode = 'intro' | 'free' | 'exit';
    let mode: Mode = 'intro';
    let tweenStart = 0;
    let tweenDur = 0;
    const tweenFrom = { ...START };
    const tweenTo = { ...START };
    let onTweenDone: (() => void) | undefined;

    const startTween = (
        to: { radius: number; phi: number; theta: number },
        dur: number,
        done?: () => void
    ) => {
        tweenFrom.radius = cur.radius;
        tweenFrom.phi = cur.phi;
        tweenFrom.theta = cur.theta;
        tweenTo.radius = to.radius;
        tweenTo.phi = to.phi;
        tweenTo.theta = to.theta;
        tweenStart = performance.now();
        tweenDur = dur;
        onTweenDone = done;
    };

    const applyCamera = () => {
        const sinPhi = Math.sin(cur.phi);
        camera.position.set(
            orbitTarget.x + cur.radius * sinPhi * Math.sin(cur.theta),
            orbitTarget.y + cur.radius * Math.cos(cur.phi),
            orbitTarget.z + cur.radius * sinPhi * Math.cos(cur.theta)
        );
        camera.lookAt(orbitTarget);
    };
    applyCamera();

    // ---- Pointer look (only active in free mode) ------------------------------
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let idleTime = 0; // seconds since last user input, for auto-drift

    const onPointerDown = (e: PointerEvent) => {
        if (mode !== 'free') return;
        dragging = true;
        idleTime = 0;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
        if (!dragging || mode !== 'free') return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        idleTime = 0;
        userTheta -= dx * 0.005;
        userPhi -= dy * 0.005;
        userPhi = Math.max(0.65, Math.min(1.85, userPhi));
    };
    const onPointerUp = (e: PointerEvent) => {
        dragging = false;
        canvas.releasePointerCapture?.(e.pointerId);
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // ---- Ambient hum (WebAudio, no asset) -------------------------------------
    let audioCtx: AudioContext | null = null;
    let masterGain: GainNode | null = null;
    const buildAudio = () => {
        const Ctx =
            window.AudioContext ||
            (window as any).webkitAudioContext;
        if (!Ctx) return;
        audioCtx = new Ctx();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(audioCtx.destination);

        const mkOsc = (freq: number, gain: number) => {
            const osc = audioCtx!.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const g = audioCtx!.createGain();
            g.gain.value = gain;
            osc.connect(g).connect(masterGain!);
            osc.start();
        };
        mkOsc(58, 0.6); // deep room tone
        mkOsc(87.2, 0.25); // slightly detuned fifth-ish for CRT "presence"
        mkOsc(120, 0.08); // faint high whine

        // Slow breathing on the master via an LFO.
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 0.12;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 0.04;
        lfo.connect(lfoGain).connect(masterGain.gain);
        lfo.start();
    };

    const setMuted = (muted: boolean) => {
        if (!audioCtx) buildAudio();
        if (!audioCtx || !masterGain) return;
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setTargetAtTime(muted ? 0 : 0.09, now, 0.6);
    };

    // ---- Render loop ----------------------------------------------------------
    let raf = 0;
    let running = true;
    let last = performance.now();

    const baseEmissive = 1.35;
    const baseLight = 2.6;

    const tick = () => {
        if (!running) return;
        raf = requestAnimationFrame(tick);
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;

        // --- Camera state machine ---
        if (mode === 'intro' || mode === 'exit') {
            const t = tweenDur > 0 ? Math.min((now - tweenStart) / tweenDur, 1) : 1;
            const e = easeInOutCubic(t);
            cur.radius = lerp(tweenFrom.radius, tweenTo.radius, e);
            cur.phi = lerp(tweenFrom.phi, tweenTo.phi, e);
            cur.theta = lerp(tweenFrom.theta, tweenTo.theta, e);
            applyCamera();
            if (t >= 1) {
                const done = onTweenDone;
                onTweenDone = undefined;
                if (mode === 'intro') {
                    mode = 'free';
                    userTheta = cur.theta;
                    userPhi = cur.phi;
                }
                done && done();
            }
        } else {
            // free-look: gentle idle drift, damped toward user goal
            idleTime += dt;
            if (idleTime > 2.5 && !dragging) {
                userTheta += Math.sin(now * 0.00013) * 0.00035;
            }
            goal.radius = REST.radius;
            goal.theta = userTheta;
            goal.phi = userPhi;
            const k = 1 - Math.pow(0.0015, dt); // frame-rate independent damping
            cur.radius = lerp(cur.radius, goal.radius, k);
            cur.theta = lerp(cur.theta, goal.theta, k);
            cur.phi = lerp(cur.phi, goal.phi, k);
            applyCamera();
        }

        // --- CRT flicker: subtle, organic ---
        const flicker =
            0.92 +
            0.05 * Math.sin(now * 0.02) +
            0.03 * Math.sin(now * 0.11) +
            (Math.random() - 0.5) * 0.015;
        screenMat.emissiveIntensity = baseEmissive * flicker;
        screenLight.intensity = baseLight * flicker;

        // --- Dust drift ---
        const p = dustGeo.attributes.position as THREE.BufferAttribute;
        const arr = p.array as Float32Array;
        for (let i = 0; i < DUST; i++) {
            arr[i * 3 + 1] += dustSpeed[i] * dt;
            arr[i * 3] += Math.sin(now * 0.0003 + i) * 0.0006;
            if (arr[i * 3 + 1] > 4.5) arr[i * 3 + 1] = -1.5;
        }
        p.needsUpdate = true;

        composer.render();
    };

    // ---- Public controls ------------------------------------------------------
    const enterIntro = (onSettled?: () => void) => {
        mode = 'intro';
        cur.radius = START.radius;
        cur.phi = START.phi;
        cur.theta = START.theta;
        applyCamera();
        startTween(REST, reduced ? 1200 : 3600, onSettled);
    };

    const exit = (onDone?: () => void) => {
        mode = 'exit';
        // Dolly back into the screen; caller's glow covers the last stretch.
        startTween(START, reduced ? 700 : 1500, onDone);
    };

    const resize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(w, h);
        composer.setSize(w, h);
    };

    const onVisibility = () => {
        if (document.hidden) {
            running = false;
            cancelAnimationFrame(raf);
        } else if (!running) {
            running = true;
            last = performance.now();
            raf = requestAnimationFrame(tick);
        }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize);

    // Kick off.
    raf = requestAnimationFrame(tick);

    const dispose = () => {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);

        scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            const mat = (mesh as any).material;
            if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose());
            else if (mat) (mat as THREE.Material).dispose();
        });
        screenTexture.dispose();
        bloom.dispose();
        composer.dispose();
        renderer.dispose();

        if (audioCtx) {
            audioCtx.close().catch(() => undefined);
            audioCtx = null;
        }
    };

    return { enterIntro, exit, setMuted, resize, dispose };
}

/**
 * Draws the CRT's face onto a canvas: a soft teal glow, scanlines, a vignette and
 * a few faint window-ish shapes so it reads as "a desktop" without being literal.
 */
function buildScreenTexture(accent: THREE.Color): THREE.CanvasTexture {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;

    const hex = `#${accent.getHexString()}`;
    const bright = `#${accent.clone().lerp(new THREE.Color(0xffffff), 0.35).getHexString()}`;
    const dark = `#${accent.clone().multiplyScalar(0.4).getHexString()}`;

    // Base radial glow.
    const grad = ctx.createRadialGradient(
        size / 2,
        size * 0.42,
        30,
        size / 2,
        size / 2,
        size * 0.75
    );
    grad.addColorStop(0, bright);
    grad.addColorStop(0.55, hex);
    grad.addColorStop(1, dark);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Faint "window" rectangles, echoing the OS underneath.
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(size * 0.16, size * 0.2, size * 0.4, size * 0.28);
    ctx.fillRect(size * 0.45, size * 0.5, size * 0.4, size * 0.26);
    ctx.globalAlpha = 1;

    // Scanlines.
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#000000';
    for (let y = 0; y < size; y += 3) {
        ctx.fillRect(0, y, size, 1);
    }
    ctx.globalAlpha = 1;

    // Vignette.
    const vig = ctx.createRadialGradient(
        size / 2,
        size / 2,
        size * 0.3,
        size / 2,
        size / 2,
        size * 0.72
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
}
