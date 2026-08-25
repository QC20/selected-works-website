/**
 * What the television is doing, for everything that isn't the television.
 * ----------------------------------------------------------------------
 * Two other parts of the desktop need to know the set is on, and neither of
 * them is anywhere near it in the React tree:
 *
 *   The 3D room (`experience/CrtRoomScene.ts`).  The monitor in there shows
 *   the site by default and should keep doing so — that is the whole point of
 *   Step Outside. But if the visitor has actually switched the television on,
 *   the room's CRT should be showing *that* instead. Walking up to a monitor
 *   that is playing the programme you left running is the payoff; a monitor
 *   that plays television whether you asked for it or not is a gimmick.
 *
 *   The screen saver (`os/Screensaver.tsx`).  Nothing is more obviously broken
 *   than a screen saver cutting in over a film you are watching. Playback is
 *   not idleness, and the saver has no other way to know that — a `<video>`
 *   playing fires none of the input events `idle.ts` listens for.
 *
 * A module-level store rather than context, for the same reason as
 * `desktopFiles.ts` and `installedApps.ts`: the readers render in different
 * trees, one of them is not even React (the three.js scene), and all of them
 * have to agree.
 */

import { useEffect, useState } from 'react';

export interface TvState {
    /** The set is powered on. False while it is closed *or* switched off. */
    on: boolean;
    /** Dial position, for the room's channel bug. */
    channel: number;
    channelName: string;
    /** What is playing, so another surface can mirror it. */
    programme: string | null;
    /**
     * The resolved media URL, or null while tuning. The 3D room streams this
     * into its own texture rather than trying to share one `<video>` element
     * across two renderers.
     */
    mediaUrl: string | null;
    /** Where playback had got to, so a mirror can start roughly in step. */
    positionSeconds: number;
    /** Muted here means the *set* is muted, not the desktop. */
    muted: boolean;
}

const IDLE: TvState = {
    on: false,
    channel: 0,
    channelName: '',
    programme: null,
    mediaUrl: null,
    positionSeconds: 0,
    muted: false,
};

let current: TvState = IDLE;
const listeners = new Set<(s: TvState) => void>();

export const getTvState = (): TvState => current;

/** Merges a partial update and notifies everyone watching. */
export function setTvState(patch: Partial<TvState>): void {
    const next = { ...current, ...patch };
    // Position ticks every few hundred ms while playing; re-notifying the
    // three.js scene on an unchanged object would be pure churn.
    const changed = (Object.keys(next) as (keyof TvState)[]).some(
        (k) => next[k] !== current[k]
    );
    if (!changed) return;
    current = next;
    listeners.forEach((fn) => fn(current));
}

/** Back to "no television anywhere" — called when the window closes. */
export const clearTvState = (): void => setTvState(IDLE);

/** For the three.js scene, which is not a React component. */
export function subscribeTv(fn: (s: TvState) => void): () => void {
    listeners.add(fn);
    fn(current);
    return () => {
        listeners.delete(fn);
    };
}

export function useTvState(): TvState {
    const [state, setState] = useState<TvState>(current);
    useEffect(() => {
        const listener = (s: TvState) => setState(s);
        listeners.add(listener);
        setState(current);
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return state;
}

/** True when something is playing that a screen saver must not interrupt. */
export const useTvPlaying = (): boolean => useTvState().on;
