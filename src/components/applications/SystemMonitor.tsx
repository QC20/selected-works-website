import React, { useRef, useEffect } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import {
    fpsHistory,
    memoryHistory,
    useResourceSnapshot,
} from '../os/resourceMeter';

/**
 * System Monitor — Control Panel / Utility, and the window behind the tray's
 * Resource Meter.
 *
 * The real Windows 95 accessory plotted whichever counters you picked —
 * Kernel Processor Usage by default — as a line graph, bar graph or plain
 * number, live. This keeps that spirit with two lines it can actually back
 * with real numbers for a page running in a browser tab: JS heap headroom
 * (or DOM size, on a browser that won't say) and measured frame rate. See
 * `resourceMeter.ts` for where both numbers come from and why there is no
 * pretending about which one is real.
 */

/** A small live line graph, drawn on canvas rather than as an SVG path so a
 *  60-sample history redraws cheaply every second without diffing a DOM. */
const LineGraph: React.FC<{
    history: number[];
    max: number;
    color: string;
    label: string;
}> = ({ history, max, color, label }) => {
    const ref = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = ref.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        // Gridlines, the way the real graph window had a faint grid behind
        // the trace.
        ctx.strokeStyle = 'rgba(0, 150, 0, 0.25)';
        ctx.lineWidth = 1;
        for (let gx = 0; gx <= w; gx += w / 6) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, h);
            ctx.stroke();
        }
        for (let gy = 0; gy <= h; gy += h / 4) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
        }

        if (history.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        history.forEach((v, i) => {
            const x = (i / (history.length - 1)) * w;
            const y = h - Math.min(1, v / max) * h;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }, [history, max, color]);

    return (
        <div style={styles.graphBlock}>
            <span style={styles.graphLabel}>{label}</span>
            <canvas
                ref={ref}
                width={300}
                height={70}
                style={styles.canvas}
            />
        </div>
    );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div style={styles.row}>
        <span style={styles.rowLabel}>{label}</span>
        <span style={styles.rowValue}>{value}</span>
    </div>
);

export interface SystemMonitorProps extends WindowAppProps {}

const SystemMonitor: React.FC<SystemMonitorProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const s = useResourceSnapshot();
    // Re-render on a tick so the two canvases redraw as history grows, even
    // between the resource sampler's own once-a-second pushes (fps updates
    // on its own rAF-driven cadence).
    const [, force] = React.useReducer((n) => n + 1, 0);
    useEffect(() => {
        const id = window.setInterval(force, 500);
        return () => window.clearInterval(id);
    }, []);

    const mins = Math.floor(s.uptimeSeconds / 60);
    const secs = s.uptimeSeconds % 60;

    return (
        <Window
            top={80}
            left={180}
            width={360}
            height={460}
            windowTitle="System Monitor"
            windowBarIcon="resourceMeterIcon"
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText="Kernel: this tab"
        >
            <div style={styles.root}>
                <LineGraph
                    history={memoryHistory}
                    max={100}
                    color="#39ff6a"
                    label={
                        s.hasMemoryApi
                            ? 'JS heap free (%)'
                            : 'Headroom proxy — DOM size (%)'
                    }
                />
                <LineGraph
                    history={fpsHistory}
                    max={60}
                    color="#6ab8ff"
                    label="Frame rate (fps)"
                />

                <fieldset style={styles.group}>
                    <legend style={styles.legend}>Right now</legend>
                    <Row label="Resources free" value={`${s.memoryFreePercent}%`} />
                    <Row
                        label={s.hasMemoryApi ? 'Heap used' : 'DOM nodes'}
                        value={
                            s.hasMemoryApi
                                ? `${s.usedHeapMB!.toFixed(1)} / ${s.limitHeapMB!.toFixed(
                                      0
                                  )} MB`
                                : String(s.domNodeCount)
                        }
                    />
                    <Row label="Frame rate" value={`${s.fps} fps`} />
                    <Row label="Windows open" value={String(s.openWindows)} />
                    <Row
                        label="Session uptime"
                        value={`${mins}:${String(secs).padStart(2, '0')}`}
                    />
                </fieldset>

                <p style={styles.note}>
                    {s.hasMemoryApi
                        ? "Chrome exposes real JS heap usage; this is that number, not a simulation."
                        : "This browser doesn't expose heap usage, so DOM node count stands in as an honest proxy — never shown as memory itself."}
                </p>
            </div>
        </Window>
    );
};

const styles: StyleSheetCSS = {
    root: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'column',
        boxSizing: 'border-box',
        background: Colors.lightGray,
        padding: 10,
        gap: 10,
        overflowY: 'auto',
    },
    graphBlock: { flexDirection: 'column', gap: 3 },
    graphLabel: { fontFamily: 'MSSerif', fontSize: 10, color: '#333' },
    canvas: {
        width: '100%',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        imageRendering: 'pixelated',
    },
    group: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        margin: 0,
        padding: '4px 10px 10px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    legend: { fontFamily: 'MSSerif', fontSize: 11, color: Colors.black },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 10,
    },
    rowLabel: { fontFamily: 'MSSerif', fontSize: 11, color: Colors.black },
    rowValue: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    note: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        lineHeight: 1.45,
        color: '#444',
        margin: 0,
    },
};

export default SystemMonitor;
