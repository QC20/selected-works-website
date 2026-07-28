/**
 * "Welcome to Windows" log-on screen.
 *
 * Where Start -> Shut down -> "Log off?" lands you, mirroring the log-on step
 * in Yute (Yuteoctober)'s Windows95 Portfolio. Any name gets you back in — it's
 * set dressing, not authentication — and Cancel works too, exactly like the
 * real thing let you dismiss the network log-on.
 */

import React, { useState } from 'react';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { useTheme } from './theme';

export interface LogonScreenProps {
    onLogon: (userName: string) => void;
}

const LogonScreen: React.FC<LogonScreenProps> = ({ onLogon }) => {
    const theme = useTheme();
    const [name, setName] = useState('Jonas');
    const [password, setPassword] = useState('');

    const submit = () => onLogon(name.trim() || 'User');

    return (
        <div
            style={Object.assign({}, styles.screen, {
                background: theme.background,
            })}
        >
            <div style={styles.dialog}>
                <div
                    style={Object.assign({}, styles.titleBar, {
                        background: theme.titleBar,
                    })}
                >
                    <p style={styles.title}>Welcome to Windows</p>
                </div>

                <div style={styles.body}>
                    <div style={styles.iconColumn}>
                        <Icon icon="computerBig" style={styles.bigIcon} />
                    </div>

                    <div style={styles.form}>
                        <p style={styles.blurb}>
                            Type a user name and password to log on to Windows.
                        </p>

                        <div style={styles.field}>
                            <label style={styles.label}>User name:</label>
                            <input
                                style={styles.input}
                                value={name}
                                maxLength={20}
                                autoFocus
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && submit()}
                            />
                        </div>

                        <div style={styles.field}>
                            <label style={styles.label}>Password:</label>
                            <input
                                style={styles.input}
                                type="password"
                                value={password}
                                maxLength={20}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && submit()}
                            />
                        </div>
                    </div>

                    <div style={styles.buttonColumn}>
                        <button style={styles.button} onClick={submit}>
                            OK
                        </button>
                        <button style={styles.button} onClick={submit}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    screen: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000001,
    },
    dialog: {
        flexDirection: 'column',
        width: 420,
        maxWidth: '92%',
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.black,
        borderBottomColor: Colors.black,
        padding: 2,
    },
    titleBar: {
        alignItems: 'center',
        height: 20,
        paddingLeft: 4,
        flexShrink: 0,
    },
    title: {
        color: Colors.white,
        fontFamily: 'MSSerif',
        fontSize: 12,
    },
    body: {
        gap: 12,
        padding: 14,
        alignItems: 'flex-start',
    },
    iconColumn: {
        flexShrink: 0,
        paddingTop: 2,
    },
    bigIcon: {
        width: 40,
        height: 40,
    },
    form: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        gap: 7,
    },
    blurb: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        marginBottom: 4,
        lineHeight: 1.4,
    },
    field: {
        alignItems: 'center',
        gap: 6,
    },
    label: {
        width: 74,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
    },
    input: {
        flex: 1,
        minWidth: 0,
        padding: '3px 4px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    buttonColumn: {
        flexDirection: 'column',
        gap: 6,
        flexShrink: 0,
    },
    button: {
        padding: '4px 12px',
        minWidth: 72,
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        textAlign: 'center',
    },
};

export default LogonScreen;
