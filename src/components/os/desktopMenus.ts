/**
 * What each right-click menu contains.
 *
 * Kept out of `Desktop.tsx` because the menus are data, not layout: the desktop
 * supplies the handlers, this decides what a Windows 95 menu would have offered
 * for that thing and in what order.
 *
 * Items that the real menu had but this desktop can't do (Cut, Copy, Rename,
 * Send To…) are listed and disabled rather than left out. A menu with three
 * entries doesn't read as Windows 95; a full menu with most of it greyed out
 * is exactly what right-clicking felt like.
 */

import { ContextMenuItem } from './ContextMenu';

export type ArrangeOrder = 'name' | 'type';

export interface DesktopMenuActions {
    arrange: (order: ArrangeOrder) => void;
    lineUp: () => void;
    refresh: () => void;
    newFolder?: () => void;
    properties: () => void;
}

export function desktopMenu(actions: DesktopMenuActions): ContextMenuItem[] {
    return [
        {
            label: 'Arrange Icons',
            submenu: [
                { label: 'by Name', onClick: () => actions.arrange('name') },
                { label: 'by Type', onClick: () => actions.arrange('type') },
                { label: 'Auto Arrange', disabled: true },
            ],
        },
        { label: 'Line up Icons', onClick: actions.lineUp },
        { label: 'Refresh', onClick: actions.refresh, separatorBefore: true },
        { label: 'Paste', disabled: true, separatorBefore: true },
        { label: 'Paste Shortcut', disabled: true },
        {
            label: 'New Folder',
            disabled: !actions.newFolder,
            onClick: actions.newFolder,
            separatorBefore: true,
        },
        {
            label: 'Properties',
            onClick: actions.properties,
            separatorBefore: true,
        },
    ];
}

export interface ShortcutMenuActions {
    open: () => void;
    /** Only for apps the Store can remove (see `installedApps.ts`). */
    uninstall?: () => void;
    properties?: () => void;
}

export function shortcutMenu(actions: ShortcutMenuActions): ContextMenuItem[] {
    return [
        { label: 'Open', onClick: actions.open, bold: true },
        { label: 'Send To', disabled: true, separatorBefore: true },
        { label: 'Cut', disabled: true, separatorBefore: true },
        { label: 'Copy', disabled: true },
        {
            label: 'Delete',
            disabled: !actions.uninstall,
            onClick: actions.uninstall,
            separatorBefore: true,
        },
        { label: 'Rename', disabled: true },
        {
            label: 'Properties',
            disabled: !actions.properties,
            onClick: actions.properties,
            separatorBefore: true,
        },
    ];
}

export interface BinMenuActions {
    open: () => void;
    empty?: () => void;
    properties: () => void;
}

export function recycleBinMenu(actions: BinMenuActions): ContextMenuItem[] {
    return [
        { label: 'Open', onClick: actions.open, bold: true },
        { label: 'Explore', disabled: true },
        {
            label: 'Empty Recycle Bin',
            disabled: !actions.empty,
            onClick: actions.empty,
            separatorBefore: true,
        },
        {
            label: 'Properties',
            onClick: actions.properties,
            separatorBefore: true,
        },
    ];
}

export interface FileMenuActions {
    open?: () => void;
    delete: () => void;
    restore?: () => void;
    /** "Restore" in the bin; "Put back in My Documents" out on the desktop. */
    restoreLabel?: string;
}

export function fileMenu(actions: FileMenuActions): ContextMenuItem[] {
    return [
        {
            label: 'Open',
            disabled: !actions.open,
            onClick: actions.open,
            bold: true,
        },
        ...(actions.restore
            ? [
                  {
                      label: actions.restoreLabel || 'Restore',
                      onClick: actions.restore,
                      separatorBefore: true,
                  },
              ]
            : []),
        { label: 'Cut', disabled: true, separatorBefore: true },
        { label: 'Copy', disabled: true },
        {
            label: 'Delete',
            onClick: actions.delete,
            separatorBefore: true,
        },
        { label: 'Rename', disabled: true },
        { label: 'Properties', disabled: true, separatorBefore: true },
    ];
}
