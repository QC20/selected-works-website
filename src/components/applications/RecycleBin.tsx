import React, { useState, useEffect } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';

export interface RecycledFile {
    id: string;
    name: string;
    type: 'file' | 'folder' | 'image';
    size: string;
    deletedAt: Date;
    originalLocation?: string;
    imagePath?: string;
}

export interface RecycleBinProps extends WindowAppProps {}

const RecycleBin: React.FC<RecycleBinProps> = ({ onInteract, onClose, onMinimize }) => {
    // Initialize with default image file
    const [deletedFiles, setDeletedFiles] = useState<RecycledFile[]>(() => {
        const stored = localStorage.getItem('recycledFiles');
        if (stored) {
            return JSON.parse(stored);
        }
        // Initialize with your profile image on first load
        return [
            {
                id: 'default-image-' + Date.now(),
                name: 'old picture of me.jpg',
                type: 'image',
                size: '245 KB',
                deletedAt: new Date(),
                originalLocation: 'Desktop',
                imagePath: '/old-picture-of-me.jpg',
            },
        ];
    });

    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    // Save to localStorage whenever deletedFiles changes
    useEffect(() => {
        localStorage.setItem('recycledFiles', JSON.stringify(deletedFiles));
    }, [deletedFiles]);

    const handleRestore = () => {
        if (!selectedFile) return;
        const fileToRestore = deletedFiles.find((f) => f.id === selectedFile);
        if (!fileToRestore) return;

        // Trigger custom event for parent to handle
        const event = new CustomEvent('restoreFile', { detail: fileToRestore });
        window.dispatchEvent(event);

        setDeletedFiles((prev) => prev.filter((f) => f.id !== selectedFile));
        setSelectedFile(null);
    };

    const handlePermanentDelete = () => {
        if (!selectedFile) return;
        setDeletedFiles((prev) => prev.filter((f) => f.id !== selectedFile));
        setSelectedFile(null);
    };

    const handleEmptyBin = () => {
        if (window.confirm('Are you sure you want to permanently delete all items in the Recycle Bin?')) {
            setDeletedFiles([]);
            setSelectedFile(null);
        }
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'folder':
                return '📁';
            case 'image':
                return '🖼️';
            default:
                return '📄';
        }
    };

    const styles: StyleSheetCSS = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            // Fill the Window's content box (which is itself a flex row).
            flex: 1,
            minWidth: 0,
            height: '100%',
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 11,
        },
        menuBar: {
            display: 'flex',
            gap: 16,
            padding: '4px 6px',
            background: Colors.lightGray,
            borderBottom: `1px solid ${Colors.darkGray}`,
            fontSize: 11,
        },
        menuItem: {
            cursor: 'default',
            userSelect: 'none' as const,
        },
        toolbar: {
            display: 'flex',
            gap: 4,
            padding: '4px 6px',
            background: Colors.lightGray,
            borderBottom: `1px solid ${Colors.darkGray}`,
            alignItems: 'center',
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
            userSelect: 'none' as const,
        },
        toolbarButtonDisabled: {
            opacity: 0.5,
            cursor: 'not-allowed',
        },
        fileListContainer: {
            // App.css sets `div { display: flex }` globally, so without an explicit
            // `column` the deleted files would line up side by side.
            display: 'flex',
            flexDirection: 'column',
            alignContent: 'flex-start',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: Colors.white,
            borderLeft: `2px solid ${Colors.white}`,
            borderTop: `2px solid ${Colors.white}`,
            borderRight: `2px solid ${Colors.darkGray}`,
            borderBottom: `2px solid ${Colors.darkGray}`,
            margin: '4px 6px',
        },
        fileItem: {
            padding: '4px 8px',
            borderBottom: `1px solid ${Colors.lightGray}`,
            cursor: 'pointer',
            userSelect: 'none' as const,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            gap: 8,
            fontSize: 11,
        },
        selectedItem: {
            background: '#000080',
            color: Colors.white,
        },
        fileIcon: {
            fontSize: 16,
            width: 20,
            textAlign: 'center' as const,
        },
        fileInfo: {
            flex: 1,
            minWidth: 0,
            display: 'flex',
            gap: 12,
        },
        fileName: {
            fontSize: 11,
            minWidth: 150,
        },
        fileSize: {
            fontSize: 11,
            minWidth: 80,
            textAlign: 'right' as const,
        },
        emptyState: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: Colors.darkGray,
            textAlign: 'center' as const,
            padding: 16,
            fontSize: 11,
        },
        buttonGroup: {
            display: 'flex',
            gap: 8,
            padding: '8px 12px',
            justifyContent: 'flex-end',
            background: Colors.lightGray,
            borderTop: `1px solid ${Colors.darkGray}`,
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
            textAlign: 'center' as const,
        },
    };

    const totalSize = deletedFiles.reduce((sum, f) => {
        const size = parseInt(f.size);
        return sum + (isNaN(size) ? 0 : size);
    }, 0);

    return (
        <Window
            top={112}
            left={224}
            width={520}
            height={380}
            windowTitle="Recycle Bin"
            windowBarIcon="recycleBinIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={`${deletedFiles.length} object(s)${
                deletedFiles.length > 0 ? `   ${totalSize} KB` : ''
            }`}
        >
        <div style={styles.container}>
            {/* Menu Bar */}
            <div style={styles.menuBar}>
                <span style={styles.menuItem}>
                    File<u style={{ marginLeft: '-2px' }}>_</u>
                </span>
                <span style={styles.menuItem}>
                    Edit<u style={{ marginLeft: '-2px' }}>_</u>
                </span>
                <span style={styles.menuItem}>
                    View<u style={{ marginLeft: '-2px' }}>_</u>
                </span>
                <span style={styles.menuItem}>
                    Help<u style={{ marginLeft: '-2px' }}>_</u>
                </span>
            </div>

            {/* Toolbar */}
            <div style={styles.toolbar}>
                <button
                    style={{
                        ...styles.toolbarButton,
                        ...(selectedFile ? {} : styles.toolbarButtonDisabled),
                    }}
                    onClick={handleRestore}
                    disabled={!selectedFile}
                >
                    Restore
                </button>
                <button
                    style={{
                        ...styles.toolbarButton,
                        ...(selectedFile ? {} : styles.toolbarButtonDisabled),
                    }}
                    onClick={handlePermanentDelete}
                    disabled={!selectedFile}
                >
                    Delete
                </button>
                <button
                    style={{
                        ...styles.toolbarButton,
                        ...(deletedFiles.length === 0 ? styles.toolbarButtonDisabled : {}),
                    }}
                    onClick={handleEmptyBin}
                    disabled={deletedFiles.length === 0}
                >
                    Empty Bin
                </button>
            </div>

            {/* File List */}
            <div style={styles.fileListContainer}>
                {deletedFiles.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div
                            style={{
                                flexDirection: 'column',
                                alignItems: 'center',
                            }}
                        >
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🗑️</div>
                            <p style={{ fontFamily: 'MSSerif', fontSize: 11 }}>
                                Recycle Bin is empty
                            </p>
                        </div>
                    </div>
                ) : (
                    deletedFiles.map((file) => (
                        <div
                            key={file.id}
                            style={{
                                ...styles.fileItem,
                                ...(selectedFile === file.id ? styles.selectedItem : {}),
                            }}
                            onClick={() => setSelectedFile(file.id)}
                            onDoubleClick={handleRestore}
                        >
                            <div style={styles.fileIcon}>{getFileIcon(file.type)}</div>
                            <div style={styles.fileInfo}>
                                <div style={styles.fileName}>{file.name}</div>
                                <div style={styles.fileSize}>{file.size}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Object count / size live in the Window's bottom bar (bottomLeftText). */}

            {/* Button Bar */}
            <div style={styles.buttonGroup}>
                <button
                    style={{
                        ...styles.button,
                        ...(selectedFile ? {} : { opacity: 0.5, cursor: 'not-allowed' }),
                    }}
                    onClick={handleRestore}
                    disabled={!selectedFile}
                >
                    Restore
                </button>
                <button
                    style={{
                        ...styles.button,
                        ...(selectedFile ? {} : { opacity: 0.5, cursor: 'not-allowed' }),
                    }}
                    onClick={handlePermanentDelete}
                    disabled={!selectedFile}
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

export default RecycleBin;
