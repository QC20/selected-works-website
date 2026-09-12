import React from 'react';
import { AccessoryId } from './petAchievements';

/**
 * The wardrobe, drawn rather than painted.
 * -----------------------------------------
 * Every hat here is a handful of divs. Nothing is an image, and that is a
 * deliberate constraint rather than laziness: the four animals are 32px
 * sprites drawn head-on at slightly different scales, so a bitmap party hat
 * that sits correctly on Static's ears sits four pixels inside Modem's skull.
 * A shape made of CSS can be handed the species' own hat-line, eye-line and
 * head width (see `anatomy` in `pets.ts`) and land in the right place on all
 * four without anyone opening a paint program.
 *
 * It also means the wardrobe scales with the size control — a 200% pet gets a
 * 200% crown with no second asset — and that a hat inherits the body's
 * rotation for free, so a creature hanging upside down off a wall keeps its
 * hat on at the correct angle.
 *
 * Everything is positioned from a single `unit`, which is the sprite's height
 * in pixels. Sizes below are therefore fractions of the animal, not constants,
 * which is what keeps a 40% pet from wearing a hat bigger than its head.
 */

export interface AccessoryProps {
    id: AccessoryId;
    /** The sprite box height in px — everything is a fraction of this. */
    unit: number;
    /** Fractions of the sprite box, from `PetDef.anatomy`. */
    anatomy: { hat: number; eyes: number; neck: number; headWidth: number };
}

const PetAccessory: React.FC<AccessoryProps> = ({ id, unit, anatomy }) => {
    const u = (n: number) => Math.round(n * unit * 100) / 100;
    const headW = anatomy.headWidth * 2 * unit;

    /**
     * Anchored to the centre of the sprite, sitting on the head line.
     *
     * The `u(0.05)` is a deliberate overlap: pinning the accessory's bottom
     * edge exactly to the crown makes it look balanced on top rather than
     * worn, and at 40% scale the one-pixel gap that leaves is very visible.
     * Sinking it a twentieth of the sprite into the head fixes both.
     */
    const onHead = (height: number): React.CSSProperties => ({
        position: 'absolute',
        left: '50%',
        top: u(anatomy.hat) - height + u(0.05),
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        // `App.css` sets `div { display: flex }` for the whole site, so every
        // wrapper here is a flex *row* unless told otherwise — which put the
        // tiny CRT's stand beside the monitor instead of under it. Stated
        // explicitly rather than relying on the default, for the same reason
        // every other component on this desktop does.
        flexDirection: 'column',
        alignItems: 'center',
    });

    switch (id) {
        case 'shades': {
            // Thin and a shade narrower than the skull. The first version was
            // 15% of the sprite tall and wider than the head, which on Glitch
            // and Pixel stopped reading as sunglasses and started reading as
            // a censorship bar.
            const h = Math.max(3, u(0.1));
            const w = Math.max(8, headW * 0.94);
            return (
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: u(anatomy.eyes) - h / 2,
                        width: w,
                        height: h,
                        marginLeft: -w / 2,
                        // Two lenses and a lighter bridge between them, in one
                        // gradient — at this size a separate bridge element
                        // would be a sub-pixel and disappear.
                        background:
                            'linear-gradient(90deg, #12131a 0 42%, #454754 42% 58%, #12131a 58% 100%)',
                        borderRadius: h / 2.5,
                        boxShadow: `inset 0 ${Math.max(
                            1,
                            h * 0.3
                        )}px 0 rgba(255,255,255,0.22), 0 1px 0 rgba(0,0,0,0.5)`,
                        pointerEvents: 'none',
                    }}
                />
            );
        }

        case 'bowtie': {
            const w = Math.max(8, headW * 0.62);
            const h = Math.max(4, u(0.13));
            return (
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: u(anatomy.neck),
                        width: w,
                        height: h,
                        marginLeft: -w / 2,
                        background: '#a5232f',
                        // Two triangles meeting at a knot, in one polygon.
                        clipPath:
                            'polygon(0% 0%, 42% 38%, 58% 38%, 100% 0%, 100% 100%, 58% 62%, 42% 62%, 0% 100%)',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.45)',
                        pointerEvents: 'none',
                    }}
                />
            );
        }

        case 'partyHat': {
            const w = Math.max(8, headW * 0.72);
            const h = Math.max(9, u(0.46));
            return (
                <div style={onHead(h)}>
                    <div
                        style={{
                            width: w,
                            height: h,
                            background:
                                'repeating-linear-gradient(115deg, #d43b7a 0 4px, #ffd34d 4px 8px)',
                            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: -u(0.09),
                            width: u(0.16),
                            height: u(0.16),
                            marginLeft: -u(0.08),
                            borderRadius: '50%',
                            background: '#fff',
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                        }}
                    />
                </div>
            );
        }

        case 'cone': {
            const w = Math.max(8, headW * 0.78);
            const h = Math.max(9, u(0.42));
            return (
                <div style={onHead(h)}>
                    <div
                        style={{
                            width: w,
                            height: h,
                            background:
                                'linear-gradient(#ff8c1a, #e2650c 60%, #c44f06)',
                            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                        }}
                    />
                    {/* The reflective band, which is the only thing that makes
                        an orange triangle read as a traffic cone. */}
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            bottom: h * 0.26,
                            width: w * 0.62,
                            height: Math.max(1, h * 0.14),
                            marginLeft: -(w * 0.31),
                            background: '#f5f0e6',
                        }}
                    />
                </div>
            );
        }

        case 'crown': {
            const w = Math.max(9, headW * 0.86);
            const h = Math.max(6, u(0.26));
            return (
                <div style={onHead(h)}>
                    <div
                        style={{
                            width: w,
                            height: h,
                            background: 'linear-gradient(#ffe07a, #d9a520)',
                            clipPath:
                                'polygon(0% 100%, 0% 28%, 20% 62%, 34% 0%, 50% 55%, 66% 0%, 80% 62%, 100% 28%, 100% 100%)',
                            boxShadow: '0 1px 0 rgba(0,0,0,0.35)',
                        }}
                    />
                </div>
            );
        }

        case 'halo': {
            const w = Math.max(10, headW * 0.94);
            const h = Math.max(3, u(0.12));
            return (
                <div style={onHead(h + u(0.14))}>
                    <div
                        style={{
                            width: w,
                            height: h,
                            border: `${Math.max(1, u(0.045))}px solid #ffd94a`,
                            borderRadius: '50%',
                            boxShadow: '0 0 4px rgba(255,217,74,0.9)',
                        }}
                    />
                </div>
            );
        }

        case 'antenna': {
            const stalk = Math.max(6, u(0.36));
            return (
                <div style={onHead(stalk)}>
                    <div
                        style={{
                            width: Math.max(1, u(0.05)),
                            height: stalk,
                            margin: '0 auto',
                            background: '#3a3a3a',
                        }}
                    />
                    <div
                        className="pet-led"
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: -u(0.06),
                            width: u(0.14),
                            height: u(0.14),
                            marginLeft: -u(0.07),
                            borderRadius: '50%',
                            background: '#ff4d3d',
                        }}
                    />
                </div>
            );
        }

        case 'propeller': {
            const capW = Math.max(9, headW * 0.88);
            const capH = Math.max(5, u(0.22));
            const bladeW = Math.max(10, headW * 1.15);
            const boxH = capH + u(0.14);
            return (
                <div
                    style={{
                        ...onHead(boxH),
                        // Both children are absolutely positioned, so the
                        // wrapper has no content to size itself from and
                        // would otherwise collapse to nothing — taking the
                        // `bottom: 0` the cap hangs off with it.
                        width: Math.max(bladeW, capW),
                        height: boxH,
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            left: '50%',
                            bottom: 0,
                            width: capW,
                            height: capH,
                            marginLeft: -capW / 2,
                            background:
                                'conic-gradient(from 180deg at 50% 100%, #d43b3b 0 25%, #ffffff 0 50%, #2f6fd0 0 75%, #ffd34d 0 100%)',
                            borderRadius: `${capW}px ${capW}px 0 0`,
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                        }}
                    />
                    <div
                        className="pet-propeller"
                        style={{
                            position: 'absolute',
                            left: '50%',
                            top: 0,
                            width: bladeW,
                            height: Math.max(1, u(0.07)),
                            marginLeft: -bladeW / 2,
                            background: '#2a2a2a',
                            borderRadius: 1,
                        }}
                    />
                </div>
            );
        }

        case 'floppy': {
            const w = Math.max(9, headW * 0.8);
            return (
                <div style={onHead(w + u(0.04))}>
                    <div
                        style={{
                            width: w,
                            height: w,
                            background: '#2b3a6b',
                            border: '1px solid #141c34',
                            position: 'relative',
                            transform: 'rotate(-12deg)',
                        }}
                    >
                        {/* The metal shutter, and the white label under it —
                            the two details that make a blue square a disk. */}
                        <div
                            style={{
                                position: 'absolute',
                                left: '22%',
                                top: 0,
                                width: '46%',
                                height: '34%',
                                background: '#c7c9cf',
                                borderRight: '1px solid #8d9099',
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                left: '14%',
                                bottom: '8%',
                                width: '72%',
                                height: '38%',
                                background: '#eceade',
                            }}
                        />
                    </div>
                </div>
            );
        }

        case 'crt': {
            const w = Math.max(10, headW * 0.95);
            const h = w * 0.82;
            return (
                <div style={onHead(h + u(0.09))}>
                    <div
                        style={{
                            width: w,
                            height: h,
                            background: '#cfc9b4',
                            border: '1px solid #7d7663',
                            borderRadius: 1,
                            boxShadow: 'inset -1px -1px 0 rgba(0,0,0,0.25)',
                            position: 'relative',
                        }}
                    >
                        <div
                            className="pet-crt-screen"
                            style={{
                                position: 'absolute',
                                left: '14%',
                                top: '14%',
                                width: '72%',
                                height: '58%',
                                background: '#1d3f2a',
                                boxShadow: 'inset 0 0 2px rgba(0,0,0,0.8)',
                            }}
                        />
                    </div>
                    {/* The stand, so it reads as a monitor rather than a box. */}
                    <div
                        style={{
                            width: w * 0.4,
                            height: Math.max(1, u(0.05)),
                            margin: '0 auto',
                            background: '#8d8878',
                        }}
                    />
                </div>
            );
        }

        default:
            return null;
    }
};

export default PetAccessory;
