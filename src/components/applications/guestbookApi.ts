/**
 * Guestbook data layer.
 * ---------------------
 * Talks to a Supabase table over its auto-generated REST API using the *public*
 * anon key (safe to ship — the table is locked down by a row-level-security rule
 * that only allows inserting/reading guestbook rows). If no Supabase credentials
 * are configured it transparently falls back to localStorage so the app still
 * runs (messages are then only visible in that one browser).
 *
 * Supabase setup (one time):
 *   1. Create a free project at supabase.com.
 *   2. SQL editor -> run:
 *        create table guestbook_messages (
 *          id bigint generated always as identity primary key,
 *          name text not null,
 *          message text not null,
 *          created_at timestamptz not null default now()
 *        );
 *        alter table guestbook_messages enable row level security;
 *        create policy "public read"  on guestbook_messages for select using (true);
 *        create policy "public write" on guestbook_messages for insert with check (
 *          char_length(name) between 1 and 40 and char_length(message) between 1 and 500
 *        );
 *   3. Put the Project URL + anon key in .env:
 *        REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
 *        REACT_APP_SUPABASE_ANON_KEY=eyJ...
 */

export interface GuestMessage {
    id: string | number;
    name: string;
    message: string;
    created_at: string;
}

const URL = process.env.REACT_APP_SUPABASE_URL;
const KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const TABLE = 'guestbook_messages';
const LOCAL_KEY = 'guestbook_messages';

/** True when a real backend is configured (messages are shared with everyone). */
export const isRemote = !!(URL && KEY);

const headers = () => ({
    apikey: KEY as string,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
});

// ---- localStorage fallback --------------------------------------------------
const readLocal = (): GuestMessage[] => {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch {
        return [];
    }
};
const writeLocal = (list: GuestMessage[]) =>
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));

// ---- Public API -------------------------------------------------------------
export async function fetchMessages(): Promise<GuestMessage[]> {
    if (!isRemote) return readLocal();
    const res = await fetch(
        `${URL}/rest/v1/${TABLE}?select=id,name,message,created_at&order=created_at.asc&limit=300`,
        { headers: headers() }
    );
    if (!res.ok) throw new Error(`Load failed (${res.status})`);
    return res.json();
}

export async function postMessage(
    name: string,
    message: string
): Promise<GuestMessage> {
    if (!isRemote) {
        const entry: GuestMessage = {
            id: Date.now(),
            name,
            message,
            created_at: new Date().toISOString(),
        };
        const list = readLocal();
        list.push(entry);
        writeLocal(list);
        return entry;
    }
    const res = await fetch(`${URL}/rest/v1/${TABLE}`, {
        method: 'POST',
        headers: { ...headers(), Prefer: 'return=representation' },
        body: JSON.stringify({ name, message }),
    });
    if (!res.ok) throw new Error(`Send failed (${res.status})`);
    // `return=representation` gives the inserted row back *only* when the
    // table's select policy also lets this key read it. The guestbook's
    // policies are deliberately split — anyone may insert, reads are
    // restricted — so an empty array here is a normal outcome rather than an
    // error, and `rows[0]` was then pushed into the message list as
    // `undefined` and read during the next render. One Send, white screen.
    const rows = (await res.json()) as unknown;
    const row = Array.isArray(rows) ? (rows[0] as GuestMessage | undefined) : undefined;
    if (row && typeof row === 'object' && typeof row.message === 'string') {
        return row;
    }
    // Nothing came back, so echo what we know was sent. The poll a few
    // seconds later replaces it with the server's own copy.
    return {
        id: `local-${Date.now()}`,
        name,
        message,
        created_at: new Date().toISOString(),
    } as GuestMessage;
}

// ---- Tiny profanity guard (keeps it civil without a dependency) -------------
const BAD = ['fuck', 'shit', 'bitch', 'cunt', 'asshole', 'nigger', 'faggot'];
export function clean(text: string): string {
    let out = text;
    for (const w of BAD) {
        out = out.replace(new RegExp(w, 'gi'), (m) => m[0] + '*'.repeat(m.length - 1));
    }
    return out;
}
