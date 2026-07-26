import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Colors from '../../constants/colors';
import ShowcaseExplorer from '../applications/ShowcaseExplorer';
import Doom from '../applications/Doom';
import OregonTrail from '../applications/OregonTrail';
import Micropolis from '../applications/Micropolis';
import ShutdownSequence from './ShutdownSequence';
import ThisComputerApp from '../applications/ThisComputer';

import Toolbar from './Toolbar';
import DesktopShortcut, { DesktopShortcutProps } from './DesktopShortcut';
import Scrabble from '../applications/Scrabble';
import { IconName } from '../../assets/icons';
import Credits from '../applications/Credits';
import floatingSphere from '../applications/floatingSphere';
import Experience3D from '../experience/Experience3D';

// Apps whose icon launches a full-screen takeover (the 3D experience) rather
// than opening a draggable window. Keyed by their APPLICATIONS key.
const FULLSCREEN_EXPERIENCES = ['stepOutside'];

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
    micropolis: {
        key: 'micropolis',
        name: 'Micropolis',
        shortcutIcon: 'micropolisIcon',
        component: Micropolis,
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
    micropolis2: {
        key: 'micropolis2',
        name: 'Micropolis',
        shortcutIcon: 'micropolisIcon',
        component: Micropolis,
    },

    // Launches the 3D CRT-room experience instead of a window (see Desktop render).
    // `component` is unused for this entry; kept only to satisfy the map's type.
    stepOutside: {
        key: 'stepOutside',
        name: 'Step Outside',
        shortcutIcon: 'computerBig',
        component: floatingSphere,
    },

};

const Desktop: React.FC<DesktopProps> = (props) => {
    const [windows, setWindows] = useState<DesktopWindows>({});

    const [shortcuts, setShortcuts] = useState<DesktopShortcutProps[]>([]);

    const [shutdown, setShutdown] = useState(false);
    const [numShutdowns, setNumShutdowns] = useState(1);

    // When true, the 2D desktop recedes and the 3D CRT-room experience takes over.
    const [experienceOpen, setExperienceOpen] = useState(false);

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
            newShortcuts.push({
                shortcutName: app.name,
                icon: app.shortcutIcon,
                onOpen: () => {
                    if (FULLSCREEN_EXPERIENCES.includes(app.key)) {
                        setExperienceOpen(true);
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
        (key: string, element: JSX.Element) => {
            setWindows((prevState) => ({
                ...prevState,
                [key]: {
                    zIndex: getHighestZIndex() + 1,
                    minimized: false,
                    component: element,
                    name: APPLICATIONS[key].name,
                    icon: APPLICATIONS[key].shortcutIcon,
                },
            }));
        },
        [getHighestZIndex]
    );

    return !shutdown ? (
        <div style={styles.desktop}>
            {/* The whole 2D desktop lives on a "stage" that physically recedes
                (scale + tilt + brighten) when the 3D experience takes over, so the
                hand-off reads as being pulled back through the screen. */}
            <motion.div
                style={Object.assign({}, styles.desktopStage, {
                    pointerEvents: experienceOpen ? 'none' : 'auto',
                })}
                animate={
                    experienceOpen
                        ? { scale: 0.9, rotateX: 7, filter: 'brightness(1.7)' }
                        : { scale: 1, rotateX: 0, filter: 'brightness(1)' }
                }
                transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
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
                    const iconsPerColumn = 8;
                    const column = Math.floor(i / iconsPerColumn);
                    const row = i % iconsPerColumn;
                    return (
                        <div
                            style={Object.assign({}, styles.shortcutContainer, {
                                top: row * 104,
                                left: column * 74,
                            })}
                            key={`shortcut-${i}`}
                        >
                            <DesktopShortcut
                                icon={shortcut.icon}
                                shortcutName={shortcut.shortcutName}
                                onOpen={shortcut.onOpen}
                            />
                        </div>
                    );
                })}
            </div>
                <Toolbar
                    windows={windows}
                    toggleMinimize={toggleMinimize}
                    shutdown={startShutdown}
                />
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
        top: 16,
        left: 6,
    },
    minimized: {
        pointerEvents: 'none',
        opacity: 0,
    },
};

export default Desktop;
