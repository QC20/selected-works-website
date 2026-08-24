/**
 * Patch Notes, as an RSS feed.
 * ----------------------------
 * Same two-places-from-one-file setup as `stock.js`: a Vercel serverless
 * function at `/api/feed` in production, mounted on the CRA dev server at the
 * same path by `src/setupProxy.js` under `npm start`.
 *
 * Reads `src/data/patchNotes.json` directly — the same file
 * `patchNotesData.ts` turns into the typed list Patch Notes itself renders —
 * so there is exactly one list of entries, not this file's own stale copy of
 * it. Subscribing is entirely opt-in: nothing on the desktop feeds this URL
 * to anyone automatically, it's just there for whoever wants to read it in
 * an actual feed reader (see the "Subscribe" line in PatchNotes.tsx).
 *
 * The base URL comes from the incoming request's own Host header rather than
 * a hardcoded domain — unlike `public/sitemap.xml`, which is a static file
 * with no request to read one from and so had to leave a placeholder domain
 * behind (see the comment at the top of that file), this is a live function
 * and always knows what it was actually requested as.
 */

const patchNotes = require('../src/data/patchNotes.json');

const escapeXml = (value) =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const rfc822 = (isoDate) => new Date(`${isoDate}T12:00:00Z`).toUTCString();

module.exports = function handler(req, res) {
    const proto =
        (req.headers['x-forwarded-proto'] || '').split(',')[0] ||
        (req.headers.host && req.headers.host.startsWith('localhost')
            ? 'http'
            : 'https');
    const base = `${proto}://${req.headers.host}`;

    const items = patchNotes
        .map((entry) => {
            const description = [entry.why, ...entry.notes]
                .filter(Boolean)
                .map((line) => `<p>${escapeXml(line)}</p>`)
                .join('');
            return `
    <item>
      <title>${escapeXml(entry.head)} — ${escapeXml(entry.date)}</title>
      <link>${base}/</link>
      <guid isPermaLink="false">${escapeXml(entry.head)}-${entry.date}</guid>
      <pubDate>${rfc822(entry.date)}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
        })
        .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OS95 — Patch Notes</title>
    <link>${base}/</link>
    <description>What's shipped on Jonas Kjeldmand Jensen's Windows 95 desktop portfolio, in the same words as the Patch Notes app itself.</description>
    <language>en</language>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${base}/api/feed" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    // A day's cache at the edge: this changes when a patch note is added, not
    // on every request.
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).send(xml);
};
