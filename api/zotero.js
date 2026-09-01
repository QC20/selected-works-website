/**
 * The reading list, read out of Zotero.
 * -------------------------------------
 * Same two-places-from-one-file setup as `stock.js` and `feed.js`: a Vercel
 * serverless function at `/api/zotero` in production, mounted on the CRA dev
 * server at the same path by `src/setupProxy.js` under `npm start`.
 *
 * Why a proxy at all, when the GitHub window talks to GitHub straight from the
 * browser: Zotero *would* serve a browser directly — its API answers public
 * group libraries with `access-control-allow-origin: *` and no credentials.
 * Jonas' library is not a public group, so reading it needs an API key, and a
 * key in the front-end bundle is a key handed to everyone who opens the page.
 * So the key stays here, on the server, in `ZOTERO_API_KEY`.
 *
 * Read-only in three separate ways, because one would not be enough:
 *   - the key itself is minted read-only in Zotero's own key settings;
 *   - this handler refuses anything but GET, and only ever issues GETs;
 *   - the only upstream paths it can build are the three below. There is no
 *     pass-through parameter that lets a caller aim it somewhere else.
 *
 * What the browser gets back is already flattened into the shape the window
 * renders — Zotero's own JSON is deeply nested and four times the size, and
 * none of the rest of it is anything a reading list shows.
 */

const TIMEOUT_MS = 8000;
const API = 'https://api.zotero.org';
/** Zotero's own page size, and the most it will return at once. */
const PAGE = 100;
/** At most this many items, so one enormous library can't hang the window. */
const MAX_ITEMS = 600;

const KEY = process.env.ZOTERO_API_KEY || '';

/**
 * Kept in step with `ZOTERO_COLLECTION` in `src/components/os/library.ts` —
 * duplicated for the same reason as `api/obsidian.js`: `/api` is plain
 * CommonJS deployed as its own function and cannot import the app's
 * TypeScript. An env var overrides it, so which collection is on show can be
 * changed on the deployment without a commit.
 */
const COLLECTION = process.env.ZOTERO_COLLECTION || '';

/** Attachments and annotations are plumbing, never entries in a reading list. */
const SKIP_TYPES = ['attachment', 'note', 'annotation'];

async function zotero(path) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(`${API}${path}`, {
            headers: {
                'Zotero-API-Key': KEY,
                'Zotero-API-Version': '3',
                Accept: 'application/json',
            },
            signal: controller.signal,
        });
        if (!response.ok) {
            // Zotero's 403 body is one line and says which of the two it is
            // ("Invalid key" vs "Forbidden"), which is worth passing on.
            const detail = (await response.text().catch(() => '')).slice(0, 120);
            throw new Error(
                response.status === 403
                    ? `Zotero refused the key (${detail || 'forbidden'}).`
                    : `Zotero responded ${response.status}.`
            );
        }
        return await response.json();
    } finally {
        clearTimeout(timer);
    }
}

/** "Kjeldmand Jensen", "Smith & Jones", "Smith, Jones & Wu", "Smith et al." */
function formatCreators(creators) {
    const names = (creators || [])
        .filter((c) => c.creatorType === 'author' || c.creatorType === 'editor')
        .map((c) => c.lastName || c.name || '')
        .filter(Boolean);
    if (!names.length) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    if (names.length === 3) return `${names[0]}, ${names[1]} & ${names[2]}`;
    return `${names[0]} et al.`;
}

/** Zotero stores dates as typed, so the year has to be dug out of the string. */
function yearOf(data) {
    const match = String(data.parsedDate || data.date || '').match(/\d{4}/);
    return match ? match[0] : '';
}

/** DOI if there is one — it outlives a URL — else whatever URL was recorded. */
function linkFor(data) {
    if (data.DOI) {
        return `https://doi.org/${String(data.DOI).replace(/^https?:\/\/doi\.org\//, '')}`;
    }
    return data.url || '';
}

function toReference(item) {
    const data = item.data || {};
    return {
        key: data.key || item.key,
        title: data.title || 'Untitled',
        creators: formatCreators(data.creators),
        year: yearOf(data),
        itemType: data.itemType || 'document',
        publication:
            data.publicationTitle ||
            data.bookTitle ||
            data.proceedingsTitle ||
            data.repository ||
            data.publisher ||
            '',
        abstract: data.abstractNote || '',
        tags: (data.tags || []).map((t) => t.tag).filter(Boolean),
        url: linkFor(data),
        dateAdded: data.dateAdded || '',
    };
}

/** Walk Zotero's pages until the library runs out or MAX_ITEMS is reached. */
async function allItems(base) {
    const out = [];
    for (let start = 0; start < MAX_ITEMS; start += PAGE) {
        const page = await zotero(
            `${base}?format=json&limit=${PAGE}&start=${start}&sort=dateAdded&direction=desc`
        );
        if (!Array.isArray(page) || !page.length) break;
        out.push(...page);
        if (page.length < PAGE) break;
    }
    return out;
}

module.exports = async function handler(req, res) {
    if (req.method && req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'This library is read-only.' });
    }

    // A reading list is not a live feed. An hour fresh at the edge keeps this
    // well under Zotero's rate limit however many people open the window.
    res.setHeader(
        'Cache-Control',
        'public, s-maxage=3600, max-age=600, stale-while-revalidate=86400'
    );

    if (!KEY) {
        return res.status(500).json({
            error: 'No Zotero key on this deployment. Set ZOTERO_API_KEY.',
        });
    }

    try {
        // Who the key belongs to. Asking Zotero means the deployment needs one
        // secret and no user id — the id is a property of the key, not a
        // second thing to keep in step with it.
        const identity = await zotero('/keys/current');
        if (!identity.userID) {
            throw new Error('That key is not tied to a user library.');
        }
        const library = `/users/${identity.userID}`;

        // A collection is configured by name; Zotero addresses them by key.
        let base = `${library}/items/top`;
        let collectionName = '';
        if (COLLECTION) {
            const collections = await zotero(
                `${library}/collections?format=json&limit=${PAGE}`
            );
            const wanted = COLLECTION.trim().toLowerCase();
            const found = (collections || []).find(
                (c) => (c.data.name || '').trim().toLowerCase() === wanted
            );
            if (found) {
                base = `${library}/collections/${found.data.key}/items/top`;
                collectionName = found.data.name;
            }
            // No match falls through to the whole library on purpose: a
            // renamed collection should show too much, not an error page.
        }

        const raw = await allItems(base);
        const references = raw
            .filter((item) => !SKIP_TYPES.includes((item.data || {}).itemType))
            .map(toReference);

        return res.status(200).json({
            library: collectionName || identity.username || 'Library',
            /** True when a collection was asked for and actually found. */
            filtered: Boolean(collectionName),
            references,
        });
    } catch (error) {
        return res.status(502).json({ error: error.message });
    }
};
