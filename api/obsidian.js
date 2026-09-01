/**
 * Finding a published Obsidian vault.
 * -----------------------------------
 * Same two-places-from-one-file setup as `stock.js` and `feed.js`: a Vercel
 * serverless function at `/api/obsidian` in production, mounted on the CRA dev
 * server at the same path by `src/setupProxy.js` under `npm start`.
 *
 * This endpoint exists to answer exactly one question — what is this vault's
 * `uid`? — and it exists because that is the only part of an Obsidian Publish
 * site a browser on another origin cannot reach.
 *
 * Everything Obsidian Publish's own front-end reads is CORS-open and the Vault
 * window fetches it directly: `/options/<uid>` for the site's name and index
 * note, `/cache/<uid>` for every published path, `/access/<uid>/<path>` for a
 * file's bytes. But the `uid` tying those together is only ever printed into
 * the HTML of the publish page itself, as
 *
 *     window.siteInfo={"uid":"…","host":"publish-01.obsidian.md",…}
 *
 * and that page is served with `x-frame-options: SAMEORIGIN` and no CORS
 * header, so the browser is allowed neither to frame it nor to read it. A
 * server has no such rule. So: fetch the page here, lift the one object out of
 * it, and hand the browser the handful of fields it needs.
 *
 * The lookup is cached hard at the edge because the answer effectively never
 * changes — a vault's uid is fixed for the life of the site.
 *
 * Read-only by construction: the only outbound requests this file can make are
 * GETs to the publish host derived from `OBSIDIAN_SLUG`, and there is no
 * Obsidian endpoint here that writes. The vault on Jonas' own machine is not
 * what is being served; what is published is.
 */

const TIMEOUT_MS = 8000;

/**
 * Kept in step with `OBSIDIAN_SLUG` in `src/components/os/library.ts`.
 *
 * It is duplicated rather than imported because `/api` is plain CommonJS
 * deployed as its own function and the app is a TypeScript bundle — the same
 * reason `feed.js` reaches for the raw `patchNotes.json` instead of the typed
 * module beside it. An env var overrides it, so the deployment can be pointed
 * at a different vault without a commit.
 */
const SLUG = process.env.OBSIDIAN_SLUG || '';

/** A slug is one path segment; a custom domain is a bare host. Nothing else. */
function publishUrl(slug) {
    const clean = String(slug || '')
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/+$/, '');
    if (!clean || !/^[A-Za-z0-9._~-]+(\/[A-Za-z0-9._~-]+)?$/.test(clean)) {
        return null;
    }
    return clean.includes('.')
        ? `https://${clean}`
        : `https://publish.obsidian.md/${clean}`;
}

async function getText(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(url, {
            headers: {
                // Publish serves the same HTML to everything, but a request
                // with no UA at all gets treated as a bot by the CDN.
                'User-Agent':
                    'Mozilla/5.0 (compatible; os95-vault-window/1.0; +https://github.com/QC20)',
                Accept: 'text/html,application/json',
            },
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`upstream responded ${response.status}`);
        }
        return await response.text();
    } finally {
        clearTimeout(timer);
    }
}

module.exports = async function handler(req, res) {
    // The uid of a published vault does not change. A day fresh at the edge,
    // a week of stale-while-revalidate: this should essentially never be a
    // real request.
    res.setHeader(
        'Cache-Control',
        'public, s-maxage=86400, max-age=3600, stale-while-revalidate=604800'
    );

    const slug = String((req.query && req.query.slug) || SLUG);
    const url = publishUrl(slug);
    if (!url) {
        return res.status(400).json({
            error: 'No vault configured. Set OBSIDIAN_SLUG in src/components/os/library.ts.',
        });
    }

    try {
        const html = await getText(url);
        const match = html.match(/window\.siteInfo\s*=\s*(\{.*?\})\s*;/s);
        if (!match) {
            // A publish page that no longer carries siteInfo means Obsidian
            // changed the shape of the page, not that the vault is missing —
            // worth saying plainly rather than reporting "not found".
            throw new Error('no siteInfo on the publish page');
        }

        const info = JSON.parse(match[1]);
        if (!info.uid) throw new Error('siteInfo carried no uid');
        const host = info.host || 'publish-01.obsidian.md';

        // The site's own settings: its name, and which note is the front page.
        let options = {};
        try {
            options = JSON.parse(await getText(`https://${host}/options/${info.uid}`));
        } catch {
            /* Options are a nicety — the vault still reads without them. */
        }

        return res.status(200).json({
            uid: info.uid,
            host,
            siteName: options.siteName || slug,
            indexFile: options.indexFile || '',
            // The address that actually answered, so the window's "open the
            // real thing" links point at this vault rather than at whatever
            // the front end's own default constant happens to name.
            siteUrl: url,
        });
    } catch (error) {
        return res.status(502).json({
            error: `Could not reach the published vault (${error.message}).`,
        });
    }
};
