import { IconName } from '../../assets/icons';

/**
 * Every site that opens inside the desktop's Internet Explorer window.
 *
 * This used to live as a `WEB_APPS` map inside `Desktop.tsx`, which meant the
 * browser had no way to know about any address other than the one it was handed.
 * Keeping it here lets `WebFrame` build its Favorites drop-down from the same
 * list the launcher uses, so the two can't drift apart — add a site once and it
 * shows up both in the Start menu and in the browser's own address list.
 *
 * None of these send `X-Frame-Options` or a `frame-ancestors` CSP, so they embed
 * cleanly. Sites that refuse to be framed (github.com, linkedin.com) are not
 * here: they open in a real tab instead — see `EXTERNAL_LINKS` in `Desktop.tsx`
 * and `GitHubViewer`.
 */

export interface WebSite {
    /** The APPLICATIONS key in Desktop.tsx. */
    key: string;
    /** Shown in the Favorites drop-down and in the window title. */
    label: string;
    url: string;
    width: number;
    height: number;
    /**
     * Adds `allow="camera; microphone"` to the iframe. Without it a framed page
     * cannot even ask for the webcam. The browser's own permission prompt still
     * appears — only the user can actually grant access.
     */
    allowCamera?: boolean;
    /** Kept out of the browser's Favorites list (the home page itself). */
    hideFromFavorites?: boolean;
    /**
     * Overrides the window's default corner. Computed from the viewport at open
     * time, in desktop (scale-aware) coordinates.
     */
    placement?: (
        vw: number,
        vh: number
    ) => { width: number; height: number; top: number; left: number };
}

/**
 * Internet Explorer's home page. `igu=1` is the parameter that makes Google
 * serve a frameable copy of itself — it's what Yute's portfolio points its IE
 * at, and it means the browser opens somewhere you can actually type a search
 * rather than at a dead page.
 */
export const IE_HOME = 'https://www.google.com/search?igu=1';

export const WEB_SITES: WebSite[] = [
    {
        key: 'internet',
        label: 'Google',
        url: IE_HOME,
        width: 900,
        height: 620,
        hideFromFavorites: true,
    },

    // --- Start -> Projects -------------------------------------------------
    // 3/4 of the My Showcase window (1100 x 800).
    {
        key: 'pinPortrait',
        label: 'Pin Portrait',
        url: 'https://qc20.github.io/PinPortrait/',
        width: 825,
        height: 600,
        allowCamera: true,
    },
    // Roughly a fifth of the desktop's area.
    {
        key: 'emojiHeatmap',
        label: 'Emoji Heatmap',
        url: 'https://qc20.github.io/EmojiHeatmap/',
        width: 560,
        height: 380,
    },
    // Opens large but inset, horizontally centred, sitting in the lower half of
    // the desktop rather than butting up against any edge.
    {
        key: 'scroll',
        label: 'Scroll.',
        url: 'https://qc20.github.io/Scroll./',
        width: 900,
        height: 400,
        placement: (vw, vh) => {
            const width = Math.round(Math.min(1000, vw * 0.72));
            // Fill the lower half, minus the taskbar and a comfortable margin.
            const lower = vh / 2;
            const height = Math.round(Math.min(520, lower - 60));
            return {
                width,
                height,
                top: Math.round(lower + (lower - height - 32) / 2),
                left: Math.round((vw - width) / 2),
            };
        },
    },

    // --- Start -> Resume ---------------------------------------------------
    {
        key: 'selectedWebsites',
        label: 'Selected Websites',
        url: 'https://creative-technologist-showcase.vercel.app/',
        width: 900,
        height: 650,
    },
];

export const siteByKey = (key: string): WebSite | undefined =>
    WEB_SITES.find((s) => s.key === key);

/** What the browser's address drop-down offers. */
export const IE_FAVORITES = WEB_SITES.filter((s) => !s.hideFromFavorites);

/**
 * The name to show for an address: the site's own label when we know it, else
 * the host, which is what a browser falls back to before a page reports a title.
 */
export const labelForUrl = (url: string): string => {
    const known = WEB_SITES.find((s) => s.url === url);
    if (known) return known.label;
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

/**
 * Turns whatever was typed in the address bar into something loadable.
 * Bare hosts get https://, and anything that isn't a host at all is treated as
 * a search — the same thing typing into a real address bar does.
 */
export const resolveTypedAddress = (typed: string): string | null => {
    const text = typed.trim();
    if (!text) return null;
    if (/^https?:\/\//i.test(text)) return text;
    // Looks like a domain (has a dot, no spaces) — assume they meant a URL.
    if (/^[^\s/]+\.[^\s/]{2,}(\/.*)?$/.test(text)) return `https://${text}`;
    return `https://www.google.com/search?igu=1&q=${encodeURIComponent(text)}`;
};

/** Icons used for the Favorites rows, keyed by site. */
export const FAVORITE_ICONS: { [key: string]: IconName } = {
    pinPortrait: 'ieIcon',
    emojiHeatmap: 'ieIcon',
    scroll: 'scrollIcon',
    selectedWebsites: 'selectedWebsitesIcon',
};
