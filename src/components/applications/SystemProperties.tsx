import React, { useMemo, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { batterySummary, useBattery } from '../os/battery';

/**
 * System Properties — what right-clicking My Computer and choosing Properties
 * opens, the same as it did in 1995.
 *
 * The joke only works if the numbers are real, so they are: the processor
 * count, the memory, the screen and the "network adapter" are all read off the
 * actual machine through `navigator` and `screen`, then written up in the
 * register of a Windows 95 property sheet. A visitor on a 10-core laptop sees
 * ten processors listed under a Windows 95 banner, which is a better joke than
 * anything invented would be.
 *
 * Where a browser won't say (Firefox and Safari don't implement
 * `deviceMemory`), the row says so rather than inventing a figure.
 */

type Tab = 'general' | 'devices' | 'performance';

interface Detected {
    browser: string;
    platform: string;
    processors: string;
    memory: string;
    screen: string;
    colorDepth: string;
    language: string;
    touch: string;
    connection: string;
}

/** Everything the browser is willing to say about the machine it's running on. */
function detect(): Detected {
    const nav = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { effectiveType?: string };
        userAgentData?: { platform?: string };
    };

    const ua = nav.userAgent;
    const browser =
        /Firefox\/([\d.]+)/.exec(ua)?.[0] ||
        /Edg\/([\d.]+)/.exec(ua)?.[0]?.replace('Edg', 'Edge ') ||
        /Chrome\/([\d.]+)/.exec(ua)?.[0] ||
        (/Safari\//.test(ua) && /Version\/([\d.]+)/.exec(ua)
            ? `Safari ${/Version\/([\d.]+)/.exec(ua)![1]}`
            : '') ||
        'an unidentified browser';

    const platform =
        nav.userAgentData?.platform ||
        // `platform` is deprecated but is still the only thing that answers in
        // every browser this desktop runs in.
        (nav as unknown as { platform?: string }).platform ||
        'Unknown';

    return {
        browser: browser.replace('/', ' '),
        platform,
        processors: nav.hardwareConcurrency
            ? `${nav.hardwareConcurrency}x virtual processor${
                  nav.hardwareConcurrency === 1 ? '' : 's'
              }`
            : 'Processor count not reported',
        memory: nav.deviceMemory
            ? `${nav.deviceMemory * 1024} MB RAM`
            : 'RAM not reported by this browser',
        screen: `${window.screen.width} x ${window.screen.height} pixels`,
        colorDepth: `${window.screen.colorDepth}-bit colour`,
        language: nav.language || 'en',
        touch: navigator.maxTouchPoints > 0 ? 'Present' : 'Not installed',
        connection: nav.connection?.effectiveType
            ? `Online (${nav.connection.effectiveType})`
            : navigator.onLine
              ? 'Online'
              : 'Offline',
    };
}

export interface SystemPropertiesProps extends WindowAppProps {}

const SystemProperties: React.FC<SystemPropertiesProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [tab, setTab] = useState<Tab>('general');
    const machine = useMemo(detect, []);
    // A real reading where the browser offers one; the row says so where not.
    const battery = useBattery();

    return (
        <Window
            top={90}
            left={180}
            width={420}
            height={464}
            windowTitle="System Properties"
            windowBarIcon="systemIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText="System Properties"
        >
            <div style={styles.container}>
                <div style={styles.tabs}>
                    <TabButton
                        label="General"
                        active={tab === 'general'}
                        onClick={() => setTab('general')}
                    />
                    <TabButton
                        label="Device Manager"
                        active={tab === 'devices'}
                        onClick={() => setTab('devices')}
                    />
                    <TabButton
                        label="Performance"
                        active={tab === 'performance'}
                        onClick={() => setTab('performance')}
                    />
                </div>

                <div style={styles.sheet}>
                    {tab === 'general' && (
                        <div style={styles.general}>
                            <Icon icon="computerBig" style={styles.bigIcon} />
                            <div style={styles.generalText}>
                                <Field label="System:">
                                    Windows 95
                                    <br />
                                    4.00.950 B
                                    <br />
                                    Hosted by {machine.browser}
                                </Field>
                                <Field label="Registered to:">
                                    A welcome visitor
                                    <br />
                                    Jonas Kjeldmand Jensen
                                    <br />
                                    Academic · Usability Engineer · Tinkerer
                                </Field>
                                <Field label="Computer:">
                                    {machine.platform}
                                    <br />
                                    {machine.processors}
                                    <br />
                                    {machine.memory}
                                </Field>
                            </div>
                        </div>
                    )}

                    {tab === 'devices' && (
                        <>
                            <p style={styles.lead}>
                                View devices by type:
                            </p>
                            <div style={styles.deviceList}>
                                <DeviceGroup
                                    icon="computerSmall"
                                    label="Computer"
                                    items={[machine.platform, machine.processors]}
                                />
                                <DeviceGroup
                                    icon="displayIcon"
                                    label="Display adapters"
                                    items={[
                                        `Emulated CRT — ${machine.screen}`,
                                        machine.colorDepth,
                                    ]}
                                />
                                <DeviceGroup
                                    icon="hardDriveIcon"
                                    label="Disk drives"
                                    items={[
                                        'Hard Disk (C:) — programs, documents, pictures',
                                        'Hard Disk (D:) — utilities',
                                        'CD-ROM — no disc inserted',
                                    ]}
                                />
                                <DeviceGroup
                                    icon="internetExplorerIcon"
                                    label="Network adapters"
                                    items={[machine.connection]}
                                />
                                <DeviceGroup
                                    icon={
                                        battery.supported && !battery.charging
                                            ? 'batteryIcon'
                                            : 'acPowerIcon'
                                    }
                                    label="System devices"
                                    items={[
                                        battery.supported
                                            ? `Battery — ${batterySummary(battery)}`
                                            : 'No battery detected (this browser does not report one)',
                                        battery.supported && battery.charging
                                            ? 'AC adapter — connected'
                                            : 'AC adapter — not reported',
                                    ]}
                                />
                                <DeviceGroup
                                    icon="soundRecorderIcon"
                                    label="Sound, video and game controllers"
                                    items={[
                                        'Sound Blaster 16 (emulated)',
                                        'Pointing device, keyboard',
                                        `Touch input: ${machine.touch}`,
                                    ]}
                                />
                            </div>
                        </>
                    )}

                    {tab === 'performance' && (
                        <>
                            <div style={styles.perfBlock}>
                                <Row label="Memory:" value={machine.memory} />
                                <Row
                                    label="System Resources:"
                                    value="87% free"
                                />
                                <Row label="File System:" value="32-bit" />
                                <Row label="Virtual Memory:" value="32-bit" />
                                <Row
                                    label="Disk Compression:"
                                    value="Not installed"
                                />
                                <Row
                                    label="PC Cards (PCMCIA):"
                                    value="No PC Card sockets are installed"
                                />
                                <Row
                                    label="Language:"
                                    value={machine.language}
                                />
                                <Row
                                    label="Power:"
                                    value={batterySummary(battery)}
                                />
                            </div>
                            <div style={styles.note}>
                                <p style={styles.noteText}>
                                    Your system is configured for optimal
                                    performance.
                                </p>
                                <p style={styles.noteSmall}>
                                    Every figure above that a browser will
                                    report is read from the machine you are
                                    actually sitting at. The ones it won't
                                    report say so.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <div style={styles.buttons}>
                    <button style={styles.button} onClick={onClose}>
                        OK
                    </button>
                    <button style={styles.button} onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </Window>
    );
};

const TabButton: React.FC<{
    label: string;
    active: boolean;
    onClick: () => void;
}> = ({ label, active, onClick }) => (
    <button
        style={Object.assign({}, styles.tab, active && styles.tabActive)}
        onClick={onClick}
    >
        {label}
    </button>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
    label,
    children,
}) => (
    <div style={styles.field}>
        <p style={styles.fieldLabel}>{label}</p>
        <p style={styles.fieldValue}>{children}</p>
    </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={styles.row}>
        <span style={styles.rowLabel}>{label}</span>
        <span style={styles.rowValue}>{value}</span>
    </div>
);

const DeviceGroup: React.FC<{
    icon:
        | 'computerSmall'
        | 'displayIcon'
        | 'hardDriveIcon'
        | 'internetExplorerIcon'
        | 'soundRecorderIcon'
        | 'batteryIcon'
        | 'acPowerIcon';
    label: string;
    items: string[];
}> = ({ icon, label, items }) => (
    <div style={styles.deviceGroup}>
        <div style={styles.deviceHeader}>
            <Icon icon={icon} size={16} />
            <span style={styles.deviceLabel}>{label}</span>
        </div>
        {items.map((item) => (
            <p key={item} style={styles.deviceItem}>
                {item}
            </p>
        ))}
    </div>
);

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        gap: 0,
        padding: 8,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
    },
    tabs: {
        alignItems: 'flex-end',
        gap: 2,
        flexShrink: 0,
    },
    tab: {
        padding: '4px 10px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: 'transparent',
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        cursor: 'pointer',
        flexShrink: 0,
    },
    tabActive: {
        // The selected tab sits a pixel proud of the sheet and merges with it.
        padding: '6px 10px 5px 10px',
        fontWeight: 'bold',
    },
    sheet: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        gap: 10,
        padding: 12,
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
    general: {
        gap: 14,
        flexShrink: 0,
    },
    bigIcon: {
        width: 48,
        height: 48,
        objectFit: 'contain',
        flexShrink: 0,
    },
    generalText: {
        flexDirection: 'column',
        gap: 12,
        minWidth: 0,
    },
    field: {
        flexDirection: 'column',
        gap: 2,
    },
    fieldLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    fieldValue: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        lineHeight: 1.5,
        paddingLeft: 10,
    },
    lead: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
    },
    deviceList: {
        flexDirection: 'column',
        gap: 8,
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: 8,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    deviceGroup: {
        flexDirection: 'column',
        gap: 2,
        flexShrink: 0,
    },
    deviceHeader: {
        alignItems: 'center',
        gap: 6,
    },
    deviceLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    deviceItem: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        paddingLeft: 24,
        lineHeight: 1.5,
    },
    perfBlock: {
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0,
    },
    row: {
        alignItems: 'baseline',
        gap: 8,
        flexShrink: 0,
    },
    rowLabel: {
        width: 132,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
    },
    rowValue: {
        flex: 1,
        minWidth: 0,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    note: {
        flexDirection: 'column',
        gap: 6,
        padding: 8,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        flexShrink: 0,
    },
    noteText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    noteSmall: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        lineHeight: 1.5,
    },
    buttons: {
        justifyContent: 'flex-end',
        gap: 6,
        paddingTop: 8,
        flexShrink: 0,
    },
    button: {
        minWidth: 74,
        padding: '4px 12px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        cursor: 'pointer',
        flexShrink: 0,
    },
};

export default SystemProperties;
