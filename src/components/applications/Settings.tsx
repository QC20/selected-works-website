import React, { useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import {
    BACKGROUNDS,
    PRESETS,
    Theme,
    getTheme,
    setTheme,
    useTheme,
} from '../os/theme';
import { RESOLUTIONS, Resolution } from '../os/resolution';

export interface SettingsProps extends WindowAppProps {
    resolution: Resolution;
    setResolution: (r: Resolution) => void;
}

type Tab = 'background' | 'appearance' | 'settings';

/**
 * Display Properties — what Start → Settings opens. Three tabs, a little
 * monitor preview, and OK / Cancel / Apply, like the real thing. Changes are
 * previewed live and reverted if you press Cancel.
 */
const Settings: React.FC<SettingsProps> = ({
    resolution,
    setResolution,
    onInteract,
    onClose,
    onMinimize,
}) => {
    const theme = useTheme();
    const [tab, setTab] = useState<Tab>('background');

    // What to put back if the user cancels out of their live preview.
    const [initial] = useState<{ theme: Theme; resolution: Resolution }>({
        theme: getTheme(),
        resolution,
    });

    const cancel = () => {
        setTheme(initial.theme);
        setResolution(initial.resolution);
        onClose();
    };

    const tabs: { id: Tab; label: string }[] = [
        { id: 'background', label: 'Background' },
        { id: 'appearance', label: 'Appearance' },
        { id: 'settings', label: 'Settings' },
    ];

    return (
        <Window
            top={80}
            left={140}
            width={420}
            height={430}
            windowTitle="Display Properties"
            windowBarIcon="settingsIcon"
            closeWindow={cancel}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText="Display"
        >
            <div style={styles.container}>
                <div style={styles.tabBar}>
                    {tabs.map((t) => (
                        <div
                            key={t.id}
                            style={Object.assign(
                                {},
                                styles.tab,
                                tab === t.id && styles.activeTab
                            )}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                        </div>
                    ))}
                </div>

                <div style={styles.pane}>
                    {/* Monitor preview — shows the current background and a
                        miniature window using the current title-bar colour. */}
                    <div style={styles.previewArea}>
                        <div style={styles.monitor}>
                            <div
                                style={Object.assign({}, styles.screen, {
                                    background: theme.background,
                                })}
                            >
                                <div style={styles.miniWindow}>
                                    <div
                                        style={Object.assign(
                                            {},
                                            styles.miniTitleBar,
                                            { background: theme.titleBar }
                                        )}
                                    />
                                    <div style={styles.miniBody} />
                                </div>
                            </div>
                            <div style={styles.monitorStand} />
                        </div>
                    </div>

                    {tab === 'background' && (
                        <div style={styles.list}>
                            {BACKGROUNDS.map((bg) => (
                                <div
                                    key={bg.name}
                                    style={Object.assign(
                                        {},
                                        styles.listItem,
                                        theme.background === bg.color &&
                                            styles.listItemSelected
                                    )}
                                    onClick={() =>
                                        setTheme({ background: bg.color })
                                    }
                                >
                                    <span
                                        style={Object.assign(
                                            {},
                                            styles.swatch,
                                            { background: bg.color }
                                        )}
                                    />
                                    <span>{bg.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'appearance' && (
                        <div style={styles.list}>
                            {PRESETS.map((preset) => (
                                <div
                                    key={preset.name}
                                    style={Object.assign(
                                        {},
                                        styles.listItem,
                                        theme.background === preset.background &&
                                            theme.titleBar === preset.titleBar &&
                                            styles.listItemSelected
                                    )}
                                    onClick={() =>
                                        setTheme({
                                            background: preset.background,
                                            titleBar: preset.titleBar,
                                        })
                                    }
                                >
                                    <span
                                        style={Object.assign(
                                            {},
                                            styles.swatch,
                                            { background: preset.titleBar }
                                        )}
                                    />
                                    <span>{preset.name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'settings' && (
                        <div style={styles.settingsPane}>
                            <p style={styles.fieldLabel}>Screen area</p>
                            <div style={styles.list}>
                                {RESOLUTIONS.map((opt) => (
                                    <div
                                        key={opt.value}
                                        style={Object.assign(
                                            {},
                                            styles.listItem,
                                            resolution === opt.value &&
                                                styles.listItemSelected
                                        )}
                                        onClick={() => setResolution(opt.value)}
                                    >
                                        <span style={styles.check}>
                                            {resolution === opt.value ? '•' : ''}
                                        </span>
                                        <span>{opt.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div style={styles.buttonBar}>
                    <button style={styles.button} onClick={onClose}>
                        OK
                    </button>
                    <button style={styles.button} onClick={cancel}>
                        Cancel
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
    tabBar: {
        display: 'flex',
        gap: 2,
        padding: '4px 4px 0 4px',
        flexShrink: 0,
    },
    tab: {
        padding: '4px 14px',
        cursor: 'pointer',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        userSelect: 'none',
        color: Colors.black,
    },
    activeTab: {
        background: Colors.white,
        borderBottomColor: Colors.white,
    },
    pane: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        padding: 10,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        margin: '0 4px',
    },
    previewArea: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4px 0 10px 0',
        flexShrink: 0,
    },
    monitor: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    screen: {
        width: 128,
        height: 92,
        border: `2px solid ${Colors.darkGray}`,
        borderTopColor: Colors.black,
        borderLeftColor: Colors.black,
        padding: 8,
    },
    monitorStand: {
        width: 40,
        height: 8,
        background: Colors.lightGray,
        border: `1px solid ${Colors.darkGray}`,
        borderTopColor: Colors.white,
    },
    miniWindow: {
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        border: `1px solid ${Colors.black}`,
        background: Colors.lightGray,
    },
    miniTitleBar: {
        height: 8,
        flexShrink: 0,
    },
    miniBody: {
        flex: 1,
        background: Colors.lightGray,
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
    },
    listItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '3px 6px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        userSelect: 'none',
        flexShrink: 0,
    },
    listItemSelected: {
        background: Colors.blue,
        color: Colors.white,
    },
    swatch: {
        width: 14,
        height: 14,
        display: 'inline-block',
        border: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    check: {
        width: 14,
        display: 'inline-block',
        textAlign: 'center',
    },
    settingsPane: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
    },
    fieldLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        marginBottom: 4,
    },
    buttonBar: {
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        justifyContent: 'flex-end',
        flexShrink: 0,
    },
    button: {
        padding: '4px 16px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        minWidth: 60,
        textAlign: 'center',
    },
};

export default Settings;
