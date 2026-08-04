/**
 * The weather behind the tray icon.
 * ---------------------------------
 * Open-Meteo, because it needs no API key and sends permissive CORS headers, so
 * it works from a static site with nothing behind it. Free for non-commercial
 * use; no account, no token to leak in the bundle.
 *
 * Nothing here asks for the visitor's location. A geolocation prompt on a
 * portfolio is an unpleasant surprise, so this ships with a short list of
 * cities, opens on Copenhagen, and remembers whichever one you pick.
 */

import { IconName } from '../../assets/icons';

export interface City {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
}

/** Home first, then the places the rest of this desktop's visitors read from. */
export const CITIES: City[] = [
    { id: 'copenhagen', name: 'Copenhagen', latitude: 55.6761, longitude: 12.5683 },
    { id: 'london', name: 'London', latitude: 51.5072, longitude: -0.1276 },
    { id: 'berlin', name: 'Berlin', latitude: 52.52, longitude: 13.405 },
    { id: 'newyork', name: 'New York', latitude: 40.7128, longitude: -74.006 },
    { id: 'sanfrancisco', name: 'San Francisco', latitude: 37.7749, longitude: -122.4194 },
    { id: 'tokyo', name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
];

export type Unit = 'C' | 'F';

export interface DayForecast {
    /** ISO date, as returned. */
    date: string;
    high: number;
    low: number;
    code: number;
}

export interface Weather {
    city: City;
    temperature: number;
    apparent: number;
    code: number;
    windSpeed: number;
    isDay: boolean;
    /** Today first, then the next few days. */
    days: DayForecast[];
    fetchedAt: number;
}

export class WeatherError extends Error {}

const CITY_KEY = 'weather.city.v1';
const UNIT_KEY = 'weather.unit.v1';

export function loadCity(): City {
    try {
        const id = localStorage.getItem(CITY_KEY);
        return CITIES.find((c) => c.id === id) || CITIES[0];
    } catch {
        return CITIES[0];
    }
}

export function saveCity(city: City): void {
    try {
        localStorage.setItem(CITY_KEY, city.id);
    } catch {
        /* storage disabled — the choice just won't survive a reload */
    }
}

export function loadUnit(): Unit {
    try {
        return localStorage.getItem(UNIT_KEY) === 'F' ? 'F' : 'C';
    } catch {
        return 'C';
    }
}

export function saveUnit(unit: Unit): void {
    try {
        localStorage.setItem(UNIT_KEY, unit);
    } catch {
        /* as above */
    }
}

/**
 * One reading per city, kept for the module's lifetime. The panel refetches on
 * open, so without this every glance at the tray would hit the network again;
 * ten minutes is well inside how often the upstream data actually changes.
 */
const cache = new Map<string, Weather>();
const MAX_AGE = 10 * 60 * 1000;

export const cachedWeather = (city: City): Weather | undefined => {
    const hit = cache.get(city.id);
    return hit && Date.now() - hit.fetchedAt < MAX_AGE ? hit : undefined;
};

export async function fetchWeather(
    city: City,
    options: { force?: boolean } = {}
): Promise<Weather> {
    if (!options.force) {
        const hit = cachedWeather(city);
        if (hit) return hit;
    }

    const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}` +
        `&longitude=${city.longitude}` +
        '&current=temperature_2m,apparent_temperature,is_day,weather_code,wind_speed_10m' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
        '&timezone=auto&forecast_days=4';

    let response: Response;
    try {
        response = await fetch(url);
    } catch {
        throw new WeatherError('No connection to the weather service.');
    }
    if (!response.ok) {
        throw new WeatherError(`The weather service returned ${response.status}.`);
    }

    const data = await response.json();
    const current = data?.current;
    const daily = data?.daily;
    if (!current || typeof current.temperature_2m !== 'number') {
        throw new WeatherError('The weather service sent no reading.');
    }

    const days: DayForecast[] = Array.isArray(daily?.time)
        ? daily.time.map((date: string, i: number) => ({
              date,
              high: daily.temperature_2m_max?.[i],
              low: daily.temperature_2m_min?.[i],
              code: daily.weather_code?.[i] ?? 0,
          }))
        : [];

    const weather: Weather = {
        city,
        temperature: current.temperature_2m,
        apparent: current.apparent_temperature ?? current.temperature_2m,
        code: current.weather_code ?? 0,
        windSpeed: current.wind_speed_10m ?? 0,
        isDay: current.is_day !== 0,
        days,
        fetchedAt: Date.now(),
    };
    cache.set(city.id, weather);
    return weather;
}

/**
 * WMO weather codes, which is what Open-Meteo reports, collapsed onto the six
 * icons this desktop has. The full table has 28 entries and most of them are
 * shades of "raining"; the tray is 16 pixels wide.
 */
export function describe(code: number): string {
    if (code === 0) return 'Clear';
    if (code === 1) return 'Mainly clear';
    if (code === 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 57) return 'Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code === 66 || code === 67) return 'Freezing rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Showers';
    if (code === 85 || code === 86) return 'Snow showers';
    if (code >= 95) return 'Thunderstorm';
    return 'Unknown';
}

export function weatherIcon(code: number): IconName {
    if (code === 0 || code === 1) return 'weatherSunIcon';
    if (code === 2) return 'weatherPartlyIcon';
    if (code === 3 || code === 45 || code === 48) return 'weatherCloudIcon';
    if (code >= 95) return 'weatherStormIcon';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
        return 'weatherSnowIcon';
    }
    return 'weatherRainIcon';
}

export const toUnit = (celsius: number, unit: Unit): number =>
    unit === 'F' ? celsius * 1.8 + 32 : celsius;

export const formatTemp = (celsius: number | undefined, unit: Unit): string =>
    typeof celsius === 'number'
        ? `${Math.round(toUnit(celsius, unit))}°${unit}`
        : '—';

/** "Mon", "Tue", … with today spelled out, the way a forecast strip reads. */
export function dayLabel(date: string, index: number): string {
    if (index === 0) return 'Today';
    const parsed = new Date(`${date}T12:00:00`);
    return isNaN(parsed.getTime())
        ? date
        : parsed.toLocaleDateString(undefined, { weekday: 'short' });
}
