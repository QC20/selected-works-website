/**
 * Market Watch's client side: fetching, caching and formatting.
 *
 * Everything goes through `/api/stock` (see `api/stock.js`) — a browser can't
 * call a quote server directly, because none of the free ones send CORS
 * headers. Both the tray panel and the Market Watch window import from here, so
 * a symbol looked at in one is already loaded in the other.
 */

export interface StockPoint {
    /** Milliseconds since the epoch. */
    t: number;
    /** Closing price for that candle. */
    c: number;
}

export interface Quote {
    symbol: string;
    name: string;
    exchange: string;
    currency: string;
    price: number | null;
    previousClose: number | null;
    change: number | null;
    changePercent: number | null;
    dayHigh: number | null;
    dayLow: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
    volume: number | null;
    marketTime: number | null;
    /**
     * When the price was last traded, already written out by whichever
     * provider answered ("Jul 31, 2026 4:14 PM ET"). Preferred over
     * `marketTime` when it's there — see `asOfText`.
     */
    asOf: string | null;
    points: StockPoint[];
}

export interface SearchHit {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
    sector: string;
    industry: string;
}

export type RangeKey = '1mo' | '6mo' | '1y' | '5y' | 'max';

export const RANGES: { value: RangeKey; label: string; caption: string }[] = [
    { value: '1mo', label: '1M', caption: 'past month' },
    { value: '6mo', label: '6M', caption: 'past six months' },
    { value: '1y', label: '1Y', caption: 'past year' },
    { value: '5y', label: '5Y', caption: 'past five years' },
    { value: 'max', label: 'Max', caption: 'all time' },
];

/**
 * What's on the watchlist before you touch anything.
 *
 * Microsoft and Apple because this desktop is one of theirs and the other one
 * is the reason it looked the way it did; IBM because it's the third name in
 * that story and was already wiring the world together when the machine this
 * pretends to be shipped. All three are still listed, so all three still draw.
 */
export const DEFAULT_WATCHLIST = ['MSFT', 'AAPL', 'IBM'];

/** The tray panel's range — a month is enough shape for a 60px sparkline. */
export const TRAY_RANGE: RangeKey = '1mo';

export const WATCHLIST_STORAGE_KEY = 'marketWatch.watchlist.v1';

export const loadWatchlist = (): string[] => {
    try {
        const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
        if (!raw) return [...DEFAULT_WATCHLIST];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) return [...DEFAULT_WATCHLIST];
        return parsed.filter((s) => typeof s === 'string').slice(0, 24);
    } catch {
        return [...DEFAULT_WATCHLIST];
    }
};

export const saveWatchlist = (symbols: string[]): void => {
    try {
        window.localStorage.setItem(
            WATCHLIST_STORAGE_KEY,
            JSON.stringify(symbols)
        );
    } catch {
        /* private browsing, quota — the list just won't survive the visit */
    }
};

/**
 * Quotes already fetched this session.
 *
 * Shared between the tray panel and the window, and deliberately module-level
 * rather than per-component: clicking down the watchlist redraws from here
 * instead of asking the server again, which is what keeps us well inside the
 * quote server's rate limit.
 */
const cache = new Map<string, { at: number; quote: Quote }>();
const CACHE_MS = 60_000;

const cacheKey = (symbol: string, range: RangeKey) => `${symbol}|${range}`;

export const cachedQuote = (
    symbol: string,
    range: RangeKey
): Quote | undefined => cache.get(cacheKey(symbol, range))?.quote;

const remember = (range: RangeKey, quote: Quote) => {
    cache.set(cacheKey(quote.symbol, range), { at: Date.now(), quote });
};

const isFresh = (symbol: string, range: RangeKey) => {
    const hit = cache.get(cacheKey(symbol, range));
    return !!hit && Date.now() - hit.at < CACHE_MS;
};

/** The message the UI shows when a request fails. */
export class StockError extends Error {}

async function callApi(params: Record<string, string>): Promise<any> {
    const query = new URLSearchParams(params).toString();
    let response: Response;
    try {
        response = await fetch(`/api/stock?${query}`);
    } catch {
        throw new StockError('No connection to the quote server.');
    }
    let payload: any = null;
    try {
        payload = await response.json();
    } catch {
        /* an HTML error page, most likely — fall through to the status check */
    }
    if (!response.ok) {
        throw new StockError(
            (payload && payload.error) ||
                'The quote server is not answering right now.'
        );
    }
    return payload;
}

export async function fetchQuote(
    symbol: string,
    range: RangeKey,
    { force = false }: { force?: boolean } = {}
): Promise<Quote> {
    if (!force && isFresh(symbol, range)) {
        return cache.get(cacheKey(symbol, range))!.quote;
    }
    const payload = await callApi({ action: 'quote', symbol, range });
    if (!payload?.quote) throw new StockError(`No data for ${symbol}.`);
    remember(range, payload.quote);
    return payload.quote;
}

export async function fetchQuotes(
    symbols: string[],
    range: RangeKey,
    { force = false }: { force?: boolean } = {}
): Promise<Quote[]> {
    const missing = force ? symbols : symbols.filter((s) => !isFresh(s, range));
    if (missing.length) {
        const payload = await callApi({
            action: 'quotes',
            symbols: missing.join(','),
            range,
        });
        (payload?.quotes || []).forEach((quote: Quote) => remember(range, quote));
    }
    return symbols
        .map((s) => cachedQuote(s, range))
        .filter((q): q is Quote => !!q);
}

export async function searchSymbols(query: string): Promise<SearchHit[]> {
    const payload = await callApi({ action: 'search', q: query });
    return payload?.results || [];
}

// --- Formatting ---------------------------------------------------------
// All of it deliberately plain: this is a window whose numbers are drawn in
// MSSerif at 11px, so nothing here gets fancier than a thousands separator.

export const formatPrice = (value: number | null, currency?: string): string => {
    if (value === null || value === undefined || !isFinite(value)) return '—';
    // Penny stocks need the extra places; everything else reads better without.
    const digits = Math.abs(value) < 1 ? 4 : 2;
    const text = value.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
    return currency ? `${text} ${currency}` : text;
};

export const formatChange = (value: number | null): string => {
    if (value === null || value === undefined || !isFinite(value)) return '—';
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${sign}${formatPrice(Math.abs(value))}`;
};

export const formatPercent = (value: number | null): string => {
    if (value === null || value === undefined || !isFinite(value)) return '—';
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${sign}${Math.abs(value).toFixed(2)}%`;
};

export const formatVolume = (value: number | null): string => {
    if (value === null || value === undefined || !isFinite(value)) return '—';
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return String(Math.round(value));
};

export const formatDate = (ms: number | null): string => {
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

export const formatDateTime = (ms: number | null): string => {
    if (!ms) return '—';
    const d = new Date(ms);
    return `${formatDate(ms)} ${d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    })}`;
};

/** "Last traded" — whichever of the two forms the provider gave us. */
export const asOfText = (quote: Quote): string =>
    quote.asOf || formatDateTime(quote.marketTime);

/** Change across the whole drawn series — what the range buttons are for. */
export const periodChange = (
    points: StockPoint[]
): { absolute: number; percent: number } | null => {
    if (points.length < 2) return null;
    const first = points[0].c;
    const last = points[points.length - 1].c;
    if (!first) return null;
    return { absolute: last - first, percent: ((last - first) / first) * 100 };
};

/**
 * Where today's price sits between the 52-week low and high, 0–1, for the
 * little position bar. Null when the range isn't known.
 */
export const fiftyTwoWeekPosition = (quote: Quote): number | null => {
    const { price, fiftyTwoWeekLow: low, fiftyTwoWeekHigh: high } = quote;
    if (price === null || low === null || high === null || high <= low) return null;
    return Math.min(1, Math.max(0, (price - low) / (high - low)));
};

/** Win95's 16-colour palette had exactly one green and one red worth using. */
export const UP_COLOR = '#008000';
export const DOWN_COLOR = '#a80000';
export const FLAT_COLOR = '#000080';

export const trendColor = (value: number | null | undefined): string => {
    if (value === null || value === undefined || !isFinite(value)) return FLAT_COLOR;
    if (value > 0) return UP_COLOR;
    if (value < 0) return DOWN_COLOR;
    return FLAT_COLOR;
};
