import React, { useEffect, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { countIsShared, getVisitCount, isRemote } from '../os/visitorCountApi';
import {
    UsageStats,
    rankedApps,
    totalAppOpens,
    useUsageStats,
} from '../os/usageStats';

/**
 * Statistics — Control Panel / Utility, and the window behind the tray's
 * hit counter.
 *
 * The counter in the tray can only show one number. This is what justifies it
 * being clickable: the total, plus everything this browser has actually done
 * on the machine.
 *
 * The one rule this window follows absolutely: it never implies the site knows
 * more about you than it does. Exactly one figure here is shared — the visit
 * total, which comes back from `increment_site_visits`. Everything else is
 * read out of this browser's own `localStorage` and has never been sent
 * anywhere. Both sections say so in as many words, because a statistics page
 * on a site whose analytics module is deliberately write-only would otherwise
 * read as a boast about surveillance it isn't doing.
 */

const SHOWCASE_PAGES = [
    '/about',
    '/experience',
    '/projects',
    '/projects/software',
    '/projects/art',
    '/projects/music',
    '/contact',
];

/** "3 days", "4 hours" — one unit, which is all this needs. */
const humanAge = (from: number): string => {
    const ms = Date.now() - from;
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${Math.max(1, mins)} minute${mins === 1 ? '' : 's'}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.floor(hours / 24);
    if (days < 31) return `${days} day${days === 1 ? '' : 's'}`;
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'}`;
};

const Row: React.FC<{ label: string; value: string; hint?: string }> = ({
    label,
    value,
    hint,
}) => (
    <div style={styles.row}>
        <span style={styles.rowLabel}>{label}</span>
        <span style={styles.rowValue} title={hint}>
            {value}
        </span>
    </div>
);

/** A Win95 progress bar — the segmented kind, not a smooth fill. */
const Meter: React.FC<{ value: number; max: number }> = ({ value, max }) => {
    const pct = max ? Math.min(1, value / max) : 0;
    const cells = 20;
    const lit = Math.round(pct * cells);
    return (
        <div style={styles.meter}>
            {Array.from({ length: cells }, (_, i) => (
                <span
                    key={i}
                    style={{
                        ...styles.meterCell,
                        ...(i < lit ? styles.meterCellLit : null),
                    }}
                />
            ))}
        </div>
    );
};

/** The six-digit odometer, the same one the tray popup shows. */
const Odometer: React.FC<{ count: number | null }> = ({ count }) => {
    const digits =
        count === null ? Array(6).fill('-') : String(count).padStart(6, '0').split('');
    return (
        <div style={styles.odometer}>
            {digits.map((d, i) => (
                <span key={i} style={styles.digit}>
                    {d}
                </span>
            ))}
        </div>
    );
};

export interface StatisticsProps extends WindowAppProps {}

const Statistics: React.FC<StatisticsProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const stats: UsageStats = useUsageStats();
    const [total, setTotal] = useState<number | null>(null);
    const [sharedCount, setSharedCount] = useState(false);

    useEffect(() => {
        let alive = true;
        getVisitCount().then((n) => {
            if (!alive) return;
            setTotal(n);
            setSharedCount(countIsShared());
        });
        return () => {
            alive = false;
        };
    }, []);

    const opens = totalAppOpens(stats);
    const ranked = rankedApps(stats).slice(0, 8);
    const pagesSeen = SHOWCASE_PAGES.filter((p) => stats.pages[p]).length;

    return (
        <Window
            top={90}
            left={200}
            width={430}
            height={470}
            windowTitle="Statistics"
            windowBarIcon="visitorCounterIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={
                sharedCount ? 'Counter online' : 'Counter running locally'
            }
        >
            <div style={styles.root}>
                <div style={styles.scroll}>
                    {/* ---- shared ---- */}
                    <fieldset style={styles.group}>
                        <legend style={styles.legend}>This desktop</legend>
                        <Odometer count={total} />
                        <p style={styles.note}>
                            {sharedCount
                                ? 'Visits since the counter went up. This is the only figure here that is shared between everyone.'
                                : "Visits from this browser. The shared counter isn't answering, so this is a local tally."}
                        </p>
                        {!sharedCount && (
                            <p style={styles.warn}>
                                {isRemote
                                    ? 'The shared counter is configured but not responding — run supabase/site_visits.sql against the project to switch it on.'
                                    : "No shared counter configured, so this is this browser's own tally."}
                            </p>
                        )}
                    </fieldset>

                    {/* ---- local ---- */}
                    <fieldset style={styles.group}>
                        <legend style={styles.legend}>You, on this browser</legend>
                        <Row
                            label="Visits"
                            value={String(Math.max(1, stats.sessions))}
                        />
                        <Row
                            label="Known for"
                            value={humanAge(stats.firstSeen)}
                            hint={new Date(stats.firstSeen).toLocaleString()}
                        />
                        <Row label="Programs opened" value={String(opens)} />
                        <Row
                            label="Different programs"
                            value={`${Object.keys(stats.apps).length}`}
                        />
                        <div style={styles.meterRow}>
                            <span style={styles.rowLabel}>Showcase seen</span>
                            <div style={styles.meterWrap}>
                                <Meter
                                    value={pagesSeen}
                                    max={SHOWCASE_PAGES.length}
                                />
                                <span style={styles.meterText}>
                                    {pagesSeen} of {SHOWCASE_PAGES.length} pages
                                </span>
                            </div>
                        </div>
                        <p style={styles.note}>
                            Read out of this browser and never sent anywhere.
                            Clearing site data clears it.
                        </p>
                    </fieldset>

                    {/* ---- most used ---- */}
                    <fieldset style={styles.group}>
                        <legend style={styles.legend}>Most opened</legend>
                        {ranked.length === 0 ? (
                            <p style={styles.note}>
                                Nothing yet. Open something.
                            </p>
                        ) : (
                            ranked.map(([key, n]) => (
                                <div key={key} style={styles.barRow}>
                                    <span style={styles.barLabel}>{key}</span>
                                    <div style={styles.barTrack}>
                                        <div
                                            style={{
                                                ...styles.barFill,
                                                width: `${
                                                    (n / ranked[0][1]) * 100
                                                }%`,
                                            }}
                                        />
                                    </div>
                                    <span style={styles.barCount}>{n}</span>
                                </div>
                            ))
                        )}
                    </fieldset>

                    <div style={styles.footer}>
                        <Icon icon="visitorCounterIcon" size={16} />
                        <span style={styles.footerText}>
                            No cookies, no fingerprinting, no third-party
                            script. See Utility &gt; How It's Built.
                        </span>
                    </div>
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    root: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: Colors.lightGray,
        padding: 8,
    },
    scroll: {
        flex: 1,
        minHeight: 0,
        flexDirection: 'column',
        gap: 10,
        overflowY: 'auto',
    },
    group: {
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        margin: 0,
        padding: '4px 10px 10px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    legend: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        padding: '0 4px',
    },
    odometer: {
        alignSelf: 'center',
        flexDirection: 'row',
        gap: 2,
        padding: '6px 8px',
        margin: '4px 0',
        background: '#111',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    digit: {
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fontSize: 20,
        lineHeight: '20px',
        color: '#39ff6a',
        background: '#000',
        width: 17,
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 10,
    },
    rowLabel: { fontFamily: 'MSSerif', fontSize: 11, color: Colors.black },
    rowValue: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        fontWeight: 'bold',
    },
    meterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    meterWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2,
    },
    meter: {
        flexDirection: 'row',
        gap: 1,
        padding: 2,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
    },
    meterCell: { width: 6, height: 10, background: Colors.lightGray },
    meterCellLit: { background: '#000080' },
    meterText: { fontFamily: 'MSSerif', fontSize: 9, color: '#333' },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    barLabel: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        width: 110,
        flex: 'none',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
    barTrack: {
        flex: 1,
        minWidth: 0,
        height: 11,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
    },
    barFill: { background: '#000080', height: '100%' },
    barCount: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        width: 22,
        flex: 'none',
        textAlign: 'right',
        color: Colors.black,
    },
    note: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        lineHeight: 1.45,
        color: '#333',
        margin: 0,
    },
    warn: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        lineHeight: 1.45,
        color: '#8b0000',
        margin: 0,
    },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 2 },
    footerText: { fontFamily: 'MSSerif', fontSize: 9, color: '#444' },
};

export default Statistics;
