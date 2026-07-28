import React, { useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { openExternal } from '../os/openExternal';
import cv from '../../assets/resume/CV_Jonas_Kjeldmand_Jensen.pdf';

/**
 * My CV, shown inside a window rather than handed off to the browser's PDF
 * viewer, so it keeps the desktop's look — the "Resume File" entry under
 * Start -> Resume.
 *
 * The PDF renders in an <iframe>: browsers' built-in viewers handle that
 * natively and it degrades gracefully. If a browser refuses to display it
 * inline (some mobile Safari versions do), the Open/Download buttons below are
 * the way out, which is why they're always visible rather than only on error.
 */

export interface ResumeFileProps extends WindowAppProps {}

const ResumeFile: React.FC<ResumeFileProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [loaded, setLoaded] = useState(false);

    return (
        <Window
            top={40}
            left={140}
            width={720}
            height={780}
            windowTitle="Resume File — My CV"
            windowBarIcon="resumeFileIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText="CV_Jonas_Kjeldmand_Jensen.pdf"
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
                        Help<u style={{ marginLeft: '-2px' }}>_</u>
                    </span>
                </div>

                <div style={styles.viewport}>
                    <iframe
                        src={`${cv}#view=FitH`}
                        title="Resume File — My CV"
                        style={styles.frame}
                        onLoad={() => setLoaded(true)}
                    />
                    {!loaded && (
                        <div style={styles.loadingOverlay}>
                            <p style={styles.loadingText}>Opening document…</p>
                        </div>
                    )}
                </div>

                <div style={styles.buttonBar}>
                    <button
                        style={styles.button}
                        onClick={() => openExternal(cv)}
                    >
                        Open in new tab
                    </button>
                    <a href={cv} download style={styles.linkButton}>
                        Download
                    </a>
                    <button style={styles.button} onClick={onClose}>
                        Close
                    </button>
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
        gap: 16,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    menuItem: {
        cursor: 'default',
        userSelect: 'none',
    },
    viewport: {
        position: 'relative',
        flex: 1,
        minHeight: 0,
        margin: '4px',
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
    buttonBar: {
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        justifyContent: 'flex-end',
        borderTop: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
        alignItems: 'center',
    },
    button: {
        padding: '4px 14px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        textAlign: 'center',
    },
    linkButton: {
        padding: '4px 14px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        textDecoration: 'none',
        cursor: 'pointer',
        textAlign: 'center',
    },
};

export default ResumeFile;
