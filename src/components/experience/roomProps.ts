import * as THREE from 'three';

/**
 * The things that make this Jonas's room and not the room it was borrowed
 * from.
 * ---------------------------------------------------------------------
 * Everything the baked models shipped with is still here — the desk, the
 * CRT, the coffee, the plant. This module adds the handful of things that
 * couldn't have come with them, because they're specific to the person the
 * portfolio is about:
 *
 *   - one of his real oil paintings, on a floor easel, cropped from the
 *     photo in the showcase's own Art project (`public/room/props/painting.jpg`)
 *   - a small stack of records leaning against it, for the five years DJing
 *   - a two-line LCD readout on the desk, the same blue-on-black panel his
 *     Tromino project runs Tetris on, cycling a few short lines
 *   - a soft turquoise wash behind the monitor, the desktop's own accent
 *     colour bleeding into the room it sits in
 *
 * All flat-shaded `MeshBasicMaterial`, matching every other surface in this
 * scene — there are no lights here, so anything lit would render pure black.
 * All positioned from the *real* bounding boxes of the loaded models (see
 * the coordinate notes below), not eyeballed, so nothing floats or clips.
 */

const DEG = THREE.MathUtils.DEG2RAD;
const TURQUOISE = 0x3e9697;

/**
 * Where things already are, in world units — measured directly from the GLB
 * files' vertex bounds (accessor min/max × the scene's MODEL_SCALE), not
 * guessed. New props are placed relative to these, so they land in the gaps
 * that are actually empty rather than through something that's already there.
 */
const LANDMARKS = {
    /** Hard Disk (C:) — desk's own footprint, tabletop near the top of this. */
    deskTop: -452,
    deskBounds: { xMin: -3587, xMax: 2481, zMin: -1146, zMax: 1639 },
    /** Where the floor actually is (desk legs and the chair both bottom out here). */
    floorY: -2980,
    /** The monitor housing, for the glow plane and the desk gadget's neighbour. */
    monitor: { xMax: 770, zMin: -732, zMax: 532 },
    /** The mug and the two dark uprights behind it — the desk gadget sits clear of both. */
    coffeeXMin: 1508,
};

export interface PersonalTouches {
    /** Advances the LCD's message cycle. Call once per render tick. */
    update: (nowMs: number) => void;
}

/**
 * Adds the personal set-dressing to `scene` and returns an `update` hook for
 * the one animated piece (the LCD readout).
 *
 * @param markDirty Tells the render-on-demand loop a frame is owed — the LCD
 * texture changes on its own clock, outside of any camera movement, so
 * without this its text would only advance while something else was also
 * forcing a redraw.
 */
export function addPersonalTouches(
    scene: THREE.Scene,
    disposables: Array<{ dispose: () => void }>,
    markDirty: () => void,
    baseUrl: string
): PersonalTouches {
    const own = <T extends { dispose: () => void }>(x: T): T => {
        disposables.push(x);
        return x;
    };

    // ---- The monitor's own bias light ---------------------------------------
    //
    // A soft turquoise wash on the wall behind the screen — the desktop's own
    // accent colour, bleeding out into the room it lives in. Real bias
    // lighting (an LED strip stuck behind a monitor) is a look anyone who has
    // sat at a desk after dark will recognise, and it's the cheapest possible
    // way to make the room feel like it belongs to this OS rather than to
    // whoever's screen this used to be.
    {
        const size = 256;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d')!;
        const g = ctx.createRadialGradient(
            size / 2,
            size / 2,
            0,
            size / 2,
            size / 2,
            size / 2
        );
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.55, 'rgba(255,255,255,0.4)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        const glowTex = own(new THREE.CanvasTexture(c));

        const glow = new THREE.Mesh(
            new THREE.PlaneGeometry(3400, 2600),
            own(
                new THREE.MeshBasicMaterial({
                    map: glowTex,
                    color: TURQUOISE,
                    transparent: true,
                    opacity: 0.2,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                })
            )
        );
        glow.position.set(0, 950, LANDMARKS.monitor.zMin - 760);
        scene.add(glow);
    }

    // ---- The easel corner: a real painting, and the records beside it -------
    //
    // Off to the left of the desk, on the floor — out of the tight "desk" shot
    // but there to be found the moment you look around the room, which is
    // exactly the payoff Look Around is for.
    {
        const corner = new THREE.Group();
        corner.position.set(-4750, LANDMARKS.floorY, 1150);
        scene.add(corner);

        const woodMat = own(
            new THREE.MeshBasicMaterial({ color: 0x8a6a45 })
        );

        // A tripod easel: two splayed front legs, one back leg, a ledge the
        // canvas rests its bottom edge on. All cylinders — there is no part of
        // an easel that isn't a stick.
        const leg = (
            height: number,
            tiltX: number,
            tiltZ: number,
            x: number,
            z: number
        ) => {
            const m = new THREE.Mesh(
                new THREE.CylinderGeometry(34, 34, height, 8),
                woodMat
            );
            m.position.set(x, height / 2, z);
            m.rotation.set(tiltX, 0, tiltZ);
            corner.add(m);
        };
        leg(2500, 0, 14 * DEG, -260, 60);
        leg(2500, 0, -14 * DEG, 260, 60);
        leg(2750, -16 * DEG, 0, 0, -420);

        const ledge = new THREE.Mesh(
            new THREE.BoxGeometry(760, 60, 90),
            woodMat
        );
        ledge.position.set(0, 980, 140);
        corner.add(ledge);

        // The painting itself — cropped from the real canvas photographed on
        // its easel in the showcase's Art project (see the module comment).
        const paintingTex = own(
            new THREE.TextureLoader().load(`${baseUrl}/props/painting.jpg`)
        );
        paintingTex.colorSpace = THREE.SRGBColorSpace;
        const canvas = new THREE.Mesh(
            new THREE.PlaneGeometry(1900, 1900),
            own(new THREE.MeshBasicMaterial({ map: paintingTex }))
        );
        // Leaned back against the easel, the way a wet canvas actually sits.
        canvas.position.set(0, 1930, 40);
        canvas.rotation.x = -7 * DEG;
        corner.add(canvas);

        // A plain board on the back, so the room doesn't show a paper-thin
        // painting when seen from behind in free look.
        const back = new THREE.Mesh(
            new THREE.PlaneGeometry(1900, 1900),
            own(new THREE.MeshBasicMaterial({ color: 0xcfc6b4 }))
        );
        back.position.copy(canvas.position);
        back.rotation.set(-7 * DEG, Math.PI, 0);
        corner.add(back);

        // ---- Records, leaning against the front leg -----------------------
        //
        // Five years DJing with Dubkultur gets a stack of vinyl on the floor,
        // not a plaque. Grooves and a label, drawn once and reused for every
        // record — real sleeves would all look the same at this distance
        // anyway.
        const recordTex = own(makeRecordTexture());
        const edgeMat = own(new THREE.MeshBasicMaterial({ color: 0x161616 }));
        const faceMat = own(new THREE.MeshBasicMaterial({ map: recordTex }));
        const sleeveMat = own(new THREE.MeshBasicMaterial({ color: 0x2a2a2a }));

        const RECORD_R = 560;
        [0, 1, 2].forEach((i) => {
            const disc = new THREE.Mesh(
                new THREE.CylinderGeometry(RECORD_R, RECORD_R, 24, 40),
                [edgeMat, faceMat, faceMat]
            );
            // A cylinder's caps face along its *axis*, which starts on Y (lying
            // flat, caps up/down). Rotating that axis around X sweeps it from Y
            // towards Z as the angle approaches 90° — so 90° exactly stands the
            // disc up facing the camera dead-on, and anything a little short of
            // 90° leaves the axis tipped partway to Y again, which is exactly
            // what "standing up, but leaned back at the top" looks like. One
            // rotation gets both the stand-up and the lean; a separate rotateZ
            // step here would turn the disc side-on instead, chasing the wrong
            // axis (the mistake the first two passes at this both made).
            disc.rotateX((90 - (8 + i * 3)) * DEG);
            disc.position.set(-260 + i * 90, RECORD_R * 0.94, 520 - i * 40);
            corner.add(disc);

            // A sleeve tucked in behind each one — just enough of a second
            // silhouette that it doesn't read as a single flat coin.
            const sleeve = new THREE.Mesh(
                new THREE.BoxGeometry(1080, 1080, 26),
                sleeveMat
            );
            sleeve.rotation.copy(disc.rotation);
            sleeve.position.set(
                disc.position.x - 26,
                disc.position.y,
                disc.position.z - 40
            );
            corner.add(sleeve);
        });
    }

    // ---- The desk gadget: a two-line LCD, the way Tromino's does ------------
    //
    // Blue-on-black 16x2 character display, the exact panel a Tromino build
    // uses to run Tetris — parked here as a memento rather than a demo. It
    // cycles a short, dumb rotation of lines nobody needs to stop and read,
    // the way a real desk toy just sits there being slightly alive.
    const lcd = buildLcdGadget(own);
    // x=1150, not 1060: the monitor's own casing runs out to x=770, and the
    // screen panel is 560 wide, so 1060 left only a ~10-unit sliver of
    // clearance — enough for the monitor to visibly clip the left edge of the
    // display. 1150 gives it real breathing room on both sides (the coffee
    // cluster starts at x=1508). No turn on the group, either: the screen
    // faces forward, and a turn just gives the desk's shallow camera angle
    // another way to clip it.
    lcd.group.position.set(1150, LANDMARKS.deskTop, -180);
    scene.add(lcd.group);

    let nextSwitch = 0;
    let line = 0;
    const LINES: [string, string][] = [
        ['JONAS K.', 'SELECTED WORKS'],
        ['TROMINO', 'STILL TICKING'],
        ['DUBKULTUR', '5 YEARS ON DECKS'],
        ['STEP OUTSIDE', 'v2026'],
    ];

    const update = (nowMs: number) => {
        if (nowMs < nextSwitch) return;
        nextSwitch = nowMs + 4500;
        line = (line + 1) % LINES.length;
        lcd.write(LINES[line][0], LINES[line][1]);
        markDirty();
    };
    lcd.write(LINES[0][0], LINES[0][1]);

    return { update };
}

// ---- Helpers ------------------------------------------------------------------

/** A record's face: grooves, a spindle hole, a plain label. Drawn once. */
function makeRecordTexture(): THREE.CanvasTexture {
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;

    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Brighter than real vinyl sheen would be, on purpose: this disc is small,
    // leaning in a dim corner of a grainy scene, and the groove rings are the
    // one thing that reads "record" instead of "black coin" at that size — the
    // first pass was too subtle to survive the film grain over it.
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    for (let r = size * 0.16; r < size * 0.49; r += 5) {
        ctx.lineWidth = r % 15 < 5 ? 2.2 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // The label, sized to actually read as a label rather than a dot, with a
    // dark rim so it doesn't melt into the groove rings behind it.
    ctx.fillStyle = TURQUOISE_HEX;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#0c0c0c';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.02, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
const TURQUOISE_HEX = '#3e9697';

/** The desk gadget: base, shield, four buttons, and a small standing LCD panel. */
function buildLcdGadget(
    own: <T extends { dispose: () => void }>(x: T) => T
): { group: THREE.Group; write: (line1: string, line2: string) => void } {
    const group = new THREE.Group();

    const base = new THREE.Mesh(
        new THREE.BoxGeometry(640, 44, 400),
        own(new THREE.MeshBasicMaterial({ color: 0x1c3d1f })) // PCB green
    );
    base.position.y = 22;
    group.add(base);

    const shield = new THREE.Mesh(
        new THREE.BoxGeometry(600, 34, 360),
        own(new THREE.MeshBasicMaterial({ color: 0x141414 }))
    );
    shield.position.y = 44 + 17;
    group.add(shield);

    // Four little button studs, up front — cosmetic, but it's the detail that
    // sells "keypad shield" rather than "black box".
    const buttonMat = own(new THREE.MeshBasicMaterial({ color: 0x2b2b2b }));
    [-210, -70, 70, 210].forEach((x) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(60, 22, 60), buttonMat);
        b.position.set(x, 44 + 34 + 11, 130);
        group.add(b);
    });

    // The screen stands up in front of the shield, like a tiny monitor of its
    // own, rather than mounted flush on top of it. Flush-mounted and tilted
    // back, the shield's own front-top edge — much closer to camera — cut
    // across the lower half of the screen from the desk view's shallow angle;
    // there was no distance between the two for the camera to be forgiving
    // about. Standing proud in front of everything else in the gadget instead
    // means nothing on the gadget itself can ever occlude it.
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 256;
    screenCanvas.height = 64;
    const ctx = screenCanvas.getContext('2d')!;
    const texture = own(new THREE.CanvasTexture(screenCanvas));

    const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(560, 150),
        own(
            new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
            })
        )
    );
    screen.position.set(0, 210, 230);
    screen.rotation.x = -8 * DEG;
    group.add(screen);

    const write = (line1: string, line2: string) => {
        const w = screenCanvas.width;
        const h = screenCanvas.height;
        ctx.fillStyle = '#0b2f6b';
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += 3) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#bfe3ff';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText(pad16(line1), 10, h * 0.3);
        ctx.fillText(pad16(line2), 10, h * 0.72);
        texture.needsUpdate = true;
    };

    return { group, write };
}

/** 16 characters, like the real thing — padded or clipped, never wrapped. */
const pad16 = (s: string): string => (s + '                ').slice(0, 16);
