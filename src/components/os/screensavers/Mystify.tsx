import React, { useEffect, useRef } from 'react';

/**
 * "Mystify Your Mind" — a handful of vertices bouncing off the screen edges
 * like a DVD logo, connected into a polygon that leaves a fading trail behind
 * it. The colour drifts continuously rather than jumping between fixed
 * values, which is what actually reads as "mystifying" rather than just a
 * moving shape.
 */

interface Shape {
    points: { x: number; y: number; vx: number; vy: number }[];
    hue: number;
    hueSpeed: number;
}

const SHAPES = 2;
const VERTICES = 5;
const SPEED = 2.4;

const Mystify: React.FC = () => {
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

        const shapes: Shape[] = Array.from({ length: SHAPES }, (_, i) => ({
            hue: (360 / SHAPES) * i,
            hueSpeed: 0.4 + Math.random() * 0.3,
            points: Array.from({ length: VERTICES }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * SPEED * 2,
                vy: (Math.random() - 0.5) * SPEED * 2,
            })),
        }));

        let raf = 0;
        const tick = () => {
            // A translucent fill rather than a full clear is what leaves the
            // ghosting trail behind each polygon.
            ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
            ctx.fillRect(0, 0, width, height);

            for (const shape of shapes) {
                shape.hue = (shape.hue + shape.hueSpeed) % 360;
                for (const p of shape.points) {
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x <= 0 || p.x >= width) p.vx *= -1;
                    if (p.y <= 0 || p.y >= height) p.vy *= -1;
                    p.x = Math.max(0, Math.min(width, p.x));
                    p.y = Math.max(0, Math.min(height, p.y));
                }

                ctx.strokeStyle = `hsl(${shape.hue}, 90%, 60%)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                shape.points.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
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

export default Mystify;
