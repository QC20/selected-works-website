import React, { useCallback, useEffect, useRef, useState } from 'react';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { IconName } from '../../assets/icons';
import { Resolution, RESOLUTIONS, scaleFor } from './resolution';
import { TASKBAR_HEIGHT } from './metrics';
import StockTicker from './StockTicker';
import WeatherPanel from './WeatherPanel';
import {
    BatteryGauge,
    BatteryPanel,
    CalendarPanel,
    ConnectionPanel,
    useConnection,
} from './TrayPanels';
import { useBattery, batterySummary } from './battery';
import { playClick, playOpen, toggleMuted, useMuted } from './sounds';
import { isClippyEnabled, toggleClippy, useClippyEnabled } from './Clippy';
import { openExternal } from './openExternal';
import { PROGRAMS_CONTENTS } from '../applications/ProgramsFolder';
import { GAMES } from '../applications/games';

/**
 * The folders at the top of the Start menu. Each opens a fly-out on hover
 * (or tap), listing entries that launch by their APPLICATIONS key — so a
 * Start-menu entry opens exactly the window its desktop counterpart would.
 */
interface StartFolder {
    id: string;
    label: string;
    icon: IconName;
    items: { key: string; label: string; icon: IconName }[];
}

/**
 * Every game on the machine, in one place.
 *
 * `Games.ts` owns the list; both the Start menu's Games fly-out and the
 * C:\\Games folder read it, so a game added once turns up in both.
 */
const START_FOLDERS: StartFolder[] = [
    {
        // Programs sits at the top, where Windows 98 puts it. Its contents come
        // straight from the Programs folder, so the fly-out and the folder
        // window can't drift apart.
        id: 'programs',
        label: 'Programs',
        icon: 'programsFolderIcon',
        items: PROGRAMS_CONTENTS.map((item) => ({
            key: item.key,
            label: item.name,
            icon: item.icon,
        })),
    },
    {
        id: 'games',
        label: 'Games',
        icon: 'gamesFolderIcon',
        items: GAMES.map((game) => ({
            key: game.key,
            label: game.name,
            icon: game.icon,
        })),
    },
    {
        id: 'projects',
        label: 'Projects',
        icon: 'folderIcon',
        items: [
            { key: 'pinPortrait', label: 'Pin Portrait', icon: 'ieIcon' },
            { key: 'emojiHeatmap', label: 'Emoji Heatmap', icon: 'ieIcon' },
            { key: 'scroll', label: 'Scroll.', icon: 'scrollIcon' },
        ],
    },
    {
        id: 'resume',
        label: 'Resume',
        icon: 'folderResumeIcon',
        items: [
            {
                key: 'resumeFile',
                label: 'Resume File - My CV',
                icon: 'resumeFileIcon',
            },
            { key: 'showcase', label: 'My Showcase', icon: 'showcaseIcon' },
            // Leaves for a real tab: linkedin.com won't load in a frame.
            { key: 'linkedin', label: 'LinkedIn', icon: 'linkedinIcon' },
            {
                key: 'selectedWebsites',
                label: 'Selected Websites',
                icon: 'selectedWebsitesIcon',
            },
        ],
    },
];

export interface ToolbarProps {
    windows: DesktopWindows;
    toggleMinimize: (key: string) => void;
    shutdown: () => void;
    resolution: Resolution;
    setResolution: (r: Resolution) => void;
    /** Opens an app by its APPLICATIONS key (see Desktop.tsx). */
    openApp: (key: string, options?: LaunchOptions) => void;
    /** Start > Log Off — drops to the log-on screen without shutting down. */
    logOff: () => void;
    /** Fired the first time Start is opened, to retire the first-run balloon. */
    onStartOpened?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
    windows,
    toggleMinimize,
    shutdown,
    resolution,
    setResolution,
    openApp,
    logOff,
    onStartOpened,
}) => {
    const [resMenuOpen, setResMenuOpen] = useState(false);
    const [tickerOpen, setTickerOpen] = useState(false);
    const [weatherOpen, setWeatherOpen] = useState(false);
    const [batteryOpen, setBatteryOpen] = useState(false);
    const [connectionOpen, setConnectionOpen] = useState(false);
    const [calendarOpen, setCalendarOpen] = useState(false);

    const battery = useBattery();
    const connection = useConnection();
    const muted = useMuted();
    const clippyOn = useClippyEnabled();

    /**
     * How long this session has been "dialled in" — see ConnectionPanel.
     *
     * Only ticks while that panel is actually open. It used to run every second
     * for the whole visit, re-rendering the taskbar and every tray popup with
     * it, to update a number nobody was looking at.
     */
    const [connectedFor, setConnectedFor] = useState(0);
    const connectedSince = useRef(Date.now());
    useEffect(() => {
        if (!connectionOpen) return;
        const tick = () =>
            setConnectedFor((Date.now() - connectedSince.current) / 1000);
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [connectionOpen]);

    /**
     * Only one tray popup at a time — they all hang off the same corner and
     * would otherwise stack on top of each other. Each icon closes the rest
     * before toggling itself.
     */
    const closeTrayPopups = useCallback(() => {
        setResMenuOpen(false);
        setTickerOpen(false);
        setWeatherOpen(false);
        setBatteryOpen(false);
        setConnectionOpen(false);
        setCalendarOpen(false);
    }, []);

    /** Every tray icon: click, close whatever else was open, toggle itself. */
    const trayToggle = useCallback(
        (setOpen: React.Dispatch<React.SetStateAction<boolean>>) =>
            (e: React.PointerEvent) => {
                e.stopPropagation();
                playClick();
                const wasOpen = e.currentTarget.getAttribute('data-open') === 'true';
                closeTrayPopups();
                setOpen(!wasOpen);
            },
        [closeTrayPopups]
    );
    /** Which Start-menu folder's fly-out is showing, if any. */
    const [openFolder, setOpenFolder] = useState<string | null>(null);
    const getTime = () => {
        const date = new Date();
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let amPm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        let mins = minutes < 10 ? '0' + minutes : minutes;
        const strTime = hours + ':' + mins + ' ' + amPm;
        return strTime;
    };

    const [startWindowOpen, setStartWindowOpen] = useState(false);
    const lastClickInside = useRef(false);

    const [lastActive, setLastActive] = useState('');

    useEffect(() => {
        let max = 0;
        let k = '';
        Object.keys(windows).forEach((key) => {
            if (windows[key].zIndex >= max) {
                max = windows[key].zIndex;
                k = key;
            }
        });
        setLastActive(k);
    }, [windows]);

    const [time, setTime] = useState(getTime());

    /**
     * One clock, started once.
     *
     * This used to be a self-rescheduling `setTimeout` kicked off by an effect
     * with *no dependency array*, which meant every single render of the
     * taskbar started another five-second chain that never stopped. The taskbar
     * re-renders whenever a window opens, closes or is focused — and once per
     * animation frame for the whole length of an icon drag — so a minute of
     * ordinary use left dozens of timers running forever, each one re-rendering
     * the toolbar and its tray panels. That is the single biggest reason the
     * desktop got heavier the longer you used it, and why the 3D room (which
     * runs a second copy of the whole OS inside the monitor) ground to a halt.
     */
    useEffect(() => {
        const id = window.setInterval(() => setTime(getTime()), 10_000);
        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onCheckClick = () => {
        if (lastClickInside.current) {
            setStartWindowOpen(true);
        } else {
            setStartWindowOpen(false);
        }
        lastClickInside.current = false;
    };

    useEffect(() => {
        window.addEventListener('pointerdown', onCheckClick, false);
        return () => {
            window.removeEventListener('pointerdown', onCheckClick, false);
        };
    }, []);

    // Clicking anywhere outside the tray dismisses whichever tray popup is open.
    const resAreaRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            if (
                resAreaRef.current &&
                !resAreaRef.current.contains(e.target as Node)
            ) {
                closeTrayPopups();
            }
        };
        window.addEventListener('pointerdown', onDown);
        return () => window.removeEventListener('pointerdown', onDown);
    }, [closeTrayPopups]);

    const onStartWindowClicked = () => {
        setStartWindowOpen(true);
        lastClickInside.current = true;
    };

    const toggleStartWindow = () => {
        playClick();
        onStartOpened?.();
        if (!startWindowOpen) {
            lastClickInside.current = true;
        } else {
            lastClickInside.current = false;
        }
    };

    /**
     * Runs a Start-menu item's action and closes the menu.
     *
     * The stopPropagation matters: without it the press bubbles to the menu
     * container's own `onStartWindowClicked`, which sets `lastClickInside` and
     * re-opens the menu immediately after the item closed it — leaving it
     * stuck open behind whatever just launched, and swallowing the next click
     * on Start.
     */
    const chooseStartMenuItem =
        (action: () => void) => (e: React.PointerEvent) => {
            e.stopPropagation();
            playClick();
            lastClickInside.current = false;
            setStartWindowOpen(false);
            setOpenFolder(null);
            action();
        };

    // Moving onto a plain menu row dismisses whichever fly-out was showing,
    // the way a real Start menu behaves.
    const closeFolders = () => setOpenFolder(null);

    /**
     * Fly-outs open downwards from their row. Programs lists every program on
     * the machine, which on a short screen (or a low "resolution", where the
     * desktop's coordinate space shrinks) is tall enough to run off the bottom.
     * So on open it measures where it landed and caps its height there.
     *
     * The rect is in screen pixels and `maxHeight` is in the desktop's scaled
     * pixels, hence the divide.
     */
    const fitFlyout = useCallback(
        (el: HTMLDivElement | null) => {
            if (!el) return;
            el.style.maxHeight = '';
            const room = window.innerHeight - el.getBoundingClientRect().top - 8;
            const scale = scaleFor(resolution);
            if (el.scrollHeight > room / scale) {
                el.style.maxHeight = `${Math.max(80, room / scale)}px`;
            }
        },
        [resolution]
    );

    // Don't leave a fly-out armed for the next time the menu is opened.
    useEffect(() => {
        if (!startWindowOpen) setOpenFolder(null);
    }, [startWindowOpen]);

    return (
        <div style={styles.toolbarOuter}>
            {startWindowOpen && (
                <div
                    onPointerDown={onStartWindowClicked}
                    style={styles.startWindow}
                >
                    <div style={styles.startWindowInner}>
                        <div style={styles.verticalStartContainer}>
                            <p style={styles.verticalText}>Windows95</p>
                        </div>
                        <div style={styles.startWindowContent}>
                            <div style={styles.startMenuSpace} />

                            {/* Folders with fly-out submenus, at the top of the
                                menu. Hovering one opens it and closes the other;
                                tapping the row works the same way on touch. */}
                            {START_FOLDERS.map((folder) => (
                                <div
                                    key={folder.id}
                                    className="start-menu-option"
                                    style={Object.assign(
                                        {},
                                        styles.startMenuOption,
                                        openFolder === folder.id &&
                                            styles.startMenuOptionActive
                                    )}
                                    onMouseEnter={() => {
                                        if (openFolder !== folder.id) {
                                            playOpen();
                                        }
                                        setOpenFolder(folder.id);
                                    }}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        setOpenFolder((f) =>
                                            f === folder.id ? null : folder.id
                                        );
                                    }}
                                    title={folder.label}
                                >
                                    <Icon
                                        style={styles.startMenuIcon}
                                        icon={folder.icon}
                                    />
                                    <p style={styles.startMenuText}>
                                        {folder.label}
                                    </p>
                                    <span style={styles.submenuArrow}>▶</span>

                                    {openFolder === folder.id && (
                                        <div
                                            ref={fitFlyout}
                                            style={styles.submenu}
                                        >
                                            {folder.items.map((item) => (
                                                <div
                                                    key={item.key}
                                                    className="start-menu-option"
                                                    style={styles.submenuItem}
                                                    onPointerDown={chooseStartMenuItem(
                                                        () => openApp(item.key)
                                                    )}
                                                    title={item.label}
                                                >
                                                    <Icon
                                                        style={
                                                            styles.submenuIcon
                                                        }
                                                        icon={item.icon}
                                                    />
                                                    <p
                                                        style={
                                                            styles.submenuText
                                                        }
                                                    >
                                                        {item.label}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <div style={styles.startMenuLine} />
                            <div
                                className="start-menu-option"
                                style={styles.startMenuOption}
                                onMouseEnter={closeFolders}
                                // Start -> Github goes straight to the real site,
                                // unlike the desktop icon (which opens a window).
                                onPointerDown={chooseStartMenuItem(() =>
                                    openExternal('https://github.com/QC20')
                                )}
                                title="Open GitHub profile"
                            >
                                <Icon
                                    style={styles.startMenuIcon}
                                    icon="githubIcon"
                                />
                                <p style={styles.startMenuText}>
                                    <u>G</u>ithub
                                </p>
                            </div>
                            <div style={styles.startMenuLine} />
                            <div
                                className="start-menu-option"
                                style={styles.startMenuOption}
                                onMouseEnter={closeFolders}
                                onPointerDown={chooseStartMenuItem(() =>
                                    openApp('settings')
                                )}
                                title="Open Display Properties"
                            >
                                <Icon
                                    style={styles.startMenuIcon}
                                    icon="settingsIcon"
                                />
                                <p style={styles.startMenuText}>
                                    <u>S</u>ettings
                                </p>
                            </div>
                            <div
                                className="start-menu-option"
                                style={styles.startMenuOption}
                                onMouseEnter={closeFolders}
                                onPointerDown={chooseStartMenuItem(() =>
                                    openApp('run')
                                )}
                                title="Run a program"
                            >
                                <Icon
                                    style={styles.startMenuIcon}
                                    icon="runIcon"
                                />
                                <p style={styles.startMenuText}>
                                    <u>R</u>un...
                                </p>
                            </div>
                            <div style={styles.startMenuLine} />
                            {/* Clippy, so he can be summoned from the menu as
                                well as from the tray. */}
                            <div
                                className="start-menu-option"
                                style={styles.startMenuOption}
                                onMouseEnter={closeFolders}
                                onPointerDown={chooseStartMenuItem(toggleClippy)}
                                title={
                                    clippyOn
                                        ? 'Send Clippy away'
                                        : 'Bring Clippy back'
                                }
                            >
                                <span style={styles.startMenuClippy}>📎</span>
                                <p style={styles.startMenuText}>
                                    {clippyOn ? 'Hide Clippy' : 'Show Clippy'}
                                </p>
                            </div>
                            <div style={styles.startMenuLine} />
                            <div
                                className="start-menu-option"
                                style={styles.startMenuOption}
                                onMouseEnter={closeFolders}
                                onPointerDown={chooseStartMenuItem(logOff)}
                                title="Log off and return to the log-on screen"
                            >
                                <Icon
                                    style={styles.startMenuIcon}
                                    icon="logOffIcon"
                                />
                                <p style={styles.startMenuText}>
                                    <u>L</u>og Off Guest...
                                </p>
                            </div>
                            <div
                                className="start-menu-option"
                                style={styles.startMenuOption}
                                onMouseEnter={closeFolders}
                                onPointerDown={chooseStartMenuItem(shutdown)}
                                title="Shut down the computer"
                            >
                                <Icon
                                    style={styles.startMenuIcon}
                                    icon="computerBig"
                                />
                                <p style={styles.startMenuText}>
                                    Sh<u>u</u>t down...
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div style={styles.toolbarInner}>
                <div style={styles.toolbar}>
                    <div
                        style={Object.assign(
                            {},
                            styles.startContainerOuter,
                            startWindowOpen && styles.activeTabOuter
                        )}
                        onPointerDown={toggleStartWindow}
                    >
                        <div
                            style={Object.assign(
                                {},
                                styles.startContainer,
                                startWindowOpen && styles.activeTabInner
                            )}
                        >
                            <Icon
                                size={20}
                                icon="windowsStartIcon"
                                style={styles.startIcon}
                            />
                            <p className="toolbar-text ">Start</p>
                        </div>
                    </div>
                    <div style={styles.toolbarTabsContainer}>
                        {Object.keys(windows).map((key) => {
                            return (
                                <div
                                    key={key}
                                    style={Object.assign(
                                        {},
                                        styles.tabContainerOuter,
                                        lastActive === key &&
                                            !windows[key].minimized &&
                                            styles.activeTabOuter
                                    )}
                                    onPointerDown={() => toggleMinimize(key)}
                                >
                                    <div
                                        style={Object.assign(
                                            {},
                                            styles.tabContainer,
                                            lastActive === key &&
                                                !windows[key].minimized &&
                                                styles.activeTabInner
                                        )}
                                    >
                                        <Icon
                                            size={20}
                                            icon={windows[key].icon}
                                            style={styles.tabIcon}
                                        />
                                        <p style={styles.tabText}>
                                            {windows[key].name}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div style={styles.time} ref={resAreaRef}>
                    {resMenuOpen && (
                        <div style={styles.resMenu}>
                            <p style={styles.resMenuTitle}>Screen area</p>
                            {RESOLUTIONS.map((opt) => (
                                <div
                                    key={opt.value}
                                    className="start-menu-option"
                                    style={styles.resItem}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        setResolution(opt.value);
                                        setResMenuOpen(false);
                                    }}
                                >
                                    <span style={styles.resCheck}>
                                        {opt.value === resolution ? '✓' : ''}
                                    </span>
                                    <span>{opt.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <WeatherPanel open={weatherOpen} />
                    <StockTicker
                        open={tickerOpen}
                        onOpenApp={(options) => {
                            setTickerOpen(false);
                            openApp('stocks', options);
                        }}
                    />
                    <BatteryPanel open={batteryOpen} state={battery} />
                    <ConnectionPanel
                        open={connectionOpen}
                        connection={connection}
                        connectedFor={connectedFor}
                    />
                    <CalendarPanel open={calendarOpen} />

                    {/* Clippy's paperclip: summons him, or sends him away. */}
                    <div
                        style={Object.assign(
                            {},
                            styles.trayIconWrap,
                            !clippyOn && styles.trayIconOff
                        )}
                        title={
                            clippyOn
                                ? 'Clippy is here — click to send him away'
                                : 'Bring Clippy back'
                        }
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            playClick();
                            closeTrayPopups();
                            toggleClippy();
                        }}
                    >
                        <span style={styles.clippyGlyph}>📎</span>
                    </div>

                    <div
                        style={styles.trayIconWrap}
                        title="Weather"
                        data-open={weatherOpen}
                        onPointerDown={trayToggle(setWeatherOpen)}
                    >
                        <Icon icon="weatherPartlyIcon" size={18} />
                    </div>
                    <div
                        style={styles.trayIconWrap}
                        title="Market Watch — share prices"
                        data-open={tickerOpen}
                        onPointerDown={trayToggle(setTickerOpen)}
                    >
                        <Icon icon="stocksIcon" size={18} />
                    </div>

                    {/* Dial-Up Networking's connection status. */}
                    <div
                        style={styles.trayIconWrap}
                        title={
                            connection.online
                                ? 'Connected to the Internet'
                                : 'No connection'
                        }
                        data-open={connectionOpen}
                        onPointerDown={trayToggle(setConnectionOpen)}
                    >
                        <Icon
                            icon={
                                connection.online ? 'dialupIcon' : 'offlineIcon'
                            }
                            size={18}
                        />
                    </div>

                    {/* Only on a machine that has a battery to report. */}
                    {battery.supported && (
                        <div
                            style={styles.trayIconWrap}
                            title={batterySummary(battery)}
                            data-open={batteryOpen}
                            onPointerDown={trayToggle(setBatteryOpen)}
                        >
                            <BatteryGauge state={battery} />
                        </div>
                    )}

                    <div
                        style={styles.trayIconWrap}
                        title="Screen resolution"
                        data-open={resMenuOpen}
                        onPointerDown={trayToggle(setResMenuOpen)}
                    >
                        <Icon icon="displayIcon" size={18} />
                    </div>

                    {/* A real control now: this is what silences the desktop. */}
                    <div
                        style={styles.trayIconWrap}
                        title={muted ? 'Sound is off' : 'Sound is on'}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            closeTrayPopups();
                            // Unmuting should be audible; muting should not.
                            if (muted) {
                                toggleMuted();
                                playClick();
                            } else {
                                playClick();
                                toggleMuted();
                            }
                        }}
                    >
                        <Icon icon={muted ? 'volumeOff' : 'volumeOn'} size={18} />
                    </div>

                    <p
                        style={styles.timeText}
                        title="Click for the calendar"
                        onPointerDown={trayToggle(setCalendarOpen)}
                        data-open={calendarOpen}
                    >
                        {time}
                    </p>
                </div>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    toolbarOuter: {
        boxSizing: 'border-box',
        position: 'absolute',
        bottom: 0,
        width: '100%',
        // See metrics.ts: taller than the original 32 so the bar is findable
        // on a phone or an iPad, where it used to read as a thin grey edge.
        height: TASKBAR_HEIGHT,
        background: Colors.lightGray,
        borderTop: `1px solid ${Colors.lightGray}`,
        zIndex: 100000,
    },
    verticalStartContainer: {
        // width: 30,
        height: '100%',
        background: Colors.darkGray,
    },
    verticalText: {
        fontFamily: 'Terminal',
        textOrientation: 'sideways',
        fontSize: 32,
        padding: 4,
        paddingBottom: 64,
        paddingTop: 8,
        letterSpacing: 1,
        color: Colors.lightGray,
        transform: 'scale(-1)',
        WebkitTransform: 'scale(-1)',
        MozTransform: 'scale(-1)',
        msTransform: 'scale(-1)',
        OTransform: 'scale(-1)',
        // @ts-ignore
        writingMode: 'tb-rl',
    },
    startWindowContent: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'flex-end',
        // alignItems: 'flex-end',
    },
    startWindow: {
        position: 'absolute',
        // Overlaps the bar's top edge by a few pixels, the way the real menu
        // sits on top of it rather than floating above.
        bottom: TASKBAR_HEIGHT - 4,
        display: 'flex',
        flex: 1,
        width: 256,
        // height: 400,
        left: 4,
        boxSizing: 'border-box',
        border: `1px solid ${Colors.white}`,
        borderBottomColor: Colors.black,
        borderRightColor: Colors.black,
        background: Colors.lightGray,
    },
    activeTabOuter: {
        border: `1px solid ${Colors.black}`,
        borderBottomColor: Colors.white,
        borderRightColor: Colors.white,
    },
    startWindowInner: {
        border: `1px solid ${Colors.lightGray}`,
        borderBottomColor: Colors.darkGray,
        borderRightColor: Colors.darkGray,
        flex: 1,
    },
    startMenuIcon: {
        width: 32,
        height: 32,
    },
    startMenuText: {
        fontSize: 14,
        fontFamily: 'MSSerif',
        marginLeft: 8,
    },
    startMenuOption: {
        alignItems: 'center',
        // Anchors the fly-out submenus of the folder rows.
        position: 'relative',
        height: 24,
        padding: 12,
        cursor: 'pointer',
        // Instant taps on touch devices (no 300ms double-tap-zoom wait).
        touchAction: 'manipulation',
    },
    startMenuOptionActive: {
        background: Colors.blue,
        color: Colors.white,
    },
    submenuArrow: {
        marginLeft: 'auto',
        paddingLeft: 8,
        fontSize: 9,
        lineHeight: '9px',
        color: 'inherit',
    },
    submenu: {
        position: 'absolute',
        // Sits just outside the menu's right edge, overlapping by a pixel so
        // the pointer doesn't cross a gap on the way over.
        left: '100%',
        top: -2,
        marginLeft: -1,
        minWidth: 190,
        flexDirection: 'column',
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderBottomColor: Colors.black,
        borderRightColor: Colors.black,
        boxShadow: '1px 1px 0 rgba(0,0,0,0.4)',
        padding: 2,
        zIndex: 100002,
        // Only ever reached on a screen too short for the Programs list; see
        // fitFlyout, which is what sets the height it scrolls within.
        overflowY: 'auto',
    },
    submenuItem: {
        alignItems: 'center',
        gap: 8,
        padding: '4px 8px',
        cursor: 'pointer',
        color: Colors.black,
        touchAction: 'manipulation',
        flexShrink: 0,
    },
    submenuIcon: {
        width: 18,
        height: 18,
        objectFit: 'contain',
        flexShrink: 0,
    },
    submenuText: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        whiteSpace: 'nowrap',
    },
    startMenuSpace: {
        flex: 1,
    },
    startMenuLine: {
        height: 1,
        background: Colors.white,
        borderTop: `1px solid ${Colors.darkGray}`,
    },
    activeTabInner: {
        border: `1px solid ${Colors.darkGray}`,
        borderBottomColor: Colors.lightGray,
        borderRightColor: Colors.lightGray,
        backgroundImage: `linear-gradient(45deg, white 25%, transparent 25%),
        linear-gradient(-45deg,  white 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%,  white 75%),
        linear-gradient(-45deg, transparent 75%,  white 75%)`,
        backgroundSize: `4px 4px`,
        backgroundPosition: `0 0, 0 2px, 2px -2px, -2px 0px`,
        pointerEvents: 'none',
    },
    tabContainerOuter: {
        display: 'flex',
        flex: 1,
        maxWidth: 300,
        marginRight: 4,
        boxSizing: 'border-box',
        cursor: 'pointer',
        border: `1px solid ${Colors.white}`,
        borderBottomColor: Colors.black,
        borderRightColor: Colors.black,
    },
    tabContainer: {
        display: 'flex',
        border: `1px solid ${Colors.lightGray}`,
        borderBottomColor: Colors.darkGray,
        borderRightColor: Colors.darkGray,
        alignItems: 'center',
        paddingLeft: 4,
        flex: 1,
    },
    tabIcon: {
        marginRight: 6,
    },
    startContainer: {
        alignItems: 'center',
        flexShrink: 1,
        // background: 'red',
        border: `1px solid ${Colors.lightGray}`,
        borderBottomColor: Colors.darkGray,
        borderRightColor: Colors.darkGray,
        padding: 1,
        paddingLeft: 5,
        paddingRight: 5,
    },
    startContainerOuter: {
        marginLeft: 3,
        boxSizing: 'border-box',
        cursor: 'pointer',
        border: `1px solid ${Colors.white}`,
        borderBottomColor: Colors.black,
        borderRightColor: Colors.black,
    },
    toolbarTabsContainer: {
        // background: 'blue',
        flex: 1,
        marginLeft: 4,
        marginRight: 4,
    },
    startIcon: {
        marginRight: 4,
    },
    toolbarInner: {
        borderTop: `1px solid ${Colors.white}`,

        alignItems: 'center',
        flex: 1,
    },
    toolbar: {
        flexGrow: 1,
        width: '100%',
    },
    time: {
        position: 'relative',
        // Sized to whatever is in it rather than to a fixed width: the tray
        // gains and loses icons (the battery only appears on a machine that
        // reports one), and a fixed width either clipped the clock or left a
        // gap depending on the device.
        flexShrink: 0,
        gap: 5,
        // Grows with the bar, so the tray keeps its inset well and the icons
        // inside it have room to be drawn a couple of pixels larger.
        height: TASKBAR_HEIGHT - 8,
        boxSizing: 'border-box',
        marginRight: 4,
        paddingLeft: 5,
        paddingRight: 5,
        border: `1px solid ${Colors.white}`,
        borderTopColor: Colors.darkGray,

        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftColor: Colors.darkGray,
    },
    trayIconOff: {
        opacity: 0.45,
    },
    clippyGlyph: {
        fontSize: 15,
        lineHeight: '18px',
    },
    startMenuClippy: {
        width: 32,
        fontSize: 20,
        textAlign: 'center',
        lineHeight: '32px',
    },
    trayIconWrap: {
        cursor: 'pointer',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
        // Instant taps on touch devices (no 300ms double-tap-zoom wait).
        touchAction: 'manipulation',
    },
    resMenu: {
        position: 'absolute',
        bottom: '135%',
        right: 0,
        minWidth: 120,
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderBottomColor: Colors.black,
        borderRightColor: Colors.black,
        boxShadow: '1px 1px 0 rgba(0,0,0,0.4)',
        flexDirection: 'column',
        padding: 2,
        zIndex: 100001,
    },
    resMenuTitle: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        padding: '2px 6px 4px 6px',
    },
    resItem: {
        alignItems: 'center',
        cursor: 'pointer',
        padding: '3px 6px',
        fontFamily: 'MSSerif',
        fontSize: 12,
    },
    resCheck: {
        width: 14,
        display: 'inline-block',
        fontFamily: 'MSSerif',
        fontSize: 12,
    },
    volumeIcon: {
        cursor: 'pointer',
        height: 18,
    },
    tabText: {
        fontSize: 15,
        fontFamily: 'MSSerif',
    },
    timeText: {
        fontSize: 13,
        fontFamily: 'MSSerif',
        cursor: 'pointer',
        // Instant taps on touch devices (no 300ms double-tap-zoom wait).
        touchAction: 'manipulation',
    },
};

export default Toolbar;
