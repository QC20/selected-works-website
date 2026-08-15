import React from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { batteryPercent, batteryRemaining, useBattery } from '../os/battery';

/**
 * Power Meter — My Computer > Hard Disk (D:) > Utility.
 *
 * The full-window version of the tray's battery gauge, reading the real
 * `navigator.getBattery()` of the machine you're sitting at — the same trick
 * System Properties plays with the processor count. Chromium-only (Firefox
 * removed the API, Safari never shipped it), so on anything else this says so
 * plainly rather than showing a battery that never moves.
 */

export interface PowerMeterProps extends WindowAppProps {}

const PowerMeter: React.FC<PowerMeterProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const state = useBattery();
    const percent = batteryPercent(state);
    const remaining = batteryRemaining(state);
    const colour =
        percent <= 10 ? '#d80000' : percent <= 25 ? '#e8c000' : '#00a800';

    return (
        <Window
            top={100}
            left={190}
            width={320}
            height={280}
            windowTitle="Power Meter"
            windowBarIcon={state.charging ? 'acPowerIcon' : 'batteryIcon'}
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText={state.supported ? `${percent}%` : 'No battery detected'}
        >
            <div style={styles.container}>
                {!state.supported ? (
                    <div style={styles.centered}>
                        <p style={styles.text}>
                            No battery detected. This browser doesn't report one
                            — either the machine has none, or Power Meter's
                            reading isn't supported here.
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={styles.gaugeWrap}>
                            <div style={styles.gaugeBody}>
                                <div
                                    style={Object.assign({}, styles.gaugeFill, {
                                        height: `${Math.max(4, percent)}%`,
                                        background: state.charging
                                            ? '#00c800'
                                            : colour,
                                    })}
                                />
                            </div>
                            <div style={styles.gaugeCap} />
                        </div>

                        <div style={styles.readout}>
                            <span style={styles.percent}>{percent}%</span>
                            <p style={styles.detail}>
                                {state.charging
                                    ? percent >= 100
                                        ? 'Fully charged.'
                                        : 'Charging.'
                                    : remaining || 'Running on battery power.'}
                            </p>
                        </div>

                        <p style={styles.note}>
                            Read from the machine you are actually sitting at,
                            like the figures in System Properties — it will
                            climb or fall with your real charge.
                        </p>
                    </>
                )}
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
        boxSizing: 'border-box',
        gap: 14,
        padding: 16,
        alignItems: 'center',
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
    },
    centered: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
    text: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        textAlign: 'center',
        lineHeight: 1.6,
    },
    gaugeWrap: {
        alignItems: 'center',
        gap: 4,
        marginTop: 10,
    },
    gaugeBody: {
        position: 'relative',
        width: 60,
        height: 100,
        padding: 3,
        alignItems: 'flex-end',
        background: Colors.white,
        border: `2px solid ${Colors.black}`,
        boxSizing: 'border-box',
    },
    gaugeFill: {
        width: '100%',
    },
    gaugeCap: {
        width: 24,
        height: 6,
        marginTop: -1,
        background: Colors.black,
    },
    readout: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
    },
    percent: {
        fontFamily: 'MSSerif',
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.black,
    },
    detail: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        textAlign: 'center',
    },
    note: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
        textAlign: 'center',
        lineHeight: 1.5,
        maxWidth: 260,
    },
};

export default PowerMeter;
