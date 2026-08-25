declare interface StyleSheetCSS {
    [key: string]: React.CSSProperties;
}

declare interface WindowAppProps {
    onClose: () => void;
    onInteract: () => void;
    onMinimize: () => void;
}

/**
 * Extras a launcher can hand to `openApp` (see Desktop.tsx). Global, so the
 * taskbar can be typed against it without importing from the desktop it lives
 * inside — which would be a cycle.
 */
declare interface LaunchOptions {
    /** Market Watch: a ticker to chart straight away. */
    symbol?: string;
    /** Market Watch: a company name to look up on open. */
    query?: string;
    /**
     * Internet Explorer: an address that isn't in `websites.ts`. Start >
     * Surprise Me (GitHub) uses this to send the browser to one of Jonas'
     * project pages without every one of them needing a Favorites entry.
     */
    url?: string;
    /** The name the taskbar button shows for that address. */
    label?: string;
}

declare type DesktopWindows = {
    [key in string]: {
        zIndex: number;
        component: React.ReactElement;
        minimized: boolean;
        name: string;
        icon: IconName;
    };
};
