/**
 * The tuner.
 * ----------
 * Everything the television does with video lives here, outside React, because
 * it is a handful of `<video>` elements being juggled against a clock and
 * React's render cycle would only get in the way.
 *
 * The set keeps a small pool of elements ("tapes") and gives each a job:
 *
 *   active      the one on screen.
 *   next        the next file this channel will play, fetched during the
 *               current programme or break so the cut to it is instant. This
 *               is the whole reason breaks exist in `tvSchedule.ts`: an ident
 *               covers the moment the old tape stops and the new one starts.
 *   neighbour   the channels either side of this one, buffered at the point
 *               their broadcast has reached, so CH▲ and CH▼ change picture in
 *               a fraction of a second rather than after a cold start. That is
 *               the single thing that makes surfing feel like surfing.
 *
 * Failures are handled the way a station would rather than the way a web page
 * does. A commercial that will not load becomes a promo card for its length.
 * A programme whose tape has gone is replaced by another programme from the
 * same channel long enough to cover the slot (`understudy`). Only when tape
 * after tape fails — the Archive is down, or the visitor is offline — does
 * the set give up and show PLEASE STAND BY, and it keeps retrying behind it.
 */

import { Channel } from './channels';
import {
    fileUrl,
    nextVideoSegment,
    Segment,
    segmentAt,
    segmentKey,
    understudy,
} from './tvSchedule';

export type DeckPhase =
    /** Switched off. */
    | 'off'
    /** A channel the set draws itself: test card, listings, weather. */
    | 'drawn'
    /** Waiting for the first picture after a tune. */
    | 'tuning'
    | 'playing'
    /** An ident or card is on: nothing is playing from a tape. */
    | 'card'
    /** Repeated failures. PLEASE STAND BY, retrying. */
    | 'standby';

export interface DeckState {
    channel: Channel | null;
    /** What is on screen — the scheduled segment, or its understudy. */
    segment: Segment | null;
    phase: DeckPhase;
    /** Playing, but starved of data. The set shows weak-signal snow. */
    stalled: boolean;
    /** Paused or skipped: behind the broadcast. */
    shifted: boolean;
    paused: boolean;
    /** The browser refused sound without a click; the next click restores it. */
    forcedMute: boolean;
    /** The scheduled tape failed and another programme is standing in. */
    understudy: boolean;
    /** The file on screen, for the 3D room's monitor. */
    mediaUrl: string | null;
}

type PictureInPictureVideo = HTMLVideoElement & {
    requestPictureInPicture?: () => Promise<unknown>;
    webkitPresentationMode?: string;
    webkitSetPresentationMode?: (mode: string) => void;
    webkitSupportsPresentationMode?: (mode: string) => boolean;
};

type PictureInPictureDocument = Document & {
    pictureInPictureEnabled?: boolean;
    pictureInPictureElement?: Element | null;
    exitPictureInPicture?: () => Promise<void>;
};

type Role = 'free' | 'active' | 'next' | 'neighbour';

interface Tape {
    el: HTMLVideoElement;
    role: Role;
    key: string | null;
    url: string | null;
    channel: number | null;
    segment: Segment | null;
    /** When the tape was last positioned, for neighbour refreshes. */
    positionedAt: number;
}

/** On air, next, and three neighbours: either side plus one more ahead. */
const POOL = 5;
/** How long a cold tune may take before the set admits defeat. */
const TUNE_TIMEOUT_MS = 14000;
/**
 * A tune still waiting after this long is asked again, once. The Archive's
 * storage nodes occasionally sit on a request for many seconds; the same file
 * requested afresh usually arrives at once.
 */
const RETRY_MS = 6500;
/** Start fetching the next file this long before it is due. */
const PRELOAD_LEAD_MS = 60000;
/** Re-aim a neighbour at its live point this often. */
const NEIGHBOUR_REFRESH_MS = 30000;
/** A cold tune starts this far ahead of live, to land roughly on time. */
const LOAD_LEAD_S = 1.5;
/** Drift from live tolerated before the set seeks to catch up. */
const MAX_DRIFT_S = 5;

const saveData = (): boolean => {
    const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } })
        .connection;
    return !!c && (c.saveData === true || /(^|-)2g$|^3g$/.test(c.effectiveType ?? ''));
};

export class TvDeck {
    private tapes: Tape[] = [];
    private active: Tape | null = null;
    private channel: Channel | null = null;
    private segment: Segment | null = null;
    private phase: DeckPhase = 'off';
    private shifted = false;
    private paused = false;
    private stalled = false;
    private forcedMute = false;
    private isUnderstudy = false;

    private volume = 0.4;
    private muted = false;

    private tunedAt = 0;
    private retried = false;
    private playingSince = 0;
    private lastProgress = 0;
    private lastTime = -1;
    private lastDriftCheck = 0;
    private lastNeighbourPass = 0;
    private standbyUntil = 0;
    private failures: number[] = [];
    private failedUrls = new Set<string>();
    private neighbours: Channel[] = [];

    private timer = 0;
    private listeners = new Set<(s: DeckState) => void>();
    private lastEmitted = '';
    private disposed = false;

    constructor(private host: HTMLElement) {
        for (let i = 0; i < POOL; i++) this.tapes.push(this.makeTape());
        this.timer = window.setInterval(() => this.tick(), 250);
    }

    /* --- public -------------------------------------------------------- */

    subscribe(fn: (s: DeckState) => void): () => void {
        this.listeners.add(fn);
        fn(this.state());
        return () => {
            this.listeners.delete(fn);
        };
    }

    state(): DeckState {
        return {
            channel: this.channel,
            segment: this.segment,
            phase: this.phase,
            stalled: this.stalled,
            shifted: this.shifted,
            paused: this.paused,
            forcedMute: this.forcedMute,
            understudy: this.isUnderstudy,
            mediaUrl: this.active?.url ?? null,
        };
    }

    /** Whether the current programme can enter PiP in this browser. */
    canPictureInPicture(): boolean {
        const video = this.active?.el as PictureInPictureVideo | undefined;
        if (!video || !this.segment?.programme || this.phase === 'off') return false;

        // Prefer WebKit's capability check when present. On iOS it accurately
        // reflects the current browser container (including Home Screen apps).
        if (typeof video.webkitSupportsPresentationMode === 'function') {
            return (
                video.webkitSupportsPresentationMode('picture-in-picture') &&
                typeof video.webkitSetPresentationMode === 'function'
            );
        }

        const pipDocument = document as PictureInPictureDocument;
        return (
            pipDocument.pictureInPictureEnabled !== false &&
            typeof video.requestPictureInPicture === 'function'
        );
    }

    /** Toggle the active tape into or out of the system picture-in-picture player. */
    async togglePictureInPicture(): Promise<void> {
        const video = this.active?.el as PictureInPictureVideo | undefined;
        if (!video || !this.canPictureInPicture()) return;

        if (typeof video.webkitSetPresentationMode === 'function') {
            video.webkitSetPresentationMode(
                video.webkitPresentationMode === 'picture-in-picture'
                    ? 'inline'
                    : 'picture-in-picture'
            );
            return;
        }

        const pipDocument = document as PictureInPictureDocument;
        if (pipDocument.pictureInPictureElement === video) {
            await pipDocument.exitPictureInPicture?.();
        } else {
            await video.requestPictureInPicture?.();
        }
    }

    /** Seconds into the file on screen, and its length. */
    position(): { at: number; length: number } {
        const s = this.segment;
        if (!s) return { at: 0, length: 0 };
        const length = (s.endsAt - s.startsAt) / 1000;
        const el = this.active?.el;
        if (el && this.phase === 'playing' && Number.isFinite(el.currentTime) && s.programme) {
            // An understudy starts at 0 at `startsAt`; the file position is the truth.
            return { at: el.currentTime, length: s.programme.seconds };
        }
        return { at: Math.max(0, (Date.now() - s.startsAt) / 1000), length };
    }

    /** Join whatever `channel` is broadcasting right now. */
    tune(channel: Channel): void {
        if (this.disposed) return;
        this.channel = channel;
        this.shifted = false;
        this.paused = false;
        this.stalled = false;
        this.isUnderstudy = false;
        this.tunedAt = Date.now();
        this.playingSince = 0;

        if (channel.kind) {
            this.retireActive();
            this.segment = null;
            this.phase = 'drawn';
            this.emit();
            return;
        }
        const seg = segmentAt(channel, Date.now());
        if (!seg) {
            this.retireActive();
            this.segment = null;
            this.phase = 'standby';
            this.emit();
            return;
        }
        this.enter(seg, true);
    }

    /**
     * The channels to keep buffered, most wanted first: the next one in the
     * direction the viewer is surfing, the one behind, then one further on.
     */
    setNeighbours(channels: Channel[]): void {
        this.neighbours = channels.filter((c) => !c.kind);
        this.lastNeighbourPass = 0;
    }

    powerOff(): void {
        for (const t of this.tapes) this.free(t);
        this.active = null;
        this.segment = null;
        this.phase = 'off';
        this.emit();
    }

    setVolume(volume: number, muted: boolean): void {
        this.volume = volume;
        this.muted = muted;
        this.applyVolume();
    }

    /** Call from a click or key press: the browser now allows sound. */
    unlock(): void {
        if (!this.forcedMute) return;
        this.forcedMute = false;
        this.applyVolume();
        this.active?.el.play().catch(() => undefined);
        this.emit();
    }

    togglePause(): void {
        const el = this.active?.el;
        if (!el || !this.segment?.programme) return;
        if (el.paused) {
            this.paused = false;
            this.play(this.active!);
        } else {
            el.pause();
            this.paused = true;
            this.shifted = true;
        }
        this.emit();
    }

    seek(delta: number): void {
        const el = this.active?.el;
        if (!el || !this.segment?.programme || !Number.isFinite(el.duration)) return;
        el.currentTime = Math.max(0, Math.min(el.duration - 0.5, el.currentTime + delta));
        this.shifted = true;
        this.emit();
    }

    goLive(): void {
        if (this.channel) this.tune(this.channel);
    }

    dispose(): void {
        this.disposed = true;
        window.clearInterval(this.timer);
        for (const t of this.tapes) {
            this.free(t);
            t.el.remove();
        }
        this.listeners.clear();
    }

    /* --- tapes ----------------------------------------------------------- */

    private makeTape(): Tape {
        const el = document.createElement('video');
        el.muted = true;
        el.playsInline = true;
        el.setAttribute('playsinline', '');
        el.setAttribute('webkit-playsinline', '');
        el.preload = 'auto';
        el.disablePictureInPicture = false;
        (el as unknown as { disableRemotePlayback: boolean }).disableRemotePlayback = true;
        el.setAttribute('aria-hidden', 'true');
        Object.assign(el.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            background: '#000',
            opacity: '0',
            pointerEvents: 'none',
        });
        this.host.appendChild(el);
        const tape: Tape = { el, role: 'free', key: null, url: null, channel: null, segment: null, positionedAt: 0 };
        el.addEventListener('playing', () => this.onPlaying(tape));
        el.addEventListener('error', () => this.onError(tape));
        el.addEventListener('ended', () => this.onEnded(tape));
        return tape;
    }

    private load(tape: Tape, seg: Segment, channel: Channel, startAt: number, role: Role): void {
        const url = fileUrl(seg.programme!);
        tape.role = role;
        tape.key = segmentKey(channel.number, seg);
        tape.url = url;
        tape.channel = channel.number;
        tape.segment = seg;
        tape.positionedAt = Date.now();
        tape.el.muted = true;
        // A media fragment makes the browser fetch the index and then jump
        // straight to the right byte range, instead of starting at 0 and
        // seeking — one round trip fewer on every mid-programme join.
        tape.el.src = startAt > 0.5 ? `${url}#t=${startAt.toFixed(2)}` : url;
        tape.el.load();
    }

    private free(tape: Tape): void {
        if (tape.role === 'free' && !tape.url) return;
        tape.el.pause();
        tape.el.style.opacity = '0';
        tape.el.removeAttribute('src');
        try {
            tape.el.load();
        } catch {
            /* nothing to release */
        }
        tape.role = 'free';
        tape.key = null;
        tape.url = null;
        tape.channel = null;
        tape.segment = null;
    }

    /** A tape to use: a free one, else the stalest neighbour, else `next`. */
    private claim(keep?: Tape): Tape {
        const free = this.tapes.find((t) => t.role === 'free');
        if (free) return free;
        const neighbour = this.tapes
            .filter((t) => t.role === 'neighbour' && t !== keep)
            .sort((a, b) => a.positionedAt - b.positionedAt)[0];
        const victim = neighbour ?? this.tapes.find((t) => t.role === 'next' && t !== keep) ?? this.tapes.find((t) => t !== this.active && t !== keep)!;
        this.free(victim);
        return victim;
    }

    private play(tape: Tape): void {
        const el = tape.el;
        el.play().catch((err: DOMException) => {
            if (tape !== this.active) return;
            if (err?.name === 'NotAllowedError' && !el.muted) {
                // Autoplay with sound refused. Every video site mutes and
                // retries here; the next click on the set restores sound.
                this.forcedMute = true;
                el.muted = true;
                el.play().catch(() => undefined);
                this.emit();
            }
        });
    }

    private applyVolume(): void {
        for (const t of this.tapes) {
            if (t === this.active) {
                t.el.muted = this.forcedMute || this.muted || this.volume <= 0;
                try {
                    // Read-only on iOS, where the hardware buttons own volume.
                    t.el.volume = Math.max(0, Math.min(1, this.volume));
                } catch {
                    /* ignore */
                }
            } else {
                t.el.muted = true;
            }
        }
    }

    /* --- the broadcast ------------------------------------------------- */

    /** Put `seg` on screen. */
    private enter(seg: Segment, tuned: boolean): void {
        const channel = this.channel!;
        this.segment = seg;
        this.stalled = false;

        if (!seg.programme) {
            this.retireActive();
            this.phase = 'card';
            this.emit();
            this.preloadNext();
            return;
        }

        const now = Date.now();
        const live = (now - seg.startsAt) / 1000;
        const key = segmentKey(channel.number, seg);
        let tape = this.tapes.find((t) => t.key === key && t.role !== 'free');
        if (tape) {
            const el = tape.el;
            if (el.readyState >= 1 && live > 0.75 && Math.abs(el.currentTime - live) > 0.75) {
                el.currentTime = Math.min(live, Math.max(0, (el.duration || live) - 1));
            }
        } else {
            tape = this.claim();
            this.load(tape, seg, channel, live > 1 ? live + LOAD_LEAD_S : 0, 'active');
        }
        this.activate(tape, tuned);
    }

    private activate(tape: Tape, tuned: boolean): void {
        const old = this.active;
        this.active = tape;
        tape.role = 'active';
        for (const t of this.tapes) t.el.style.opacity = t === tape ? '1' : '0';
        if (old && old !== tape) this.retire(old);
        this.applyVolume();
        const ready = tape.el.readyState >= 3 && !tape.el.seeking;
        // Already running (LIVE pressed on the channel being watched): a
        // playing element fires no new 'playing' event to wait for.
        const running = ready && !tape.el.paused;
        this.phase = (ready && !tuned) || running ? 'playing' : 'tuning';
        // The tune clock restarts whenever the set starts waiting — including
        // a scheduled cut to a tape that is not ready yet, which would
        // otherwise be measured from the viewer's last channel change.
        if (tuned || this.phase === 'tuning') {
            this.tunedAt = Date.now();
            this.retried = false;
        }
        this.lastProgress = Date.now();
        this.lastTime = -1;
        this.play(tape);
        this.emit();
    }

    /** Take the active tape off screen, keeping it as a neighbour if useful. */
    private retireActive(): void {
        if (!this.active) return;
        const old = this.active;
        this.active = null;
        old.el.style.opacity = '0';
        this.retire(old);
    }

    private retire(tape: Tape): void {
        tape.el.pause();
        tape.el.muted = true;
        tape.el.style.opacity = '0';
        const stillOn = tape.segment && Date.now() < tape.segment.endsAt - 5000;
        const isNeighbour = this.neighbours.some((c) => c.number === tape.channel);
        if (stillOn && isNeighbour && tape.channel !== this.channel?.number) {
            tape.role = 'neighbour';
            tape.positionedAt = Date.now();
        } else {
            this.free(tape);
        }
    }

    private preloadNext(): void {
        const channel = this.channel;
        const seg = this.segment;
        if (!channel || !seg || this.shifted || channel.kind) return;
        const next = nextVideoSegment(channel, seg);
        if (!next || next.startsAt - Date.now() > PRELOAD_LEAD_MS) return;
        const key = segmentKey(channel.number, next);
        if (this.tapes.some((t) => t.key === key)) return;
        // A stale `next` from an earlier segment makes way.
        for (const t of this.tapes) if (t.role === 'next') this.free(t);
        const tape = this.claim(this.active ?? undefined);
        this.load(tape, next, channel, 0, 'next');
    }

    private maintainNeighbours(): void {
        if (saveData() || document.visibilityState === 'hidden') return;
        const now = Date.now();
        const wanted = new Set(this.neighbours.map((c) => c.number));
        for (const t of this.tapes) {
            if (t.role === 'neighbour' && !wanted.has(t.channel!)) this.free(t);
        }
        for (const c of this.neighbours) {
            const seg = segmentAt(c, now + 3000);
            if (!seg?.programme) continue;
            const key = segmentKey(c.number, seg);
            const have = this.tapes.find((t) => t.key === key && t.role === 'neighbour');
            const live = (now + 3000 - seg.startsAt) / 1000;
            if (have) {
                if (now - have.positionedAt > NEIGHBOUR_REFRESH_MS && have.el.readyState >= 1) {
                    have.el.currentTime = Math.min(live, (have.el.duration || live) - 1);
                    have.positionedAt = now;
                }
                continue;
            }
            for (const t of this.tapes) if (t.role === 'neighbour' && t.channel === c.number) this.free(t);
            // Never evict this channel's own next file for a neighbour.
            const free = this.tapes.find((t) => t.role === 'free');
            if (!free) continue;
            this.load(free, seg, c, live, 'neighbour');
        }
    }

    private tick(): void {
        if (this.disposed) return;
        const now = Date.now();
        const channel = this.channel;

        if (this.phase === 'standby') {
            if (now >= this.standbyUntil && channel) this.tune(channel);
            return;
        }
        if (this.phase === 'off' || !channel) return;

        if (this.phase !== 'drawn') {
            const seg = this.segment;
            // The broadcast moves on whether or not anyone is watching. A
            // viewer who has paused or skipped keeps their tape until it ends.
            if (!this.shifted && seg && now >= seg.endsAt) {
                const next = segmentAt(channel, now);
                if (next) this.enter(next, false);
            }
            if (!this.shifted) this.preloadNext();

            if (this.phase === 'tuning') {
                // A seek within buffered data can finish without a 'playing'
                // event; a clock that is moving is proof enough.
                const el = this.active?.el;
                if (el && !el.paused && el.readyState >= 3 && el.currentTime !== this.lastTime && this.lastTime >= 0) {
                    this.onPlaying(this.active!);
                } else if (el) {
                    this.lastTime = el.currentTime;
                }
                if (this.phase === 'tuning' && !this.retried && now - this.tunedAt > RETRY_MS) {
                    this.retried = true;
                    this.reload(false);
                }
                if (this.phase === 'tuning' && now - this.tunedAt > TUNE_TIMEOUT_MS) {
                    this.fail();
                    return;
                }
            }
            this.watchPlayback(now);
        }

        // Neighbours load alongside the tune, a beat behind it. A cold tune
        // is mostly round trips to the Archive rather than bandwidth, so they
        // barely slow it down, and a surfer pressing CH▲ every second or two
        // finds the next channel already buffered.
        if (now - this.lastNeighbourPass > 1000 && now - this.tunedAt > 300) {
            this.lastNeighbourPass = now;
            this.maintainNeighbours();
        }
        this.emit();
    }

    /** Stall and drift detection while a tape is on. */
    private watchPlayback(now: number): void {
        const el = this.active?.el;
        const seg = this.segment;
        if (!el || this.phase !== 'playing' || this.paused || !seg?.programme) {
            this.stalled = false;
            return;
        }
        if (el.currentTime !== this.lastTime) {
            this.lastTime = el.currentTime;
            this.lastProgress = now;
            this.stalled = false;
        } else if (now - this.lastProgress > 1500) {
            this.stalled = true;
            // A connection that has hung outright does not recover by itself.
            if (now - this.lastProgress > 15000) {
                this.lastProgress = now;
                this.kick();
                return;
            }
        }
        if (!this.shifted && !this.isUnderstudy && now - this.lastDriftCheck > 5000) {
            this.lastDriftCheck = now;
            const live = (now - seg.startsAt) / 1000;
            if (Math.abs(el.currentTime - live) > MAX_DRIFT_S && live < (el.duration || 0) - 2) {
                el.currentTime = live;
            }
        }
    }

    /** Reload the active tape at the live point: a hung stream, or a slow tune. */
    private reload(restartClock: boolean): void {
        const tape = this.active;
        const seg = this.segment;
        if (!tape || !seg?.programme || !this.channel) return;
        const live = this.isUnderstudy ? tape.el.currentTime : (Date.now() - seg.startsAt) / 1000;
        this.load(tape, seg, this.channel, live > 1 ? live + LOAD_LEAD_S : 0, 'active');
        tape.el.style.opacity = '1';
        this.phase = 'tuning';
        if (restartClock) this.tunedAt = Date.now();
        this.lastTime = -1;
        this.play(tape);
    }

    private kick(): void {
        this.reload(true);
    }

    private fail(): void {
        const now = Date.now();
        const channel = this.channel;
        const seg = this.segment;
        if (this.active) {
            if (this.active.url) this.failedUrls.add(this.active.url);
            this.free(this.active);
            this.active = null;
        }
        this.failures = [...this.failures.filter((t) => now - t < 90000), now];
        if (!channel || !seg) return;

        if (this.failures.length >= 3) {
            // Not one tape: the Archive, or the connection. Stand by and retry.
            this.phase = 'standby';
            this.standbyUntil = now + 20000;
            this.failures = [];
            this.emit();
            return;
        }
        if (seg.kind === 'ad') {
            this.segment = { ...seg, kind: 'promo', programme: undefined };
            this.phase = 'card';
            this.emit();
            return;
        }
        if (seg.programme) {
            const sub = understudy(channel, seg.programme, (seg.endsAt - now) / 1000, this.failedUrls);
            if (sub) {
                const stand: Segment = { ...seg, programme: sub, startsAt: now };
                this.isUnderstudy = true;
                this.segment = stand;
                const tape = this.claim();
                this.load(tape, stand, channel, 0, 'active');
                this.activate(tape, true);
                return;
            }
        }
        this.phase = 'standby';
        this.standbyUntil = now + 20000;
        this.emit();
    }

    /* --- element events ------------------------------------------------ */

    private onPlaying(tape: Tape): void {
        if (tape !== this.active) return;
        if (this.phase === 'tuning') {
            this.phase = 'playing';
            this.playingSince = Date.now();
            this.failures = [];
        }
        this.stalled = false;
        this.lastProgress = Date.now();
        this.emit();
    }

    private onError(tape: Tape): void {
        if (!tape.url) return;
        if (tape === this.active) {
            this.fail();
        } else {
            this.failedUrls.add(tape.url);
            this.free(tape);
        }
    }

    private onEnded(tape: Tape): void {
        if (tape !== this.active) return;
        // The viewer had fallen behind: rejoin the broadcast where it is now.
        if (this.shifted) this.goLive();
    }

    private emit(): void {
        const s = this.state();
        const sig = [
            s.channel?.number,
            s.segment?.startsAt,
            s.segment?.kind,
            s.segment?.programme?.file,
            s.phase,
            s.stalled,
            s.shifted,
            s.paused,
            s.forcedMute,
            s.understudy,
            s.mediaUrl,
        ].join('|');
        if (sig === this.lastEmitted) return;
        this.lastEmitted = sig;
        this.listeners.forEach((fn) => fn(s));
    }
}
