/**
 * A draggable file icon.
 * ----------------------
 * The same component renders a file on the desktop and inside the Recycle Bin
 * window, so a file looks identical wherever it lives and can be dragged
 * between the two. Selection and the click-click-to-open behaviour match
 * `DesktopShortcut`; the drag reports both a delta (for repositioning) and the
 * pointer's screen position (so the caller can tell whether it was dropped
 * inside the bin window or out on the desktop).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { DesktopFile } from './desktopFiles';
import { IconPos } from './iconPositions';
import { getResolutionScale } from './resolution';

/** How far the pointer must travel before a press counts as a drag, not a click. */
const DRAG_THRESHOLD = 4;

export interface FileIconProps {
    file: DesktopFile;
    /** Position within the parent's coordinate space. */
    pos: IconPos;
    selected: boolean;
    /** White labels read on the desktop wallpaper; black ones inside a window. */
    variant: 'desktop' | 'folder';
    onSelect: () => void;
    onOpen: () => void;
    /**
     * Fires once a real drag ends: the movement in desktop coordinates plus
     * where the pointer was released, in screen coordinates.
     */
    onDropped: (dx: number, dy: number, screen: { x: number; y: number }) => void;
    /** Right-click — see `Desktop.tsx`. */
    onContextMenu?: (screenX: number, screenY: number) => void;
}

const FileIcon: React.FC<FileIconProps> = ({
    file,
    pos,
    selected,
    variant,
    onSelect,
    onOpen,
    onDropped,
    onContextMenu,
}) => {
    const [dragDelta, setDragDelta] = useState<IconPos | null>(null);
    const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
    // Same click-then-click-again-within-300ms open as DesktopShortcut, so the
    // two kinds of icon feel the same and touch devices work without dblclick.
    const openTimer = useRef(false);

    const requiredIcon = require(`../../assets/icons/${file.icon}.png`);


    /*
     * Whatever pointer listeners are currently attached to `window`.
     *
     * Both of these are added on pointerdown and removed inside their own
     * `pointerup`, which is fine right up until the icon unmounts mid-drag —
     * dropped on the Recycle Bin, uninstalled from the Store, or a `pointerup`
     * swallowed by an iframe. Then they survive for the rest of the session,
     * calling setState on a component that no longer exists. Tracked in a ref
     * because the handlers are fresh closures each time and a cleanup would
     * otherwise be handed a different function than the one that was added.
     */
    const gestureRef = useRef<[string, EventListener][]>([]);

    const detachGesture = useCallback(() => {
        gestureRef.current.forEach(([type, fn]) =>
            window.removeEventListener(type, fn)
        );
        gestureRef.current = [];
    }, []);

    useEffect(() => detachGesture, [detachGesture]);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            e.stopPropagation();

            if (openTimer.current) {
                openTimer.current = false;
                onOpen();
                return;
            }
            onSelect();
            openTimer.current = true;
            setTimeout(() => {
                openTimer.current = false;
            }, 300);

            const scale = getResolutionScale();
            dragRef.current = { x: e.clientX, y: e.clientY, moved: false };

            const onMove = (ev: PointerEvent) => {
                const start = dragRef.current;
                if (!start) return;
                const dx = (ev.clientX - start.x) / scale;
                const dy = (ev.clientY - start.y) / scale;
                if (!start.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
                start.moved = true;
                setDragDelta({ x: dx, y: dy });
            };

            const onUp = (ev: PointerEvent) => {
                const start = dragRef.current;
                detachGesture();
                dragRef.current = null;
                setDragDelta(null);
                if (start?.moved) {
                    // A drag is not a click — don't let it also open the file.
                    openTimer.current = false;
                    onDropped(
                        (ev.clientX - start.x) / scale,
                        (ev.clientY - start.y) / scale,
                        { x: ev.clientX, y: ev.clientY }
                    );
                }
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            gestureRef.current.push(
                ['pointermove', onMove as EventListener],
                ['pointerup', onUp as EventListener]
            );
        },
        [onOpen, onSelect, onDropped]
    );

    return (
        <div
            // Same id convention as DesktopShortcut, so a file icon can be
            // addressed from outside (and in tests) wherever it currently lives.
            id={`desktop-file-${file.id}`}
            style={Object.assign(
                {},
                styles.icon,
                { top: pos.y, left: pos.x },
                dragDelta && {
                    transform: `translate(${dragDelta.x}px, ${dragDelta.y}px)`,
                    zIndex: 5000,
                    opacity: 0.75,
                }
            )}
            onPointerDown={handlePointerDown}
            onContextMenu={(e) => {
                if (!onContextMenu) return;
                e.preventDefault();
                onContextMenu(e.clientX, e.clientY);
            }}
        >
            <div style={styles.iconContainer}>
                <div
                    className="desktop-shortcut-icon"
                    style={Object.assign(
                        {},
                        styles.iconOverlay,
                        selected && styles.checkerboard,
                        selected && { WebkitMask: `url(${requiredIcon})` }
                    )}
                />
                <Icon icon={file.icon} style={styles.iconImage} />
            </div>
            <div
                className={selected ? 'selected-shortcut-border' : ''}
                style={selected ? { backgroundColor: Colors.blue } : {}}
            >
                <p
                    style={Object.assign(
                        {},
                        styles.label,
                        variant === 'folder' &&
                            !selected && { color: Colors.black }
                    )}
                >
                    {file.name}
                </p>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    icon: {
        position: 'absolute',
        width: 64,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        touchAction: 'none',
    },
    iconContainer: {
        cursor: 'pointer',
        paddingBottom: 3,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconImage: {
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
        backgroundImage: `linear-gradient(45deg, ${Colors.blue} 25%, transparent 25%),
        linear-gradient(-45deg, ${Colors.blue} 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, ${Colors.blue} 75%),
        linear-gradient(-45deg, transparent 75%, ${Colors.blue} 75%)`,
        backgroundSize: `2px 2px`,
        backgroundPosition: `0 0, 0 1px, 1px -1px, -1px 0px`,
        pointerEvents: 'none',
    },
    label: {
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        color: 'white',
        fontSize: 8,
        paddingRight: 2,
        paddingLeft: 2,
        lineHeight: '10px',
    },
};

export default FileIcon;
