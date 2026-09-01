import React, { useCallback, useRef, useState } from 'react';
import Window from '../os/Window';
import MenuBar, { MenuBarMenu } from '../os/MenuBar';
import FileIcon from '../os/FileIcon';
import Colors from '../../constants/colors';
import { DesktopFile, filesIn, updateFile, useDesktopFiles } from '../os/desktopFiles';
import {
    deleteForever,
    emptyBin,
    restoreFile,
} from '../os/documentFiles';
import { getResolutionScale } from '../os/resolution';
import { screenToIconSlot } from '../os/iconPositions';

export interface RecycleBinProps extends WindowAppProps {}

/**
 * The Recycle Bin shows its contents as icons rather than a list, the way
 * Windows 95 (and Yute's portfolio) does. Each icon is draggable: move it
 * around inside the window, or drag it clean out of the window to drop it back
 * onto the desktop. The Restore button does the same thing without the drag.
 */
const RecycleBin: React.FC<RecycleBinProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    useDesktopFiles(); // re-render whenever a file moves in or out of the bin
    const contents = filesIn('recycleBin');

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = contents.find((f) => f.id === selectedId) || null;

    // The icon area, so a drop can be tested against the window's own bounds.
    const contentRef = useRef<HTMLDivElement>(null);

    const handleDropped = useCallback(
        (file: DesktopFile, dx: number, dy: number, screen: { x: number; y: number }) => {
            const area = contentRef.current?.getBoundingClientRect();
            const droppedOutside =
                !!area &&
                (screen.x < area.left ||
                    screen.x > area.right ||
                    screen.y < area.top ||
                    screen.y > area.bottom);

            if (droppedOutside) {
                // Out of the bin and onto the desktop, landing under the cursor.
                restoreFile(
                    file,
                    screenToIconSlot(screen.x, screen.y, getResolutionScale())
                );
                setSelectedId(null);
                return;
            }

            // Still inside the bin — just leave it where it was dropped.
            updateFile(file.id, {
                binPos: {
                    x: Math.max(0, file.binPos.x + dx),
                    y: Math.max(0, file.binPos.y + dy),
                },
            });
        },
        []
    );

    /**
     * Restore puts a file back where it was thrown away from — the desktop if
     * that is where it came from, My Documents if it was dragged straight out
     * of the folder (see `documentFiles.ts`).
     */
    const handleRestore = useCallback(() => {
        if (!selected) return;
        restoreFile(selected);
        setSelectedId(null);
    }, [selected]);

    const handlePermanentDelete = useCallback(() => {
        if (!selected) return;
        deleteForever(selected);
        setSelectedId(null);
    }, [selected]);

    const handleEmptyBin = useCallback(() => {
        if (contents.length === 0) return;
        if (
            window.confirm(
                'Are you sure you want to permanently delete all items in the Recycle Bin?'
            )
        ) {
            emptyBin();
            setSelectedId(null);
        }
    }, [contents.length]);

    const totalSize = contents.reduce((sum, f) => sum + f.size, 0);
    const statusText = selected
        ? `1 object(s) selected   ${selected.size} KB`
        : `${contents.length} object(s)   ${totalSize} KB`;

    /**
     * The bin already knew how to restore, delete and empty — those were
     * toolbar buttons and nothing else. The menu is where a Windows 95 user
     * looks for them first, so it offers the same three, plus the one thing
     * the toolbar has no room for: restoring everything at once.
     */
    const menus: MenuBarMenu[] = [
        {
            label: 'File',
            items: [
                {
                    label: 'Restore',
                    bold: true,
                    disabled: !selected,
                    onClick: handleRestore,
                },
                {
                    label: 'Delete',
                    accelerator: 'Del',
                    disabled: !selected,
                    onClick: handlePermanentDelete,
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
                    label: 'Restore All',
                    disabled: contents.length === 0,
                    onClick: () => {
                        // Copy first: restoring mutates the list this is
                        // iterating, and a bin that empties halfway is worse
                        // than one that does nothing.
                        [...contents].forEach((file) => restoreFile(file));
                        setSelectedId(null);
                    },
                },
                {
                    label: 'Deselect',
                    separatorBefore: true,
                    accelerator: 'Esc',
                    disabled: !selected,
                    onClick: () => setSelectedId(null),
                },
            ],
        },
        {
            label: 'View',
            items: [
                { label: 'Large Icons', checked: true, onClick: () => undefined },
                {
                    label: 'Empty Recycle Bin',
                    separatorBefore: true,
                    disabled: contents.length === 0,
                    onClick: handleEmptyBin,
                },
            ],
        },
        {
            label: 'Help',
            items: [
                {
                    label: 'What is the Recycle Bin?',
                    onClick: () =>
                        window.alert(
                            'Files you delete are kept here rather than removed, so you can put them back. Drag one out onto the desktop, or select it and choose File > Restore. Emptying the bin is permanent.'
                        ),
                },
            ],
        },
    ];

    return (
        <Window
            top={112}
            left={224}
            width={520}
            height={380}
            windowTitle="Recycle Bin"
            windowBarIcon={
                contents.length > 0 ? 'recycleBinIcon' : 'recycleBinEmptyIcon'
            }
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={statusText}
        >
            <div style={styles.container}>
                {/* Menu Bar */}
                <MenuBar menus={menus} />

                {/* Toolbar */}
                <div style={styles.toolbar}>
                    <button
                        style={Object.assign(
                            {},
                            styles.toolbarButton,
                            !selected && styles.disabled
                        )}
                        onClick={handleRestore}
                        disabled={!selected}
                    >
                        Restore
                    </button>
                    <button
                        style={Object.assign(
                            {},
                            styles.toolbarButton,
                            !selected && styles.disabled
                        )}
                        onClick={handlePermanentDelete}
                        disabled={!selected}
                    >
                        Delete
                    </button>
                    <button
                        style={Object.assign(
                            {},
                            styles.toolbarButton,
                            contents.length === 0 && styles.disabled
                        )}
                        onClick={handleEmptyBin}
                        disabled={contents.length === 0}
                    >
                        Empty Bin
                    </button>
                </div>

                {/* Icon view — click the background to deselect. */}
                <div
                    ref={contentRef}
                    style={styles.iconArea}
                    onPointerDown={() => setSelectedId(null)}
                >
                    {contents.length === 0 ? (
                        <div style={styles.emptyState}>
                            <p style={styles.emptyText}>Recycle Bin is empty</p>
                        </div>
                    ) : (
                        contents.map((file) => (
                            <FileIcon
                                key={file.id}
                                file={file}
                                pos={file.binPos}
                                variant="folder"
                                selected={selectedId === file.id}
                                onSelect={() => setSelectedId(file.id)}
                                // Like Windows 95 (and Yute's version), a file
                                // in the bin can't be opened — restore it first.
                                onOpen={() => setSelectedId(file.id)}
                                onDropped={(dx, dy, screen) =>
                                    handleDropped(file, dx, dy, screen)
                                }
                            />
                        ))
                    )}
                </div>

                {/* Button Bar */}
                <div style={styles.buttonGroup}>
                    <button
                        style={Object.assign(
                            {},
                            styles.button,
                            !selected && styles.disabled
                        )}
                        onClick={handleRestore}
                        disabled={!selected}
                    >
                        Restore
                    </button>
                    <button
                        style={Object.assign(
                            {},
                            styles.button,
                            !selected && styles.disabled
                        )}
                        onClick={handlePermanentDelete}
                        disabled={!selected}
                    >
                        Delete
                    </button>
                    <button style={styles.button} onClick={onClose}>
                        Close
                    </button>
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
        gap: 4,
        padding: '4px 6px',
        background: Colors.lightGray,
        borderBottom: `1px solid ${Colors.darkGray}`,
        alignItems: 'center',
        flexShrink: 0,
    },
    toolbarButton: {
        padding: '4px 12px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        userSelect: 'none',
    },
    disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
    // The icons are absolutely positioned inside here, so this is `relative`
    // rather than a flex row — dropping is measured against this box.
    iconArea: {
        display: 'block',
        position: 'relative',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        background: Colors.white,
        borderLeft: `2px solid ${Colors.darkGray}`,
        borderTop: `2px solid ${Colors.darkGray}`,
        borderRight: `2px solid ${Colors.white}`,
        borderBottom: `2px solid ${Colors.white}`,
        margin: '4px 6px',
    },
    emptyState: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    emptyText: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
    },
    buttonGroup: {
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        justifyContent: 'flex-end',
        background: Colors.lightGray,
        borderTop: `1px solid ${Colors.darkGray}`,
        flexShrink: 0,
    },
    button: {
        padding: '4px 16px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
        cursor: 'pointer',
        minWidth: 60,
        textAlign: 'center',
    },
};

export default RecycleBin;
