import React, { useEffect, useRef } from 'react';
import { IconName } from '../../../assets/icons';
import { Icon } from '../../general';

/**
 * "Flying Windows", the classic Windows 95 screen saver — tumbling shapes
 * drifting in from the vanishing point. The real one flew a single flag logo;
 * this desktop doesn't have that bitmap to reuse, so it flies a handful of
 * its own desktop icons instead. Same idea, this machine's own furniture.
 */

const ICONS: IconName[] = [
    'doomIcon',
    'notepadIcon',
    'winampIcon',
    'snakeIcon',
    'tetrisIcon',
    'pinballIcon',
    'stocksIcon',
    'scrabbleIcon',
];

const COUNT = 14;

interface Piece {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    scale: number;
    icon: IconName;
    el: HTMLDivElement | null;
}

const spawn = (width: number, height: number): Piece => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2.5;
    return {
        x: width / 2,
        y: height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 6,
        scale: 0.2,
        icon: ICONS[Math.floor(Math.random() * ICONS.length)],
        el: null,
    };
};

const FlyingIcons: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const piecesRef = useRef<Piece[]>([]);

    useEffect(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        // Staggered so they don't all burst from the centre at once.
        piecesRef.current = Array.from({ length: COUNT }, (_, i) => {
            const p = spawn(width, height);
            const t = i / COUNT;
            p.x += p.vx * t * 120;
            p.y += p.vy * t * 120;
            p.scale = Math.min(1, 0.2 + t);
            return p;
        });

        let raf = 0;
        const tick = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const cx = w / 2;
            const cy = h / 2;

            for (const p of piecesRef.current) {
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 1.01;
                p.vy *= 1.01;
                p.rotation += p.rotationSpeed;
                const dist = Math.hypot(p.x - cx, p.y - cy);
                p.scale = Math.min(1.6, 0.2 + dist / (Math.min(w, h) / 2));

                const offscreen =
                    p.x < -80 || p.x > w + 80 || p.y < -80 || p.y > h + 80;
                if (offscreen) Object.assign(p, spawn(w, h), { el: p.el });

                if (p.el) {
                    p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg) scale(${p.scale})`;
                    p.el.style.opacity = String(Math.min(1, p.scale));
                }
            }

            raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);

        return () => window.cancelAnimationFrame(raf);
    }, []);

    return (
        <div ref={containerRef} style={styles.stage}>
            {piecesRef.current.map((p, i) => (
                <div
                    key={i}
                    ref={(el) => {
                        piecesRef.current[i].el = el;
                    }}
                    style={styles.piece}
                >
                    <Icon icon={p.icon} size={40} />
                </div>
            ))}
        </div>
    );
};

const styles: StyleSheetCSS = {
    stage: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        overflow: 'hidden',
    },
    piece: {
        position: 'absolute',
        top: -20,
        left: -20,
        willChange: 'transform',
    },
};

export default FlyingIcons;
