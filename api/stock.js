/**
 * Market Watch's data source.
 * ---------------------------
 * A browser cannot call a quote server directly: none of the free ones send
 * `Access-Control-Allow-Origin`, so the request goes out and the answer is
 * thrown away by CORS. This is the small server that sits in front of them.
 *
 * It runs in two places from this one file:
 *   - In production, as a Vercel serverless function at `/api/stock`.
 *   - Under `npm start`, mounted on the CRA dev server at the same path by
 *     `src/setupProxy.js`.
 * Hence plain CommonJS, and only the request/response surface that Vercel and
 * Express agree on (`req.query`, `res.status().json()`).
 *
 * Two providers, tried in order, both free and neither needing a key:
 *
 *   1. Nasdaq's own public API — what nasdaq.com's pages are built on. It has
 *      a name/ticker lookup, a quote with the 52-week and day ranges already
 *      computed, and daily history back decades. US listings only, which is
 *      most of what anyone types into a box like this.
 *   2. Yahoo Finance's chart endpoints, for anything Nasdaq doesn't list and
 *      for the days Nasdaq is unwell. Yahoo rate-limits hard per IP, so it is
 *      deliberately the fallback rather than the first call.
 *
 * Everything is answered with a long `s-maxage`, so Vercel's edge serves most
 * visitors from cache and the providers see a trickle of requests rather than
 * one per page view. That cache is most of what keeps us inside their limits.
 *
 * Three actions:
 *   ?action=search&q=apple               company / ticker lookup
 *   ?action=quote&symbol=AAPL&range=1y   one company: price, metrics, history
 *   ?action=quotes&symbols=MSFT,AAPL     several at once, for the tray panel
 */

const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0 Safari/537.36';
const HEADERS = { 'User-Agent': UA, Accept: 'application/json' };

const NASDAQ = 'https://api.nasdaq.com/api';
const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH = 'https://query2.finance.yahoo.com/v1/finance/search';

/** The ranges the app offers, in days of history each one asks for. */
const RANGES = {
    '1mo': 31,
    '6mo': 186,
    '1y': 366,
    '5y': 1830,
    max: 365 * 30,
};

/** Yahoo's own names for the same spans, for the fallback path. */
const YAHOO_RANGE = { '1mo': '1mo', '6mo': '6mo', '1y': '1y', '5y': '5y', max: 'max' };
const YAHOO_INTERVAL = { '1mo': '1d', '6mo': '1d', '1y': '1d', '5y': '1wk', max: '1mo' };

/** Nasdaq wants to be told what kind of instrument it's being asked about. */
const ASSET_CLASSES = ['stocks', 'etf', 'index'];

const TIMEOUT_MS = 8000;
/** Roughly one pixel of chart per point on a maximised window. */
const MAX_POINTS = 340;

async function getJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            headers: HEADERS,
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`upstream responded ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

/** Only ever let a plausible ticker through into an upstream URL. */
const cleanSymbol = (raw) =>
    String(raw || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9.^=-]/g, '')
        .slice(0, 20);

/** "$309.22", "+0.31", "-7.35%", "131,561,256.28" -> a number, or null. */
function toNumber(raw) {
    if (typeof raw === 'number') return isFinite(raw) ? raw : null;
    if (typeof raw !== 'string') return null;
    const cleaned = raw.replace(/[$,%\s]/g, '').replace(/,/g, '');
    if (!cleaned || cleaned === 'N/A' || cleaned === '--') return null;
    const value = Number(cleaned);
    return isFinite(value) ? value : null;
}

/** "201.50 - 344.57" -> [201.5, 344.57] */
function toRange(raw) {
    const parts = String(raw || '').split('-');
    if (parts.length < 2) return [null, null];
    return [toNumber(parts[0]), toNumber(parts[1])];
}

const isoDay = (date) => date.toISOString().slice(0, 10);

/**
 * Thins a long series down to something an SVG path can carry.
 *
 * Five years of daily closes is 1250 points, which is four of them per pixel
 * on this chart — invisible detail at the cost of a much heavier response. The
 * last point is always kept, because that's today's price and the one number
 * the header has to agree with.
 */
function thin(points) {
    if (points.length <= MAX_POINTS) return points;
    const step = Math.ceil(points.length / MAX_POINTS);
    const out = [];
    for (let i = 0; i < points.length; i += step) out.push(points[i]);
    const last = points[points.length - 1];
    if (out[out.length - 1] !== last) out.push(last);
    return out;
}

// --- Nasdaq -------------------------------------------------------------

/**
 * "Tesla, Inc. Common Stock" -> "Tesla, Inc."
 *
 * Every US listing carries its share class in its official name, which is
 * noise in a list you're picking a company out of.
 */
const tidyName = (raw, symbol) =>
    String(raw || symbol)
        .replace(
            /\s+(Common Stock|Common Shares|Ordinary Shares|Class [A-Z] Common Stock)$/i,
            ''
        )
        .replace(/\s{2,}/g, ' ')
        .trim() || symbol;

/**
 * Ranks a lookup, because the provider doesn't.
 *
 * Typing "coca cola" should not put Coca-Cola Femsa above Coca-Cola: an exact
 * ticker wins, then a name that starts with what you typed, and shorter names
 * break the tie — a company's own name is nearly always shorter than the names
 * of the things named after it.
 */
// Punctuation is not a signal here: someone typing "coca cola" means the
// company written "Coca-Cola", and "L Oreal" means "L'Oréal".
const normalise = (text) =>
    String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

function rank(hit, query) {
    const q = normalise(query);
    const name = normalise(hit.name);
    if (hit.symbol.toLowerCase() === query.trim().toLowerCase()) return 0;
    if (name === q) return 1;
    if (name.startsWith(q)) return 2 + Math.min(0.9, hit.name.length / 200);
    if (name.includes(q)) return 4 + Math.min(0.9, hit.name.length / 200);
    return 6;
}

async function nasdaqSearch(query) {
    const payload = await getJson(
        `${NASDAQ}/autocomplete/slookup/10?search=${encodeURIComponent(query)}`
    );
    return (payload.data || [])
        .filter(
            (hit) =>
                hit.symbol &&
                // Everything else the lookup returns is structured notes and
                // barrier certificates "linked to" the company you searched
                // for — thousands of them, none of them chartable here. They
                // are the rows with no exchange.
                hit.exchange &&
                ['STOCKS', 'ETF', 'INDEX'].includes(String(hit.asset).toUpperCase())
        )
        .map((hit) => ({
            symbol: hit.symbol,
            name: tidyName(hit.name, hit.symbol),
            exchange: hit.exchange,
            type: hit.subCategory || hit.asset || '',
            sector: hit.industry || '',
            industry: hit.region || '',
        }))
        .sort((a, b) => rank(a, query) - rank(b, query))
        .slice(0, 8);
}

/** Nasdaq answers 200 with a null body for a symbol in the wrong asset class. */
const nasdaqData = (payload) =>
    payload && payload.data && !(payload.status && payload.status.rCode >= 400)
        ? payload.data
        : null;

async function nasdaqQuote(symbol, range) {
    const days = RANGES[range];
    const to = new Date();
    const from = new Date(to.getTime() - days * 86_400_000);

    for (const assetclass of ASSET_CLASSES) {
        const info = nasdaqData(
            await getJson(
                `${NASDAQ}/quote/${encodeURIComponent(symbol)}/info?assetclass=${assetclass}`
            ).catch(() => null)
        );
        if (!info) continue;

        // `primaryData` is whatever is happening right now — which after the
        // bell is the extended session. `secondaryData` is then the official
        // close, and the close is what "today's change" means to a reader.
        const closed =
            info.secondaryData && toNumber(info.secondaryData.lastSalePrice) !== null;
        const book = closed ? info.secondaryData : info.primaryData || {};

        const price = toNumber(book.lastSalePrice);
        const change = toNumber(book.netChange);
        const changePercent = toNumber(book.percentageChange);
        const stats = info.keyStats || {};
        const [low52, high52] = toRange(
            stats.fiftyTwoWeekHighLow && stats.fiftyTwoWeekHighLow.value
        );
        const [dayLow, dayHigh] = toRange(stats.dayrange && stats.dayrange.value);

        const chart = nasdaqData(
            await getJson(
                `${NASDAQ}/quote/${encodeURIComponent(symbol)}/chart` +
                    `?assetclass=${assetclass}&fromdate=${isoDay(from)}&todate=${isoDay(to)}`
            ).catch(() => null)
        );
        const points = thin(
            ((chart && chart.chart) || [])
                .filter((p) => typeof p.y === 'number' && p.x)
                .map((p) => ({ t: p.x, c: p.y }))
        );

        // History is the whole point of the chart; without it, let Yahoo try.
        if (!points.length) continue;

        // The daily series runs to the last *settled* session, so on any day
        // the market has traded it stops one candle short of the price in the
        // header. Carrying the live price onto the end is what makes the right
        // edge of the chart agree with the number printed above it.
        const lastPoint = points[points.length - 1];
        if (price !== null && Date.now() - lastPoint.t > 20 * 3_600_000) {
            points.push({ t: Date.now(), c: price });
        }

        return {
            symbol: info.symbol || symbol,
            name: tidyName(info.companyName, symbol),
            exchange: info.exchange || '',
            currency: 'USD',
            price: price !== null ? price : lastPoint.c,
            previousClose:
                price !== null && change !== null ? price - change : null,
            change,
            changePercent,
            dayHigh,
            dayLow,
            fiftyTwoWeekHigh: high52,
            fiftyTwoWeekLow: low52,
            // After the bell the closing block carries no volume of its own.
            volume:
                toNumber(book.volume) ??
                toNumber((info.primaryData || {}).volume),
            marketTime: null,
            // Nasdaq times its quotes in US Eastern and says so. Reparsing that
            // into an epoch would only invent a timezone; it's already exactly
            // what a quote screen prints, so it's passed through as written.
            asOf:
                String(book.lastTradeTimestamp || '').replace(/^Closed at /, '') ||
                null,
            points,
        };
    }
    return null;
}

// --- Yahoo (fallback) ---------------------------------------------------

async function yahooSearch(query) {
    const payload = await getJson(
        `${YAHOO_SEARCH}?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0&listsCount=0`
    );
    return (payload.quotes || [])
        .filter((q) => q.symbol && ['EQUITY', 'ETF', 'INDEX'].includes(q.quoteType))
        .map((q) => ({
            symbol: q.symbol,
            name: tidyName(q.longname || q.shortname, q.symbol),
            exchange: q.exchDisp || q.exchange || '',
            type: q.typeDisp || q.quoteType,
            sector: q.sector || '',
            industry: q.industry || '',
        }))
        .sort((a, b) => rank(a, query) - rank(b, query))
        .slice(0, 8);
}

async function yahooQuote(symbol, range) {
    const payload = await getJson(
        `${YAHOO_CHART}/${encodeURIComponent(symbol)}` +
            `?range=${YAHOO_RANGE[range]}&interval=${YAHOO_INTERVAL[range]}`
    );
    const result =
        payload && payload.chart && payload.chart.result && payload.chart.result[0];
    if (!result || !result.meta) return null;

    const meta = result.meta;
    const stamps = result.timestamp || [];
    const closes =
        (result.indicators &&
            result.indicators.quote &&
            result.indicators.quote[0] &&
            result.indicators.quote[0].close) ||
        [];

    // A candle can come back null — a halted session, a holiday only some
    // exchanges keep. Carrying the last close across the gap is what stops the
    // line dropping to zero in the middle of the chart.
    const points = [];
    let last = null;
    for (let i = 0; i < stamps.length; i += 1) {
        const close = typeof closes[i] === 'number' ? closes[i] : last;
        if (close === null || close === undefined) continue;
        last = close;
        points.push({ t: stamps[i] * 1000, c: close });
    }
    if (!points.length) return null;

    const price =
        typeof meta.regularMarketPrice === 'number'
            ? meta.regularMarketPrice
            : points[points.length - 1].c;

    // On a daily chart yesterday's close is simply the previous candle. On a
    // weekly or monthly one it isn't, and there's nothing cheap to compare
    // against — so the day's change is left unknown rather than made up.
    const previousClose =
        YAHOO_INTERVAL[range] === '1d' && points.length >= 2
            ? points[points.length - 2].c
            : null;
    const change = previousClose !== null ? price - previousClose : null;

    return {
        symbol: meta.symbol || symbol,
        name: meta.longName || meta.shortName || symbol,
        exchange: meta.fullExchangeName || meta.exchangeName || '',
        currency: meta.currency || 'USD',
        price,
        previousClose,
        change,
        changePercent:
            change !== null && previousClose ? (change / previousClose) * 100 : null,
        dayHigh: meta.regularMarketDayHigh ?? null,
        dayLow: meta.regularMarketDayLow ?? null,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
        volume: meta.regularMarketVolume ?? null,
        marketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
        asOf: null,
        points: thin(points),
    };
}

// --- The two providers, in order ----------------------------------------

async function search(query) {
    const hits = await nasdaqSearch(query).catch(() => []);
    if (hits.length) return hits;
    return yahooSearch(query).catch(() => []);
}

async function quoteFor(symbol, range) {
    const fromNasdaq = await nasdaqQuote(symbol, range).catch(() => null);
    if (fromNasdaq) return fromNasdaq;
    return yahooQuote(symbol, range).catch(() => null);
}

module.exports = async function handler(req, res) {
    const query = req.query || {};
    const action = String(query.action || 'quote');
    const range = RANGES[query.range] ? String(query.range) : null;

    // Prices move; this cache is what keeps us off the providers' rate
    // limiters. Five minutes fresh, an hour stale-while-revalidate — a
    // portfolio piece doesn't need tick-by-tick, and a slightly stale number
    // beats an error page.
    res.setHeader(
        'Cache-Control',
        'public, s-maxage=300, max-age=60, stale-while-revalidate=3600'
    );

    try {
        if (action === 'search') {
            const q = String(query.q || '').trim().slice(0, 60);
            if (!q) return res.status(400).json({ error: 'Nothing to search for.' });
            return res.status(200).json({ results: await search(q) });
        }

        if (action === 'quotes') {
            const symbols = String(query.symbols || '')
                .split(',')
                .map(cleanSymbol)
                .filter(Boolean)
                .slice(0, 6);
            if (!symbols.length) {
                return res.status(400).json({ error: 'No symbols given.' });
            }
            const quotes = await Promise.all(
                // One bad ticker shouldn't blank the whole tray panel.
                symbols.map((s) => quoteFor(s, range || '1mo').catch(() => null))
            );
            return res.status(200).json({ quotes: quotes.filter(Boolean) });
        }

        const symbol = cleanSymbol(query.symbol);
        if (!symbol) return res.status(400).json({ error: 'No symbol given.' });
        const quote = await quoteFor(symbol, range || '1y');
        if (!quote) {
            return res
                .status(404)
                .json({ error: `No price history found for ${symbol}.` });
        }
        return res.status(200).json({ quote });
    } catch (error) {
        return res
            .status(502)
            .json({ error: 'The quote server did not answer. Try again shortly.' });
    }
};
