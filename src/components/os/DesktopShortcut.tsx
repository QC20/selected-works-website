import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IconName } from '../../assets/icons';
import colors from '../../constants/colors';
import { Icon } from '../general';
import { getResolutionScale } from './resolution';

export interface DesktopShortcutProps {
    icon: IconName;
    shortcutName: string;
    invertText?: boolean;
    onOpen: () => void;
    /** Fires with the drag delta (in desktop coords) when a drag finishes. */
    onMoved?: (dx: number, dy: number) => void;
}

const DesktopShortcut: React.FC<DesktopShortcutProps> = ({
    icon,
    shortcutName,
    invertText,
    onOpen,
    onMoved,
}) => {
    const [isSelected, setIsSelected] = useState(false);
    const [shortcutId, setShortcutId] = useState('');
    const [lastSelected, setLastSelected] = useState(false);
    const containerRef = useRef<any>();

    const [scaledStyle, setScaledStyle] = useState({});

    const requiredIcon = require(`../../assets/icons/${icon}.png`);
    const [doubleClickTimerActive, setDoubleClickTimerActive] = useState(false);

    const getShortcutId = useCallback(() => {
        const shortcutId = shortcutName.replace(/\s/g, '');
        return `desktop-shortcut-${shortcutId}`;
    }, [shortcutName]);

    useEffect(() => {
        setShortcutId(getShortcutId());
    }, [shortcutName, getShortcutId]);

    useEffect(() => {
        if (containerRef.current && Object.keys(scaledStyle).length === 0) {
            //@ts-ignore
            const boundingBox = containerRef.current.getBoundingClientRect();
            setScaledStyle({
                transformOrigin: 'center',
                transform: 'scale(1.5)',
                left: boundingBox.width / 4,
                top: boundingBox.height / 4,
                // transform: 'scale(1.5)',
                // left: boundingBox.width / 4,
                // top: boundingBox.height / 4,
            });
        }
    }, [scaledStyle]);

    const handleClickOutside = useCallback(
        (event: MouseEvent) => {
            // @ts-ignore
            const targetId = event.target.id;
            if (targetId !== shortcutId) {
                setIsSelected(false);
            }
            if (!isSelected && lastSelected) {
                setLastSelected(false);
            }
        },
        [isSelected, setIsSelected, setLastSelected, lastSelected, shortcutId]
    );

    const handleClickShortcut = useCallback(() => {
        if (doubleClickTimerActive) {
            onOpen && onOpen();
            setIsSelected(false);
            setDoubleClickTimerActive(false);
            return;
        }
        setIsSelected(true);
        setLastSelected(true);
        setDoubleClickTimerActive(true);
        // set double click timer
        setTimeout(() => {
            setDoubleClickTimerActive(false);
        }, 300);
    }, [doubleClickTimerActive, setIsSelected, onOpen]);

    // ---- Dragging ---------------------------------------------------------
    // Icons can be dragged anywhere on the desktop. A press only counts as a
    // drag once it passes a small threshold, so ordinary (double-)clicks to open
    // still work exactly as before.
    const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
    const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(
        null
    );

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            handleClickShortcut();
            if (!onMoved) return;
            dragRef.current = { x: e.clientX, y: e.clientY, moved: false };

            const scale = getResolutionScale();

            const onMove = (ev: PointerEvent) => {
                const start = dragRef.current;
                if (!start) return;
                const dx = (ev.clientX - start.x) / scale;
                const dy = (ev.clientY - start.y) / scale;
                if (!start.moved && Math.hypot(dx, dy) < 4) return;
                start.moved = true;
                setDragDelta({ x: dx, y: dy });
            };

            const onUp = (ev: PointerEvent) => {
                const start = dragRef.current;
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                dragRef.current = null;
                setDragDelta(null);
                if (start?.moved) {
                    onMoved(
                        (ev.clientX - start.x) / scale,
                        (ev.clientY - start.y) / scale
                    );
                }
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        },
        [handleClickShortcut, onMoved]
    );

    useEffect(() => {
        document.addEventListener('pointerdown', handleClickOutside);
        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
        };
    }, [isSelected, handleClickOutside]);

    return (
        <div
            id={`${shortcutId}`}
            style={Object.assign(
                {},
                styles.appShortcut,
                scaledStyle,
                dragDelta && {
                    transform: `${
                        (scaledStyle as React.CSSProperties).transform || ''
                    } translate(${dragDelta.x}px, ${dragDelta.y}px)`,
                    zIndex: 5000,
                    opacity: 0.75,
                }
            )}
            onPointerDown={handlePointerDown}
            ref={containerRef}
        >
            <div id={`${shortcutId}`} style={styles.iconContainer}>
                <div
                    id={`${shortcutId}`}
                    className="desktop-shortcut-icon"
                    style={Object.assign(
                        {},
                        styles.iconOverlay,
                        isSelected && styles.checkerboard,
                        isSelected && {
                            WebkitMask: `url(${requiredIcon})`,
                        }
                    )}
                />
                <Icon icon={icon} style={styles.icon} />
            </div>
            <div
                className={
                    isSelected
                        ? 'selected-shortcut-border'
                        : lastSelected
                        ? 'shortcut-border'
                        : ''
                }
                id={`${shortcutId}`}
                style={isSelected ? { backgroundColor: colors.blue } : {}}
            >
                <p
                    id={`${shortcutId}`}
                    style={Object.assign(
                        {},
                        styles.shortcutText,
                        invertText && !isSelected && { color: 'black' }
                    )}
                >
                    {shortcutName}
                </p>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    appShortcut: {
        position: 'absolute',
        width: 56,

        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        // Faster taps on touch (no 300ms double-tap-zoom delay).
        touchAction: 'manipulation',
    },
    shortcutText: {
        cursor: 'pointer',
        textOverflow: 'wrap',
        fontFamily: 'MSSerif',
        color: 'white',
        fontSize: 8,
        paddingRight: 2,
        paddingLeft: 2,
    },
    iconContainer: {
        cursor: 'pointer',
        paddingBottom: 3,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Desktop icons are always drawn in a 32x32 box. Without this the <img>
    // falls back to its natural size, so a high-res source PNG renders huge.
    // `contain` keeps non-square art from being stretched.
    icon: {
        width: 32,
        height: 32,
        objectFit: 'contain',
    },
    iconOverlay: {
        position: 'absolute',
        top: 0,
        width: 32,
        height: 32,
    },
    checkerboard: {
        backgroundImage: `linear-gradient(45deg, ${colors.blue} 25%, transparent 25%),
        linear-gradient(-45deg, ${colors.blue} 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, ${colors.blue} 75%),
        linear-gradient(-45deg, transparent 75%, ${colors.blue} 75%)`,
        backgroundSize: `2px 2px`,
        backgroundPosition: `0 0, 0 1px, 1px -1px, -1px 0px`,
        pointerEvents: 'none',
    },
};

export default DesktopShortcut;
