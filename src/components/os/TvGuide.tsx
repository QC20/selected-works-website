import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Channel } from './channels';
import { listings, onAir, Slot } from './tvSchedule';

/**
 * The listings channel.
 * ---------------------
 * Press GUIDE on the set and the tube shows the grid, the way cable boxes
 * did: channels down the side, half-hours across the top, every programme a
 * block as wide as it runs. It is drawn *on the picture*, under the same CRT
 * glass as the programmes, rather than as a panel beside the set — the set
 * is already a window inside a window, and a third surface would make it a
 * dashboard. The programme you were watching keeps playing underneath, so
 * its sound carries on while you browse, as it did.
 *
 * A grid of buttons is unusable by keyboard if every block is a tab stop, so
 * it is one: the grid takes a single tab stop and the arrow keys move around
 * inside it (a roving tabindex). Each block's label says the channel, the
 * time and the title, which is everything the block shows by position.
 */

const HALF_HOUR = 30 * 60 * 1000;
/** Half-hours across. Three is what fits at a readable width. */
const SPAN = 3;
/** How far ahead the guide pages, in half-hours. Six hours. */
const LAST_PAGE = 12;

const timeOfDay = (t: number): string =>
    new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const runtime = (seconds: number): string => {
    const m = Math.round(seconds / 60);
    if (m < 60) return `${Math.max(1, m)} min`;
    return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
};

/** Channels with nothing scheduled — the test card — get one block. */
const keyOf = (channel: number, slot: Slot | null): string =>
    slot ? `${channel}:${slot.startsAt}` : `${channel}:bars`;

export interface TvGuideProps {
    channels: Channel[];
    /** The channel the set is on. */
    current: number;
    /** The wall clock, ticked by the set. */
    now: number;
    onTune: (channel: number) => void;
    onClose: () => void;
}

const TvGuide: React.FC<TvGuideProps> = ({
    channels,
    current,
    now,
    onTune,
    onClose,
}) => {
    const gridRef = useRef<HTMLDivElement | null>(null);
    const [page, setPage] = useState(0);

    const base = Math.floor(now / HALF_HOUR) * HALF_HOUR;
    const from = base + page * HALF_HOUR;
    const to = from + SPAN * HALF_HOUR;

    // `from` moves every half hour, not every tick, so this is cheap.
    const rows = useMemo(
        () => channels.map((c) => ({ channel: c, slots: listings(c, from, to) })),
        [channels, from, to]
    );

    const [focusKey, setFocusKey] = useState(() => {
        const c = channels.find((ch) => ch.number === current);
        return keyOf(current, c ? onAir(c, now) : null);
    });

    // Whichever block owns the tab stop. If the focused block has scrolled
    // out of the window, the current channel's first block takes it, so a
    // keyboard can always get back in.
    const keys = rows.flatMap(({ channel, slots }) =>
        slots.length ? slots.map((s) => keyOf(channel.number, s)) : [keyOf(channel.number, null)]
    );
    const tabbable = keys.includes(focusKey)
        ? focusKey
        : keys.find((k) => k.startsWith(`${current}:`)) ?? keys[0];

    // Move real focus with the key — on open, which is what lets the arrow
    // keys work straight away after pressing GUIDE, and after an arrow key.
    // Not after EARLIER/LATER or the clock: focus jumping out of a button
    // somebody just pressed is worse than focus staying put.
    const pullFocus = useRef(true);
    useEffect(() => {
        if (!pullFocus.current) return;
        pullFocus.current = false;
        gridRef.current
            ?.querySelector<HTMLElement>(`[data-key="${tabbable}"]`)
            ?.focus();
    }, [tabbable]);

    /** Page the window so `slot` is on screen; false if it cannot be. */
    const reveal = (slot: Slot): boolean => {
        let next = page;
        if (slot.startsAt >= to) {
            next = Math.floor((slot.startsAt - base) / HALF_HOUR) - (SPAN - 1);
        } else if (slot.endsAt <= from) {
            next = Math.floor((slot.startsAt - base) / HALF_HOUR);
        }
        if (next < 0 || next > LAST_PAGE) return false;
        setPage(next);
        return true;
    };

    const onKey = (
        e: React.KeyboardEvent,
        channel: Channel,
        slot: Slot | null
    ) => {
        const row = channels.indexOf(channel);
        let target: { channel: Channel; slot: Slot | null } | null = null;

        switch (e.key) {
            case 'ArrowRight':
                if (slot) target = { channel, slot: onAir(channel, slot.endsAt) };
                break;
            case 'ArrowLeft':
                if (slot) target = { channel, slot: onAir(channel, slot.startsAt - 1) };
                break;
            case 'ArrowUp':
            case 'ArrowDown': {
                const other = channels[row + (e.key === 'ArrowUp' ? -1 : 1)];
                if (!other) break;
                // Whatever is on the other channel at the same moment.
                const at = slot ? Math.max(slot.startsAt, from) : from;
                target = { channel: other, slot: onAir(other, at) };
                break;
            }
            case 'Enter':
            case ' ':
                e.preventDefault();
                onTune(channel.number);
                return;
            case 'Escape':
                e.preventDefault();
                onClose();
                return;
            default:
                return;
        }

        e.preventDefault();
        if (!target) return;
        // Nothing before the half-hour that is on now: it has been broadcast.
        if (target.slot && target.slot.endsAt <= base) return;
        if (target.slot && !reveal(target.slot)) return;
        pullFocus.current = true;
        setFocusKey(keyOf(target.channel.number, target.slot));
    };

    const span = to - from;
    const nowAt = ((now - from) / span) * 100;

    return (
        <div style={styles.root}>
            <div style={styles.head}>
                <div style={styles.corner}>
                    <span style={styles.clock}>{timeOfDay(now)}</span>
                </div>
                <div style={styles.headTrack}>
                    {Array.from({ length: SPAN }, (_, i) => (
                        <span
                            key={i}
                            style={{ ...styles.headTime, left: `${(i / SPAN) * 100}%` }}
                        >
                            {timeOfDay(from + i * HALF_HOUR)}
                        </span>
                    ))}
                </div>
            </div>

            <div
                ref={gridRef}
                role="grid"
                aria-label={`Programme guide, ${timeOfDay(from)} to ${timeOfDay(to)}`}
                style={styles.body}
            >
                {rows.map(({ channel, slots }) => {
                    const active = channel.number === current;
                    const num = String(channel.number).padStart(2, '0');
                    return (
                        <div key={channel.number} role="row" style={styles.row}>
                            <div
                                role="rowheader"
                                style={{
                                    ...styles.channel,
                                    ...(active ? styles.channelActive : null),
                                }}
                            >
                                <span style={styles.channelNum}>{num}</span>
                                <span style={styles.channelName}>{channel.name}</span>
                            </div>

                            <div style={styles.track}>
                                {slots.length === 0 && (
                                    <Block
                                        dataKey={keyOf(channel.number, null)}
                                        tabbable={tabbable}
                                        left={0}
                                        width={100}
                                        airing
                                        title={channel.name}
                                        meta={channel.tagline}
                                        label={`Channel ${channel.number}, ${channel.name}: ${channel.tagline}`}
                                        onFocus={setFocusKey}
                                        onClick={() => onTune(channel.number)}
                                        onKeyDown={(e) => onKey(e, channel, null)}
                                    />
                                )}
                                {slots.map((s) => {
                                    const left = Math.max(s.startsAt, from);
                                    const right = Math.min(s.endsAt, to);
                                    const airing = s.startsAt <= now && now < s.endsAt;
                                    const when = `${timeOfDay(s.startsAt)} to ${timeOfDay(s.endsAt)}`;
                                    return (
                                        <Block
                                            key={s.startsAt}
                                            dataKey={keyOf(channel.number, s)}
                                            tabbable={tabbable}
                                            left={((left - from) / span) * 100}
                                            width={((right - left) / span) * 100}
                                            airing={airing}
                                            title={s.programme.title}
                                            meta={`${timeOfDay(s.startsAt)} · ${runtime(s.programme.seconds)}`}
                                            label={`Channel ${channel.number}, ${channel.name}, ${when}${
                                                airing ? ', on now' : ''
                                            }: ${s.programme.title}`}
                                            onFocus={setFocusKey}
                                            onClick={() => onTune(channel.number)}
                                            onKeyDown={(e) => onKey(e, channel, s)}
                                        />
                                    );
                                })}
                                {page === 0 && (
                                    <div
                                        aria-hidden
                                        style={{ ...styles.nowLine, left: `${nowAt}%` }}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={styles.foot}>
                <button
                    type="button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    style={{ ...styles.footButton, ...(page === 0 ? styles.footButtonOff : null) }}
                >
                    ◀ EARLIER
                </button>
                <span style={styles.hint}>
                    Arrows to browse · Enter to watch · Esc to close
                </span>
                <button
                    type="button"
                    disabled={page === LAST_PAGE}
                    onClick={() => setPage((p) => Math.min(LAST_PAGE, p + 1))}
                    style={{
                        ...styles.footButton,
                        ...(page === LAST_PAGE ? styles.footButtonOff : null),
                    }}
                >
                    LATER ▶
                </button>
            </div>
        </div>
    );
};

/** One programme in the grid. */
const Block: React.FC<{
    dataKey: string;
    tabbable: string;
    left: number;
    width: number;
    airing: boolean;
    title: string;
    meta: string;
    label: string;
    onFocus: (key: string) => void;
    onClick: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
}> = ({ dataKey, tabbable, left, width, airing, title, meta, label, onFocus, onClick, onKeyDown }) => {
    const [focused, setFocused] = useState(false);
    return (
        <div
            role="gridcell"
            data-key={dataKey}
            tabIndex={dataKey === tabbable ? 0 : -1}
            aria-label={label}
            title={label}
            onClick={onClick}
            onKeyDown={onKeyDown}
            onFocus={() => {
                setFocused(true);
                onFocus(dataKey);
            }}
            onBlur={() => setFocused(false)}
            style={{
                ...styles.block,
                left: `${left}%`,
                width: `${width}%`,
                ...(airing ? styles.blockAiring : null),
                ...(focused ? styles.blockFocused : null),
            }}
        >
            <span style={{ ...styles.blockTitle, ...(focused ? styles.blockTextFocused : null) }}>
                {title}
            </span>
            <span style={{ ...styles.blockMeta, ...(focused ? styles.blockTextFocused : null) }}>
                {meta}
            </span>
        </div>
    );
};

/* -------------------------------------------------------------------------
 * Styles
 * ---------------------------------------------------------------------- */

const NAVY = '#0a1450';
const BLOCK = '#23339c';
const BLOCK_ON = '#3549c4';
const YELLOW = '#f5c518';
const CHANNEL_COL = 104;

const styles: StyleSheetCSS = {
    root: {
        position: 'absolute',
        inset: 0,
        // Above the picture, below the CRT glass (`CrtScreen` starts at 3).
        zIndex: 2,
        flexDirection: 'column',
        // Clear of the tube's rounded corners.
        padding: '10px 12px 8px',
        boxSizing: 'border-box',
        background: NAVY,
    },
    head: {
        flex: 'none',
        flexDirection: 'row',
        height: 20,
        borderBottom: `2px solid ${YELLOW}`,
        // Reserve the body's scrollbar width so the columns line up.
        overflow: 'hidden',
        scrollbarGutter: 'stable',
    } as React.CSSProperties,
    corner: { width: CHANNEL_COL, flex: 'none', alignItems: 'center' },
    clock: {
        fontFamily: 'Millennium, monospace',
        fontSize: 13,
        color: '#fff',
    },
    headTrack: { flex: 1, minWidth: 0, position: 'relative' },
    headTime: {
        position: 'absolute',
        top: 2,
        paddingLeft: 4,
        borderLeft: '1px solid rgba(245, 197, 24, 0.5)',
        fontFamily: 'Millennium, monospace',
        fontSize: 12,
        color: YELLOW,
    },
    body: {
        flex: 1,
        minHeight: 0,
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarGutter: 'stable',
    } as React.CSSProperties,
    row: {
        flex: 'none',
        flexDirection: 'row',
        height: 32,
        borderBottom: `1px solid ${NAVY}`,
    },
    channel: {
        width: CHANNEL_COL,
        flex: 'none',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        padding: '0 5px',
        boxSizing: 'border-box',
        background: '#16226e',
        borderLeft: '3px solid transparent',
    },
    channelActive: { borderLeftColor: YELLOW, background: '#1d2c8a' },
    channelNum: {
        fontFamily: 'Millennium, monospace',
        fontSize: 13,
        color: YELLOW,
        flex: 'none',
    },
    channelName: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: '#fff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
    },
    track: { flex: 1, minWidth: 0, position: 'relative' },
    block: {
        position: 'absolute',
        top: 1,
        bottom: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 4px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: 'pointer',
        background: BLOCK,
        borderLeft: `1px solid ${NAVY}`,
        borderRight: `1px solid ${NAVY}`,
        outline: 'none',
    },
    blockAiring: { background: BLOCK_ON },
    blockFocused: { background: YELLOW },
    // These are <span>s, which `div { display: flex }` does not reach.
    blockTitle: {
        display: 'block',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: '#fff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    blockMeta: {
        display: 'block',
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: '#c9d2f2',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    blockTextFocused: { color: '#000' },
    nowLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        marginLeft: -1,
        background: YELLOW,
        pointerEvents: 'none',
    },
    foot: {
        flex: 'none',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingTop: 6,
        borderTop: `1px solid ${BLOCK}`,
    },
    footButton: {
        display: 'flex',
        flex: 'none',
        padding: '2px 7px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 10,
        letterSpacing: 1,
        color: YELLOW,
        background: 'transparent',
        border: `1px solid ${YELLOW}`,
    },
    footButtonOff: { opacity: 0.35, cursor: 'default' },
    hint: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: '#c9d2f2',
        textAlign: 'center',
        minWidth: 0,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
};

export default TvGuide;
