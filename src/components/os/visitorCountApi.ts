/**
 * The tray's hit counter — a small nod to the odometer GIFs every personal
 * site had in 1998. Talks to the `increment_site_visits` function over
 * Supabase's REST API (see `supabase/site_visits.sql` for what to run and
 * why this calls a function rather than reading a table). Falls back to a
 * local, per-browser count if no Supabase project is configured, same as
 * `guestbookApi.ts` and `analyticsApi.ts` — the tray icon still shows a
 * number, it just isn't a shared one.
 *
 * Counted once per browser tab session, not once per render: a hit counter
 * that went up every time a component remounted would be meaningless. The
 * real total only actually changes on a fresh tab, same as the sites this is
 * an homage to only bumped their count on a fresh page load.
 */

const URL = process.env.REACT_APP_SUPABASE_URL;
const KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const isRemote = !!(URL && KEY);

const SESSION_VALUE_KEY = 'visitorCount.session.v1';
const LOCAL_COUNT_KEY = 'visitorCount.local.v1';

const readSessionCache = (): number | null => {
    try {
        const raw = sessionStorage.getItem(SESSION_VALUE_KEY);
        return raw ? Number(raw) : null;
    } catch {
        return null;
    }
};

const writeSessionCache = (value: number): void => {
    try {
        sessionStorage.setItem(SESSION_VALUE_KEY, String(value));
    } catch {
        /* storage disabled — just won't be cached for the rest of the tab */
    }
};

function bumpLocal(): number {
    let count = 1;
    try {
        count = Number(localStorage.getItem(LOCAL_COUNT_KEY) || '0') + 1;
        localStorage.setItem(LOCAL_COUNT_KEY, String(count));
    } catch {
        /* storage disabled — the number just won't persist */
    }
    return count;
}

/**
 * Returns this visit's number, incrementing the shared total the first time
 * it's called in a given tab and reusing that same number for the rest of the
 * session after that. Returns `null` only if a remote call was attempted and
 * failed outright (no Supabase configured still resolves, from the local
 * fallback).
 */
export async function getVisitCount(): Promise<number | null> {
    const cached = readSessionCache();
    if (cached !== null) return cached;

    if (!isRemote) {
        const count = bumpLocal();
        writeSessionCache(count);
        return count;
    }

    try {
        const res = await fetch(`${URL}/rest/v1/rpc/increment_site_visits`, {
            method: 'POST',
            headers: {
                apikey: KEY as string,
                Authorization: `Bearer ${KEY}`,
                'Content-Type': 'application/json',
            },
            body: '{}',
        });
        if (!res.ok) throw new Error(`Count failed (${res.status})`);
        const count = (await res.json()) as number;
        writeSessionCache(count);
        return count;
    } catch {
        return null;
    }
}
