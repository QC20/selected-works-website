/**
 * Bake the television's schedule.
 * --------------------------------
 * The set in `src/components/applications/Television.tsx` plays tapes from the
 * Internet Archive. This tool is where they are chosen and checked, so that the
 * browser never has to: it resolves every tape named in `tools/tv-lineup.js`
 * to one file a browser can stream, measures it, rejects anything that would
 * stall or embarrass, packs the survivors into half-hour blocks and writes the
 * lot to `src/data/tvSchedule.json`, which `os/tvSchedule.ts` reads.
 *
 *     node tools/tv-schedule.js                 bake every channel
 *     node tools/tv-schedule.js 8 14            bake only those; keep the rest
 *     node tools/tv-schedule.js --probe         also ffprobe every chosen file
 *     node tools/tv-schedule.js discover 'collection:prelinger AND subject:cars' [rows]
 *                                               list candidates to curate from
 *
 * Why a curated list and not a search. The first two versions of the set
 * defined each channel as an Archive query. Queries drift: the same search
 * returned a Quran recitation on "News Desk", Arabic dubs on Computer
 * Chronicles, a two-hour Rap City tape on "Ad Break" and a Spanish dub of a
 * 2000s cartoon on "Cartoon Network". Nothing reaches a channel now unless it
 * is named in the lineup, and `discover` exists to make naming them quick.
 *
 * Why the file rules are strict. A tape can be perfectly watchable and still
 * be useless here: the Archive keeps the upload exactly as it came, and a 2022
 * capture of a 1991 VHS tape is 8.4 GB of 1080p for 55 minutes — 20 Mbit/s,
 * which no visitor can stream from a library's servers. Every item also has
 * small derivatives the Archive made itself, and those are what the set plays:
 * H.264 in MP4, under MAX_KBPS. The earlier version preferred the original
 * upload over the derivative and that, more than anything, is why so many
 * channels showed nothing.
 *
 * Needs Node 18 (for `fetch`). `--probe` needs `ffprobe` on the PATH.
 * Responses are cached in node_modules/.cache/tv-schedule, so a re-run only
 * asks the Archive about tapes it has not seen; delete that folder to start
 * clean, which is worth doing now and then so withdrawn tapes drop out.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src/data/tvSchedule.json');
const CACHE_DIR = path.join(ROOT, 'node_modules/.cache/tv-schedule');

/** Above this a stream stalls on ordinary connections. 512Kb derivatives sit near 560. */
const MAX_KBPS = 1300;
/** Every programme is followed by at least this much break: an ident and a card. */
const MIN_GAP = 20;
/** Metadata requests in flight at once. The Archive is a library, not a CDN. */
const CONCURRENCY = 6;
const USER_AGENT = 'tv-schedule-baker/2 (node)';

/**
 * Derivative formats worth playing, best first. All are H.264 in an MP4.
 * The 512Kb derivative leads because its index is smallest: joining a
 * programme halfway means downloading the whole `moov` first (1.1 MB for a
 * half-hour 512Kb file, 1.9 MB for the same episode at 640x480).
 */
const FORMATS = ['512Kb MPEG4', 'h.264 IA', 'h.264', 'MPEG4', 'HiRes MPEG4'];

/** Never scheduled, whatever list it came in on. A second net, not the first. */
const DENIED =
    /\b(suicide|(?<!trouble ?)shootings?|executions?|autopsy|graphic (?:content|violence|warning)|nude|nudity|erotic|xxx|porn|sex|nazi propaganda|lynch)/i;

/** Nothing after the machine's own era. */
const LATEST_YEAR = 1999;

/* -------------------------------------------------------------------------
 * The Archive, politely
 * ---------------------------------------------------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const cacheFile = (name) => path.join(CACHE_DIR, name);
const readCache = (name) => {
    try {
        return JSON.parse(fs.readFileSync(cacheFile(name), 'utf8'));
    } catch {
        return {};
    }
};
const writeCache = (name, data) => {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cacheFile(name), JSON.stringify(data));
};

const metaCache = readCache('metadata.json');
const probeCache = readCache('probe.json');

const metadata = async (id) => {
    if (metaCache[id]) return metaCache[id];
    const body = await getJson(`https://archive.org/metadata/${encodeURIComponent(id)}`);
    // Keep only what the bake reads; a multi-file item's full record can be MBs.
    const slim = body && body.metadata
        ? {
              dark: !!body.is_dark,
              restricted: String(body.metadata['access-restricted-item']) === 'true',
              title: body.metadata.title,
              year: body.metadata.year || body.metadata.date,
              language: body.metadata.language,
              collection: body.metadata.collection,
              files: (body.files || [])
                  .filter((f) => FORMATS.includes(f.format) || /\.(mp4|m4v)$/i.test(f.name || ''))
                  .map((f) => ({
                      name: f.name,
                      format: f.format,
                      original: f.original,
                      length: f.length,
                      size: f.size,
                      width: f.width,
                      height: f.height,
                      title: f.title,
                  })),
          }
        : { missing: true, files: [] };
    metaCache[id] = slim;
    return slim;
};

const search = async (query, rows) => {
    const p = new URLSearchParams();
    p.set('q', query);
    for (const f of ['identifier', 'title', 'year', 'downloads']) p.append('fl[]', f);
    p.append('sort[]', 'downloads desc');
    p.set('rows', String(rows));
    p.set('output', 'json');
    const body = await getJson(`https://archive.org/advancedsearch.php?${p}`);
    return (body?.response?.docs ?? []).map((d) => String(d.identifier));
};

/** Run `fn` over `items` with a fixed number in flight, keeping order. */
const pool = async (items, fn, n = CONCURRENCY) => {
    const out = new Array(items.length);
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const i = next++;
            try {
                out[i] = await fn(items[i], i);
            } catch (err) {
                out[i] = null;
                console.warn(`    skipped ${items[i]?.id ?? items[i]}: ${err.message}`);
            }
        }
    };
    await Promise.all(Array.from({ length: n }, worker));
    return out;
};

/* -------------------------------------------------------------------------
 * Choosing a file
 * ---------------------------------------------------------------------- */

/** "1711.57", "26:22" or "1:02:03" → seconds. */
const parseLength = (raw) => {
    if (raw == null) return NaN;
    const s = String(raw).trim();
    if (!s.includes(':')) return Number(s);
    return s.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
};

const first = (v) => (Array.isArray(v) ? v[0] : v);
const yearOf = (raw) => {
    const m = String(first(raw) ?? '').match(/\b(18|19|20)\d\d\b/);
    return m ? Number(m[0]) : null;
};

const isEnglish = (lang) => {
    if (!lang) return true;
    const all = [].concat(lang).map((l) => String(l).toLowerCase());
    return all.some((l) => l.startsWith('en') || l === 'english');
};

/** "popeye_patriotic_popeye_512kb.mp4" → "popeye patriotic popeye". */
const titleFromFile = (name) =>
    name
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/_?512kb$/i, '')
        .replace(/\.ia$/i, '')
        .replace(/[_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Archive titles are typed by uploaders: "JSC_830_We_Deliver.wmv", "SKYLAB -
 * SPACE STATION I", "''The Lone Ranger'' - Old Joe's Sister". The guide shows
 * them, so they are tidied once here.
 */
const tidyTitle = (raw) => {
    let t = raw
        .replace(/\.(wmv|mp4|avi|mpeg|mpg|mov)$/i, '')
        .replace(/^(jsc|hq|cmp|msfc)[-_ ]?\d+[a-z]?[-_ ]*/i, '')
        .replace(/_/g, ' ')
        .replace(/^soundie\s*[-:]\s*/i, '')
        .replace(/''/g, '"')
        // The year is shown separately; "( 1915)" in a title is noise.
        .replace(/\s*[([]\s*(18|19)\d\d\s*[)\]]\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    // Shouting, in a listing, reads as a typo: Title Case anything all caps.
    if (t.length > 4 && t === t.toUpperCase() && /[A-Z]{3}/.test(t)) {
        t = t.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Ii|Iii|Iv|Vi|Vii|Viii|Nasa|Sts|Usa|Us)\b/g, (m) => m.toUpperCase());
    }
    return t.slice(0, 120);
};

/**
 * Every playable rendition of every video in an item, grouped by the upload
 * it was made from, with the one to use chosen per group.
 */
const renditions = (meta) => {
    const groups = new Map();
    for (const f of meta.files) {
        if (!FORMATS.includes(f.format)) continue;
        if (!/\.(mp4|m4v)$/i.test(f.name)) continue;
        const seconds = parseLength(f.length);
        const bytes = Number(f.size);
        if (!(seconds > 0) || !(bytes > 0)) continue;
        const key = f.format === 'MPEG4' || f.format === 'HiRes MPEG4' ? f.name : f.original || f.name;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({
            ...f,
            seconds: Math.round(seconds),
            kbps: Math.round((bytes * 8) / seconds / 1000),
        });
    }
    const out = [];
    for (const [key, list] of groups) {
        const ok = list
            .filter((r) => r.kbps <= MAX_KBPS)
            .sort((a, b) => FORMATS.indexOf(a.format) - FORMATS.indexOf(b.format));
        const best = ok[0];
        const heaviest = list.reduce((a, b) => (a.kbps > b.kbps ? a : b));
        out.push({ key, best, heaviest, title: list.find((r) => r.title)?.title });
    }
    return out.sort((a, b) => (b.best?.seconds ?? 0) - (a.best?.seconds ?? 0));
};

/* -------------------------------------------------------------------------
 * ffprobe, for the codecs the metadata does not state
 * ---------------------------------------------------------------------- */

const fileUrl = (id, file) =>
    `https://archive.org/download/${encodeURIComponent(id)}/${file
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;

const ffprobe = (url) =>
    new Promise((resolve) => {
        if (probeCache[url]) return resolve(probeCache[url]);
        execFile(
            'ffprobe',
            ['-v', 'error', '-rw_timeout', '20000000', '-show_entries',
             'stream=codec_type,codec_name:format=duration', '-of', 'json', url],
            { timeout: 60000 },
            (err, out) => {
                if (err) return resolve({ error: String(err.message).split('\n')[0] });
                try {
                    const j = JSON.parse(out);
                    const v = (j.streams || []).find((s) => s.codec_type === 'video');
                    const a = (j.streams || []).find((s) => s.codec_type === 'audio');
                    const result = {
                        video: v?.codec_name ?? null,
                        audio: a?.codec_name ?? null,
                        duration: Number(j.format?.duration) || null,
                    };
                    probeCache[url] = result;
                    resolve(result);
                } catch {
                    resolve({ error: 'unreadable ffprobe output' });
                }
            }
        );
    });

/* -------------------------------------------------------------------------
 * discover
 * ---------------------------------------------------------------------- */

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

const discover = async (query, rows = 60) => {
    const ids = await search(query, rows);
    const rowsOut = await pool(ids, async (id) => {
        const meta = await metadata(id);
        const groups = renditions(meta);
        const best = groups.find((g) => g.best);
        return { id, meta, groups, best };
    });
    writeCache('metadata.json', metaCache);
    for (const r of rowsOut) {
        if (!r) continue;
        const { id, meta, groups, best } = r;
        const flags = [
            meta.restricted ? 'RESTRICTED' : '',
            isEnglish(meta.language) ? '' : `lang=${[].concat(meta.language).join('/')}`,
            groups.length > 1 ? `${groups.length} videos` : '',
            best ? '' : groups.length ? `too heavy (${groups[0].heaviest.kbps} kbps)` : 'no mp4',
        ].filter(Boolean).join(' ');
        const b = best?.best;
        console.log(
            [
                id.padEnd(44),
                String(yearOf(meta.year) ?? '').padEnd(4),
                (b ? mmss(b.seconds) : '-').padStart(7),
                (b ? `${b.kbps}k` : '').padStart(6),
                String(first(meta.title) ?? '').slice(0, 70),
                flags ? `[${flags}]` : '',
            ].join('  ')
        );
    }
};

/* -------------------------------------------------------------------------
 * bake
 * ---------------------------------------------------------------------- */

/** mulberry32: a seeded shuffle, so a re-run with the same tapes is stable. */
const rng = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const shuffle = (list, seed) => {
    const rand = rng(seed);
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

/**
 * Resolve one lineup entry to programmes.
 *
 * An entry is an identifier, or `{ id, files: 'all' | [names], series, title }`.
 * A plain identifier plays the item's longest video, which in a multi-file
 * item is nearly always the programme its title names.
 */
const resolveEntry = async (entry, defaults, problems) => {
    const spec = typeof entry === 'string' ? { id: entry } : entry;
    const meta = await metadata(spec.id);
    if (meta.missing) return problems.push(`${spec.id}: not found`), [];
    if (meta.dark || meta.restricted) return problems.push(`${spec.id}: not streamable`), [];
    if (!spec.anyLanguage && !isEnglish(meta.language)) {
        return problems.push(`${spec.id}: language ${meta.language}`), [];
    }

    let groups = renditions(meta);
    if (Array.isArray(spec.files)) {
        groups = groups.filter((g) => spec.files.some((n) => g.key === n || g.best?.name === n));
    } else if (spec.files !== 'all') {
        groups = groups.slice(0, 1);
    }

    const out = [];
    for (const g of groups) {
        if (!g.best) {
            problems.push(`${spec.id}: no rendition under ${MAX_KBPS} kbps (lightest ${g.heaviest.kbps})`);
            continue;
        }
        const multi = groups.length > 1 || spec.files === 'all';
        const rawTitle = String((multi ? g.title || titleFromFile(g.best.name) : null) ?? spec.title ?? first(meta.title));
        const title = tidyTitle(rawTitle);
        const year = spec.year ?? yearOf(meta.year) ?? yearOf(rawTitle);
        if (DENIED.test(title)) {
            problems.push(`${spec.id}: denied title "${title}"`);
            continue;
        }
        if (year && year > LATEST_YEAR) {
            problems.push(`${spec.id}: ${year} is after ${LATEST_YEAR}`);
            continue;
        }
        const min = spec.min ?? defaults.min;
        const max = spec.max ?? defaults.max;
        if (g.best.seconds < min || g.best.seconds > max) {
            problems.push(`${spec.id}: ${mmss(g.best.seconds)} outside ${mmss(min)}–${mmss(max)}`);
            continue;
        }
        out.push({
            id: spec.id,
            series: spec.series ?? defaults.series ?? null,
            title,
            year: year ?? null,
            file: g.best.name,
            seconds: g.best.seconds,
            kbps: g.best.kbps,
        });
    }
    return out;
};

/**
 * Pack programmes into blocks that each fill whole slots.
 *
 * Every block starts on a slot boundary (:00 or :30 for half-hour slots),
 * which is what makes the guide read like a listings magazine rather than a
 * playlist. Short programmes share a block; one that runs over a slot takes
 * as many as it needs. Whatever time is left in a block becomes its breaks,
 * filled at runtime with idents, cards and commercials.
 */
const pack = (units, programmes, slotSeconds, gap, seed) => {
    // A unit is one programme, or the parts of one film that must air
    // together and in order. Units are what get shuffled.
    const cost = (u) => u.reduce((s, i) => s + programmes[i].seconds + gap, 0);
    const order = shuffle(units.map((_, i) => i), seed);
    const used = new Set();
    const blocks = [];
    const LOOKAHEAD = 80;
    for (let i = 0; i < order.length; i++) {
        const head = order[i];
        if (used.has(head)) continue;
        used.add(head);
        const slots = Math.max(1, Math.ceil(cost(units[head]) / slotSeconds));
        const block = [...units[head]];
        let left = slots * slotSeconds - cost(units[head]);
        // Only blocks of one slot share: a film that has already spilled
        // into a second half hour is not followed by a cartoon.
        if (slots === 1) {
            for (let j = i + 1; j < order.length && j <= i + LOOKAHEAD; j++) {
                const q = order[j];
                if (used.has(q)) continue;
                const c = cost(units[q]);
                if (c <= left) {
                    block.push(...units[q]);
                    used.add(q);
                    left -= c;
                }
            }
        }
        blocks.push([slots, ...block]);
    }
    return blocks;
};

const loadChannels = () => {
    // channels.ts is the one source of channel identity; read it directly.
    const ts = require('typescript');
    const source = path.join(ROOT, 'src/components/os/channels.ts');
    const { outputText } = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
    });
    const mod = { exports: {} };
    new Function('module', 'exports', 'require', outputText)(mod, mod.exports, require);
    return mod.exports.CHANNELS;
};

const row = (p) => [p.id, p.series, p.title, p.year, p.file, p.seconds];

/** One line per programme: the file is data, and its diffs should read. */
const serialise = (data) => {
    const lines = (rows) => rows.map((r) => `      ${JSON.stringify(r)}`).join(',\n');
    const channels = Object.entries(data.channels)
        .map(
            ([n, c]) =>
                `    "${n}": {\n      "slot": ${c.slot},\n      "programmes": [\n${lines(c.programmes).replace(/^ {6}/gm, '        ')}\n      ],\n      "blocks": ${JSON.stringify(c.blocks)}\n    }`
        )
        .join(',\n');
    return `{\n  "generated": "${data.generated}",\n  "ads": [\n${lines(data.ads)}\n  ],\n  "channels": {\n${channels}\n  }\n}\n`;
};

const bake = async ({ only, probe }) => {
    const lineup = require('./tv-lineup.js');
    const CHANNELS = loadChannels();
    const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
    const keepPrevious = previous && previous.channels && !Array.isArray(Object.values(previous.channels)[0]);
    const channels = keepPrevious ? { ...previous.channels } : {};
    let ads = keepPrevious ? previous.ads || [] : [];

    /** A programme passes if ffprobe finds H.264 picture and AAC/MP3 sound. */
    const playable = async (list, label) => {
        if (!probe) return list.map(() => true);
        const results = await pool(list, (p) => ffprobe(fileUrl(p.id, p.file)), 4);
        writeCache('probe.json', probeCache);
        return list.map((p, i) => {
            const r = results[i] || { error: 'no result' };
            // Silent film with no score is dead air on a television.
            const ok = !r.error && r.video === 'h264' && ['aac', 'mp3'].includes(r.audio);
            if (!ok) console.warn(`    ${label}: dropped ${p.id} (${r.error || `${r.video}/${r.audio ?? 'no sound'}`})`);
            return ok;
        });
    };

    /**
     * Entries → units of programmes. An entry is an id, an object, or
     * `{ seq: [...] }`; a sequence survives only if every part does, since
     * Part II on its own is not a programme.
     */
    const resolveAll = async (entries, defaults, label) => {
        const problems = [];
        const specs = entries.map((e) => (e && e.seq ? e : { seq: [e] }));
        const flat = specs.flatMap((s, unit) =>
            s.seq.map((e) => ({ unit, spec: { ...(typeof e === 'string' ? { id: e } : e), series: s.series ?? (typeof e === 'object' ? e.series : undefined) } }))
        );
        const resolved = await pool(flat, ({ spec }) => resolveEntry({ ...defaults.base, ...spec, series: spec.series ?? defaults.base?.series }, defaults, problems));
        writeCache('metadata.json', metaCache);
        const all = [];
        flat.forEach((f, i) => (resolved[i] || []).forEach((p) => all.push({ ...p, unit: f.unit })));
        const seen = new Set();
        const unique = all.filter((p) => {
            const key = `${p.id}/${p.file}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        const ok = await playable(unique, label);
        const survivors = unique.filter((_, i) => ok[i]);
        for (const msg of problems) console.warn(`    ${label}: ${msg}`);
        const units = new Map();
        for (const p of survivors) {
            if (!units.has(p.unit)) units.set(p.unit, []);
            units.get(p.unit).push(p);
        }
        return [...units.entries()]
            .filter(([u, list]) => list.length === specs[u].seq.length || specs[u].seq.length === 1)
            .map(([, list]) => list);
    };

    if (!only.length || only.includes('ads')) {
        process.stdout.write('ADS … ');
        const units = await resolveAll(lineup.ads, { min: 8, max: 200 }, 'ads');
        const list = units.flat();
        ads = list.map((p) => [p.id, p.title, p.year, p.file, p.seconds]);
        console.log(`${ads.length} commercials, ${(list.reduce((s, p) => s + p.seconds, 0) / 60).toFixed(0)} min`);
    }

    for (const channel of CHANNELS) {
        const spec = lineup.channels[channel.number];
        if (!spec || channel.kind) continue;
        if (only.length && !only.includes(String(channel.number))) continue;
        process.stdout.write(`CH ${String(channel.number).padStart(2)} ${channel.name} … `);
        const slot = (channel.slotMinutes ?? 30) * 60;
        const gap = channel.gap ?? MIN_GAP;
        const units = [];
        for (const group of spec.sources) {
            const got = await resolveAll(group.ids || [], {
                min: spec.min ?? 20,
                max: spec.max ?? slot * 5,
                base: { series: group.series ?? undefined },
            }, `CH ${channel.number}`);
            units.push(...got);
        }
        const programmes = [];
        const unitIndices = units.map((list) => list.map((p) => programmes.push(p) - 1));
        if (!programmes.length) {
            console.warn('nothing playable — keeping the previous lineup');
            continue;
        }
        const blocks = pack(unitIndices, programmes, slot, gap, channel.number * 7919);
        const hours = blocks.reduce((s, b) => s + b[0], 0) * slot / 3600;
        const fill = 1 - programmes.reduce((s, p) => s + p.seconds, 0) / (hours * 3600);
        console.log(`${programmes.length} programmes in ${blocks.length} blocks, ${hours.toFixed(1)} h, ${(fill * 100).toFixed(0)}% breaks`);
        channels[channel.number] = { slot: channel.slotMinutes ?? 30, programmes: programmes.map(row), blocks };
    }

    const ordered = {};
    for (const c of CHANNELS) if (channels[c.number]) ordered[c.number] = channels[c.number];
    const generated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(OUT, serialise({ generated, ads, channels: ordered }));
    console.log(`\nwrote ${path.relative(ROOT, OUT)}`);
};

/* -------------------------------------------------------------------------
 * Main
 * ---------------------------------------------------------------------- */

const main = async () => {
    const args = process.argv.slice(2);
    if (args[0] === 'discover') {
        if (!args[1]) throw new Error("usage: discover '<archive query>' [rows]");
        await discover(args[1], Number(args[2]) || 60);
        return;
    }
    await bake({
        only: args.filter((a) => !a.startsWith('--')),
        probe: args.includes('--probe'),
    });
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
