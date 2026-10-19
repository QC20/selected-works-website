import type { DosPlayerFactoryType } from 'js-dos';

/**
 * Fetching DOSBox only when somebody actually wants a DOS game.
 * --------------------------------------------------------------
 * js-dos used to be two tags in `public/index.html`:
 *
 *     <script src="%PUBLIC_URL%/js-dos/js-dos.js"></script>
 *     <link rel="stylesheet" href="%PUBLIC_URL%/js-dos/js-dos.css">
 *     <script>emulators.pathPrefix = "%PUBLIC_URL%/js-dos/";</script>
 *
 * That is 555KB of script — 149KB over the wire — and a *blocking* one: a
 * classic `<script>` in `<head>` stops the parser dead until it has
 * downloaded and run, ahead of the deferred bundle that draws the desktop.
 * Every visitor paid for it on arrival. Three programs use it: Doom, The
 * Oregon Trail and Scrabble.
 *
 * It is the same three statements, in the same order, run the moment one of
 * those three is *wanted* instead of on arrival. `DosPlayer` awaits this
 * before it builds a player; `Desktop.tsx` starts it on hover alongside the
 * game's own chunk (see `lazyDosApp` there), so by the time a double-click
 * resolves the emulator is usually already here.
 */

/**
 * The two globals `js-dos.js` installs on `window`.
 *
 * Read off `window` rather than declared as bare globals (`declare const
 * Dos`) because that is now a claim that would be false for most of the
 * session: until something has opened a DOS game there is no `Dos`, and the
 * type should say so. Kept local instead of a `declare global` so it cannot
 * collide with the ambient `Window` the js-dos and emulators-ui packages
 * may augment in a future version.
 */
type JsDosWindow = Window &
    typeof globalThis & {
        Dos?: DosPlayerFactoryType;
        /** The DOSBox loader. `pathPrefix` is where it looks for the .wasm. */
        emulators?: { pathPrefix: string };
    };

/** Where the three js-dos files live, as index.html addressed them. */
const BASE = `${process.env.PUBLIC_URL}/js-dos/`;
const SCRIPT_SRC = `${BASE}js-dos.js`;
const STYLE_HREF = `${BASE}js-dos.css`;

/** The one in-flight (or finished) load. Loading twice is pointless. */
let loading: Promise<DosPlayerFactoryType> | null = null;

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
        script.addEventListener('error', () => {
            // Take the failed tag back out of the document. A `<script>` that
            // has already errored will never fire `load` or `error` again, so
            // leaving it there means the *next* attempt finds it above,
            // attaches listeners to a corpse and waits on it forever — which
            // is how a Retry button ends up doing nothing at all. The same
            // goes for a hover that failed before the double-click.
            script.remove();
            reject(new Error(`Could not load ${src}`));
        });
        document.head.appendChild(script);
    });

/**
 * Inserted at the *top* of `<head>`, which is the one detail that matters
 * here. js-dos.css is largely a slice of Tailwind — `.flex`, `.absolute`,
 * `.border`, `.bg-white` — and in index.html it sat ahead of the app's own
 * stylesheet, so on any tie the app won. Appending it would quietly invert
 * that. Inserting it first keeps the cascade exactly as it was built.
 *
 * A stylesheet that fails to arrive resolves rather than rejects: it costs
 * `image-rendering: pixelated` and some overlay positioning, which is a
 * worse-looking game, where rejecting would mean no game at all.
 */
const loadStylesheet = (href: string): Promise<void> =>
    new Promise((resolve) => {
        if (document.querySelector(`link[href="${href}"]`)) return resolve();
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.addEventListener('load', () => resolve());
        link.addEventListener('error', () => {
            // Removed for the same reason the script is: a `<link>` that has
            // errored is inert, and a later attempt that found it still in
            // the head would take it for a stylesheet already in hand and
            // never fetch the real one.
            link.remove();
            resolve();
        });
        document.head.insertBefore(link, document.head.firstChild);
    });

/**
 * Hands back the `Dos` factory, fetching js-dos first if this is the first
 * time anyone has asked.
 */
export function loadJsDos(): Promise<DosPlayerFactoryType> {
    if (loading) return loading;
    loading = Promise.all([loadScript(SCRIPT_SRC), loadStylesheet(STYLE_HREF)])
        .then(() => {
            const { Dos, emulators } = window as JsDosWindow;
            if (!Dos || !emulators) {
                throw new Error(
                    'js-dos loaded without installing its globals.'
                );
            }
            // DOSBox's .wasm sits next to the script it came from, and
            // `emulators` resolves it against the page unless told
            // otherwise — which, once the showcase router has pushed a path
            // like /projects, is the wrong folder. index.html set this
            // inline for the same reason; it has to be set before a player
            // is built, not before one runs.
            emulators.pathPrefix = BASE;
            return Dos;
        })
        .catch((error) => {
            // A failure must not be remembered as the answer. The visitor
            // can close the window and open the game again, and that second
            // attempt should be a real retry rather than an instant replay
            // of the same rejection.
            loading = null;
            throw error;
        });
    return loading;
}

/**
 * Starts the download without waiting for it, for a hover that has not
 * become a double-click yet. Never throws: this is speculative, the real
 * open will retry, and an unhandled rejection for something nobody asked
 * for is worse than the wasted request. Same bargain `lazyApp`'s `preload`
 * makes for the program chunks.
 */
export function preloadJsDos(): void {
    loadJsDos().catch(() => undefined);
}
