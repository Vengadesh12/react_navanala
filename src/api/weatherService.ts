/**
 * Weather Service for Nava Technologies (NavaNala Technologies Private Limited)
 * Location: Near New Bus Stand, Perundurai, Erode, Tamil Nadu, India
 * Coordinates: Latitude 11.2744344, Longitude 77.5819116
 * Google Maps: https://maps.app.goo.gl/FUHgneSb6BPVbJGt6
 * Powered by Open-Meteo API (Free, high accuracy, no API key required)
 */

export type WeatherType =
  | "sunny"
  | "clear_night"
  | "partly_cloudy_day"
  | "partly_cloudy_night"
  | "cloudy"
  | "rain"
  | "thunderstorm"
  | "fog"
  | "sunset"
  | "sunrise";

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
  conditionText: string;
  weatherType: WeatherType;
  isDay: boolean;
  locationName: string;
  locationDetails: string;
  mapsUrl: string;
  sunriseTime: string;
  sunsetTime: string;
  sunriseDecimal: number;
  sunsetDecimal: number;
  lastUpdated: Date;
}

// Exact Coordinates for Nava Technologies
export const NAVA_LOCATION = {
  name: "Nava Technologies",
  fullName: "NavaNala Technologies Private Limited",
  landmark: "Near New Bus Stand, Perundurai, Tamil Nadu",
  latitude: 11.2744344,
  longitude: 77.5819116,
  mapsUrl: "https://maps.app.goo.gl/FUHgneSb6BPVbJGt6",
  timezone: "Asia/Kolkata",
};

// Backwards compatibility alias
export const PERUNDURAI_LOCATION = NAVA_LOCATION;

const CACHE_KEY = "navanala_technologies_weather_cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Format ISO datetime string (e.g., "2026-09-09T06:09") to 12-hour format ("6:09 AM")
 * and decimal hours (e.g., 6.15)
 */
function parseSunTime(isoStr?: string, defaultHour: number = 6): { timeStr: string; decimalHours: number } {
  if (!isoStr) {
    const h12 = defaultHour > 12 ? defaultHour - 12 : defaultHour;
    const ampm = defaultHour >= 12 ? "PM" : "AM";
    return { timeStr: `${h12}:00 ${ampm}`, decimalHours: defaultHour };
  }

  try {
    const parts = isoStr.split("T")[1]?.split(":");
    if (!parts || parts.length < 2) throw new Error("Invalid time format");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h >= 12 ? "PM" : "AM";
    const timeStr = `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
    const decimalHours = h + m / 60;
    return { timeStr, decimalHours };
  } catch {
    const h12 = defaultHour > 12 ? defaultHour - 12 : defaultHour;
    const ampm = defaultHour >= 12 ? "PM" : "AM";
    return { timeStr: `${h12}:00 ${ampm}`, decimalHours: defaultHour };
  }
}

/**
 * Map WMO weather code and time of day to our WeatherType and friendly description
 */
export function classifyWeather(
  code: number,
  isDay: boolean,
  currentTimeDecimal?: number,
  sunriseDecimal: number = 6.15,
  sunsetDecimal: number = 18.4
): { weatherType: WeatherType; conditionText: string } {
  const currentDecimal =
    currentTimeDecimal ??
    new Date().getHours() + new Date().getMinutes() / 60 + new Date().getSeconds() / 3600;

  // Check for Golden Hour (Sunrise: within 45 mins of sunrise; Sunset: within 45 mins of sunset)
  const isNearSunrise = Math.abs(currentDecimal - sunriseDecimal) <= 0.75;
  const isNearSunset = Math.abs(currentDecimal - sunsetDecimal) <= 0.75;

  // Thunderstorm codes: 95, 96, 99
  if (code >= 95) {
    return { weatherType: "thunderstorm", conditionText: "Thunderstorm" };
  }

  // Rain codes: 51, 53, 55 (drizzle), 61, 63, 65 (rain), 80, 81, 82 (showers)
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    if (code === 51 || code === 53) {
      return { weatherType: "rain", conditionText: "Light Drizzle" };
    }
    if (code >= 80) {
      return { weatherType: "rain", conditionText: "Rain Showers" };
    }
    return { weatherType: "rain", conditionText: "Rainy" };
  }

  // Fog codes: 45, 48
  if (code === 45 || code === 48) {
    return { weatherType: "fog", conditionText: "Misty & Foggy" };
  }

  // Overcast code: 3
  if (code === 3) {
    return { weatherType: "cloudy", conditionText: "Overcast Clouds" };
  }

  // Golden Hour check for clear or partly cloudy conditions
  if (isNearSunset) {
    return { weatherType: "sunset", conditionText: "Golden Sunset" };
  }
  if (isNearSunrise) {
    return { weatherType: "sunrise", conditionText: "Golden Sunrise" };
  }

  // Partly cloudy codes: 1, 2
  if (code === 1 || code === 2) {
    return isDay
      ? { weatherType: "partly_cloudy_day", conditionText: "Partly Cloudy" }
      : { weatherType: "partly_cloudy_night", conditionText: "Scattered Clouds" };
  }

  // Clear Sky code: 0
  return isDay
    ? { weatherType: "sunny", conditionText: "Clear & Sunny" }
    : { weatherType: "clear_night", conditionText: "Clear Starlit Sky" };
}

/**
 * Fallback weather data if network is unavailable
 */
function getFallbackWeatherData(): WeatherData {
  const now = new Date();
  const currentHours = now.getHours();
  const currentDecimal = currentHours + now.getMinutes() / 60;
  const isDay = currentDecimal >= 6.15 && currentDecimal < 18.4;
  const defaultCode = isDay ? 1 : 0;
  const { weatherType, conditionText } = classifyWeather(defaultCode, isDay, currentDecimal);

  return {
    temperature: isDay ? 35 : 26,
    feelsLike: isDay ? 38 : 28,
    humidity: isDay ? 35 : 65,
    windSpeed: 11,
    precipitation: 0,
    weatherCode: defaultCode,
    conditionText,
    weatherType,
    isDay,
    locationName: NAVA_LOCATION.name,
    locationDetails: NAVA_LOCATION.landmark,
    mapsUrl: NAVA_LOCATION.mapsUrl,
    sunriseTime: "6:09 AM",
    sunsetTime: "6:24 PM",
    sunriseDecimal: 6.15,
    sunsetDecimal: 18.4,
    lastUpdated: now,
  };
}

/**
 * Fetch live weather from Open-Meteo for Nava Technologies (Perundurai)
 */
export async function fetchNavaWeather(forceRefresh = false): Promise<WeatherData> {
  if (!forceRefresh) {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - new Date(parsed.lastUpdated).getTime();
        if (age < CACHE_TTL_MS) {
          return {
            ...parsed,
            lastUpdated: new Date(parsed.lastUpdated),
          };
        }
      }
    } catch {
      // Ignore cache parse errors
    }
  }

  const { latitude, longitude, timezone } = NAVA_LOCATION;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=sunrise,sunset&timezone=${encodeURIComponent(
    timezone
  )}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo weather API returned status ${res.status}`);
    }

    const data = await res.json();
    const current = data.current;
    const daily = data.daily;

    const sunriseIso = daily?.sunrise?.[0];
    const sunsetIso = daily?.sunset?.[0];

    const { timeStr: sunriseTime, decimalHours: sunriseDecimal } = parseSunTime(sunriseIso, 6.15);
    const { timeStr: sunsetTime, decimalHours: sunsetDecimal } = parseSunTime(sunsetIso, 18.4);

    const isDay = current.is_day === 1;
    const weatherCode = current.weather_code ?? 0;
    const { weatherType, conditionText } = classifyWeather(
      weatherCode,
      isDay,
      undefined,
      sunriseDecimal,
      sunsetDecimal
    );

    const weatherData: WeatherData = {
      temperature: Math.round(current.temperature_2m ?? 35),
      feelsLike: Math.round(current.apparent_temperature ?? current.temperature_2m ?? 35),
      humidity: Math.round(current.relative_humidity_2m ?? 40),
      windSpeed: Math.round(current.wind_speed_10m ?? 10),
      precipitation: current.precipitation ?? 0,
      weatherCode,
      conditionText,
      weatherType,
      isDay,
      locationName: NAVA_LOCATION.name,
      locationDetails: NAVA_LOCATION.landmark,
      mapsUrl: NAVA_LOCATION.mapsUrl,
      sunriseTime,
      sunsetTime,
      sunriseDecimal,
      sunsetDecimal,
      lastUpdated: new Date(),
    };

    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(weatherData));
    } catch {
      // Storage might be full, ignore
    }

    return weatherData;
  } catch (err) {
    console.warn("Using fallback weather for Nava Technologies due to error:", err);
    return getFallbackWeatherData();
  }
}

// Backwards compatibility alias
export const fetchPerunduraiWeather = fetchNavaWeather;
