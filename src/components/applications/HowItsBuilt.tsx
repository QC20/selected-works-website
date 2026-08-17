import React from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';

/**
 * How It's Built — My Computer > Hard Disk (D:) > Utility.
 *
 * The technical write-up Patch Notes doesn't have room for: not what shipped,
 * but how the whole thing actually works. Same static-content-in-a-window
 * shape as Patch Notes and Now, so it costs nothing extra to maintain.
 */

interface Section {
    title: string;
    body: string;
}

const SECTIONS: Section[] = [
    {
        title: 'One desktop, two routers',
        body: "The whole site is a single React + TypeScript app: one Windows 95 desktop (Desktop.tsx) that every window, icon and dialog lives inside. My Showcase — the About/Experience/Projects/Contact pages — is itself a small app running inside one of those windows, with its own nested react-router so the browser's address bar tracks whichever showcase page is open, the same way it would on an ordinary site.",
    },
    {
        title: 'Each showcase page is its own chunk',
        body: "Opening My Showcase used to pull in every page's code — and every image, gif and video import those pages make — in one bundle, before any of it was needed. Every showcase page is now behind React.lazy, so a page's assets only download once you actually visit it.",
    },
    {
        title: 'A real (small) filesystem',
        body: 'Desktop icon positions, your wallpaper and settings live in localStorage. Files saved from Notepad go into an IndexedDB database standing in for the C: drive, so they are actually still there next time you open My Computer — not just a demo of a save dialog.',
    },
    {
        title: 'The guestbook and the analytics both talk to Supabase',
        body: "Both write to a Supabase table over its public REST API using an anon key that's safe to ship, because row-level-security policies on each table decide what that key is allowed to do — insert-and-read for the guestbook, insert-only for analytics events, so page visits can be counted without ever being readable from the site itself. Neither one is configured, both fall back to localStorage instead of breaking, which is also how the site still runs for anyone who clones the repo without setting up a Supabase project.",
    },
    {
        title: 'Internet Explorer is a real, small browser',
        body: "Every site the desktop opens — the IE icon, Start > Projects, Start > Resume — comes through one browser window with Back/Forward over a real history stack, an editable address bar, and Favorites. It's an <iframe> under the hood, so anything that sends X-Frame-Options (GitHub, LinkedIn) can't be shown that way — those open in a real browser tab instead. GitHub is the one exception that stays inside the desktop anyway: GitHub Viewer reads the public GitHub REST API directly and renders the results as a Windows 95 file list.",
    },
    {
        title: 'Step Outside is a real 3D scene',
        body: "The desktop can recede into a CRT monitor sitting in a 3D room, built with three.js on top of Henry Heffernan's original MIT-licensed room scene (credited in full under Credits). It's the one place the site's own joke — that all of this is a simulation — gets to be literally true instead of just a line of copy.",
    },
    {
        title: 'Deploy',
        body: 'A Create React App build, deployed on Vercel. Nothing server-side beyond that: everything dynamic (the guestbook, analytics, live stock/weather widgets) talks directly to third-party APIs from the browser.',
    },
];

export interface HowItsBuiltProps extends WindowAppProps {}

const HowItsBuilt: React.FC<HowItsBuiltProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => (
    <Window
        top={90}
        left={220}
        width={460}
        height={440}
        windowTitle="How It's Built"
        windowBarIcon="notepadIcon"
        closeWindow={onClose}
        onInteract={onInteract}
        minimizeWindow={onMinimize}
        bottomLeftText={`${SECTIONS.length} sections`}
    >
        <div style={styles.container}>
            <div style={styles.scroll}>
                {SECTIONS.map((section) => (
                    <div key={section.title} style={styles.entry}>
                        <p style={styles.title}>{section.title}</p>
                        <p style={styles.body}>{section.body}</p>
                    </div>
                ))}
            </div>
        </div>
    </Window>
);

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        boxSizing: 'border-box',
        padding: 8,
        background: Colors.lightGray,
    },
    scroll: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        gap: 14,
        padding: '10px 12px',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    entry: {
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0,
    },
    title: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.black,
        margin: 0,
        borderBottom: `1px solid ${Colors.lightGray}`,
        paddingBottom: 3,
    },
    body: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        lineHeight: 1.6,
        margin: 0,
    },
};

export default HowItsBuilt;
