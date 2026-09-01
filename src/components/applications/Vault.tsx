import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Window from '../os/Window';
import MenuBar, { MenuBarMenu } from '../os/MenuBar';
import Colors from '../../constants/colors';
import { openExternal } from '../os/openExternal';
import {
    VaultFile,
    VaultSite,
    obsidianSiteUrl,
    parseVaultCache,
    resolveWikiLink,
    vaultFileUrl,
} from '../os/library';
import {
    MarkdownContext,
    dropTitleHeading,
    renderMarkdown,
    splitFrontmatter,
    stripNonProse,
} from '../os/markdown';

/**
 * The Vault — a published Obsidian vault, read-only, in a Windows 95 window.
 *
 * Note on the approach, which is the same one the GitHub window takes: the
 * real thing cannot be embedded. Obsidian Publish serves
 * `x-frame-options: SAMEORIGIN`, so an <iframe> of it renders an empty box no
 * matter what we do. Instead this reads the same three endpoints Publish's own
 * front-end runs on and renders the result as a Windows 95 file browser — which
 * also means the notes arrive in this desktop's typeface rather than dropping a
 * modern web page into 1995.
 *
 * "Only watch" is the shape of the thing, not a setting that could be flipped.
 * There is no editor, no field, and no write path: every request this window
 * makes is a GET, and Publish exposes nothing that would accept anything else.
 * What is on screen is the *published* vault — the copy Jonas chose to put on
 * the internet — never the working one on his own machine.
 *
 * The one deliberate escape hatch is the maximize button: that opens the real
 * publish site in a new tab (see `Desktop.tsx`, which passes onMaximize).
 */

export interface VaultProps extends WindowAppProps {}

/** A folder in the tree, with the notes sitting directly inside it. */
interface Folder {
    path: string;
    /** Last segment — what the tree shows. */
    label: string;
    depth: number;
    notes: VaultFile[];
}

/**
 * Every folder that has notes in it, plus every folder on the way there.
 *
 * The cache is a flat list of paths, so the tree has to be inferred. A vault
 * where every note sits in the root is a real and common case, and gets one
 * unnamed group rather than a tree of nothing.
 */
function buildFolders(files: VaultFile[]): Folder[] {
    const notes = files.filter((f) => f.isNote);
    const byFolder = new Map<string, VaultFile[]>();
    notes.forEach((note) => {
        const list = byFolder.get(note.folder);
        if (list) list.push(note);
        else byFolder.set(note.folder, [note]);
    });

    // Ancestors, so "a/b/c" still shows "a" and "a/b" even with no notes of
    // their own — otherwise the tree jumps a level and reads as a flat list.
    const all = new Set<string>(Array.from(byFolder.keys()));
    Array.from(byFolder.keys()).forEach((folder) => {
        const parts = folder.split('/');
        for (let i = 1; i < parts.length; i++) {
            all.add(parts.slice(0, i).join('/'));
        }
    });

    return Array.from(all)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .map((path) => ({
            path,
            label: path === '' ? '' : path.slice(path.lastIndexOf('/') + 1),
            depth: path === '' ? 0 : path.split('/').length,
            notes: byFolder.get(path) || [],
        }));
}

const Vault: React.FC<VaultProps> = ({ onInteract, onClose, onMinimize }) => {
    const [site, setSite] = useState<VaultSite | null>(null);
    const [files, setFiles] = useState<VaultFile[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [current, setCurrent] = useState<VaultFile | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [noteError, setNoteError] = useState<string | null>(null);

    const [filter, setFilter] = useState('');
    const [open, setOpen] = useState<Set<string>>(new Set());

    /** Back/forward, the way a file browser has them. */
    const [history, setHistory] = useState<string[]>([]);
    const [at, setAt] = useState(-1);

    const pane = useRef<HTMLDivElement>(null);

    /* ---- loading ---------------------------------------------------- */

    const loadVault = useCallback(async () => {
        setError(null);
        setFiles(null);
        try {
            const found = await fetch('/api/obsidian');
            const info = await found.json();
            if (!found.ok) throw new Error(info.error || 'Vault not found.');

            const cache = await fetch(`https://${info.host}/cache/${info.uid}`);
            if (!cache.ok) {
                throw new Error(`The vault returned ${cache.status}.`);
            }
            setSite(info);
            setFiles(parseVaultCache(await cache.json()));
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'Could not reach the vault.'
            );
        }
    }, []);

    useEffect(() => {
        loadVault();
    }, [loadVault]);

    /**
     * Opening a note. Everything that navigates goes through here, so there is
     * one place that fetches, one that records history, and one that scrolls
     * the reading pane back to the top — which is the detail you only notice
     * when it is missing and a long note opens halfway down.
     */
    const openNote = useCallback(
        async (file: VaultFile, record = true) => {
            if (!site) return;
            setCurrent(file);
            setNote(null);
            setNoteError(null);
            if (record) {
                // Computed here rather than inside a setHistory updater: an
                // updater has to be pure, and this has to move `at` in step
                // with the list. Following a link from halfway back down the
                // trail drops the forward entries, the way a browser does.
                const trimmed = history.slice(0, at + 1);
                if (trimmed[trimmed.length - 1] !== file.path) {
                    setHistory([...trimmed, file.path]);
                    setAt(trimmed.length);
                }
            }
            // Reveal the note's folder in the tree, so arriving by a wiki link
            // from somewhere else doesn't leave the list pointing elsewhere.
            if (file.folder) {
                setOpen((prev) => {
                    const next = new Set(prev);
                    const parts = file.folder.split('/');
                    for (let i = 1; i <= parts.length; i++) {
                        next.add(parts.slice(0, i).join('/'));
                    }
                    return next;
                });
            }
            try {
                const res = await fetch(vaultFileUrl(site, file.path));
                if (!res.ok) throw new Error(`Returned ${res.status}.`);
                setNote(await res.text());
                if (pane.current) pane.current.scrollTop = 0;
            } catch (e) {
                setNoteError(
                    e instanceof Error ? e.message : 'Could not read that note.'
                );
            }
        },
        [site, at, history]
    );

    /** The index note opens by itself, the way the publish site's front page does. */
    useEffect(() => {
        if (!site || !files || current) return;
        const index =
            (site.indexFile &&
                resolveWikiLink(site.indexFile, files)) ||
            files.find((f) => f.isNote) ||
            null;
        if (index) openNote(index);
    }, [site, files, current, openNote]);

    /* ---- navigation -------------------------------------------------- */

    const goTo = useCallback(
        (index: number) => {
            if (!files || index < 0 || index >= history.length) return;
            const file = files.find((f) => f.path === history[index]);
            if (!file) return;
            setAt(index);
            openNote(file, false);
        },
        [files, history, openNote]
    );

    const followWikiLink = useCallback(
        (target: string) => {
            if (!files) return;
            const found = resolveWikiLink(target, files);
            if (found && found.isNote) {
                openNote(found);
            } else if (found && site) {
                // An attachment rather than a note — nothing to render, so it
                // opens where it actually lives.
                openExternal(vaultFileUrl(site, found.path));
            }
        },
        [files, site, openNote]
    );

    const markdownContext: MarkdownContext = useMemo(
        () => ({
            onWikiLink: followWikiLink,
            onExternal: openExternal,
            resolveAsset: (path) => {
                if (!site || !files) return null;
                const found = resolveWikiLink(path, files);
                return found && !found.isNote
                    ? vaultFileUrl(site, found.path)
                    : null;
            },
        }),
        [site, files, followWikiLink]
    );

    /* ---- the tree ---------------------------------------------------- */

    const folders = useMemo(() => (files ? buildFolders(files) : []), [files]);

    /**
     * Filtering flattens the tree on purpose: when you are searching you want
     * the matches, not the shape of the vault they happen to sit in.
     */
    const matches = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q || !files) return null;
        return files.filter(
            (f) => f.isNote && f.path.toLowerCase().includes(q)
        );
    }, [filter, files]);

    const noteCount = files ? files.filter((f) => f.isNote).length : 0;

    const status = error
        ? 'Disconnected'
        : !files
          ? 'Opening vault…'
          : matches
            ? `${matches.length} of ${noteCount} notes`
            : `${noteCount} note${noteCount === 1 ? '' : 's'} · read-only`;

    /* ---- menus ------------------------------------------------------- */

    /**
     * This window is a read-only view of somebody's notes, so its menus are
     * the things you can actually do with one: go and look at the real thing,
     * copy a pointer to it, and ask for it again.
     */
    const menus: MenuBarMenu[] = [
        {
            label: 'File',
            items: [
                {
                    label: 'Open on the Web',
                    bold: true,
                    disabled: !current,
                    onClick: () =>
                        current &&
                        openExternal(
                            `${obsidianSiteUrl(site)}/${encodeURI(
                                current.path.replace(/\.md$/i, '')
                            )}`
                        ),
                },
                {
                    label: 'Open Vault on the Web',
                    onClick: () => openExternal(obsidianSiteUrl(site)),
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
                    label: 'Copy Note Text',
                    accelerator: 'Ctrl+C',
                    disabled: !note,
                    onClick: () =>
                        note &&
                        navigator.clipboard
                            ?.writeText(note)
                            .catch(() => undefined),
                },
                {
                    label: 'Clear Search',
                    separatorBefore: true,
                    accelerator: 'Esc',
                    disabled: !filter,
                    onClick: () => setFilter(''),
                },
            ],
        },
        {
            label: 'View',
            items: [
                {
                    label: 'Back',
                    accelerator: 'Alt+←',
                    disabled: at <= 0,
                    onClick: () => goTo(at - 1),
                },
                {
                    label: 'Forward',
                    accelerator: 'Alt+→',
                    disabled: at >= history.length - 1,
                    onClick: () => goTo(at + 1),
                },
                {
                    label: 'Expand All Folders',
                    separatorBefore: true,
                    onClick: () => setOpen(new Set(folders.map((f) => f.path))),
                },
                {
                    label: 'Collapse All Folders',
                    onClick: () => setOpen(new Set()),
                },
                {
                    label: 'Refresh',
                    separatorBefore: true,
                    accelerator: 'F5',
                    onClick: () => loadVault(),
                },
            ],
        },
        {
            label: 'Help',
            items: [
                {
                    label: 'About This Vault',
                    onClick: () =>
                        window.alert(
                            'Read live from a published Obsidian vault each time this window opens. ' +
                                'It is read-only in the strictest sense: every request is a GET, there is no editor, ' +
                                'and what you are reading is the published copy — not the vault on my own machine. ' +
                                'Wiki links work; maximising opens the real site in a new tab.'
                        ),
                },
            ],
        },
    ];

    /* ---- render ------------------------------------------------------ */

    const parsed = note !== null ? splitFrontmatter(note) : null;
    // The note as prose: no Obsidian comments, no raw HTML tags, and no H1
    // repeating the filename that the window's own heading already shows.
    const prose =
        parsed && current
            ? dropTitleHeading(stripNonProse(parsed.body), current.name)
            : '';

    const renderNoteRow = (file: VaultFile, indent: number) => (
        <div
            key={file.path}
            style={Object.assign(
                {},
                styles.row,
                { paddingLeft: 10 + indent * 12 },
                current?.path === file.path && styles.rowSelected
            )}
            onClick={() => openNote(file)}
        >
            <span style={styles.rowIcon}>▫</span>
            <span style={styles.rowName}>{file.name}</span>
        </div>
    );

    return (
        <Window
            top={30}
            left={90}
            width={900}
            height={660}
            windowTitle={`${site?.siteName || 'Vault'} — Obsidian`}
            windowBarIcon="obsidianIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            // The deliberate exception: maximize leaves for the real site.
            onMaximize={() => openExternal(obsidianSiteUrl(site))}
            bottomLeftText={status}
        >
            <div style={styles.container}>
                <MenuBar menus={menus} />

                <div style={styles.addressBar}>
                    <button
                        style={styles.navButton}
                        disabled={at <= 0}
                        onClick={() => goTo(at - 1)}
                    >
                        ←
                    </button>
                    <button
                        style={styles.navButton}
                        disabled={at >= history.length - 1}
                        onClick={() => goTo(at + 1)}
                    >
                        →
                    </button>
                    <span style={styles.addressLabel}>Address</span>
                    <div style={styles.addressField}>
                        {current ? current.path : obsidianSiteUrl(site)}
                    </div>
                    <input
                        style={styles.search}
                        value={filter}
                        placeholder="Find a note…"
                        onChange={(e) => setFilter(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setFilter('');
                        }}
                    />
                </div>

                <div style={styles.body}>
                    {/* The vault, as a tree */}
                    <div style={styles.treePane}>
                        {error ? (
                            <div style={styles.centered}>
                                <p style={styles.message}>{error}</p>
                                <button style={styles.button} onClick={loadVault}>
                                    Retry
                                </button>
                            </div>
                        ) : !files ? (
                            <div style={styles.centered}>
                                <p style={styles.message}>Opening vault…</p>
                            </div>
                        ) : matches ? (
                            matches.length ? (
                                matches.map((file) => renderNoteRow(file, 0))
                            ) : (
                                <p style={styles.emptyNote}>
                                    Nothing matches “{filter}”.
                                </p>
                            )
                        ) : (
                            folders.map((folder) => {
                                // The root's notes hang directly off the top of
                                // the tree — it has no name to click.
                                if (folder.path === '') {
                                    return (
                                        <React.Fragment key="__root">
                                            {folder.notes.map((f) =>
                                                renderNoteRow(f, 0)
                                            )}
                                        </React.Fragment>
                                    );
                                }
                                const parent = folder.path.slice(
                                    0,
                                    folder.path.lastIndexOf('/')
                                );
                                // A nested folder stays hidden until its parent
                                // is open, which is what makes this a tree
                                // rather than an indented list of everything.
                                if (parent && !open.has(parent)) return null;
                                const isOpen = open.has(folder.path);
                                return (
                                    <React.Fragment key={folder.path}>
                                        <div
                                            style={Object.assign(
                                                {},
                                                styles.row,
                                                {
                                                    paddingLeft:
                                                        10 +
                                                        (folder.depth - 1) * 12,
                                                }
                                            )}
                                            onClick={() =>
                                                setOpen((prev) => {
                                                    const next = new Set(prev);
                                                    if (next.has(folder.path)) {
                                                        next.delete(folder.path);
                                                    } else {
                                                        next.add(folder.path);
                                                    }
                                                    return next;
                                                })
                                            }
                                        >
                                            <span style={styles.rowIcon}>
                                                {isOpen ? '−' : '+'}
                                            </span>
                                            <span style={styles.folderName}>
                                                {folder.label}
                                            </span>
                                        </div>
                                        {isOpen &&
                                            folder.notes.map((f) =>
                                                renderNoteRow(f, folder.depth)
                                            )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </div>

                    {/* The note itself */}
                    <div style={styles.readPane} ref={pane}>
                        {noteError ? (
                            <p style={styles.message}>{noteError}</p>
                        ) : !current ? (
                            <p style={styles.detailHint}>
                                Pick a note on the left.
                                <br />
                                <br />
                                This is a published Obsidian vault, read
                                straight from the source — wiki links work, and
                                nothing here can be edited from this window.
                            </p>
                        ) : parsed === null ? (
                            <p style={styles.message}>Reading…</p>
                        ) : (
                            <>
                                <p style={styles.noteTitle}>{current.name}</p>
                                {Object.keys(parsed.frontmatter).length ? (
                                    <div style={styles.properties}>
                                        {Object.keys(parsed.frontmatter).map(
                                            (k) => (
                                                <p key={k} style={styles.property}>
                                                    <span
                                                        style={styles.propertyKey}
                                                    >
                                                        {k}
                                                    </span>
                                                    {parsed.frontmatter[k]}
                                                </p>
                                            )
                                        )}
                                    </div>
                                ) : null}
                                {renderMarkdown(prose, markdownContext)}
                            </>
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
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    navButton: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        minWidth: 24,
        padding: '2px 4px',
        cursor: 'pointer',
    },
    addressLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
    },
    addressField: {
        flex: 1,
        minWidth: 0,
        padding: '2px 4px',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    search: {
        width: 150,
        flexShrink: 0,
        padding: '2px 4px',
        fontFamily: 'MSSerif',
        fontSize: 11,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    body: {
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        minHeight: 0,
    },
    treePane: {
        display: 'flex',
        flexDirection: 'column',
        width: 240,
        flexShrink: 0,
        overflowY: 'auto',
        background: Colors.white,
        borderRight: `1px solid ${Colors.darkGray}`,
        padding: '4px 0',
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        cursor: 'pointer',
        userSelect: 'none',
        flexShrink: 0,
    },
    rowSelected: { background: Colors.blue, color: Colors.white },
    rowIcon: {
        fontFamily: 'monospace',
        fontSize: 10,
        flexShrink: 0,
        opacity: 0.7,
        width: 9,
        textAlign: 'center',
    },
    rowName: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    folderName: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    readPane: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        overflowY: 'auto',
        background: Colors.white,
        padding: '12px 16px',
    },
    noteTitle: {
        fontFamily: 'MSSerif',
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.black,
        margin: '0 0 10px 0',
    },
    properties: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '6px 8px',
        margin: '0 0 12px 0',
        background: '#eceef0',
        border: `1px solid ${Colors.darkGray}`,
    },
    property: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        margin: 0,
    },
    propertyKey: {
        display: 'inline-block',
        minWidth: 80,
        fontWeight: 'bold',
        color: Colors.darkGray,
    },
    centered: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        padding: 16,
    },
    message: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: Colors.black,
        margin: 0,
        textAlign: 'center',
        lineHeight: 1.5,
    },
    emptyNote: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        margin: 0,
        padding: '8px 10px',
    },
    detailHint: {
        fontFamily: 'MSSerif',
        fontSize: 12,
        lineHeight: 1.6,
        color: Colors.darkGray,
        margin: 0,
    },
    button: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        padding: '3px 12px',
        cursor: 'pointer',
    },
};

export default Vault;
