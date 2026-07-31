import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import StockChart from '../os/StockChart';
import {
    Quote,
    RangeKey,
    RANGES,
    SearchHit,
    StockError,
    asOfText,
    cachedQuote,
    fetchQuote,
    fetchQuotes,
    fiftyTwoWeekPosition,
    formatChange,
    formatPercent,
    formatPrice,
    formatVolume,
    loadWatchlist,
    periodChange,
    saveWatchlist,
    searchSymbols,
    trendColor,
} from '../os/stocks';

/**
 * Market Watch — the tray coin's application.
 *
 * A quote terminal the way one would have looked on this machine: a watchlist
 * down the left in an inset list box, the selected company charted on the
 * right, and its numbers in a group box underneath. It opens on Microsoft,
 * Apple and IBM, which between them are most of the reason a desktop looked
 * like this in 1995.
 *
 * Type a ticker or a company name into the box and it looks it up: an exact
 * ticker loads straight away, anything vaguer comes back as a list of matches
 * to pick from. Whatever you choose joins the watchlist, and the watchlist is
 * remembered between visits (Reset Storage clears it, like everything else
 * this desktop keeps).
 *
 * Prices come through this site's own `/api/stock` (see `api/stock.js`); the
 * browser can't reach a quote server directly.
 */

/**
 * A company the tray asked to see — either a ticker to chart or a name to look
 * up. `seq` is what lets the tray send a second request to a window that's
 * already open, exactly as the browser's `navRequest` does.
 */
export interface StockRequest {
    symbol?: string;
    query?: string;
    seq: number;
}

export interface StockWatchProps extends WindowAppProps {
    request?: StockRequest;
}

const StockWatch: React.FC<StockWatchProps> = ({
    request,
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [watchlist, setWatchlist] = useState<string[]>(loadWatchlist);
    const [selected, setSelected] = useState<string>(
        () => request?.symbol || loadWatchlist()[0] || 'MSFT'
    );
    const [range, setRange] = useState<RangeKey>('1y');

    /** Watchlist rows: symbol -> its last known quote, for the price column. */
    const [rows, setRows] = useState<Record<string, Quote>>({});
    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [typed, setTyped] = useState(request?.query || '');
    const [results, setResults] = useState<SearchHit[] | null>(null);
    const [searching, setSearching] = useState(false);
    const [status, setStatus] = useState('Ready');

    // Guards against a slow request for a symbol you've already clicked past
    // painting over the one you're actually looking at.
    const requestRef = useRef(0);

    useEffect(() => saveWatchlist(watchlist), [watchlist]);

    /** The chart and the metrics panel — one company, one range. */
    const load = useCallback(
        async (symbol: string, wanted: RangeKey, force = false) => {
            const ticket = ++requestRef.current;
            const cached = cachedQuote(symbol, wanted);
            if (cached && !force) setQuote(cached);
            setLoading(true);
            setError(null);
            setStatus(`Requesting ${symbol}…`);
            try {
                const fresh = await fetchQuote(symbol, wanted, { force });
                if (ticket !== requestRef.current) return;
                setQuote(fresh);
                setRows((prev) => ({ ...prev, [fresh.symbol]: fresh }));
                setStatus(`${fresh.symbol} — ${fresh.exchange || 'quote'}`);
            } catch (e) {
                if (ticket !== requestRef.current) return;
                setQuote(null);
                setError(
                    e instanceof StockError
                        ? e.message
                        : 'Could not load that quote.'
                );
                setStatus('Request failed');
            } finally {
                if (ticket === requestRef.current) setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        load(selected, range);
    }, [selected, range, load]);

    /** Prices for the list on the left, fetched in one request. */
    useEffect(() => {
        let live = true;
        fetchQuotes(watchlist, '1mo')
            .then((quotes) => {
                if (!live) return;
                setRows((prev) => {
                    const next = { ...prev };
                    quotes.forEach((q) => {
                        next[q.symbol] = q;
                    });
                    return next;
                });
            })
            .catch(() => {
                /* the detail panel already reports a dead server */
            });
        return () => {
            live = false;
        };
    }, [watchlist]);

    const addToWatchlist = useCallback((symbol: string) => {
        setWatchlist((prev) =>
            prev.includes(symbol) ? prev : [...prev, symbol].slice(0, 24)
        );
    }, []);

    const removeFromWatchlist = useCallback(
        (symbol: string) => {
            setWatchlist((prev) => {
                const next = prev.filter((s) => s !== symbol);
                // Never leave the list empty — there'd be nothing to chart.
                if (!next.length) return prev;
                if (symbol === selected) setSelected(next[0]);
                return next;
            });
        },
        [selected]
    );

    const show = useCallback(
        (symbol: string) => {
            addToWatchlist(symbol);
            setSelected(symbol);
            setResults(null);
        },
        [addToWatchlist]
    );

    /**
     * The search box. A ticker typed exactly is loaded on the spot; anything
     * else goes to the lookup, and a single unambiguous match is opened rather
     * than being shown as a list of one.
     */
    const runSearch = useCallback(
        async (override?: string) => {
        const query = (override ?? typed).trim();
        if (!query) return;
        setSearching(true);
        setResults(null);
        setStatus(`Searching for "${query}"…`);
        try {
            const hits = await searchSymbols(query);
            if (!hits.length) {
                setResults([]);
                setStatus(`Nothing found for "${query}"`);
                return;
            }
            const exact = hits.find(
                (h) => h.symbol.toUpperCase() === query.toUpperCase()
            );
            if (exact || hits.length === 1) {
                const hit = exact || hits[0];
                show(hit.symbol);
                setTyped('');
                setStatus(`${hit.symbol} — ${hit.name}`);
                return;
            }
            setResults(hits);
            setStatus(`${hits.length} matches for "${query}"`);
        } catch (e) {
            setResults([]);
            setStatus(
                e instanceof StockError ? e.message : 'The lookup failed.'
            );
        } finally {
            setSearching(false);
        }
        },
        [typed, show]
    );

    /**
     * The tray asking for a company — on open, and again every time it's used
     * while this window is already up.
     *
     * The ref starts before the first sequence number so the opening request is
     * handled here too: a symbol was already put into `selected` above (which
     * saves a wasted fetch of the default), but a typed query still has to be
     * searched, and that can only happen once the component is alive.
     */
    const handledSeq = useRef(-1);
    useEffect(() => {
        if (!request || request.seq === handledSeq.current) return;
        handledSeq.current = request.seq;
        if (request.symbol) {
            show(request.symbol);
        } else if (request.query) {
            setTyped(request.query);
            setResults(null);
        }
    }, [request, show]);

    // A query arriving from the tray runs itself. It's passed straight to the
    // search rather than read back out of `typed`, which this render may not
    // have caught up with yet.
    const searchedSeq = useRef(-1);
    useEffect(() => {
        const wanted = request?.query?.trim();
        if (!wanted || request!.seq === searchedSeq.current) return;
        searchedSeq.current = request!.seq;
        runSearch(wanted);
    }, [request, runSearch]);

    const period = useMemo(
        () => (quote ? periodChange(quote.points) : null),
        [quote]
    );
    const rangeCaption =
        RANGES.find((r) => r.value === range)?.caption || 'the period';

    return (
        <Window
            top={54}
            left={110}
            width={760}
            height={540}
            windowTitle="Market Watch"
            windowBarIcon="stocksIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={status}
        >
            <div style={styles.container}>
                <div style={styles.menuBar}>
                    {['File', 'Edit', 'View', 'Help'].map((label) => (
                        <span key={label} style={styles.menuItem}>
                            {label}
                            <u style={{ marginLeft: '-2px' }}>_</u>
                        </span>
                    ))}
                </div>

                {/* Search + range picker, in the toolbar slot. */}
                <div style={styles.toolbar}>
                    <span style={styles.toolbarLabel}>Symbol</span>
                    <div style={styles.searchField}>
                        <Icon icon="stocksIcon" size={14} />
                        <input
                            style={styles.searchInput}
                            value={typed}
                            spellCheck={false}
                            placeholder="Ticker or company name"
                            onChange={(e) => setTyped(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    runSearch();
                                } else if (e.key === 'Escape') {
                                    setTyped('');
                                    setResults(null);
                                }
                            }}
                            aria-label="Search for a company or ticker"
                        />
                    </div>
                    <button
                        style={styles.button}
                        onClick={() => runSearch()}
                        disabled={searching || !typed.trim()}
                    >
                        {searching ? 'Finding…' : 'Find'}
                    </button>

                    <div style={styles.toolbarDivider} />

                    {RANGES.map((option) => (
                        <button
                            key={option.value}
                            style={Object.assign(
                                {},
                                styles.rangeButton,
                                option.value === range && styles.rangeButtonActive
                            )}
                            onClick={() => setRange(option.value)}
                            title={`Chart the ${option.caption}`}
                        >
                            {option.label}
                        </button>
                    ))}
                    <button
                        style={styles.button}
                        onClick={() => load(selected, range, true)}
                        disabled={loading}
                        title="Fetch fresh prices"
                    >
                        {loading ? '…' : 'Refresh'}
                    </button>
                </div>

                <div style={styles.body}>
                    {/* --- Watchlist ------------------------------------- */}
                    <div style={styles.sidebar}>
                        <span style={styles.sidebarTitle}>Watch list</span>
                        <div style={styles.listBox}>
                            {watchlist.map((symbol) => {
                                const row = rows[symbol];
                                const active = symbol === selected;
                                return (
                                    <div
                                        key={symbol}
                                        style={Object.assign(
                                            {},
                                            styles.listRow,
                                            active && styles.listRowActive
                                        )}
                                        onClick={() => setSelected(symbol)}
                                        title={row?.name || symbol}
                                    >
                                        <div style={styles.listRowTop}>
                                            <span style={styles.listSymbol}>
                                                {symbol}
                                            </span>
                                            <span
                                                style={Object.assign(
                                                    {},
                                                    styles.listPrice,
                                                    active && styles.listTextActive
                                                )}
                                            >
                                                {row
                                                    ? formatPrice(row.price)
                                                    : '…'}
                                            </span>
                                        </div>
                                        <div style={styles.listRowBottom}>
                                            <span
                                                style={Object.assign(
                                                    {},
                                                    styles.listName,
                                                    active && styles.listTextActive
                                                )}
                                            >
                                                {row?.name || 'Loading…'}
                                            </span>
                                            <span
                                                style={{
                                                    ...styles.listChange,
                                                    color: active
                                                        ? Colors.white
                                                        : trendColor(
                                                              row?.changePercent
                                                          ),
                                                }}
                                            >
                                                {row
                                                    ? formatPercent(
                                                          row.changePercent
                                                      )
                                                    : ''}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            style={styles.button}
                            onClick={() => removeFromWatchlist(selected)}
                            disabled={watchlist.length < 2}
                            title="Take the selected company off the list"
                        >
                            Remove
                        </button>
                    </div>

                    {/* --- Detail ---------------------------------------- */}
                    <div style={styles.detail}>
                        {results ? (
                            <SearchResults
                                results={results}
                                onPick={(hit) => {
                                    show(hit.symbol);
                                    setTyped('');
                                }}
                                onCancel={() => setResults(null)}
                            />
                        ) : error ? (
                            <div style={styles.errorBox}>
                                <p style={styles.errorTitle}>
                                    Market Watch
                                </p>
                                <p style={styles.errorText}>{error}</p>
                                <button
                                    style={styles.button}
                                    onClick={() => load(selected, range, true)}
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : !quote ? (
                            <div style={styles.errorBox}>
                                <p style={styles.errorText}>
                                    Requesting {selected}…
                                </p>
                            </div>
                        ) : (
                            <>
                                <div style={styles.header}>
                                    <div style={styles.headerNames}>
                                        <span style={styles.companyName}>
                                            {quote.name}
                                        </span>
                                        <span style={styles.companyMeta}>
                                            {quote.symbol}
                                            {quote.exchange
                                                ? ` · ${quote.exchange}`
                                                : ''}
                                        </span>
                                    </div>
                                    <div style={styles.headerPrice}>
                                        <span style={styles.priceBig}>
                                            {formatPrice(
                                                quote.price,
                                                quote.currency
                                            )}
                                        </span>
                                        <span
                                            style={{
                                                ...styles.priceChange,
                                                color: trendColor(quote.change),
                                            }}
                                        >
                                            {quote.change !== null &&
                                                (quote.change >= 0 ? '▲' : '▼')}{' '}
                                            {formatChange(quote.change)} (
                                            {formatPercent(quote.changePercent)})
                                        </span>
                                    </div>
                                </div>

                                <StockChart
                                    points={quote.points}
                                    range={range}
                                    currency={quote.currency}
                                />

                                <div style={styles.groupBox}>
                                    <span style={styles.groupTitle}>
                                        Key figures
                                    </span>
                                    <div style={styles.metrics}>
                                        <Metric
                                            label="Previous close"
                                            value={formatPrice(
                                                quote.previousClose
                                            )}
                                        />
                                        <Metric
                                            label="Day range"
                                            value={`${formatPrice(
                                                quote.dayLow
                                            )} – ${formatPrice(quote.dayHigh)}`}
                                        />
                                        <Metric
                                            label="Volume"
                                            value={formatVolume(quote.volume)}
                                        />
                                        <Metric
                                            label={`Change, ${rangeCaption}`}
                                            value={
                                                period
                                                    ? `${formatChange(
                                                          period.absolute
                                                      )} (${formatPercent(
                                                          period.percent
                                                      )})`
                                                    : '—'
                                            }
                                            color={trendColor(
                                                period ? period.percent : null
                                            )}
                                        />
                                        <Metric
                                            label="52-week range"
                                            value={`${formatPrice(
                                                quote.fiftyTwoWeekLow
                                            )} – ${formatPrice(
                                                quote.fiftyTwoWeekHigh
                                            )}`}
                                        />
                                        <Metric
                                            label="Last traded"
                                            value={asOfText(quote)}
                                        />
                                    </div>
                                    <FiftyTwoWeekBar quote={quote} />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div style={styles.footer}>
                    <span style={styles.footerText}>
                        Delayed quotes, for illustration. Not investment advice.
                    </span>
                </div>
            </div>
        </Window>
    );
};

/** One label/value pair in the Key figures grid. */
const Metric: React.FC<{ label: string; value: string; color?: string }> = ({
    label,
    value,
    color,
}) => (
    <div style={styles.metric}>
        <span style={styles.metricLabel}>{label}</span>
        <span style={{ ...styles.metricValue, ...(color ? { color } : {}) }}>
            {value}
        </span>
    </div>
);

/**
 * Where the price sits in its 52-week range, as a Win95 progress-bar-ish
 * gauge — the one number that reads far better as a picture than as digits.
 */
const FiftyTwoWeekBar: React.FC<{ quote: Quote }> = ({ quote }) => {
    const position = fiftyTwoWeekPosition(quote);
    if (position === null) return null;
    return (
        <div style={styles.gaugeWrap}>
            <span style={styles.gaugeEnd}>{formatPrice(quote.fiftyTwoWeekLow)}</span>
            <div style={styles.gauge}>
                <div
                    style={Object.assign({}, styles.gaugeMark, {
                        left: `calc(${(position * 100).toFixed(1)}% - 2px)`,
                    })}
                />
            </div>
            <span style={styles.gaugeEnd}>
                {formatPrice(quote.fiftyTwoWeekHigh)}
            </span>
        </div>
    );
};

/** The pick-a-company list, shown when a search was ambiguous. */
const SearchResults: React.FC<{
    results: SearchHit[];
    onPick: (hit: SearchHit) => void;
    onCancel: () => void;
}> = ({ results, onPick, onCancel }) => (
    <div style={styles.resultsPane}>
        <span style={styles.groupTitle}>
            {results.length ? 'Select a company' : 'No matches'}
        </span>
        <div style={styles.listBox}>
            {results.map((hit) => (
                <div
                    key={`${hit.symbol}-${hit.exchange}`}
                    style={styles.resultRow}
                    onClick={() => onPick(hit)}
                >
                    <span style={styles.resultSymbol}>{hit.symbol}</span>
                    <span style={styles.resultName}>{hit.name}</span>
                    <span style={styles.resultMeta}>
                        {[hit.exchange, hit.type].filter(Boolean).join(' · ')}
                    </span>
                </div>
            ))}
            {!results.length && (
                <p style={styles.errorText}>
                    Nothing matched. Try the ticker itself — MSFT, AAPL, IBM.
                </p>
            )}
        </div>
        <button style={styles.button} onClick={onCancel}>
            Back to chart
        </button>
    </div>
);

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
    menuBar: {
        gap: 14,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    menuItem: {
        cursor: 'default',
        userSelect: 'none',
    },
    toolbar: {
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    toolbarLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        flexShrink: 0,
    },
    toolbarDivider: {
        width: 2,
        alignSelf: 'stretch',
        margin: '0 4px',
        borderLeft: `1px solid ${Colors.darkGray}`,
        borderRight: `1px solid ${Colors.white}`,
        flexShrink: 0,
    },
    searchField: {
        flex: 1,
        minWidth: 130,
        alignItems: 'center',
        gap: 5,
        padding: '2px 4px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        overflow: 'hidden',
    },
    searchInput: {
        flex: 1,
        minWidth: 0,
        border: 'none',
        outline: 'none',
        background: 'transparent',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    button: {
        padding: '3px 9px',
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
    rangeButton: {
        width: 30,
        padding: '3px 0',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        cursor: 'pointer',
        flexShrink: 0,
    },
    // Pressed in, the way a selected toolbar toggle sat in Windows 95.
    rangeButtonActive: {
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: '#b0b3b7',
        fontWeight: 'bold',
    },
    body: {
        flex: 1,
        minHeight: 0,
        gap: 6,
        padding: 6,
    },
    sidebar: {
        width: 186,
        flexShrink: 0,
        flexDirection: 'column',
        gap: 4,
    },
    sidebarTitle: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    listBox: {
        flex: 1,
        minHeight: 0,
        flexDirection: 'column',
        overflowY: 'auto',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    listRow: {
        flexDirection: 'column',
        gap: 1,
        padding: '4px 5px',
        cursor: 'pointer',
        borderBottom: `1px solid ${Colors.lightGray}`,
        flexShrink: 0,
    },
    listRowActive: {
        background: Colors.blue,
    },
    listTextActive: {
        color: Colors.white,
    },
    listRowTop: {
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 6,
    },
    listRowBottom: {
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 6,
    },
    listSymbol: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: 'inherit',
    },
    listPrice: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    listName: {
        flex: 1,
        minWidth: 0,
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    listChange: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        flexShrink: 0,
    },
    detail: {
        // Anchors the search-results pane (below), which is taken out of flow
        // so that a long company name can't widen the window.
        position: 'relative',
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        gap: 6,
    },
    header: {
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
        flexShrink: 0,
    },
    headerNames: {
        flexDirection: 'column',
        minWidth: 0,
    },
    companyName: {
        fontFamily: 'MSSerif',
        fontSize: 13,
        fontWeight: 'bold',
        color: Colors.black,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    companyMeta: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
    },
    headerPrice: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        flexShrink: 0,
    },
    priceBig: {
        fontFamily: 'MSSerif',
        fontSize: 15,
        color: Colors.black,
        whiteSpace: 'nowrap',
    },
    priceChange: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        whiteSpace: 'nowrap',
    },
    // A Windows 95 group box: an etched frame with its caption on the edge.
    groupBox: {
        position: 'relative',
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0,
        marginTop: 6,
        padding: '10px 8px 8px 8px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    groupTitle: {
        position: 'absolute',
        top: -7,
        left: 7,
        padding: '0 4px',
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
    },
    metrics: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '4px 12px',
    },
    metric: {
        flexDirection: 'column',
        minWidth: 0,
    },
    metricLabel: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    metricValue: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    gaugeWrap: {
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    gaugeEnd: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
        flexShrink: 0,
    },
    gauge: {
        position: 'relative',
        flex: 1,
        minWidth: 0,
        height: 10,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    gaugeMark: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 4,
        background: Colors.blue,
    },
    /**
     * Out of flow on purpose. Official company names run to a hundred
     * characters ("… American Depositary Shares, each representing 10 Units
     * (each Unit consists of …") and an in-flow row of that width becomes the
     * window's minimum width, stretching it halfway across the desktop. Taking
     * the pane out of the layout leaves the window sized by its chart, and the
     * names ellipsize inside it as they should.
     */
    resultsPane: {
        position: 'absolute',
        top: 6,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'column',
        gap: 6,
        padding: '10px 8px 8px 8px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.lightGray,
    },
    resultRow: {
        alignItems: 'baseline',
        gap: 8,
        padding: '4px 6px',
        cursor: 'pointer',
        borderBottom: `1px solid ${Colors.lightGray}`,
        flexShrink: 0,
    },
    resultSymbol: {
        width: 72,
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
        flexShrink: 0,
    },
    resultName: {
        flex: 1,
        minWidth: 0,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    resultMeta: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
        flexShrink: 0,
    },
    errorBox: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 20,
    },
    errorTitle: {
        fontFamily: 'MSSerif',
        fontSize: 13,
        fontWeight: 'bold',
        color: Colors.black,
    },
    errorText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        textAlign: 'center',
        lineHeight: 1.5,
        maxWidth: 360,
        padding: 8,
    },
    footer: {
        padding: '3px 6px 4px 6px',
        flexShrink: 0,
    },
    footerText: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
    },
};

export default StockWatch;
