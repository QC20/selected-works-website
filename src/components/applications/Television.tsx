import React, { useCallback, useEffect, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import CrtScreen from '../os/CrtScreen';
import StaticBurst from '../os/StaticBurst';
import { CRT_TELEVISION } from '../os/crt';
import TvGuide from '../os/TvGuide';
import { CHANNELS, Channel } from '../os/channels';
import { detailsUrl, fileUrl, onAir, Slot } from '../os/tvSchedule';
import { clearTvState, setTvState } from '../os/tvState';
import { playClick } from '../os/sounds';

/**
 * The television.
 * ---------------
 * A set in a cabinet: a tube, a VHS deck under it, four knobs, and a printed
 * channel list down the side. It is deliberately a *thing in a window* rather
 * than a mode the whole desktop drops into — this is something to have on in
 * the corner while you poke at the rest of the machine, not a takeover.
 *
 * The illusion rests on three details, in descending order of how much they
 * matter:
 *
 *   It is already playing when you get there.  `tvSchedule.ts` decides what
 *   is on from the clock, so tuning to channel 8 drops you into the middle of
 *   a programme rather than starting one — the same programme, at the same
 *   second, as anyone else on channel 8. Nothing announces this; it is just
 *   never at 00:00. Pause or skip on the deck and you fall behind the
 *   broadcast, the LIVE light goes out, and pressing it rejoins.
 *
 *   Changing channel costs something.  A burst of snow and a clunk, then the
 *   new picture. Instant cuts feel like a playlist. The snow is also doing
 *   real work — it stays up until the new picture is actually playing, so
 *   the buffering reads as the set tuning rather than as the site loading.
 *
 *   Every control does what it says.  The set streams the Archive's raw
 *   derivative files into an ordinary `<video>` instead of embedding the
 *   Archive's player, precisely so that VOLUME is the volume, the deck's
 *   ±15s genuinely seeks, and the end of a programme can roll the next one.
 *   See the note on `fileUrl` in `tvSchedule.ts`.
 *
 * GUIDE puts the listings on the tube; that is `os/TvGuide.tsx`.
 */

/** How long the snow covers a change, at minimum. */
const TUNE_MS = 620;

/** How long the snow may cover a stream that never starts. */
const TUNE_CAP_MS = 6000;

/** Where the volume knob starts. Loud enough to hear, quiet enough to forgive. */
const DEFAULT_VOLUME = 0.4;

/* -------------------------------------------------------------------------
 * Test card
 * ---------------------------------------------------------------------- */

/**
 * Channel 2, drawn rather than streamed. See `TEST_CARD_CHANNEL` in
 * `channels.ts` for how to remove the whole thing in one edit — this component
 * and that constant are the only two places it exists.
 *
 * The tone is off until asked for. A 1 kHz sine that starts by itself the
 * moment somebody lands on channel 2 is authentic and completely intolerable.
 */
const TestCard: React.FC<{ tone: boolean; volume: number }> = ({
    tone,
    volume,
}) => {
    useEffect(() => {
        if (!tone) return;
        let ctx: AudioContext | null = null;
        let osc: OscillatorNode | null = null;
        try {
            const Ctor =
                window.AudioContext || (window as any).webkitAudioContext;
            ctx = new Ctor();
            osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 1000;
            gain.gain.value = Math.min(0.06, volume * 0.12);
            osc.connect(gain).connect(ctx.destination);
            osc.start();
        } catch {
            /* no audio context — the card just stays silent */
        }
        return () => {
            try {
                osc?.stop();
                ctx?.close();
            } catch {
                /* already gone */
            }
        };
    }, [tone, volume]);

    // The seven SMPTE bars, at full and then at 75%, plus a black strip.
    const bars = [
        '#c0c0c0',
        '#c0c000',
        '#00c0c0',
        '#00c000',
        '#c000c0',
        '#c00000',
        '#0000c0',
    ];
    const stops = bars
        .map((c, i) => `${c} ${(i / 7) * 100}% ${((i + 1) / 7) * 100}%`)
        .join(', ');

    return (
        <div style={testCardStyles.root}>
            <div
                style={{
                    ...testCardStyles.bars,
                    background: `linear-gradient(to right, ${stops})`,
                }}
            />
            <div style={testCardStyles.lower}>
                <div style={testCardStyles.plate}>
                    <span style={testCardStyles.plateText}>NOSTALGIVISION</span>
                    <span style={testCardStyles.plateSub}>
                        TRANSMISSION RESUMES AT 06:00
                    </span>
                </div>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------
 * Controls
 * ---------------------------------------------------------------------- */

/**
 * One knob. A range input wearing a dial.
 *
 * `src/index.css` styles bare `input` for the showcase's text fields —
 * `width: 100%`, padding and an inset shadow — which turns an unstyled slider
 * into a full-width bar with a shadow on it. Every dimension here is pinned
 * for that reason, not out of fussiness.
 */
const Knob: React.FC<{
    label: string;
    value: number;
    onChange: (v: number) => void;
    disabled?: boolean;
}> = ({ label, value, onChange, disabled }) => (
    <div style={knobStyles.wrap}>
        <input
            type="range"
            min={0}
            max={100}
            value={Math.round(value * 100)}
            disabled={disabled}
            aria-label={label}
            onChange={(e) => onChange(Number(e.target.value) / 100)}
            style={knobStyles.slider}
        />
        <span style={knobStyles.label}>{label}</span>
    </div>
);

const DeckButton: React.FC<{
    onClick: () => void;
    title: string;
    disabled?: boolean;
    wide?: boolean;
    children: React.ReactNode;
}> = ({ onClick, title, disabled, wide, children }) => (
    <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={onClick}
        style={{
            ...deckStyles.button,
            ...(wide ? deckStyles.buttonWide : null),
            ...(disabled ? deckStyles.buttonDisabled : null),
        }}
    >
        {children}
    </button>
);

/* -------------------------------------------------------------------------
 * The set
 * ---------------------------------------------------------------------- */

export interface TelevisionProps extends WindowAppProps {}

/** The wall clock, once a second, while the set is on. */
const useClock = (running: boolean): number => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!running) return;
        setNow(Date.now());
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [running]);
    return now;
};

/** 125 → "2:05", 3725 → "1:02:05". */
const clockTime = (seconds: number): string => {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = String(s % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

const timeOfDay = (t: number): string =>
    new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const Television: React.FC<TelevisionProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const guideButtonRef = useRef<HTMLButtonElement | null>(null);

    const [power, setPower] = useState(true);
    const [channelNumber, setChannelNumber] = useState(8); // Computer Chronicles
    const [slot, setSlot] = useState<Slot | null>(null);
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    /**
     * Bumped on every tune and used as the `<video>`'s key, so each tune
     * mounts a fresh element. Rejoining the same programme ("LIVE") keeps the
     * same URL, and a reused element would never fire `loadedmetadata` again
     * to seek to where the broadcast has got to.
     */
    const [tuneId, setTuneId] = useState(0);

    const [tuning, setTuning] = useState(false);
    const [failed, setFailed] = useState(false);
    const [playing, setPlaying] = useState(true);
    const [tone, setTone] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);

    /**
     * The viewer has paused or skipped, so the tape is no longer where the
     * broadcast is. While that is true the schedule does not cut them off at
     * the end of the slot; the tape plays out and `onEnded` rejoins the
     * broadcast. State for the LIVE light, a ref for the timers.
     */
    const [shifted, setShiftedState] = useState(false);
    const shiftedRef = useRef(false);
    const setShifted = useCallback((value: boolean) => {
        shiftedRef.current = value;
        setShiftedState(value);
    }, []);

    const [volume, setVolume] = useState(DEFAULT_VOLUME);
    const [brightness, setBrightness] = useState(0.5);
    const [staticLevel, setStaticLevel] = useState(0.75);

    const now = useClock(power);

    const channel: Channel =
        CHANNELS.find((c) => c.number === channelNumber) ?? CHANNELS[0];
    const isTestCard = channel.kind === 'testCard';

    /* --- tuning ------------------------------------------------------- */

    /**
     * Which tune is current. Someone spinning the dial fires several in a
     * row, and only the last one is allowed to lift the snow.
     */
    const tuneToken = useRef(0);
    /** When the current tune began, so the snow lasts at least TUNE_MS. */
    const tuneStarted = useRef(0);
    /**
     * Every pending "stop showing snow" timer.
     *
     * `tuneToken` already stops a *stale* tune from writing, but it cannot
     * stop a timer from firing after the window has closed — and changing
     * channel and closing the TV inside 620ms is an entirely ordinary thing
     * to do.
     */
    const tuneTimers = useRef<number[]>([]);
    useEffect(
        () => () => {
            tuneTimers.current.forEach(window.clearTimeout);
            tuneTimers.current = [];
        },
        []
    );

    /** Lift the snow, but not before it has been up for TUNE_MS. */
    const endTuning = useCallback((token: number) => {
        const wait = Math.max(0, TUNE_MS - (Date.now() - tuneStarted.current));
        tuneTimers.current.push(
            window.setTimeout(() => {
                if (tuneToken.current === token) setTuning(false);
            }, wait)
        );
    }, []);

    /** Join whatever `target` is broadcasting right now. */
    const tune = useCallback(
        (target: Channel) => {
            const token = ++tuneToken.current;
            tuneStarted.current = Date.now();
            setTuneId(token);
            setTuning(true);
            setFailed(false);
            setShifted(false);

            const next = target.kind === 'testCard' ? null : onAir(target);
            setSlot(next);
            setMediaUrl(next ? fileUrl(next.programme) : null);

            if (target.kind === 'testCard') {
                // Still hold the snow for a beat — the test card should feel
                // tuned-to, not switched-to.
                endTuning(token);
                return;
            }
            if (!next) {
                setFailed(true);
                endTuning(token);
                return;
            }

            // The snow lifts when the picture arrives (`onPlaying`), not on a
            // timer: it is there to cover the buffering. This only stops a
            // stalled stream from leaving it up for good.
            tuneTimers.current.push(
                window.setTimeout(() => {
                    if (tuneToken.current === token) setTuning(false);
                }, TUNE_CAP_MS)
            );
        },
        [endTuning, setShifted]
    );

    // Retune whenever the dial moves, and on first open.
    useEffect(() => {
        if (!power) return;
        tune(channel);
        // `channel` is derived from channelNumber; depending on the number
        // keeps this from re-firing on unrelated re-renders.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelNumber, power, tune]);

    // The broadcast moves on whether or not anyone is watching: when this
    // programme's time is up, the next one starts. A viewer who has paused
    // or skipped is left to finish their tape — unless it has already run
    // out, in which case there is nothing to protect.
    useEffect(() => {
        if (!power || !slot) return;
        const id = window.setTimeout(() => {
            const video = videoRef.current;
            if (shiftedRef.current && video && !video.ended) return;
            tune(channel);
        }, Math.max(0, slot.endsAt - Date.now()) + 250);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [power, slot, tune]);

    /* --- playback ----------------------------------------------------- */

    // Seek to where the broadcast is once the file is actually ready —
    // measured now, not when the dial moved, because the file took a moment
    // to arrive. Setting currentTime before metadata has loaded is silently
    // ignored.
    const onLoadedMetadata = useCallback(() => {
        const video = videoRef.current;
        if (!video || !slot) return;
        const target = (Date.now() - slot.startsAt) / 1000;
        if (target > 1 && Number.isFinite(video.duration)) {
            video.currentTime = Math.min(target, Math.max(0, video.duration - 2));
        }
        video.volume = volume;
        video.play().catch(() => {
            // Autoplay with sound can still be refused. Muting and retrying is
            // what every video site does here; the VOLUME knob un-mutes it.
            video.muted = true;
            video.play().catch(() => setPlaying(false));
        });
    }, [slot, volume]);

    /**
     * The tape ran out. If the broadcast is still on the same programme —
     * the baked running time can be a second longer than the file, or the
     * viewer skipped ahead — the slot timer above will roll the next one, so
     * wait for it rather than reloading the end of this one. Otherwise the
     * viewer had fallen behind: rejoin the broadcast wherever it has got to.
     */
    const onEnded = useCallback(() => {
        const live = onAir(channel);
        if (live && slot && live.startsAt === slot.startsAt) return;
        tune(channel);
    }, [channel, slot, tune]);

    useEffect(() => {
        const video = videoRef.current;
        if (video) video.volume = volume;
    }, [volume, tuneId]);

    /* --- publish to the rest of the desktop --------------------------- */

    useEffect(() => {
        setTvState({
            on: power,
            channel: channel.number,
            channelName: channel.name,
            programme: slot?.programme.title ?? (isTestCard ? 'Test Card' : null),
            mediaUrl,
            muted: volume === 0,
        });
    }, [power, channel, slot, mediaUrl, volume, isTestCard]);

    // The window closing means there is no television anywhere any more —
    // the 3D room's monitor goes back to showing the site.
    useEffect(() => () => clearTvState(), []);

    // Keep the mirrored position roughly current without re-rendering here.
    useEffect(() => {
        if (!power || !mediaUrl) return;
        const id = window.setInterval(() => {
            const video = videoRef.current;
            if (video) setTvState({ positionSeconds: video.currentTime });
        }, 1000);
        return () => window.clearInterval(id);
    }, [power, mediaUrl]);

    /* --- controls ----------------------------------------------------- */

    const step = (delta: number) => {
        playClick();
        const i = CHANNELS.findIndex((c) => c.number === channelNumber);
        const next = CHANNELS[(i + delta + CHANNELS.length) % CHANNELS.length];
        setChannelNumber(next.number);
    };

    const seek = (delta: number) => {
        const video = videoRef.current;
        if (!video) return;
        playClick();
        setShifted(true);
        video.currentTime = Math.max(0, video.currentTime + delta);
    };

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        playClick();
        if (video.paused) {
            video.play().catch(() => undefined);
            setPlaying(true);
        } else {
            video.pause();
            setPlaying(false);
            setShifted(true);
        }
    };

    const goLive = () => {
        playClick();
        tune(channel);
    };

    const togglePower = () => {
        playClick();
        setPower((on) => {
            if (on) {
                setMediaUrl(null);
                setSlot(null);
                setGuideOpen(false);
            }
            return !on;
        });
    };

    const closeGuide = useCallback(() => {
        setGuideOpen(false);
        // Back to the button that opened it, so a keyboard user is not
        // dropped at the top of the page.
        window.setTimeout(() => guideButtonRef.current?.focus(), 0);
    }, []);

    const tuneFromGuide = useCallback(
        (n: number) => {
            playClick();
            setChannelNumber(n);
            closeGuide();
        },
        [closeGuide]
    );

    const nowShowing = isTestCard
        ? 'Test Card F'
        : slot?.programme.title ?? (tuning ? 'Tuning…' : 'No signal');
    const upNext = slot ? onAir(channel, slot.endsAt) : null;
    // Where the tape is, not where the broadcast is: after a pause the two
    // differ, and this is the deck's readout. The clock re-renders the set
    // once a second, which is what keeps it moving.
    const video = videoRef.current;
    const position =
        video && !tuning && Number.isFinite(video.currentTime)
            ? video.currentTime
            : slot
            ? (now - slot.startsAt) / 1000
            : 0;
    const length = slot?.programme.seconds ?? 0;
    const progress = length ? Math.min(1, Math.max(0, position / length)) : 0;

    return (
        <Window
            top={40}
            left={120}
            width={760}
            height={600}
            windowTitle="Television"
            windowBarIcon="televisionIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={
                power ? `CH ${channel.number} — ${channel.name}` : 'Standby'
            }
        >
            <div style={styles.root}>
                <div style={styles.body}>
                    {/* ---- set ---- */}
                    <div style={styles.setColumn}>
                        <div style={styles.cabinetTop}>
                            <span style={styles.brand}>NOSTALGIVISION</span>
                            <span style={styles.model}>MODEL 95-XT</span>
                        </div>

                        <div style={styles.tube}>
                            <div style={styles.picture}>
                                {!power && <div style={styles.dark} />}

                                {power && isTestCard && (
                                    <TestCard tone={tone} volume={volume} />
                                )}

                                {power && !isTestCard && mediaUrl && (
                                    <video
                                        key={tuneId}
                                        ref={videoRef}
                                        src={mediaUrl}
                                        playsInline
                                        onLoadedMetadata={onLoadedMetadata}
                                        onEnded={onEnded}
                                        onPlay={() => setPlaying(true)}
                                        onPlaying={() => endTuning(tuneId)}
                                        onPause={() => setPlaying(false)}
                                        onError={() => {
                                            // A tape the Archive has since
                                            // withdrawn. Dead air until the
                                            // slot ends, as a station would.
                                            setFailed(true);
                                            setTuning(false);
                                        }}
                                        style={{
                                            ...styles.video,
                                            filter: `brightness(${
                                                0.55 + brightness * 0.9
                                            })`,
                                        }}
                                    />
                                )}

                                {power && failed && !tuning && (
                                    <div style={styles.noSignal}>
                                        <span style={styles.noSignalText}>
                                            NO SIGNAL
                                        </span>
                                        <span style={styles.noSignalSub}>
                                            Try another channel
                                        </span>
                                    </div>
                                )}

                                {power && guideOpen && (
                                    <TvGuide
                                        channels={CHANNELS}
                                        current={channel.number}
                                        now={now}
                                        onTune={tuneFromGuide}
                                        onClose={closeGuide}
                                    />
                                )}

                                {/* The tube itself, over whatever is showing. */}
                                {power && (
                                    <CrtScreen
                                        settings={CRT_TELEVISION}
                                        absolute
                                    />
                                )}

                                {power && tuning && (
                                    <StaticBurst intensity={staticLevel} />
                                )}

                                {/* Corner bug, the way a channel identifies
                                    itself a few seconds after you arrive. */}
                                {power && !tuning && !guideOpen && (
                                    <div style={styles.bug}>
                                        <span style={styles.bugNumber}>
                                            {String(channel.number).padStart(
                                                2,
                                                '0'
                                            )}
                                        </span>
                                        <span style={styles.bugName}>
                                            {channel.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ---- VHS deck ---- */}
                        <div style={styles.deck}>
                            <div style={styles.tape}>
                                <div style={styles.reel} />
                                <div style={styles.tapeLabel}>
                                    <div style={styles.tapeTitleRow}>
                                        <span style={styles.tapeTitle}>
                                            {nowShowing}
                                            {slot?.programme.year
                                                ? ` (${slot.programme.year})`
                                                : ''}
                                        </span>
                                        {slot && (
                                            // The uploader is credited on the
                                            // tape's own page, not here.
                                            <a
                                                href={detailsUrl(slot.programme)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="This tape's page at the Internet Archive"
                                                style={styles.archiveLink}
                                            >
                                                via archive.org
                                            </a>
                                        )}
                                    </div>
                                    {slot ? (
                                        <>
                                            <div style={styles.progressRow}>
                                                <div
                                                    role="progressbar"
                                                    aria-label="Programme progress"
                                                    aria-valuemin={0}
                                                    aria-valuemax={Math.round(length)}
                                                    aria-valuenow={Math.round(position)}
                                                    aria-valuetext={`${clockTime(
                                                        position
                                                    )} of ${clockTime(length)}`}
                                                    style={styles.progressTrack}
                                                >
                                                    <div
                                                        style={{
                                                            ...styles.progressFill,
                                                            width: `${progress * 100}%`,
                                                        }}
                                                    />
                                                </div>
                                                <span style={styles.tapeTime}>
                                                    {clockTime(position)} /{' '}
                                                    {clockTime(length)}
                                                </span>
                                            </div>
                                            <span style={styles.tapeMeta}>
                                                {upNext
                                                    ? `NEXT ${timeOfDay(
                                                          upNext.startsAt
                                                      )} · ${upNext.programme.title}`
                                                    : `CH ${channel.number}`}
                                            </span>
                                        </>
                                    ) : (
                                        <span style={styles.tapeMeta}>
                                            {isTestCard
                                                ? 'COLOUR BARS · 1 kHz'
                                                : `CH ${channel.number}`}
                                        </span>
                                    )}
                                </div>
                                <div style={styles.reel} />
                            </div>

                            <div style={styles.transport}>
                                <DeckButton
                                    title={
                                        shifted
                                            ? 'Rejoin the broadcast'
                                            : 'Watching the broadcast live'
                                    }
                                    disabled={!power || !slot || !shifted}
                                    onClick={goLive}
                                >
                                    <span
                                        style={{
                                            ...styles.liveDot,
                                            ...(power && slot && !shifted
                                                ? styles.liveDotOn
                                                : null),
                                        }}
                                    />
                                    LIVE
                                </DeckButton>
                                <DeckButton
                                    title="Back 15 seconds"
                                    disabled={!power || isTestCard || !mediaUrl}
                                    onClick={() => seek(-15)}
                                >
                                    ◀◀
                                </DeckButton>
                                <DeckButton
                                    title={playing ? 'Pause' : 'Play'}
                                    disabled={!power || isTestCard || !mediaUrl}
                                    onClick={togglePlay}
                                    wide
                                >
                                    {playing ? '❚❚' : '▶'}
                                </DeckButton>
                                <DeckButton
                                    title="Forward 15 seconds"
                                    disabled={!power || isTestCard || !mediaUrl}
                                    onClick={() => seek(15)}
                                >
                                    ▶▶
                                </DeckButton>
                                {isTestCard && (
                                    <DeckButton
                                        title="1 kHz reference tone"
                                        disabled={!power}
                                        onClick={() => {
                                            playClick();
                                            setTone((t) => !t);
                                        }}
                                    >
                                        {tone ? 'TONE ■' : 'TONE'}
                                    </DeckButton>
                                )}
                            </div>
                        </div>

                        {/* ---- knobs ---- */}
                        <div style={styles.knobRow}>
                            <button
                                type="button"
                                onClick={togglePower}
                                title={power ? 'Switch off' : 'Switch on'}
                                style={{
                                    ...styles.power,
                                    ...(power ? styles.powerOn : null),
                                }}
                            >
                                <span
                                    style={{
                                        ...styles.powerDot,
                                        ...(power ? styles.powerDotOn : null),
                                    }}
                                />
                                POWER
                            </button>

                            <div style={styles.chGroup}>
                                <DeckButton
                                    title="Channel down"
                                    disabled={!power}
                                    onClick={() => step(-1)}
                                >
                                    ▼
                                </DeckButton>
                                <span style={styles.chReadout}>
                                    {String(channel.number).padStart(2, '0')}
                                </span>
                                <DeckButton
                                    title="Channel up"
                                    disabled={!power}
                                    onClick={() => step(1)}
                                >
                                    ▲
                                </DeckButton>
                            </div>

                            <button
                                type="button"
                                ref={guideButtonRef}
                                disabled={!power}
                                aria-pressed={guideOpen}
                                title="Programme guide"
                                onClick={() => {
                                    playClick();
                                    if (guideOpen) closeGuide();
                                    else setGuideOpen(true);
                                }}
                                style={{
                                    ...styles.power,
                                    ...(guideOpen ? styles.pressed : null),
                                    ...(!power ? deckStyles.buttonDisabled : null),
                                }}
                            >
                                GUIDE
                            </button>

                            <Knob
                                label="VOLUME"
                                value={volume}
                                disabled={!power}
                                onChange={(v) => {
                                    setVolume(v);
                                    const video = videoRef.current;
                                    // Any deliberate volume change also lifts
                                    // the mute autoplay may have forced.
                                    if (video && v > 0) video.muted = false;
                                }}
                            />
                            <Knob
                                label="BRIGHT"
                                value={brightness}
                                disabled={!power}
                                onChange={setBrightness}
                            />
                            <Knob
                                label="STATIC"
                                value={staticLevel}
                                disabled={!power}
                                onChange={setStaticLevel}
                            />
                        </div>
                    </div>

                    {/* ---- printed channel list ---- */}
                    <div style={styles.guide}>
                        <div style={styles.guideHead}>
                            <span style={styles.guideTitle}>PROGRAMME GUIDE</span>
                        </div>
                        <div style={styles.guideList}>
                            {CHANNELS.map((c) => {
                                const active = c.number === channel.number;
                                return (
                                    <div
                                        key={c.number}
                                        role="button"
                                        tabIndex={0}
                                        title={c.tagline}
                                        onClick={() => {
                                            if (active) return;
                                            playClick();
                                            if (!power) setPower(true);
                                            setChannelNumber(c.number);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key !== 'Enter' && e.key !== ' ')
                                                return;
                                            e.preventDefault();
                                            if (!power) setPower(true);
                                            setChannelNumber(c.number);
                                        }}
                                        style={{
                                            ...styles.guideRow,
                                            ...(active
                                                ? styles.guideRowActive
                                                : null),
                                        }}
                                    >
                                        <span
                                            style={{
                                                ...styles.guideNum,
                                                ...(active
                                                    ? styles.guideNumActive
                                                    : null),
                                            }}
                                        >
                                            {String(c.number).padStart(2, '0')}
                                        </span>
                                        <span style={styles.guideText}>
                                            <span
                                                style={{
                                                    ...styles.guideName,
                                                    ...(active
                                                        ? styles.guideNameActive
                                                        : null),
                                                }}
                                            >
                                                {c.name}
                                            </span>
                                            <span
                                                style={{
                                                    ...styles.guideTag,
                                                    ...(active
                                                        ? styles.guideTagActive
                                                        : null),
                                                }}
                                            >
                                                {c.tagline}
                                            </span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={styles.guideFoot}>
                            <span style={styles.guideFootText}>
                                Tapes from the Internet Archive, on its
                                bandwidth.{' '}
                                <a
                                    href="https://archive.org/donate"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={styles.guideFootLink}
                                >
                                    Donate
                                </a>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Window>
    );
};

/* -------------------------------------------------------------------------
 * Styles
 * ---------------------------------------------------------------------- */

const CABINET = '#6c6257';
const CABINET_DARK = '#4a423a';
const PLASTIC = '#d8d2c6';

const styles: StyleSheetCSS = {
    root: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: Colors.lightGray,
        overflow: 'hidden',
    },
    body: { flex: 1, minHeight: 0, flexDirection: 'row' },

    setColumn: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        background: CABINET,
        padding: 8,
        boxSizing: 'border-box',
    },
    cabinetTop: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        padding: '0 4px 6px',
    },
    brand: {
        fontFamily: 'Millennium, monospace',
        fontSize: 13,
        letterSpacing: 2,
        color: PLASTIC,
    },
    model: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        letterSpacing: 1,
        color: '#a89d8d',
    },

    tube: {
        flex: 1,
        minHeight: 0,
        padding: 10,
        boxSizing: 'border-box',
        background: CABINET_DARK,
        border: `2px solid ${CABINET_DARK}`,
        borderTopColor: '#3a332c',
        borderLeftColor: '#3a332c',
        borderRightColor: '#8a7f70',
        borderBottomColor: '#8a7f70',
    },
    picture: {
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        position: 'relative',
        background: '#000',
        borderRadius: 10,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
    },
    dark: { position: 'absolute', inset: 0, background: '#050505' },

    noSignal: {
        position: 'absolute',
        inset: 0,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    noSignalText: {
        fontFamily: 'Millennium, monospace',
        fontSize: 20,
        letterSpacing: 3,
        color: '#9aa4b0',
    },
    noSignalSub: { fontFamily: 'MSSerif', fontSize: 10, color: '#5d666f' },

    bug: {
        position: 'absolute',
        right: 10,
        top: 8,
        zIndex: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: '3px 7px',
        background: 'rgba(0,0,0,0.45)',
        borderRadius: 2,
    },
    bugNumber: {
        fontFamily: 'Millennium, monospace',
        fontSize: 14,
        color: '#f5c518',
    },
    bugName: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        letterSpacing: 1,
        color: '#e8e8e8',
        textTransform: 'uppercase',
    },

    deck: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 6,
        background: '#2b2723',
        border: '2px solid #1c1917',
        borderRightColor: '#5b534a',
        borderBottomColor: '#5b534a',
    },
    tape: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: '5px 8px',
        background: '#15130f',
        border: '1px solid #000',
    },
    reel: {
        width: 14,
        height: 14,
        flex: 'none',
        borderRadius: '50%',
        background: '#3a352f',
        border: '2px solid #6b625a',
        boxSizing: 'border-box',
    },
    tapeLabel: { flex: 1, minWidth: 0, flexDirection: 'column', gap: 2 },
    tapeTitleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        minWidth: 0,
    },
    tapeTitle: {
        display: 'block',
        flex: 1,
        minWidth: 0,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: '#f0e6d2',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    archiveLink: {
        flex: 'none',
        fontFamily: 'MSSerif',
        fontSize: 9,
        letterSpacing: 1,
        color: '#c9b98f',
    },
    tapeMeta: {
        display: 'block',
        fontFamily: 'MSSerif',
        fontSize: 9,
        letterSpacing: 1,
        color: '#a59c8d',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    progressTrack: {
        flex: 1,
        minWidth: 0,
        height: 4,
        background: '#3a352f',
        border: '1px solid #000',
    },
    progressFill: { height: '100%', background: '#c81e1e' },
    tapeTime: {
        flex: 'none',
        fontFamily: 'Millennium, monospace',
        fontSize: 10,
        color: '#f0e6d2',
    },
    transport: { flexDirection: 'row', gap: 4, flex: 'none' },
    liveDot: {
        display: 'inline-block',
        width: 6,
        height: 6,
        marginRight: 4,
        borderRadius: '50%',
        background: '#5a2020',
        flex: 'none',
    },
    liveDotOn: { background: '#ff3b30', boxShadow: '0 0 4px #ff3b30' },

    knobRow: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: '6px 8px',
        background: PLASTIC,
        border: '2px solid #fff',
        borderRightColor: '#8a8272',
        borderBottomColor: '#8a8272',
    },
    power: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flex: 'none',
        padding: '5px 9px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 10,
        letterSpacing: 1,
        color: '#2a2622',
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
    powerOn: { color: '#101010' },
    // A latched button: the bevel turned inside out.
    pressed: {
        borderColor: Colors.darkGray,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: '#c8c8c8',
    },
    powerDot: {
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: '#5a2020',
        flex: 'none',
    },
    // A lit LED, not just a red dot — the glow is what reads as "on".
    powerDotOn: {
        background: '#ff3b30',
        boxShadow: '0 0 5px #ff3b30',
    },
    chGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flex: 'none',
    },
    chReadout: {
        fontFamily: 'Millennium, monospace',
        fontSize: 18,
        color: '#c81e1e',
        background: '#1a1512',
        padding: '2px 8px',
        minWidth: 34,
        textAlign: 'center',
        border: '1px solid #000',
    },

    guide: {
        width: 208,
        flex: 'none',
        flexDirection: 'column',
        background: Colors.lightGray,
        borderLeft: `2px solid ${Colors.darkGray}`,
        boxSizing: 'border-box',
    },
    guideHead: {
        padding: '5px 8px',
        background: '#000080',
        flex: 'none',
    },
    guideTitle: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        letterSpacing: 1,
        color: '#fff',
    },
    guideList: {
        flex: 1,
        minHeight: 0,
        flexDirection: 'column',
        overflowY: 'auto',
        background: '#fff',
    },
    guideRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 7,
        padding: '5px 7px',
        cursor: 'pointer',
        borderBottom: '1px solid #e2e2e2',
    },
    guideRowActive: { background: '#000080' },
    guideNum: {
        fontFamily: 'Millennium, monospace',
        fontSize: 13,
        color: '#000080',
        flex: 'none',
        minWidth: 20,
    },
    guideNumActive: { color: '#f5c518' },
    // `display: flex` is load-bearing: this is a <span>, and `src/App.css`'s
    // `div { display: flex }` does not reach it, so without this the column
    // direction is silently ignored and the name and tagline run together.
    guideText: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        gap: 1,
    },
    guideName: { fontFamily: 'MSSerif', fontSize: 11, color: '#000' },
    guideNameActive: { color: '#fff' },
    guideTag: { fontFamily: 'MSSerif', fontSize: 9, color: '#555' },
    guideTagActive: { color: '#b8c4e8' },
    guideFoot: {
        padding: '4px 8px',
        flex: 'none',
        borderTop: `1px solid ${Colors.darkGray}`,
    },
    guideFootText: { fontFamily: 'MSSerif', fontSize: 9, color: '#444' },
    guideFootLink: { color: '#000080' },
};

const testCardStyles: StyleSheetCSS = {
    root: {
        position: 'absolute',
        inset: 0,
        flexDirection: 'column',
        background: '#101010',
    },
    bars: { flex: 3, minHeight: 0 },
    lower: {
        flex: 1,
        minHeight: 0,
        background: '#101010',
        justifyContent: 'center',
        alignItems: 'center',
    },
    plate: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '5px 14px',
        border: '1px solid #6a6a6a',
    },
    plateText: {
        fontFamily: 'Millennium, monospace',
        fontSize: 14,
        letterSpacing: 3,
        color: '#e8e8e8',
    },
    plateSub: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        letterSpacing: 1,
        color: '#8a8a8a',
    },
};

const knobStyles: StyleSheetCSS = {
    wrap: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        flex: 1,
        minWidth: 0,
    },
    slider: {
        width: '100%',
        minWidth: 40,
        maxWidth: 92,
        height: 14,
        padding: 0,
        margin: 0,
        boxShadow: 'none',
        cursor: 'pointer',
        accentColor: '#8b2f2f',
    },
    label: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        letterSpacing: 1,
        color: '#3a352e',
    },
};

const deckStyles: StyleSheetCSS = {
    button: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 30,
        height: 22,
        padding: '0 7px',
        cursor: 'pointer',
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: '#1a1a1a',
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
    },
    buttonWide: { minWidth: 42 },
    buttonDisabled: { color: Colors.darkGray, cursor: 'default' },
};

export default Television;
