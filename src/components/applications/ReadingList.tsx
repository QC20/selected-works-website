import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Window from '../os/Window';
import MenuBar, { MenuBarMenu } from '../os/MenuBar';
import Colors from '../../constants/colors';
import { openExternal } from '../os/openExternal';
import {
    Reference,
    ZOTERO_ENDPOINT,
    referenceKind,
} from '../os/library';

/**
 * Reading List — the literature, out of Zotero, read-only.
 *
 * The companion to the Vault window: that one is what Jonas writes, this one is
 * what he has been reading. Both are the same idea the GitHub window runs on —
 * read the service's data and render it as a Windows 95 window, rather than
 * dropping somebody else's web page into a 1995 desktop.
 *
 * Unlike the Vault, this one cannot talk to the service directly. Zotero would
 * serve a browser a *public group* library with no key at all, but a personal
 * library needs one, and a key in the front-end bundle is a key given away. So
 * `/api/zotero` holds it: the key stays on the server, minted read-only, and
 * this window only ever sees the flattened list that comes back. See the note
 * at the top of `api/zotero.js`.
 *
 * Sorting is by year rather than by title because that is the question people
 * actually bring to somebody's reading list — not "is there a paper called
 * X" but "what has this person been reading lately".
 */

export interface ReadingListProps extends WindowAppProps {}

type SortKey = 'year' | 'title' | 'author' | 'added';

const SORTS: { key: SortKey; label: string }[] = [
    { key: 'added', label: 'Date Added' },
    { key: 'year', label: 'Year' },
    { key: 'author', label: 'Author' },
    { key: 'title', label: 'Title' },
];

const ReadingList: React.FC<ReadingListProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [references, setReferences] = useState<Reference[] | null>(null);
    const [library, setLibrary] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [sort, setSort] = useState<SortKey>('added');
    const [tag, setTag] = useState('');

    const load = useCallback(async () => {
        setError(null);
        setReferences(null);
        try {
            const res = await fetch(ZOTERO_ENDPOINT);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Returned ${res.status}.`);
            setReferences(data.references || []);
            setLibrary(data.library || 'Library');
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'Could not reach Zotero.'
            );
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    /**
     * Every tag in the library, commonest first, capped at what fits along one
     * strip. A tag list nobody can scan is not a filter, it is wallpaper.
     */
    const tags = useMemo(() => {
        if (!references) return [];
        const counts = new Map<string, number>();
        references.forEach((r) =>
            r.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1))
        );
        return Array.from(counts.entries())
            .filter(([, n]) => n > 1)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, 12)
            .map(([t]) => t);
    }, [references]);

    const shown = useMemo(() => {
        if (!references) return [];
        const q = filter.trim().toLowerCase();
        const list = references.filter((r) => {
            if (tag && !r.tags.includes(tag)) return false;
            if (!q) return true;
            return (
                r.title.toLowerCase().includes(q) ||
                r.creators.toLowerCase().includes(q) ||
                r.publication.toLowerCase().includes(q) ||
                r.tags.some((t) => t.toLowerCase().includes(q))
            );
        });
        const by: Record<SortKey, (a: Reference, b: Reference) => number> = {
            // Undated entries sort last rather than first, which is what an
            // empty string would otherwise do.
            year: (a, b) => (b.year || '0').localeCompare(a.year || '0'),
            title: (a, b) => a.title.localeCompare(b.title),
            author: (a, b) => a.creators.localeCompare(b.creators),
            added: (a, b) => b.dateAdded.localeCompare(a.dateAdded),
        };
        return [...list].sort(by[sort]);
    }, [references, filter, sort, tag]);

    const current = references?.find((r) => r.key === selected) || null;

    const status = error
        ? 'Disconnected'
        : !references
          ? 'Reading library…'
          : `${shown.length}${
                shown.length === references.length
                    ? ''
                    : ` of ${references.length}`
            } reference${shown.length === 1 ? '' : 's'} · read-only`;

    /**
     * A read-only view of a bibliography, so its menus are what you do with
     * one: go to the paper, take the citation with you, ask for it again.
     */
    const menus: MenuBarMenu[] = [
        {
            label: 'File',
            items: [
                {
                    label: 'Open Reference',
                    bold: true,
                    disabled: !current || !current.url,
                    onClick: () =>
                        current?.url && openExternal(current.url),
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
                    label: 'Copy Citation',
                    accelerator: 'Ctrl+C',
                    disabled: !current,
                    onClick: () => {
                        if (!current) return;
                        // Near enough to APA to paste into an email, which is
                        // the only thing anyone does with a copied citation.
                        const parts = [
                            current.creators,
                            current.year ? `(${current.year}).` : '',
                            `${current.title}.`,
                            current.publication ? `${current.publication}.` : '',
                            current.url,
                        ].filter(Boolean);
                        navigator.clipboard
                            ?.writeText(parts.join(' '))
                            .catch(() => undefined);
                    },
                },
                {
                    label: 'Clear Filters',
                    separatorBefore: true,
                    accelerator: 'Esc',
                    disabled: !filter && !tag,
                    onClick: () => {
                        setFilter('');
                        setTag('');
                    },
                },
            ],
        },
        {
            label: 'View',
            items: [
                ...SORTS.map((s) => ({
                    label: `Sort by ${s.label}`,
                    checked: sort === s.key,
                    onClick: () => setSort(s.key),
                })),
                {
                    label: 'Refresh',
                    separatorBefore: true,
                    accelerator: 'F5',
                    onClick: () => load(),
                },
            ],
        },
        {
            label: 'Help',
            items: [
                {
                    label: 'About This List',
                    onClick: () =>
                        window.alert(
                            'The literature I keep coming back to, read from my Zotero library. ' +
                                'It is read-only in every direction: the key lives on the server, it is minted read-only, ' +
                                'and this window can only ask for the list. Selecting an entry shows my own note on it, ' +
                                'where I wrote one.'
                        ),
                },
            ],
        },
    ];

    return (
        <Window
            top={50}
            left={120}
            width={880}
            height={620}
            windowTitle={`${library || 'Reading List'} — Zotero`}
            windowBarIcon="zoteroIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={status}
        >
            <div style={styles.container}>
                <MenuBar menus={menus} />

                <div style={styles.toolbar}>
                    <input
                        style={styles.search}
                        value={filter}
                        placeholder="Search titles, authors, journals…"
                        onChange={(e) => setFilter(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setFilter('');
                        }}
                    />
                    <span style={styles.toolbarLabel}>Sort</span>
                    <select
                        style={styles.select}
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortKey)}
                    >
                        {SORTS.map((s) => (
                            <option key={s.key} value={s.key}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                    <button style={styles.button} onClick={load}>
                        Refresh
                    </button>
                </div>

                {tags.length ? (
                    <div style={styles.tagBar}>
                        <span style={styles.toolbarLabel}>Tags</span>
                        {tags.map((t) => (
                            <button
                                key={t}
                                style={Object.assign(
                                    {},
                                    styles.tag,
                                    tag === t && styles.tagOn
                                )}
                                onClick={() => setTag(tag === t ? '' : t)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div style={styles.body}>
                    {/* The bibliography */}
                    <div style={styles.listPane}>
                        {error ? (
                            <div style={styles.centered}>
                                <p style={styles.message}>{error}</p>
                                <button style={styles.button} onClick={load}>
                                    Retry
                                </button>
                            </div>
                        ) : !references ? (
                            <div style={styles.centered}>
                                <p style={styles.message}>Reading library…</p>
                            </div>
                        ) : !shown.length ? (
                            <p style={styles.emptyNote}>
                                Nothing matches that.
                            </p>
                        ) : (
                            shown.map((ref) => (
                                <div
                                    key={ref.key}
                                    style={Object.assign(
                                        {},
                                        styles.row,
                                        selected === ref.key && styles.rowSelected
                                    )}
                                    onClick={() => setSelected(ref.key)}
                                    onDoubleClick={() =>
                                        ref.url && openExternal(ref.url)
                                    }
                                >
                                    <span style={styles.rowTitle}>
                                        {ref.title}
                                    </span>
                                    <span style={styles.rowMeta}>
                                        {[ref.creators, ref.year]
                                            .filter(Boolean)
                                            .join(' · ') || '—'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Details for the selected reference */}
                    <div style={styles.detailPane}>
                        {current ? (
                            <>
                                <p style={styles.detailTitle}>{current.title}</p>
                                <div style={styles.detailFacts}>
                                    <p style={styles.fact}>
                                        <span style={styles.factKey}>Type</span>
                                        {referenceKind(current.itemType)}
                                    </p>
                                    {current.creators ? (
                                        <p style={styles.fact}>
                                            <span style={styles.factKey}>
                                                Authors
                                            </span>
                                            {current.creators}
                                        </p>
                                    ) : null}
                                    {current.year ? (
                                        <p style={styles.fact}>
                                            <span style={styles.factKey}>
                                                Year
                                            </span>
                                            {current.year}
                                        </p>
                                    ) : null}
                                    {current.publication ? (
                                        <p style={styles.fact}>
                                            <span style={styles.factKey}>In</span>
                                            {current.publication}
                                        </p>
                                    ) : null}
                                </div>
                                {current.abstract ? (
                                    <p style={styles.abstract}>
                                        {current.abstract}
                                    </p>
                                ) : (
                                    <p style={styles.detailHint}>
                                        No note on this one.
                                    </p>
                                )}
                                {current.tags.length ? (
                                    <div style={styles.detailTags}>
                                        {current.tags.map((t) => (
                                            <span key={t} style={styles.tagChip}>
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                                {current.url ? (
                                    <button
                                        style={styles.button}
                                        onClick={() =>
                                            openExternal(current.url)
                                        }
                                    >
                                        Open Reference
                                    </button>
                                ) : null}
                            </>
                        ) : (
                            <p style={styles.detailHint}>
                                Select a reference to see the details.
                                Double-click one to open it.
                                <br />
                                <br />
                                This is the literature I keep coming back to,
                                read straight from my Zotero library. Where I
                                wrote a note on something, the note is here too.
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
    toolbar: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    toolbarLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
    },
    search: {
        flex: 1,
        minWidth: 0,
        padding: '2px 4px',
        fontFamily: 'MSSerif',
        fontSize: 11,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    select: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        padding: '1px 2px',
    },
    tagBar: {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    tag: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        padding: '1px 6px',
        cursor: 'pointer',
    },
    tagOn: {
        background: Colors.blue,
        color: Colors.white,
    },
    body: {
        display: 'flex',
        flexDirection: 'row',
        flex: 1,
        minHeight: 0,
    },
    listPane: {
        display: 'flex',
        flexDirection: 'column',
        width: 400,
        flexShrink: 0,
        overflowY: 'auto',
        background: Colors.white,
        borderRight: `1px solid ${Colors.darkGray}`,
    },
    row: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '5px 10px',
        cursor: 'pointer',
        userSelect: 'none',
        flexShrink: 0,
        borderBottom: `1px solid #e4e6e8`,
    },
    rowSelected: { background: Colors.blue, color: Colors.white },
    rowTitle: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        lineHeight: 1.4,
    },
    rowMeta: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        opacity: 0.75,
    },
    detailPane: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        gap: 10,
        overflowY: 'auto',
        background: Colors.lightGray,
        padding: '12px 14px',
        alignItems: 'flex-start',
    },
    detailTitle: {
        fontFamily: 'MSSerif',
        fontSize: 14,
        fontWeight: 'bold',
        lineHeight: 1.4,
        color: Colors.black,
        margin: 0,
    },
    detailFacts: {
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        width: '100%',
    },
    fact: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        margin: 0,
        lineHeight: 1.5,
    },
    factKey: {
        display: 'inline-block',
        minWidth: 64,
        fontWeight: 'bold',
        color: Colors.darkGray,
    },
    abstract: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        lineHeight: 1.6,
        color: Colors.black,
        margin: 0,
        padding: '8px 10px',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    detailTags: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
    },
    tagChip: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        padding: '1px 6px',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        color: Colors.black,
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
        flexShrink: 0,
    },
};

export default ReadingList;
