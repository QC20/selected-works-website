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
    /**
     * Fires when a drag finishes: how far the icon travelled, in desktop
     * coords, plus where the pointer was let go, in screen coords — the caller
     * needs the latter to tell "moved a bit to the left" from "dropped on the
     * Recycle Bin".
     */
    onMoved?: (
        dx: number,
        dy: number,
        screen: { x: number; y: number }
    ) => void;
    /** Right-click (or long-press on touch) — see `Desktop.tsx`. */
    onContextMenu?: (screenX: number, screenY: number) => void;
    /**
     * Exposes the shortcut's own box. The wrapper Desktop positions us with
     * collapses to 0x0 (its only child is absolutely positioned), so anything
     * that needs to hit-test against this icon — dragging a file onto the
     * Recycle Bin, say — has to measure this element instead.
     */
    innerRef?: React.Ref<HTMLDivElement>;
    /**
     * Arrow-key desktop navigation's cursor is on this icon (see Desktop.tsx).
     * Drawn identically to a mouse click's `isSelected` — a keyboard user
     * needs the same "this is the one Enter will open" feedback a mouse user
     * gets from clicking once, not a second, different-looking focus style.
     */
    keyboardFocused?: boolean;
}

const DesktopShortcut: React.FC<DesktopShortcutProps> = ({
    icon,
    shortcutName,
    invertText,
    onOpen,
    onMoved,
    onContextMenu,
    innerRef,
    keyboardFocused,
}) => {
    const [isSelected, setIsSelected] = useState(false);
    // Keyboard focus reads exactly like a mouse selection — same border, same
    // checkerboard mask — rather than a second, unfamiliar highlight style.
    const showSelected = isSelected || !!keyboardFocused;
    const [shortcutId, setShortcutId] = useState('');
    const [lastSelected, setLastSelected] = useState(false);
    const containerRef = useRef<any>();

    const [scaledStyle, setScaledStyle] = useState({});

    const requiredIcon = require(`../../assets/icons/${icon}.png`);
    const [doubleClickTimerActive, setDoubleClickTimerActive] = useState(false);

    const getShortcutId = useCallback(() => {
        // Anything that isn't a letter or a digit comes out, not just spaces:
        // an id is used in CSS selectors, and a name like "Add/Remove Programs"
        // would otherwise produce one that `querySelector` refuses to parse.
        const shortcutId = shortcutName.replace(/[^a-zA-Z0-9]/g, '');
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
                        (ev.clientY - start.y) / scale,
                        { x: ev.clientX, y: ev.clientY }
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

    // The root div feeds both our own measurements and the caller's innerRef.
    const setRefs = useCallback(
        (el: HTMLDivElement | null) => {
            containerRef.current = el;
            if (typeof innerRef === 'function') {
                innerRef(el);
            } else if (innerRef) {
                (innerRef as React.MutableRefObject<
                    HTMLDivElement | null
                >).current = el;
            }
        },
        [innerRef]
    );

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
            onContextMenu={(e) => {
                if (!onContextMenu) return;
                e.preventDefault();
                // Explorer selects whatever you right-click before it shows the
                // menu, so the menu is visibly about *this* icon.
                setIsSelected(true);
                setLastSelected(true);
                onContextMenu(e.clientX, e.clientY);
            }}
            ref={setRefs}
        >
            <div id={`${shortcutId}`} style={styles.iconContainer}>
                <div
                    id={`${shortcutId}`}
                    className="desktop-shortcut-icon"
                    style={Object.assign(
                        {},
                        styles.iconOverlay,
                        showSelected && styles.checkerboard,
                        showSelected && {
                            WebkitMask: `url(${requiredIcon})`,
                        }
                    )}
                />
                <Icon icon={icon} style={styles.icon} />
            </div>
            <div
                className={
                    showSelected
                        ? 'selected-shortcut-border'
                        : lastSelected
                        ? 'shortcut-border'
                        : ''
                }
                id={`${shortcutId}`}
                style={showSelected ? { backgroundColor: colors.blue } : {}}
            >
                <p
                    id={`${shortcutId}`}
                    style={Object.assign(
                        {},
                        styles.shortcutText,
                        invertText && !showSelected && { color: 'black' }
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
