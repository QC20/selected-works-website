import React, { useCallback, useEffect, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import CrtScreen from '../os/CrtScreen';
import StaticBurst from '../os/StaticBurst';
import { CRT_TELEVISION } from '../os/crt';
import {
    Airing,
    CHANNELS,
    Channel,
    Episode,
    fetchEpisodes,
    resolveMedia,
    scheduledFor,
} from '../os/channels';
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
 *   It is already playing when you get there.  `channels.ts` decides what is
 *   on from the clock, so tuning to channel 8 drops you into the middle of a
 *   programme rather than starting one. Nothing announces this; it is just
 *   never at 00:00.
 *
 *   Changing channel costs something.  A burst of snow and a clunk, then the
 *   new picture. Instant cuts feel like a playlist. The snow is also doing
 *   real work — it covers the second or so it takes to resolve the next
 *   programme's media URL, so the wait reads as the set tuning rather than as
 *   the site loading.
 *
 *   Every control does what it says.  The set streams the Archive's raw
 *   derivative files into an ordinary `<video>` instead of embedding the
 *   Archive's player, precisely so that VOLUME is the volume, the deck's
 *   ±15s genuinely seeks, and the end of a programme can roll the next one.
 *   See the long note in `channels.ts` for why that is worth the extra fetch.
 */

/** How long the snow covers a change, at minimum. */
const TUNE_MS = 620;

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

const Television: React.FC<TelevisionProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [power, setPower] = useState(true);
    const [channelNumber, setChannelNumber] = useState(8); // Computer Chronicles
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [airing, setAiring] = useState<Airing | null>(null);
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);

    const [tuning, setTuning] = useState(false);
    const [failed, setFailed] = useState(false);
    const [playing, setPlaying] = useState(true);
    const [tone, setTone] = useState(false);

    const [volume, setVolume] = useState(DEFAULT_VOLUME);
    const [brightness, setBrightness] = useState(0.5);
    const [staticLevel, setStaticLevel] = useState(0.75);

    const channel: Channel =
        CHANNELS.find((c) => c.number === channelNumber) ?? CHANNELS[0];
    const isTestCard = channel.kind === 'testCard';

    /* --- tuning ------------------------------------------------------- */

    /**
     * Load a channel and start it wherever the schedule says it should be.
     *
     * Guarded by a token rather than an AbortController because the slow part
     * is two awaited fetches in sequence: someone spinning the dial fires
     * several of these, and only the last one is allowed to reach setState.
     */
    const tuneToken = useRef(0);

    const tune = useCallback(
        async (target: Channel) => {
            const token = ++tuneToken.current;
            setTuning(true);
            setFailed(false);
            setMediaUrl(null);
            setAiring(null);

            if (target.kind === 'testCard') {
                setEpisodes([]);
                // Still hold the snow for a beat — the test card should feel
                // tuned-to, not switched-to.
                window.setTimeout(() => {
                    if (tuneToken.current === token) setTuning(false);
                }, TUNE_MS);
                return;
            }

            const list = await fetchEpisodes(target);
            if (tuneToken.current !== token) return;
            setEpisodes(list);

            const next = scheduledFor(target, list);
            if (!next) {
                setFailed(true);
                setTuning(false);
                return;
            }
            setAiring(next);

            const url = await resolveMedia(next.episode);
            if (tuneToken.current !== token) return;

            if (!url) {
                // Some Archive items have no video derivative at all. Rather
                // than sit on black, step past to the next programme along.
                const index = list.findIndex((e) => e.id === next.episode.id);
                const alt = list[(index + 1) % list.length];
                const altUrl = alt ? await resolveMedia(alt) : null;
                if (tuneToken.current !== token) return;
                if (!altUrl) {
                    setFailed(true);
                    setTuning(false);
                    return;
                }
                setAiring({ ...next, episode: alt, offsetSeconds: 0 });
                setMediaUrl(altUrl);
            } else {
                setMediaUrl(url);
            }

            window.setTimeout(() => {
                if (tuneToken.current === token) setTuning(false);
            }, TUNE_MS);
        },
        []
    );

    // Retune whenever the dial moves, and on first open.
    useEffect(() => {
        if (!power) return;
        tune(channel);
        // `channel` is derived from channelNumber; depending on the number
        // keeps this from re-firing on unrelated re-renders.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelNumber, power, tune]);

    /* --- playback ----------------------------------------------------- */

    // Seek to the scheduled position once the file is actually ready. Setting
    // currentTime before metadata has loaded is silently ignored.
    const onLoadedMetadata = useCallback(() => {
        const video = videoRef.current;
        if (!video || !airing) return;
        const target = airing.offsetSeconds;
        if (target > 0 && Number.isFinite(video.duration)) {
            video.currentTime = Math.min(target, Math.max(0, video.duration - 5));
        }
        video.volume = volume;
        video.play().catch(() => {
            // Autoplay with sound can still be refused. Muting and retrying is
            // what every video site does here; the VOLUME knob un-mutes it.
            video.muted = true;
            video.play().catch(() => setPlaying(false));
        });
    }, [airing, volume]);

    /** End of programme: roll the next one on the same channel. */
    const onEnded = useCallback(async () => {
        if (!airing || !episodes.length) return;
        const index = episodes.findIndex((e) => e.id === airing.episode.id);
        const next = episodes[(index + 1) % episodes.length];
        const token = ++tuneToken.current;
        setTuning(true);
        const url = await resolveMedia(next);
        if (tuneToken.current !== token) return;
        setAiring({ ...airing, episode: next, offsetSeconds: 0 });
        setMediaUrl(url);
        window.setTimeout(() => {
            if (tuneToken.current === token) setTuning(false);
        }, TUNE_MS);
    }, [airing, episodes]);

    useEffect(() => {
        const video = videoRef.current;
        if (video) video.volume = volume;
    }, [volume, mediaUrl]);

    /* --- publish to the rest of the desktop --------------------------- */

    useEffect(() => {
        setTvState({
            on: power,
            channel: channel.number,
            channelName: channel.name,
            programme: airing?.episode.title ?? (isTestCard ? 'Test Card' : null),
            mediaUrl,
            muted: volume === 0,
        });
    }, [power, channel, airing, mediaUrl, volume, isTestCard]);

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
        }
    };

    const togglePower = () => {
        playClick();
        setPower((on) => {
            if (on) {
                setMediaUrl(null);
                setAiring(null);
            }
            return !on;
        });
    };

    const nowShowing = isTestCard
        ? 'Test Card F'
        : airing?.episode.title ?? (tuning ? 'Tuning…' : 'No signal');

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
                                        ref={videoRef}
                                        src={mediaUrl}
                                        playsInline
                                        onLoadedMetadata={onLoadedMetadata}
                                        onEnded={onEnded}
                                        onPlay={() => setPlaying(true)}
                                        onPause={() => setPlaying(false)}
                                        onError={() => setFailed(true)}
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
                                {power && !tuning && (
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
                                    <span style={styles.tapeTitle}>
                                        {nowShowing}
                                    </span>
                                    <span style={styles.tapeMeta}>
                                        {isTestCard
                                            ? 'COLOUR BARS · 1 kHz'
                                            : airing?.episode.year
                                            ? `${airing.episode.year} · CH ${channel.number}`
                                            : `CH ${channel.number}`}
                                    </span>
                                </div>
                                <div style={styles.reel} />
                            </div>

                            <div style={styles.transport}>
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
                                Streamed from the Internet Archive
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
    tapeLabel: { flex: 1, minWidth: 0, flexDirection: 'column', gap: 1 },
    tapeTitle: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: '#f0e6d2',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    tapeMeta: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        letterSpacing: 1,
        color: '#8d8578',
    },
    transport: { flexDirection: 'row', gap: 4, flex: 'none' },

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
