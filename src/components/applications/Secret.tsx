import React from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';

/**
 * Secret.txt — only ever opens because of `konami.ts`.
 *
 * There's no icon for this anywhere a visitor would stumble onto it by
 * clicking around: it's added to the Store's app list purely so
 * `install('secret')` has something to flip on, and hidden from the Store's
 * own window (see the `hiddenKeys` passed to `<Store>` in Desktop.tsx) so
 * typing the Konami code is genuinely the only way in. Once found, the icon
 * stays — `installedApps.ts` persists it the same as any other install.
 */

export interface SecretProps extends WindowAppProps {}

const Secret: React.FC<SecretProps> = ({ onInteract, onClose, onMinimize }) => (
    <Window
        top={140}
        left={220}
        width={420}
        height={300}
        windowTitle="Secret.txt - Notepad"
        windowBarIcon="notepadIcon"
        closeWindow={onClose}
        onInteract={onInteract}
        minimizeWindow={onMinimize}
        bottomLeftText="You found it."
    >
        <div style={styles.container}>
            <div style={styles.page}>
                <p style={styles.line}>
                    ↑ ↑ ↓ ↓ ← → ← → B A. Nobody told you that still worked on a
                    desktop, and you tried it anyway.
                </p>
                <p style={styles.line}>
                    That's the entire bar for finding this: be the kind of
                    person who pokes at things that look like they might do
                    something. It's the same instinct that makes someone
                    actually good to build software with.
                </p>
                <p style={styles.line}>
                    Nothing else to see here — just wanted the desktop to say
                    thanks. Feel free to close this and go back to whatever
                    you were actually here for.
                </p>
            </div>
        </div>
    </Window>
);

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        boxSizing: 'border-box',
        padding: 8,
        background: Colors.lightGray,
    },
    page: {
        flex: 1,
        flexDirection: 'column',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderTopColor: Colors.black,
        borderLeftColor: Colors.black,
        padding: 12,
        overflowY: 'auto',
    },
    line: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        lineHeight: 1.6,
        color: Colors.black,
        marginBottom: 10,
    },
};

export default Secret;
