import React from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';

export interface PictureViewerProps extends WindowAppProps {
    fileName: string;
    image: string;
    size: number;
}

/**
 * Opens when a picture on the desktop is double-clicked. Deliberately plain —
 * a title bar, the image, and a status line — like the Windows 95 image preview.
 */
const PictureViewer: React.FC<PictureViewerProps> = ({
    fileName,
    image,
    size,
    onInteract,
    onClose,
    onMinimize,
}) => (
    <Window
        top={72}
        left={200}
        width={520}
        height={440}
        windowTitle={fileName}
        windowBarIcon="jpegIcon"
        closeWindow={onClose}
        onInteract={onInteract}
        minimizeWindow={onMinimize}
        bottomLeftText={`${fileName}   ${size} KB`}
    >
        <div style={styles.container}>
            <img src={image} alt={fileName} style={styles.image} />
        </div>
    </Window>
);

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flex: 1,
        minWidth: 0,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: Colors.black,
        overflow: 'hidden',
    },
    image: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
    },
};

export default PictureViewer;
