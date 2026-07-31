import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Colors from '../../constants/colors';
import {
    RangeKey,
    StockPoint,
    UP_COLOR,
    DOWN_COLOR,
    FLAT_COLOR,
    formatDate,
} from './stocks';

/**
 * The price chart in the Market Watch window.
 *
 * Hand-drawn SVG rather than a charting library, for two reasons. One is size:
 * Recharts and friends are hundreds of kilobytes to draw a single line. The
 * other is that none of them look like this — a 1px line on a white inset
 * panel, dotted grey gridlines, 9px MSSerif axis labels. A charting library
 * would have to be fought all the way to that, and it's about eighty lines of
 * SVG to just draw it.
 *
 * Hovering (or dragging a finger across) shows the crosshair and the reading
 * for that day, which is the one interaction a price chart really owes you.
 */

const PADDING = { top: 8, right: 10, bottom: 16, left: 46 };

/** Measures the box the chart has been given, so the SVG can fill it exactly. */
function useBoxSize(ref: React.RefObject<HTMLElement>) {
    const [size, setSize] = useState({ width: 0, height: 0 });
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        const measure = () =>
            setSize({
                width: element.clientWidth,
                height: element.clientHeight,
            });
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);
    return size;
}

/** A round-ish number near `rough`, so gridlines land on readable prices. */
function niceStep(rough: number): number {
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const normalised = rough / magnitude;
    const step = normalised >= 5 ? 5 : normalised >= 2 ? 2 : 1;
    return step * magnitude;
}

const axisLabel = (value: number): string => {
    if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString('en-US');
    if (Math.abs(value) >= 10) return value.toFixed(0);
    return value.toFixed(2);
};

/**
 * A year of daily prices starts and ends in the same month, so "30 Jul" at
 * both ends of the axis says nothing. Anything spanning a year or more gets
 * the year instead.
 */
const shortDate = (ms: number, range: RangeKey): string => {
    const d = new Date(ms);
    if (range === '5y' || range === 'max') return String(d.getFullYear());
    if (range === '1y') {
        return `${d.toLocaleDateString('en-GB', {
            month: 'short',
        })} '${String(d.getFullYear()).slice(2)}`;
    }
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export interface StockChartProps {
    points: StockPoint[];
    range: RangeKey;
    currency: string;
}

const StockChart: React.FC<StockChartProps> = ({ points, range, currency }) => {
    const boxRef = useRef<HTMLDivElement>(null);
    const { width, height } = useBoxSize(boxRef);
    const [hover, setHover] = useState<number | null>(null);

    const plotWidth = Math.max(0, width - PADDING.left - PADDING.right);
    const plotHeight = Math.max(0, height - PADDING.top - PADDING.bottom);

    const scale = useMemo(() => {
        if (points.length < 2 || plotWidth <= 0 || plotHeight <= 0) return null;

        const values = points.map((p) => p.c);
        const min = Math.min(...values);
        const max = Math.max(...values);
        // A stock that barely moved still deserves a chart with room in it.
        const pad = (max - min || max * 0.02 || 1) * 0.08;
        const lo = Math.max(0, min - pad);
        const hi = max + pad;

        const step = niceStep((hi - lo) / 4);
        const ticks: number[] = [];
        for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);

        return {
            lo,
            hi,
            ticks,
            x: (i: number) =>
                PADDING.left + (i / (points.length - 1)) * plotWidth,
            y: (value: number) =>
                PADDING.top + (1 - (value - lo) / (hi - lo)) * plotHeight,
        };
    }, [points, plotWidth, plotHeight]);

    const rising =
        points.length > 1 && points[points.length - 1].c >= points[0].c;
    const lineColor = points.length > 1 ? (rising ? UP_COLOR : DOWN_COLOR) : FLAT_COLOR;

    const path = useMemo(() => {
        if (!scale) return { line: '', area: '' };
        const line = points
            .map(
                (p, i) =>
                    `${i === 0 ? 'M' : 'L'}${scale.x(i).toFixed(1)},${scale
                        .y(p.c)
                        .toFixed(1)}`
            )
            .join(' ');
        const base = (PADDING.top + plotHeight).toFixed(1);
        return {
            line,
            area: `${line} L${scale.x(points.length - 1).toFixed(1)},${base} L${scale
                .x(0)
                .toFixed(1)},${base} Z`,
        };
    }, [points, scale, plotHeight]);

    /** Which candle the pointer is over, in data-index terms. */
    const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!scale) return;
        const rect = e.currentTarget.getBoundingClientRect();
        // The desktop can be scaled by the resolution setting, so go via the
        // rendered width rather than assuming CSS pixels are SVG pixels.
        const local =
            ((e.clientX - rect.left) / rect.width) * width - PADDING.left;
        const index = Math.round((local / plotWidth) * (points.length - 1));
        setHover(Math.min(points.length - 1, Math.max(0, index)));
    };

    const hovered = hover !== null ? points[hover] : null;

    return (
        <div style={styles.frame} ref={boxRef}>
            {points.length < 2 ? (
                <div style={styles.empty}>No price history to draw.</div>
            ) : (
                width > 0 &&
                scale && (
                    <svg
                        width={width}
                        height={height}
                        style={styles.svg}
                        onPointerMove={onPointerMove}
                        onPointerLeave={() => setHover(null)}
                    >
                        {/* Price gridlines, dotted like every chart in a 1995
                            spreadsheet, labelled down the left gutter. */}
                        {scale.ticks.map((value) => (
                            <g key={value}>
                                <line
                                    x1={PADDING.left}
                                    x2={PADDING.left + plotWidth}
                                    y1={scale.y(value)}
                                    y2={scale.y(value)}
                                    stroke={Colors.darkGray}
                                    strokeWidth={1}
                                    strokeDasharray="1 2"
                                />
                                <text
                                    x={PADDING.left - 5}
                                    y={scale.y(value) + 3}
                                    textAnchor="end"
                                    style={styles.tickText}
                                >
                                    {axisLabel(value)}
                                </text>
                            </g>
                        ))}

                        {/* Dates along the bottom: first, middle, last. Any more
                            than that and 9px labels start colliding. */}
                        {[0, Math.floor((points.length - 1) / 2), points.length - 1].map(
                            (index, n) => (
                                <text
                                    key={index}
                                    x={scale.x(index)}
                                    y={height - 4}
                                    textAnchor={
                                        n === 0 ? 'start' : n === 1 ? 'middle' : 'end'
                                    }
                                    style={styles.tickText}
                                >
                                    {shortDate(points[index].t, range)}
                                </text>
                            )
                        )}

                        <path d={path.area} fill={lineColor} fillOpacity={0.12} />
                        <path
                            d={path.line}
                            fill="none"
                            stroke={lineColor}
                            strokeWidth={1.25}
                            strokeLinejoin="round"
                        />

                        {hovered && (
                            <g>
                                <line
                                    x1={scale.x(hover!)}
                                    x2={scale.x(hover!)}
                                    y1={PADDING.top}
                                    y2={PADDING.top + plotHeight}
                                    stroke={Colors.black}
                                    strokeWidth={1}
                                    strokeDasharray="2 2"
                                />
                                <rect
                                    x={scale.x(hover!) - 2.5}
                                    y={scale.y(hovered.c) - 2.5}
                                    width={5}
                                    height={5}
                                    fill={Colors.white}
                                    stroke={Colors.black}
                                />
                            </g>
                        )}
                    </svg>
                )
            )}

            {/* The reading, in the corner rather than following the pointer —
                a floating tooltip is a much later idea than this desktop. */}
            {hovered && (
                <div style={styles.readout}>
                    {formatDate(hovered.t)} &nbsp;
                    <b>
                        {hovered.c.toFixed(2)} {currency}
                    </b>
                </div>
            )}
        </div>
    );
};

const styles: StyleSheetCSS = {
    frame: {
        position: 'relative',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        overflow: 'hidden',
    },
    svg: {
        display: 'block',
        touchAction: 'none',
    },
    tickText: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        fill: Colors.darkGray,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
    },
    readout: {
        position: 'absolute',
        top: 3,
        right: 4,
        padding: '1px 5px',
        background: Colors.lightGray,
        border: `1px solid ${Colors.black}`,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
    },
};

export default StockChart;
