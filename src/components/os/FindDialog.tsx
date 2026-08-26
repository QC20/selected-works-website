import React, { useEffect, useMemo, useRef, useState } from 'react';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import { SearchResult, buildIndex, search } from './searchIndex';
import { playClick } from './sounds';

/**
 * The Find box itself. See `searchIndex.ts` for what it searches and why.
 *
 * Deliberately *not* a `<Window>`: Find is a modal utility summoned by a
 * keystroke, and a draggable, minimisable window would make dismissing it
 * ambiguous. It behaves the way the real Find dialog did — it appears in
 * front of everything, takes the keyboard, and Escape closes it.
 *
 * Keyboard handling is the whole point, so it is complete: arrows move,
 * Enter opens, Escape closes, and the list scrolls to keep the selection in
 * view. Mouse works too, but nobody who finds this feature will use it.
 */

export interface FindDialogProps {
    open: boolean;
    onClose: () => void;
    openApp: (key: string, options?: LaunchOptions) => void;
    goToShowcase: (route: string) => void;
}

const KIND_LABEL: Record<string, string> = {
    program: 'Program',
    showcase: 'Showcase',
    channel: 'Television',
    project: 'GitHub',
    place: 'Location',
};

const FindDialog: React.FC<FindDialogProps> = ({
    open,
    onClose,
    openApp,
    goToShowcase,
}) => {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(0);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);

    // Rebuilt whenever the dialog opens: the program list can change between
    // openings (the Store installs things), and building it is cheap.
    const index = useMemo(
        () => (open ? buildIndex({ openApp, goToShowcase }) : []),
        [open, openApp, goToShowcase]
    );

    const results = useMemo(() => search(query, index), [query, index]);

    useEffect(() => {
        if (!open) return;
        setQuery('');
        setSelected(0);
        // Focus after paint, or the browser drops it.
        const id = window.setTimeout(() => inputRef.current?.focus(), 30);
        return () => window.clearTimeout(id);
    }, [open]);

    useEffect(() => setSelected(0), [query]);

    // Keep the highlighted row visible without scrolling the whole desktop.
    useEffect(() => {
        const list = listRef.current;
        const row = list?.children[selected] as HTMLElement | undefined;
        if (!list || !row) return;
        if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
        else if (
            row.offsetTop + row.offsetHeight >
            list.scrollTop + list.clientHeight
        ) {
            list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
        }
    }, [selected]);

    if (!open) return null;

    const run = (result: SearchResult | undefined) => {
        if (!result) return;
        playClick();
        result.run();
        onClose();
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelected((s) => Math.min(results.length - 1, s + 1));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelected((s) => Math.max(0, s - 1));
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            run(results[selected]);
        }
    };

    return (
        <div style={styles.backdrop} onPointerDown={onClose}>
            <div
                style={styles.dialog}
                onPointerDown={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Find"
            >
                <div style={styles.titleBar}>
                    <Icon icon="searchIcon" size={14} />
                    <span style={styles.titleText}>Find: All Files</span>
                    <button
                        type="button"
                        style={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div style={styles.body}>
                    <div style={styles.fieldRow}>
                        <span style={styles.fieldLabel}>Named:</span>
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Programs, pages, channels, projects…"
                            style={styles.input}
                            spellCheck={false}
                        />
                    </div>

                    <div ref={listRef} style={styles.list}>
                        {query.trim() === '' ? (
                            <div style={styles.empty}>
                                <p style={styles.emptyLine}>
                                    Type to search everything on this machine —
                                    programs, the pages of My Showcase,
                                    television channels, and every one of
                                    Jonas' live project pages.
                                </p>
                                <p style={styles.emptyHint}>
                                    ↑ ↓ to move · Enter to open · Esc to close
                                </p>
                            </div>
                        ) : results.length === 0 ? (
                            <div style={styles.empty}>
                                <p style={styles.emptyLine}>
                                    No items match “{query}”.
                                </p>
                            </div>
                        ) : (
                            results.map((r, i) => (
                                <div
                                    key={r.id}
                                    style={{
                                        ...styles.row,
                                        ...(i === selected ? styles.rowActive : null),
                                    }}
                                    onPointerDown={(e) => {
                                        e.stopPropagation();
                                        run(r);
                                    }}
                                    onMouseEnter={() => setSelected(i)}
                                >
                                    <Icon icon={r.icon} size={16} />
                                    <span
                                        style={{
                                            ...styles.rowLabel,
                                            ...(i === selected
                                                ? styles.rowLabelActive
                                                : null),
                                        }}
                                    >
                                        {r.label}
                                    </span>
                                    <span
                                        style={{
                                            ...styles.rowDetail,
                                            ...(i === selected
                                                ? styles.rowDetailActive
                                                : null),
                                        }}
                                    >
                                        {r.detail}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={styles.statusBar}>
                        <span style={styles.statusText}>
                            {query.trim()
                                ? `${results.length} item${
                                      results.length === 1 ? '' : 's'
                                  } found`
                                : `${index.length} items indexed`}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    backdrop: {
        position: 'fixed',
        inset: 0,
        // Above every window and the taskbar, below the screen saver.
        zIndex: 150000,
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh',
        background: 'rgba(0,0,0,0.12)',
    },
    dialog: {
        width: 'min(520px, 92vw)',
        flexDirection: 'column',
        background: Colors.lightGray,
        border: `2px solid ${Colors.white}`,
        borderRightColor: '#4a4a4a',
        borderBottomColor: '#4a4a4a',
        boxShadow: '3px 3px 0 rgba(0,0,0,0.45)',
    },
    titleBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: '3px 4px',
        background: '#000080',
    },
    titleText: {
        flex: 1,
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        width: 18,
        height: 16,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        fontSize: 9,
        lineHeight: 1,
        color: Colors.black,
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        padding: 0,
    },
    body: { flexDirection: 'column', padding: 8, gap: 8 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fieldLabel: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flex: 'none',
    },
    input: {
        flex: 1,
        minWidth: 0,
        width: 'auto',
        padding: '4px 6px',
        fontFamily: 'MSSerif',
        fontSize: 12,
        color: Colors.black,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        boxShadow: 'none',
        outline: 'none',
    },
    list: {
        flexDirection: 'column',
        height: 240,
        overflowY: 'auto',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: '4px 7px',
        cursor: 'pointer',
        flex: 'none',
    },
    rowActive: { background: '#000080' },
    rowLabel: {
        flex: 1,
        minWidth: 0,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    rowLabelActive: { color: '#fff' },
    rowDetail: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: '#666',
        flex: 'none',
    },
    rowDetailActive: { color: '#b8c4e8' },
    statusBar: {
        padding: '2px 6px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    statusText: { fontFamily: 'MSSerif', fontSize: 10, color: '#333' },
    empty: { flexDirection: 'column', gap: 8, padding: 12 },
    emptyLine: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        lineHeight: 1.5,
        color: '#444',
        margin: 0,
    },
    emptyHint: { fontFamily: 'MSSerif', fontSize: 10, color: '#777', margin: 0 },
};

export default FindDialog;
