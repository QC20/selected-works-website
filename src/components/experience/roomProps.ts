import * as THREE from 'three';

/**
 * The one thing that ties the room to this OS rather than to whoever's
 * screen it used to be: a soft turquoise wash behind the monitor, echoing
 * the desktop's own accent colour. Real bias lighting (an LED strip stuck
 * behind a monitor) is a look anyone who has sat at a desk after dark will
 * recognise, and it costs one canvas-generated glow texture and a plane.
 *
 * `MeshBasicMaterial` throughout, matching every other surface in this
 * scene — there are no lights here, so anything lit would render pure black.
 */

const TURQUOISE = 0x3e9697;

/** Just behind the monitor housing (its own back face sits at world z ≈ -732). */
const GLOW_Z = -732 - 760;

export function addPersonalTouches(
    scene: THREE.Scene,
    disposables: Array<{ dispose: () => void }>
): void {
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
    const glowTex = new THREE.CanvasTexture(c);
    disposables.push(glowTex);

    const material = new THREE.MeshBasicMaterial({
        map: glowTex,
        color: TURQUOISE,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
    disposables.push(material);

    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3400, 2600), material);
    glow.position.set(0, 950, GLOW_Z);
    scene.add(glow);
}
