import React from 'react';
import { Channel } from './channels';
import { Segment, Programme, programmeLabel } from './tvSchedule';

/**
 * The set's on-screen display.
 * ----------------------------
 * The green characters a 1990s television printed over the picture: the
 * channel number in the corner when you change channel, a volume bar, MUTE,
 * the digits as you type a channel on the remote. Plus the one thing sets of
 * the period did not have and cable boxes did: an info banner with what is
 * on, how far in it is and what comes next — the strip every channel change on
 * Pluto TV or FieldStation42 brings up for a few seconds.
 */

const GREEN = '#43ff5a';

const clock = (s: number): string => {
    const t = Math.max(0, Math.floor(s));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const ss = String(t % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

const timeOfDay = (t: number): string =>
    new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export interface OsdProps {
    channel: Channel;
    /** Show the big channel number. */
    showNumber: boolean;
    /** Digits typed so far, if a channel is being entered. */
    digits: string;
    /** Show the info banner. */
    showBanner: boolean;
    segment: Segment | null;
    /** What the banner calls the thing on now (drawn channels have no segment). */
    nowTitle: string;
    nowDetail: string;
    next: { programme: Programme; startsAt: number } | null;
    position: number;
    length: number;
    understudy: boolean;
    /** Show the volume bar, at this level. */
    volume: number | null;
    muted: boolean;
    /** Sound was refused by the browser until a click. */
    forcedMute: boolean;
}

const TvOsd: React.FC<OsdProps> = ({
    channel,
    showNumber,
    digits,
    showBanner,
    nowTitle,
    nowDetail,
    next,
    position,
    length,
    understudy,
    volume,
    muted,
    forcedMute,
}) => {
    const progress = length ? Math.min(1, Math.max(0, position / length)) : 0;
    return (
        <div style={s.root} aria-hidden="true">
            {(showNumber || digits) && (
                <div style={s.number}>
                    <span style={s.numberText}>{digits ? digits.padEnd(2, '-') : channel.number}</span>
                    {!digits && <span style={s.numberCall}>{channel.call}</span>}
                </div>
            )}

            {muted && <span style={s.mute}>MUTE</span>}

            {volume !== null && (
                <div style={s.volume}>
                    <span style={s.volumeLabel}>VOLUME</span>
                    <div style={s.volumeBars}>
                        {Array.from({ length: 20 }, (_, i) => (
                            <span
                                key={i}
                                style={{ ...s.volumeBar, background: i < Math.round(volume * 20) ? GREEN : 'rgba(67,255,90,0.18)' }}
                            />
                        ))}
                    </div>
                    <span style={s.volumeLabel}>{Math.round(volume * 100)}</span>
                </div>
            )}

            {forcedMute && !muted && <span style={s.hint}>CLICK THE SET FOR SOUND</span>}

            {showBanner && (
                <div style={s.banner}>
                    <div style={{ ...s.bannerChannel, background: channel.colour }}>
                        <span style={s.bannerNum}>{channel.number}</span>
                        <span style={s.bannerCall}>{channel.call}</span>
                    </div>
                    <div style={s.bannerBody}>
                        <span style={s.bannerTitle}>
                            {understudy ? 'PROGRAMME CHANGE · ' : ''}
                            {nowTitle}
                        </span>
                        {nowDetail && <span style={s.bannerDetail}>{nowDetail}</span>}
                        {length > 0 && (
                            <div style={s.bannerProgressRow}>
                                <div style={s.bannerTrack}>
                                    <div style={{ ...s.bannerFill, width: `${progress * 100}%` }} />
                                </div>
                                <span style={s.bannerTime}>
                                    {clock(position)} / {clock(length)}
                                </span>
                            </div>
                        )}
                        {next && (
                            <span style={s.bannerNext}>
                                NEXT {timeOfDay(next.startsAt)} · {programmeLabel(next.programme)}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const glow = `0 0 4px rgba(67,255,90,0.75), 2px 2px 0 rgba(0,0,0,0.85)`;

const s: StyleSheetCSS = {
    root: { position: 'absolute', inset: 0, zIndex: 21, pointerEvents: 'none' },
    number: {
        position: 'absolute',
        top: 14,
        right: 18,
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    numberText: {
        fontFamily: 'Terminal, monospace',
        fontSize: 40,
        lineHeight: 1,
        color: GREEN,
        textShadow: glow,
        letterSpacing: 2,
    },
    numberCall: { fontFamily: 'Terminal, monospace', fontSize: 13, color: GREEN, textShadow: glow, letterSpacing: 1 },
    mute: {
        position: 'absolute',
        top: 16,
        left: 20,
        fontFamily: 'Terminal, monospace',
        fontSize: 18,
        color: GREEN,
        textShadow: glow,
        letterSpacing: 2,
    },
    volume: {
        position: 'absolute',
        left: '50%',
        bottom: 28,
        transform: 'translateX(-50%)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    volumeLabel: { fontFamily: 'Terminal, monospace', fontSize: 14, color: GREEN, textShadow: glow, letterSpacing: 1 },
    volumeBars: { flexDirection: 'row', gap: 2 },
    volumeBar: { display: 'block', width: 6, height: 14, boxShadow: '1px 1px 0 rgba(0,0,0,0.7)' },
    hint: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 12,
        textAlign: 'center',
        fontFamily: 'Terminal, monospace',
        fontSize: 12,
        color: GREEN,
        textShadow: glow,
        letterSpacing: 1,
    },
    banner: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 14,
        flexDirection: 'row',
        minHeight: 58,
        background: 'rgba(6, 12, 48, 0.86)',
        border: '1px solid rgba(160, 180, 255, 0.55)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
    },
    bannerChannel: {
        width: 58,
        flex: 'none',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
    },
    bannerNum: { fontFamily: 'MillenniumBold, Millennium, sans-serif', fontSize: 24, color: '#fff', lineHeight: 1 },
    bannerCall: { fontFamily: 'Millennium, sans-serif', fontSize: 9, letterSpacing: 1, color: '#fff' },
    bannerBody: { flex: 1, minWidth: 0, flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '5px 10px' },
    bannerTitle: {
        display: 'block',
        fontFamily: 'MillenniumBold, Millennium, sans-serif',
        fontSize: 13,
        color: '#fff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    bannerDetail: {
        display: 'block',
        fontFamily: 'Millennium, sans-serif',
        fontSize: 10,
        color: '#c2ccf5',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    bannerProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    bannerTrack: { flex: 1, height: 4, background: 'rgba(255,255,255,0.18)' },
    bannerFill: { height: '100%', background: '#f5c518' },
    bannerTime: { fontFamily: 'Millennium, monospace', fontSize: 9, color: '#e0e6ff', flex: 'none' },
    bannerNext: {
        display: 'block',
        fontFamily: 'Millennium, sans-serif',
        fontSize: 9,
        letterSpacing: 1,
        color: '#f5c518',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
};

export default TvOsd;
