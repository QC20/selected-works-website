import React from 'react';

import windowResize from './windowResize.png';
import maximize from './maximize.png';
import minimize from './minimize.png';
import computerBig from './computerBig.png';
import computerSmall from './computerSmall.png';
import myComputer from './myComputer.png';
import showcaseIcon from './showcaseIcon.png';
import doomIcon from './doomIcon.png';
import credits from './credits.png';
import volumeOn from './volumeOn.png';
import volumeOff from './volumeOff.png';
import trailIcon from './trailIcon.png';
import Sphere from '../icons/sphere.png';
import windowGameIcon from './windowGameIcon.png';
import windowExplorerIcon from './windowExplorerIcon.png';
import windowsStartIcon from './windowsStartIcon.png';
import scrabbleIcon from './scrabbleIcon.png';
import micropolisIcon from './micropolisIcon.png';
import close from './close.png';
import internetExplorerIcon from './internetExplorerIcon.png'
import msnIcon from './msnIcon.png';
import githubIcon from './githubIcon.png';
import displayIcon from './displayIcon.png';
import mailIcon from './mailIcon.png';
import recycleBinIcon from './recycleBinIcon.png';
import recycleBinEmptyIcon from './recycleBinEmptyIcon.png';
import jpegIcon from './jpegIcon.png';
import eurIcon from './eurIcon.png';
import aboutIcon from './aboutIcon.png';
import folderIcon from './folderIcon.png';
import minesweeperIcon from './minesweeperIcon.png';
import shutdownPcIcon from './shutdownPcIcon.png';
import folderResumeIcon from './folderResumeIcon.png';
import resumeFileIcon from './resumeFileIcon.png';
import ieIcon from './ieIcon.png';
// Internet Explorer's own toolbar buttons, from Yute's Windows95 Portfolio —
// the same art its IE window uses, so ours reads as the real toolbar rather
// than a row of text glyphs (see WebFrame.tsx).
import ieBackIcon from './ieBackIcon.png';
import ieForwardIcon from './ieForwardIcon.png';
import ieStopIcon from './ieStopIcon.png';
import ieRefreshIcon from './ieRefreshIcon.png';
import ieHomeIcon from './ieHomeIcon.png';
import selectedWebsitesIcon from './selectedWebsitesIcon.png';
import myComputerIcon from './myComputerIcon.png';
import hardDriveIcon from './hardDriveIcon.png';
import cdRomIcon from './cdRomIcon.png';
import scrollIcon from './scrollIcon.png';
import settingsIcon from './settingsIcon.png';
import runIcon from './runIcon.png';
// My Computer > Hard Disk (D:) > Utility. Converted from the Windows 95/98
// icon set in `public/WIN95-OS_-_Style-Logos` so they match the era.
// Market Watch's bar-chart icon — the Windows 98 chart icon from the same set.
import stocksIcon from './stocksIcon.png';
// Add/Remove Programs and System Properties, converted from the Windows 95/98
// icon set in `public/WIN95-OS_-_Style-Logos` like the Utility folder's icons.
import storeIcon from './storeIcon.png';
// Snake and Tetris, drawn for this desktop like the weather set — the icon
// pack has no art for either game.
import snakeIcon from './snakeIcon.png';
import tetrisIcon from './tetrisIcon.png';
// The system tray's battery, dial-up and log-off art, and the Games folder.
import batteryIcon from './batteryIcon.png';
import acPowerIcon from './acPowerIcon.png';
import dialupIcon from './dialupIcon.png';
import offlineIcon from './offlineIcon.png';
import gamesFolderIcon from './gamesFolderIcon.png';
import logOffIcon from './logOffIcon.png';
import systemIcon from './systemIcon.png';
// The tray weather panel. Drawn for this desktop (see the note in Weather.tsx):
// the icon set has no weather art, so these are 32x32 pixel art in its palette.
import weatherSunIcon from './weatherSunIcon.png';
import weatherPartlyIcon from './weatherPartlyIcon.png';
import weatherCloudIcon from './weatherCloudIcon.png';
import weatherRainIcon from './weatherRainIcon.png';
import weatherSnowIcon from './weatherSnowIcon.png';
import weatherStormIcon from './weatherStormIcon.png';
import taskManagerIcon from './taskManagerIcon.png';
import patchNotesIcon from './patchNotesIcon.png';
import resetStorageIcon from './resetStorageIcon.png';
import linkedinIcon from './linkedinIcon.png';
// The Windows 98 programs vendored under public/98 (see ProgramFrame.tsx).
// These are the original 32x32 icons from 98.js, so they match the windows
// they open. 3D Flower Box deliberately reuses the pipes icon — 98.js does the
// same, there was never a distinct one.
import paintIcon from './paintIcon.png';
import soundRecorderIcon from './soundRecorderIcon.png';
import pinballIcon from './pinballIcon.png';
import calculatorIcon from './calculatorIcon.png';
import notepadIcon from './notepadIcon.png';
import winampIcon from './winampIcon.png';
import pipesIcon from './pipesIcon.png';
import solitaireIcon from './solitaireIcon.png';
import msDosIcon from './msDosIcon.png';
import programsFolderIcon from './programsFolderIcon.png';
// MSN Messenger's toolbar buttons, from the same Windows95 Portfolio the rest
// of this desktop follows.
import msnChatIcon from './msnChatIcon.png';
import msnNudgeIcon from './msnNudgeIcon.png';
// My Computer's Favorites and Control Panel folders, converted from the
// Windows 95/98 icon set in `public/WIN95-OS_-_Style-Logos` like the Utility
// folder's icons.
import favoritesFolderIcon from './favoritesFolderIcon.png';
import controlPanelFolderIcon from './controlPanelFolderIcon.png';
// Favorites entries for the published side projects, so each one reads at a
// glance instead of sharing the generic IE icon. Same conversion pipeline.
import cameraIcon from './cameraIcon.png';
import chartIcon from './chartIcon.png';
import consolePromptIcon from './consolePromptIcon.png';
import televisionIcon from './televisionIcon.png';

const getIconByName = (
    iconName: IconName
    // @ts-ignore
): React.FC<React.SVGAttributes<SVGElement>> => icons[iconName];

export type IconName = keyof typeof icons;

const icons = {
    windowResize: windowResize,
    maximize: maximize,
    minimize: minimize,
    computerBig: computerBig,
    computerSmall: computerSmall,
    myComputer: myComputer,
    showcaseIcon: showcaseIcon,
    doomIcon: doomIcon,
    volumeOn: volumeOn,
    volumeOff: volumeOff,
    credits: credits,
    scrabbleIcon: scrabbleIcon,
    micropolisIcon: micropolisIcon,
    close: close,
    windowGameIcon: windowGameIcon,
    windowExplorerIcon: windowExplorerIcon,
    windowsStartIcon: windowsStartIcon,
    trailIcon: trailIcon,
    internetExplorerIcon: internetExplorerIcon,
    floatingSphere: Sphere,
    msnIcon: msnIcon,
    githubIcon: githubIcon,
    displayIcon: displayIcon,
    mailIcon: mailIcon,
    recycleBinIcon: recycleBinIcon,
    recycleBinEmptyIcon: recycleBinEmptyIcon,
    jpegIcon: jpegIcon,
    eurIcon: eurIcon,
    aboutIcon: aboutIcon,
    folderIcon: folderIcon,
    minesweeperIcon: minesweeperIcon,
    shutdownPcIcon: shutdownPcIcon,
    folderResumeIcon: folderResumeIcon,
    resumeFileIcon: resumeFileIcon,
    ieIcon: ieIcon,
    ieBackIcon: ieBackIcon,
    ieForwardIcon: ieForwardIcon,
    ieStopIcon: ieStopIcon,
    ieRefreshIcon: ieRefreshIcon,
    ieHomeIcon: ieHomeIcon,
    selectedWebsitesIcon: selectedWebsitesIcon,
    myComputerIcon: myComputerIcon,
    hardDriveIcon: hardDriveIcon,
    cdRomIcon: cdRomIcon,
    scrollIcon: scrollIcon,
    settingsIcon: settingsIcon,
    runIcon: runIcon,
    stocksIcon: stocksIcon,
    storeIcon: storeIcon,
    snakeIcon: snakeIcon,
    tetrisIcon: tetrisIcon,
    batteryIcon: batteryIcon,
    acPowerIcon: acPowerIcon,
    dialupIcon: dialupIcon,
    offlineIcon: offlineIcon,
    gamesFolderIcon: gamesFolderIcon,
    logOffIcon: logOffIcon,
    systemIcon: systemIcon,
    weatherSunIcon: weatherSunIcon,
    weatherPartlyIcon: weatherPartlyIcon,
    weatherCloudIcon: weatherCloudIcon,
    weatherRainIcon: weatherRainIcon,
    weatherSnowIcon: weatherSnowIcon,
    weatherStormIcon: weatherStormIcon,
    taskManagerIcon: taskManagerIcon,
    patchNotesIcon: patchNotesIcon,
    resetStorageIcon: resetStorageIcon,
    linkedinIcon: linkedinIcon,
    paintIcon: paintIcon,
    soundRecorderIcon: soundRecorderIcon,
    pinballIcon: pinballIcon,
    calculatorIcon: calculatorIcon,
    notepadIcon: notepadIcon,
    winampIcon: winampIcon,
    pipesIcon: pipesIcon,
    solitaireIcon: solitaireIcon,
    msDosIcon: msDosIcon,
    programsFolderIcon: programsFolderIcon,
    msnChatIcon: msnChatIcon,
    msnNudgeIcon: msnNudgeIcon,
    favoritesFolderIcon: favoritesFolderIcon,
    controlPanelFolderIcon: controlPanelFolderIcon,
    cameraIcon: cameraIcon,
    chartIcon: chartIcon,
    consolePromptIcon: consolePromptIcon,
    televisionIcon: televisionIcon,
};



export default getIconByName;
