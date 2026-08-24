import React, { useEffect } from 'react';

/**
 * A plain, static reading of this portfolio — reachable at /accessible, and
 * from the skip link that's the very first focusable thing on every other
 * page (see App.tsx).
 *
 * The desktop is a real Windows 95 simulation: dragged windows, a fake
 * filesystem, an in-page "browser" the showcase content actually renders
 * inside of. None of that is available to a screen reader in any useful way,
 * and on a low-powered device it may not render at all. Rather than trying
 * to retrofit that experience with ARIA, this is a second, deliberately
 * boring front door to the same information — real headings, real links, no
 * animation, nothing that only works with a mouse.
 *
 * Kept intentionally short on specifics that live elsewhere on the site (the
 * About window's bio tabs, the Projects page's write-ups): duplicating that
 * content here would just be a second copy quietly going stale. This links
 * to the real, canonical places — GitHub, LinkedIn, email, résumé — instead.
 */

const AccessiblePage: React.FC = () => {
    // The desktop keeps `<body>` non-scrolling on purpose — every window
    // manages its own internal scroll instead. This page is a normal,
    // possibly-taller-than-the-viewport document, so it needs the browser's
    // ordinary scrolling back for as long as it's the thing on screen.
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'auto';
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    return (
    <main style={styles.page}>
        <h1 style={styles.h1}>Jonas Kjeldmand Jensen</h1>
        <p style={styles.lede}>
            Full-stack developer and creative technologist based in
            Copenhagen, Denmark — also mid-PhD, researching how AI reshapes
            managerial work and well-being.
        </p>

        <p style={styles.note}>
            You're reading a plain-text version of{' '}
            <a href="/">this portfolio</a>, which is normally a working
            Windows&nbsp;95 desktop simulation — draggable windows, games, a
            3D room, the works. That's a fun thing to click around in, but it
            leans entirely on a mouse and a modern browser, so this page
            exists as a second way in: the same information, with none of
            that required.
        </p>

        <section style={styles.section}>
            <h2 style={styles.h2}>Selected work</h2>
            <p>
                Work on the desktop version is grouped into three areas —
                Coding &amp; Programming, Physical &amp; Embedded Computing,
                and Art, Music &amp; Design. The write-ups and images for all
                three live at{' '}
                <a href="/projects">jonaskjeldmand.dk/projects</a> (best
                viewed in a full desktop browser).
            </p>
        </section>

        <section style={styles.section}>
            <h2 style={styles.h2}>Get in touch</h2>
            <ul style={styles.list}>
                <li>
                    Email:{' '}
                    <a href="mailto:jkj@di.ku.dk">jkj@di.ku.dk</a>
                </li>
                <li>
                    GitHub:{' '}
                    <a
                        href="https://github.com/QC20"
                        target="_blank"
                        rel="noreferrer"
                    >
                        github.com/QC20
                    </a>
                </li>
                <li>
                    LinkedIn:{' '}
                    <a
                        href="https://www.linkedin.com/in/jonas-kjeldmand/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        linkedin.com/in/jonas-kjeldmand
                    </a>
                </li>
            </ul>
        </section>

        <p style={styles.back}>
            <a href="/">← Back to the desktop</a>
        </p>
    </main>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    page: {
        maxWidth: 640,
        margin: '0 auto',
        padding: '48px 24px 80px',
        fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        fontSize: 17,
        lineHeight: 1.6,
        color: '#1a1a1a',
        background: '#fff',
    },
    h1: {
        fontSize: 32,
        marginBottom: 8,
    },
    lede: {
        fontSize: 19,
        color: '#333',
        marginBottom: 24,
    },
    note: {
        fontSize: 15,
        color: '#555',
        borderLeft: '3px solid #ddd',
        paddingLeft: 14,
        marginBottom: 36,
    },
    section: {
        marginBottom: 32,
    },
    h2: {
        fontSize: 22,
        marginBottom: 8,
    },
    list: {
        paddingLeft: 20,
    },
    back: {
        marginTop: 40,
        fontSize: 16,
    },
};

export default AccessiblePage;
