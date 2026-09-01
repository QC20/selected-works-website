import React, { useEffect, useRef, useState } from 'react';
import Colors from '../../constants/colors';

/**
 * The File / Edit / View / Help bar along the top of a window.
 * ------------------------------------------------------------
 * Eight windows on this desktop drew that bar as four inert `<span>`s. It is
 * the single most-clicked piece of furniture in a Windows 95 re-enactment —
 * it is the first thing anyone who used the real thing reaches for — and it
 * did nothing at all, which is worse than not drawing it: a dead menu tells
 * the visitor the whole desktop is a picture.
 *
 * So this is the real control, driven by a list of menus the way
 * `ContextMenu` is driven by a list of items. Each window describes its own
 * menus in terms of the operations it already has (`RecycleBin` already knew
 * how to restore a file; it just never had a Restore menu item), which is why
 * this component knows nothing about folders, mail or browsers.
 *
 * Classic behaviour, because the muscle memory is the point:
 *
 *   - Click a title to open it; click it again to close it.
 *   - While one is open, *hovering* another title switches to it without a
 *     second click. This is the one interaction people notice the absence of.
 *   - Escape, a click anywhere else, or the window losing focus closes it.
 *   - A disabled item swallows the click and stays open, rather than
 *     dismissing the menu as if something had happened.
 *
 * Positioning is `absolute`, not `fixed`: the whole desktop sits inside a
 * `transform: scale()` wrapper for the resolution setting, and a fixed child
 * of a transformed element is positioned against that element rather than the
 * viewport. The Address drop-down in `MyComputer` already had to solve this
 * the same way.
 */

export interface MenuBarItem {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    /** Draws a groove above this item. */
    separatorBefore?: boolean;
    /** The default action, shown bold — "Open", the way Explorer does it. */
    bold?: boolean;
    /** Right-aligned shortcut text: "Ctrl+C", "Del", "F5". Display only. */
    accelerator?: string;
    /** Draws a tick to the left, for a setting rather than a command. */
    checked?: boolean;
}

export interface MenuBarMenu {
    /** "File", "Edit", "Favorites" — the title on the bar. */
    label: string;
    items: MenuBarItem[];
}

const MenuBar: React.FC<{ menus: MenuBarMenu[] }> = ({ menus }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (openIndex === null) return;
        const close = (e: Event) => {
            // A press on the bar itself is the title toggling, which the
            // title's own handler has already dealt with.
            if (barRef.current?.contains(e.target as Node)) return;
            setOpenIndex(null);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpenIndex(null);
        };
        // Deferred: the press that opened the menu is still propagating.
        const id = window.setTimeout(() => {
            window.addEventListener('pointerdown', close);
            window.addEventListener('blur', close);
            window.addEventListener('resize', close);
            window.addEventListener('keydown', onKey);
        }, 0);
        return () => {
            window.clearTimeout(id);
            window.removeEventListener('pointerdown', close);
            window.removeEventListener('blur', close);
            window.removeEventListener('resize', close);
            window.removeEventListener('keydown', onKey);
        };
    }, [openIndex]);

    return (
        <div style={styles.bar} ref={barRef}>
            {menus.map((menu, i) => (
                <div key={menu.label} style={styles.titleWrap}>
                    <span
                        style={Object.assign(
                            {},
                            styles.title,
                            openIndex === i && styles.titleOpen
                        )}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            setOpenIndex(openIndex === i ? null : i);
                        }}
                        // Sliding along the bar with one menu already open
                        // walks through the rest of them, as it should.
                        onPointerEnter={() => {
                            if (openIndex !== null) setOpenIndex(i);
                        }}
                    >
                        {menu.label}
                        <u style={styles.mnemonic}>_</u>
                    </span>

                    {openIndex === i && (
                        <div
                            style={styles.dropdown}
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            {menu.items.map((item, j) => (
                                <React.Fragment key={`${item.label}-${j}`}>
                                    {item.separatorBefore && (
                                        <div style={styles.separator} />
                                    )}
                                    <Row
                                        item={item}
                                        onChoose={() => {
                                            if (item.disabled) return;
                                            item.onClick?.();
                                            setOpenIndex(null);
                                        }}
                                    />
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

const Row: React.FC<{ item: MenuBarItem; onChoose: () => void }> = ({
    item,
    onChoose,
}) => {
    const [hovered, setHovered] = useState(false);
    const highlight = hovered && !item.disabled;
    return (
        <div
            style={Object.assign(
                {},
                styles.row,
                item.disabled && styles.rowDisabled,
                highlight && styles.rowHighlight
            )}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onPointerUp={onChoose}
        >
            <span style={styles.check}>{item.checked ? '✓' : ''}</span>
            <span
                style={Object.assign(
                    {},
                    styles.label,
                    item.bold && styles.labelBold
                )}
            >
                {item.label}
            </span>
            <span style={styles.accelerator}>{item.accelerator || ''}</span>
        </div>
    );
};

const ITEM_HEIGHT = 21;

const styles: StyleSheetCSS = {
    bar: {
        display: 'flex',
        gap: 16,
        padding: '4px 6px',
        borderBottom: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
        // The drop-downs hang out of the bar and must sit over the folder
        // listing, the toolbar and anything else below them.
        position: 'relative',
        zIndex: 60,
    },
    titleWrap: {
        position: 'relative',
    },
    title: {
        cursor: 'default',
        userSelect: 'none',
        padding: '0 2px',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        whiteSpace: 'nowrap',
    },
    // An open title stays highlighted the whole time its menu is down, which
    // is how you can tell which one you are looking at.
    titleOpen: {
        background: Colors.blue,
        color: Colors.white,
    },
    mnemonic: {
        marginLeft: -2,
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 3,
        flexDirection: 'column',
        minWidth: 168,
        padding: 2,
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderBottomColor: Colors.black,
        borderRightColor: Colors.black,
        boxShadow: '1px 1px 0 rgba(0,0,0,0.4)',
        zIndex: 61,
        cursor: 'default',
        userSelect: 'none',
    },
    row: {
        alignItems: 'center',
        gap: 6,
        height: ITEM_HEIGHT,
        padding: '0 8px 0 2px',
        cursor: 'default',
        color: Colors.black,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        touchAction: 'manipulation',
    },
    rowHighlight: {
        background: Colors.blue,
        color: Colors.white,
    },
    rowDisabled: {
        color: Colors.darkGray,
    },
    check: {
        width: 12,
        textAlign: 'center',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: 'inherit',
        flexShrink: 0,
    },
    label: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: 'inherit',
        flex: 1,
        paddingRight: 18,
    },
    labelBold: {
        fontWeight: 'bold',
    },
    // Greyed even on a highlighted row, the way Windows drew accelerators.
    accelerator: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: 'inherit',
        opacity: 0.75,
        flexShrink: 0,
    },
    separator: {
        height: 1,
        margin: '3px 2px',
        background: Colors.darkGray,
        borderBottom: `1px solid ${Colors.white}`,
        flexShrink: 0,
    },
};

export default MenuBar;
