/**
 * Analytics data layer.
 * ----------------------
 * Same shape as `guestbookApi.ts`: talks to a Supabase table over its
 * auto-generated REST API using the *public* anon key (safe to ship — the
 * table only allows inserting, never reading, from that key — see setup
 * below). If no Supabase credentials are configured it falls back to a local
 * event count in localStorage, so the desktop never breaks over a missing
 * `.env` — it just means nobody's counting.
 *
 * What this deliberately is not: no cookies, no IP logging on our side, no
 * fingerprinting, no third-party script. Each browser tab gets one random,
 * unlabelled session id (sessionStorage, gone when the tab closes) purely so
 * a run of events can be grouped back into "one visit" later — it identifies
 * a session, never a person.
 *
 * Two event kinds are sent, both from Desktop.tsx / ShowcaseExplorer.tsx:
 *   - `pageview`  — a showcase route was visited (About, Projects, ...).
 *   - `app_open`  — a desktop app was launched (Doom, Guestbook, ...).
 *
 * Supabase setup (one time, same project as the guestbook):
 *   1. SQL editor -> run:
 *        create table analytics_events (
 *          id bigint generated always as identity primary key,
 *          session_id text not null,
 *          event text not null,
 *          target text not null,
 *          created_at timestamptz not null default now()
 *        );
 *        alter table analytics_events enable row level security;
 *        create policy "public insert only" on analytics_events for insert with check (
 *          event in ('pageview', 'app_open')
 *          and char_length(target) between 1 and 60
 *        );
 *   2. No select policy is created — the anon key can write events but can
 *      never read them back. Read the numbers from the Supabase table editor
 *      (or the SQL editor) while signed in to the project, not from the site.
 *   3. Uses the same REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY as
 *      the guestbook — nothing new to add to .env if that's already set up.
 */

const URL = process.env.REACT_APP_SUPABASE_URL;
const KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const TABLE = 'analytics_events';
const SESSION_KEY = 'analyticsSessionId';
const LOCAL_COUNT_KEY = 'analyticsLocalCount';

export const isRemote = !!(URL && KEY);

export type AnalyticsEvent = 'pageview' | 'app_open';

/** One random id per tab session — not a cookie, not tied to a person. */
const sessionId = (): string => {
    try {
        let id = sessionStorage.getItem(SESSION_KEY);
        if (!id) {
            id =
                typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            sessionStorage.setItem(SESSION_KEY, id);
        }
        return id;
    } catch {
        // sessionStorage unavailable (private mode, etc.) — one id per call.
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
};

/**
 * Fire-and-forget: never awaited by a caller, never throws. A dropped
 * analytics event is not something a visitor should ever notice.
 */
export function trackEvent(event: AnalyticsEvent, target: string): void {
    if (!isRemote) {
        try {
            const n = Number(localStorage.getItem(LOCAL_COUNT_KEY) || '0');
            localStorage.setItem(LOCAL_COUNT_KEY, String(n + 1));
        } catch {
            /* localStorage unavailable — nothing to fall back to further */
        }
        return;
    }

    fetch(`${URL}/rest/v1/${TABLE}`, {
        method: 'POST',
        headers: {
            apikey: KEY as string,
            Authorization: `Bearer ${KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId(),
            event,
            target: target.slice(0, 60),
        }),
        // Doesn't need the response, and mustn't hold up navigation for it.
        keepalive: true,
    }).catch(() => {
        /* best-effort — a lost pageview isn't worth surfacing anywhere */
    });
}
