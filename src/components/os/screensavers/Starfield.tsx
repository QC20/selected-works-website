import React, { useEffect, useRef } from 'react';

/**
 * "Starfield Simulation" — the warp-speed one, of the handful of screen
 * savers that shipped with Windows 95 itself rather than a Plus! pack. Points
 * spawn at the centre and fly outward, speeding up and brightening as they
 * approach the edge, the way a real starfield's parallax would.
 */

interface Star {
    x: number;
    y: number;
    z: number;
}

const STAR_COUNT = 400;
const SPEED = 6;

const Starfield: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        let width = 0;
        let height = 0;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        const spawn = (): Star => ({
            x: (Math.random() - 0.5) * width,
            y: (Math.random() - 0.5) * height,
            z: Math.random() * width,
        });
        const stars: Star[] = Array.from({ length: STAR_COUNT }, spawn);

        let raf = 0;
        const tick = () => {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(0, 0, width, height);

            const cx = width / 2;
            const cy = height / 2;

            for (const star of stars) {
                const prevZ = star.z;
                star.z -= SPEED;
                if (star.z <= 1) {
                    Object.assign(star, spawn());
                    continue;
                }

                const scale = width / star.z;
                const x = cx + star.x * scale;
                const y = cy + star.y * scale;
                if (x < 0 || x > width || y < 0 || y > height) {
                    Object.assign(star, spawn());
                    continue;
                }

                const prevScale = width / prevZ;
                const px = cx + star.x * prevScale;
                const py = cy + star.y * prevScale;

                const brightness = Math.min(1, 1 - star.z / width);
                ctx.strokeStyle = `rgba(255,255,255,${0.3 + brightness * 0.7})`;
                ctx.lineWidth = Math.max(1, brightness * 2.2);
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(x, y);
                ctx.stroke();
            }

            raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return <canvas ref={canvasRef} style={styles.canvas} />;
};

const styles: StyleSheetCSS = {
    canvas: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block',
        background: '#000',
    },
};

export default Starfield;
