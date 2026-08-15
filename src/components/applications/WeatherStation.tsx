import React, { useCallback, useEffect, useState } from 'react';
import Window from '../os/Window';
import Colors from '../../constants/colors';
import { Icon } from '../general';
import {
    CITIES,
    City,
    Unit,
    Weather,
    WeatherError,
    dayLabel,
    describe,
    fetchWeather,
    formatTemp,
    loadCity,
    loadUnit,
    saveCity,
    saveUnit,
    weatherIcon,
} from '../os/weather';

/**
 * Weather Station — My Computer > Hard Disk (D:) > Utility.
 *
 * The full-window version of the tray's weather applet, built on the exact
 * same reading (`weather.ts`, Open-Meteo — no key, no location prompt). The
 * tray keeps the compact 186px popup; this is the same data laid out with
 * room to breathe, for anyone who'd rather open it as its own window.
 */

export interface WeatherStationProps extends WindowAppProps {}

const WeatherStation: React.FC<WeatherStationProps> = ({
    onInteract,
    onClose,
    onMinimize,
}) => {
    const [city, setCity] = useState<City>(loadCity);
    const [unit, setUnit] = useState<Unit>(loadUnit);
    const [weather, setWeather] = useState<Weather | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async (target: City, force = false) => {
        setLoading(true);
        setError(null);
        try {
            setWeather(await fetchWeather(target, { force }));
        } catch (e) {
            setWeather(null);
            setError(
                e instanceof WeatherError
                    ? e.message
                    : 'Could not reach the weather service.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load(city);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [city]);

    const chooseCity = (id: string) => {
        const next = CITIES.find((c) => c.id === id);
        if (!next) return;
        saveCity(next);
        setCity(next);
    };

    const toggleUnit = () => {
        const next: Unit = unit === 'C' ? 'F' : 'C';
        saveUnit(next);
        setUnit(next);
    };

    return (
        <Window
            top={80}
            left={150}
            width={340}
            height={420}
            windowTitle="Weather Station"
            windowBarIcon={weather ? weatherIcon(weather.code) : 'weatherSunIcon'}
            closeWindow={onClose}
            onInteract={onInteract}
            minimizeWindow={onMinimize}
            bottomLeftText="Open-Meteo"
        >
            <div style={styles.container}>
                <select
                    style={styles.select}
                    value={city.id}
                    onChange={(e) => chooseCity(e.target.value)}
                    aria-label="City"
                >
                    {CITIES.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>

                {error ? (
                    <div style={styles.centered}>
                        <p style={styles.text}>{error}</p>
                        <button style={styles.button} onClick={() => load(city, true)}>
                            Retry
                        </button>
                    </div>
                ) : !weather ? (
                    <div style={styles.centered}>
                        <p style={styles.text}>Reading the sky…</p>
                    </div>
                ) : (
                    <>
                        <div
                            style={styles.current}
                            onClick={toggleUnit}
                            title="Click to switch between °C and °F"
                        >
                            <Icon icon={weatherIcon(weather.code)} style={styles.currentIcon} />
                            <div style={styles.currentText}>
                                <span style={styles.temperature}>
                                    {formatTemp(weather.temperature, unit)}
                                </span>
                                <span style={styles.condition}>
                                    {describe(weather.code)}
                                </span>
                            </div>
                        </div>

                        <p style={styles.detail}>
                            Feels like {formatTemp(weather.apparent, unit)} · wind{' '}
                            {Math.round(weather.windSpeed)} km/h
                        </p>

                        <div style={styles.groupBox}>
                            <span style={styles.groupTitle}>Next few days</span>
                            <div style={styles.forecast}>
                                {weather.days.slice(0, 4).map((day, i) => (
                                    <div key={day.date} style={styles.day}>
                                        <span style={styles.dayName}>
                                            {dayLabel(day.date, i)}
                                        </span>
                                        <Icon icon={weatherIcon(day.code)} style={styles.dayIcon} />
                                        <span style={styles.dayTemp}>
                                            {formatTemp(day.high, unit)}
                                        </span>
                                        <span style={styles.dayLow}>
                                            {formatTemp(day.low, unit)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={styles.footer}>
                            <span style={styles.source}>Open-Meteo</span>
                            <button
                                style={styles.button}
                                onClick={() => load(city, true)}
                                disabled={loading}
                            >
                                {loading ? '…' : 'Refresh'}
                            </button>
                        </div>
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
        gap: 8,
        padding: 12,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 11,
    },
    select: {
        width: '100%',
        padding: '3px 4px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
    },
    centered: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    text: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        textAlign: 'center',
        lineHeight: 1.5,
    },
    current: {
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        cursor: 'pointer',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        flexShrink: 0,
    },
    currentIcon: {
        width: 40,
        height: 40,
        objectFit: 'contain',
    },
    currentText: {
        flexDirection: 'column',
        minWidth: 0,
    },
    temperature: {
        fontFamily: 'MSSerif',
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.black,
        lineHeight: 1.1,
    },
    condition: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
    },
    detail: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        lineHeight: 1.3,
        flexShrink: 0,
    },
    groupBox: {
        position: 'relative',
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0,
        marginTop: 8,
        padding: '10px 8px 8px 8px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
    },
    groupTitle: {
        position: 'absolute',
        top: -7,
        left: 7,
        padding: '0 4px',
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
    },
    forecast: {
        flexDirection: 'column',
        gap: 5,
    },
    day: {
        alignItems: 'center',
        gap: 7,
    },
    dayName: {
        width: 42,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
    },
    dayIcon: {
        width: 18,
        height: 18,
        objectFit: 'contain',
    },
    dayTemp: {
        flex: 1,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        textAlign: 'right',
    },
    dayLow: {
        width: 36,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        textAlign: 'right',
        flexShrink: 0,
    },
    footer: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        marginTop: 'auto',
        flexShrink: 0,
    },
    source: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
    },
    button: {
        padding: '3px 10px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        cursor: 'pointer',
    },
};

export default WeatherStation;
