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

/** Where Notepad's Save As puts files (`file-dialogs.js` uses the same path). */
export const DOCS_DIR = '/my-documents';

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
    readFile: (
        path: string,
        encoding: string,
        cb: (err: Error | null, data?: string) => void
    ) => void;
    unlink: (path: string, cb: (err: Error | null) => void) => void;
    stat: (
        path: string,
        cb: (err: Error | null, stats?: BrowserFsStats) => void
    ) => void;
}

interface BrowserFsGlobal {
    configure: (config: unknown, cb: (err?: Error | null) => void) => void;
    BFSRequire: (name: 'fs') => BrowserFsModule;
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
 * What's in My Documents, newest-looking name order aside — sorted by name, the
 * way a Windows 95 folder lists files.
 *
 * An empty list is the normal answer: the folder only exists once something has
 * been saved into it.
 */
export const listDocuments = async (): Promise<Win98File[]> => {
    const fs = await getFs();
    const names = await new Promise<string[]>((resolve) => {
        fs.readdir(DOCS_DIR, (error, result) => {
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
                        const path = `${DOCS_DIR}/${name}`;
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
    const text = await readDocument(file.path);
    // No charset in the type on purpose: it makes some browsers prepend a
    // UTF-8 BOM, which shows up as a stray character in a lot of editors.
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
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
