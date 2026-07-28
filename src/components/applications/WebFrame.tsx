import React, { useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { IconName } from '../../assets/icons';
import { openExternal } from '../os/openExternal';

/**
 * An Internet Explorer window wrapping a live site in an iframe.
 *
 * Used for the entries under Start -> Projects and Start -> Resume, the same
 * way the example portfolio opens its project links in a browser window with
 * the address visible rather than sending you off-site.
 *
 * These targets are all mine and none of them send `X-Frame-Options` or a
 * `frame-ancestors` CSP, so they embed cleanly (github.com, by contrast, does
 * not — see GitHubViewer).
 *
 * `allowCamera` adds `allow="camera; microphone"` to the iframe. Without it a
 * framed page cannot even ask for the webcam. The browser's own permission
 * prompt still appears, and that is not something a page can or should skip —
 * only the user can grant camera access.
 */

export interface WebFrameProps extends WindowAppProps {
    title: string;
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
    title,
    url,
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
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [loading, setLoading] = useState(true);
    // Bumping this remounts the iframe, which is how Refresh reloads a
    // cross-origin page (we can't touch its contentWindow.location).
    const [reloadKey, setReloadKey] = useState(0);

    const refresh = () => {
        setLoading(true);
        setReloadKey((k) => k + 1);
    };

    return (
        <Window
            top={top}
            left={left}
            width={width}
            height={height}
            windowTitle={`${title} — Internet Explorer`}
            windowBarIcon={windowBarIcon}
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={loading ? `Opening ${url}…` : url}
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

                <div style={styles.addressBar}>
                    <span style={styles.addressLabel}>Address</span>
                    <div style={styles.addressField}>
                        <Icon icon="internetExplorerIcon" size={14} />
                        <span style={styles.addressText}>{url}</span>
                    </div>
                    <button style={styles.toolButton} onClick={refresh}>
                        Refresh
                    </button>
                    <button
                        style={styles.toolButton}
                        onClick={() => openExternal(url)}
                        title="Open this site in a new browser tab"
                    >
                        Open
                    </button>
                </div>

                <div style={styles.viewport}>
                    <iframe
                        key={reloadKey}
                        ref={frameRef}
                        src={url}
                        title={title}
                        style={styles.frame}
                        onLoad={() => setLoading(false)}
                        allow={
                            allowCamera
                                ? 'camera; microphone; fullscreen'
                                : 'fullscreen'
                        }
                    />
                    {loading && (
                        <div style={styles.loadingOverlay}>
                            <p style={styles.loadingText}>Connecting to {url}…</p>
                        </div>
                    )}
                </div>
            </div>
        </Window>
    );
};

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
    addressBar: {
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
        padding: '3px 4px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        overflow: 'hidden',
    },
    addressText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
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
    viewport: {
        position: 'relative',
        flex: 1,
        minHeight: 0,
        margin: '0 4px 4px 4px',
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
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        background: Colors.white,
        pointerEvents: 'none',
    },
    loadingText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
    },
};

export default WebFrame;
