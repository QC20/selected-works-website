import React, { useEffect, useState } from 'react';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import {
    BatteryState,
    batteryPercent,
    batteryRemaining,
    useBattery,
} from './battery';

/**
 * The small panels behind the tray icons: battery, the connection, and the
 * calendar that drops out of the clock.
 *
 * All three are the same shape as the market ticker and the weather — 186
 * pixels wide, hanging off the bottom-right corner — so the tray reads as one
 * row of related things rather than a shelf of unrelated widgets.
 */

/* -------------------------------------------------------------------------
 * Battery
 * ---------------------------------------------------------------------- */

/**
 * The tray's battery, drawn rather than drawn from a file: the fill has to
 * track the real charge, and twenty PNGs for twenty levels would be silly.
 */
export const BatteryGauge: React.FC<{ state: BatteryState }> = ({ state }) => {
    const percent = batteryPercent(state);
    // Yellow under a quarter, red under a tenth — the thresholds Windows used.
    const colour =
        percent <= 10 ? '#d80000' : percent <= 25 ? '#e8c000' : '#00a800';

    return (
        <div style={batteryStyles.gauge}>
            <div style={batteryStyles.body}>
                <div
                    style={Object.assign({}, batteryStyles.fill, {
                        width: `${Math.max(4, percent)}%`,
                        background: state.charging ? '#00c800' : colour,
                    })}
                />
            </div>
            <div style={batteryStyles.cap} />
            {state.charging && <span style={batteryStyles.bolt}>⚡</span>}
        </div>
    );
};

export const BatteryPanel: React.FC<{ open: boolean; state: BatteryState }> = ({
    open,
    state,
}) => {
    if (!open) return null;
    const percent = batteryPercent(state);
    const remaining = batteryRemaining(state);

    return (
        <div style={styles.panel}>
            <div style={styles.header}>
                <Icon
                    icon={state.charging ? 'acPowerIcon' : 'batteryIcon'}
                    size={16}
                />
                <span style={styles.title}>Power Meter</span>
            </div>

            <div style={styles.readingBox}>
                <BatteryGauge state={state} />
                <span style={styles.reading}>{percent}%</span>
            </div>

            <p style={styles.detail}>
                {state.charging
                    ? percent >= 100
                        ? 'The battery is fully charged.'
                        : 'The battery is charging.'
                    : remaining || 'Running on battery power.'}
            </p>
            <p style={styles.note}>
                Read from the machine you are actually sitting at, like the
                figures in System Properties.
            </p>
        </div>
    );
};

/* -------------------------------------------------------------------------
 * Connection
 * ---------------------------------------------------------------------- */

interface Connection {
    online: boolean;
    effectiveType: string | null;
    downlink: number | null;
}

/** Online/offline plus whatever the browser will say about the link. */
export function useConnection(): Connection {
    const read = (): Connection => {
        const nav = navigator as Navigator & {
            connection?: { effectiveType?: string; downlink?: number };
        };
        return {
            online: navigator.onLine,
            effectiveType: nav.connection?.effectiveType || null,
            downlink: nav.connection?.downlink ?? null,
        };
    };

    const [connection, setConnection] = useState<Connection>(read);

    useEffect(() => {
        const update = () => setConnection(read());
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        const nav = navigator as Navigator & {
            connection?: EventTarget;
        };
        nav.connection?.addEventListener('change', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
            nav.connection?.removeEventListener('change', update);
        };
    }, []);

    return connection;
}

/**
 * Dial-Up Networking's status box, which in 1995 told you your modem had
 * connected at 28,800 bits per second and how long you had been paying for it.
 * The numbers here are the modern equivalents, and the comparison is the joke:
 * the line under them is what the same connection would have been then.
 */
export const ConnectionPanel: React.FC<{
    open: boolean;
    connection: Connection;
    /** Seconds since the desktop loaded — the session's "connected time". */
    connectedFor: number;
}> = ({ open, connection, connectedFor }) => {
    if (!open) return null;

    const minutes = Math.floor(connectedFor / 60);
    const seconds = Math.floor(connectedFor % 60);
    const duration = `${String(minutes).padStart(2, '0')}:${String(
        seconds
    ).padStart(2, '0')}`;

    // A 28.8k modem moved about 3.5 kilobytes a second in the real world.
    const timesFaster = connection.downlink
        ? Math.round((connection.downlink * 1000) / 28.8)
        : null;

    return (
        <div style={styles.panel}>
            <div style={styles.header}>
                <Icon
                    icon={connection.online ? 'dialupIcon' : 'offlineIcon'}
                    size={16}
                />
                <span style={styles.title}>Connected to the Internet</span>
            </div>

            {connection.online ? (
                <>
                    <Row label="Status:" value="Connected" />
                    <Row
                        label="Speed:"
                        value={
                            connection.downlink
                                ? `${connection.downlink} Mbps`
                                : connection.effectiveType || 'Unknown'
                        }
                    />
                    <Row label="Duration:" value={duration} />
                    {timesFaster && (
                        <p style={styles.note}>
                            About {timesFaster.toLocaleString()}× a 28.8k modem,
                            which is what this machine would have dialled with.
                        </p>
                    )}
                </>
            ) : (
                <>
                    <Row label="Status:" value="Disconnected" />
                    <p style={styles.note}>
                        No connection. The pages in Internet Explorer will not
                        load until it comes back.
                    </p>
                </>
            )}
        </div>
    );
};

/* -------------------------------------------------------------------------
 * Calendar
 * ---------------------------------------------------------------------- */

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * The calendar behind the clock — double-clicking the time opened Date/Time
 * Properties, and this is the month grid off its first tab. Read-only: the
 * date belongs to the machine, and a portfolio that let you change it would
 * only be able to lie to itself.
 */
export const CalendarPanel: React.FC<{ open: boolean }> = ({ open }) => {
    const [viewing, setViewing] = useState(() => new Date());
    const today = new Date();

    if (!open) return null;

    const year = viewing.getFullYear();
    const month = viewing.getMonth();
    const firstDay = new Date(year, month, 1);
    // Monday-first, as most of the world (and Denmark) writes a calendar.
    const leading = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [
        ...Array<null>(leading).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7) cells.push(null);

    const step = (delta: number) =>
        setViewing(new Date(year, month + delta, 1));

    return (
        <div style={styles.panel}>
            <div style={styles.calendarHeader}>
                <button
                    style={styles.stepButton}
                    onClick={() => step(-1)}
                    aria-label="Previous month"
                >
                    ◀
                </button>
                <span style={styles.title}>
                    {MONTHS[month]} {year}
                </span>
                <button
                    style={styles.stepButton}
                    onClick={() => step(1)}
                    aria-label="Next month"
                >
                    ▶
                </button>
            </div>

            <div style={styles.calendarGrid}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <span key={`${day}-${i}`} style={styles.dayName}>
                        {day}
                    </span>
                ))}
                {cells.map((day, i) => {
                    const isToday =
                        day === today.getDate() &&
                        month === today.getMonth() &&
                        year === today.getFullYear();
                    return (
                        <span
                            key={i}
                            style={Object.assign(
                                {},
                                styles.day,
                                isToday && styles.dayToday
                            )}
                        >
                            {day || ''}
                        </span>
                    );
                })}
            </div>

            <p style={styles.note}>
                {today.toLocaleDateString(undefined, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                })}
            </p>
        </div>
    );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={styles.row}>
        <span style={styles.rowLabel}>{label}</span>
        <span style={styles.rowValue}>{value}</span>
    </div>
);

const batteryStyles: StyleSheetCSS = {
    gauge: {
        position: 'relative',
        alignItems: 'center',
        flexShrink: 0,
    },
    body: {
        width: 22,
        height: 12,
        padding: 1,
        background: Colors.white,
        border: `1px solid ${Colors.black}`,
        boxSizing: 'border-box',
    },
    fill: {
        height: '100%',
    },
    cap: {
        width: 2,
        height: 6,
        background: Colors.black,
    },
    bolt: {
        position: 'absolute',
        left: 7,
        top: -2,
        fontSize: 10,
        lineHeight: '14px',
        color: Colors.black,
        pointerEvents: 'none',
    },
};

const styles: StyleSheetCSS = {
    panel: {
        position: 'absolute',
        bottom: '135%',
        right: 0,
        width: 186,
        flexDirection: 'column',
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderBottomColor: Colors.black,
        borderRightColor: Colors.black,
        boxShadow: '1px 1px 0 rgba(0,0,0,0.4)',
        padding: 6,
        gap: 5,
        zIndex: 100001,
        fontFamily: 'MSSerif',
    },
    header: {
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
    },
    title: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    readingBox: {
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        flexShrink: 0,
    },
    reading: {
        fontFamily: 'MSSerif',
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.black,
    },
    detail: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        lineHeight: 1.4,
    },
    note: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
        lineHeight: 1.5,
    },
    row: {
        justifyContent: 'space-between',
        gap: 6,
        flexShrink: 0,
    },
    rowLabel: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
    },
    rowValue: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
    },
    calendarHeader: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        flexShrink: 0,
    },
    stepButton: {
        width: 18,
        height: 16,
        padding: 0,
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 8,
        color: Colors.black,
        cursor: 'pointer',
        flexShrink: 0,
    },
    calendarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 1,
        padding: 4,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    dayName: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
        textAlign: 'center',
        paddingBottom: 2,
    },
    day: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        textAlign: 'center',
        padding: '1px 0',
    },
    dayToday: {
        background: Colors.blue,
        color: Colors.white,
        fontWeight: 'bold',
    },
};
