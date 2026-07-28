import React from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import CurrencyConverter from '../os/CurrencyConverter';

/**
 * The EUR/DKK converter as a proper window — what My Computer > Hard Disk (D:)
 * > Utility launches. It's the same component the taskbar tray shows, just
 * rendered `embedded` so it fills a window instead of hanging above the clock.
 *
 * This is the slot that holds the Bitcoin ticker in Yute's Utility folder.
 */

export interface ConverterProps extends WindowAppProps {}

const Converter: React.FC<ConverterProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => (
    <Window
        top={120}
        left={200}
        width={300}
        height={330}
        windowTitle="EUR/DKK Converter"
        windowBarIcon="eurIcon"
        closeWindow={onClose}
        onInteract={onInteract}
        minimizeWindow={onMinimize}
        bottomLeftText="European Central Bank rates"
    >
        <div style={styles.container}>
            <CurrencyConverter open embedded />
        </div>
    </Window>
);

const styles: StyleSheetCSS = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minWidth: 0,
        height: '100%',
        background: Colors.lightGray,
    },
};

export default Converter;
