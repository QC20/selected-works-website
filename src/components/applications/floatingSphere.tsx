import React from 'react';
import DesktopShortcut from '../os/DesktopShortcut';
import Window from '../os/Window';

export interface floatingSphereProps extends WindowAppProps {}

const floatingSphere: React.FC<floatingSphereProps> = (props) => {
    return (
        <Window
            top={20}
            left={20}
            width={600}
            height={400}
            windowBarIcon="computerSmall"
            windowTitle="Internet Explorer"
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
        >
            <div className="site-page">
                <iframe
                    src="https://qc20.github.io/Attractor/"
                    title="Interactive Attractor"
                    width="100%"
                    height="100%"
                />
                <div style={{ position: 'absolute', bottom: '20px', right: '20px' }}>
                    <DesktopShortcut
                        icon="computerBig"
                        invertText
                        shortcutName={'Computer Details'}
                        onOpen={() => {}}
                    />
                </div>
            </div>
        </Window>
    );
};



export default floatingSphere;
