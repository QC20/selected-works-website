import React, { useState, useEffect } from 'react';
import Colors from '../../constants/colors';

export interface RecycledFile {
    id: string;
    name: string;
    type: string;
    deletedAt: Date;
    originalLocation?: string;
}

export interface RecycleBinProps {
    onInteract?: () => void;
    onClose?: () => void;
    onMinimize?: () => void;
}

const RecycleBin: React.FC<RecycleBinProps> = ({ onInteract, onClose, onMinimize }) => {
    const [deletedFiles, setDeletedFiles] = useState<RecycledFile[]>(() => {
        const stored = localStorage.getItem('recycledFiles');
        return stored ? JSON.parse(stored) : [];
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

        // Trigger a custom event that parent components can listen to
        const event = new CustomEvent('restoreFile', {
            detail: fileToRestore,
        });
        window.dispatchEvent(event);

        // Remove from recycle bin
        setDeletedFiles((prev) => prev.filter((f) => f.id !== selectedFile));
        setSelectedFile(null);
    };

    const handlePermanentDelete = () => {
        if (!selectedFile) return;
        setDeletedFiles((prev) => prev.filter((f) => f.id !== selectedFile));
        setSelectedFile(null);
    };

    const handleEmptyBin = () => {
        if (window.confirm('Are you sure you want to permanently delete all files in the Recycle Bin?')) {
            setDeletedFiles([]);
            setSelectedFile(null);
        }
    };

    const styles: StyleSheetCSS = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 12,
        },
        toolbar: {
            display: 'flex',
            gap: 4,
            padding: 8,
            background: Colors.lightGray,
            borderBottom: `1px solid ${Colors.darkGray}`,
            alignItems: 'center',
        },
        toolbarButton: {
            padding: '4px 8px',
            border: `1px solid ${Colors.white}`,
            borderRightColor: Colors.darkGray,
            borderBottomColor: Colors.darkGray,
            background: Colors.lightGray,
            fontFamily: 'MSSerif',
            fontSize: 10,
            cursor: 'pointer',
        },
        listContainer: {
            flex: 1,
            overflow: 'auto',
            background: Colors.white,
            border: `1px solid ${Colors.darkGray}`,
            margin: 8,
        },
        fileItem: {
            padding: '6px 8px',
            borderBottom: `1px solid ${Colors.lightGray}`,
            cursor: 'pointer',
            userSelect: 'none' as const,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        },
        selectedItem: {
            background: '#000080',
            color: Colors.white,
        },
        fileIcon: {
            fontSize: 16,
        },
        fileInfo: {
            flex: 1,
            minWidth: 0,
        },
        fileName: {
            fontWeight: 'bold',
            fontSize: 11,
        },
        fileDetails: {
            fontSize: 9,
            opacity: 0.7,
            whiteSpace: 'nowrap' as const,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        },
        emptyState: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: Colors.darkGray,
            textAlign: 'center' as const,
            padding: 16,
        },
        buttonGroup: {
            display: 'flex',
            gap: 8,
            padding: 12,
            justifyContent: 'flex-end',
            background: Colors.lightGray,
            borderTop: `1px solid ${Colors.darkGray}`,
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
            minWidth: 80,
        },
        disabledButton: {
            opacity: 0.5,
            cursor: 'not-allowed',
        },
    };

    const formatDate = (date: string | Date) => {
        const d = new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    };

    return (
        <div style={styles.container}>
            <div style={styles.toolbar}>
                <button
                    style={styles.toolbarButton}
                    onClick={handleRestore}
                    disabled={!selectedFile}
                    title="Restore the selected file"
                >
                    Restore
                </button>
                <button
                    style={styles.toolbarButton}
                    onClick={handlePermanentDelete}
                    disabled={!selectedFile}
                    title="Permanently delete the selected file"
                >
                    Delete
                </button>
                <button
                    style={styles.toolbarButton}
                    onClick={handleEmptyBin}
                    disabled={deletedFiles.length === 0}
                    title="Empty Recycle Bin"
                >
                    Empty Bin
                </button>
            </div>

            <div style={styles.listContainer}>
                {deletedFiles.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div>
                            <div style={{ fontSize: 24, marginBottom: 8 }}>🗑️</div>
                            <p>Recycle Bin is empty</p>
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
                            <div style={styles.fileIcon}>
                                {file.type === 'folder' ? '📁' : '📄'}
                            </div>
                            <div style={styles.fileInfo}>
                                <div style={styles.fileName}>{file.name}</div>
                                <div style={styles.fileDetails}>
                                    Deleted: {formatDate(file.deletedAt)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div style={styles.buttonGroup}>
                <button
                    style={{
                        ...styles.button,
                        ...(selectedFile ? {} : styles.disabledButton),
                    }}
                    onClick={handleRestore}
                    disabled={!selectedFile}
                >
                    Restore
                </button>
                <button
                    style={{
                        ...styles.button,
                        ...(selectedFile ? {} : styles.disabledButton),
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
    );
};

export default RecycleBin;
