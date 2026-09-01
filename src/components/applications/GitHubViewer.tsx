import React, { useCallback, useEffect, useState } from 'react';
import Window from '../os/Window';
import MenuBar, { MenuBarMenu } from '../os/MenuBar';
import Colors from '../../constants/colors';
import { openExternal } from '../os/openExternal';

export const GITHUB_URL = 'https://github.com/QC20';
const USER = 'QC20';

interface Repo {
    id: number;
    name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    topics?: string[];
    fork: boolean;
}

export interface GitHubViewerProps extends WindowAppProps {}

/**
 * Browses my public repositories without leaving the desktop.
 *
 * Note on the approach: github.com cannot be embedded. It serves
 * `X-Frame-Options: deny` and `frame-ancestors 'none'`, so an <iframe> renders
 * an empty box no matter what we do. Instead this reads GitHub's public REST
 * API and renders the results as a Windows 95 file list — which also means it
 * matches the desktop's look instead of dropping a modern web page into it.
 *
 * The one deliberate escape hatch is the maximize button: that opens the real
 * github.com/QC20 in a new tab (see `Desktop.tsx`, which passes onMaximize).
 */
const GitHubViewer: React.FC<GitHubViewerProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [repos, setRepos] = useState<Repo[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<number | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            const res = await fetch(
                `https://api.github.com/users/${USER}/repos?per_page=100&sort=updated`,
                { headers: { Accept: 'application/vnd.github+json' } }
            );
            if (!res.ok) {
                throw new Error(
                    res.status === 403
                        ? 'GitHub rate limit reached — try again in a few minutes.'
                        : `GitHub returned ${res.status}.`
                );
            }
            const data: Repo[] = await res.json();
            setRepos(data.filter((r) => !r.fork));
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'Could not reach GitHub.'
            );
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const current = repos?.find((r) => r.id === selected) || null;

    const status = error
        ? 'Disconnected'
        : !repos
          ? 'Connecting to github.com…'
          : `${repos.length} repositor${repos.length === 1 ? 'y' : 'ies'}`;

    /**
     * This window is a read-only view of a live API, so its menus are the two
     * things you can actually do with one: go and look at the real thing, and
     * ask for the list again.
     */
    const menus: MenuBarMenu[] = [
        {
            label: 'File',
            items: [
                {
                    label: 'Open Repository',
                    bold: true,
                    disabled: !current,
                    onClick: () => current && openExternal(current.html_url),
                },
                {
                    label: 'Open Profile on github.com',
                    onClick: () => openExternal(GITHUB_URL),
                },
                {
                    label: 'Close',
                    separatorBefore: true,
                    accelerator: 'Alt+F4',
                    onClick: onClose,
                },
            ],
        },
        {
            label: 'Edit',
            items: [
                {
                    label: 'Copy Repository URL',
                    accelerator: 'Ctrl+C',
                    disabled: !current,
                    onClick: () =>
                        current &&
                        navigator.clipboard
                            ?.writeText(current.html_url)
                            .catch(() => undefined),
                },
                {
                    label: 'Deselect',
                    separatorBefore: true,
                    accelerator: 'Esc',
                    disabled: !current,
                    onClick: () => setSelected(null),
                },
            ],
        },
        {
            label: 'View',
            items: [
                { label: 'Refresh', accelerator: 'F5', onClick: () => load() },
            ],
        },
        {
            label: 'Help',
            items: [
                {
                    label: 'About This List',
                    onClick: () =>
                        window.alert(
                            'Read live from the public GitHub API each time this window opens — forks excluded. Nothing is cached, so what you see is what is on github.com right now.'
                        ),
                },
            ],
        },
    ];

    return (
        <Window
            top={40}
            left={70}
            // 80% of the My Showcase window (1100 x 800).
            width={880}
            height={640}
            windowTitle={`${USER} — GitHub`}
            windowBarIcon="githubIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            // The deliberate exception: maximize leaves for the real site.
            onMaximize={() => openExternal(GITHUB_URL)}
            bottomLeftText={status}
        >
            <div style={styles.container}>
                <MenuBar menus={menus} />

                <div style={styles.addressBar}>
                    <span style={styles.addressLabel}>Address</span>
                    <div style={styles.addressField}>{GITHUB_URL}</div>
                    <button
                        style={styles.toolbarButton}
                        onClick={() => {
                            setRepos(null);
                            load();
                        }}
                    >
                        Refresh
                    </button>
                </div>

                <div style={styles.body}>
                    {/* Repository list */}
                    <div style={styles.listPane}>
                        {error ? (
                            <div style={styles.centered}>
                                <p style={styles.message}>{error}</p>
                                <button style={styles.button} onClick={load}>
                                    Retry
                                </button>
                            </div>
                        ) : !repos ? (
                            <div style={styles.centered}>
                                <p style={styles.message}>
                                    Connecting to github.com…
                                </p>
                            </div>
                        ) : (
                            repos.map((repo) => (
                                <div
                                    key={repo.id}
                                    style={Object.assign(
                                        {},
                                        styles.row,
                                        selected === repo.id && styles.rowSelected
                                    )}
                                    onClick={() => setSelected(repo.id)}
                                    onDoubleClick={() =>
                                        openExternal(repo.html_url)
                                    }
                                >
                                    <span style={styles.rowName}>
                                        {repo.name}
                                    </span>
                                    <span style={styles.rowLang}>
                                        {repo.language || '—'}
                                    </span>
                                    <span style={styles.rowStars}>
                                        ★ {repo.stargazers_count}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Details for the selected repository */}
                    <div style={styles.detailPane}>
                        {current ? (
                            <>
                                <p style={styles.detailTitle}>{current.name}</p>
                                <p style={styles.detailText}>
                                    {current.description ||
                                        'No description provided.'}
                                </p>
                                <div style={styles.detailFacts}>
                                    <p style={styles.fact}>
                                        Language: {current.language || '—'}
                                    </p>
                                    <p style={styles.fact}>
                                        Stars: {current.stargazers_count}
                                    </p>
                                    <p style={styles.fact}>
                                        Forks: {current.forks_count}
                                    </p>
                                    <p style={styles.fact}>
                                        Updated:{' '}
                                        {new Date(
                                            current.updated_at
                                        ).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    style={styles.button}
                                    onClick={() =>
                                        openExternal(current.html_url)
                                    }
                                >
                                    Open on GitHub
                                </button>
                            </>
                        ) : (
                            <p style={styles.detailHint}>
                                Select a repository to see its details.
                                Double-click one to open it on github.com.
                                <br />
                                <br />
                                Maximizing this window opens my full GitHub
                                profile in a new tab.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
    },
    addressBar: {
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    addressLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
    },
    addressField: {
        flex: 1,
        minWidth: 0,
        padding: '3px 4px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        alignItems: 'center',
    },
    toolbarButton: {
        padding: '3px 10px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        flexShrink: 0,
    },
    body: {
        flex: 1,
        minHeight: 0,
        gap: 4,
        padding: 4,
    },
    listPane: {
        display: 'flex',
        flexDirection: 'column',
        flex: 2,
        minWidth: 0,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    detailPane: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        gap: 8,
        padding: 10,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    row: {
        alignItems: 'center',
        gap: 10,
        padding: '4px 8px',
        cursor: 'pointer',
        userSelect: 'none',
        flexShrink: 0,
        color: Colors.black,
    },
    rowSelected: {
        background: Colors.blue,
        color: Colors.white,
    },
    rowName: {
        flex: 1,
        minWidth: 0,
        fontFamily: 'MSSerif',
        fontSize: 11,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
    rowLang: {
        width: 90,
        fontFamily: 'MSSerif',
        fontSize: 11,
        flexShrink: 0,
    },
    rowStars: {
        width: 50,
        fontFamily: 'MSSerif',
        fontSize: 11,
        textAlign: 'right',
        flexShrink: 0,
    },
    centered: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
    },
    message: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        textAlign: 'center',
        lineHeight: 1.5,
    },
    detailTitle: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.black,
        flexShrink: 0,
    },
    detailText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        lineHeight: 1.5,
        flexShrink: 0,
    },
    detailFacts: {
        flexDirection: 'column',
        gap: 3,
        flexShrink: 0,
    },
    fact: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
    },
    detailHint: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        lineHeight: 1.6,
    },
    button: {
        padding: '4px 12px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        alignSelf: 'flex-start',
        flexShrink: 0,
    },
};

export default GitHubViewer;
