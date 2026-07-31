import React, { useCallback, useEffect, useState } from 'react';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import {
    Quote,
    StockError,
    TRAY_RANGE,
    DEFAULT_WATCHLIST,
    fetchQuotes,
    formatPercent,
    formatPrice,
    loadWatchlist,
    trendColor,
} from './stocks';

/**
 * The tray ticker — what the coin beside the clock opens.
 *
 * Three companies at a glance, each with a month of price behind it: Microsoft
 * and Apple, because this desktop is one of theirs and the other one is why it
 * looked like this, and IBM, which was already there. That's the whole panel —
 * the tray is 172 pixels wide and a chart deserves more than that, so clicking
 * any row (or the button at the bottom) opens the Market Watch window, where
 * the real chart, the metrics and the company search live.
 *
 * Typing a name here is a shortcut into that same window with the lookup
 * already running, so you never have to open the app first to search.
 */

export interface StockTickerProps {
    open: boolean;
    /** Opens the Market Watch window — see `stocks` in Desktop.tsx. */
    onOpenApp: (options?: { symbol?: string; query?: string }) => void;
}

const StockTicker: React.FC<StockTickerProps> = ({ open, onOpenApp }) => {
    const [quotes, setQuotes] = useState<Quote[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [typed, setTyped] = useState('');

    // The three the panel shows: whatever's at the top of your watch list, or
    // the presets on a first visit.
    const symbols = loadWatchlist().slice(0, 3);
    const shown = symbols.length ? symbols : DEFAULT_WATCHLIST;

    const load = useCallback(async (force = false) => {
        setLoading(true);
        setError(null);
        try {
            const fresh = await fetchQuotes(
                loadWatchlist().slice(0, 3),
                TRAY_RANGE,
                { force }
            );
            setQuotes(fresh);
            if (!fresh.length) setError('No quotes came back.');
        } catch (e) {
            setError(
                e instanceof StockError ? e.message : 'Could not reach the market.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch the first time the panel is opened; the module-level cache in
    // `stocks.ts` keeps every reopen after that instant.
    useEffect(() => {
        if (open && !quotes && !loading) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    return (
        <div style={styles.panel}>
            <div style={styles.header}>
                <Icon icon="stocksIcon" size={16} />
                <span style={styles.title}>Market Watch</span>
            </div>

            {error ? (
                <div style={styles.errorBox}>
                    <p style={styles.errorText}>{error}</p>
                    <button style={styles.button} onClick={() => load(true)}>
                        Retry
                    </button>
                </div>
            ) : !quotes ? (
                <p style={styles.loading}>Requesting quotes…</p>
            ) : (
                shown.map((symbol) => {
                    const quote = quotes.find((q) => q.symbol === symbol);
                    return (
                        <div
                            key={symbol}
                            style={styles.row}
                            title={
                                quote
                                    ? `Open ${quote.name} in Market Watch`
                                    : `Open ${symbol}`
                            }
                            onClick={() => onOpenApp({ symbol })}
                        >
                            <div style={styles.rowText}>
                                <span style={styles.symbol}>{symbol}</span>
                                <span style={styles.price}>
                                    {formatPrice(quote?.price ?? null)}
                                </span>
                            </div>
                            <div style={styles.rowText}>
                                <Sparkline
                                    points={(quote?.points || []).map((p) => p.c)}
                                    color={trendColor(quote?.changePercent)}
                                />
                                <span
                                    style={{
                                        ...styles.change,
                                        color: trendColor(quote?.changePercent),
                                    }}
                                >
                                    {quote?.changePercent !== undefined &&
                                        (quote.changePercent !== null &&
                                        quote.changePercent >= 0
                                            ? '▲'
                                            : '▼')}{' '}
                                    {formatPercent(quote?.changePercent ?? null)}
                                </span>
                            </div>
                        </div>
                    );
                })
            )}

            {/* Straight into the app's search, without opening it first. */}
            <div style={styles.searchRow}>
                <input
                    style={styles.input}
                    value={typed}
                    spellCheck={false}
                    placeholder="Find a company…"
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key !== 'Enter' || !typed.trim()) return;
                        e.preventDefault();
                        onOpenApp({ query: typed.trim() });
                        setTyped('');
                    }}
                    aria-label="Find a company"
                />
            </div>

            <div style={styles.footer}>
                <span style={styles.source}>Delayed</span>
                <button style={styles.button} onClick={() => onOpenApp()}>
                    Open
                </button>
            </div>
        </div>
    );
};

/** 60x18 of price, no axes — just the shape of the month. */
const Sparkline: React.FC<{ points: number[]; color: string }> = ({
    points,
    color,
}) => {
    const w = 58;
    const h = 16;
    if (points.length < 2) return <div style={{ width: w, height: h }} />;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;

    const path = points
        .map((p, i) => {
            const x = (i / (points.length - 1)) * w;
            // Inset by a pixel top and bottom so the extremes aren't clipped.
            const y = h - 1 - ((p - min) / span) * (h - 2);
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    return (
        <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
            <path d={`${path} L${w},${h} L0,${h} Z`} fill={color} fillOpacity={0.14} />
            <path d={path} fill="none" stroke={color} strokeWidth={1} />
        </svg>
    );
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
        gap: 4,
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
    row: {
        flexDirection: 'column',
        gap: 1,
        padding: '3px 4px',
        cursor: 'pointer',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        flexShrink: 0,
    },
    rowText: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    symbol: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    price: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    change: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    searchRow: {
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
    },
    input: {
        flex: 1,
        minWidth: 0,
        padding: '2px 4px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    footer: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        flexShrink: 0,
    },
    source: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
    },
    button: {
        padding: '2px 8px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        cursor: 'pointer',
    },
    loading: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        padding: '6px 2px',
    },
    errorBox: {
        flexDirection: 'column',
        gap: 5,
        padding: 2,
    },
    errorText: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        lineHeight: 1.4,
    },
};

export default StockTicker;
