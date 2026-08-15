/**
 * The connection behind the tray's dial-up icon, and the machine's public IP.
 * ----------------------------------------------------------------------------
 * `navigator.onLine` plus the (Chromium-only) Network Information API give the
 * online/offline state and a rough speed reading — nothing here asks permission
 * for anything.
 *
 * The IP address is the one reading that has to leave the browser to get: it
 * comes from ipify (api.ipify.org), the same kind of no-key, CORS-friendly
 * service this desktop already uses for weather (Open-Meteo). Nothing is sent
 * except the request itself — no account, no token, and the address is shown
 * to the visitor about themselves, never logged or stored anywhere else.
 */

import { useEffect, useState } from 'react';

export interface Connection {
    online: boolean;
    effectiveType: string | null;
    downlink: number | null;
}

/** Online/offline plus whatever the browser will say about the link. */
export function useConnection(): Connection {
    const read = (): Connection => {
        const nav = navigator as Navigator & {
            connection?: { effectiveType?: string; downlink?: number };
        };
        return {
            online: navigator.onLine,
            effectiveType: nav.connection?.effectiveType || null,
            downlink: nav.connection?.downlink ?? null,
        };
    };

    const [connection, setConnection] = useState<Connection>(read);

    useEffect(() => {
        const update = () => setConnection(read());
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        const nav = navigator as Navigator & {
            connection?: EventTarget;
        };
        nav.connection?.addEventListener('change', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
            nav.connection?.removeEventListener('change', update);
        };
    }, []);

    return connection;
}

export class IPLookupError extends Error {}

/** Kept for the module's lifetime — the address doesn't change mid-session. */
let ipCache: string | null = null;
let ipPromise: Promise<string> | null = null;

export function fetchPublicIP(options: { force?: boolean } = {}): Promise<string> {
    if (!options.force && ipCache) return Promise.resolve(ipCache);
    if (!options.force && ipPromise) return ipPromise;

    ipPromise = (async () => {
        let response: Response;
        try {
            response = await fetch('https://api.ipify.org?format=json');
        } catch {
            ipPromise = null;
            throw new IPLookupError('No connection to the lookup service.');
        }
        if (!response.ok) {
            ipPromise = null;
            throw new IPLookupError(`The lookup service returned ${response.status}.`);
        }
        const data = await response.json();
        if (typeof data?.ip !== 'string') {
            ipPromise = null;
            throw new IPLookupError('The lookup service sent no address.');
        }
        ipCache = data.ip;
        return data.ip as string;
    })();

    return ipPromise;
}

/**
 * Subscribes to the visitor's public IP, fetched once and cached.
 *
 * `enabled` defaults to true for the standalone Utility window (it's the
 * whole point of opening it); the tray's popup passes its own open state, so
 * a visitor who never clicks the connectivity icon never triggers the lookup.
 */
export function usePublicIP(
    enabled = true
): { address: string | null; error: string | null } {
    const [address, setAddress] = useState<string | null>(ipCache);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled || address) return;
        let live = true;
        fetchPublicIP()
            .then((ip) => {
                if (live) setAddress(ip);
            })
            .catch((e) => {
                if (live) {
                    setError(
                        e instanceof IPLookupError
                            ? e.message
                            : 'Could not look up the address.'
                    );
                }
            });
        return () => {
            live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    return { address, error };
}
