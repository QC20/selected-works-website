import React from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { useConnection, usePublicIP } from '../os/network';

/**
 * Dial-Up Networking — My Computer > Hard Disk (D:) > Utility.
 *
 * The full-window version of the tray's connectivity icon: same reading
 * (`navigator.onLine` plus the Network Information API where the browser has
 * it), plus the one thing the tray's small popup only gained recently — the
 * visitor's own public IP address, looked up from ipify the moment this
 * window opens. Nothing about it is sent anywhere else or kept past the
 * lookup itself.
 */

export interface NetworkInfoProps extends WindowAppProps {}

const NetworkInfo: React.FC<NetworkInfoProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const connection = useConnection();
    const { address, error } = usePublicIP();

    // A 28.8k modem moved about 3.5 kilobytes a second in the real world.
    const timesFaster = connection.downlink
        ? Math.round((connection.downlink * 1000) / 28.8)
        : null;

    return (
        <Window
            top={90}
            left={160}
            width={360}
            height={340}
            windowTitle="Dial-Up Networking"
            windowBarIcon={connection.online ? 'dialupIcon' : 'offlineIcon'}
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={connection.online ? 'Connected' : 'Disconnected'}
        >
            <div style={styles.container}>
                <div style={styles.header}>
                    <Icon
                        icon={connection.online ? 'dialupIcon' : 'offlineIcon'}
                        style={styles.headerIcon}
                    />
                    <div style={styles.headerText}>
                        <span style={styles.headerTitle}>
                            {connection.online
                                ? 'Connected to the Internet'
                                : 'No connection'}
                        </span>
                        <span style={styles.headerSub}>
                            {connection.online
                                ? 'This machine can reach the outside world.'
                                : 'Pages will not load until it comes back.'}
                        </span>
                    </div>
                </div>

                <div style={styles.groupBox}>
                    <span style={styles.groupTitle}>Status</span>
                    <Row label="Status:" value={connection.online ? 'Connected' : 'Disconnected'} />
                    <Row
                        label="Speed:"
                        value={
                            connection.online
                                ? connection.downlink
                                    ? `${connection.downlink} Mbps`
                                    : connection.effectiveType || 'Unknown'
                                : '—'
                        }
                    />
                    {timesFaster && (
                        <p style={styles.note}>
                            About {timesFaster.toLocaleString()}× a 28.8k modem,
                            which is what this machine would have dialled with.
                        </p>
                    )}
                </div>

                <div style={styles.groupBox}>
                    <span style={styles.groupTitle}>This computer</span>
                    <Row
                        label="IP Address:"
                        value={address || (error ? 'Unavailable' : 'Looking up…')}
                    />
                    <p style={styles.note}>
                        {error
                            ? error
                            : 'The address the sites you visit see this machine as. Nobody but you is shown this — it is not logged anywhere by this desktop.'}
                    </p>
                </div>
            </div>
        </Window>
    );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={styles.row}>
        <span style={styles.rowLabel}>{label}</span>
        <span style={styles.rowValue}>{value}</span>
    </div>
);

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        boxSizing: 'border-box',
        gap: 10,
        padding: 12,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
    },
    header: {
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
    },
    headerIcon: {
        width: 32,
        height: 32,
        objectFit: 'contain',
    },
    headerText: {
        flexDirection: 'column',
        minWidth: 0,
        gap: 2,
    },
    headerTitle: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.black,
    },
    headerSub: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        lineHeight: 1.4,
    },
    groupBox: {
        position: 'relative',
        flexDirection: 'column',
        gap: 5,
        flexShrink: 0,
        marginTop: 6,
        padding: '10px 10px 9px 10px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    groupTitle: {
        position: 'absolute',
        top: -7,
        left: 8,
        padding: '0 4px',
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
    },
    row: {
        justifyContent: 'space-between',
        gap: 6,
        flexShrink: 0,
    },
    rowLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
    },
    rowValue: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    note: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
        lineHeight: 1.5,
    },
};

export default NetworkInfo;
