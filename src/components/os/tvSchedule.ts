/**
 * What is on, and when.
 * ---------------------
 * Every channel is a loop of programmes, laid end to end at their real
 * lengths from one fixed moment, `EPOCH`. Where a channel is now is a pure
 * function of the clock: two people tuning to channel 8 at the same second
 * get the same programme at the same frame, the guide can say what starts at
 * 22:30 tonight, and none of it needs a server — only the clock and
 * `src/data/tvSchedule.json`, which `tools/tv-schedule.js` writes.
 *
 * The first version picked a programme per half-hour slot from a list the
 * browser fetched live and joined it at "minutes into the slot, wrapped at
 * twenty". It looked like broadcast television without being it: the list
 * order drifted with the Archive's download counts, the join point had
 * nothing to do with the programme's length, and when a programme ended the
 * set rolled whatever came next in the list rather than what was scheduled.
 */

import schedule from '../../data/tvSchedule.json';
import { Channel } from './channels';

/**
 * Where every loop starts. Changing it reshuffles what is on everywhere at
 * once, and there is no reason ever to do that.
 */
const EPOCH = Date.UTC(2026, 9, 1);

/** One programme, as baked: the file to play and how long it runs. */
export interface Programme {
    /** The Archive identifier. */
    id: string;
    title: string;
    year?: number;
    /** File name inside the item, as `archive.org/download/<id>/` serves it. */
    file: string;
    seconds: number;
}

/** One programme at one time. Both ends are epoch milliseconds. */
export interface Slot {
    programme: Programme;
    startsAt: number;
    endsAt: number;
}

type Row = [string, string, number | null, string, number];

interface Lineup {
    programmes: Programme[];
    /** Seconds from the start of the loop to each programme. */
    starts: number[];
    /** The whole loop, in seconds. */
    cycle: number;
}

// JSON imports type as loose arrays, not tuples; the tool writes exactly this.
const ROWS = (schedule as unknown as { channels: Record<string, Row[]> }).channels;
const lineups = new Map<number, Lineup | null>();

const lineupFor = (channel: Channel): Lineup | null => {
    const known = lineups.get(channel.number);
    if (known !== undefined) return known;

    const rows = ROWS[String(channel.number)] ?? [];
    const programmes = rows.map(([id, title, year, file, seconds]) => ({
        id,
        title,
        year: year ?? undefined,
        file,
        seconds,
    }));
    const starts: number[] = [];
    let cycle = 0;
    for (const p of programmes) {
        starts.push(cycle);
        cycle += p.seconds;
    }

    const lineup = programmes.length && cycle > 0 ? { programmes, starts, cycle } : null;
    lineups.set(channel.number, lineup);
    return lineup;
};

/**
 * What is on `channel` at `at`, or null for a channel with nothing scheduled
 * (the test card, or one the tool found nothing playable for).
 */
export function onAir(channel: Channel, at: number = Date.now()): Slot | null {
    const lineup = lineupFor(channel);
    if (!lineup) return null;

    const since = (at - EPOCH) / 1000;
    const loopStart = Math.floor(since / lineup.cycle) * lineup.cycle;
    const into = since - loopStart;

    // The last programme starting at or before `into`.
    const { starts } = lineup;
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= into) lo = mid;
        else hi = mid - 1;
    }

    const programme = lineup.programmes[lo];
    const startsAt = EPOCH + (loopStart + starts[lo]) * 1000;
    return { programme, startsAt, endsAt: startsAt + programme.seconds * 1000 };
}

/** Every programme on `channel` that overlaps `[from, to)`, in order. */
export function listings(channel: Channel, from: number, to: number): Slot[] {
    const out: Slot[] = [];
    let slot = onAir(channel, from);
    // The cap is a guard against a zero-length row, not a real limit: the
    // shortest programme the tool keeps is twenty seconds.
    while (slot && slot.startsAt < to && out.length < 400) {
        out.push(slot);
        slot = onAir(channel, slot.endsAt);
    }
    return out;
}

/**
 * The file itself, for a plain `<video>`, rather than an
 * `archive.org/embed/<id>` iframe.
 *
 * The embed is one line and it works, but it costs the two things the
 * television is actually for. It arrives wearing the Archive's own player —
 * a 2020s control bar, in the middle of a Windows 95 desktop — which punctures
 * the conceit the moment anyone moves the mouse. And because it is
 * cross-origin, the parent page cannot touch it: no volume, no seeking, no
 * "the programme ended, roll the next one". A volume knob that does not change
 * the volume is worse than no volume knob.
 *
 * The URL 302s to whichever storage node holds the file; a `<video>` follows
 * that on its own, and needs no CORS header because nothing here reads its
 * pixels. The tool already chose the file, so tuning costs no lookup at all.
 */
export const fileUrl = (p: Programme): string =>
    `https://archive.org/download/${encodeURIComponent(p.id)}/${p.file
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;

/** The tape's own page on the Archive, where its uploader is credited. */
export const detailsUrl = (p: Programme): string =>
    `https://archive.org/details/${encodeURIComponent(p.id)}`;
