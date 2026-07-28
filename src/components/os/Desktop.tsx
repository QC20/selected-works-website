import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Colors from '../../constants/colors';
import ShowcaseExplorer from '../applications/ShowcaseExplorer';
import Doom from '../applications/Doom';
import OregonTrail from '../applications/OregonTrail';
import ShutdownSequence from './ShutdownSequence';
import ThisComputerApp from '../applications/ThisComputer';

import Toolbar from './Toolbar';
import DesktopShortcut, { DesktopShortcutProps } from './DesktopShortcut';
import Scrabble from '../applications/Scrabble';
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
    SHORTCUT_ORIGIN,
    defaultPosition,
    iconBounds,
    loadPositions,
    savePositions,
    snap,
} from './iconPositions';
import FileIcon from './FileIcon';
import PictureViewer from '../applications/PictureViewer';
import {
    DesktopFile,
    moveToRecycleBin,
    updateFile,
    useDesktopFiles,
} from './desktopFiles';

// Apps whose icon launches a full-screen takeover (the 3D experience) rather
// than opening a draggable window. Keyed by their APPLICATIONS key.
const FULLSCREEN_EXPERIENCES = ['stepOutside'];

// Apps whose icon just opens an external URL in a new tab. (The GitHub desktop
// icon deliberately isn't here any more — it opens a window instead, and only
// its maximize button leaves the site. Start -> Github still links out.)
const EXTERNAL_LINKS: { [key: string]: string } = {};

// True when this desktop is the *embedded* copy living inside the 3D monitor's
// CSS3D iframe. In that case we hide "Step Outside" so you can't recurse into
// another 3D room from within the room.
const IS_EMBEDDED_IN_CRT = (() => {
    try {
        return window.self !== window.top;
    } catch {
        return true; // cross-origin access throws => we're framed
    }
})();

export interface DesktopProps {}

type ExtendedWindowAppProps<T> = T & WindowAppProps;

const APPLICATIONS: {
    [key in string]: {
        key: string;
        name: string;
        shortcutIcon: IconName;
        component: React.FC<ExtendedWindowAppProps<any>>;
        /** Reachable from the Start menu only — no icon on the desktop. */
        startMenuOnly?: boolean;
    };
} = {
    showcase: {
        key: 'showcase',
        name: 'My Showcase',
        shortcutIcon: 'showcaseIcon',
        component: ShowcaseExplorer,
    },

    internet: {
        key: 'internet',
        name: 'Internet Explorer',
        shortcutIcon: 'internetExplorerIcon',
        component: ThisComputerApp,
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
        name: 'MSN',
        shortcutIcon: 'msnIcon',
        component: Guestbook,
    },
    scrabble: {
        key: 'scrabble',
        name: 'Scrabble',
        shortcutIcon: 'scrabbleIcon',
        component: Scrabble,
    },

    credits: {
        key: 'credits',
        name: 'Credits',
        shortcutIcon: 'credits',
        component: Credits,
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

    // Launches the 3D CRT-room experience instead of a window (see Desktop render).
    // `component` is unused for this entry; kept only to satisfy the map's type.
    stepOutside: {
        key: 'stepOutside',
        name: 'Step Outside',
        shortcutIcon: 'computerBig',
        component: floatingSphere,
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
        shortcutIcon: 'credits',
        component: About,
    },

    recycleBin: {
        key: 'recycleBin',
        name: 'Recycle Bin',
        shortcutIcon: 'recycleBinIcon',
        component: RecycleBin,
    },

    // Start-menu entries. They open real windows (taskbar entry, minimize,
    // drag) but deliberately have no desktop icon, same as Windows 95.
    settings: {
        key: 'settings',
        name: 'Display Properties',
        shortcutIcon: 'settingsIcon',
        component: Settings,
        startMenuOnly: true,
    },

    run: {
        key: 'run',
        name: 'Run',
        shortcutIcon: 'runIcon',
        component: Run,
        startMenuOnly: true,
    },
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

    const [shortcuts, setShortcuts] = useState<DesktopShortcutProps[]>([]);

    const [shutdown, setShutdown] = useState(false);
    const [numShutdowns, setNumShutdowns] = useState(1);

    // When true, the 2D desktop recedes and the 3D CRT-room experience takes over.
    const [experienceOpen, setExperienceOpen] = useState(false);

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

    // User-arranged desktop icon positions (keyed by icon name, persisted).
    const [iconPositions, setIconPositions] = useState<Record<string, IconPos>>(
        loadPositions
    );

    const moveIcon = useCallback(
        (name: string, from: IconPos, dx: number, dy: number) => {
            const scale = scaleFor(loadResolution());
            const next = snap(from.x + dx, from.y + dy, iconBounds(scale));
            setIconPositions((prev) => {
                const updated = { ...prev, [name]: next };
                savePositions(updated);
                return updated;
            });
        },
        []
    );

    // --- Desktop files (the documents, not the app shortcuts) --------------
    // Files live either on the desktop or in the Recycle Bin, and can be dragged
    // between the two. See `desktopFiles.ts`.
    const files = useDesktopFiles();
    const desktopFiles = files.filter((f) => f.location === 'desktop');
    const binIsEmpty = !files.some((f) => f.location === 'recycleBin');
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

    // The Recycle Bin shortcut, so a file dropped on top of it can be detected.
    const binShortcutRef = useRef<HTMLDivElement>(null);

    const onFileDropped = useCallback(
        (file: DesktopFile, dx: number, dy: number, screen: { x: number; y: number }) => {
            const bin = binShortcutRef.current?.getBoundingClientRect();
            const droppedOnBin =
                !!bin &&
                screen.x >= bin.left &&
                screen.x <= bin.right &&
                screen.y >= bin.top &&
                screen.y <= bin.bottom;

            if (droppedOnBin) {
                moveToRecycleBin(file.id);
                setSelectedFileId(null);
                return;
            }

            const scale = scaleFor(loadResolution());
            updateFile(file.id, {
                desktopPos: snap(
                    file.desktopPos.x + dx,
                    file.desktopPos.y + dy,
                    iconBounds(scale)
                ),
            });
        },
        []
    );

    useEffect(() => {
        if (shutdown === true) {
            rebootDesktop();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shutdown]);

    useEffect(() => {
        const newShortcuts: DesktopShortcutProps[] = [];
        Object.keys(APPLICATIONS).forEach((key) => {
            const app = APPLICATIONS[key];
            // Don't offer the 3D experience from inside the 3D monitor.
            if (IS_EMBEDDED_IN_CRT && FULLSCREEN_EXPERIENCES.includes(app.key)) {
                return;
            }
            // Settings / Run live in the Start menu, not on the desktop.
            if (app.startMenuOnly) {
                return;
            }
            newShortcuts.push({
                shortcutName: app.name,
                icon: app.shortcutIcon,
                onOpen: () => {
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
                    addWindow(
                        app.key,
                        <app.component
                            onInteract={() => onWindowInteract(app.key)}
                            onMinimize={() => minimizeWindow(app.key)}
                            onClose={() => removeWindow(app.key)}
                            key={app.key}
                        />
                    );
                },
            });
        });

        newShortcuts.forEach((shortcut) => {
            if (shortcut.shortcutName === "My Showcase") {
                shortcut.onOpen();
            }
        });

        setShortcuts(newShortcuts);
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

    const startShutdown = useCallback(() => {
        setTimeout(() => {
            setShutdown(true);
            setNumShutdowns(numShutdowns + 1);
        }, 600);
    }, [numShutdowns]);

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
        (key: string) => {
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
                        launch={(target) => openApp(target)}
                    />
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
            resolution,
            setResolution,
        ]
    );

    /** Double-clicking a picture on the desktop opens it in the viewer. */
    const openFile = useCallback(
        (file: DesktopFile) => {
            if (!file.image) return;
            const key = `file:${file.id}`;
            addWindow(
                key,
                <PictureViewer
                    key={key}
                    fileName={file.name}
                    image={file.image}
                    size={file.size}
                    onInteract={() => onWindowInteract(key)}
                    onMinimize={() => minimizeWindow(key)}
                    onClose={() => removeWindow(key)}
                />,
                { name: file.name, icon: file.icon }
            );
        },
        [addWindow, onWindowInteract, minimizeWindow, removeWindow]
    );

    return !shutdown ? (
        <div style={styles.desktop}>
            {/* The whole 2D desktop lives on a "stage" that physically recedes
                (scale + tilt + brighten) when the 3D experience takes over, so the
                hand-off reads as being pulled back through the screen. */}
            <motion.div
                style={Object.assign({}, styles.desktopStage, {
                    pointerEvents: experienceOpen ? 'none' : 'auto',
                    backgroundColor: theme.background,
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
                        })}
                    </div>
                );
            })}
            <div style={styles.shortcuts}>
                {shortcuts.map((shortcut, i) => {
                    // Use the user's arranged position if they've dragged this
                    // icon, otherwise fall back to the classic grid slot.
                    const pos =
                        iconPositions[shortcut.shortcutName] ||
                        defaultPosition(i);
                    const isBin = shortcut.shortcutName === 'Recycle Bin';
                    return (
                        <div
                            style={Object.assign({}, styles.shortcutContainer, {
                                top: pos.y,
                                left: pos.x,
                            })}
                            key={`shortcut-${shortcut.shortcutName}`}
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
                                onMoved={(dx, dy) =>
                                    moveIcon(shortcut.shortcutName, pos, dx, dy)
                                }
                            />
                        </div>
                    );
                })}

                {/* Files sitting on the desktop — restored from the bin, or
                    dragged onto it to throw them away again. */}
                {desktopFiles.map((file) => (
                    <FileIcon
                        key={file.id}
                        file={file}
                        pos={file.desktopPos}
                        variant="desktop"
                        selected={selectedFileId === file.id}
                        onSelect={() => setSelectedFileId(file.id)}
                        onOpen={() => openFile(file)}
                        onDropped={(dx, dy, screen) =>
                            onFileDropped(file, dx, dy, screen)
                        }
                    />
                ))}
            </div>
                <Toolbar
                    windows={windows}
                    toggleMinimize={toggleMinimize}
                    shutdown={startShutdown}
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
