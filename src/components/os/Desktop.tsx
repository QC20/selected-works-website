import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Colors from '../../constants/colors';
import ShowcaseExplorer from '../applications/ShowcaseExplorer';
import Doom from '../applications/Doom';
import OregonTrail from '../applications/OregonTrail';
import ShutdownSequence from './ShutdownSequence';
import ShutdownDialog, { ShutdownChoice } from './ShutdownDialog';
import LogonScreen from './LogonScreen';

import Toolbar from './Toolbar';
import DesktopShortcut, { DesktopShortcutProps } from './DesktopShortcut';
import Scrabble from '../applications/Scrabble';
import Jonordle from '../jonordle/Jonordle';
import { IconName } from '../../assets/icons';
import Credits from '../applications/Credits';
import floatingSphere from '../applications/floatingSphere';
import Guestbook from '../applications/Guestbook';
import Experience3D from '../experience/Experience3D';
import Mail from '../applications/Mail';
import About from '../applications/About';
import RecycleBin from '../applications/RecycleBin';
import Settings from '../applications/Settings';
import Run from '../applications/Run';
import GitHubViewer from '../applications/GitHubViewer';
import ProgramsFolder from '../applications/ProgramsFolder';
import Minesweeper from '../applications/Minesweeper';
import WebFrame, { NavRequest } from '../applications/WebFrame';
import ResumeFile from '../applications/ResumeFile';
import MyComputer from '../applications/MyComputer';
import StockWatch, { StockRequest } from '../applications/StockWatch';
import TaskManager from '../applications/TaskManager';
import PatchNotes from '../applications/PatchNotes';
import ResetStorage from '../applications/ResetStorage';
import NetworkInfo from '../applications/NetworkInfo';
import PowerMeter from '../applications/PowerMeter';
import WeatherStation from '../applications/WeatherStation';
import ProgramFrame from '../applications/ProgramFrame';
import { WIN98_PROGRAMS, win98ProgramByKey } from '../applications/win98Programs';
import { useTheme } from './theme';
import {
    Resolution,
    scaleFor,
    loadResolution,
    saveResolution,
    setCurrentScale,
} from './resolution';
import {
    IconPos,
    PlacedIcon,
    SHORTCUT_ORIGIN,
    arrangeIcons,
    defaultPosition,
    iconBounds,
    lineUpIcons,
    loadPositions,
    resolveLayout,
    rowsPerColumn,
    savePositions,
    screenToIconSlot,
    snap,
} from './iconPositions';
import FileIcon from './FileIcon';
import PictureViewer from '../applications/PictureViewer';
import { siteByKey } from './websites';
import { DesktopFile, updateFile, useDesktopFiles } from './desktopFiles';
import {
    binFile,
    emptyBin,
    kindForName,
    reclaimStrayDocuments,
    sendDocumentHome,
    takeDocumentToBin,
    takeDocumentToDesktop,
} from './documentFiles';
import { Win98File } from './win98fs';
import Store from '../applications/Store';
import SystemProperties from '../applications/SystemProperties';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import {
    ArrangeOrder,
    desktopMenu,
    fileMenu,
    recycleBinMenu,
    shortcutMenu,
} from './desktopMenus';
import { isOptional, uninstall, useInstalledApps } from './installedApps';
import Screensaver, { useScreensaverSettings } from './Screensaver';
import Snake from '../applications/Snake';
import Tetris from '../applications/Tetris';
import Clippy from './Clippy';
import StartBalloon from './StartBalloon';

// Apps whose icon launches a full-screen takeover (the 3D experience) rather
// than opening a draggable window. Keyed by their APPLICATIONS key.
const FULLSCREEN_EXPERIENCES = ['stepOutside'];

/**
 * There is one browser on this desktop, and this is its window.
 *
 * Every site — the Internet Explorer icon, Start -> Projects, Start -> Resume,
 * a favorite picked from the address bar — opens under this one key. Launch a
 * second site while the first is up and the desktop doesn't stack another
 * browser on top: it hands the open window the new address and the page changes
 * underneath, which is how Yute's portfolio behaves and what keeps the desktop
 * from filling up with near-identical IE windows.
 *
 * The Internet Explorer *icon* is the one exception, and deliberately so: if
 * the browser is already open it's brought to the front as it is, rather than
 * throwing away whatever you were reading to go back to the home page.
 */
const IE_WINDOW_KEY = 'internet';

/** Market Watch's window, opened by the coin in the system tray. */
const STOCKS_WINDOW_KEY = 'stocks';

// Apps whose icon just opens an external URL in a new tab. (The GitHub desktop
// icon deliberately isn't here any more — it opens a window instead, and only
// its maximize button leaves the site. Start -> Github still links out.)
//
// LinkedIn has to be one of these: linkedin.com sends `X-Frame-Options:
// SAMEORIGIN`, so it cannot be shown in the Internet Explorer window at all —
// an iframe of it renders an empty box. A new tab is the only thing that works.
const EXTERNAL_LINKS: { [key: string]: string } = {
    linkedin: 'https://www.linkedin.com/in/jonas-kjeldmand/',
};

// True when this desktop is the *embedded* copy living inside the 3D monitor's
// CSS3D iframe.
//
// That copy is a whole second instance of this application, running inside a
// 1280x1024 layer that the browser then has to rasterise and re-composite under
// a 3D transform every frame. It therefore runs deliberately lean: no "Step
// Outside" (you cannot recurse into the room you are already in), no screen
// saver, and no Clippy — his animated GIF is decoded continuously, and paying
// for it twice, once inside a texture nobody is reading, is the kind of cost
// that turns a 60fps room into a 30fps one.
const IS_EMBEDDED_IN_CRT = (() => {
    try {
        return window.self !== window.top;
    } catch {
        return true; // cross-origin access throws => we're framed
    }
})();

export interface DesktopProps {}

type ExtendedWindowAppProps<T> = T & WindowAppProps;

/** A desktop icon and the app it opens. */
type DesktopIcon = DesktopShortcutProps & { appKey: string };

/**
 * Icon ids for the layout.
 *
 * App shortcuts and files share one grid and one no-two-in-a-slot rule, so they
 * need names drawn from one space. The app key rather than the label, so
 * relabelling Notepad to "Notes" doesn't lose where the user had put it.
 */
const shortcutId = (shortcut: DesktopIcon): string =>
    `shortcut:${shortcut.appKey}`;
const fileIconId = (file: DesktopFile): string => `file:${file.id}`;

const APPLICATIONS: {
    [key in string]: {
        key: string;
        name: string;
        shortcutIcon: IconName;
        component: React.FC<ExtendedWindowAppProps<any>>;
    };
} = {
    showcase: {
        key: 'showcase',
        name: 'My Showcase',
        shortcutIcon: 'showcaseIcon',
        component: ShowcaseExplorer,
    },

    // Opens the browser at its home page (see IE_HOME in websites.ts). Same
    // window every other site on this desktop opens in.
    internet: {
        key: 'internet',
        name: 'Internet Explorer',
        shortcutIcon: 'internetExplorerIcon',
        component: WebFrame,
    },

    myComputer: {
        key: 'myComputer',
        name: 'My Computer',
        shortcutIcon: 'myComputerIcon',
        component: MyComputer,
    },

    // Last in the first column, where the bin has sat since Windows 95 put it
    // on the desktop and refused to let anyone take it off again.
    recycleBin: {
        key: 'recycleBin',
        name: 'Recycle Bin',
        shortcutIcon: 'recycleBinIcon',
        component: RecycleBin,
    },

    trail: {
        key: 'trail',
        name: 'The Oregon Trail',
        shortcutIcon: 'trailIcon',
        component: OregonTrail,
    },
    doom: {
        key: 'doom',
        name: 'Doom',
        shortcutIcon: 'doomIcon',
        component: Doom,
    },
    guestbook: {
        key: 'guestbook',
        // The Store and the desktop both called this MSN Messenger while the
        // window called it MSN; it is one program, so it has one name.
        name: 'MSN Messenger',
        shortcutIcon: 'msnIcon',
        component: Guestbook,
    },
    scrabble: {
        key: 'scrabble',
        name: 'Scrabble',
        shortcutIcon: 'scrabbleIcon',
        component: Scrabble,
    },

    // Reached from the Start menu, from My Computer > Hard Disk (C:), and from
    // Run. Paint and Notepad, the two programs in it that write files you keep,
    // have earned icons of their own on the desktop; the rest are in here.
    programs: {
        key: 'programs',
        name: 'Programs',
        shortcutIcon: 'programsFolderIcon',
        component: ProgramsFolder,
    },

    credits: {
        key: 'credits',
        name: 'Credits',
        shortcutIcon: 'credits',
        component: Credits,
    },

    // Reached from Start > Games and C:\\Games, like the other games without a
    // desktop icon. One fixed answer, so it is a joke you can only tell once.
    jonordle: {
        key: 'jonordle',
        name: 'Jonordle',
        shortcutIcon: 'scrabbleIcon',
        component: Jonordle,
    },

    minesweeper: {
        key: 'minesweeper',
        name: 'Minesweeper',
        shortcutIcon: 'minesweeperIcon',
        component: Minesweeper,
    },

    // Launches the 3D CRT-room experience instead of a window (see Desktop render).
    // `component` is unused for this entry; kept only to satisfy the map's type.
    stepOutside: {
        key: 'stepOutside',
        name: 'Step Outside',
        shortcutIcon: 'computerBig',
        component: floatingSphere,
    },

    floating: {
        key: 'floating',
        name: 'Interactive Attractor',
        shortcutIcon: 'floatingSphere',
        component: floatingSphere,
    },
    // Browses my repositories inside a window (github.com can't be iframed —
    // it sends X-Frame-Options: deny — so GitHubViewer reads their REST API).
    github: {
        key: 'github',
        name: 'GitHub',
        shortcutIcon: 'githubIcon',
        component: GitHubViewer,
    },

    mail: {
        key: 'mail',
        name: 'Mail',
        shortcutIcon: 'mailIcon',
        component: Mail,
    },

    about: {
        key: 'about',
        name: 'About',
        shortcutIcon: 'aboutIcon',
        component: About,
    },

    // Add/Remove Programs. Decides which of the optional apps get a desktop
    // icon (see `installedApps.ts`), so it stays on the desktop itself —
    // uninstalling everything must never leave you without the way back.
    store: {
        key: 'store',
        name: 'Store',
        shortcutIcon: 'storeIcon',
        component: Store,
    },

    // The two games written for this desktop. Reached from Hard Disk (C:) >
    // Games and Start > Games, like the rest of the games that aren't on the
    // desktop.
    snake: {
        key: 'snake',
        name: 'Snake',
        shortcutIcon: 'snakeIcon',
        component: Snake,
    },

    tetris: {
        key: 'tetris',
        name: 'Tetris',
        shortcutIcon: 'tetrisIcon',
        component: Tetris,
    },

    // Right-click My Computer > Properties, and Run "systemProperties".
    systemProperties: {
        key: 'systemProperties',
        name: 'System Properties',
        shortcutIcon: 'systemIcon',
        component: SystemProperties,
    },

    // Start-menu entries. They open real windows (taskbar entry, minimize,
    // drag) but deliberately have no desktop icon, same as Windows 95.
    settings: {
        key: 'settings',
        name: 'Display Properties',
        shortcutIcon: 'settingsIcon',
        component: Settings,
    },

    run: {
        key: 'run',
        name: 'Run',
        shortcutIcon: 'runIcon',
        component: Run,
    },

    // --- Start -> Projects ------------------------------------------------
    // Live sites, opened in an Internet Explorer window rather than a new tab.
    // All three embed fine (none of them send X-Frame-Options).
    pinPortrait: {
        key: 'pinPortrait',
        name: 'Pin Portrait',
        shortcutIcon: 'cameraIcon',
        component: WebFrame,
    },

    emojiHeatmap: {
        key: 'emojiHeatmap',
        name: 'Emoji Heatmap',
        shortcutIcon: 'chartIcon',
        component: WebFrame,
    },

    cellularAsciimata: {
        key: 'cellularAsciimata',
        name: 'Cellular ASCIImata',
        shortcutIcon: 'consolePromptIcon',
        component: WebFrame,
    },

    // --- Start -> Resume --------------------------------------------------
    resumeFile: {
        key: 'resumeFile',
        name: 'Resume File - My CV',
        shortcutIcon: 'resumeFileIcon',
        component: ResumeFile,
    },

    selectedWebsites: {
        key: 'selectedWebsites',
        name: 'Selected Websites',
        shortcutIcon: 'selectedWebsitesIcon',
        component: WebFrame,
    },

    scroll: {
        key: 'scroll',
        name: 'Scroll.',
        shortcutIcon: 'scrollIcon',
        component: WebFrame,
    },

    // Start -> Resume. linkedin.com refuses to be framed, so this one leaves for
    // a real tab rather than opening a window (see EXTERNAL_LINKS).
    linkedin: {
        key: 'linkedin',
        name: 'LinkedIn',
        shortcutIcon: 'linkedinIcon',
        component: WebFrame,
    },

    // --- My Computer > Hard Disk (D:) > Utility ----------------------------
    // Also what the coin in the system tray opens (see Toolbar.tsx).
    stocks: {
        key: 'stocks',
        name: 'Market Watch',
        shortcutIcon: 'stocksIcon',
        component: StockWatch,
    },

    taskManager: {
        key: 'taskManager',
        name: 'Task Manager',
        shortcutIcon: 'taskManagerIcon',
        component: TaskManager,
    },

    patchNotes: {
        key: 'patchNotes',
        name: 'Patch Notes',
        shortcutIcon: 'patchNotesIcon',
        component: PatchNotes,
    },

    resetStorage: {
        key: 'resetStorage',
        name: 'Reset Storage',
        shortcutIcon: 'resetStorageIcon',
        component: ResetStorage,
    },

    // Full-window versions of three more tray applets — see Toolbar.tsx and
    // TrayPanels.tsx for the popups they share their reading with.
    network: {
        key: 'network',
        name: 'Dial-Up Networking',
        shortcutIcon: 'dialupIcon',
        component: NetworkInfo,
    },

    powerMeter: {
        key: 'powerMeter',
        name: 'Power Meter',
        shortcutIcon: 'batteryIcon',
        component: PowerMeter,
    },

    weatherStation: {
        key: 'weatherStation',
        name: 'Weather Station',
        shortcutIcon: 'weatherSunIcon',
        component: WeatherStation,
    },
};

/**
 * The Windows 98 programs vendored from 98.js — Paint, Notepad, Pinball and
 * the rest (see `win98Programs.ts`). They all open the same way, a
 * ProgramFrame around a static page under `public/98/`, so they're registered
 * from that one list rather than spelled out here.
 *
 * Most of them are reached the way Windows 98 reached them: the Programs
 * folder, the Start menu, My Computer > Hard Disk (C:), or by typing the name
 * into Run. Three are on the desktop — see DESKTOP_ORDER.
 */
WIN98_PROGRAMS.forEach((program) => {
    APPLICATIONS[program.key] = {
        key: program.key,
        name: program.name,
        shortcutIcon: program.icon,
        component: ProgramFrame,
    };
});

/**
 * The desktop, in order.
 *
 * This list *is* the desktop: what has an icon, and where it sits. Positions
 * are filled a column at a time (`GRID.perColumn` of them, top to bottom, then
 * across), so the first eight are the left-hand column and the rest are the
 * one beside it.
 *
 *   My Showcase           Interactive Attractor
 *   My Computer           GitHub
 *   Internet Explorer     Step Outside
 *   Doom                  Mail
 *   Pinball               MSN Messenger
 *   Store                 Paint
 *   About                 Notes
 *   Recycle Bin
 *
 * Everything else in APPLICATIONS is still on the machine and still opens the
 * same window — from the Start menu, from a folder, or by typing its name into
 * Run. Not being on the desktop is a statement about the desktop, not about the
 * program.
 */
const DESKTOP_ORDER: string[] = [
    'showcase',
    'myComputer',
    'internet',
    'doom',
    'pinball',
    'store',
    'about',
    'recycleBin',
    'floating',
    'github',
    'stepOutside',
    'mail',
    'guestbook',
    'paint',
    'notepad',
];

/**
 * Where the desktop label differs from the program's own name.
 *
 * Only Notepad, and only because what it is *for* here is the notes you write
 * and keep in My Documents. The window it opens is still Notepad.
 */
const DESKTOP_LABELS: { [key: string]: string } = {
    notepad: 'Notes',
};

/**
 * What you can type into Run. Everything except Run itself, and no "Step
 * Outside" when we're already inside the 3D monitor.
 */
const runnablePrograms = Object.keys(APPLICATIONS)
    .map((key) => APPLICATIONS[key])
    .filter(
        (app) =>
            app.key !== 'run' &&
            !(IS_EMBEDDED_IN_CRT && FULLSCREEN_EXPERIENCES.includes(app.key))
    )
    .map((app) => ({ key: app.key, name: app.name }));

const Desktop: React.FC<DesktopProps> = (props) => {
    const [windows, setWindows] = useState<DesktopWindows>({});

    // Whatever the browser was last asked to show (see IE_WINDOW_KEY). Injected
    // into the open WebFrame at render time, so a request made while it's up
    // reaches it as a navigation rather than as a second window.
    const [ieNav, setIeNav] = useState<NavRequest | null>(null);

    // The same idea for Market Watch: the tray can ask an already-open window
    // for a different company instead of there being two of them.
    const [stockRequest, setStockRequest] = useState<StockRequest | null>(null);

    /**
     * A desktop icon, plus the APPLICATIONS key behind it — the key is what the
     * right-click menu and the Store need in order to talk about the app rather
     * than about the icon's label.
     */
    const [shortcuts, setShortcuts] = useState<DesktopIcon[]>([]);

    const [shutdown, setShutdown] = useState(false);
    const [numShutdowns, setNumShutdowns] = useState(1);
    // Start -> Shut down opens a confirmation dialog; "Log off" from it drops
    // to the log-on screen rather than ending the session outright.
    const [shutdownDialogOpen, setShutdownDialogOpen] = useState(false);
    const [loggedOff, setLoggedOff] = useState(false);

    // When true, the 2D desktop recedes and the 3D CRT-room experience takes over.
    const [experienceOpen, setExperienceOpen] = useState(false);

    /**
     * Whether the 2D desktop is dropped out of the render tree altogether.
     *
     * Trails `experienceOpen` by one frame on the way in — long enough for the
     * recede to be handed over to an overlay that is already opaque — and leads
     * it on the way out, so the desktop is drawn and settled again before the
     * 3D room's snow clears off it.
     */
    const [stageHidden, setStageHidden] = useState(false);
    useEffect(() => {
        if (!experienceOpen) {
            setStageHidden(false);
            return;
        }
        const id = window.setTimeout(() => setStageHidden(true), 120);
        return () => window.clearTimeout(id);
    }, [experienceOpen]);

    // Which optional apps have an icon right now — the Store writes this, and
    // subscribing here is what makes an install or a removal show up at once.
    const isInstalled = useInstalledApps();

    /**
     * The open right-click menu, if any. Its coordinates are in desktop space,
     * not screen space (see `ContextMenu`), and it is rendered inside the
     * resolution wrapper so it lands under the cursor at any scale.
     */
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        items: ContextMenuItem[];
    } | null>(null);

    // Screen saver settings, written by Display Properties. Subscribed rather
    // than read once, so choosing a different saver takes effect immediately.
    const screensaver = useScreensaverSettings();

    // Whether Start has ever been opened this session. The only thing that
    // reads it is the "Click here to begin" balloon, which has then done its job.
    const [startMenuUsed, setStartMenuUsed] = useState(false);

    // Desktop appearance, changed from Start → Settings (persisted).
    const theme = useTheme();

    // Retro "screen resolution" — scales the 2D desktop only (persisted).
    const [resolution, setResolutionState] = useState<Resolution>(loadResolution());
    const resolutionScale = scaleFor(resolution);
    setCurrentScale(resolutionScale); // keep window drag/resize scale-aware
    const setResolution = useCallback((r: Resolution) => {
        saveResolution(r);
        setResolutionState(r);
    }, []);

    /**
     * Where the user has dragged things to, keyed by `PlacedIcon.id`.
     *
     * This lasts the visit and no longer (see `iconPositions.ts`), so every
     * icon is back in its own slot the next time the site is opened.
     */
    const [iconPositions, setIconPositions] = useState<Record<string, IconPos>>(
        loadPositions
    );

    /**
     * The icon the user last put down. It is the one thing the overlap rule
     * will not move: whatever else has to shuffle, the icon you just dropped
     * stays under your finger.
     */
    const [pinnedIcon, setPinnedIcon] = useState<string | undefined>(undefined);

    /**
     * The grid shrinks when the window does, and icons that no longer fit have
     * to be given somewhere else to sit — so a resize (or an iPad turned on its
     * side) has to re-run the layout.
     */
    const [, bumpLayout] = useState(0);
    useEffect(() => {
        const onResize = () => bumpLayout((n) => n + 1);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const moveIcon = useCallback(
        (id: string, from: IconPos, dx: number, dy: number) => {
            const scale = scaleFor(loadResolution());
            const next = snap(from.x + dx, from.y + dy, iconBounds(scale));
            setPinnedIcon(id);
            setIconPositions((prev) => {
                const updated = { ...prev, [id]: next };
                savePositions(updated);
                return updated;
            });
        },
        []
    );

    /**
     * Arrange Icons. By name is alphabetical; by type groups the folders and
     * system icons first and the applications after, which is roughly what
     * Explorer's "by Type" did with a desktop full of shortcuts.
     */
    const arrange = useCallback(
        (order: ArrangeOrder) => {
            const system = ['showcase', 'myComputer', 'internet', 'recycleBin', 'store'];
            const sorted = [...shortcuts].sort((a, b) => {
                if (order === 'type') {
                    const rank = (s: DesktopIcon) => {
                        const i = system.indexOf(s.appKey);
                        return i === -1 ? system.length : i;
                    };
                    const diff = rank(a) - rank(b);
                    if (diff !== 0) return diff;
                }
                return a.shortcutName.localeCompare(b.shortcutName);
            });
            // Nothing is pinned any more — the whole point of Arrange is that
            // it overrides where things were put, including the last drag.
            setPinnedIcon(undefined);
            setIconPositions(
                arrangeIcons(
                    sorted.map((s) => shortcutId(s)),
                    iconBounds(scaleFor(loadResolution()))
                )
            );
        },
        [shortcuts]
    );

    const lineUp = useCallback(() => {
        setPinnedIcon(undefined);
        setIconPositions(lineUpIcons(scaleFor(loadResolution())));
    }, []);

    // --- Desktop files (the documents, not the app shortcuts) --------------
    // Files live either on the desktop or in the Recycle Bin, and can be dragged
    // between the two. See `desktopFiles.ts`.
    const files = useDesktopFiles();
    const desktopFiles = files.filter((f) => f.location === 'desktop');
    const binIsEmpty = !files.some((f) => f.location === 'recycleBin');
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

    // The Recycle Bin shortcut, so a file dropped on top of it can be detected.
    const binShortcutRef = useRef<HTMLDivElement>(null);

    // What's open right now, readable from callbacks without making every one of
    // them depend on `windows` — used to tell "open the browser" apart from
    // "the browser is already open, send it somewhere".
    const windowsRef = useRef(windows);
    windowsRef.current = windows;

    // Always the latest openApp, for the shortcut closures built on mount.
    const openAppRef = useRef<(key: string) => void>(() => {});
    // Same, for windows that need to open a picture (My Computer's Pictures).
    const openPictureRef = useRef<
        (name: string, image: string, size: number) => void
    >(() => {});
    // Same again, for a text file saved on the fake C: drive (My Documents).
    const openDocumentRef = useRef<(file: Win98File) => void>(() => {});
    // And for a document dragged out of one of those folders (see below).
    const onDocumentDroppedOutRef = useRef<
        (file: Win98File, screen: { x: number; y: number }) => Promise<void>
    >(() => Promise.resolve());

    /** Was this drop on top of the Recycle Bin icon? Screen coordinates. */
    const overBin = useCallback((screen: { x: number; y: number }): boolean => {
        const bin = binShortcutRef.current?.getBoundingClientRect();
        return (
            !!bin &&
            screen.x >= bin.left &&
            screen.x <= bin.right &&
            screen.y >= bin.top &&
            screen.y <= bin.bottom
        );
    }, []);

    const onFileDropped = useCallback(
        (
            file: DesktopFile,
            // Where the icon was *drawn*, which is not always where the file
            // says it is: the overlap rule may have moved it since. Measuring
            // the drag from anywhere else makes the icon jump on release.
            from: IconPos,
            dx: number,
            dy: number,
            screen: { x: number; y: number }
        ) => {
            if (overBin(screen)) {
                binFile(file);
                setSelectedFileId(null);
                return;
            }

            const scale = scaleFor(loadResolution());
            setPinnedIcon(fileIconId(file));
            updateFile(file.id, {
                desktopPos: snap(from.x + dx, from.y + dy, iconBounds(scale)),
            });
        },
        [overBin]
    );

    /**
     * A desktop shortcut let go of.
     *
     * Dropping one on the Recycle Bin is the direct-manipulation way of saying
     * what the right-click menu's Delete says, and it means the same thing: the
     * icon goes, the program stays on the machine, and the choice is remembered
     * for this visitor (see `installedApps.ts`). Only the Store's own apps can
     * go — drag My Computer at the bin and it simply lands next to it, which is
     * also what Windows 95 did.
     */
    const onShortcutDropped = useCallback(
        (
            shortcut: DesktopIcon,
            at: IconPos,
            dx: number,
            dy: number,
            screen: { x: number; y: number }
        ) => {
            if (
                shortcut.appKey !== 'recycleBin' &&
                isOptional(shortcut.appKey) &&
                overBin(screen)
            ) {
                uninstall(shortcut.appKey);
                return;
            }
            moveIcon(shortcutId(shortcut), at, dx, dy);
        },
        [moveIcon, overBin]
    );

    /**
     * A document dragged out of My Documents and let go of somewhere else.
     *
     * The file really moves — out of Notes or Paintings, onto the desktop or
     * into the bin — so the folder it came from stops listing it. Awaited so the
     * folder can refresh once it is true rather than a moment before.
     */
    const onDocumentDroppedOut = useCallback(
        async (file: Win98File, screen: { x: number; y: number }) => {
            if (overBin(screen)) {
                await takeDocumentToBin(file);
                return;
            }
            const scale = scaleFor(loadResolution());
            const id = await takeDocumentToDesktop(
                file,
                screenToIconSlot(screen.x, screen.y, scale)
            );
            setPinnedIcon(`file:${id}`);
        },
        [overBin]
    );
    onDocumentDroppedOutRef.current = onDocumentDroppedOut;

    useEffect(() => {
        if (shutdown === true) {
            rebootDesktop();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shutdown]);

    useEffect(() => {
        const newShortcuts: DesktopIcon[] = [];
        DESKTOP_ORDER.forEach((key) => {
            const app = APPLICATIONS[key];
            if (!app) return;
            // Don't offer the 3D experience from inside the 3D monitor.
            if (IS_EMBEDDED_IN_CRT && FULLSCREEN_EXPERIENCES.includes(app.key)) {
                return;
            }
            newShortcuts.push({
                shortcutName: DESKTOP_LABELS[app.key] || app.name,
                icon: app.shortcutIcon,
                // Every launcher — shortcut, Start menu, Run, folder — goes
                // through the same openApp, so an app opens identically
                // whichever way you reach it. The ref keeps this closure (built
                // once, on mount) pointing at the current openApp.
                onOpen: () => openAppRef.current(app.key),
                appKey: app.key,
            });
        });

        newShortcuts.forEach((shortcut) => {
            if (shortcut.appKey === 'showcase') {
                shortcut.onOpen();
            }
        });

        setShortcuts(newShortcuts);

        // Anything a previous visit left lying about goes back to My Documents
        // (see documentFiles.ts). Costs nothing — and doesn't open the drive at
        // all — unless something was actually left out.
        reclaimStrayDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const rebootDesktop = useCallback(() => {
        setWindows({});
    }, []);

    const removeWindow = useCallback((key: string) => {
        // Absolute hack and a half
        setTimeout(() => {
            setWindows((prevWindows) => {
                const newWindows = { ...prevWindows };
                delete newWindows[key];
                return newWindows;
            });
        }, 100);
    }, []);

    const minimizeWindow = useCallback((key: string) => {
        setWindows((prevWindows) => {
            const newWindows = { ...prevWindows };
            newWindows[key].minimized = true;
            return newWindows;
        });
    }, []);

    const getHighestZIndex = useCallback((): number => {
        let highestZIndex = 0;
        Object.keys(windows).forEach((key) => {
            const window = windows[key];
            if (window) {
                if (window.zIndex > highestZIndex)
                    highestZIndex = window.zIndex;
            }
        });
        return highestZIndex;
    }, [windows]);

    const toggleMinimize = useCallback(
        (key: string) => {
            const newWindows = { ...windows };
            const highestIndex = getHighestZIndex();
            if (
                newWindows[key].minimized ||
                newWindows[key].zIndex === highestIndex
            ) {
                newWindows[key].minimized = !newWindows[key].minimized;
            }
            newWindows[key].zIndex = getHighestZIndex() + 1;
            setWindows(newWindows);
        },
        [windows, getHighestZIndex]
    );

    const onWindowInteract = useCallback(
        (key: string) => {
            setWindows((prevWindows) => ({
                ...prevWindows,
                [key]: {
                    ...prevWindows[key],
                    zIndex: 1 + getHighestZIndex(),
                },
            }));
        },
        [setWindows, getHighestZIndex]
    );

    /**
     * Brings an already-open window forward, un-minimizing it on the way — what
     * launching an app that's running does, instead of opening a second copy.
     */
    const focusWindow = useCallback(
        (key: string) => {
            setWindows((prevWindows) => {
                if (!prevWindows[key]) return prevWindows;
                return {
                    ...prevWindows,
                    [key]: {
                        ...prevWindows[key],
                        minimized: false,
                        zIndex: 1 + getHighestZIndex(),
                    },
                };
            });
        },
        [getHighestZIndex]
    );

    /** Renames a taskbar button — the browser does this as it navigates. */
    const renameWindow = useCallback((key: string, name: string) => {
        setWindows((prevWindows) => {
            const win = prevWindows[key];
            if (!win || win.name === name) return prevWindows;
            return { ...prevWindows, [key]: { ...win, name } };
        });
    }, []);

    /**
     * Start -> Shut down now asks first (see ShutdownDialog) instead of
     * dropping straight into the shutdown sequence.
     */
    const startShutdown = useCallback(() => {
        setShutdownDialogOpen(true);
    }, []);

    const confirmShutdown = useCallback(
        (choice: ShutdownChoice) => {
            setShutdownDialogOpen(false);
            switch (choice) {
                case 'shutdown':
                    setTimeout(() => {
                        setShutdown(true);
                        setNumShutdowns(numShutdowns + 1);
                    }, 600);
                    break;
                case 'restart':
                    window.location.reload();
                    break;
                case 'logoff':
                    // Clear the session the way logging out would: every window
                    // closes, and you come back to the log-on screen.
                    setWindows({});
                    setLoggedOff(true);
                    break;
            }
        },
        [numShutdowns]
    );

    const addWindow = useCallback(
        (
            key: string,
            element: JSX.Element,
            // Windows opened for a *file* rather than an app aren't in
            // APPLICATIONS, so they bring their own taskbar name and icon.
            meta?: { name: string; icon: IconName }
        ) => {
            setWindows((prevState) => ({
                ...prevState,
                [key]: {
                    zIndex: getHighestZIndex() + 1,
                    minimized: false,
                    component: element,
                    name: meta ? meta.name : APPLICATIONS[key].name,
                    icon: meta ? meta.icon : APPLICATIONS[key].shortcutIcon,
                },
            }));
        },
        [getHighestZIndex]
    );

    /**
     * Opens any app by its APPLICATIONS key. Used by the Start menu and by the
     * Run dialog; the desktop shortcuts have their own closures built above.
     * Handles the same fullscreen/external-link special cases as a shortcut,
     * and injects the extra props Settings and Run need.
     */
    const openApp = useCallback(
        (key: string, options?: LaunchOptions) => {
            const app = APPLICATIONS[key];
            if (!app) return;

            if (FULLSCREEN_EXPERIENCES.includes(app.key)) {
                setExperienceOpen(true);
                return;
            }
            if (EXTERNAL_LINKS[app.key]) {
                window.open(
                    EXTERNAL_LINKS[app.key],
                    '_blank',
                    'noopener,noreferrer'
                );
                return;
            }

            const shared = {
                key: app.key,
                onInteract: () => onWindowInteract(app.key),
                onMinimize: () => minimizeWindow(app.key),
                onClose: () => removeWindow(app.key),
            };

            if (app.key === 'settings') {
                addWindow(
                    app.key,
                    <Settings
                        {...shared}
                        resolution={resolution}
                        setResolution={setResolution}
                    />
                );
                return;
            }

            if (app.key === 'run') {
                addWindow(
                    app.key,
                    <Run
                        {...shared}
                        programs={runnablePrograms}
                        launch={(target) => openAppRef.current(target)}
                    />
                );
                return;
            }

            if (app.key === 'programs') {
                addWindow(
                    app.key,
                    <ProgramsFolder
                        {...shared}
                        openApp={(target) => openAppRef.current(target)}
                    />
                );
                return;
            }

            // One Market Watch, the way there's one browser: the tray's rows
            // and its search box send an open window somewhere new rather than
            // stacking a second copy of the app on top of it.
            if (app.key === STOCKS_WINDOW_KEY) {
                if (windowsRef.current[STOCKS_WINDOW_KEY]) {
                    if (options?.symbol || options?.query) {
                        setStockRequest((prev) => ({
                            ...options,
                            seq: (prev?.seq ?? 0) + 1,
                        }));
                    }
                    focusWindow(STOCKS_WINDOW_KEY);
                    return;
                }
                const opening: StockRequest = { ...options, seq: 0 };
                setStockRequest(opening);
                addWindow(app.key, <StockWatch {...shared} request={opening} />);
                return;
            }

            if (app.key === 'store') {
                addWindow(
                    app.key,
                    <Store
                        {...shared}
                        iconFor={(target) =>
                            APPLICATIONS[target]?.shortcutIcon || 'folderIcon'
                        }
                        // Nothing should offer to install the 3D room from
                        // inside the 3D room.
                        hiddenKeys={
                            IS_EMBEDDED_IN_CRT ? FULLSCREEN_EXPERIENCES : []
                        }
                    />
                );
                return;
            }

            if (app.key === 'myComputer') {
                addWindow(
                    app.key,
                    <MyComputer
                        {...shared}
                        openApp={(target) => openAppRef.current(target)}
                        openPicture={(name, full, size) =>
                            openPictureRef.current(name, full, size)
                        }
                        openDocument={(file) => openDocumentRef.current(file)}
                        onDragOut={(file, screen) =>
                            onDocumentDroppedOutRef.current(file, screen)
                        }
                    />
                );
                return;
            }

            // Task Manager deliberately falls through to the generic case below.
            // Its `tasks` list has to stay current as windows open and close, so
            // the props are injected at render time instead of here — see the
            // cloneElement call in the render, which re-runs on every change to
            // `windows`. Passing a snapshot here would freeze the list.

            // Paint, Notepad, Pinball, … — the vendored 98.js programs, each
            // one a static page hosted in a window of its own.
            const program = win98ProgramByKey(app.key);
            if (program) {
                addWindow(
                    app.key,
                    <ProgramFrame {...shared} program={program} />
                );
                return;
            }

            // Every web address on this desktop lands in the same browser
            // window (see IE_WINDOW_KEY). If it's already open we navigate it;
            // only the first site of the session actually opens a window.
            const site = siteByKey(app.key);
            if (site) {
                if (windowsRef.current[IE_WINDOW_KEY]) {
                    // The Internet Explorer icon itself just raises the browser
                    // — it isn't a request for a particular page, so it must not
                    // throw away the one you're on.
                    if (app.key !== IE_WINDOW_KEY) {
                        setIeNav((prev) => ({
                            url: site.url,
                            seq: (prev?.seq ?? 0) + 1,
                        }));
                    }
                    focusWindow(IE_WINDOW_KEY);
                    return;
                }

                const scale = scaleFor(loadResolution());
                const box = site.placement
                    ? site.placement(
                          window.innerWidth / scale,
                          window.innerHeight / scale
                      )
                    : { width: site.width, height: site.height, top: 44, left: 80 };
                const opening: NavRequest = { url: site.url, seq: 0 };
                setIeNav(opening);
                addWindow(
                    IE_WINDOW_KEY,
                    <WebFrame
                        {...shared}
                        key={IE_WINDOW_KEY}
                        url={site.url}
                        width={box.width}
                        height={box.height}
                        top={box.top}
                        left={box.left}
                        windowBarIcon="internetExplorerIcon"
                        allowCamera={site.allowCamera}
                        navRequest={opening}
                    />,
                    { name: site.label, icon: 'internetExplorerIcon' }
                );
                return;
            }

            addWindow(app.key, <app.component {...shared} />);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            addWindow,
            onWindowInteract,
            minimizeWindow,
            removeWindow,
            focusWindow,
            resolution,
            setResolution,
        ]
    );

    openAppRef.current = openApp;

    /**
     * Opens any image in the picture viewer — used both by desktop file icons
     * and by the Pictures folder inside My Computer.
     */
    const openPicture = useCallback(
        (name: string, image: string, size: number, icon: IconName = 'jpegIcon') => {
            const key = `picture:${name}`;
            addWindow(
                key,
                <PictureViewer
                    key={key}
                    fileName={name}
                    image={image}
                    size={size}
                    onInteract={() => onWindowInteract(key)}
                    onMinimize={() => minimizeWindow(key)}
                    onClose={() => removeWindow(key)}
                />,
                { name, icon }
            );
        },
        [addWindow, onWindowInteract, minimizeWindow, removeWindow]
    );
    openPictureRef.current = openPicture;

    /**
     * Opens a file saved on the fake C: drive in Notepad — the same Notepad the
     * Programs folder launches, told which file to load.
     *
     * `?path=` is Notepad's own way of being handed a document (see
     * `public/98/programs/notepad/src/app.js`), and it reads it through
     * BrowserFS, so this is the program opening the file rather than us pasting
     * text into it: Save still saves, back to the same place.
     */
    const openDocument = useCallback(
        (file: Win98File) => {
            // A painting opens in Paint, a note in Notepad — whichever program
            // wrote it. Both take the file the same way, on `?path=`.
            //
            // Decided by the name and not by the folder, because a document
            // out on the desktop is not in its folder any more (see
            // `documentFiles.ts`) and still has to open in the right program.
            const isPainting = kindForName(file.name) === 'painting';
            const program = win98ProgramByKey(isPainting ? 'paint' : 'notepad');
            if (!program) return;
            const page = isPainting
                ? '/98/programs/jspaint/index.html'
                : '/98/programs/notepad/index.html';
            const key = `document:${file.path}`;
            addWindow(
                key,
                <ProgramFrame
                    key={key}
                    program={{
                        ...program,
                        name: file.name,
                        src: `${page}?path=${encodeURIComponent(file.path)}`,
                    }}
                    onInteract={() => onWindowInteract(key)}
                    onMinimize={() => minimizeWindow(key)}
                    onClose={() => removeWindow(key)}
                />,
                { name: file.name, icon: isPainting ? 'paintIcon' : 'notepadIcon' }
            );
        },
        [addWindow, onWindowInteract, minimizeWindow, removeWindow]
    );
    openDocumentRef.current = openDocument;

    /**
     * Double-clicking a file on the desktop.
     *
     * A note or a painting opens in the program that wrote it, wherever the
     * file currently happens to be sitting; a picture opens in the viewer.
     */
    const openFile = useCallback(
        (file: DesktopFile) => {
            if (file.doc) {
                openDocumentRef.current({
                    name: file.name,
                    path: file.doc.path,
                    size: file.size * 1024,
                    modified: null,
                });
                return;
            }
            if (!file.image) return;
            openPicture(file.name, file.image, file.size, file.icon);
        },
        [openPicture]
    );

    // --- Right-click menus -------------------------------------------------

    /**
     * Opens a menu at a *screen* point. Everything downstream works in desktop
     * coordinates, so the conversion happens once, here: divide by the
     * resolution scale and subtract nothing else, because the wrapper the menu
     * renders into starts at the top left of the desktop.
     */
    const openContextMenu = useCallback(
        (screenX: number, screenY: number, items: ContextMenuItem[]) => {
            const scale = scaleFor(loadResolution());
            setContextMenu({
                x: screenX / scale,
                y: screenY / scale,
                items,
            });
        },
        []
    );

    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    const onDesktopContextMenu = useCallback(
        (e: React.MouseEvent) => {
            // Only the desktop itself — a right-click that started on an icon or
            // inside a window has already been handled and shouldn't reopen the
            // desktop's own menu on the way up.
            if (e.defaultPrevented) return;
            e.preventDefault();
            openContextMenu(
                e.clientX,
                e.clientY,
                desktopMenu({
                    arrange,
                    lineUp,
                    refresh: () => window.location.reload(),
                    properties: () => openAppRef.current('settings'),
                })
            );
        },
        [openContextMenu, arrange, lineUp]
    );

    const onShortcutContextMenu = useCallback(
        (shortcut: DesktopIcon, screenX: number, screenY: number) => {
            const key = shortcut.appKey;

            if (key === 'recycleBin') {
                openContextMenu(
                    screenX,
                    screenY,
                    recycleBinMenu({
                        open: () => openAppRef.current('recycleBin'),
                        empty: binIsEmpty ? undefined : emptyBin,
                        properties: () => openAppRef.current('systemProperties'),
                    })
                );
                return;
            }

            openContextMenu(
                screenX,
                screenY,
                shortcutMenu({
                    open: shortcut.onOpen,
                    // Only the Store's own apps can be taken off the desktop;
                    // for anything else Delete stays greyed out, as it did for
                    // the system icons in Windows 95.
                    uninstall: isOptional(key) ? () => uninstall(key) : undefined,
                    // My Computer is the one icon whose Properties meant
                    // something, and this is what it opened.
                    properties:
                        key === 'myComputer'
                            ? () => openAppRef.current('systemProperties')
                            : undefined,
                })
            );
        },
        [openContextMenu, binIsEmpty]
    );

    const onFileContextMenu = useCallback(
        (file: DesktopFile, screenX: number, screenY: number) => {
            setSelectedFileId(file.id);
            openContextMenu(
                screenX,
                screenY,
                fileMenu({
                    open: file.image || file.doc ? () => openFile(file) : undefined,
                    delete: () => binFile(file),
                    // A note or a painting out on the desktop can be sent back
                    // to the folder it came from without going via the bin.
                    restore: file.doc
                        ? () => sendDocumentHome(file)
                        : undefined,
                    restoreLabel: 'Put back in My Documents',
                })
            );
        },
        [openContextMenu, openFile]
    );

    // --- Where everything ends up ------------------------------------------
    //
    // Shortcuts and files are laid out together, in one pass, because they
    // share one grid and the rule is that nothing on it may cover anything
    // else. Recomputed every render rather than memoized: it is fifteen icons
    // and a handful of files, and the inputs (what's installed, how big the
    // window is) are exactly the kind that a stale memo gets wrong.
    const bounds = iconBounds(resolutionScale);
    const rows = rowsPerColumn(bounds);

    const visibleShortcuts = shortcuts
        // Anything removed in the Store keeps its grid slot for the icons
        // around it — taking the index before filtering means uninstalling Doom
        // doesn't shuffle the whole column up.
        .map((shortcut, i) => ({ shortcut, i }))
        .filter(({ shortcut }) => isInstalled(shortcut.appKey));

    const placed: PlacedIcon[] = visibleShortcuts
        .map(({ shortcut, i }) => ({
            id: shortcutId(shortcut),
            name: shortcut.shortcutName,
            // Where the user dragged it, or the slot the line-up gives it.
            pos: iconPositions[shortcutId(shortcut)] || defaultPosition(i, rows),
        }))
        .concat(
            desktopFiles.map((file) => ({
                id: fileIconId(file),
                name: file.name,
                pos: file.desktopPos,
            }))
        );

    const layout = resolveLayout(placed, bounds, pinnedIcon);

    return !shutdown ? (
        <div style={styles.desktop}>
            {/* The whole 2D desktop lives on a "stage" that physically recedes
                (scale + tilt + brighten) when the 3D experience takes over, so the
                hand-off reads as being pulled back through the screen. */}
            <motion.div
                style={Object.assign({}, styles.desktopStage, {
                    pointerEvents: experienceOpen ? 'none' : 'auto',
                    backgroundColor: theme.background,
                    // Taken out of the render entirely while the room is up.
                    //
                    // The 3D overlay is opaque from its first frame, so none of
                    // this was ever visible behind it — but the browser was
                    // still laying out, painting and compositing the whole
                    // desktop, animating Clippy's GIF and running a `filter`
                    // over the lot, on the same main thread the room needs. It
                    // is the single largest thing that was making the 3D room
                    // stutter. React state survives `display: none`, so every
                    // open window comes back exactly as it was left.
                    display: stageHidden ? 'none' : undefined,
                })}
                animate={
                    experienceOpen
                        ? { scale: 0.9, rotateX: 7, filter: 'brightness(1.7)' }
                        : { scale: 1, rotateX: 0, filter: 'brightness(1)' }
                }
                transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Resolution wrapper: scales the whole desktop while still filling
                  the viewport (inverse-sized + transform-scaled). */}
              <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${100 / resolutionScale}%`,
                    height: `${100 / resolutionScale}%`,
                    transform: `scale(${resolutionScale})`,
                    transformOrigin: 'top left',
                }}
                onContextMenu={onDesktopContextMenu}
              >
                {/* For each window in windows, loop over and render  */}
                {Object.keys(windows).map((key) => {
                const element = windows[key].component;
                if (!element) return <div key={`win-${key}`}></div>;
                return (
                    <div
                        key={`win-${key}`}
                        style={Object.assign(
                            {},
                            { zIndex: windows[key].zIndex },
                            windows[key].minimized && styles.minimized
                        )}
                    >
                        {React.cloneElement(element, {
                            key,
                            onInteract: () => onWindowInteract(key),
                            onClose: () => removeWindow(key),
                            // The browser's current address is injected here for
                            // the same reason: it changes after the window was
                            // built, every time something else asks for a page.
                            ...(key === IE_WINDOW_KEY
                                ? {
                                      navRequest: ieNav ?? undefined,
                                      onTitleChange: (title: string) =>
                                          renameWindow(key, title),
                                  }
                                : {}),
                            ...(key === STOCKS_WINDOW_KEY
                                ? { request: stockRequest ?? undefined }
                                : {}),
                            // Task Manager's list must reflect what's open right
                            // now, so it's rebuilt here on every render rather
                            // than captured when the window was created.
                            ...(key === 'taskManager'
                                ? {
                                      tasks: Object.keys(windows).map((k) => ({
                                          key: k,
                                          name: windows[k].name,
                                          icon: windows[k].icon,
                                          minimized: !!windows[k].minimized,
                                      })),
                                      endTask: removeWindow,
                                      shutdown: startShutdown,
                                  }
                                : {}),
                        })}
                    </div>
                );
            })}
            <div style={styles.shortcuts}>
                {visibleShortcuts.map(({ shortcut }) => {
                    const pos = layout[shortcutId(shortcut)];
                    const isBin = shortcut.appKey === 'recycleBin';
                    return (
                        <div
                            style={Object.assign({}, styles.shortcutContainer, {
                                top: pos.y,
                                left: pos.x,
                            })}
                            key={`shortcut-${shortcut.appKey}`}
                        >
                            <DesktopShortcut
                                // The bin looks full or empty, like the real one.
                                icon={
                                    isBin && binIsEmpty
                                        ? 'recycleBinEmptyIcon'
                                        : shortcut.icon
                                }
                                innerRef={isBin ? binShortcutRef : undefined}
                                shortcutName={shortcut.shortcutName}
                                onOpen={shortcut.onOpen}
                                onMoved={(dx, dy, screen) =>
                                    onShortcutDropped(
                                        shortcut,
                                        pos,
                                        dx,
                                        dy,
                                        screen
                                    )
                                }
                                onContextMenu={(x, y) =>
                                    onShortcutContextMenu(shortcut, x, y)
                                }
                            />
                        </div>
                    );
                })}

                {/* Files sitting on the desktop — carried out of My Documents,
                    restored from the bin, or dropped on it to throw them away
                    again. */}
                {desktopFiles.map((file) => {
                    const pos = layout[fileIconId(file)];
                    return (
                        <FileIcon
                            key={file.id}
                            file={file}
                            pos={pos}
                            variant="desktop"
                            selected={selectedFileId === file.id}
                            onSelect={() => setSelectedFileId(file.id)}
                            onOpen={() => openFile(file)}
                            onDropped={(dx, dy, screen) =>
                                onFileDropped(file, pos, dx, dy, screen)
                            }
                            onContextMenu={(x, y) =>
                                onFileContextMenu(file, x, y)
                            }
                        />
                    );
                })}
            </div>

            {!IS_EMBEDDED_IN_CRT && (
                <StartBalloon dismissed={startMenuUsed} />
            )}
            <Clippy
                suspended={
                    experienceOpen ||
                    shutdownDialogOpen ||
                    loggedOff ||
                    IS_EMBEDDED_IN_CRT
                }
                openApp={openApp}
            />

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenu.items}
                    onClose={closeContextMenu}
                    bounds={{
                        width: window.innerWidth / resolutionScale,
                        height: window.innerHeight / resolutionScale,
                    }}
                />
            )}
                <Toolbar
                    windows={windows}
                    toggleMinimize={toggleMinimize}
                    shutdown={startShutdown}
                    logOff={() => {
                        setWindows({});
                        setLoggedOff(true);
                    }}
                    onStartOpened={() => setStartMenuUsed(true)}
                    resolution={resolution}
                    setResolution={setResolution}
                    openApp={openApp}
                />
              </div>
            </motion.div>
            <Experience3D
                open={experienceOpen}
                onExit={() => setExperienceOpen(false)}
                accentColor={Colors.turquoise}
            />
            <Screensaver
                kind={screensaver.kind}
                delayMinutes={screensaver.delayMinutes}
                suspended={
                    experienceOpen || shutdownDialogOpen || loggedOff ||
                    IS_EMBEDDED_IN_CRT
                }
            />
            {shutdownDialogOpen && (
                <ShutdownDialog
                    onConfirm={confirmShutdown}
                    onCancel={() => setShutdownDialogOpen(false)}
                />
            )}
            {loggedOff && (
                <LogonScreen onLogon={() => setLoggedOff(false)} />
            )}
        </div>
    ) : (
        <ShutdownSequence
            setShutdown={setShutdown}
            numShutdowns={numShutdowns}
        />
    );
};

const styles: StyleSheetCSS = {
    desktop: {
        position: 'relative',
        minHeight: '100%',
        flex: 1,
        overflow: 'hidden',
        // Dark backdrop revealed at the edges as the stage recedes into 3D.
        backgroundColor: '#05080a',
        perspective: 1200,
    },
    desktopStage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: Colors.turquoise,
        transformOrigin: '50% 45%',
    },
    shutdown: {
        minHeight: '100%',
        flex: 1,
        backgroundColor: '#1d2e2f',
    },
    shortcutContainer: {
        position: 'absolute',
    },
    shortcuts: {
        position: 'absolute',
        top: SHORTCUT_ORIGIN.y,
        left: SHORTCUT_ORIGIN.x,
    },
    minimized: {
        pointerEvents: 'none',
        opacity: 0,
    },
};

export default Desktop;
