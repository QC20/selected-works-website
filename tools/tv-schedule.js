/**
 * Bake the television's schedule.
 *
 * Every channel in `src/components/os/channels.ts` is an Internet Archive
 * search. This runs each search once, looks every result up in the Archive's
 * metadata to find a file the set can play and how long it runs, and writes
 * the lot to `src/data/tvSchedule.json`. `tvSchedule.ts` lays those
 * programmes end to end from a fixed origin, which is what makes "what is on
 * channel 8 at 21:14" the same answer for everyone and lets the guide draw
 * each programme at its real length.
 *
 * Doing this in the browser on every visit was the old arrangement, and it
 * could not give either of those. The search result is ordered by downloads,
 * which shift daily, and it carries no running time for most items (14 of the
 * first 100 Computer Chronicles episodes, and some of those are wrong).
 *
 * Run it from the repo root when a channel's query changes, or now and then
 * so tapes the Archive has since removed drop out:
 *
 *     node tools/tv-schedule.js            all channels
 *     node tools/tv-schedule.js 8 14       only those channels; the rest of
 *                                          the file is kept as it was
 *
 * It needs Node 18 (for `fetch`) and the project's own `typescript` package,
 * which it uses to read `channels.ts` directly.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'src/components/os/channels.ts');
const OUT = path.join(ROOT, 'src/data/tvSchedule.json');

/** Search results to consider per channel, best-downloaded first. */
const CANDIDATES = 160;
/** Programmes kept per channel. Several hours of loop on every channel. */
const KEEP = 60;
/** Anything shorter is a fragment; anything longer hogs a channel for a day. */
const MIN_SECONDS = 20;
const MAX_SECONDS = 2.5 * 60 * 60;
/** Metadata requests in flight at once. The Archive is a library, not a CDN. */
const CONCURRENCY = 6;

const USER_AGENT =
    'selected-works-website tv-schedule (+https://github.com/QC20/selected-works-website)';

/* -------------------------------------------------------------------------
 * channels.ts, without a build step
 * ---------------------------------------------------------------------- */

const loadChannels = () => {
    const { outputText } = ts.transpileModule(fs.readFileSync(SOURCE, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
    });
    const mod = { exports: {} };
    new Function('module', 'exports', 'require', outputText)(mod, mod.exports, require);
    return mod.exports;
};

/* -------------------------------------------------------------------------
 * The Archive
 * ---------------------------------------------------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET as JSON, backing off on throttling and server errors. */
const getJson = async (url) => {
    for (let attempt = 0; ; attempt++) {
        let res;
        try {
            res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
        } catch (err) {
            if (attempt >= 4) throw err;
            await sleep(1000 * 2 ** attempt);
            continue;
        }
        if (res.ok) return res.json();
        if ((res.status === 429 || res.status >= 500) && attempt < 4) {
            await sleep(1500 * 2 ** attempt);
            continue;
        }
        throw new Error(`${res.status} ${url}`);
    }
};

const search = async (query) => {
    const p = new URLSearchParams();
    p.set('q', query);
    p.append('fl[]', 'identifier');
    p.append('fl[]', 'title');
    p.append('fl[]', 'year');
    // Downloads-descending puts the watchable, well-transferred tapes first;
    // the Archive's default relevance ordering surfaces a lot of broken rips.
    p.append('sort[]', 'downloads desc');
    p.set('rows', String(CANDIDATES));
    p.set('output', 'json');
    const body = await getJson(`https://archive.org/advancedsearch.php?${p}`);
    return (body?.response?.docs ?? [])
        .filter((d) => d?.identifier && d?.title)
        .map((d) => ({
            id: String(d.identifier),
            title: String(Array.isArray(d.title) ? d.title[0] : d.title).trim(),
            year: Number(d.year) || undefined,
        }));
};

/** "1711.57", "26:22" or "1:02:03" → seconds. */
const parseLength = (raw) => {
    if (raw == null) return NaN;
    const s = String(raw).trim();
    if (!s.includes(':')) return Number(s);
    return s.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
};

/**
 * The file to play for one item, and how long it runs — or null if it has
 * nothing a browser can stream at a sensible length.
 */
const resolve = async (id, formats) => {
    const body = await getJson(`https://archive.org/metadata/${encodeURIComponent(id)}`);
    if (!body || body.is_dark || !Array.isArray(body.files)) return null;
    // Lending-library items are listed but will not stream to a stranger.
    if (String(body.metadata?.['access-restricted-item']) === 'true') return null;

    for (const format of formats) {
        // The longest file in a multi-file item is nearly always the
        // programme its title names; the short ones are the bumpers and
        // adverts somebody taped around it.
        const hit = body.files
            .filter((f) => f?.format === format && f?.name)
            .map((f) => ({ name: String(f.name), seconds: Math.round(parseLength(f.length)) }))
            .filter((f) => f.seconds >= MIN_SECONDS && f.seconds <= MAX_SECONDS)
            .sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name))[0];
        if (hit) return hit;
    }
    return null;
};

/** Run `fn` over `items` with a fixed number in flight, keeping order. */
const pool = async (items, fn) => {
    const out = new Array(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const i = next++;
            try {
                out[i] = await fn(items[i]);
            } catch (err) {
                out[i] = null;
                console.warn(`    skipped ${items[i].id}: ${err.message}`);
            }
        }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    return out;
};

/* -------------------------------------------------------------------------
 * One channel
 * ---------------------------------------------------------------------- */

/** mulberry32: a seeded shuffle, so a re-run with the same tapes is stable. */
const rng = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const bake = async (channel, lib) => {
    const found = await search(channel.query);
    const seen = new Set();
    const candidates = [...(channel.fallback ?? []), ...found].filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        // The same two nets the browser used to cast — see channels.ts.
        if (lib.isDenied(e.title)) return false;
        if (e.year && e.year > lib.LATEST_YEAR) return false;
        return true;
    });

    const kept = [];
    // In batches, so a channel stops asking the Archive once it has enough.
    for (let i = 0; i < candidates.length && kept.length < KEEP; i += CONCURRENCY * 2) {
        const batch = candidates.slice(i, i + CONCURRENCY * 2);
        const files = await pool(batch, (e) => resolve(e.id, lib.FORMATS));
        batch.forEach((e, j) => {
            if (files[j] && kept.length < KEEP) kept.push({ ...e, ...files[j] });
        });
    }

    // Downloads order would put every channel's best tape first in the loop
    // and its weakest last. Shuffle, seeded by the dial position.
    const rand = rng(channel.number * 7919);
    for (let i = kept.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [kept[i], kept[j]] = [kept[j], kept[i]];
    }

    return kept.map((p) => [p.id, p.title.slice(0, 140), p.year ?? null, p.name, p.seconds]);
};

/* -------------------------------------------------------------------------
 * Main
 * ---------------------------------------------------------------------- */

/** One programme per line: the file is data, and its diffs should read. */
const serialise = (schedule) => {
    const channels = Object.entries(schedule.channels)
        .map(([n, rows]) => {
            const lines = rows.map((r) => `      ${JSON.stringify(r)}`).join(',\n');
            return `    "${n}": [\n${lines}\n    ]`;
        })
        .join(',\n');
    return `{\n  "generated": "${schedule.generated}",\n  "channels": {\n${channels}\n  }\n}\n`;
};

const main = async () => {
    const lib = loadChannels();
    const only = process.argv.slice(2).map(Number).filter(Boolean);

    const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
    const channels = { ...(previous?.channels ?? {}) };

    for (const channel of lib.CHANNELS) {
        if (channel.kind === 'testCard' || !channel.query) continue;
        if (only.length && !only.includes(channel.number)) continue;

        process.stdout.write(`CH ${String(channel.number).padStart(2)} ${channel.name} … `);
        const rows = await bake(channel, lib);
        const hours = rows.reduce((s, r) => s + r[4], 0) / 3600;
        console.log(`${rows.length} programmes, ${hours.toFixed(1)} h`);

        if (!rows.length) {
            // Keep yesterday's lineup rather than take a channel off air.
            console.warn(`    nothing playable — keeping the previous lineup`);
            continue;
        }
        channels[channel.number] = rows;
    }

    // Dial order, and nothing for channels that no longer exist.
    const ordered = {};
    for (const c of lib.CHANNELS) if (channels[c.number]) ordered[c.number] = channels[c.number];

    const generated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(OUT, serialise({ generated, channels: ordered }));
    console.log(`\nwrote ${path.relative(ROOT, OUT)}`);
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
