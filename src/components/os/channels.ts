/**
 * What is on television.
 * ----------------------
 * The dial behind `applications/Television.tsx`: a 1995 cable package,
 * programmed entirely from the Internet Archive's curated collections.
 *
 * This file is channel *identity* — the number on the dial, the name in the
 * guide, how the channel is laid out in time and what fills its breaks. Which
 * tapes each channel plays lives in `tools/tv-lineup.js`, and
 * `tools/tv-schedule.js` turns that into `src/data/tvSchedule.json`. After
 * editing a channel's `slotMinutes` or `gap` here, run the tool again: both
 * shape how programmes were packed into blocks.
 *
 * Three rules, all learned the hard way:
 *
 *   Curated, named tapes only.  The first two versions defined channels as
 *   Archive *searches*. Searches drift, and the open-upload pool they reach is
 *   unmoderated: they put a Quran recitation on "News Desk", Arabic dubs on
 *   Computer Chronicles and a Spanish dub of a 2000s cartoon on "Cartoon
 *   Network". Every tape is now named in the lineup by hand.
 *
 *   Period only.  Nothing later than 1999 — the bake enforces it. A 2015
 *   upload on a Windows 95 desktop is the machine caught lying.
 *
 *   No portfolio content.  The television is for wasting time, not a second
 *   route into the CV. Jonas' own work has its own windows.
 */

/** How the time a block has left over is spent. */
export type BreakStyle =
    /** A break after every programme: the right shape for half-hour shows. */
    | 'between'
    /** Items run back to back with only `gap` between them, and one break
     *  closes the block: newsreels, Soundies, commercial reels. */
    | 'end';

export interface Channel {
    /** Dial position. Shown on the OSD, the bug and the guide. */
    number: number;
    name: string;
    /** Four characters at most, for the corner bug and the idents. */
    call: string;
    /** One line, in the register of a listings magazine. */
    tagline: string;
    /** The ident's colour. Every channel looks different for a second. */
    colour: string;
    /**
     * Drawn by the set rather than played from a tape. The test card and the
     * listings channel are rendered locally; the weather channel is the
     * WeatherStar 4000+ recreation in a frame.
     */
    kind?: 'testCard' | 'listings' | 'weather';
    /** Blocks start on multiples of this. Half an hour unless stated. */
    slotMinutes?: number;
    /** Seconds reserved after each programme, at least. Default 20. */
    gap?: number;
    breaks?: BreakStyle;
    /** Whether breaks carry commercials. Public television's did not. */
    ads?: boolean;
}

/**
 * THE TEST CARD — channel 2, drawn locally, off the air for good. It is the
 * honest bottom of the dial, and the thing the set shows when a tape cannot
 * be reached at all.
 */
export const TEST_CARD_CHANNEL: Channel = {
    number: 2,
    name: 'Test Card',
    call: 'TEST',
    tagline: 'Transmission resumes at 06:00.',
    colour: '#808080',
    kind: 'testCard',
};

export const CHANNELS: Channel[] = [
    TEST_CARD_CHANNEL,
    {
        number: 3,
        name: 'Listings',
        call: 'NVL',
        tagline: "What's on, scrolling past, all day.",
        colour: '#1a3ca8',
        kind: 'listings',
    },
    {
        number: 4,
        name: 'Ad Break',
        call: 'ADS',
        tagline: 'Wall-to-wall commercials, 1948 to 1999.',
        colour: '#d2381e',
        gap: 1,
        breaks: 'end',
        ads: false,
    },
    {
        number: 5,
        name: 'Cartoon Carnival',
        call: 'TOON',
        tagline: 'Popeye, Betty Boop, Superman and Felix.',
        colour: '#f0a020',
        gap: 8,
    },
    {
        number: 6,
        name: 'Slapstick',
        call: 'SLAP',
        tagline: 'Chaplin, Keaton, Lloyd. Things fall over.',
        colour: '#b8862e',
        gap: 10,
    },
    {
        number: 7,
        name: 'Rerun Theatre',
        call: 'RRN',
        tagline: 'Ozzie, Harriet, Groucho and the Lone Ranger.',
        colour: '#2f8f6a',
    },
    {
        number: 8,
        name: 'Computer Chronicles',
        call: 'PTV8',
        tagline: 'Stewart Cheifet explains the future. It is beige.',
        colour: '#2a6fd6',
        // Public television: station breaks, no commercials.
        ads: false,
    },
    {
        number: 9,
        name: 'Newsreel',
        call: 'NEWS',
        tagline: 'The week in pictures, 1929 to 1967.',
        colour: '#4a4a4a',
        gap: 3,
        breaks: 'end',
    },
    {
        number: 10,
        name: 'Mission Control',
        call: 'NASA',
        tagline: 'Mercury, Apollo, Skylab and the Shuttle.',
        colour: '#c03030',
        ads: false,
    },
    {
        number: 11,
        name: 'Atomic Age',
        call: 'ATOM',
        tagline: 'Duck, cover, and the peaceful atom.',
        colour: '#7aa63a',
        gap: 15,
    },
    {
        number: 12,
        name: 'Social Guidance',
        call: 'SGC',
        tagline: 'How to behave, according to a filmstrip.',
        colour: '#8a5ab0',
        gap: 15,
    },
    {
        number: 13,
        name: 'Industry on Parade',
        call: 'IND',
        tagline: 'Things being manufactured, at length.',
        colour: '#5a6e8a',
        gap: 15,
    },
    {
        number: 14,
        name: 'The Open Road',
        call: 'ROAD',
        tagline: 'Driver education, and the consequences of ignoring it.',
        colour: '#c86428',
        gap: 15,
    },
    {
        number: 15,
        name: 'Jukebox',
        call: 'JBX',
        tagline: 'Soundies: the music videos of 1942.',
        colour: '#d23c8c',
        gap: 4,
        breaks: 'end',
    },
    {
        number: 16,
        name: 'The Late Show',
        call: 'LATE',
        tagline: 'Old movies, with the commercials.',
        colour: '#3a2a6a',
    },
    {
        number: 17,
        name: 'Weather Star',
        call: 'WX',
        tagline: 'The local forecast, every few minutes.',
        colour: '#2a4ab8',
        kind: 'weather',
    },
];

export const channelByNumber = (n: number): Channel | undefined =>
    CHANNELS.find((c) => c.number === n);

/** The channel a set switches on to the first time. */
export const DEFAULT_CHANNEL = 8;

/**
 * The weather channel is the WeatherStar 4000+, Matt Walsh's recreation of
 * The Weather Channel's 1990s local forecast (github.com/netbymatt/ws4kp,
 * MIT). It reads the US National Weather Service, so it can only forecast US
 * places; Redmond, Washington is where this machine's operating system was
 * written. Kiosk mode hides its own settings.
 */
export const WEATHER_URL =
    'https://weatherstar.netbymatt.com/?kiosk=true&latLonQuery=Redmond%2C+WA%2C+USA&latLon=%7B%22lat%22%3A47.674%2C%22lon%22%3A-122.1215%7D&units=us&scanLines=false&mediaVolume=0';
