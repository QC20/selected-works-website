import React, { useState } from 'react';
import DosPlayer from '../dos/DosPlayer';
import Window from '../os/Window';

export interface MicropolisAppProps extends WindowAppProps {}

const MicropolisApp: React.FC<MicropolisAppProps> = (props) => {
    const [width, setWidth] = useState(920);
    const [height, setHeight] = useState(620);

    return (
        <Window
            top={10}
            left={10}
            width={width}
            height={height}
            windowTitle="Micropolis"
            windowBarColor="#1C1C1C"
            windowBarIcon="windowGameIcon"
            bottomLeftText={'Powered by JSDOS & DOSBox'}
            closeWindow={props.onClose}
            onInteract={props.onInteract}
            minimizeWindow={props.onMinimize}
            onWidthChange={setWidth}
            onHeightChange={setHeight}
        >
            <DosPlayer width={width} height={height} bundleUrl="micropolis.jsdos" />
        </Window>
    );
};

export default MicropolisApp;
