import React, { useEffect, useState } from 'react';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import {
    BatteryState,
    batteryPercent,
    batteryRemaining,
    useBattery,
} from './battery';
import { Connection, useConnection, usePublicIP } from './network';
import { PetDef, PetMood, computeMood, contentment, feedPet, pettPet } from './pets';
import { ResourceSnapshot } from './resourceMeter';

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
    // Only looked up once the panel is actually opened — a visitor who never
    // clicks the tray icon never triggers the request.
    const { address, error: ipError } = usePublicIP(open && connection.online);
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
                    <Row
                        label="IP Address:"
                        value={address || (ipError ? '—' : 'Looking up…')}
                    />
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

/* -------------------------------------------------------------------------
 * Visitor counter
 * ---------------------------------------------------------------------- */

/**
 * The odometer GIF every personal site had bolted to the bottom of its
 * homepage in 1998, moved into the tray instead. Six digits, zero-padded,
 * the way those counters always ran regardless of how far from six digits
 * the real total was.
 */
export const VisitorCounterPanel: React.FC<{
    open: boolean;
    count: number | null;
    /** Opens the full Statistics window, the way the ticker opens Market Watch. */
    onOpenApp?: () => void;
}> = ({ open, count, onOpenApp }) => {
    if (!open) return null;
    const digits =
        count === null ? null : String(count).padStart(6, '0').split('');

    return (
        <div style={styles.panel}>
            <div style={styles.header}>
                <Icon icon="visitorCounterIcon" size={16} />
                <span style={styles.title}>Visitor Counter</span>
            </div>

            <div style={counterStyles.odometer}>
                {(digits ?? Array(6).fill('-')).map((d, i) => (
                    <span key={i} style={counterStyles.digit}>
                        {d}
                    </span>
                ))}
            </div>

            <p style={styles.note}>
                {count === null
                    ? "Couldn't reach the counter this time."
                    : `You're visit number ${count.toLocaleString()} on this desktop.`}
            </p>

            {onOpenApp && (
                <button
                    type="button"
                    style={counterStyles.more}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        onOpenApp();
                    }}
                >
                    Statistics...
                </button>
            )}
        </div>
    );
};

const counterStyles: StyleSheetCSS = {
    more: {
        display: 'flex',
        justifyContent: 'center',
        alignSelf: 'stretch',
        padding: '3px 8px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
    odometer: {
        alignSelf: 'stretch',
        justifyContent: 'center',
        gap: 2,
        padding: '6px 8px',
        background: '#111',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    digit: {
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fontSize: 18,
        lineHeight: '18px',
        color: '#39ff6a',
        background: '#000',
        width: 15,
        textAlign: 'center',
    },
};


/* -------------------------------------------------------------------------
 * Pet
 * ---------------------------------------------------------------------- */

const MOOD_DOT: Record<PetMood, string> = {
    excited: '#39d15a',
    content: '#2e7d32',
    hungry: '#e0a800',
    starving: '#c0392b',
};

const MOOD_WORD: Record<PetMood, string> = {
    excited: 'excited',
    content: 'content',
    hungry: 'getting hungry',
    starving: 'very hungry',
};

/** The tray icon: the pet's own icon plus a small mood dot, the same idea as
 *  the battery's charging bolt. */
export const PetGauge: React.FC<{ pet: PetDef; mood: PetMood }> = ({
    pet,
    mood,
}) => (
    <div style={petStyles.gaugeWrap}>
        <Icon icon={pet.icon} size={18} />
        <span
            style={{ ...petStyles.dot, background: MOOD_DOT[mood] }}
            aria-hidden="true"
        />
    </div>
);

export const PetPanel: React.FC<{
    open: boolean;
    pet: PetDef;
    mood: PetMood;
    level: number;
    onOpenApp?: () => void;
}> = ({ open, pet, mood, level, onOpenApp }) => {
    if (!open) return null;
    return (
        <div style={styles.panel}>
            <div style={styles.header}>
                <Icon icon={pet.icon} size={16} />
                <span style={styles.title}>{pet.name}</span>
            </div>

            <div style={petStyles.meter}>
                {Array.from({ length: 20 }, (_, i) => (
                    <span
                        key={i}
                        style={{
                            ...petStyles.meterCell,
                            ...(i < Math.round((level / 100) * 20)
                                ? { background: MOOD_DOT[mood] }
                                : null),
                        }}
                    />
                ))}
            </div>

            <p style={styles.note}>
                {pet.name} is {MOOD_WORD[mood]}.
            </p>

            <div style={petStyles.actions}>
                <button
                    type="button"
                    style={petStyles.actionButton}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        feedPet();
                    }}
                >
                    Feed
                </button>
                <button
                    type="button"
                    style={petStyles.actionButton}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        pettPet();
                    }}
                >
                    Pat
                </button>
            </div>

            {onOpenApp && (
                <button
                    type="button"
                    style={counterStyles.more}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        onOpenApp();
                    }}
                >
                    Open {pet.name}...
                </button>
            )}
        </div>
    );
};

const petStyles: StyleSheetCSS = {
    gaugeWrap: { position: 'relative' },
    dot: {
        position: 'absolute',
        right: -1,
        bottom: -1,
        width: 6,
        height: 6,
        borderRadius: '50%',
        border: '1px solid #000',
    },
    meter: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        gap: 1,
        padding: 2,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
    },
    meterCell: { flex: 1, height: 12, background: Colors.lightGray },
    actions: { flexDirection: 'row', gap: 6, alignSelf: 'stretch' },
    actionButton: {
        flex: 1,
        padding: '3px 6px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
};


/* -------------------------------------------------------------------------
 * Resource Meter
 * ---------------------------------------------------------------------- */

/** Green above 40% free, amber above 15%, red below — the same thresholds
 *  the battery gauge uses, so "the machine is under strain" reads the same
 *  way wherever it shows up in the tray. */
const resourceColor = (freePercent: number): string =>
    freePercent <= 15 ? '#d80000' : freePercent <= 40 ? '#e8c000' : '#00a800';

/** The tray icon: a single vertical bar, exactly the shape the real Windows
 *  95 Resource Meter used — one number, not a dashboard. */
export const ResourceGauge: React.FC<{ freePercent: number }> = ({
    freePercent,
}) => (
    <div style={resourceStyles.gauge}>
        <div style={resourceStyles.body}>
            <div
                style={{
                    ...resourceStyles.fill,
                    height: `${Math.max(4, freePercent)}%`,
                    background: resourceColor(freePercent),
                }}
            />
        </div>
    </div>
);

export const ResourcePanel: React.FC<{
    open: boolean;
    snapshot: ResourceSnapshot;
    onOpenApp?: () => void;
}> = ({ open, snapshot, onOpenApp }) => {
    if (!open) return null;
    const mins = Math.floor(snapshot.uptimeSeconds / 60);
    const secs = snapshot.uptimeSeconds % 60;

    return (
        <div style={styles.panel}>
            <div style={styles.header}>
                <Icon icon="resourceMeterIcon" size={16} />
                <span style={styles.title}>System Resources</span>
            </div>

            <Row
                label="Resources free"
                value={`${snapshot.memoryFreePercent}%`}
            />
            <Row
                label={snapshot.hasMemoryApi ? 'Heap used' : 'DOM nodes'}
                value={
                    snapshot.hasMemoryApi
                        ? `${snapshot.usedHeapMB!.toFixed(1)} / ${snapshot.limitHeapMB!.toFixed(
                              0
                          )} MB`
                        : String(snapshot.domNodeCount)
                }
            />
            <Row label="Frame rate" value={`${snapshot.fps} fps`} />
            <Row label="Windows open" value={String(snapshot.openWindows)} />
            <Row
                label="Session uptime"
                value={`${mins}:${String(secs).padStart(2, '0')}`}
            />

            <p style={styles.note}>
                {snapshot.hasMemoryApi
                    ? 'Real JS heap usage for this tab.'
                    : "This browser doesn't expose heap usage — DOM size stands in."}
            </p>

            {onOpenApp && (
                <button
                    type="button"
                    style={counterStyles.more}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        onOpenApp();
                    }}
                >
                    System Monitor...
                </button>
            )}
        </div>
    );
};

const resourceStyles: StyleSheetCSS = {
    gauge: { width: 12, height: 16, flexDirection: 'column' },
    body: {
        flex: 1,
        justifyContent: 'flex-end',
        background: '#111',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    fill: { width: '100%' },
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
