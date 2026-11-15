import React, { useEffect, useMemo, useState } from 'react';
import { Channel, WEATHER_URL } from './channels';
import {
    Block,
    blockLabel,
    listings,
    Programme,
    programmeLabel,
    segmentAt,
    thumbUrl,
    upcoming,
} from './tvSchedule';
import { playTvJingle } from './sounds';

/**
 * Everything the television draws instead of playing.
 * ---------------------------------------------------
 * Station idents, the cards in a break, the test card, the listings channel
 * and the weather. All of it renders inside the tube, under the same glass as
 * the tapes, so a break looks like the station rather than like the website.
 *
 * Fonts: `Millennium` for anything a character generator would have set, and
 * Arial Black for the listings, which is close to what Prevue's Amiga printed.
 */

/** US style, like the taskbar clock: this is an American cable package. */
const timeOfDay = (t: number): string =>
    new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** Keyframes, once, for every screen below. Names are prefixed to stay out of the desktop's way. */
export const TvKeyframes: React.FC = () => (
    <style>{`
@keyframes tvIdentIn { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1); } }
@keyframes tvSweep { 0% { transform: translateX(-120%) skewX(-20deg); } 100% { transform: translateX(260%) skewX(-20deg); } }
@keyframes tvRise { 0% { transform: translateY(12px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
@keyframes tvScroll { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
@keyframes tvBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.25; } }
@keyframes tvPowerOff { 0% { transform: scale(1, 1); filter: brightness(1); } 55% { transform: scale(1, 0.006); filter: brightness(3); } 100% { transform: scale(0, 0.006); filter: brightness(5); } }
@keyframes tvPowerOn { 0% { transform: scale(0, 0.006); opacity: 1; } 45% { transform: scale(1, 0.006); opacity: 1; } 100% { transform: scale(1, 1); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .tv-moving { animation: none !important; } }
`}</style>
);

/* -------------------------------------------------------------------------
 * The breaks
 * ---------------------------------------------------------------------- */

/** The channel's ident: its number in its colour, its name, and a sting. */
export const IdentCard: React.FC<{ channel: Channel; volume: number }> = ({ channel, volume }) => {
    useEffect(() => {
        playTvJingle(channel.number, volume);
        // Once per ident, not every time the volume knob moves.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channel.number]);
    return (
        <div
            style={{
                ...s.fill,
                background: `radial-gradient(ellipse at 50% 45%, ${channel.colour} 0%, #050508 75%)`,
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
            }}
        >
            <div className="tv-moving" style={{ ...s.identLogo, animation: 'tvIdentIn 0.7s ease-out both' }}>
                <div style={{ ...s.identNumber, background: channel.colour }}>
                    <span style={s.identNumberText}>{channel.number}</span>
                    <div className="tv-moving" style={{ ...s.sweep, animation: 'tvSweep 1.6s ease-in-out 0.5s both' }} />
                </div>
                <div style={s.identWords}>
                    <span style={s.identCall}>{channel.call}</span>
                    <span style={s.identName}>{channel.name}</span>
                </div>
            </div>
            <span style={s.network}>NOSTALGIVISION CABLE</span>
        </div>
    );
};

/** "Up next", with what and when. */
export const UpNextCard: React.FC<{ channel: Channel; programme?: Programme; at?: number; short?: boolean }> = ({
    channel,
    programme,
    at,
    short,
}) => (
    <div style={{ ...s.fill, ...s.cardBg, justifyContent: 'center', padding: short ? '0 8%' : '0 9%' }}>
        <div style={{ ...s.stripe, background: channel.colour }} />
        <div className="tv-moving" style={{ flexDirection: 'column', gap: 6, animation: 'tvRise 0.45s ease-out both' }}>
            <span style={s.cardKicker}>{short ? 'NEXT' : 'UP NEXT'}</span>
            {programme ? (
                <>
                    <span style={{ ...s.cardTitle, fontSize: short ? 17 : 21 }}>
                        {programme.series && programme.series !== programme.title ? programme.series : programme.title}
                    </span>
                    {programme.series && programme.series !== programme.title && (
                        <span style={s.cardSub}>{programme.title}</span>
                    )}
                    <span style={s.cardMeta}>
                        {[programme.year, at && !short ? `at ${timeOfDay(at)}` : null].filter(Boolean).join(' · ')}
                    </span>
                </>
            ) : (
                <span style={s.cardTitle}>{channel.name}</span>
            )}
        </div>
        <span style={s.cardCall}>{channel.call}</span>
    </div>
);

/** "Coming up on 8": the next three listings. Fills a long break with no commercials. */
export const PromoCard: React.FC<{ channel: Channel; now: number }> = ({ channel, now }) => {
    const items = useMemo(() => upcoming(channel, now, 3), [channel, Math.floor(now / 60000)]); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <div style={{ ...s.fill, ...s.cardBg, justifyContent: 'center', padding: '0 8%' }}>
            <div style={{ ...s.stripe, background: channel.colour }} />
            <span style={s.cardKicker}>COMING UP ON {channel.number}</span>
            <div style={{ flexDirection: 'column', gap: 7, marginTop: 10 }}>
                {items.map((b, i) => {
                    const label = blockLabel(b, channel);
                    return (
                        <div
                            key={b.slot}
                            className="tv-moving"
                            style={{ ...s.promoRow, animation: `tvRise 0.4s ease-out ${0.15 * i}s both` }}
                        >
                            <span style={s.promoTime}>{timeOfDay(b.startsAt)}</span>
                            <span style={s.promoText}>
                                <span style={s.promoTitle}>{label.title}</span>
                                {label.detail && <span style={s.promoDetail}>{label.detail}</span>}
                            </span>
                        </div>
                    );
                })}
            </div>
            <span style={s.cardCall}>{channel.call}</span>
        </div>
    );
};

/** Technical difficulties: what a station showed when the tape machine died. */
export const StandByCard: React.FC<{ channel: Channel | null }> = ({ channel }) => (
    <div style={{ ...s.fill, background: '#101018', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...s.bars, opacity: 0.35 }} />
        <div style={s.standBy}>
            <span style={s.standByTitle}>PLEASE STAND BY</span>
            <span style={s.standBySub}>WE ARE EXPERIENCING TECHNICAL DIFFICULTIES</span>
            {channel && <span style={s.standByCall}>{channel.call} · CHANNEL {channel.number}</span>}
        </div>
    </div>
);

/* -------------------------------------------------------------------------
 * Channel 2: the test card
 * ---------------------------------------------------------------------- */

/**
 * Drawn rather than streamed. The tone is off until asked for: a 1 kHz sine
 * that starts by itself the moment somebody lands on channel 2 is authentic
 * and completely intolerable.
 */
export const TestCard: React.FC<{ tone: boolean; volume: number }> = ({ tone, volume }) => {
    useEffect(() => {
        if (!tone || volume <= 0) return;
        let ctx: AudioContext | null = null;
        let osc: OscillatorNode | null = null;
        try {
            const Ctor = window.AudioContext || (window as any).webkitAudioContext;
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

    return (
        <div style={{ ...s.fill, flexDirection: 'column', background: '#101010' }}>
            <div style={{ ...s.barsTop }} />
            <div style={{ flex: 1, minHeight: 0, justifyContent: 'center', alignItems: 'center' }}>
                <div style={s.plate}>
                    <span style={s.plateText}>NOSTALGIVISION</span>
                    <span style={s.plateSub}>TRANSMISSION RESUMES AT 06:00</span>
                </div>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------
 * Channel 3: listings
 * ---------------------------------------------------------------------- */

const HALF_HOUR = 30 * 60 * 1000;
const ROW_H = 26;
/** Seconds each row spends crossing the screen; Prevue moved at about this pace. */
const ROW_SECONDS = 2.4;

/**
 * The scrolling guide, as cable systems ran it on a channel of its own: the
 * clock and a rotating promo on top, every channel's next ninety minutes
 * crawling up underneath. It is the screen FieldStation42 and Television
 * Simulator '99 are both built around, and the one people remember.
 */
export const ListingsChannel: React.FC<{ channels: Channel[]; now: number }> = ({ channels, now }) => {
    const from = Math.floor(now / HALF_HOUR) * HALF_HOUR;
    const to = from + 3 * HALF_HOUR;
    const listed = useMemo(
        () => channels.filter((c) => c.kind !== 'testCard').map((c) => ({ channel: c, blocks: listings(c, from, to) })),
        [channels, from, to]
    );

    // The promo panel walks through what is on now, one channel at a time.
    const promos = useMemo(
        () =>
            listed
                .map(({ channel, blocks }) => ({ channel, block: blocks.find((b) => b.endsAt > now) ?? blocks[0] }))
                .filter((p): p is { channel: Channel; block: Block } => !!p.block),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [listed]
    );
    const promo = promos.length ? promos[Math.floor(now / 8000) % promos.length] : null;
    const promoLabel = promo ? blockLabel(promo.block, promo.channel) : null;
    const promoOn = promo ? promo.block.startsAt <= now : false;
    const [thumbOk, setThumbOk] = useState(true);
    const thumbFor = promo?.block.programmes[0];
    useEffect(() => setThumbOk(true), [thumbFor?.id]);

    const date = new Date(now);
    const span = to - from;
    const duration = Math.max(20, listed.length * ROW_SECONDS);

    const rows = listed.map(({ channel, blocks }) => (
        <div key={channel.number} style={s.lRow}>
            <div style={s.lChannel}>
                <span style={s.lNum}>{channel.number}</span>
                <span style={s.lCall}>{channel.call}</span>
            </div>
            <div style={s.lTrack}>
                {blocks.length === 0 ? (
                    <div style={{ ...s.lCell, left: 0, width: '100%' }}>
                        <span style={s.lCellText}>{channel.kind === 'weather' ? 'Local Forecast' : channel.name}</span>
                    </div>
                ) : (
                    blocks.map((b) => {
                        const left = Math.max(b.startsAt, from);
                        const right = Math.min(b.endsAt, to);
                        return (
                            <div
                                key={b.slot}
                                style={{
                                    ...s.lCell,
                                    left: `${((left - from) / span) * 100}%`,
                                    width: `${((right - left) / span) * 100}%`,
                                }}
                            >
                                <span style={s.lCellText}>{blockLabel(b, channel).title}</span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    ));

    return (
        <div style={{ ...s.fill, flexDirection: 'column', background: '#0c1a6e' }}>
            <div style={s.lTop}>
                <div style={s.lClockPanel}>
                    <span style={s.lBrand}>NOSTALGIVISION</span>
                    <span style={s.lClock}>{timeOfDay(now)}</span>
                    <span style={s.lDate}>
                            {date
                            .toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                            .toUpperCase()}
                    </span>
                </div>
                {promo && promoLabel && (
                    <div key={`${promo.channel.number}:${promo.block.slot}`} className="tv-moving" style={{ ...s.lPromo, animation: 'tvRise 0.5s ease-out both' }}>
                        {thumbFor && thumbOk && (
                            <img
                                src={thumbUrl(thumbFor)}
                                alt=""
                                onError={() => setThumbOk(false)}
                                style={s.lThumb}
                            />
                        )}
                        <div style={{ flexDirection: 'column', minWidth: 0, flex: 1, gap: 2 }}>
                            <span style={s.lPromoKicker}>
                                {promoOn ? 'NOW' : timeOfDay(promo.block.startsAt)} ON {promo.channel.number} {promo.channel.call}
                            </span>
                            <span style={s.lPromoTitle}>{promoLabel.title}</span>
                            {promoLabel.detail && <span style={s.lPromoDetail}>{promoLabel.detail}</span>}
                        </div>
                    </div>
                )}
            </div>
            <div style={s.lHead}>
                <div style={{ width: 70, flex: 'none' }} />
                <div style={{ flex: 1, position: 'relative' }}>
                    {[0, 1, 2].map((i) => (
                        <span key={i} style={{ ...s.lHeadTime, left: `${(i / 3) * 100}%` }}>
                            {timeOfDay(from + i * HALF_HOUR)}
                        </span>
                    ))}
                </div>
            </div>
            {/* A column: in the desktop's default row direction the rows
                shrink to their channel boxes and the listings vanish. */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', flexDirection: 'column' }}>
                <div
                    className="tv-moving"
                    style={{
                        flexDirection: 'column',
                        animation: `tvScroll ${duration}s linear infinite`,
                    }}
                >
                    {rows}
                    {rows.map((r) => React.cloneElement(r, { key: `again-${r.key}` }))}
                </div>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------
 * Channel 17: the weather
 * ---------------------------------------------------------------------- */

/**
 * The WeatherStar 4000+ in a frame (see `WEATHER_URL` in channels.ts). It is
 * a broadcast, not an app: the frame takes no pointer events, so nobody can
 * open its settings from the sofa. No referrer is sent.
 */
export const WeatherChannel: React.FC<{ onReady: () => void }> = ({ onReady }) => (
    <iframe
        title="Weather Star"
        src={WEATHER_URL}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
        onLoad={() => window.setTimeout(onReady, 1800)}
        style={{ ...s.fill, width: '100%', height: '100%', border: 0, pointerEvents: 'none', background: '#000' }}
    />
);

/** What is on a channel now, in a few words, for the printed channel list. */
export const nowLine = (channel: Channel, now: number): string => {
    if (channel.kind === 'testCard') return 'Off the air';
    if (channel.kind === 'listings') return "What's on, scrolling";
    if (channel.kind === 'weather') return 'Local forecast, Redmond WA';
    const seg = segmentAt(channel, now);
    if (!seg) return channel.tagline;
    if (seg.kind === 'programme' && seg.programme) return programmeLabel(seg.programme);
    if (seg.kind === 'ad') return 'Commercial break';
    return seg.upNext ? `Next: ${programmeLabel(seg.upNext.programme)}` : 'Station break';
};

/* -------------------------------------------------------------------------
 * Styles
 * ---------------------------------------------------------------------- */

const SMPTE = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
const barStops = SMPTE.map((c, i) => `${c} ${(i / 7) * 100}% ${((i + 1) / 7) * 100}%`).join(', ');

const s: StyleSheetCSS = {
    fill: { position: 'absolute', inset: 0, flexDirection: 'column', boxSizing: 'border-box' },

    identLogo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    identNumber: {
        position: 'relative',
        overflow: 'hidden',
        width: 92,
        height: 92,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 0 0 4px rgba(255,255,255,0.85), 0 6px 24px rgba(0,0,0,0.6)',
    },
    identNumberText: {
        fontFamily: 'MillenniumBold, Millennium, sans-serif',
        fontSize: 58,
        color: '#fff',
        textShadow: '0 3px 0 rgba(0,0,0,0.35)',
        lineHeight: 1,
    },
    sweep: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '40%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)',
    },
    identWords: { flexDirection: 'column', gap: 4 },
    identCall: {
        fontFamily: 'MillenniumBold, Millennium, sans-serif',
        fontSize: 30,
        letterSpacing: 3,
        color: '#fff',
        textShadow: '0 2px 0 rgba(0,0,0,0.5)',
    },
    identName: {
        fontFamily: 'Millennium, sans-serif',
        fontSize: 13,
        letterSpacing: 2,
        color: '#e8e8f0',
        textTransform: 'uppercase',
    },
    network: {
        position: 'absolute',
        bottom: 16,
        fontFamily: 'Millennium, sans-serif',
        fontSize: 10,
        letterSpacing: 4,
        color: 'rgba(255,255,255,0.55)',
    },

    cardBg: { background: 'linear-gradient(160deg, #0e1640 0%, #060914 100%)' },
    stripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 10 },
    cardKicker: {
        fontFamily: 'MillenniumBold, Millennium, sans-serif',
        fontSize: 13,
        letterSpacing: 4,
        color: '#f5c518',
    },
    cardTitle: {
        fontFamily: 'MillenniumBold, Millennium, sans-serif',
        color: '#fff',
        lineHeight: 1.15,
        fontSize: 21,
    },
    cardSub: { fontFamily: 'Millennium, sans-serif', fontSize: 14, color: '#d4dcff' },
    cardMeta: { fontFamily: 'Millennium, sans-serif', fontSize: 12, color: '#9aa6d8', letterSpacing: 1 },
    cardCall: {
        position: 'absolute',
        right: 18,
        bottom: 14,
        fontFamily: 'MillenniumBold, Millennium, sans-serif',
        fontSize: 13,
        letterSpacing: 2,
        color: 'rgba(255,255,255,0.6)',
    },
    promoRow: { flexDirection: 'row', gap: 12, alignItems: 'baseline' },
    promoTime: {
        fontFamily: 'MillenniumBold, Millennium, sans-serif',
        fontSize: 14,
        color: '#f5c518',
        minWidth: 62,
        flex: 'none',
    },
    promoText: { display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 },
    promoTitle: { display: 'block', fontFamily: 'MillenniumBold, Millennium, sans-serif', fontSize: 15, color: '#fff' },
    promoDetail: {
        display: 'block',
        fontFamily: 'Millennium, sans-serif',
        fontSize: 11,
        color: '#b9c3ee',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },

    bars: { position: 'absolute', inset: 0, background: `linear-gradient(to right, ${barStops})` },
    barsTop: { flex: 3, minHeight: 0, background: `linear-gradient(to right, ${barStops})` },
    standBy: {
        position: 'relative',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 20px',
        background: 'rgba(0,0,0,0.78)',
        border: '2px solid #e8e8e8',
    },
    standByTitle: { fontFamily: 'MillenniumBold, Millennium, sans-serif', fontSize: 22, letterSpacing: 3, color: '#fff' },
    standBySub: { fontFamily: 'Millennium, sans-serif', fontSize: 10, letterSpacing: 2, color: '#cfcfcf', textAlign: 'center' },
    standByCall: { fontFamily: 'Millennium, sans-serif', fontSize: 10, letterSpacing: 2, color: '#f5c518' },
    plate: { flexDirection: 'column', alignItems: 'center', gap: 3, padding: '5px 14px', border: '1px solid #6a6a6a' },
    plateText: { fontFamily: 'Millennium, monospace', fontSize: 14, letterSpacing: 3, color: '#e8e8e8' },
    plateSub: { fontFamily: 'MSSerif', fontSize: 9, letterSpacing: 1, color: '#8a8a8a' },

    lTop: {
        flex: 'none',
        height: '38%',
        flexDirection: 'row',
        gap: 10,
        padding: '12px 14px 8px',
        boxSizing: 'border-box',
        background: 'linear-gradient(180deg, #16288c 0%, #0c1a6e 100%)',
    },
    lClockPanel: { flexDirection: 'column', justifyContent: 'center', flex: 'none', width: '36%', gap: 2 },
    lBrand: { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: 11, letterSpacing: 2, color: '#f5c518' },
    lClock: {
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: 30,
        color: '#fff',
        textShadow: '2px 2px 0 #000',
        lineHeight: 1.05,
    },
    lDate: { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: 10, color: '#c8d0ff', letterSpacing: 1 },
    lPromo: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        padding: 6,
        background: 'rgba(0,0,0,0.35)',
        border: '2px solid #5a74e6',
        borderRadius: 4,
        overflow: 'hidden',
    },
    lThumb: { height: '100%', maxHeight: 92, aspectRatio: '4 / 3', objectFit: 'cover', flex: 'none', border: '1px solid #000' },
    lPromoKicker: { display: 'block', fontFamily: '"Arial Black", Arial, sans-serif', fontSize: 10, color: '#f5c518' },
    lPromoTitle: {
        display: 'block',
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: 14,
        color: '#fff',
        textShadow: '1px 1px 0 #000',
        lineHeight: 1.15,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    lPromoDetail: {
        display: 'block',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fontSize: 10,
        color: '#d7ddff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    lHead: {
        flex: 'none',
        flexDirection: 'row',
        height: 18,
        background: '#f5c518',
        borderTop: '2px solid #000',
        borderBottom: '2px solid #000',
    },
    lHeadTime: {
        position: 'absolute',
        top: 1,
        paddingLeft: 4,
        fontFamily: '"Arial Black", Arial, sans-serif',
        fontSize: 11,
        color: '#0c1a6e',
    },
    lRow: {
        flex: 'none',
        flexDirection: 'row',
        height: ROW_H,
        borderBottom: '2px solid #07104a',
    },
    lChannel: {
        width: 70,
        flex: 'none',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        padding: '0 5px',
        boxSizing: 'border-box',
        background: '#2440c0',
        borderRight: '2px solid #07104a',
    },
    lNum: { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: 13, color: '#f5c518', textShadow: '1px 1px 0 #000' },
    lCall: { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: 10, color: '#fff', textShadow: '1px 1px 0 #000' },
    lTrack: { flex: 1, minWidth: 0, position: 'relative', background: '#1a2f9e' },
    lCell: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        alignItems: 'center',
        padding: '0 5px',
        boxSizing: 'border-box',
        borderLeft: '2px solid #07104a',
        overflow: 'hidden',
    },
    lCellText: {
        display: 'block',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fontSize: 11,
        color: '#fff',
        textShadow: '1px 1px 0 #000',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
};
