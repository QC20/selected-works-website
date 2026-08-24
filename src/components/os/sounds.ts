/**
 * The machine's sounds.
 * ---------------------
 * Synthesised with the Web Audio API rather than loaded as files. Three
 * reasons, in order of how much they mattered:
 *
 *  - A menu tick is perhaps 15 milliseconds of a square wave. Shipping that as
 *    a .wav costs a request and a few kilobytes to reproduce something an
 *    oscillator does exactly.
 *  - Browsers refuse to start an AudioContext until the user has interacted
 *    with the page. Every sound here is triggered *by* a click or a keypress,
 *    so the context is always resumed inside the gesture that needs it.
 *  - The sounds a Windows 95 machine actually made were synthesised on the
 *    sound card in much the same way, out of a handful of tones.
 *
 * Everything is muted through the speaker in the system tray, which is a real
 * control now rather than a picture of one, and the choice is remembered.
 */

import { useEffect, useState } from 'react';

const MUTE_KEY = 'sound.muted.v1';

let muted: boolean = load();
const listeners = new Set<() => void>();

function load(): boolean {
    try {
        return localStorage.getItem(MUTE_KEY) === '1';
    } catch {
        return false;
    }
}

export function isMuted(): boolean {
    return muted;
}

export function setMuted(next: boolean): void {
    muted = next;
    try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
    } catch {
        /* storage disabled — the choice just won't survive a reload */
    }
    listeners.forEach((fn) => fn());
}

export function toggleMuted(): void {
    setMuted(!muted);
}

/** Subscribes a component to the mute setting (see `theme.ts` for the pattern). */
export function useMuted(): boolean {
    const [, forceRender] = useState(0);
    useEffect(() => {
        const listener = () => forceRender((n) => n + 1);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return muted;
}

/**
 * One context for the whole desktop, created on the first sound rather than at
 * import time — a context built before any user gesture starts out suspended
 * and some browsers log a warning about it.
 */
let context: AudioContext | null = null;

function audio(): AudioContext | null {
    if (muted) return null;
    try {
        if (!context) {
            const Ctor =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext?: typeof AudioContext })
                    .webkitAudioContext;
            if (!Ctor) return null;
            context = new Ctor();
        }
        // Autoplay policies suspend the context when it's created outside a
        // gesture; resuming inside one is always allowed.
        if (context.state === 'suspended') context.resume();
        return context;
    } catch {
        return null;
    }
}

/**
 * One tone.
 *
 * `attack`/`release` are what keep these from clicking at the edges: an
 * oscillator switched on and off at full volume produces a step in the
 * waveform, which is audible as a pop quite separate from the note.
 */
function tone(options: {
    frequency: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
    delay?: number;
    /** Slides to this frequency across the note, for the two-tone chime. */
    endFrequency?: number;
}): void {
    const ctx = audio();
    if (!ctx) return;

    const start = ctx.currentTime + (options.delay || 0);
    const end = start + options.duration;
    const peak = options.gain ?? 0.06;

    const osc = ctx.createOscillator();
    osc.type = options.type || 'square';
    osc.frequency.setValueAtTime(options.frequency, start);
    if (options.endFrequency) {
        osc.frequency.exponentialRampToValueAtTime(options.endFrequency, end);
    }

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(envelope);
    envelope.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.02);
}

/** Menus, buttons, list rows — the small tick under a press. */
export function playClick(): void {
    tone({ frequency: 2100, duration: 0.02, type: 'square', gain: 0.035 });
}

/** A window opening, or a menu fly-out appearing. */
export function playOpen(): void {
    tone({ frequency: 880, duration: 0.05, type: 'triangle', gain: 0.05 });
    tone({
        frequency: 1320,
        duration: 0.07,
        type: 'triangle',
        gain: 0.04,
        delay: 0.045,
    });
}

/** Clippy arriving, or anything else that wants attention politely. */
export function playChime(): void {
    tone({ frequency: 1046, duration: 0.12, type: 'sine', gain: 0.06 });
    tone({
        frequency: 1568,
        duration: 0.22,
        type: 'sine',
        gain: 0.05,
        delay: 0.11,
    });
}

/** The low two-tone buzz of a dialog you didn't want. */
export function playError(): void {
    tone({ frequency: 220, duration: 0.14, type: 'square', gain: 0.05 });
    tone({
        frequency: 165,
        duration: 0.2,
        type: 'square',
        gain: 0.05,
        delay: 0.14,
    });
}

/** The falling sweep of the shutdown sequence. */
export function playShutdown(): void {
    tone({
        frequency: 880,
        endFrequency: 180,
        duration: 0.75,
        type: 'sine',
        gain: 0.07,
    });
}

/**
 * The dial tone, the touch-tones of a number being dialled, and the
 * handshake screech of two modems agreeing on a connection — synthesised in
 * the same square-and-sine-wave spirit as everything else here rather than
 * shipped as a sampled .wav of the real thing. It's a caricature of the
 * sound, the way the BSOD's text is a caricature of a crash: recognisable in
 * under three seconds, not a faithful recording.
 *
 * Exports its own total length so the log-on screen can hold "Connecting…"
 * up for exactly as long as there's still something to hear, instead of the
 * two durations quietly drifting apart the next time either one is tuned.
 */
export function playDialUp(): number {
    let t = 0;
    tone({ frequency: 350, duration: 0.35, type: 'sine', gain: 0.025 });
    tone({ frequency: 440, duration: 0.35, type: 'sine', gain: 0.025 });
    t = 0.45;

    // A handful of touch-tone digits being dialled.
    const digits = [697, 852, 770, 941, 852];
    digits.forEach((f, i) => {
        tone({
            frequency: f,
            duration: 0.09,
            type: 'sine',
            gain: 0.035,
            delay: t + i * 0.13,
        });
    });
    t += digits.length * 0.13 + 0.2;

    // The handshake: a burst of short, randomised, harsh tones — modems
    // negotiating a line rather than anything melodic.
    const bursts = 11;
    for (let i = 0; i < bursts; i++) {
        tone({
            frequency: 900 + Math.random() * 2000,
            duration: 0.045 + Math.random() * 0.05,
            type: i % 2 === 0 ? 'square' : 'sawtooth',
            gain: 0.02,
            delay: t + i * 0.085,
        });
    }
    t += bursts * 0.085 + 0.1;

    // "Connected" — the same two-tone chime the rest of the desktop uses.
    tone({ frequency: 1046, duration: 0.12, type: 'sine', gain: 0.05, delay: t });
    tone({
        frequency: 1568,
        duration: 0.22,
        type: 'sine',
        gain: 0.05,
        delay: t + 0.11,
    });
    t += 0.11 + 0.22;

    return Math.ceil(t * 1000);
}
