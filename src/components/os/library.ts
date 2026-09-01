/**
 * The two read-only windows onto things kept somewhere else.
 * ----------------------------------------------------------
 * "Vault" reads a published Obsidian vault; "Reading List" reads a Zotero
 * library. Both are the same idea the GitHub window already runs on (see the
 * long note at the top of `GitHubViewer.tsx`): the real service refuses to be
 * embedded, so instead of dropping a modern web page into a 1995 desktop we
 * read its data and render it as a Windows 95 window.
 *
 * Read-only is a property of the wiring, not a setting. Neither app has a
 * write path: the Obsidian endpoints below are GETs against a *published*
 * vault — the private one on Jonas' machine is not what is being served — and
 * the Zotero key the proxy holds is minted read-only. Nothing a visitor does
 * in either window can reach back.
 *
 * This file is the whole configuration surface for both. Everything else in
 * either app reads from here.
 */

/* ---- Obsidian ------------------------------------------------------- */

/**
 * The published vault's slug: the last part of its address.
 *
 *   https://publish.obsidian.md/SLUG      ->  'SLUG'
 *
 * If the vault is on a custom domain, put the bare host here instead
 * ('notes.example.com') — `/api/obsidian` resolves either form.
 *
 * Obsidian Publish serves `x-frame-options: SAMEORIGIN`, so an <iframe> of the
 * real site renders an empty box no matter what we do. What it *does* serve,
 * with CORS open, are the three endpoints its own front-end runs on:
 *
 *   /options/<uid>          site name, which note is the index
 *   /cache/<uid>            every published path, as one JSON object
 *   /access/<uid>/<path>    a file's bytes — markdown, or an attachment
 *
 * They need the vault's `uid`, which is only in the HTML of the publish page
 * and which that page will not hand to a browser on another origin. So the
 * one thing that needs a server is looking it up — see `api/obsidian.js`.
 */
export const OBSIDIAN_SLUG: string = '';

/**
 * What `/api/obsidian` answers with once it has read the publish page.
 *
 * Note that the slug above is a *default*, not the only place it can be set:
 * the function reads `OBSIDIAN_SLUG` from the environment first, so a
 * deployment can be pointed at a different vault without a commit. That is why
 * the site's own address comes back in this reply rather than being rebuilt
 * from the constant — the front end should link to the vault that actually
 * answered, not the one this file happens to name.
 */
export interface VaultSite {
    uid: string;
    /** The CDN host serving this vault — 'publish-01.obsidian.md' and friends. */
    host: string;
    siteName: string;
    /** The note shown when nothing is selected, without its `.md`. */
    indexFile: string;
    /** Where the vault lives, for the "open the real thing" links. */
    siteUrl: string;
}

/** The fallback for those links before `/api/obsidian` has answered. */
export const obsidianSiteUrl = (site?: VaultSite | null): string => {
    if (site?.siteUrl) return site.siteUrl;
    if (!OBSIDIAN_SLUG) return 'https://obsidian.md/publish';
    return OBSIDIAN_SLUG.includes('.')
        ? `https://${OBSIDIAN_SLUG}`
        : `https://publish.obsidian.md/${OBSIDIAN_SLUG}`;
};

/** One published file. Folders are inferred from the slashes in `path`. */
export interface VaultFile {
    /** Full path inside the vault, e.g. 'Reading/Attention.md'. */
    path: string;
    /** Last path segment with the extension removed. */
    name: string;
    /** Everything before the last slash; '' for the vault root. */
    folder: string;
    isNote: boolean;
}

/** A file's bytes, straight from the CDN. Notes come back as markdown. */
export const vaultFileUrl = (site: VaultSite, path: string): string =>
    `https://${site.host}/access/${site.uid}/${path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;

/**
 * The published file list.
 *
 * `/cache/<uid>` is a flat object keyed by path — every note *and* every
 * attachment, in no useful order. This turns it into the sorted list of notes
 * and the set of folders a file tree needs.
 */
export const parseVaultCache = (cache: Record<string, unknown>): VaultFile[] =>
    Object.keys(cache)
        .map((path) => {
            const cut = path.lastIndexOf('/');
            const base = cut === -1 ? path : path.slice(cut + 1);
            const dot = base.lastIndexOf('.');
            return {
                path,
                name: dot === -1 ? base : base.slice(0, dot),
                folder: cut === -1 ? '' : path.slice(0, cut),
                isNote: path.toLowerCase().endsWith('.md'),
            };
        })
        .sort((a, b) =>
            a.path.localeCompare(b.path, undefined, { sensitivity: 'base' })
        );

/**
 * Resolving `[[a wiki link]]` the way Obsidian does.
 *
 * Obsidian links by *name*, not by path: `[[Attention]]` finds
 * `Reading/Attention.md` wherever it sits. A full path still works, and so
 * does a link that spells out the `.md`. Anything after a `#` or `|` is a
 * heading or an alias and plays no part in finding the file.
 */
export const resolveWikiLink = (
    target: string,
    files: VaultFile[]
): VaultFile | null => {
    const clean = target.split('#')[0].split('|')[0].trim();
    if (!clean) return null;
    const lower = clean.toLowerCase();
    const bare = lower.endsWith('.md') ? lower.slice(0, -3) : lower;
    return (
        files.find((f) => f.path.toLowerCase() === lower) ||
        files.find((f) => f.path.toLowerCase() === `${bare}.md`) ||
        files.find((f) => f.isNote && f.name.toLowerCase() === bare) ||
        files.find((f) => f.name.toLowerCase() === lower) ||
        null
    );
};

/* ---- Zotero --------------------------------------------------------- */

/**
 * Zotero's API would let a browser read a *public group* library directly —
 * it answers with `access-control-allow-origin: *` and no key. Jonas' library
 * is not one of those, so reading it needs a key, and a key in the bundle is
 * a key given away. `/api/zotero` holds it instead: one server-side env var,
 * a fixed set of read-only requests, nothing else proxied.
 *
 * So there is no library id to configure here. The proxy asks Zotero who the
 * key belongs to and reads that library — see `api/zotero.js`.
 */
export const ZOTERO_ENDPOINT = '/api/zotero';

/**
 * Which collection to show, by name, or '' for the whole library.
 *
 * A name rather than an id because ids are eight opaque characters and a name
 * is the thing on screen in Zotero. The proxy matches it case-insensitively
 * and falls back to the whole library if nothing matches, so a renamed
 * collection degrades to "more than you meant" rather than an error.
 */
export const ZOTERO_COLLECTION: string = '';

/** One entry, flattened by the proxy out of Zotero's very nested JSON. */
export interface Reference {
    key: string;
    title: string;
    /** Already formatted "Surname, Surname & Surname" — or '' if none. */
    creators: string;
    year: string;
    /** 'journalArticle', 'book', … as Zotero spells it. */
    itemType: string;
    /** Journal, book or conference this appeared in. */
    publication: string;
    /** The user's own note on why this one matters, if they wrote one. */
    abstract: string;
    tags: string[];
    /** Best link out: DOI if there is one, else a URL, else ''. */
    url: string;
    dateAdded: string;
}

/** Zotero's item types, in the words a reader would use. */
export const REFERENCE_KINDS: Record<string, string> = {
    journalArticle: 'Journal article',
    conferencePaper: 'Conference paper',
    book: 'Book',
    bookSection: 'Book chapter',
    thesis: 'Thesis',
    report: 'Report',
    preprint: 'Preprint',
    webpage: 'Web page',
    blogPost: 'Blog post',
    magazineArticle: 'Magazine article',
    newspaperArticle: 'Newspaper article',
    manuscript: 'Manuscript',
    document: 'Document',
    presentation: 'Presentation',
    videoRecording: 'Video',
    podcast: 'Podcast',
    computerProgram: 'Software',
    dataset: 'Dataset',
};

export const referenceKind = (itemType: string): string =>
    REFERENCE_KINDS[itemType] || 'Reference';
