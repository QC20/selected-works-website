import React, { useEffect, useState } from 'react';
import Colors from '../../constants/colors';

/**
 * The right-click menu.
 *
 * Driven by a list of items rather than a set of booleans, so the desktop, an
 * app shortcut, a file and the Recycle Bin can each describe their own menu
 * (see `desktopMenus.ts`) instead of this component having to know about all of
 * them.
 *
 * Coordinates are in *desktop* space, not screen space. The whole desktop sits
 * inside a `transform: scale()` wrapper for the resolution setting, and a
 * `position: fixed` child of a transformed element is positioned against that
 * element rather than the viewport — so a fixed menu would land in the wrong
 * place at every resolution except 100%. Rendering inside the wrapper with
 * absolute coordinates keeps the menu under the cursor at any scale; callers
 * convert with `screenToDesktop`.
 */

export interface ContextMenuItem {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    /** Draws a groove above this item. */
    separatorBefore?: boolean;
    /** The default action, shown bold — "Open", the way Explorer does it. */
    bold?: boolean;
    /** One level of fly-out. */
    submenu?: ContextMenuItem[];
}

export interface ContextMenuProps {
    /** Desktop coordinates (see the note above). */
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
    /** The desktop's own size, for keeping the menu on screen. */
    bounds: { width: number; height: number };
}

const ITEM_HEIGHT = 21;
const MENU_WIDTH = 168;

const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    items,
    onClose,
    bounds,
}) => {
    const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

    // Any press outside, any second right-click, or Escape closes it — and so
    // does resizing, since the anchor point stops meaning anything.
    useEffect(() => {
        const close = () => onClose();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        // Deferred: the press that opened the menu is still propagating.
        const id = window.setTimeout(() => {
            window.addEventListener('pointerdown', close);
            window.addEventListener('contextmenu', close);
            window.addEventListener('blur', close);
            window.addEventListener('resize', close);
            window.addEventListener('keydown', onKey);
        }, 0);
        return () => {
            window.clearTimeout(id);
            window.removeEventListener('pointerdown', close);
            window.removeEventListener('contextmenu', close);
            window.removeEventListener('blur', close);
            window.removeEventListener('resize', close);
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    // Flip the menu back on screen when it would hang off an edge, the way a
    // real one does, rather than letting it run under the taskbar.
    const height =
        items.length * ITEM_HEIGHT +
        items.filter((i) => i.separatorBefore).length * 5 +
        8;
    const left = Math.max(0, Math.min(x, bounds.width - MENU_WIDTH - 4));
    const top = Math.max(0, Math.min(y, bounds.height - height - 36));

    return (
        <div
            style={Object.assign({}, styles.menu, { top, left })}
            onPointerDown={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
        >
            {items.map((item, i) => (
                <React.Fragment key={`${item.label}-${i}`}>
                    {item.separatorBefore && <div style={styles.separator} />}
                    <MenuRow
                        item={item}
                        submenuOpen={openSubmenu === item.label}
                        onHover={() =>
                            setOpenSubmenu(item.submenu ? item.label : null)
                        }
                        onChoose={() => {
                            if (item.disabled || !item.onClick) return;
                            item.onClick();
                            onClose();
                        }}
                        onChooseSub={(sub) => {
                            if (sub.disabled || !sub.onClick) return;
                            sub.onClick();
                            onClose();
                        }}
                    />
                </React.Fragment>
            ))}
        </div>
    );
};

const MenuRow: React.FC<{
    item: ContextMenuItem;
    submenuOpen: boolean;
    onHover: () => void;
    onChoose: () => void;
    onChooseSub: (sub: ContextMenuItem) => void;
}> = ({ item, submenuOpen, onHover, onChoose, onChooseSub }) => {
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
            onMouseEnter={() => {
                setHovered(true);
                onHover();
            }}
            onMouseLeave={() => setHovered(false)}
            onPointerUp={onChoose}
        >
            <span
                style={Object.assign({}, styles.label, item.bold && styles.labelBold)}
            >
                {item.label}
            </span>
            {item.submenu && <span style={styles.arrow}>▶</span>}

            {item.submenu && submenuOpen && !item.disabled && (
                <div style={styles.submenu}>
                    {item.submenu.map((sub, i) => (
                        <SubRow
                            key={`${sub.label}-${i}`}
                            item={sub}
                            onChoose={() => onChooseSub(sub)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const SubRow: React.FC<{ item: ContextMenuItem; onChoose: () => void }> = ({
    item,
    onChoose,
}) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            style={Object.assign(
                {},
                styles.row,
                item.disabled && styles.rowDisabled,
                hovered && !item.disabled && styles.rowHighlight
            )}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onPointerUp={onChoose}
        >
            <span style={styles.label}>{item.label}</span>
        </div>
    );
};

const styles: StyleSheetCSS = {
    menu: {
        position: 'absolute',
        flexDirection: 'column',
        width: MENU_WIDTH,
        padding: 2,
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderBottomColor: Colors.black,
        borderRightColor: Colors.black,
        boxShadow: '1px 1px 0 rgba(0,0,0,0.4)',
        // Above every window and the taskbar, below the screen saver.
        zIndex: 150000,
        fontFamily: 'MSSerif',
        fontSize: 11,
        userSelect: 'none',
    },
    row: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        height: ITEM_HEIGHT,
        padding: '0 8px',
        cursor: 'default',
        color: Colors.black,
        flexShrink: 0,
        touchAction: 'manipulation',
    },
    rowHighlight: {
        background: Colors.blue,
        color: Colors.white,
    },
    rowDisabled: {
        color: Colors.darkGray,
    },
    label: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: 'inherit',
        whiteSpace: 'nowrap',
    },
    labelBold: {
        fontWeight: 'bold',
    },
    arrow: {
        fontSize: 8,
        lineHeight: '8px',
        color: 'inherit',
    },
    separator: {
        height: 1,
        margin: '2px 2px',
        background: Colors.darkGray,
        borderBottom: `1px solid ${Colors.white}`,
        flexShrink: 0,
    },
    submenu: {
        position: 'absolute',
        top: -3,
        left: '100%',
        flexDirection: 'column',
        width: 132,
        padding: 2,
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderBottomColor: Colors.black,
        borderRightColor: Colors.black,
        boxShadow: '1px 1px 0 rgba(0,0,0,0.4)',
        zIndex: 1,
    },
};

export default ContextMenu;
