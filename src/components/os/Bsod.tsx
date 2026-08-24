import React from 'react';

/**
 * The Blue Screen of Death.
 *
 * Rendered by `Screensaver.tsx`, which is also what decides *when*: on a
 * small chance each time the desktop would otherwise have gone to the normal
 * screen saver (see `BSOD_CHANCE` there). Old Windows machines didn't crash on
 * a schedule, so this doesn't either — it's a rare thing that happens to land
 * on a handful of long-idle visitors rather than something most people will
 * ever see. Dismissing it is a fake "reboot": any key or click hands back to
 * `stop`, same as waking the real screen saver.
 */

/** A fresh fake address each time this mounts, not once at import time. */
const randomAddress = (): string =>
    `0028:C001${Math.random() < 0.5 ? 'E' : 'F'}${Math.floor(
        Math.random() * 0xffff
    )
        .toString(16)
        .toUpperCase()
        .padStart(4, '0')}`;

export interface BsodProps {
    onDismiss: () => void;
}

const Bsod: React.FC<BsodProps> = ({ onDismiss }) => {
    const [address] = React.useState(randomAddress);
    return (
        <div
            style={styles.screen}
            onPointerDown={onDismiss}
            title="Press any key to continue"
        >
            <p style={styles.line}>Windows</p>
            <p style={styles.blank} />
            <p style={styles.line}>
                A fatal exception 0E has occurred at {address} in VXD
                DESKTOP95(01) + 00010E36. The current application will be
                terminated.
            </p>
            <p style={styles.blank} />
            <p style={styles.line}>
                * Press any key to terminate the current application.
            </p>
            <p style={styles.line}>
                * Press any key again to return to Windows.
            </p>
            <p style={styles.blank} />
            <p style={styles.line}>Press any key to continue _</p>
        </div>
    );
};

const styles: StyleSheetCSS = {
    screen: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#0000AA',
        zIndex: 200000,
        cursor: 'default',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '10vh 8vw',
        boxSizing: 'border-box',
    },
    line: {
        fontFamily: 'monospace',
        fontSize: 18,
        lineHeight: 1.6,
        color: '#fff',
        maxWidth: 720,
    },
    blank: {
        height: 18,
    },
};

export default Bsod;
