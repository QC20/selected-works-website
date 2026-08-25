/**
 * What is on television.
 * ----------------------
 * The dial behind `applications/Television.tsx`. Channels are *queries*, not
 * playlists: each one names a collection on the Internet Archive, and the set
 * of programmes on it is whatever that collection holds today. That is the
 * only way to get a dial that feels bottomless — a hand-typed playlist runs
 * out, and a visitor notices the loop within about two minutes.
 *
 * Three rules this file exists to enforce, all of them learned the hard way
 * while picking the collections:
 *
 *   Curated collections only.  The Archive's biggest film collections are
 *   open upload with no moderation. Sorting VHS Vault by popularity returns a
 *   real televised suicide in the first three results, and adult tapes shortly
 *   after. None of that belongs on a portfolio, and no denylist is good enough
 *   to promise otherwise, so the unmoderated collections are simply not here.
 *   Everything in `CHANNELS` comes from a collection somebody curates:
 *   Prelinger's archival holdings, the Computer Chronicles' PBS run, the
 *   public-domain cartoon shelf, the educational-film shelf, and the
 *   off-air commercial tapes. `DENIED` below is a second net, not the first.
 *
 *   Period only.  Nothing later than 1999 is ever requested. A visitor who
 *   finds a 2015 upload on a Windows 95 desktop has caught the machine lying,
 *   and the whole conceit deflates. Collections that are wholly pre-1999 by
 *   nature (Prelinger, the cartoons) need no year clause; the ones that
 *   aren't carry one in the query itself.
 *
 *   No portfolio content.  The television is a place to *waste time*, not a
 *   second route into the CV. Jonas' own work is not on any channel here and
 *   should not be added to one — the showcase, the paintings and the DJ sets
 *   already have their own windows, and mixing them in would make the TV feel
 *   like an advert instead of a diversion.
 */

/** One programme, as the Archive describes it. */
export interface Episode {
    /** The Archive identifier — `archive.org/embed/<id>` plays it. */
    id: string;
    title: string;
    year?: number;
}

export interface Channel {
    /** Dial position. Shown in the corner bug and used to seed the schedule. */
    number: number;
    name: string;
    /** One line, in the register of a listings magazine. */
    tagline: string;
    /**
     * The Archive search this channel is. Absent on `testCard`, which is drawn
     * locally and needs no network at all.
     */
    query?: string;
    /**
     * Drawn by the client rather than streamed. Only the test card, and it is
     * deliberately the only one — see the note on removing it below.
     */
    kind?: 'testCard';
    /** Baked-in programmes, used when the Archive can't be reached. */
    fallback?: Episode[];
}

/**
 * Titles never worth showing, matched case-insensitively against the whole
 * title. The curated collections make this close to unnecessary, which is the
 * point — it is here to catch a stray upload into an otherwise clean
 * collection, not to make an unsafe collection safe. If you ever add a
 * collection that *needs* this list to be respectable, add the collection
 * somewhere else instead.
 */
const DENIED =
    /\b(suicide|shooting|execution|autopsy|graphic warning|nude|nudity|erotic|xxx|porn)\b/i;

/**
 * THE TEST CARD — read this before deleting it.
 *
 * Channel 2 is the only channel drawn locally, and it is deliberately
 * self-contained so it can be removed in one edit: delete this constant, drop
 * the single entry from `CHANNELS`, and delete the `kind === 'testCard'` branch
 * in `Television.tsx`. Nothing else refers to it. It exists because a dial
 * whose lowest channel is dead air is more convincing than one that starts
 * with programming, and because it gives the set something honest to show
 * while a real channel is still loading.
 */
export const TEST_CARD_CHANNEL: Channel = {
    number: 2,
    name: 'Test Card',
    tagline: 'Transmission resumes at 06:00.',
    kind: 'testCard',
};

export const CHANNELS: Channel[] = [
    TEST_CARD_CHANNEL,
    {
        number: 3,
        name: 'Ad Break',
        tagline: 'Off-air tape. Adverts, trailers and whatever surrounded them.',
        query: 'collection:"classic_tv_commercials" AND mediatype:movies AND year:[1985 TO 1999]',
        fallback: [
            { id: 'vts-01-1_20200423_1708', title: 'Various Television Recordings', year: 1989 },
            { id: 'TheHypnoticEyeEpisode6', title: 'The Hypnotic Eye, Episode 6', year: 1997 },
            { id: 'wcco102091', title: 'WCCO Commercials', year: 1991 },
        ],
    },
    {
        number: 4,
        name: 'News Desk',
        tagline: 'Local bulletins, as they went out.',
        query: 'collection:"classic_tv_commercials" AND mediatype:movies AND (title:news OR subject:news)',
        fallback: [
            { id: 'wews-abc-news-brief-04-07-1991', title: 'WEWS ABC News Brief', year: 1991 },
            { id: 'wews-newschannel-5-news-brief-12-23-1995', title: 'WEWS NewsChannel 5 NewsBrief', year: 1995 },
        ],
    },
    {
        number: 5,
        name: 'Station Break',
        tagline: 'Idents, promos and bumpers. Nothing but the joins.',
        query: 'collection:"classic_tv_commercials" AND mediatype:movies AND (title:"ID" OR title:promo OR title:bumper)',
        fallback: [{ id: 'wews-id-1998', title: 'WEWS ID', year: 1998 }],
    },
    {
        number: 6,
        name: 'Cartoon Carnival',
        tagline: 'Popeye, Betty Boop and the rest of the public domain.',
        query: 'collection:"classic_cartoons" AND mediatype:movies',
        fallback: [
            { id: 'popeye_patriotic_popeye', title: 'Patriotic Popeye', year: 1957 },
            { id: 'BettyBoopCartoons', title: 'Betty Boop Cartoons' },
            { id: 'FLIP_FROG-FIDDLESTICKS', title: 'Flip the Frog: Fiddlesticks', year: 1930 },
            { id: 'woody_woodpecker_pantry_panic', title: 'Woody Woodpecker in Pantry Panic', year: 1941 },
        ],
    },
    {
        number: 7,
        name: 'Animation Station',
        tagline: 'The stranger end of the cartoon shelf.',
        query: 'collection:"more_animation" AND mediatype:movies',
        fallback: [{ id: 'the_big_bad_wolf', title: 'The Big Bad Wolf' }],
    },
    {
        number: 8,
        name: 'Computer Chronicles',
        tagline: "Stewart Cheifet explains the future. It is beige.",
        query: 'collection:"computerchronicles" AND mediatype:movies',
        fallback: [
            { id: 'CC517_commodore_64', title: 'Commodore 64' },
            { id: 'virtualreali', title: 'Virtual Reality', year: 1992 },
            { id: 'CC501_hypercard', title: 'Hypercard' },
            { id: 'Amigaand1985', title: 'Amiga and Atari', year: 1985 },
            { id: 'GaryKild', title: 'Gary Kildall Special' },
        ],
    },
    {
        number: 9,
        name: 'Social Guidance',
        tagline: 'How to behave, according to a filmstrip.',
        query: 'collection:"prelinger" AND (subject:"social guidance" OR subject:"etiquette" OR subject:"teenagers")',
        fallback: [{ id: 'JoanAvoi1947', title: 'Joan Avoids a Cold', year: 1947 }],
    },
    {
        number: 10,
        name: 'The Open Road',
        tagline: 'Driver education, and the consequences of ignoring it.',
        query: 'collection:"prelinger" AND (subject:"driver education" OR subject:"automobiles" OR subject:"safety")',
        fallback: [{ id: 'YoureDri1940', title: "You're Driving 90 Horses" }],
    },
    {
        number: 11,
        name: 'Industry on Parade',
        tagline: 'Things being manufactured, at length.',
        query: 'collection:"prelinger" AND (subject:"industry" OR subject:"manufacturing" OR subject:"advertising")',
        fallback: [{ id: 'AboutBan1935', title: 'About Bananas', year: 1935 }],
    },
    {
        number: 12,
        name: 'Atomic Age',
        tagline: 'Science, space and the peaceful atom.',
        query: 'collection:"prelinger" AND (subject:"space" OR subject:"atomic" OR subject:"science")',
        fallback: [{ id: 'FromtheG1954', title: 'From the Ground Up', year: 1954 }],
    },
    {
        number: 13,
        name: 'Home Economics',
        tagline: 'The kitchen, taken extremely seriously.',
        query: 'collection:"prelinger" AND (subject:"home economics" OR subject:"cooking" OR subject:"housekeeping")',
        fallback: [{ id: 'EatforHe1954', title: 'Eat for Health', year: 1954 }],
    },
    {
        number: 14,
        name: 'Classroom',
        tagline: 'Educational films, shown to children who did not ask.',
        query: 'collection:"educationalfilms" AND mediatype:movies',
        fallback: [
            { id: 'The_Old_Mill', title: 'The Old Mill', year: 1937 },
            { id: 'HealthYo1953', title: 'Health: Your Posture', year: 1953 },
        ],
    },
    {
        number: 15,
        name: 'Life Science',
        tagline: 'Animals, weather, and the natural world.',
        query: 'collection:"educationalfilms" AND (subject:science OR subject:nature OR subject:animals)',
        fallback: [{ id: 'Whales_Dolphins_and_Men', title: 'Whales, Dolphins and Men', year: 1973 }],
    },
    {
        number: 16,
        name: 'Health & Hygiene',
        tagline: 'Wash your hands. There is a film about it.',
        query: 'collection:"educationalfilms" AND (subject:health OR subject:hygiene OR subject:medicine)',
        fallback: [{ id: 'Sleepfor1950', title: 'Sleep for Health', year: 1950 }],
    },
];

export const channelByNumber = (n: number): Channel | undefined =>
    CHANNELS.find((c) => c.number === n);

/* -------------------------------------------------------------------------
 * Fetching
 * ---------------------------------------------------------------------- */

/** How many programmes to pull per channel. Plenty for a session. */
const ROWS = 120;

/**
 * `advancedsearch.php` answers with `access-control-allow-origin: *`, which is
 * the whole reason this can run in the browser with no server of our own. If
 * that ever changes, this is the function that breaks, and the fallback lists
 * above are what keeps the television working while it is fixed.
 */
const SEARCH = 'https://archive.org/advancedsearch.php';

/** One in-memory cache per tab. Channels don't change during a visit. */
const cache = new Map<number, Episode[]>();
const inflight = new Map<number, Promise<Episode[]>>();

const buildUrl = (query: string): string => {
    const p = new URLSearchParams();
    p.set('q', query);
    p.append('fl[]', 'identifier');
    p.append('fl[]', 'title');
    p.append('fl[]', 'year');
    // Downloads-descending puts the watchable, well-transferred tapes first;
    // the Archive's default relevance ordering surfaces a lot of broken rips.
    p.append('sort[]', 'downloads desc');
    p.set('rows', String(ROWS));
    p.set('output', 'json');
    return `${SEARCH}?${p.toString()}`;
};

/**
 * The programmes on a channel, from the Archive or from the baked-in list.
 *
 * Never rejects: a channel that can't reach the network still has something to
 * play, because a television that shows an error dialog is not a television.
 */
export async function fetchEpisodes(channel: Channel): Promise<Episode[]> {
    if (channel.kind === 'testCard') return [];

    const cached = cache.get(channel.number);
    if (cached) return cached;

    const running = inflight.get(channel.number);
    if (running) return running;

    const fallback = channel.fallback ?? [];

    const job = (async (): Promise<Episode[]> => {
        try {
            const res = await fetch(buildUrl(channel.query!));
            if (!res.ok) throw new Error(`archive.org ${res.status}`);
            const body = await res.json();
            const docs: any[] = body?.response?.docs ?? [];

            const episodes: Episode[] = docs
                .filter((d) => d?.identifier && d?.title)
                .map((d) => ({
                    id: String(d.identifier),
                    title: String(d.title).trim(),
                    year: Number(d.year) || undefined,
                }))
                // Second net, not the first — see DENIED above.
                .filter((e) => !DENIED.test(e.title))
                // Nothing after the machine's own era, whatever the query said.
                .filter((e) => !e.year || e.year <= 1999);

            const result = episodes.length ? episodes : fallback;
            cache.set(channel.number, result);
            return result;
        } catch {
            cache.set(channel.number, fallback);
            return fallback;
        } finally {
            inflight.delete(channel.number);
        }
    })();

    inflight.set(channel.number, job);
    return job;
}

/* -------------------------------------------------------------------------
 * The schedule
 * ---------------------------------------------------------------------- */

/**
 * How long a slot runs. Half an hour is what the listings used, and it is
 * short enough that flipping back to a channel later genuinely finds
 * something else on.
 */
export const SLOT_MS = 30 * 60 * 1000;

/**
 * A small deterministic hash. The point is that *what is on* is a pure
 * function of the channel and the clock — not of when you happened to tune in.
 * Two people opening the television at the same moment see the same programme
 * at the same position, the set remembers what it was showing if you close and
 * reopen it, and nothing has to be stored anywhere for either to be true.
 */
const mix = (a: number, b: number): number => {
    let h = (a * 0x9e3779b1) ^ (b * 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 13), 0x297a2d39);
    return (h ^ (h >>> 16)) >>> 0;
};

export interface Airing {
    episode: Episode;
    /** Seconds into the programme, so tuning in lands mid-flow. */
    offsetSeconds: number;
    /** When the current slot ends, for the "up next" countdown. */
    endsAt: number;
}

/**
 * What is on `channel` right now, and how far in.
 *
 * The offset is wrapped at twenty minutes rather than the slot length because
 * most of this material is far shorter than half an hour; a raw slot offset
 * would drop you past the end of a four-minute cartoon almost every time.
 */
export function scheduledFor(
    channel: Channel,
    episodes: Episode[],
    at: number = Date.now()
): Airing | null {
    if (!episodes.length) return null;

    const slot = Math.floor(at / SLOT_MS);
    const index = mix(channel.number, slot) % episodes.length;
    const intoSlot = Math.floor((at % SLOT_MS) / 1000);

    return {
        episode: episodes[index],
        offsetSeconds: intoSlot % (20 * 60),
        endsAt: (slot + 1) * SLOT_MS,
    };
}

/** The next few slots on a channel, for the "coming up" strip. */
export function upcoming(
    channel: Channel,
    episodes: Episode[],
    count: number = 3,
    at: number = Date.now()
): { episode: Episode; startsAt: number }[] {
    if (!episodes.length) return [];
    const slot = Math.floor(at / SLOT_MS);
    return Array.from({ length: count }, (_, i) => {
        const s = slot + i + 1;
        return {
            episode: episodes[mix(channel.number, s) % episodes.length],
            startsAt: s * SLOT_MS,
        };
    });
}

/* -------------------------------------------------------------------------
 * Resolving a programme to something a <video> can play
 * ---------------------------------------------------------------------- */

/**
 * Why this exists rather than an `archive.org/embed/<id>` iframe.
 *
 * The embed is one line and it works, but it costs the two things the
 * television is actually for. It arrives wearing the Archive's own player —
 * a 2020s control bar, in the middle of a Windows 95 desktop — which punctures
 * the conceit the moment anyone moves the mouse. And because it is
 * cross-origin, the parent page cannot touch it: no volume, no seeking, no
 * "the programme ended, roll the next one". A volume knob that does not change
 * the volume is worse than no volume knob.
 *
 * The Archive also serves the raw derivative files, with byte-range support and
 * no player attached, so the set streams those into an ordinary `<video>`
 * instead. Everything the deck and the knobs do is then real.
 *
 * `archive.org/metadata/<id>` answers with `access-control-allow-origin: *`,
 * so the lookup runs in the browser. The file itself 302s to whichever storage
 * node holds it; a `<video>` follows that on its own, and needs no CORS header
 * because nothing here reads its pixels.
 */
const METADATA = 'https://archive.org/metadata';

/**
 * Derivative formats worth playing, best first.
 *
 * The 512Kb MPEG-4 leads deliberately: these are half-hour transfers of
 * twenty-year-old tape, and the "HiRes" derivative of one Computer Chronicles
 * episode is 168 MB. On a television the size of a desktop window, at the
 * resolution a CRT overlay is about to sit on top of, the small one is
 * indistinguishable and starts playing several seconds sooner.
 */
const FORMATS = ['512Kb MPEG4', 'h.264', 'MPEG4', 'h.264 IA', 'WebM', 'Ogg Video'];

const mediaCache = new Map<string, string | null>();

/**
 * A playable URL for one programme, or null if the item has no video
 * derivative the browser can handle (a handful of Archive items are audio or
 * stills only, and the set should skip past those rather than sit on a black
 * screen).
 */
export async function resolveMedia(episode: Episode): Promise<string | null> {
    const cached = mediaCache.get(episode.id);
    if (cached !== undefined) return cached;

    try {
        const res = await fetch(`${METADATA}/${encodeURIComponent(episode.id)}`);
        if (!res.ok) throw new Error(`metadata ${res.status}`);
        const body = await res.json();
        const files: any[] = body?.files ?? [];

        let chosen: string | null = null;
        for (const format of FORMATS) {
            const hit = files.find((f) => f?.format === format && f?.name);
            if (hit) {
                chosen = `https://archive.org/download/${encodeURIComponent(
                    episode.id
                )}/${encodeURIComponent(hit.name)}`;
                break;
            }
        }

        mediaCache.set(episode.id, chosen);
        return chosen;
    } catch {
        mediaCache.set(episode.id, null);
        return null;
    }
}
