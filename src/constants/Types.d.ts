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
