/**
 * What is on, and when.
 * ---------------------
 * Every channel's time is cut into slots (half an hour, unless the channel
 * says otherwise) counted from one fixed moment, `EPOCH`. `tools/tv-schedule.js`
 * packed the channel's programmes into blocks that each fill whole slots, and
 * the blocks repeat in a loop. So what is on channel 8 at 21:14 is a pure
 * function of the clock: everyone tuned to it sees the same frame, the guide
 * can say what starts at 22:30, and no server is involved.
 *
 * Every block starts on a slot boundary, which is what makes the guide read
 * like a listings magazine (8:00 Computer Chronicles, 8:30 Computer
 * Chronicles) instead of a playlist (7:43, 8:11). The time a block has left
 * over becomes its breaks, and a break is built here, deterministically, from
 * the block's position: a station ident, commercials from the shared reel if
 * the channel carries them, and a card saying what is up next. That is the
 * structure FieldStation42, dizqueTV and every real station share, and it is
 * the difference between television and a playlist with static on it.
 *
 * Breaks are also what hide the loading. While an ident plays, the next
 * programme's file is already being fetched; see `tvDeck.ts`.
 */

import schedule from '../../data/tvSchedule.json';
import { Channel } from './channels';

/** Where every loop starts: midnight UTC, so slots land on :00 and :30 everywhere that matters. */
const EPOCH = Date.UTC(2026, 9, 1);

export interface Programme {
    /** The Archive identifier. */
    id: string;
    /** The show this is an episode of, when it is one. */
    series: string | null;
    title: string;
    year?: number;
    /** File name inside the item, as `archive.org/download/<id>/` serves it. */
    file: string;
    seconds: number;
}

export type SegmentKind =
    /** A programme, from its tape. */
    | 'programme'
    /** A commercial, from the shared reel. */
    | 'ad'
    /** The channel's own ident: logo and jingle. */
    | 'ident'
    /** "Up next" — what the break is leading to. */
    | 'next'
    /** "Coming up on 8" — the next few listings, for long breaks with no ads. */
    | 'promo'
    /** A beat of black between two items that run back to back. */
    | 'cut';

export interface Segment {
    kind: SegmentKind;
    /** Epoch milliseconds. */
    startsAt: number;
    endsAt: number;
    /** Set for 'programme' and 'ad'. */
    programme?: Programme;
    /** For cards: the programme the break leads into, and when. */
    upNext?: { programme: Programme; startsAt: number };
    /** The block this segment belongs to. */
    block: Block;
}

/** One airing of one packed block. */
export interface Block {
    channel: number;
    /** Global slot index of the block's first slot — its identity. */
    slot: number;
    startsAt: number;
    endsAt: number;
    programmes: Programme[];
}

type ProgrammeRow = [string, string | null, string, number | null, string, number];
type AdRow = [string, string, number | null, string, number];

interface Lineup {
    slotMs: number;
    programmes: Programme[];
    /** [slots, ...programme indices] */
    blocks: number[][];
    /** Slot offset of each block within the loop. */
    offsets: number[];
    /** The loop, in slots. */
    cycle: number;
}

const DATA = schedule as unknown as {
    ads: AdRow[];
    channels: Record<string, { slot: number; programmes: ProgrammeRow[]; blocks: number[][] }>;
};

const ADS: Programme[] = DATA.ads.map(([id, title, year, file, seconds]) => ({
    id,
    series: null,
    title,
    year: year ?? undefined,
    file,
    seconds,
}));

const lineups = new Map<number, Lineup | null>();

const lineupFor = (channel: Channel): Lineup | null => {
    const known = lineups.get(channel.number);
    if (known !== undefined) return known;
    const raw = channel.kind ? undefined : DATA.channels[String(channel.number)];
    let lineup: Lineup | null = null;
    if (raw && raw.blocks.length) {
        const offsets: number[] = [];
        let cycle = 0;
        for (const b of raw.blocks) {
            offsets.push(cycle);
            cycle += b[0];
        }
        lineup = {
            slotMs: raw.slot * 60 * 1000,
            programmes: raw.programmes.map(([id, series, title, year, file, seconds]) => ({
                id,
                series,
                title,
                year: year ?? undefined,
                file,
                seconds,
            })),
            blocks: raw.blocks,
            offsets,
            cycle,
        };
    }
    lineups.set(channel.number, lineup);
    return lineup;
};

/** True if the channel has a schedule at all (drawn channels do not). */
export const isScheduled = (channel: Channel): boolean => !!lineupFor(channel);

/* -------------------------------------------------------------------------
 * Blocks
 * ---------------------------------------------------------------------- */

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** The block airing on `channel` at `at`. */
export function blockAt(channel: Channel, at: number = Date.now()): Block | null {
    const lineup = lineupFor(channel);
    if (!lineup) return null;
    const slot = Math.floor((at - EPOCH) / lineup.slotMs);
    const into = mod(slot, lineup.cycle);
    // The last block whose offset is at or before `into`.
    const { offsets } = lineup;
    let lo = 0;
    let hi = offsets.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (offsets[mid] <= into) lo = mid;
        else hi = mid - 1;
    }
    const raw = lineup.blocks[lo];
    const first = slot - (into - offsets[lo]);
    const startsAt = EPOCH + first * lineup.slotMs;
    return {
        channel: channel.number,
        slot: first,
        startsAt,
        endsAt: startsAt + raw[0] * lineup.slotMs,
        programmes: raw.slice(1).map((i) => lineup.programmes[i]),
    };
}

/** Every block on `channel` that overlaps `[from, to)`, in order. */
export function listings(channel: Channel, from: number, to: number): Block[] {
    const out: Block[] = [];
    let block = blockAt(channel, from);
    while (block && block.startsAt < to && out.length < 200) {
        out.push(block);
        block = blockAt(channel, block.endsAt);
    }
    return out;
}

/** The `n` blocks after the one on air at `at`. */
export const upcoming = (channel: Channel, at: number, n: number): Block[] => {
    const out: Block[] = [];
    let block = blockAt(channel, at);
    while (block && out.length < n) {
        block = blockAt(channel, block.endsAt);
        if (block) out.push(block);
    }
    return out;
};

/**
 * What a block is called in a listing. One episode reads "Computer
 * Chronicles / Hypercard"; a block of shorts reads as the show it is part of
 * with the shorts listed underneath, the way a newspaper grid did it.
 */
export function blockLabel(block: Block, channel: Channel): { title: string; detail: string } {
    const [p, ...rest] = block.programmes;
    if (!p) return { title: channel.name, detail: '' };
    if (!rest.length) {
        if (p.series) return { title: p.series, detail: p.title };
        return { title: p.title, detail: p.year ? String(p.year) : '' };
    }
    const shared = block.programmes.every((q) => q.series && q.series === p.series);
    return {
        title: shared && p.series ? p.series : channel.name,
        detail: block.programmes.map((q) => q.title).join(' · '),
    };
}

/** What a single programme is called on the OSD. */
export const programmeLabel = (p: Programme): string =>
    p.series && p.series !== p.title ? `${p.series}: ${p.title}` : p.title;

/* -------------------------------------------------------------------------
 * Segments: a block, laid out second by second
 * ---------------------------------------------------------------------- */

/** mulberry32, so every viewer picks the same commercials. */
const rng = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const IDENT_MS = 4000;
const NEXT_MS = 8000;

const cache = new Map<string, Segment[]>();

/**
 * One break of `ms` milliseconds starting at `at`, leading into `upNext`.
 * Short breaks are a cut or a card; long ones are an ident, commercials and
 * an "up next" card, with a promo card absorbing whatever the commercials
 * could not fill.
 */
function breakSegments(
    channel: Channel,
    block: Block,
    at: number,
    ms: number,
    upNext: { programme: Programme; startsAt: number } | undefined,
    seed: number
): Segment[] {
    const out: Segment[] = [];
    const push = (kind: SegmentKind, length: number, programme?: Programme) => {
        if (length <= 0) return;
        const startsAt = out.length ? out[out.length - 1].endsAt : at;
        out.push({ kind, startsAt, endsAt: startsAt + length, programme, upNext, block });
    };

    if (ms < 2500) {
        push('cut', ms);
        return out;
    }
    if (ms < 11000) {
        push('next', ms);
        return out;
    }

    push('ident', IDENT_MS);
    let left = ms - IDENT_MS - NEXT_MS;
    if (channel.ads !== false && ADS.length && left >= 12000) {
        const rand = rng(seed);
        const used = new Set<number>();
        for (let tries = 0; tries < 60 && left >= 12000; tries++) {
            const i = Math.floor(rand() * ADS.length);
            const ad = ADS[i];
            if (used.has(i) || ad.seconds * 1000 > left) continue;
            used.add(i);
            push('ad', ad.seconds * 1000, ad);
            left -= ad.seconds * 1000;
        }
    }
    // What the commercials could not fill: a promo if it is long enough to
    // read, otherwise a longer "up next".
    if (left >= 9000) {
        push('promo', left);
        left = 0;
    }
    push('next', NEXT_MS + left);
    return out;
}

/** Every segment of one block, in order, with no gaps. */
export function segmentsOf(block: Block, channel: Channel): Segment[] {
    const key = `${block.channel}:${block.slot}`;
    const hit = cache.get(key);
    if (hit) return hit;

    const out: Segment[] = [];
    const total = block.endsAt - block.startsAt;
    const content = block.programmes.reduce((s, p) => s + p.seconds * 1000, 0);
    const spare = Math.max(0, total - content);
    const n = block.programmes.length;
    const gapMs = (channel.gap ?? 20) * 1000;

    // How the spare time is shared out between the breaks.
    const breaks: number[] =
        channel.breaks === 'end'
            ? block.programmes.map((_, i) =>
                  i < n - 1 ? Math.min(gapMs, spare / n) : spare - Math.min(gapMs, spare / n) * (n - 1)
              )
            : block.programmes.map((_, i) =>
                  i < n - 1 ? Math.floor(spare / n) : spare - Math.floor(spare / n) * (n - 1)
              );

    const following = blockAt(channel, block.endsAt);
    let t = block.startsAt;
    block.programmes.forEach((p, i) => {
        out.push({ kind: 'programme', startsAt: t, endsAt: t + p.seconds * 1000, programme: p, block });
        t += p.seconds * 1000;
        const nextProgramme = i < n - 1 ? block.programmes[i + 1] : following?.programmes[0];
        const nextAt = t + breaks[i];
        const upNext = nextProgramme ? { programme: nextProgramme, startsAt: nextAt } : undefined;
        out.push(...breakSegments(channel, block, t, breaks[i], upNext, block.slot * 31 + i * 7 + channel.number));
        t = nextAt;
    });
    // Rounding: the last segment always ends exactly where the block does.
    if (out.length) out[out.length - 1].endsAt = block.endsAt;

    if (cache.size > 300) cache.clear();
    cache.set(key, out);
    return out;
}

/** The segment on air on `channel` at `at`, or null for a drawn channel. */
export function segmentAt(channel: Channel, at: number = Date.now()): Segment | null {
    const block = blockAt(channel, at);
    if (!block) return null;
    const list = segmentsOf(block, channel);
    let lo = 0;
    let hi = list.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (list[mid].startsAt <= at) lo = mid;
        else hi = mid - 1;
    }
    return list[lo] ?? null;
}

/** The first segment after `segment` that plays a file, looking a few blocks ahead. */
export function nextVideoSegment(channel: Channel, segment: Segment): Segment | null {
    let at = segment.endsAt;
    for (let i = 0; i < 60; i++) {
        const s = segmentAt(channel, at);
        if (!s) return null;
        if (s.programme) return s;
        at = s.endsAt;
    }
    return null;
}

/**
 * A stand-in for a programme whose tape has gone: another programme from the
 * same channel long enough to cover the time that is left. Chosen the same way
 * for every viewer, so a substitution is still a broadcast.
 */
export function understudy(channel: Channel, programme: Programme, needSeconds: number, avoid: Set<string>): Programme | null {
    const lineup = lineupFor(channel);
    if (!lineup) return null;
    const list = lineup.programmes;
    const start = Math.max(0, list.findIndex((p) => p.id === programme.id && p.file === programme.file));
    for (let k = 1; k < list.length; k++) {
        const p = list[(start + k) % list.length];
        if (avoid.has(fileUrl(p))) continue;
        if (p.seconds >= needSeconds) return p;
    }
    return null;
}

/** A stable key for a segment, so a preloaded tape can be recognised. */
export const segmentKey = (channel: number, s: Segment): string =>
    `${channel}:${s.startsAt}:${s.programme?.id ?? s.kind}`;

/* -------------------------------------------------------------------------
 * The Archive
 * ---------------------------------------------------------------------- */

/**
 * The file itself, for a plain `<video>`, rather than an `archive.org/embed`
 * iframe: the embed brings a 2020s player bar into a 1995 room, and as a
 * cross-origin frame it cannot be given a volume, a seek or an "ended". The
 * URL 302s to whichever storage node holds the file; a `<video>` follows
 * that on its own and needs no CORS, because nothing reads its pixels.
 */
export const fileUrl = (p: Programme): string =>
    `https://archive.org/download/${encodeURIComponent(p.id)}/${p.file
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;

/** The tape's own page on the Archive, where its uploader is credited. */
export const detailsUrl = (p: Programme): string =>
    `https://archive.org/details/${encodeURIComponent(p.id)}`;

/** The item's thumbnail, for the listings channel's promo panel. */
export const thumbUrl = (p: Programme): string =>
    `https://archive.org/services/img/${encodeURIComponent(p.id)}`;
