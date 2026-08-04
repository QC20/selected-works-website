/**
 * The battery, if this machine has one.
 * -------------------------------------
 * `navigator.getBattery()` is a real reading of the real device — the same
 * trick System Properties plays with the processor count, and a good one,
 * because a Windows 95 taskbar showing an accurate modern battery level is
 * funnier than any invented number.
 *
 * It is also Chromium-only: Firefox removed it and Safari never shipped it. So
 * everything here reports "unsupported" cleanly and the tray simply leaves the
 * icon out rather than showing a battery that does not move.
 */

import { useEffect, useState } from 'react';

export interface BatteryState {
    supported: boolean;
    /** 0–1. */
    level: number;
    charging: boolean;
    /** Seconds until empty, when the browser will say. */
    dischargingTime: number;
}

interface BatteryManager extends EventTarget {
    level: number;
    charging: boolean;
    dischargingTime: number;
    chargingTime: number;
}

type NavigatorWithBattery = Navigator & {
    getBattery?: () => Promise<BatteryManager>;
};

export const isBatterySupported = (): boolean =>
    typeof (navigator as NavigatorWithBattery).getBattery === 'function';

/**
 * Subscribes to the battery. Returns `supported: false` until the promise
 * resolves, and for good on a browser that doesn't implement it, so callers
 * can render nothing without a flash of a wrong reading.
 */
export function useBattery(): BatteryState {
    const [state, setState] = useState<BatteryState>({
        supported: false,
        level: 1,
        charging: true,
        dischargingTime: Infinity,
    });

    useEffect(() => {
        const getBattery = (navigator as NavigatorWithBattery).getBattery;
        if (!getBattery) return;

        let battery: BatteryManager | null = null;
        let cancelled = false;

        const read = () => {
            if (!battery || cancelled) return;
            setState({
                supported: true,
                level: battery.level,
                charging: battery.charging,
                dischargingTime: battery.dischargingTime,
            });
        };

        getBattery
            .call(navigator)
            .then((manager) => {
                if (cancelled) return;
                battery = manager;
                read();
                // The four events the spec defines. Levels change rarely, so
                // events are the whole story — there is nothing to poll.
                manager.addEventListener('levelchange', read);
                manager.addEventListener('chargingchange', read);
                manager.addEventListener('dischargingtimechange', read);
                manager.addEventListener('chargingtimechange', read);
            })
            .catch(() => {
                /* Permissions policy can refuse it; treat that as unsupported. */
            });

        return () => {
            cancelled = true;
            if (!battery) return;
            battery.removeEventListener('levelchange', read);
            battery.removeEventListener('chargingchange', read);
            battery.removeEventListener('dischargingtimechange', read);
            battery.removeEventListener('chargingtimechange', read);
        };
    }, []);

    return state;
}

export const batteryPercent = (state: BatteryState): number =>
    Math.round(state.level * 100);

/** "2 hr 15 min remaining", when the browser is willing to estimate. */
export function batteryRemaining(state: BatteryState): string | null {
    if (state.charging) return null;
    const seconds = state.dischargingTime;
    if (!isFinite(seconds) || seconds <= 0) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    if (hours && minutes) return `${hours} hr ${minutes} min remaining`;
    if (hours) return `${hours} hr remaining`;
    return `${minutes} min remaining`;
}

/** What the tray tooltip and the Device Manager row both say. */
export function batterySummary(state: BatteryState): string {
    if (!state.supported) return 'No battery detected';
    const percent = `${batteryPercent(state)}%`;
    if (state.charging) {
        return state.level >= 1
            ? 'Fully charged (on mains power)'
            : `${percent} — charging`;
    }
    return [`${percent} remaining`, batteryRemaining(state)]
        .filter(Boolean)
        .join(' · ');
}
