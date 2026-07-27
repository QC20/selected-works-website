import React, { useState, useEffect } from 'react';
import Colors from '../../constants/colors';

export interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    isDesktop?: boolean;
    isIcon?: boolean;
    isRecycleBin?: boolean;
    onOpen?: () => void;
    onDelete?: () => void;
    onRestore?: () => void;
    onRefresh?: () => void;
    onNewFolder?: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
    x,
    y,
    onClose,
    isDesktop = false,
    isIcon = false,
    isRecycleBin = false,
    onOpen,
    onDelete,
    onRestore,
    onRefresh,
    onNewFolder,
}) => {
    const [position, setPosition] = useState({ x, y });

    useEffect(() => {
        const handleClickOutside = () => onClose();
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [onClose]);

    // Adjust position if menu would go off-screen
    useEffect(() => {
        const menuWidth = 150;
        const menuHeight = isRecycleBin ? 120 : isIcon ? 180 : 200;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let adjustedX = x;
        let adjustedY = y;

        if (x + menuWidth > screenWidth) {
            adjustedX = screenWidth - menuWidth - 10;
        }
        if (y + menuHeight > screenHeight - 32) {
            adjustedY = screenHeight - menuHeight - 42;
        }

        setPosition({ x: adjustedX, y: adjustedY });
    }, [x, y, isRecycleBin, isIcon]);

    const styles: StyleSheetCSS = {
        container: {
            position: 'fixed' as const,
            top: position.y,
            left: position.x,
            background: Colors.lightGray,
            border: `1px solid ${Colors.white}`,
            borderBottomColor: Colors.darkGray,
            borderRightColor: Colors.darkGray,
            boxShadow: '1px 1px 0 rgba(0,0,0,0.5)',
            zIndex: 10000,
            fontFamily: 'MSSerif',
            fontSize: 11,
            minWidth: 140,
        },
        menuItem: {
            padding: '6px 8px',
            cursor: 'pointer',
            userSelect: 'none' as const,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${Colors.lightGray}`,
        },
        menuItemDisabled: {
            color: Colors.darkGray,
            cursor: 'default',
            opacity: 0.6,
        },
        menuItemHover: {
            background: '#000080',
            color: Colors.white,
        },
        separator: {
            height: 1,
            background: Colors.white,
            borderTop: `1px solid ${Colors.darkGray}`,
            margin: '2px 0',
        },
        submenuArrow: {
            marginLeft: 8,
            fontSize: 10,
        },
    };

    const MenuItem: React.FC<{
        label: string;
        onClick?: () => void;
        disabled?: boolean;
        submenu?: boolean;
    }> = ({ label, onClick, disabled = false, submenu = false }) => {
        const [hovered, setHovered] = useState(false);

        return (
            <div
                style={{
                    ...styles.menuItem,
                    ...(disabled ? styles.menuItemDisabled : {}),
                    ...(hovered && !disabled ? styles.menuItemHover : {}),
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={() => {
                    if (!disabled && onClick) {
                        onClick();
                        onClose();
                    }
                }}
            >
                <span>{label}</span>
                {submenu && <span style={styles.submenuArrow}>▶</span>}
            </div>
        );
    };

    return (
        <div style={styles.container} onClick={(e) => e.stopPropagation()}>
            {isRecycleBin && (
                <>
                    <MenuItem label="Restore" onClick={onRestore} disabled={!onRestore} />
                    <div style={styles.separator} />
                    <MenuItem label="Cut" disabled={true} />
                    <div style={styles.separator} />
                    <MenuItem label="Delete" onClick={onDelete} disabled={!onDelete} />
                    <div style={styles.separator} />
                    <MenuItem label="Properties" disabled={true} />
                </>
            )}

            {isIcon && !isRecycleBin && (
                <>
                    <MenuItem label="Open" onClick={onOpen} />
                    <MenuItem label="Edit" disabled={true} />
                    <div style={styles.separator} />
                    <MenuItem label="Send To" submenu={true} disabled={true} />
                    <div style={styles.separator} />
                    <MenuItem label="Cut" disabled={true} />
                    <MenuItem label="Copy" disabled={true} />
                    <div style={styles.separator} />
                    <MenuItem label="Delete" onClick={onDelete} />
                    <MenuItem label="Rename" disabled={true} />
                    <div style={styles.separator} />
                    <MenuItem label="Properties" disabled={true} />
                </>
            )}

            {isDesktop && !isIcon && (
                <>
                    <MenuItem label="Arrange by" submenu={true} disabled={true} />
                    <MenuItem label="Task Manager" disabled={true} />
                    <div style={styles.separator} />
                    <MenuItem label="Paste" disabled={true} />
                    <MenuItem label="Paste Shortcut" disabled={true} />
                    <MenuItem label="Refresh" onClick={onRefresh} />
                    <div style={styles.separator} />
                    <MenuItem label="New Folder" onClick={onNewFolder} />
                    <div style={styles.separator} />
                    <MenuItem label="Properties" disabled={true} />
                </>
            )}
        </div>
    );
};

export default ContextMenu;
