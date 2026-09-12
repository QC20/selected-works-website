import React, { useEffect, useRef, useState } from 'react';
import { ReactNode } from 'react';
import { IconName } from '../../assets/icons';
import colors from '../../constants/colors';
import Colors from '../../constants/colors';
import Icon from '../general/Icon';
import Button from './Button';
import DragIndicator from './DragIndicator';
import ResizeIndicator from './ResizeIndicator';
import { getResolutionScale } from './resolution';
import { TASKBAR_HEIGHT } from './metrics';
import { useTheme } from './theme';

export interface WindowProps {
    closeWindow: () => void;
    minimizeWindow: () => void;
    onInteract: () => void;
    width: number;
    height: number;
    top: number;
    left: number;
    windowTitle?: string;
    bottomLeftText?: string;
    rainbow?: boolean;
    windowBarColor?: string;
    windowBarIcon?: IconName;
    onWidthChange?: (width: number) => void;
    onHeightChange?: (height: number) => void;
    /**
     * Replaces the maximize button's normal behaviour. The GitHub window uses
     * this to open the real github.com in a new tab — the one place on this
     * desktop where a control deliberately leaves the site.
     */
    onMaximize?: () => void;
    /**
     * Rattles the whole window once, for MSN Messenger's nudge. Set it true and
     * clear it again from `onShakeEnd` — re-setting it is what replays the
     * animation.
     */
    shake?: boolean;
    onShakeEnd?: () => void;
    children?: ReactNode;
}

/**
 * How much of a window's title bar must stay on screen horizontally. Windows
 * 95 let you push a window most of the way off the side and that is worth
 * keeping — it is how you park one. What it did not let you do is push it off
 * entirely, which is what the clamp in `stopDrag` preserves.
 */
const TITLE_BAR_KEEP = 90;

const Window: React.FC<WindowProps> = (props) => {
    // Title-bar colour follows Display Properties → Appearance.
    const theme = useTheme();
    const windowRef = useRef<any>(null);
    const dragRef = useRef<any>(null);
    const contentRef = useRef<any>(null);

    const dragProps = useRef<{
        dragStartX: any;
        dragStartY: any;
    }>();

    const resizeRef = useRef<any>(null);

    // Clamp the initial window box to the (scale-aware) viewport so windows fit on
    // phones/tablets. On desktop the viewport is large, so these are no-ops.
    const vw = window.innerWidth / getResolutionScale();
    const vh = window.innerHeight / getResolutionScale();
    const initWidth = Math.min(props.width, Math.max(240, vw - 8));
    const initHeight = Math.min(props.height, Math.max(200, vh - 48));
    const initLeft = Math.max(0, Math.min(props.left, vw - initWidth));
    const initTop = Math.max(0, Math.min(props.top, vh - 60));

    const [top, setTop] = useState(initTop);
    const [left, setLeft] = useState(initLeft);

    const lastClickInside = useRef(false);

    const [width, setWidth] = useState(initWidth);
    const [height, setHeight] = useState(initHeight);

    const [contentWidth, setContentWidth] = useState(props.width);
    const [contentHeight, setContentHeight] = useState(props.height);

    const [windowActive, setWindowActive] = useState(true);

    const [isMaximized, setIsMaximized] = useState(false);
    const [preMaxSize, setPreMaxSize] = useState({
        width,
        height,
        top,
        left,
    });

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    /*
     * Drag and resize both attach their handlers to `window`, because the
     * pointer routinely leaves the element being dragged. Both used to remove
     * them only from inside their own `pointerup` — so a window that unmounted
     * mid-gesture (closed from the taskbar, uninstalled from the Store, or a
     * `pointerup` swallowed by an iframe) left two live listeners writing
     * `.style` to a detached node and calling `setState` on a dead component,
     * for the rest of the session.
     *
     * The handlers are fresh closures on every render, so a `removeEventListener`
     * in a cleanup would be passed a different function than the one that was
     * added and would remove nothing. Hence the ref: whatever was actually
     * attached is what gets detached.
     */
    const activeListeners = useRef<[string, EventListener][]>([]);

    const attachGesture = (move: EventListener, up: EventListener) => {
        window.addEventListener('pointermove', move, false);
        window.addEventListener('pointerup', up, false);
        activeListeners.current.push(['pointermove', move], ['pointerup', up]);
    };

    const detachGesture = () => {
        activeListeners.current.forEach(([type, fn]) =>
            window.removeEventListener(type, fn, false)
        );
        activeListeners.current = [];
    };

    useEffect(() => detachGesture, []);

    const startResize = (event: any) => {
        event.preventDefault();
        setIsResizing(true);
        attachGesture(onResize, stopResize);
    };

    const onResize = ({ clientX, clientY }: any) => {
        // Screen coords -> desktop (scaled) coords so resizing tracks the cursor
        // at any resolution.
        const scale = getResolutionScale();
        const curWidth = clientX / scale - left;
        const curHeight = clientY / scale - top;
        if (curWidth > 520) resizeRef.current.style.width = `${curWidth}px`;
        if (curHeight > 220) resizeRef.current.style.height = `${curHeight}px`;
        resizeRef.current.style.opacity = 1;
    };

    const stopResize = () => {
        setIsResizing(false);
        // `style.width` is the string "623px", and `width` is typed and used
        // as a number — it feeds the drag clamp's arithmetic and `preMaxSize`.
        // Assigning the string straight in turned the first of those into NaN
        // for the rest of the window's life.
        const nextWidth = parseFloat(resizeRef.current.style.width);
        const nextHeight = parseFloat(resizeRef.current.style.height);
        if (Number.isFinite(nextWidth)) setWidth(nextWidth);
        if (Number.isFinite(nextHeight)) setHeight(nextHeight);
        resizeRef.current.style.opacity = 0;
        detachGesture();
    };

    const startDrag = (event: any) => {
        const { clientX, clientY } = event;
        setIsDragging(true);
        event.preventDefault();
        dragProps.current = {
            dragStartX: clientX,
            dragStartY: clientY,
        };
        attachGesture(onDrag, stopDrag);
    };

    const onDrag = ({ clientX, clientY }: any) => {
        let { x, y } = getXYFromDragProps(clientX, clientY);
        dragRef.current.style.transform = `translate(${x}px, ${y}px)`;
        dragRef.current.style.opacity = 1;
    };

    const stopDrag = ({ clientX, clientY }: any) => {
        setIsDragging(false);
        // dragRef.current.style.opacity = 0;
        const { x, y } = getXYFromDragProps(clientX, clientY);
        // Clamped the same way the initial box is (see `initTop`/`initLeft`).
        // Without this a window dragged above the top edge keeps a negative
        // `top`, which puts its title bar — and therefore its own drag handle,
        // its close button and its maximize button — permanently outside the
        // viewport. There is no way back from that except the taskbar.
        const vw = window.innerWidth / getResolutionScale();
        const vh = window.innerHeight / getResolutionScale();
        setTop(Math.max(0, Math.min(y, vh - 60)));
        setLeft(Math.max(TITLE_BAR_KEEP - width, Math.min(x, vw - TITLE_BAR_KEEP)));
        detachGesture();
    };

    const getXYFromDragProps = (
        clientX: number,
        clientY: number
    ): { x: number; y: number } => {
        if (!dragProps.current) return { x: 0, y: 0 };
        const { dragStartX, dragStartY } = dragProps.current;

        // Divide the screen-space delta by the desktop scale so the window keeps
        // up with the cursor/finger at any resolution.
        const scale = getResolutionScale();
        const x = (clientX - dragStartX) / scale + left;
        const y = (clientY - dragStartY) / scale + top;

        return { x, y };
    };

    // Only when the window has actually moved. Without the dependencies this
    // wrote the same transform on every render of every open window.
    useEffect(() => {
        dragRef.current.style.transform = `translate(${left}px, ${top}px)`;
    }, [left, top]);

    useEffect(() => {
        props.onWidthChange && props.onWidthChange(contentWidth);
    }, [props.onWidthChange, contentWidth]); // eslint-disable-line

    useEffect(() => {
        props.onHeightChange && props.onHeightChange(contentHeight);
    }, [props.onHeightChange, contentHeight]); // eslint-disable-line

    useEffect(() => {
        setContentWidth(contentRef.current.getBoundingClientRect().width);
    }, [width]);

    useEffect(() => {
        setContentHeight(contentRef.current.getBoundingClientRect().height);
    }, [height]);

    const maximize = () => {
        if (props.onMaximize) {
            props.onMaximize();
            return;
        }
        if (isMaximized) {
            setWidth(preMaxSize.width);
            setHeight(preMaxSize.height);
            setTop(preMaxSize.top);
            setLeft(preMaxSize.left);
            setIsMaximized(false);
        } else {
            setPreMaxSize({
                width,
                height,
                top,
                left,
            });
            // Divided by the resolution scale like every other measurement
            // in this file. `TASKBAR_HEIGHT` is already a desktop pixel, so
            // mixing it with a raw `innerHeight` made a maximized window
            // 1.9x the viewport at 360x640 and two thirds of it at 1280x1024.
            const scale = getResolutionScale() || 1;
            setWidth(window.innerWidth / scale);
            setHeight(window.innerHeight / scale - TASKBAR_HEIGHT);
            setTop(0);
            setLeft(0);
            setIsMaximized(true);
        }
    };

    const onCheckClick = () => {
        if (lastClickInside.current) {
            setWindowActive(true);
        } else {
            setWindowActive(false);
        }
        lastClickInside.current = false;
    };

    useEffect(() => {
        window.addEventListener('pointerdown', onCheckClick, false);
        return () => {
            window.removeEventListener('pointerdown', onCheckClick, false);
        };
    }, []);

    const onWindowInteract = () => {
        props.onInteract();
        setWindowActive(true);
        lastClickInside.current = true;
    };

    return (
        <div onPointerDown={onWindowInteract} style={styles.container}>
            <div
                className={props.shake ? 'window-shake' : ''}
                onAnimationEnd={props.onShakeEnd}
                style={Object.assign({}, styles.window, {
                    width,
                    height,
                    top,
                    left,
                })}
                ref={windowRef}
            >
                <div style={styles.windowBorderOuter}>
                    <div style={styles.windowBorderInner}>
                        <div
                            style={styles.dragHitbox}
                            onPointerDown={startDrag}
                        ></div>
                        <div
                            className={props.rainbow ? 'rainbow-wrapper' : ''}
                            style={Object.assign(
                                {},
                                styles.topBar,
                                { backgroundColor: theme.titleBar },
                                props.windowBarColor && {
                                    backgroundColor: props.windowBarColor,
                                },
                                !windowActive && {
                                    backgroundColor: Colors.darkGray,
                                }
                            )}
                        >
                            <div style={styles.windowHeader}>
                                {props.windowBarIcon ? (
                                    <Icon
                                        icon={props.windowBarIcon}
                                        style={Object.assign(
                                            {},
                                            styles.windowBarIcon,
                                            !windowActive && { opacity: 0.5 }
                                        )}
                                        size={16}
                                    />
                                ) : (
                                    <div style={{ width: 16 }} />
                                )}
                                <p
                                    style={
                                        windowActive
                                            ? {}
                                            : { color: colors.lightGray }
                                    }
                                    className="showcase-header"
                                >
                                    {props.windowTitle}
                                </p>
                            </div>
                            <div style={styles.windowTopButtons}>
                                <Button
                                    icon="minimize"
                                    onClick={props.minimizeWindow}
                                />
                                <Button icon="maximize" onClick={maximize} />
                                <div style={{ paddingLeft: 2 }}>
                                    <Button
                                        icon="close"
                                        onClick={props.closeWindow}
                                    />
                                </div>
                            </div>
                        </div>
                        <div
                            style={Object.assign({}, styles.contentOuter, {
                                // zIndex: isDragging || isResizing ? 0 : 100,
                            })}
                        >
                            <div style={styles.contentInner}>
                                <div style={styles.content} ref={contentRef}>
                                    {props.children}
                                </div>
                            </div>
                        </div>
                        <div
                            onPointerDown={startResize}
                            style={styles.resizeHitbox}
                        ></div>
                        <div style={styles.bottomBar}>
                            <div
                                style={Object.assign({}, styles.insetBorder, {
                                    flex: 5 / 7,
                                    alignItems: 'center',
                                })}
                            >
                                <p
                                    style={{
                                        fontSize: 12,
                                        marginLeft: 4,
                                        fontFamily: 'MSSerif',
                                    }}
                                >
                                    {props.bottomLeftText}
                                </p>
                            </div>
                            <div
                                style={Object.assign(
                                    {},
                                    styles.insetBorder,
                                    styles.bottomSpacer
                                )}
                            />
                            <div
                                style={Object.assign(
                                    {},
                                    styles.insetBorder,
                                    styles.bottomSpacer
                                )}
                            />
                            <div
                                style={Object.assign(
                                    {},
                                    styles.insetBorder,
                                    styles.bottomResizeContainer
                                )}
                            >
                                <div
                                    style={{
                                        alignItems: 'flex-end',
                                    }}
                                >
                                    <Icon size={12} icon="windowResize" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div
                style={
                    !isResizing
                        ? {
                              zIndex: -10000,
                              pointerEvents: 'none',
                          }
                        : {
                              zIndex: 1000,
                              cursor: 'nwse-resize',
                              mixBlendMode: 'difference',
                          }
                }
            >
                <ResizeIndicator
                    top={top}
                    left={left}
                    width={width}
                    height={height}
                    resizeRef={resizeRef}
                />
            </div>
            <div
                style={
                    !isDragging
                        ? {
                              zIndex: -10000,
                              pointerEvents: 'none',
                          }
                        : {
                              zIndex: 1000,
                              cursor: 'move',
                              mixBlendMode: 'difference',
                          }
                }
            >
                <DragIndicator
                    width={width}
                    height={height}
                    dragRef={dragRef}
                />
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    window: {
        backgroundColor: Colors.lightGray,
        position: 'absolute',
    },
    dragHitbox: {
        position: 'absolute',
        width: 'calc(100% - 70px)',
        height: 48,
        zIndex: 10000,
        top: -8,
        left: -4,
        cursor: 'move',
        touchAction: 'none',
    },
    windowBorderOuter: {
        border: `1px solid ${Colors.black}`,
        borderTopColor: colors.lightGray,
        borderLeftColor: colors.lightGray,
        flex: 1,
    },
    windowBorderInner: {
        border: `1px solid ${Colors.darkGray}`,
        borderTopColor: colors.white,
        borderLeftColor: colors.white,
        flex: 1,
        padding: 2,

        flexDirection: 'column',
    },
    resizeHitbox: {
        position: 'absolute',
        width: 60,
        height: 60,
        bottom: -20,
        right: -20,
        cursor: 'nwse-resize',
        touchAction: 'none',
    },
    topBar: {
        backgroundColor: Colors.blue,
        width: '100%',
        height: 20,

        alignItems: 'center',
        paddingRight: 2,
        boxSizing: 'border-box',
    },
    contentOuter: {
        border: `1px solid ${Colors.white}`,
        borderTopColor: colors.darkGray,
        borderLeftColor: colors.darkGray,
        flexGrow: 1,

        marginTop: 8,
        marginBottom: 8,
        overflow: 'hidden',
    },
    contentInner: {
        border: `1px solid ${Colors.lightGray}`,
        borderTopColor: colors.black,
        borderLeftColor: colors.black,
        flex: 1,
        overflow: 'hidden',
    },
    content: {
        flex: 1,

        position: 'relative',
        // overflow: 'scroll',
        overflowX: 'hidden',
        backgroundColor: Colors.white,
    },
    bottomBar: {
        flexShrink: 1,
        width: '100%',
        height: 20,
    },
    bottomSpacer: {
        width: 16,
        marginLeft: 2,
    },
    insetBorder: {
        border: `1px solid ${Colors.white}`,
        borderTopColor: colors.darkGray,
        borderLeftColor: colors.darkGray,
        padding: 2,
    },
    bottomResizeContainer: {
        flex: 2 / 7,

        justifyContent: 'flex-end',
        padding: 0,
        marginLeft: 2,
    },
    windowTopButtons: {
        // zIndex: 10000,

        alignItems: 'center',
    },
    windowHeader: {
        flex: 1,
        // justifyContent: 'center',
        // alignItems: 'center',
    },
    windowBarIcon: {
        paddingLeft: 4,
        paddingRight: 4,
    },
};

export default Window;
