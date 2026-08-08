/**
 * The shared gallery.
 * -------------------
 * Everything a visitor saves in Paint or Notepad is kept, and every visitor
 * sees everything that has been kept. The folders under My Computer > Hard
 * Disk (C:) > My Documents therefore fill up over time instead of starting
 * empty for each new person, which is the whole idea: the machine should feel
 * lived in.
 *
 * How the two halves fit together:
 *
 *   save   Paint/Notepad write to BrowserFS as before (the file is on the fake
 *          C: drive immediately, works offline, opens again straight away),
 *          and *then* the file is posted up to Supabase.
 *   load   On boot we pull the gallery down and write anything missing into
 *          the same two folders. From then on the rest of the desktop needs to
 *          know nothing about any of this — `win98fs.ts` lists a folder and
 *          the shared files are simply in it.
 *
 * Local-first is deliberate. Supabase being asleep, unreachable, or not yet
 * set up must never stop someone saving their drawing; it only means nobody
 * else gets to see it. Every function here fails quietly for that reason.
 *
 * The table is created by `supabase/community_files.sql` (a one-time paste in
 * the SQL editor). Until it exists, `publish` gets a 404 and gives up, which
 * is the same path as "no credentials configured".
 */

import {
    NOTES_DIR,
    PAINTINGS_DIR,
    listDocuments,
    writeDocument,
} from './win98fs';

const URL = process.env.REACT_APP_SUPABASE_URL;
const KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const TABLE = 'community_files';

/** True when a backend is configured. Not a promise that the table exists. */
export const isShared = !!(URL && KEY);

export type FileKind = 'painting' | 'note';

export interface CommunityFile {
    id: number;
    kind: FileKind;
    name: string;
    author: string;
    content: string;
    created_at: string;
}

/**
 * How many of each kind a visitor pulls down. The gallery is meant to grow
 * without bound; one browser's copy of it is not. Newest first, so a visitor
 * always sees the most recent work.
 */
const SYNC_LIMIT = 60;

/**
 * Ceiling on one file, in characters of stored content. Matches the CHECK
 * constraint in the SQL — worth enforcing here too so an oversized painting
 * fails with a message we wrote rather than a 400 from PostgREST.
 */
const MAX_CONTENT = 700_000;

const headers = () => ({
    apikey: KEY as string,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
});

export const directoryFor = (kind: FileKind): string =>
    kind === 'painting' ? PAINTINGS_DIR : NOTES_DIR;

/** Who to credit. Shared with MSN Messenger, so a name typed there carries. */
export const authorName = (): string => {
    try {
        return (localStorage.getItem('guestbook_name') || '').trim() || 'Anonymous';
    } catch {
        return 'Anonymous';
    }
};

// ---- Naming -----------------------------------------------------------------

/** "Untitled 3.png" -> { stem: "Untitled 3", ext: ".png" } */
const splitName = (name: string): { stem: string; ext: string } => {
    const dot = name.lastIndexOf('.');
    return dot > 0
        ? { stem: name.slice(0, dot), ext: name.slice(dot) }
        : { stem: name, ext: '' };
};

/**
 * The name a new file should get, given what is already there.
 *
 * Windows' own rule, near enough: keep the name if it is free, otherwise count
 * up from 1 until one is. "Untitled.png" becomes "Untitled 1.png", then
 * "Untitled 2.png". A name that already ends in a number is treated as a stem
 * in its own right, so saving "Untitled 2.png" twice gives "Untitled 2 1.png"
 * rather than silently overwriting.
 *
 * Comparison is case-insensitive because the folder listing is: two files
 * differing only in case would be indistinguishable in the UI.
 */
export const uniqueName = (desired: string, taken: string[]): string => {
    const used = new Set(taken.map((n) => n.toLowerCase()));
    if (!used.has(desired.toLowerCase())) return desired;

    const { stem, ext } = splitName(desired);
    for (let n = 1; n < 10_000; n++) {
        const candidate = `${stem} ${n}${ext}`;
        if (!used.has(candidate.toLowerCase())) return candidate;
    }
    // Nobody gets here, but a name is still owed.
    return `${stem} ${Date.now()}${ext}`;
};

/** The free name for a new file in one of the document folders. */
export const nextFreeName = async (
    kind: FileKind,
    desired: string
): Promise<string> => {
    try {
        const existing = await listDocuments(directoryFor(kind));
        return uniqueName(
            desired,
            existing.map((f) => f.name)
        );
    } catch {
        return desired;
    }
};

// ---- Reading ----------------------------------------------------------------

export async function fetchCommunityFiles(
    kind: FileKind,
    limit: number = SYNC_LIMIT
): Promise<CommunityFile[]> {
    if (!isShared) return [];
    const query =
        `${URL}/rest/v1/${TABLE}` +
        `?select=id,kind,name,author,content,created_at` +
        `&kind=eq.${kind}&order=created_at.desc&limit=${limit}`;
    const res = await fetch(query, { headers: headers() });
    if (!res.ok) throw new Error(`Gallery unavailable (${res.status})`);
    return res.json();
}

// ---- Writing ----------------------------------------------------------------

/**
 * Adds a file to the gallery. Resolves with the name it was stored under,
 * which may differ from the one asked for if somebody else got there first,
 * or with `null` if it could not be shared at all.
 */
export async function publishFile(
    kind: FileKind,
    name: string,
    content: string,
    author: string = authorName()
): Promise<string | null> {
    if (!isShared) return null;
    if (!content || content.length > MAX_CONTENT) return null;

    try {
        // Dedupe against the gallery as well as the local folder: two people
        // saving "Untitled.png" in the same minute should end up with two
        // files, not one overwriting the other.
        let finalName = name;
        try {
            const existing = await fetchCommunityFiles(kind, 200);
            finalName = uniqueName(
                name,
                existing.map((f) => f.name)
            );
        } catch {
            // Table missing or offline. Post anyway under the asked-for name;
            // the worst case is a duplicate name in the list.
        }

        const res = await fetch(`${URL}/rest/v1/${TABLE}`, {
            method: 'POST',
            headers: { ...headers(), Prefer: 'return=minimal' },
            body: JSON.stringify({
                kind,
                name: finalName.slice(0, 80),
                author: author.slice(0, 40),
                content,
            }),
        });
        return res.ok ? finalName : null;
    } catch {
        return null;
    }
}

// ---- Sync -------------------------------------------------------------------

const decodeDataUrl = (dataUrl: string): Uint8Array => {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

const encodeText = (text: string): Uint8Array => new TextEncoder().encode(text);

/**
 * Pulls one folder's share of the gallery onto the local drive.
 *
 * Only files that aren't there already are written, matched by name, so this
 * is safe to run on every boot and costs one request per folder. A visitor's
 * own unpublished work is never touched: a local file wins over a remote one
 * of the same name.
 */
async function syncKind(kind: FileKind): Promise<number> {
    const remote = await fetchCommunityFiles(kind);
    if (!remote.length) return 0;

    const directory = directoryFor(kind);
    const local = await listDocuments(directory);
    const have = new Set(local.map((f) => f.name.toLowerCase()));

    let written = 0;
    // Oldest first, so the folder reads in the order things were made.
    for (const file of remote.slice().reverse()) {
        if (have.has(file.name.toLowerCase())) continue;
        try {
            const bytes =
                kind === 'painting'
                    ? decodeDataUrl(file.content)
                    : encodeText(file.content);
            await writeDocument(directory, file.name, bytes);
            have.add(file.name.toLowerCase());
            written++;
        } catch {
            // One corrupt row must not stop the rest of the folder arriving.
        }
    }
    return written;
}

let syncPromise: Promise<void> | null = null;

/**
 * Brings both folders up to date. Runs at most once per page load; everything
 * that wants the gallery present can call it without coordinating.
 */
export function syncCommunityFiles(): Promise<void> {
    if (!isShared) return Promise.resolve();
    if (syncPromise) return syncPromise;
    syncPromise = (async () => {
        try {
            await syncKind('painting');
            await syncKind('note');
        } catch {
            // Asleep, offline, or the table isn't there yet. The desktop is
            // perfectly usable without the gallery, so say nothing.
        }
    })();
    return syncPromise;
}

/** Forces the next `syncCommunityFiles()` to go back to the server. */
export function invalidateSync(): void {
    syncPromise = null;
}
