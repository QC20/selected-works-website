/**
 * What is on television.
 * ----------------------
 * The dial behind `applications/Television.tsx`. Channels are *queries*, not
 * playlists: each one names a collection on the Internet Archive, and
 * `tools/tv-schedule.js` turns that into hours of programmes, with the file to
 * play and its real running time, in `src/data/tvSchedule.json`. A hand-typed
 * playlist runs out, and a visitor notices the loop within about two minutes.
 *
 * The queries run when that tool runs, not in the visitor's browser. Run live,
 * the result was sorted by download count, which changes daily, so two people
 * on the same channel could be shown different programmes; and nothing in the
 * search result says how long a programme is, which a guide grid needs.
 * `tvSchedule.ts` is what reads the baked file.
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
    /** The Archive identifier — `archive.org/details/<id>` is its page. */
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
    /**
     * Programmes the tool always tries first, ahead of the query's results.
     * Named "fallback" from when they stood in for an unreachable Archive;
     * now they are what keeps a channel on air if its query ever comes back
     * empty.
     */
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

/**
 * The five channels below are a deliberate exception to the "curated
 * collections only" rule at the top of this file, and it is worth being
 * explicit about why.
 *
 * Tom and Jerry, Cartoon Network and the Disney shorts do not exist in any
 * curated collection on the Archive — they are all uploads to the open pool.
 * The mitigation is that these queries are pinned to a *subject*, not to a
 * popularity sort over an open collection, which is what made VHS Vault
 * unusable: asking for "tom and jerry" returns Tom and Jerry. `DENIED` still
 * runs over every title, and the 1999 ceiling still applies.
 *
 * The honest summary: channels 3-16 are curated and safe by construction;
 * 17-21 are filtered rather than curated. If anything ever does slip through,
 * this is the block it came from.
 */
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

    {
        number: 17,
        name: 'Tom & Jerry',
        tagline: 'The cat has never once won and keeps trying.',
        query: 'mediatype:movies AND (title:"tom and jerry" OR subject:"tom and jerry") AND NOT title:"magic ring"',
        fallback: [
            { id: 'TomAndJerry-TheMidnightSnack', title: 'The Midnight Snack', year: 1941 },
        ],
    },
    {
        number: 18,
        name: 'Cartoon Network',
        tagline: 'Bumpers, promos and whatever was on between them.',
        query: 'mediatype:movies AND (title:"cartoon network" OR subject:"cartoon network") AND year:[1992 TO 1999]',
        fallback: [
            { id: 'cartoon-network-1997-promos', title: 'Cartoon Network Promo Break', year: 1997 },
        ],
    },
    {
        number: 19,
        name: 'Disney Classics',
        tagline: 'Silly Symphonies and the early shorts.',
        query: 'mediatype:movies AND (subject:"walt disney" OR title:"silly symphon") AND year:[1920 TO 1960]',
        fallback: [
            { id: 'the_big_bad_wolf', title: 'The Big Bad Wolf' },
            { id: 'SteamboatWillie', title: 'Steamboat Willie', year: 1928 },
        ],
    },
    {
        number: 20,
        name: 'Evening News',
        tagline: 'Nightly bulletins, from wherever the tape came from.',
        query: 'mediatype:movies AND (title:"evening news" OR title:"nightly news" OR title:"news at") AND year:[1985 TO 1999]',
        fallback: [
            { id: 'wews-abc-news-brief-04-07-1991', title: 'WEWS ABC News Brief', year: 1991 },
        ],
    },
    {
        number: 21,
        name: 'Newsreel',
        tagline: 'Before television did the news, this did.',
        query: 'collection:"universal_newsreels" AND mediatype:movies',
        fallback: [
            { id: 'universal_newsreels_1945', title: 'Universal Newsreel', year: 1945 },
        ],
    },
];

export const channelByNumber = (n: number): Channel | undefined =>
    CHANNELS.find((c) => c.number === n);

/* -------------------------------------------------------------------------
 * What `tools/tv-schedule.js` needs from here
 * ---------------------------------------------------------------------- */

/**
 * Derivative formats worth playing, best first.
 *
 * The 512Kb MPEG-4 leads deliberately: these are half-hour transfers of
 * twenty-year-old tape, and the "HiRes" derivative of one Computer Chronicles
 * episode is 168 MB. On a television the size of a desktop window, at the
 * resolution a CRT overlay is about to sit on top of, the small one is
 * indistinguishable and starts playing several seconds sooner.
 */
export const FORMATS = ['512Kb MPEG4', 'h.264', 'MPEG4', 'h.264 IA', 'WebM', 'Ogg Video'];

/** True if a title should never be scheduled. See `DENIED` above. */
export const isDenied = (title: string): boolean => DENIED.test(title);

/** Nothing after the machine's own era, whatever the query said. */
export const LATEST_YEAR = 1999;
