import React, { useCallback, useEffect, useState } from 'react';
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
} from './weather';

/**
 * The weather panel — what the sun beside the clock opens.
 *
 * Conditions now, then the next three days. The city is a drop-down rather than
 * a location prompt (see `weather.ts`), and clicking the temperature flips
 * between Celsius and Fahrenheit, both of which are remembered.
 *
 * Sized to the tray: 186px, same as the market ticker next to it.
 */

export interface WeatherPanelProps {
    open: boolean;
}

const WeatherPanel: React.FC<WeatherPanelProps> = ({ open }) => {
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

    // Fetch when the panel is first opened, and again whenever the city
    // changes. The cache in `weather.ts` keeps reopening instant.
    useEffect(() => {
        if (open) load(city);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, city]);

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

    if (!open) return null;

    return (
        <div style={styles.panel}>
            <div style={styles.header}>
                <Icon
                    icon={weather ? weatherIcon(weather.code) : 'weatherSunIcon'}
                    size={16}
                />
                <span style={styles.title}>Weather</span>
            </div>

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
                <div style={styles.errorBox}>
                    <p style={styles.errorText}>{error}</p>
                    <button
                        style={styles.button}
                        onClick={() => load(city, true)}
                    >
                        Retry
                    </button>
                </div>
            ) : !weather ? (
                <p style={styles.loading}>Reading the sky…</p>
            ) : (
                <>
                    <div
                        style={styles.current}
                        onClick={toggleUnit}
                        title="Click to switch between °C and °F"
                    >
                        <Icon icon={weatherIcon(weather.code)} size={32} />
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

                    <div style={styles.forecast}>
                        {weather.days.slice(0, 4).map((day, i) => (
                            <div key={day.date} style={styles.day}>
                                <span style={styles.dayName}>
                                    {dayLabel(day.date, i)}
                                </span>
                                <Icon icon={weatherIcon(day.code)} size={16} />
                                <span style={styles.dayTemp}>
                                    {formatTemp(day.high, unit)}
                                </span>
                                <span style={styles.dayLow}>
                                    {formatTemp(day.low, unit)}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}

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
        </div>
    );
};

const styles: StyleSheetCSS = {
    panel: {
        position: 'absolute',
        bottom: '135%',
        right: 0,
        width: 186,
        flexDirection: 'column',
        background: Colors.lightGray,
        border: `1px solid ${Colors.white}`,
        borderBottomColor: Colors.black,
        borderRightColor: Colors.black,
        boxShadow: '1px 1px 0 rgba(0,0,0,0.4)',
        padding: 6,
        gap: 5,
        zIndex: 100001,
        fontFamily: 'MSSerif',
    },
    header: {
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
    },
    title: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.black,
    },
    select: {
        width: '100%',
        padding: '2px 3px',
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        background: Colors.white,
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.black,
        flexShrink: 0,
    },
    current: {
        alignItems: 'center',
        gap: 8,
        padding: '5px 6px',
        cursor: 'pointer',
        background: Colors.white,
        border: `1px solid ${Colors.darkGray}`,
        borderRightColor: Colors.white,
        borderBottomColor: Colors.white,
        flexShrink: 0,
    },
    currentText: {
        flexDirection: 'column',
        minWidth: 0,
    },
    temperature: {
        fontFamily: 'MSSerif',
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.black,
        lineHeight: 1.1,
    },
    condition: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
    },
    detail: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        lineHeight: 1.3,
        flexShrink: 0,
    },
    forecast: {
        flexDirection: 'column',
        gap: 2,
        flexShrink: 0,
    },
    day: {
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
    },
    dayName: {
        width: 38,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        flexShrink: 0,
    },
    dayTemp: {
        flex: 1,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        textAlign: 'right',
    },
    dayLow: {
        width: 34,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.darkGray,
        textAlign: 'right',
        flexShrink: 0,
    },
    footer: {
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        flexShrink: 0,
    },
    source: {
        fontFamily: 'MSSerif',
        fontSize: 9,
        color: Colors.darkGray,
    },
    button: {
        padding: '2px 8px',
        border: `1px solid ${Colors.white}`,
        borderRightColor: Colors.darkGray,
        borderBottomColor: Colors.darkGray,
        background: Colors.lightGray,
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        cursor: 'pointer',
    },
    loading: {
        fontFamily: 'MSSerif',
        fontSize: 11,
        color: Colors.darkGray,
        padding: '6px 2px',
    },
    errorBox: {
        flexDirection: 'column',
        gap: 5,
        padding: 2,
    },
    errorText: {
        fontFamily: 'MSSerif',
        fontSize: 10,
        color: Colors.black,
        lineHeight: 1.4,
    },
};

export default WeatherPanel;
