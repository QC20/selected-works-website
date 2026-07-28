/**
 * DKK <-> EUR converter.
 * ----------------------
 * The tray widget in the bottom-right corner, in the same spirit as the BTC
 * ticker in Yute's portfolio: click the coin in the clock area and a small
 * Windows 95 panel pops up above the taskbar.
 *
 * Rates come from Frankfurter (https://frankfurter.dev), which serves the
 * European Central Bank's daily reference rates — no API key, CORS-enabled,
 * and the right source for a Danish/European portfolio. The ECB publishes once
 * a working day, so the 30-day sparkline is deliberately flat-ish: DKK is
 * pegged to EUR inside a narrow band, and showing that honestly is the point.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Colors from '../../constants/colors';
import { Icon } from '../general';

const API = 'https://api.frankfurter.dev/v1';

interface Rates {
    /** EUR per 1 DKK, e.g. 0.13378 */
    dkkToEur: number;
    /** The ECB reference date the rate belongs to. */
    date: string;
    /** Last ~30 days of the same rate, oldest first, for the sparkline. */
    history: number[];
}

type Direction = 'dkkToEur' | 'eurToDkk';

const isoDaysAgo = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
};

export interface CurrencyConverterProps {
    open: boolean;
    /**
     * Renders as a plain block filling its parent instead of a popup anchored
     * above the tray — used by the windowed copy in My Computer > Hard Disk
     * (D:) > Utility, which is the same tool inside a Window.
     */
    embedded?: boolean;
}

const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
    open,
    embedded = false,
}) => {
    const [rates, setRates] = useState<Rates | null>(null);
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('100');
    const [direction, setDirection] = useState<Direction>('dkkToEur');

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const [latestRes, seriesRes] = await Promise.all([
                fetch(`${API}/latest?base=DKK&symbols=EUR`),
                fetch(`${API}/${isoDaysAgo(30)}..?base=DKK&symbols=EUR`),
            ]);
            if (!latestRes.ok) throw new Error('rate lookup failed');
            const latest = await latestRes.json();

            let history: number[] = [];
            if (seriesRes.ok) {
                const series = await seriesRes.json();
                history = Object.keys(series.rates || {})
                    .sort()
                    .map((day) => series.rates[day].EUR)
                    .filter((n: number) => typeof n === 'number');
            }

            setRates({
                dkkToEur: latest.rates.EUR,
                date: latest.date,
                history,
            });
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch on first open, then leave it cached — ECB only publishes daily.
    useEffect(() => {
        if (open && !rates && !loading) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    const parsed = parseFloat(amount.replace(',', '.'));
    const valid = !isNaN(parsed) && isFinite(parsed);

    const rate = rates
        ? direction === 'dkkToEur'
            ? rates.dkkToEur
            : 1 / rates.dkkToEur
        : 0;

    const from = direction === 'dkkToEur' ? 'DKK' : 'EUR';
    const to = direction === 'dkkToEur' ? 'EUR' : 'DKK';

    const converted =
        rates && valid
            ? (parsed * rate).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
              })
            : '—';

    // One EUR costs this many DKK — the number most people actually know.
    const eurInDkk = rates ? (1 / rates.dkkToEur).toFixed(4) : '—';

    return (
        <div
            style={Object.assign(
                {},
                styles.panel,
                embedded && styles.panelEmbedded
            )}
        >
            <div style={styles.header}>
                <Icon icon="eurIcon" size={16} />
                <span style={styles.pair}>DKK / EUR</span>
            </div>

            {error ? (
                <div style={styles.errorBox}>
                    <p style={styles.errorText}>Could not reach the rate server.</p>
                    <button style={styles.button} onClick={load}>
                        Retry
                    </button>
                </div>
            ) : !rates ? (
                <p style={styles.loading}>Loading rates…</p>
            ) : (
                <>
                    <div style={styles.rateRow}>
                        <span style={styles.rateBig}>1 EUR = {eurInDkk} DKK</span>
                    </div>

                    <Sparkline points={rates.history} />

                    <div style={styles.convertBox}>
                        <div style={styles.inputRow}>
                            <input
                                style={styles.input}
                                value={amount}
                                inputMode="decimal"
                                onChange={(e) => setAmount(e.target.value)}
                                aria-label={`Amount in ${from}`}
                            />
                            <span style={styles.unit}>{from}</span>
                        </div>
                        <div
                            style={styles.swap}
                            title="Swap direction"
                            onClick={() =>
                                setDirection((d) =>
                                    d === 'dkkToEur' ? 'eurToDkk' : 'dkkToEur'
                                )
                            }
                        >
                            ⇅
                        </div>
                        <div style={styles.resultRow}>
                            <span style={styles.result}>{converted}</span>
                            <span style={styles.unit}>{to}</span>
                        </div>
                    </div>

                    <div style={styles.footer}>
                        <span style={styles.source}>ECB {rates.date}</span>
                        <button
                            style={styles.button}
                            onClick={load}
                            disabled={loading}
                        >
                            {loading ? '…' : 'Refresh'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

/** A tiny inline-SVG chart — no charting dependency for six data points. */
const Sparkline: React.FC<{ points: number[] }> = ({ points }) => {
    if (points.length < 2) return null;

    const w = 148;
    const h = 30;
    const min = Math.min(...points);
    const max = Math.max(...points);
    // DKK is pegged, so the range is tiny; pad it so the line isn't a flat edge.
    const span = max - min || 1;
    const pad = span * 0.35;
    const lo = min - pad;
    const hi = max + pad;

    const path = points
        .map((p, i) => {
            const x = (i / (points.length - 1)) * w;
            const y = h - ((p - lo) / (hi - lo)) * h;
            return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    return (
        <div style={styles.chart}>
            <svg width={w} height={h} style={{ display: 'block' }}>
                <path d={`${path} L${w},${h} L0,${h} Z`} fill="#00008022" />
                <path d={path} fill="none" stroke="#000080" strokeWidth={1} />
            </svg>
            <span style={styles.chartLabel}>30 days</span>
        </div>
    );
};

const styles: StyleSheetCSS = {
    panel: {
        position: 'absolute',
        bottom: '135%',
        right: 0,
        width: 172,
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
    panelEmbedded: {
        position: 'relative',
        bottom: 'auto',
        right: 'auto',
        width: 'auto',
        flex: 1,
        minWidth: 0,
        border: 'none',
        boxShadow: 'none',
        padding: 10,
        gap: 8,
        zIndex: 'auto',
    },
    header: {
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
    },
    pair: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    rateRow: {
        alignItems: 'baseline',
        justifyContent: 'center',
        padding: '2px 0',
    },
    rateBig: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: Colors.black,
    },
    chart: {
        position: 'relative',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        padding: 1,
    },
    chartLabel: {
        position: 'absolute',
        right: 3,
        top: 1,
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
    },
    convertBox: {
        flexDirection: 'column',
        gap: 3,
    },
    inputRow: {
        alignItems: 'center',
        gap: 4,
    },
    resultRow: {
        alignItems: 'center',
        gap: 4,
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
    unit: {
        width: 26,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    swap: {
        alignSelf: 'center',
        cursor: 'pointer',
        fontSize: 11,
        lineHeight: '11px',
        padding: '0 4px',
        color: Colors.black,
        userSelect: 'none',
    },
    result: {
        flex: 1,
        minWidth: 0,
        padding: '2px 4px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: '#d4d1d1',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
    },
    footer: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
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
        padding: '2px',
    },
    errorText: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        lineHeight: 1.4,
    },
};

export default CurrencyConverter;
