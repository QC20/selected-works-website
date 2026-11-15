import React, { useCallback, useEffect, useRef, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import CrtScreen from '../os/CrtScreen';
import StaticBurst from '../os/StaticBurst';
import { CRT_TELEVISION } from '../os/crt';
import TvGuide from '../os/TvGuide';
import TvOsd from '../os/TvOsd';
import {
    IdentCard,
    ListingsChannel,
    nowLine,
    PromoCard,
    StandByCard,
    TestCard,
    TvKeyframes,
    UpNextCard,
    WeatherChannel,
} from '../os/TvScreens';
import { CHANNELS, Channel, channelByNumber, DEFAULT_CHANNEL } from '../os/channels';
import { detailsUrl, programmeLabel, Segment, segmentAt } from '../os/tvSchedule';
import { DeckState, TvDeck } from '../os/tvDeck';
import { clearTvState, setTvState } from '../os/tvState';
import { playClick, startTvStatic, useMuted } from '../os/sounds';

/**
 * The television.
 * ---------------
 * A set in a cabinet: a tube, a VHS deck under it, a row of knobs, and the
 * printed channel card down the side. A thing in a window rather than a mode
 * the desktop drops into — something to have on in the corner.
 *
 * What makes it television rather than a video player, roughly in order:
 *
 *   It is already on when you get there.  The schedule (`os/tvSchedule.ts`)
 *   is a function of the clock, so channel 8 is always halfway through
 *   something, the same thing at the same second as for anyone else.
 *
 *   It has a running order.  Programmes start on the hour and half hour, and
 *   the gaps are breaks: an ident and jingle, real commercials from 1948 to
 *   1999, a card saying what is up next. The breaks are also where the next
 *   tape loads, which is why one programme cuts cleanly to the next.
 *
 *   Changing channel is quick and costs something.  The channels either side
 *   are buffered (`os/tvDeck.ts`), so CH▲ is a click, a flash of snow and a
 *   picture; a far channel is snow for as long as the tape takes to arrive,
 *   with the hiss of an untuned set, and never a black screen.
 *
 *   Every control does what it says.  VOLUME is the volume, the deck's ±15s
 *   really seeks, MUTE mutes, and a remote's worth of keys work: arrows for
 *   channel and volume, digits to type a channel, L for the last one.
 *
 * Channels 2, 3 and 17 are drawn rather than taped: the test card, the
 * scrolling listings, and the WeatherStar 4000+. GUIDE puts the interactive
 * grid on the tube; that is `os/TvGuide.tsx`.
 */

/** How long the snow covers a change, at minimum. */
const TUNE_MS = 420;
const BANNER_MS = 4500;
const NUMBER_MS = 3000;
const VOLUME_MS = 2200;
const DIGIT_MS = 1600;

const read = <T,>(key: string, fallback: T): T => {
    try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
        return fallback;
    }
};
const write = (key: string, value: unknown): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* private mode — the set just forgets */
    }
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* -------------------------------------------------------------------------
 * Controls
 * ---------------------------------------------------------------------- */

/**
 * One knob. A range input wearing a dial. `src/index.css` styles bare `input`
 * for the showcase's text fields, so every dimension here is pinned.
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
    pressed?: boolean;
    children: React.ReactNode;
}> = ({ onClick, title, disabled, wide, pressed, children }) => (
    <button
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onClick}
        style={{
            ...deckStyles.button,
            ...(wide ? deckStyles.buttonWide : null),
            ...(pressed ? styles.pressed : null),
            ...(disabled ? deckStyles.buttonDisabled : null),
        }}
    >
        {children}
    </button>
);

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
    new Date(t).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });

/** The programme a segment leads to, for "NEXT" lines. */
const upNextOf = (channel: Channel, seg: Segment | null) => {
    if (!seg) return null;
    if (seg.kind !== 'programme') return seg.upNext ?? null;
    return segmentAt(channel, seg.endsAt + 1)?.upNext ?? null;
};

/* -------------------------------------------------------------------------
 * The set
 * ---------------------------------------------------------------------- */

export interface TelevisionProps extends WindowAppProps {}

const Television: React.FC<TelevisionProps> = ({ onInteract, onClose, onMinimize }) => {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const hostRef = useRef<HTMLDivElement | null>(null);
    const deckRef = useRef<TvDeck | null>(null);
    const guideButtonRef = useRef<HTMLButtonElement | null>(null);

    const [power, setPower] = useState(true);
    const [channelNumber, setChannelNumber] = useState<number>(() => {
        const saved = read<number>('tv.channel.v2', DEFAULT_CHANNEL);
        return channelByNumber(saved) ? saved : DEFAULT_CHANNEL;
    });
    const lastChannel = useRef<number | null>(null);
    /** Which way the viewer is surfing, so the set buffers ahead of them. */
    const direction = useRef<1 | -1>(1);
    const [deck, setDeck] = useState<DeckState | null>(null);

    const [volume, setVolumeState] = useState(() => clamp01(read('tv.volume.v1', 0.4)));
    const [userMuted, setUserMuted] = useState(false);
    const systemMuted = useMuted();
    const [brightness, setBrightness] = useState(() => clamp01(read('tv.bright.v1', 0.5)));
    const [staticLevel, setStaticLevel] = useState(() => clamp01(read('tv.static.v1', 0.75)));

    const [guideOpen, setGuideOpen] = useState(false);
    const [tone, setTone] = useState(false);
    const [snowMin, setSnowMin] = useState(true);
    const [weatherReady, setWeatherReady] = useState(false);
    const [bannerUntil, setBannerUntil] = useState(0);
    const [numberUntil, setNumberUntil] = useState(0);
    const [volumeUntil, setVolumeUntil] = useState(0);
    const [digits, setDigits] = useState('');
    const [powerFx, setPowerFx] = useState<'on' | 'off' | null>('on');

    const now = useClock(power);

    // On a phone the window is the width of the screen; the printed channel
    // card would leave the picture a stamp. Below this the card goes (GUIDE,
    // CH▲▼ and the digits still reach every channel) and the knobs wrap.
    const [width, setWidth] = useState(760);
    useEffect(() => {
        const el = rootRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const narrow = width < 620;
    const channel: Channel = channelByNumber(channelNumber) ?? CHANNELS[0];
    const muted = userMuted || systemMuted || volume <= 0;
    const audible = muted ? 0 : volume;

    /* --- the tuner ----------------------------------------------------- */

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        const d = new TvDeck(host);
        deckRef.current = d;
        const unsubscribe = d.subscribe(setDeck);
        return () => {
            unsubscribe();
            d.dispose();
            deckRef.current = null;
        };
    }, []);

    useEffect(() => {
        deckRef.current?.setVolume(volume, userMuted || systemMuted);
    }, [volume, userMuted, systemMuted]);

    // Retune whenever the dial moves, and on power-on.
    useEffect(() => {
        const d = deckRef.current;
        if (!d) return;
        if (!power) {
            d.powerOff();
            return;
        }
        const i = CHANNELS.findIndex((c) => c.number === channel.number);
        const at = (k: number) => CHANNELS[(i + k + CHANNELS.length * 2) % CHANNELS.length];
        const dir = direction.current;
        d.setNeighbours([at(dir), at(-dir), at(dir * 2)]);
        d.tune(channel);
        setSnowMin(true);
        setWeatherReady(false);
        const t = Date.now();
        setBannerUntil(t + BANNER_MS);
        setNumberUntil(t + NUMBER_MS);
        write('tv.channel.v2', channel.number);
        const id = window.setTimeout(() => setSnowMin(false), TUNE_MS);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [power, channel.number]);

    useEffect(() => write('tv.volume.v1', volume), [volume]);
    useEffect(() => write('tv.bright.v1', brightness), [brightness]);
    useEffect(() => write('tv.static.v1', staticLevel), [staticLevel]);

    const phase = deck?.phase ?? 'tuning';
    const segment = deck?.segment ?? null;
    const snowing =
        power && (snowMin || phase === 'tuning' || (channel.kind === 'weather' && !weatherReady));

    // The hiss of an untuned set, for exactly as long as the snow is up.
    useEffect(() => {
        if (!snowing) return;
        return startTvStatic(audible * 0.8);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snowing]);

    /* --- controls ------------------------------------------------------ */

    const tuneTo = useCallback(
        (n: number) => {
            if (!channelByNumber(n)) return;
            setChannelNumber((current) => {
                if (current !== n) lastChannel.current = current;
                return n;
            });
            if (!power) setPower(true);
        },
        [power]
    );

    const step = useCallback(
        (delta: number) => {
            playClick();
            direction.current = delta < 0 ? -1 : 1;
            const i = CHANNELS.findIndex((c) => c.number === channelNumber);
            tuneTo(CHANNELS[(i + delta + CHANNELS.length) % CHANNELS.length].number);
        },
        [channelNumber, tuneTo]
    );

    const changeVolume = useCallback((v: number) => {
        const next = clamp01(v);
        setVolumeState(next);
        if (next > 0) setUserMuted(false);
        setVolumeUntil(Date.now() + VOLUME_MS);
    }, []);

    const toggleMute = useCallback(() => {
        playClick();
        setUserMuted((m) => !m);
        setVolumeUntil(0);
    }, []);

    const showInfo = useCallback(() => {
        setBannerUntil(Date.now() + BANNER_MS);
        setNumberUntil(Date.now() + NUMBER_MS);
    }, []);

    const togglePower = () => {
        playClick();
        setPower((on) => {
            if (on) {
                setGuideOpen(false);
                setDigits('');
            }
            setPowerFx(on ? 'off' : 'on');
            return !on;
        });
    };

    const closeGuide = useCallback(() => {
        setGuideOpen(false);
        window.setTimeout(() => guideButtonRef.current?.focus(), 0);
    }, []);

    const tuneFromGuide = useCallback(
        (n: number) => {
            playClick();
            tuneTo(n);
            closeGuide();
        },
        [closeGuide, tuneTo]
    );

    // Typing a channel on the remote: the first digit waits for a second.
    const digitTimer = useRef(0);
    const pressDigit = useCallback(
        (d: string) => {
            playClick();
            window.clearTimeout(digitTimer.current);
            setDigits((prev) => {
                const next = (prev + d).slice(-2);
                const commit = (value: string) => {
                    const n = Number(value);
                    if (channelByNumber(n)) tuneTo(n);
                    setDigits('');
                };
                if (next.length === 2) {
                    window.setTimeout(() => commit(next), 250);
                } else {
                    digitTimer.current = window.setTimeout(() => commit(next), DIGIT_MS);
                }
                return next;
            });
        },
        [tuneTo]
    );
    useEffect(() => () => window.clearTimeout(digitTimer.current), []);

    const recall = useCallback(() => {
        const last = lastChannel.current;
        if (last != null) {
            playClick();
            tuneTo(last);
        }
    }, [tuneTo]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
        deckRef.current?.unlock();
        if (guideOpen) {
            if (e.key === 'g' || e.key === 'G') {
                e.preventDefault();
                closeGuide();
            }
            return;
        }
        if (!power) {
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                togglePower();
            }
            return;
        }
        const handled = (() => {
            if (/^[0-9]$/.test(e.key)) return (pressDigit(e.key), true);
            switch (e.key) {
                case 'ArrowUp':
                case 'PageUp':
                    return (step(1), true);
                case 'ArrowDown':
                case 'PageDown':
                    return (step(-1), true);
                case 'ArrowRight':
                case '+':
                case '=':
                    return (changeVolume(volume + 0.05), true);
                case 'ArrowLeft':
                case '-':
                    return (changeVolume(volume - 0.05), true);
                case 'm':
                case 'M':
                    return (toggleMute(), true);
                case 'g':
                case 'G':
                    return (playClick(), setGuideOpen(true), true);
                case 'i':
                case 'I':
                    return (showInfo(), true);
                case 'l':
                case 'L':
                case 'Backspace':
                    return (recall(), true);
                case 'p':
                case 'P':
                    return (togglePower(), true);
                case ' ':
                    return (deckRef.current?.togglePause(), true);
                default:
                    return false;
            }
        })();
        if (handled) e.preventDefault();
    };

    /* --- publish to the rest of the desktop ---------------------------- */

    const programme = segment?.programme;
    const label = programme ? programmeLabel(programme) : null;
    useEffect(() => {
        setTvState({
            on: power,
            channel: channel.number,
            channelName: channel.name,
            programme: label ?? (channel.kind ? channel.name : null),
            mediaUrl: deck?.mediaUrl ?? null,
            muted,
        });
    }, [power, channel, label, deck?.mediaUrl, muted]);
    useEffect(() => () => clearTvState(), []);
    useEffect(() => {
        if (!power) return;
        const id = window.setInterval(() => {
            const d = deckRef.current;
            if (d) setTvState({ positionSeconds: d.position().at });
        }, 1000);
        return () => window.clearInterval(id);
    }, [power]);

    /* --- what is on ---------------------------------------------------- */

    const position = deckRef.current?.position() ?? { at: 0, length: 0 };
    const next = upNextOf(channel, segment);
    const isVideo = !!programme && (phase === 'playing' || phase === 'tuning');
    const vcr = power && !!programme && !channel.kind && (phase === 'playing' || deck?.shifted);
    const pipAvailable = deckRef.current?.canPictureInPicture() ?? false;

    let nowTitle = channel.name;
    let nowDetail = channel.tagline;
    if (channel.kind) {
        nowTitle = channel.kind === 'weather' ? 'Local Forecast' : channel.name;
    } else if (programme) {
        const ad = segment?.kind === 'ad';
        nowTitle = ad ? 'Commercial break' : (programme.series ?? programme.title);
        nowDetail = ad
            ? programme.title
            : [programme.series ? programme.title : null, programme.year]
                  .filter(Boolean)
                  .join(' · ');
    } else if (segment) {
        nowTitle = 'Station break';
        nowDetail = next ? `Up next: ${programmeLabel(next.programme)}` : '';
    }

    const tapeTitle = channel.kind
        ? channel.kind === 'testCard'
            ? 'Test Card F'
            : nowTitle
        : programme
          ? `${segment?.kind === 'ad' ? 'Commercial: ' : ''}${programmeLabel(programme)}${programme.year ? ` (${programme.year})` : ''}`
          : phase === 'standby'
            ? 'Please stand by'
            : segment
              ? 'Station break'
              : 'Tuning…';
    const progress = position.length ? clamp01(position.at / position.length) : 0;

    /* --- the picture --------------------------------------------------- */

    const card = (() => {
        if (!power) return null;
        if (phase === 'standby') return <StandByCard channel={channel} />;
        if (phase === 'drawn') {
            if (channel.kind === 'testCard') return <TestCard tone={tone} volume={audible} />;
            if (channel.kind === 'listings')
                return <ListingsChannel channels={CHANNELS} now={now} />;
            if (channel.kind === 'weather')
                return <WeatherChannel onReady={() => setWeatherReady(true)} />;
            return null;
        }
        if (phase !== 'card' || !segment) return null;
        switch (segment.kind) {
            case 'ident':
                return <IdentCard key={segment.startsAt} channel={channel} volume={audible} />;
            case 'next':
                return (
                    <UpNextCard
                        key={segment.startsAt}
                        channel={channel}
                        programme={segment.upNext?.programme}
                        at={segment.upNext?.startsAt}
                        short={segment.endsAt - segment.startsAt < 6000}
                    />
                );
            case 'promo':
                return <PromoCard key={segment.startsAt} channel={channel} now={now} />;
            default:
                return null;
        }
    })();

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
            bottomLeftText={power ? `CH ${channel.number} — ${channel.name}` : 'Standby'}
        >
            <TvKeyframes />
            <div
                ref={rootRef}
                tabIndex={-1}
                style={styles.root}
                onKeyDown={onKeyDown}
                onPointerDown={(e) => {
                    deckRef.current?.unlock();
                    const t = e.target as HTMLElement;
                    if (
                        !['INPUT', 'BUTTON', 'A'].includes(t.tagName) &&
                        !t.closest('[role="grid"]')
                    ) {
                        rootRef.current?.focus({ preventScroll: true });
                    }
                }}
            >
                <div style={styles.body}>
                    {/* ---- set ---- */}
                    <div style={styles.setColumn}>
                        <div style={styles.cabinetTop}>
                            <span style={styles.brand}>NOSTALGIVISION</span>
                            <span style={styles.model}>MODEL 95-XT · CABLE READY</span>
                        </div>

                        <div style={styles.tube}>
                            <div
                                style={styles.picture}
                                data-phase={power ? phase : 'off'}
                                data-segment={segment?.kind ?? ''}
                                data-channel={channel.number}
                            >
                                <div
                                    ref={hostRef}
                                    style={{
                                        ...styles.videoHost,
                                        opacity: power && isVideo ? 1 : 0,
                                        filter: `brightness(${0.55 + brightness * 0.9})`,
                                    }}
                                />

                                {card && <div style={styles.cardLayer}>{card}</div>}

                                {power && guideOpen && (
                                    <TvGuide
                                        channels={CHANNELS}
                                        current={channel.number}
                                        now={now}
                                        onTune={tuneFromGuide}
                                        onClose={closeGuide}
                                    />
                                )}

                                {power && <CrtScreen settings={CRT_TELEVISION} absolute />}

                                {power && snowing && <StaticBurst intensity={staticLevel} />}
                                {power && !snowing && deck?.stalled && (
                                    <StaticBurst intensity={staticLevel * 0.35} />
                                )}

                                {/* The station's bug, the way 90s channels marked their picture. */}
                                {power &&
                                    phase === 'playing' &&
                                    segment?.kind === 'programme' &&
                                    !guideOpen && <span style={styles.bug}>{channel.call}</span>}

                                {power && (
                                    <TvOsd
                                        channel={channel}
                                        showNumber={now < numberUntil || snowing}
                                        digits={digits}
                                        showBanner={now < bannerUntil && !guideOpen && !snowing}
                                        segment={segment}
                                        nowTitle={nowTitle}
                                        nowDetail={nowDetail}
                                        next={next}
                                        position={position.at}
                                        length={programme ? position.length : 0}
                                        understudy={!!deck?.understudy}
                                        volume={now < volumeUntil ? (muted ? 0 : volume) : null}
                                        muted={muted}
                                        forcedMute={!!deck?.forcedMute}
                                    />
                                )}

                                {!power && powerFx !== 'off' && <div style={styles.dark} />}
                                {powerFx && (
                                    <div
                                        key={powerFx}
                                        className="tv-moving"
                                        onAnimationEnd={() => setPowerFx(null)}
                                        style={{
                                            ...styles.powerFx,
                                            animation:
                                                powerFx === 'off'
                                                    ? 'tvPowerOff 0.42s ease-in forwards'
                                                    : 'tvPowerOn 0.5s ease-out forwards',
                                        }}
                                    />
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
                                            {power ? tapeTitle : 'Standby'}
                                        </span>
                                        {power && programme && (
                                            <a
                                                href={detailsUrl(programme)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="This tape's page at the Internet Archive"
                                                style={styles.archiveLink}
                                            >
                                                via archive.org
                                            </a>
                                        )}
                                    </div>
                                    {power && programme ? (
                                        <div style={styles.progressRow}>
                                            <div
                                                role="progressbar"
                                                aria-label="Programme progress"
                                                aria-valuemin={0}
                                                aria-valuemax={Math.round(position.length)}
                                                aria-valuenow={Math.round(position.at)}
                                                aria-valuetext={`${clockTime(position.at)} of ${clockTime(position.length)}`}
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
                                                {clockTime(position.at)} /{' '}
                                                {clockTime(position.length)}
                                            </span>
                                        </div>
                                    ) : null}
                                    <span style={styles.tapeMeta}>
                                        {!power
                                            ? 'Press POWER'
                                            : channel.kind === 'testCard'
                                              ? 'COLOUR BARS · 1 kHz'
                                              : next
                                                ? `NEXT ${timeOfDay(next.startsAt)} · ${programmeLabel(next.programme)}`
                                                : `CH ${channel.number} · ${channel.tagline}`}
                                    </span>
                                </div>
                                <div style={styles.reel} />
                            </div>

                            <div style={styles.transport}>
                                <DeckButton
                                    title={
                                        deck?.shifted
                                            ? 'Rejoin the broadcast'
                                            : 'Watching the broadcast live'
                                    }
                                    disabled={!power || !deck?.shifted}
                                    onClick={() => {
                                        playClick();
                                        deckRef.current?.goLive();
                                    }}
                                >
                                    <span
                                        style={{
                                            ...styles.liveDot,
                                            ...(power && !deck?.shifted && phase !== 'standby'
                                                ? styles.liveDotOn
                                                : null),
                                        }}
                                    />
                                    LIVE
                                </DeckButton>
                                <DeckButton
                                    title="Back 15 seconds"
                                    disabled={!vcr}
                                    onClick={() => {
                                        playClick();
                                        deckRef.current?.seek(-15);
                                    }}
                                >
                                    ◀◀
                                </DeckButton>
                                <DeckButton
                                    title={deck?.paused ? 'Play' : 'Pause'}
                                    disabled={!vcr}
                                    wide
                                    onClick={() => {
                                        playClick();
                                        deckRef.current?.togglePause();
                                    }}
                                >
                                    {deck?.paused ? '▶' : '❚❚'}
                                </DeckButton>
                                <DeckButton
                                    title="Forward 15 seconds"
                                    disabled={!vcr}
                                    onClick={() => {
                                        playClick();
                                        deckRef.current?.seek(15);
                                    }}
                                >
                                    ▶▶
                                </DeckButton>
                                <DeckButton
                                    title={
                                        pipAvailable
                                            ? 'Picture in Picture'
                                            : 'Picture in Picture is unavailable in this browser'
                                    }
                                    disabled={!vcr || !pipAvailable}
                                    wide
                                    onClick={() => {
                                        playClick();
                                        deckRef.current?.togglePictureInPicture().catch(() => undefined);
                                    }}
                                >
                                    PiP
                                </DeckButton>
                                {channel.kind === 'testCard' && (
                                    <DeckButton
                                        title="1 kHz reference tone"
                                        disabled={!power}
                                        pressed={tone}
                                        onClick={() => {
                                            playClick();
                                            setTone((t) => !t);
                                        }}
                                    >
                                        TONE
                                    </DeckButton>
                                )}
                            </div>
                        </div>

                        {/* ---- knobs ---- */}
                        <div
                            style={{
                                ...styles.knobRow,
                                ...(narrow ? styles.knobRowNarrow : null),
                            }}
                        >
                            <button
                                type="button"
                                onClick={togglePower}
                                title={power ? 'Switch off (P)' : 'Switch on (P)'}
                                style={styles.power}
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
                                    title="Channel down (↓)"
                                    disabled={!power}
                                    onClick={() => step(-1)}
                                >
                                    ▼
                                </DeckButton>
                                <span style={styles.chReadout}>
                                    {digits
                                        ? digits.padEnd(2, '-')
                                        : String(channel.number).padStart(2, '0')}
                                </span>
                                <DeckButton
                                    title="Channel up (↑)"
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
                                title="Programme guide (G)"
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
                            <button
                                type="button"
                                disabled={!power}
                                title="What's on (I)"
                                onClick={() => {
                                    playClick();
                                    showInfo();
                                }}
                                style={{
                                    ...styles.power,
                                    ...(!power ? deckStyles.buttonDisabled : null),
                                }}
                            >
                                INFO
                            </button>
                            <button
                                type="button"
                                disabled={!power}
                                aria-pressed={userMuted}
                                title="Mute (M)"
                                onClick={toggleMute}
                                style={{
                                    ...styles.power,
                                    ...(userMuted ? styles.pressed : null),
                                    ...(!power ? deckStyles.buttonDisabled : null),
                                }}
                            >
                                MUTE
                            </button>

                            <Knob
                                label="VOLUME"
                                value={volume}
                                disabled={!power}
                                onChange={changeVolume}
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

                    {/* ---- printed channel card ---- */}
                    {!narrow && (
                        <div style={styles.guide}>
                            <div style={styles.guideHead}>
                                <span style={styles.guideTitle}>CHANNEL LINEUP</span>
                                <span style={styles.guideClock}>{timeOfDay(now)}</span>
                            </div>
                            <div style={styles.guideList}>
                                {CHANNELS.map((c) => {
                                    const active = c.number === channel.number;
                                    return (
                                        <div
                                            key={c.number}
                                            role="button"
                                            tabIndex={0}
                                            aria-current={active ? 'true' : undefined}
                                            title={c.tagline}
                                            onClick={() => {
                                                if (active && power) return;
                                                playClick();
                                                tuneTo(c.number);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key !== 'Enter' && e.key !== ' ') return;
                                                e.preventDefault();
                                                e.stopPropagation();
                                                tuneTo(c.number);
                                            }}
                                            style={{
                                                ...styles.guideRow,
                                                ...(active ? styles.guideRowActive : null),
                                            }}
                                        >
                                            <span
                                                style={{
                                                    ...styles.guideNum,
                                                    ...(active ? styles.guideNumActive : null),
                                                }}
                                            >
                                                {String(c.number).padStart(2, '0')}
                                            </span>
                                            <span style={styles.guideText}>
                                                <span
                                                    style={{
                                                        ...styles.guideName,
                                                        ...(active ? styles.guideNameActive : null),
                                                    }}
                                                >
                                                    {c.name}
                                                </span>
                                                <span
                                                    style={{
                                                        ...styles.guideTag,
                                                        ...(active ? styles.guideTagActive : null),
                                                    }}
                                                >
                                                    {nowLine(c, now)}
                                                </span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={styles.guideFoot}>
                                <span style={styles.guideFootText}>
                                    ↑↓ channel · 0–9 enter · ←→ volume · M mute · G guide · I info ·
                                    L last
                                </span>
                                <span style={styles.guideFootText}>
                                    Tapes from the Internet Archive, on its bandwidth.{' '}
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
                    )}
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
        // `width: 0` as well as `minWidth: 0`: without it the set's minimum
        // content width (about 780px) props the window's inner boxes open on
        // a phone, and the right half of the set is clipped off-screen.
        width: 0,
        minWidth: 0,
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: Colors.lightGray,
        overflow: 'hidden',
        outline: 'none',
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
        isolation: 'isolate',
    },
    videoHost: { position: 'absolute', inset: 0, zIndex: 0 },
    cardLayer: {
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        flexDirection: 'column',
    },
    dark: { position: 'absolute', inset: 0, background: '#050505', zIndex: 30 },
    powerFx: {
        position: 'absolute',
        inset: 0,
        zIndex: 31,
        background: '#e8f0ff',
        pointerEvents: 'none',
        transformOrigin: '50% 50%',
    },
    bug: {
        position: 'absolute',
        right: 14,
        bottom: 12,
        zIndex: 8,
        fontFamily: 'MillenniumBold, Millennium, sans-serif',
        fontSize: 11,
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.5)',
        textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
        pointerEvents: 'none',
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
        gap: 7,
        padding: '6px 8px',
        background: PLASTIC,
        border: '2px solid #fff',
        borderRightColor: '#8a8272',
        borderBottomColor: '#8a8272',
    },
    knobRowNarrow: { flexWrap: 'wrap', rowGap: 6 },
    power: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flex: 'none',
        padding: '5px 7px',
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
    powerDotOn: { background: '#ff3b30', boxShadow: '0 0 5px #ff3b30' },
    chGroup: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 'none' },
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    guideTitle: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        letterSpacing: 1,
        color: '#fff',
    },
    guideClock: { fontFamily: 'MSSerif', fontSize: 10, color: '#f5c518' },
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
        padding: '4px 7px',
        cursor: 'pointer',
        borderBottom: '1px solid #e2e2e2',
        flex: 'none',
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
    // `display: flex` is load-bearing: this is a <span>, which `div { display: flex }` does not reach.
    guideText: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        gap: 1,
        flex: 1,
    },
    guideName: { fontFamily: 'MSSerif', fontSize: 11, color: '#000' },
    guideNameActive: { color: '#fff' },
    guideTag: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: '#555',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    guideTagActive: { color: '#b8c4e8' },
    guideFoot: {
        padding: '4px 8px',
        flex: 'none',
        flexDirection: 'column',
        gap: 3,
        borderTop: `1px solid ${Colors.darkGray}`,
    },
    guideFootText: { fontFamily: 'MSSerif', fontSize: 9, color: '#444' },
    guideFootLink: { color: '#000080' },
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
        minWidth: 34,
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
