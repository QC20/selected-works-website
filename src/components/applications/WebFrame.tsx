import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { IconName } from '../../assets/icons';
import { openExternal } from '../os/openExternal';
import {
    FAVORITE_ICONS,
    IE_FAVORITES,
    IE_HOME,
    labelForUrl,
    resolveTypedAddress,
} from '../os/websites';

/**
 * Internet Explorer.
 *
 * Every site the desktop opens comes through here — the Internet Explorer icon
 * itself, the entries under Start -> Projects, and the ones under Start ->
 * Resume — so a web page always arrives in the same window, with the same
 * chrome, the way it does in Yute's portfolio.
 *
 * It is a real (if small) browser rather than a bare iframe:
 *
 *   - Back / Forward walk a history stack, so following the Favorites list or
 *     typing addresses builds a trail you can retrace.
 *   - The address bar is editable. Enter loads it; a bare host gets https://,
 *     and anything that isn't a host is searched (see `resolveTypedAddress`).
 *   - The drop-down lists every site on the desktop (`IE_FAVORITES`).
 *   - Stop actually aborts an in-flight load by swapping the frame to
 *     about:blank, then shows IE's own "Action canceled" page.
 *   - Refresh remounts the iframe. That's the only way to reload a
 *     cross-origin page — we can't touch its `contentWindow.location`.
 *   - Home returns to `IE_HOME`.
 *
 * The one thing a page inside an iframe can never do is report its own title or
 * its own navigations back to us: that's cross-origin, and no browser allows
 * it. So the title bar and address bar track the addresses *we* navigate to,
 * not links the user follows inside the page. The footer link out is there for
 * exactly that case, plus any site that turns out to refuse framing.
 */

export interface WebFrameProps extends WindowAppProps {
    /** The address to open at. The page name shown comes from `labelForUrl`. */
    url: string;
    width: number;
    height: number;
    /** Defaults to the usual cascade corner when not given. */
    top?: number;
    left?: number;
    windowBarIcon?: IconName;
    allowCamera?: boolean;
}

const WebFrame: React.FC<WebFrameProps> = ({
    url: initialUrl,
    width,
    height,
    top = 44,
    left = 80,
    windowBarIcon = 'internetExplorerIcon',
    allowCamera = false,
    onInteract,
    onClose,
    onMinimize,
}) => {
    // The history stack and where we are in it, exactly like a browser: Back and
    // Forward move `index`, a fresh navigation truncates everything after it.
    const [history, setHistory] = useState<string[]>([initialUrl]);
    const [index, setIndex] = useState(0);
    const url = history[index];

    // What's in the address input, which is only the same as `url` until the
    // user starts typing.
    const [typed, setTyped] = useState(initialUrl);
    const [favoritesOpen, setFavoritesOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [stopped, setStopped] = useState(false);
    // Bumping this remounts the iframe — how Refresh (and Stop) work on a page
    // we're not allowed to script.
    const [reloadKey, setReloadKey] = useState(0);

    const addressBarRef = useRef<HTMLDivElement>(null);

    /**
     * Dismiss the Favorites drop-down the way a real menu behaves.
     *
     * Two listeners are needed because a click inside a cross-origin iframe never
     * reaches us: `pointerdown` covers the rest of the desktop, and the window's
     * own `blur` is the only signal we get when focus moves into the page.
     */
    useEffect(() => {
        if (!favoritesOpen) return;

        const onPointerDown = (e: PointerEvent) => {
            if (addressBarRef.current?.contains(e.target as Node)) return;
            setFavoritesOpen(false);
        };
        const onBlur = () => setFavoritesOpen(false);

        document.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('blur', onBlur);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('blur', onBlur);
        };
    }, [favoritesOpen]);

    const navigate = useCallback(
        (to: string) => {
            setHistory((prev) => [...prev.slice(0, index + 1), to]);
            setIndex((i) => i + 1);
            setTyped(to);
            setLoading(true);
            setStopped(false);
            setFavoritesOpen(false);
        },
        [index]
    );

    /** Reloading the address we're already on, without touching history. */
    const reload = useCallback(() => {
        setLoading(true);
        setStopped(false);
        setReloadKey((k) => k + 1);
    }, []);

    const go = useCallback(
        (delta: number) => {
            const next = index + delta;
            if (next < 0 || next >= history.length) return;
            setIndex(next);
            setTyped(history[next]);
            setLoading(true);
            setStopped(false);
            setFavoritesOpen(false);
        },
        [index, history]
    );

    /**
     * Stop. Pointing the frame at about:blank cancels whatever it was fetching;
     * `stopped` then puts IE's "Action canceled" page over the top, so the
     * button does what it says instead of just hiding the progress text.
     */
    const stop = useCallback(() => {
        if (!loading) return;
        setLoading(false);
        setStopped(true);
        setReloadKey((k) => k + 1);
    }, [loading]);

    const submitAddress = useCallback(() => {
        const resolved = resolveTypedAddress(typed);
        if (!resolved) return;
        if (resolved === url) {
            reload();
            return;
        }
        navigate(resolved);
    }, [typed, url, navigate, reload]);

    const canGoBack = index > 0;
    const canGoForward = index < history.length - 1;
    const pageName = useMemo(() => labelForUrl(url), [url]);

    const status = stopped
        ? 'Action canceled'
        : loading
          ? `Opening ${url}…`
          : url;

    return (
        <Window
            top={top}
            left={left}
            width={width}
            height={height}
            windowTitle={`${pageName} — Internet Explorer`}
            windowBarIcon={windowBarIcon}
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={status}
        >
            <div style={styles.container}>
                <div style={styles.menuBar}>
                    <span style={styles.menuItem}>
                        File<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                    <span style={styles.menuItem}>
                        Edit<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                    <span style={styles.menuItem}>
                        View<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                    <span style={styles.menuItem}>
                        Favorites<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                    <span style={styles.menuItem}>
                        Help<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                </div>

                {/* Toolbar — the IE 4 button row: the real button art, label
                    alongside, greyed out when the button can't be used. */}
                <div style={styles.toolbar}>
                    <ToolbarButton
                        icon="ieBackIcon"
                        label="Back"
                        disabled={!canGoBack}
                        onClick={() => go(-1)}
                    />
                    <ToolbarButton
                        icon="ieForwardIcon"
                        label="Forward"
                        disabled={!canGoForward}
                        onClick={() => go(1)}
                    />
                    <ToolbarButton
                        icon="ieStopIcon"
                        label="Stop"
                        disabled={!loading}
                        onClick={stop}
                    />
                    <ToolbarButton
                        icon="ieRefreshIcon"
                        label="Refresh"
                        onClick={reload}
                    />
                    <div style={styles.toolbarDivider} />
                    <ToolbarButton
                        icon="ieHomeIcon"
                        label="Home"
                        onClick={() =>
                            url === IE_HOME ? reload() : navigate(IE_HOME)
                        }
                    />
                    <ToolbarButton
                        icon="internetExplorerIcon"
                        label="Open"
                        onClick={() => openExternal(url)}
                        title="Open this page in a real browser tab"
                    />
                </div>

                <div style={styles.addressBar} ref={addressBarRef}>
                    <span style={styles.addressLabel}>Address</span>
                    <div style={styles.addressField}>
                        <Icon icon="internetExplorerIcon" size={14} />
                        <input
                            style={styles.addressInput}
                            value={typed}
                            spellCheck={false}
                            onChange={(e) => setTyped(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    submitAddress();
                                } else if (e.key === 'Escape') {
                                    setTyped(url);
                                }
                            }}
                            aria-label="Address"
                        />
                        <button
                            style={styles.dropButton}
                            onClick={() => setFavoritesOpen((o) => !o)}
                            title="Show the sites on this desktop"
                            aria-label="Show favorites"
                        >
                            ▼
                        </button>
                    </div>
                    <button style={styles.toolButton} onClick={submitAddress}>
                        Go
                    </button>

                    {favoritesOpen && (
                        <div style={styles.favorites}>
                            {IE_FAVORITES.map((site) => (
                                <div
                                    key={site.key}
                                    style={styles.favoriteRow}
                                    onClick={() => navigate(site.url)}
                                >
                                    <Icon
                                        icon={
                                            FAVORITE_ICONS[site.key] || 'ieIcon'
                                        }
                                        size={16}
                                    />
                                    <span style={styles.favoriteLabel}>
                                        {site.label}
                                    </span>
                                    <span style={styles.favoriteUrl}>
                                        {site.url}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={styles.viewport}>
                    <iframe
                        key={reloadKey}
                        src={stopped ? 'about:blank' : url}
                        title={pageName}
                        style={styles.frame}
                        onLoad={() => setLoading(false)}
                        allow={
                            allowCamera
                                ? 'camera; microphone; fullscreen'
                                : 'fullscreen'
                        }
                    />

                    {stopped && (
                        <div style={styles.overlay}>
                            <p style={styles.overlayTitle}>Action canceled</p>
                            <p style={styles.overlayText}>
                                Internet Explorer was unable to link to the Web
                                page you requested. The page might be temporarily
                                unavailable.
                            </p>
                            <button style={styles.button} onClick={reload}>
                                Try Again
                            </button>
                        </div>
                    )}

                    {loading && !stopped && (
                        <div
                            style={Object.assign({}, styles.overlay, {
                                pointerEvents: 'none' as const,
                            })}
                        >
                            <p style={styles.overlayText}>
                                Connecting to {url}…
                            </p>
                        </div>
                    )}
                </div>

                <div style={styles.footer}>
                    <span style={styles.footerText}>
                        If the page does not load, click{' '}
                        <span
                            style={styles.footerLink}
                            onClick={() => openExternal(url)}
                        >
                            here
                        </span>{' '}
                        to view it directly.
                    </span>
                </div>
            </div>
        </Window>
    );
};

/**
 * One IE-toolbar button: the button's own art beside its label, greyed out when
 * it can't be used.
 *
 * A disabled button is dimmed rather than swapped for a second "grey" image —
 * IE shipped both states as separate bitmaps, but this desktop only has the
 * colour ones, and the era's own trick for a disabled toolbar was exactly this.
 */
const ToolbarButton: React.FC<{
    icon: IconName;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    title?: string;
}> = ({ icon, label, onClick, disabled, title }) => (
    <button
        style={Object.assign(
            {},
            styles.toolbarButton,
            disabled && styles.toolbarButtonDisabled
        )}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        title={title || label}
    >
        <Icon icon={icon} style={styles.toolbarIcon} />
        <span style={styles.toolbarLabel}>{label}</span>
    </button>
);

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
    },
    menuBar: {
        display: 'flex',
        gap: 14,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    menuItem: {
        cursor: 'default',
        userSelect: 'none',
    },
    toolbar: {
        alignItems: 'stretch',
        gap: 2,
        padding: '3px 4px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    toolbarDivider: {
        width: 2,
        margin: '2px 4px',
        borderLeft: `1px solid ${Colors.darkGray}`,
        borderRight: `1px solid ${Colors.white}`,
        flexShrink: 0,
    },
    // Icon and label sit side by side, the way the toolbar does in the
    // portfolio this follows. `display: flex` is explicit because the global
    // stylesheet only flexes <div>, and these are <button> elements.
    toolbarButton: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        padding: '3px 7px',
        border: 'none',
        background: 'transparent',
        fontFamily: 'MSSerif',
        cursor: 'pointer',
        flexShrink: 0,
        color: Colors.black,
    },
    toolbarButtonDisabled: {
        color: Colors.darkGray,
        cursor: 'default',
        // Dims the button art along with its label.
        opacity: 0.4,
    },
    toolbarIcon: {
        width: 20,
        height: 20,
        objectFit: 'contain',
        flexShrink: 0,
    },
    toolbarLabel: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        lineHeight: 1.2,
    },
    addressBar: {
        position: 'relative',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    addressLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
    },
    addressField: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
        gap: 5,
        padding: '2px 2px 2px 4px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        overflow: 'hidden',
    },
    addressInput: {
        flex: 1,
        minWidth: 0,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    dropButton: {
        display: 'flex',
        width: 16,
        height: 16,
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 8,
        lineHeight: 1,
        cursor: 'pointer',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
    },
    toolButton: {
        padding: '3px 10px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        flexShrink: 0,
    },
    favorites: {
        position: 'absolute',
        top: '100%',
        left: 58,
        right: 44,
        zIndex: 20,
        flexDirection: 'column',
        maxHeight: 190,
        overflowY: 'auto',
        background: Colors.white,
        border: `1px solid ${Colors.black}`,
        boxShadow: `2px 2px 0 ${Colors.darkGray}`,
    },
    favoriteRow: {
        alignItems: 'center',
        gap: 6,
        padding: '3px 6px',
        cursor: 'pointer',
        flexShrink: 0,
    },
    favoriteLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
    },
    favoriteUrl: {
        flex: 1,
        minWidth: 0,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        textAlign: 'right',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    viewport: {
        position: 'relative',
        flex: 1,
        minHeight: 0,
        margin: '4px 4px 0 4px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        overflow: 'hidden',
    },
    frame: {
        flex: 1,
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 24,
        background: Colors.white,
    },
    overlayTitle: {
        fontFamily: 'MSSerif',
        fontSize: 13,
        fontWeight: 'bold',
        color: Colors.black,
    },
    overlayText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        textAlign: 'center',
        lineHeight: 1.5,
        maxWidth: 380,
    },
    button: {
        padding: '4px 12px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        flexShrink: 0,
    },
    footer: {
        padding: '3px 6px 4px 6px',
        flexShrink: 0,
    },
    footerText: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
    },
    footerLink: {
        color: Colors.blue,
        textDecoration: 'underline',
        cursor: 'pointer',
    },
};

export default WebFrame;
