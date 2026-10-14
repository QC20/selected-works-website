import React from 'react';
import Colors from '../../constants/colors';
import { IconName } from '../../assets/icons';
import { Icon } from '../general';
import { useTheme } from './theme';

/**
 * What stands in for a program while its code is still arriving.
 * ---------------------------------------------------------------
 * Now that the applications are separate chunks (see `lazyApp.ts`), there is a
 * gap between double-clicking an icon and the program existing. On a fast
 * connection, with preloading on hover, that gap is usually zero — this is the
 * safety net for when it is not.
 *
 * It is a real window rather than a spinner, and that is the whole point. The
 * illusion this site runs on is that these are programs on a machine, and a
 * program opening a window and then filling it in is exactly what Windows 95
 * did on hardware of the period — you saw the frame, the title bar and the
 * grey, and the contents caught up. A centred spinner on a blank page would be
 * a web page admitting it is a web page.
 *
 * Sized and positioned to match the window that will replace it, so the swap
 * is not a jump.
 */
export interface WindowLoadingProps {
    name: string;
    icon?: IconName;
}

const WindowLoading: React.FC<WindowLoadingProps> = ({ name, icon }) => {
    const theme = useTheme();
    return (
        <div style={styles.container} aria-hidden="true">
            <div style={styles.window}>
                <div style={styles.borderOuter}>
                    <div style={styles.borderInner}>
                        <div
                            style={{
                                ...styles.topBar,
                                backgroundColor: theme.titleBar,
                            }}
                        >
                            {icon && <Icon icon={icon} size={14} />}
                            <span style={styles.title}>{name}</span>
                        </div>
                        <div style={styles.body}>
                            <span style={styles.label}>Starting {name}…</span>
                            {/* The Win95 segmented progress bar. Deliberately
                                indeterminate: the real figure is the chunk's
                                download, which is usually over before this is
                                painted, and a bar that completes instantly
                                reads as a glitch. */}
                            <div style={styles.track}>
                                <div className="win-progress" style={styles.fill} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
    },
    window: {
        position: 'absolute',
        top: 120,
        left: 200,
        width: 320,
        height: 128,
        boxSizing: 'border-box',
        background: Colors.lightGray,
        border: `1px solid ${Colors.black}`,
        boxShadow: '2px 2px 0 rgba(0,0,0,0.35)',
    },
    borderOuter: {
        flex: 1,
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
    borderInner: {
        flex: 1,
        flexDirection: 'column',
        border: `1px solid ${Colors.lightGray}`,
        borderRightColor: '#808080',
        borderBottomColor: '#808080',
        padding: 2,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        padding: '2px 4px',
        flexShrink: 0,
    },
    title: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: Colors.white,
        fontWeight: 'bold',
    },
    body: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 10,
        padding: '0 16px',
    },
    label: { fontFamily: 'MSSerif', fontSize: 11, color: Colors.black },
    track: {
        height: 16,
        padding: 2,
        background: Colors.lightGray,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        overflow: 'hidden',
    },
    fill: {
        width: '38%',
        height: '100%',
        background: `repeating-linear-gradient(90deg, #000080 0 10px, transparent 10px 13px)`,
    },
};

export default WindowLoading;
