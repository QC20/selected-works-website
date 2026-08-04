/**
 * Reading the fake C: drive that the vendored Windows 98 programs write to.
 *
 * Notepad's "Save As > My Documents (C:)" doesn't download anything — it writes
 * the file into BrowserFS, which keeps the drive in this browser's IndexedDB
 * (database "C:", the store name `public/98/src/filesystem-setup.js` configures).
 * That's genuinely persistent: the file survives a reload, and Notepad can open
 * it again. It never leaves the machine.
 *
 * Until now nothing outside the Notepad iframe could see those files, so a
 * saved document had no address in the desktop's own world. This module gives
 * the React side read access to the same drive, which is what My Computer >
 * Hard Disk (C:) > My Documents lists (see `MyComputer.tsx`).
 *
 * How it works: `public/98/lib/browserfs.js` is a UMD bundle served statically,
 * so it can be loaded on demand and pointed at the same IndexedDB store. The
 * programs run in iframes of the same origin, so both sides see one drive.
 * Only the writable half is mounted here — the read-only XmlHttpRequest half is
 * just the 98 install tree, and we have no use for it.
 *
 * Everything is loaded lazily: a visitor who never opens Notepad never
 * downloads the 800KB bundle.
 */

/**
 * My Documents, and the two folders inside it.
 *
 * Notepad writes into Notes (`notepad/src/file-dialogs.js`) and Paint writes
 * into Paintings (`jspaint/src/browserfs-save.js`); both use these same paths.
 * They are deliberately separate from the desktop's Pictures folder, which is
 * a fixed set of photos shipped with the build and lives in the bundle, not on
 * the drive — mixing the two would mean "your saved work" and "his photographs"
 * shared a folder.
 */
export const DOCS_DIR = '/my-documents';
export const NOTES_DIR = `${DOCS_DIR}/notes`;
export const PAINTINGS_DIR = `${DOCS_DIR}/paintings`;

/** One file on the fake drive. */
export interface Win98File {
    name: string;
    path: string;
    /** Bytes. */
    size: number;
    modified: Date | null;
}

interface BrowserFsStats {
    size: number;
    mtime?: Date | string | number;
    isDirectory?: () => boolean;
}

interface BrowserFsModule {
    readdir: (
        path: string,
        cb: (err: Error | null, names?: string[]) => void
    ) => void;
    exists: (path: string, cb: (exists: boolean) => void) => void;
    mkdir: (path: string, cb: (err: Error | null) => void) => void;
    writeFile: (
        path: string,
        data: unknown,
        cb: (err: Error | null) => void
    ) => void;
    readFile: {
        (
            path: string,
            encoding: string,
            cb: (err: Error | null, data?: string) => void
        ): void;
        (path: string, cb: (err: Error | null, data?: Uint8Array) => void): void;
    };
    unlink: (path: string, cb: (err: Error | null) => void) => void;
    stat: (
        path: string,
        cb: (err: Error | null, stats?: BrowserFsStats) => void
    ) => void;
}

interface BrowserFsBuffer {
    from: (data: Uint8Array) => unknown;
}

interface BrowserFsGlobal {
    configure: (config: unknown, cb: (err?: Error | null) => void) => void;
    BFSRequire: {
        (name: 'fs'): BrowserFsModule;
        (name: 'buffer'): { Buffer: BrowserFsBuffer };
    };
    /** Present once `configure` has run; a second configure would reset it. */
    initialize?: unknown;
}

declare global {
    interface Window {
        BrowserFS?: BrowserFsGlobal;
        /**
         * Not ours — see `browserFsGlobal` below for why we have to look here.
         */
        exports?: { BrowserFS?: BrowserFsGlobal };
    }
}

/**
 * Where the bundle actually put itself.
 *
 * browserfs.js is a UMD bundle, and UMD checks for a CommonJS environment
 * first: `typeof exports === 'object'` means "I'm being required, export
 * there". This app's page *does* have a global `exports` object (webpack's dev
 * output leaves one behind), so on the dev server the bundle attaches itself to
 * `window.exports.BrowserFS` and never touches `window.BrowserFS`. In a page
 * without that global it takes the browser branch and does the opposite.
 *
 * Rather than depend on which, look in both.
 */
const browserFsGlobal = (): BrowserFsGlobal | undefined =>
    window.BrowserFS || window.exports?.BrowserFS;

/** The one in-flight (or finished) setup. Configuring twice is not safe. */
let fsPromise: Promise<BrowserFsModule> | null = null;
/** Kept for `BFSRequire('buffer')`, which writes need. */
let browserFs: BrowserFsGlobal | null = null;

const loadScript = (src: string): Promise<void> =>
    new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
            `script[src="${src}"]`
        );
        if (existing) {
            if (existing.dataset.loaded === 'true') return resolve();
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () =>
                reject(new Error(`Could not load ${src}`))
            );
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            resolve();
        });
        script.addEventListener('error', () =>
            reject(new Error(`Could not load ${src}`))
        );
        document.head.appendChild(script);
    });

const getFs = (): Promise<BrowserFsModule> => {
    if (fsPromise) return fsPromise;
    fsPromise = loadScript('/98/lib/browserfs.js')
        .then(
            () =>
                new Promise<BrowserFsModule>((resolve, reject) => {
                    const BrowserFS = browserFsGlobal();
                    if (!BrowserFS) {
                        reject(new Error('The drive could not be opened.'));
                        return;
                    }
                    BrowserFS.configure(
                        {
                            fs: 'IndexedDB',
                            // Must match filesystem-setup.js, or we'd be
                            // looking at a different (empty) drive.
                            options: { storeName: 'C:' },
                        },
                        (error) => {
                            if (error) return reject(error);
                            browserFs = BrowserFS;
                            resolve(BrowserFS.BFSRequire('fs'));
                        }
                    );
                })
        )
        .catch((error) => {
            // Let the next attempt try again rather than caching the failure —
            // a reload of the page is otherwise the only way back.
            fsPromise = null;
            throw error;
        });
    return fsPromise;
};

/**
 * What's in one of the document folders, sorted by name, the way a Windows 95
 * folder lists files.
 *
 * An empty list is the normal answer: a folder only exists once something has
 * been saved into it (or seeded — see `seedDocuments`).
 */
export const listDocuments = async (
    directory: string = NOTES_DIR
): Promise<Win98File[]> => {
    const fs = await getFs();
    const names = await new Promise<string[]>((resolve) => {
        fs.readdir(directory, (error, result) => {
            // No directory yet => nothing has been saved yet.
            resolve(error || !result ? [] : result);
        });
    });

    const files = await Promise.all(
        names
            .filter((name) => !name.startsWith('.'))
            .sort((a, b) => a.localeCompare(b))
            .map(
                (name) =>
                    new Promise<Win98File | null>((resolve) => {
                        const path = `${directory}/${name}`;
                        fs.stat(path, (error, stats) => {
                            if (error || !stats) return resolve(null);
                            if (stats.isDirectory && stats.isDirectory()) {
                                return resolve(null);
                            }
                            const mtime = stats.mtime
                                ? new Date(stats.mtime as string)
                                : null;
                            resolve({
                                name,
                                path,
                                size: stats.size,
                                modified:
                                    mtime && !isNaN(mtime.getTime())
                                        ? mtime
                                        : null,
                            });
                        });
                    })
            )
    );

    return files.filter((f): f is Win98File => f !== null);
};

/** The text of one saved file. */
export const readDocument = async (path: string): Promise<string> => {
    const fs = await getFs();
    return new Promise<string>((resolve, reject) => {
        fs.readFile(path, 'utf8', (error, data) => {
            if (error || data === undefined) {
                reject(error || new Error('File not found'));
                return;
            }
            resolve(data);
        });
    });
};

/** The raw bytes of a file — what a painting needs. */
export const readDocumentBytes = async (path: string): Promise<Uint8Array> => {
    const fs = await getFs();
    return new Promise<Uint8Array>((resolve, reject) => {
        fs.readFile(path, (error: Error | null, data?: Uint8Array) => {
            if (error || !data) {
                reject(error || new Error('File not found'));
                return;
            }
            resolve(data);
        });
    });
};

/**
 * A blob URL for a file on the drive, for showing a saved painting as a
 * thumbnail. The caller owns the URL and must revoke it.
 */
export const documentObjectUrl = async (file: Win98File): Promise<string> => {
    const bytes = await readDocumentBytes(file.path);
    return URL.createObjectURL(
        new Blob([bytes], { type: mimeForName(file.name) })
    );
};

/** Enough of a type for a download or an <img> to behave. */
export const mimeForName = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'png':
            return 'image/png';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'gif':
            return 'image/gif';
        case 'bmp':
            return 'image/bmp';
        case 'webp':
            return 'image/webp';
        // No charset on plain text on purpose: it makes some browsers prepend
        // a UTF-8 BOM, which shows up as a stray character in many editors.
        default:
            return 'text/plain';
    }
};

/** Throws the file off the fake drive for good (there's no bin for these). */
export const deleteDocument = async (path: string): Promise<void> => {
    const fs = await getFs();
    return new Promise<void>((resolve, reject) => {
        fs.unlink(path, (error) => (error ? reject(error) : resolve()));
    });
};

/**
 * Hands a saved file to the real computer as an ordinary browser download.
 *
 * This is the same thing Notepad's "Save As > This computer" does, offered
 * again from the folder so a file already sitting on the fake C: drive can be
 * taken off it without opening Notepad first.
 */
export const downloadDocument = async (file: Win98File): Promise<void> => {
    // Bytes, not text: a painting read as UTF-8 comes out corrupt.
    const bytes = await readDocumentBytes(file.path);
    const url = URL.createObjectURL(
        new Blob([bytes], { type: mimeForName(file.name) })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Give the download a moment to start before the URL goes away.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/** Creates a directory if it isn't there. BrowserFS has no mkdir -p. */
const ensureDir = (fs: BrowserFsModule, path: string): Promise<void> =>
    new Promise((resolve) => {
        fs.exists(path, (exists) => {
            if (exists) return resolve();
            // An error here means something else created it first, which is
            // exactly the outcome we wanted anyway.
            fs.mkdir(path, () => resolve());
        });
    });

/** Both document folders, created if this is a first visit. */
export const ensureDocumentDirs = async (): Promise<void> => {
    const fs = await getFs();
    await ensureDir(fs, DOCS_DIR);
    await ensureDir(fs, NOTES_DIR);
    await ensureDir(fs, PAINTINGS_DIR);
};

/** Writes bytes to the fake drive, creating the folder if it's missing. */
export const writeDocument = async (
    directory: string,
    name: string,
    data: Uint8Array
): Promise<void> => {
    const fs = await getFs();
    await ensureDir(fs, DOCS_DIR);
    await ensureDir(fs, directory);
    const Buffer = browserFs?.BFSRequire('buffer').Buffer;
    if (!Buffer) throw new Error('The drive could not be opened.');
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(`${directory}/${name}`, Buffer.from(data), (error) =>
            error ? reject(error) : resolve()
        );
    });
};

const SEED_FLAG = 'win98fs.seeded.v1';

/**
 * Puts one example file in each document folder on a first visit — a note in
 * Notes and a drawing in Paintings — so neither folder is an empty box that
 * makes you wonder whether it works.
 *
 * The files are real files on the drive, not placeholders: they open in Notepad
 * and Paint, they can be edited, downloaded and deleted, and once deleted they
 * stay deleted (the flag in localStorage is what stops them coming back).
 *
 * Seeds are served from `public/seed/`, so replacing the example files is a
 * matter of dropping different ones in there.
 */
export const seedDocuments = async (): Promise<void> => {
    try {
        if (localStorage.getItem(SEED_FLAG)) {
            // Still make sure the folders exist — a visitor from before this
            // existed has the flag but not the folders.
            await ensureDocumentDirs();
            return;
        }
    } catch {
        /* storage disabled: seed every time rather than not at all */
    }

    await ensureDocumentDirs();

    const seeds: { directory: string; name: string; url: string }[] = [
        { directory: NOTES_DIR, name: 'Welcome.txt', url: '/seed/Welcome.txt' },
        {
            directory: PAINTINGS_DIR,
            name: 'Untitled.png',
            url: '/seed/Untitled.png',
        },
    ];

    await Promise.all(
        seeds.map(async (seed) => {
            const existing = await listDocuments(seed.directory);
            if (existing.some((f) => f.name === seed.name)) return;
            try {
                const response = await fetch(seed.url);
                if (!response.ok) return;
                const bytes = new Uint8Array(await response.arrayBuffer());
                await writeDocument(seed.directory, seed.name, bytes);
            } catch {
                // A missing seed file is not worth bothering anyone about.
            }
        })
    );

    try {
        localStorage.setItem(SEED_FLAG, '1');
    } catch {
        /* as above */
    }
};
