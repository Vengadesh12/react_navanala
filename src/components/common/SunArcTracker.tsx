import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  WbSunny,
  DarkMode,
  AccessTime,
  AutoAwesome,
  Cloud,
  Grain,
  Thunderstorm,
  Air,
  WaterDrop,
  LocationOn,
  Refresh,
  Thermostat,
  WbTwilight,
  Tune,
  Close,
  OpenInNew,
  ContentCopy,
  Check,
} from "@mui/icons-material";
import {
  fetchNavaWeather,
  WeatherData,
  WeatherType,
  NAVA_LOCATION,
} from "../../api/weatherService";

export interface SunArcHoverTime {
  decimalHours: number;
  displayTime: string;
  date: Date;
}

export interface SunArcTrackerProps {
  className?: string;
  onHoverTimeChange?: (hoverData: SunArcHoverTime | null) => void;
}

const WEATHER_THEMES: Record<
  WeatherType,
  {
    name: string;
    bg: string;
    borderHover: string;
    borderNormal: string;
    shadow: string;
    accentText: string;
    glowColor: string;
  }
> = {
  sunny: {
    name: "Clear & Sunny",
    bg: "bg-gradient-to-r from-amber-500/15 via-orange-400/10 to-sky-400/15 dark:from-amber-950/40 dark:via-slate-900/90 dark:to-sky-950/40",
    borderHover: "border-amber-400 dark:border-amber-500/70 shadow-md shadow-amber-500/15",
    borderNormal: "border-amber-200/80 dark:border-amber-900/50 hover:border-amber-400/60",
    shadow: "shadow-amber-500/10",
    accentText: "text-amber-600 dark:text-amber-400",
    glowColor: "rgba(245, 158, 11, 0.45)",
  },
  sunset: {
    name: "Golden Sunset",
    bg: "bg-gradient-to-r from-orange-500/25 via-rose-500/15 to-purple-600/20 dark:from-orange-950/60 dark:via-rose-950/50 dark:to-purple-950/60",
    borderHover: "border-rose-400 dark:border-rose-500/70 shadow-md shadow-rose-500/15",
    borderNormal: "border-rose-200/80 dark:border-rose-900/50 hover:border-rose-400/60",
    shadow: "shadow-rose-500/10",
    accentText: "text-rose-600 dark:text-rose-400",
    glowColor: "rgba(244, 63, 94, 0.5)",
  },
  sunrise: {
    name: "Golden Sunrise",
    bg: "bg-gradient-to-r from-amber-500/20 via-orange-400/15 to-pink-500/20 dark:from-amber-950/50 dark:via-orange-950/40 dark:to-pink-950/50",
    borderHover: "border-orange-400 dark:border-orange-500/70 shadow-md shadow-orange-500/15",
    borderNormal: "border-orange-200/80 dark:border-orange-900/50 hover:border-orange-400/60",
    shadow: "shadow-orange-500/10",
    accentText: "text-orange-600 dark:text-orange-400",
    glowColor: "rgba(249, 115, 22, 0.5)",
  },
  partly_cloudy_day: {
    name: "Partly Cloudy",
    bg: "bg-gradient-to-r from-sky-400/15 via-slate-100/60 to-blue-400/15 dark:from-sky-950/40 dark:via-slate-900/85 dark:to-slate-800/60",
    borderHover: "border-sky-400 dark:border-sky-500/70 shadow-md shadow-sky-500/15",
    borderNormal: "border-sky-200/80 dark:border-sky-900/50 hover:border-sky-400/60",
    shadow: "shadow-sky-500/10",
    accentText: "text-sky-600 dark:text-sky-400",
    glowColor: "rgba(56, 189, 248, 0.35)",
  },
  partly_cloudy_night: {
    name: "Scattered Clouds",
    bg: "bg-gradient-to-r from-slate-900/30 via-indigo-950/30 to-slate-800/30 dark:from-slate-900/90 dark:via-indigo-950/80 dark:to-slate-900/90",
    borderHover: "border-indigo-400 dark:border-indigo-500/70 shadow-md shadow-indigo-500/15",
    borderNormal: "border-indigo-200/80 dark:border-indigo-900/50 hover:border-indigo-400/60",
    shadow: "shadow-indigo-500/10",
    accentText: "text-indigo-600 dark:text-indigo-400",
    glowColor: "rgba(129, 140, 248, 0.35)",
  },
  cloudy: {
    name: "Overcast Clouds",
    bg: "bg-gradient-to-r from-slate-300/35 via-slate-200/40 to-slate-400/30 dark:from-slate-800/80 dark:via-slate-900/90 dark:to-slate-800/80",
    borderHover: "border-slate-400 dark:border-slate-600 shadow-md shadow-slate-500/15",
    borderNormal: "border-slate-300/80 dark:border-slate-800 hover:border-slate-400/60",
    shadow: "shadow-slate-500/10",
    accentText: "text-slate-600 dark:text-slate-300",
    glowColor: "rgba(148, 163, 184, 0.3)",
  },
  rain: {
    name: "Rain & Showers",
    bg: "bg-gradient-to-r from-cyan-600/15 via-blue-500/15 to-slate-600/20 dark:from-cyan-950/50 dark:via-blue-950/60 dark:to-slate-900/90",
    borderHover: "border-cyan-400 dark:border-cyan-500/70 shadow-md shadow-cyan-500/15",
    borderNormal: "border-cyan-200/80 dark:border-cyan-900/50 hover:border-cyan-400/60",
    shadow: "shadow-cyan-500/10",
    accentText: "text-cyan-600 dark:text-cyan-400",
    glowColor: "rgba(6, 182, 212, 0.4)",
  },
  thunderstorm: {
    name: "Thunderstorm",
    bg: "bg-gradient-to-r from-indigo-900/25 via-purple-900/25 to-slate-900/30 dark:from-indigo-950/70 dark:via-purple-950/70 dark:to-slate-950/90",
    borderHover: "border-purple-400 dark:border-purple-500/70 shadow-md shadow-purple-500/15",
    borderNormal: "border-purple-200/80 dark:border-purple-900/50 hover:border-purple-400/60",
    shadow: "shadow-purple-500/10",
    accentText: "text-purple-600 dark:text-purple-400",
    glowColor: "rgba(168, 85, 247, 0.45)",
  },
  fog: {
    name: "Misty & Foggy",
    bg: "bg-gradient-to-r from-slate-200/40 via-teal-100/25 to-slate-300/35 dark:from-slate-800/60 dark:via-slate-900/80 dark:to-teal-950/40",
    borderHover: "border-teal-400 dark:border-teal-500/70 shadow-md shadow-teal-500/15",
    borderNormal: "border-teal-200/80 dark:border-teal-900/50 hover:border-teal-400/60",
    shadow: "shadow-teal-500/10",
    accentText: "text-teal-600 dark:text-teal-400",
    glowColor: "rgba(45, 212, 191, 0.35)",
  },
  clear_night: {
    name: "Clear Starlit Sky",
    bg: "bg-gradient-to-r from-indigo-950/30 via-slate-900/40 to-blue-950/30 dark:from-indigo-950/80 dark:via-slate-900/95 dark:to-blue-950/80",
    borderHover: "border-indigo-400 dark:border-indigo-500/70 shadow-md shadow-indigo-500/15",
    borderNormal: "border-indigo-200/80 dark:border-indigo-900/50 hover:border-indigo-400/60",
    shadow: "shadow-indigo-500/10",
    accentText: "text-indigo-600 dark:text-indigo-400",
    glowColor: "rgba(99, 102, 241, 0.45)",
  },
};

interface ThemeOption {
  id: WeatherType | "auto";
  label: string;
  icon: React.ReactNode;
  activeClass: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "auto",
    label: "Auto",
    icon: <AutoAwesome sx={{ fontSize: 13 }} />,
    activeClass:
      "bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-500 shadow-sm ring-1.5 ring-indigo-400/60 font-bold",
  },
  {
    id: "sunny",
    label: "Sunny",
    icon: <WbSunny sx={{ fontSize: 13 }} />,
    activeClass:
      "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-sm ring-1.5 ring-amber-400/60 font-bold",
  },
  {
    id: "rain",
    label: "Rain",
    icon: <Grain sx={{ fontSize: 13 }} />,
    activeClass:
      "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-sm ring-1.5 ring-cyan-400/60 font-bold",
  },
  {
    id: "thunderstorm",
    label: "Storm",
    icon: <Thunderstorm sx={{ fontSize: 13 }} />,
    activeClass:
      "bg-gradient-to-r from-purple-600 to-indigo-700 text-white border-purple-400 shadow-sm ring-1.5 ring-purple-400/60 font-bold",
  },
  {
    id: "sunset",
    label: "Sunset",
    icon: <WbTwilight sx={{ fontSize: 13 }} />,
    activeClass:
      "bg-gradient-to-r from-rose-500 to-amber-600 text-white border-rose-400 shadow-sm ring-1.5 ring-rose-400/60 font-bold",
  },
  {
    id: "cloudy",
    label: "Cloudy",
    icon: <Cloud sx={{ fontSize: 13 }} />,
    activeClass:
      "bg-gradient-to-r from-slate-600 to-slate-700 text-white border-slate-400 shadow-sm ring-1.5 ring-slate-400/60 font-bold",
  },
  {
    id: "fog",
    label: "Fog",
    icon: <Air sx={{ fontSize: 13 }} />,
    activeClass:
      "bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-400 shadow-sm ring-1.5 ring-teal-400/60 font-bold",
  },
  {
    id: "clear_night",
    label: "Night",
    icon: <DarkMode sx={{ fontSize: 13 }} />,
    activeClass:
      "bg-gradient-to-r from-indigo-900 to-slate-900 text-white border-indigo-600 shadow-sm ring-1.5 ring-indigo-400/60 font-bold",
  },
];

export const SunArcTracker: React.FC<SunArcTrackerProps> = ({ className = "", onHoverTimeChange }) => {
  // Live real-time clock updating every second
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  // Interactive hover tracking progress (0 to 1), or null when not hovering
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Weather state for Perundurai New Bus Stand
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(true);
  const [isRefreshingWeather, setIsRefreshingWeather] = useState<boolean>(false);
  const [weatherModalOpen, setWeatherModalOpen] = useState<boolean>(false);
  const [previewTheme, setPreviewTheme] = useState<WeatherType | "auto">("auto");
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Copy GPS Coordinates helper
  const handleCopyCoords = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${NAVA_LOCATION.latitude}, ${NAVA_LOCATION.longitude}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  // Fetch live weather on mount and auto-refresh every 10 minutes
  useEffect(() => {
    let isMounted = true;
    const loadWeather = async (force = false) => {
      try {
        if (force) setIsRefreshingWeather(true);
        const data = await fetchNavaWeather(force);
        if (isMounted) {
          setWeatherData(data);
        }
      } catch (err) {
        console.error("Failed to fetch weather for Perundurai:", err);
      } finally {
        if (isMounted) {
          setIsLoadingWeather(false);
          setIsRefreshingWeather(false);
        }
      }
    };

    loadWeather();
    const interval = setInterval(() => loadWeather(true), 10 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close weather details modal on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setWeatherModalOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setWeatherModalOpen(false);
      }
    };
    if (weatherModalOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [weatherModalOpen]);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentSeconds = currentTime.getSeconds();
  const liveTimeDecimal = currentHours + currentMinutes / 60 + currentSeconds / 3600;

  // Day window based on Perundurai Sunrise / Sunset
  const sunriseDecimal = weatherData?.sunriseDecimal ?? 6.15; // ~06:09 AM
  const sunsetDecimal = weatherData?.sunsetDecimal ?? 18.4; // ~06:24 PM
  const dayLengthHours = sunsetDecimal - sunriseDecimal; // ~12.25 hours
  const nightLengthHours = 24.0 - dayLengthHours;

  const isLiveDaytime = liveTimeDecimal >= sunriseDecimal && liveTimeDecimal < sunsetDecimal;

  // Active weather condition & styling theme
  const activeWeatherType: WeatherType = useMemo(() => {
    if (previewTheme !== "auto") return previewTheme;
    if (weatherData) return weatherData.weatherType;
    return isLiveDaytime ? "sunny" : "clear_night";
  }, [previewTheme, weatherData, isLiveDaytime]);

  const activeTheme = WEATHER_THEMES[activeWeatherType] || WEATHER_THEMES.sunny;

  // Compute live celestial trajectory progress t between 0 and 1
  let liveProgress = 0;
  if (isLiveDaytime) {
    liveProgress = Math.min(Math.max((liveTimeDecimal - sunriseDecimal) / dayLengthHours, 0), 1);
  } else {
    let nightElapsed = 0;
    if (liveTimeDecimal >= sunsetDecimal) {
      nightElapsed = liveTimeDecimal - sunsetDecimal;
    } else {
      nightElapsed = liveTimeDecimal + (24.0 - sunsetDecimal);
    }
    liveProgress = Math.min(Math.max(nightElapsed / nightLengthHours, 0), 1);
  }

  // Active celestial coordinates: tracks mouse position on hover, resumes real-time on leave
  const isHovering = hoverProgress !== null;
  const activeProgress = isHovering ? hoverProgress : liveProgress;
  const isDaytime = isLiveDaytime;

  // Effective decimal hours for labels & display
  const effectiveDecimalHours = useMemo(() => {
    if (isHovering) {
      if (isDaytime) {
        return sunriseDecimal + hoverProgress * dayLengthHours;
      } else {
        const h = sunsetDecimal + hoverProgress * nightLengthHours;
        return h >= 24.0 ? h - 24.0 : h;
      }
    }
    return liveTimeDecimal;
  }, [isHovering, isDaytime, hoverProgress, liveTimeDecimal, sunriseDecimal, sunsetDecimal, dayLengthHours, nightLengthHours]);

  // Arc path geometry
  const p0 = { x: 28, y: 38 };
  const p1 = { x: 270, y: -8 };
  const p2 = { x: 512, y: 38 };

  const t = activeProgress;
  const currentX = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
  const currentY = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;

  // Compute formatted time string
  const displayTimeStr = useMemo(() => {
    if (isHovering) {
      const h = Math.floor(effectiveDecimalHours);
      const m = Math.floor((effectiveDecimalHours - h) * 60);
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const ampmStr = h >= 12 ? "PM" : "AM";
      return `${displayH}:${m.toString().padStart(2, "0")} ${ampmStr}`;
    }
    const displayHours12 = currentHours % 12 === 0 ? 12 : currentHours % 12;
    const ampm = currentHours >= 12 ? "PM" : "AM";
    const formattedMinutes = currentMinutes.toString().padStart(2, "0");
    const formattedSeconds = currentSeconds.toString().padStart(2, "0");
    return `${displayHours12}:${formattedMinutes}:${formattedSeconds} ${ampm}`;
  }, [isHovering, effectiveDecimalHours, currentHours, currentMinutes, currentSeconds]);

  // Notify parent component of hovered time across the celestial arc
  useEffect(() => {
    if (!onHoverTimeChange) return;
    if (hoverProgress !== null) {
      const h = Math.floor(effectiveDecimalHours);
      const m = Math.floor((effectiveDecimalHours - h) * 60);
      const s = Math.floor((((effectiveDecimalHours - h) * 60) - m) * 60);
      const d = new Date(currentTime);
      d.setHours(h, m, s, 0);
      onHoverTimeChange({
        decimalHours: effectiveDecimalHours,
        displayTime: displayTimeStr,
        date: d,
      });
    } else {
      onHoverTimeChange(null);
    }
  }, [hoverProgress, effectiveDecimalHours, displayTimeStr, currentTime, onHoverTimeChange]);

  // Phase Label & Direction Indicator
  const phaseInfo = useMemo(() => {
    if (isDaytime) {
      if (effectiveDecimalHours < sunriseDecimal + 2.0) {
        return {
          label: "Morning Sunrise",
          direction: `East Horizon • Rise (${weatherData?.sunriseTime || "6:09 AM"})`,
          accentColor: "#f97316",
          glowColor: "rgba(249, 115, 22, 0.5)",
        };
      } else if (effectiveDecimalHours < 11.5) {
        return {
          label: "Morning Glow",
          direction: "Climbing Toward Zenith",
          accentColor: "#eab308",
          glowColor: "rgba(234, 179, 8, 0.5)",
        };
      } else if (effectiveDecimalHours <= 13.5) {
        return {
          label: "Solar Zenith",
          direction: "12:00 PM Center Peak",
          accentColor: "#f59e0b",
          glowColor: "rgba(245, 158, 11, 0.65)",
        };
      } else if (effectiveDecimalHours < sunsetDecimal - 1.5) {
        return {
          label: "Afternoon Sun",
          direction: "Descending Towards Sunset",
          accentColor: "#f59e0b",
          glowColor: "rgba(245, 158, 11, 0.5)",
        };
      } else {
        return {
          label: "Golden Sunset",
          direction: `West Horizon • Set (${weatherData?.sunsetTime || "6:24 PM"})`,
          accentColor: "#f43f5e",
          glowColor: "rgba(244, 63, 94, 0.6)",
        };
      }
    } else {
      if (effectiveDecimalHours >= sunsetDecimal && effectiveDecimalHours < sunsetDecimal + 2.5) {
        return {
          label: "Twilight Moonrise",
          direction: `East Horizon • Moonrise (${weatherData?.sunsetTime || "6:24 PM"})`,
          accentColor: "#9333ea",
          glowColor: "rgba(147, 51, 234, 0.45)",
        };
      } else if (effectiveDecimalHours >= sunsetDecimal + 2.5 && effectiveDecimalHours < 23.0) {
        return {
          label: "Starlit Night",
          direction: "Ascending Toward Midnight",
          accentColor: "#6366f1",
          glowColor: "rgba(99, 102, 241, 0.45)",
        };
      } else if (effectiveDecimalHours >= 23.0 || effectiveDecimalHours < 1.5) {
        return {
          label: "Midnight Moon",
          direction: "12:00 AM Midnight Zenith",
          accentColor: "#8b5cf6",
          glowColor: "rgba(139, 92, 246, 0.6)",
        };
      } else if (effectiveDecimalHours >= 1.5 && effectiveDecimalHours < sunriseDecimal - 1.5) {
        return {
          label: "Silent Night",
          direction: "Descending Toward Dawn",
          accentColor: "#6366f1",
          glowColor: "rgba(99, 102, 241, 0.4)",
        };
      } else {
        return {
          label: "Pre-Dawn Moon",
          direction: `West Horizon • Moonset (${weatherData?.sunriseTime || "6:09 AM"})`,
          accentColor: "#0284c7",
          glowColor: "rgba(2, 132, 199, 0.45)",
        };
      }
    }
  }, [isDaytime, effectiveDecimalHours, sunriseDecimal, sunsetDecimal, weatherData]);

  // Track mouse movement across the sun arc
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const paddingX = 24;
    const usableWidth = rect.width - paddingX * 2;
    if (usableWidth <= 0) return;

    const mouseX = e.clientX - (rect.left + paddingX);
    const clampedProgress = Math.max(0, Math.min(mouseX / usableWidth, 1));
    setHoverProgress(clampedProgress);
  };

  const handleMouseLeave = () => {
    setHoverProgress(null);
  };

  // Weather Icon Component Helper
  const renderWeatherIcon = (type: WeatherType, size = 14) => {
    switch (type) {
      case "sunny":
        return <WbSunny sx={{ fontSize: size }} className="text-amber-500 animate-spin-slow" />;
      case "sunset":
      case "sunrise":
        return <WbTwilight sx={{ fontSize: size }} className="text-rose-500" />;
      case "rain":
        return <Grain sx={{ fontSize: size }} className="text-cyan-500" />;
      case "thunderstorm":
        return <Thunderstorm sx={{ fontSize: size }} className="text-purple-500" />;
      case "cloudy":
      case "partly_cloudy_day":
        return <Cloud sx={{ fontSize: size }} className="text-sky-500" />;
      case "fog":
        return <Air sx={{ fontSize: size }} className="text-teal-500" />;
      case "clear_night":
      case "partly_cloudy_night":
      default:
        return <DarkMode sx={{ fontSize: size }} className="text-indigo-400" />;
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative z-10 select-none cursor-pointer overflow-visible ${className}`}
      title={
        isDaytime
          ? `Nava Technologies Solar Arc (${weatherData?.sunriseTime || "6:09 AM"} to ${weatherData?.sunsetTime || "6:24 PM"}) • Hover to scrub`
          : `Nava Technologies Lunar Arc (${weatherData?.sunsetTime || "6:24 PM"} to ${weatherData?.sunriseTime || "6:09 AM"}) • Hover to scrub`
      }
    >
      {/* Dynamic Weather Card Background & Border */}
      <div
        className={`absolute inset-0 rounded-2xl backdrop-blur-md border shadow-xs transition-all duration-700 pointer-events-none z-0 ${
          activeTheme.bg
        } ${
          isHovering ? activeTheme.borderHover : activeTheme.borderNormal
        }`}
      />

      {/* Atmospheric Weather Background FX Layer (Rain, Clouds, Storm, Mist, Stars) */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
        {/* Thunderstorm Ambient Light Flash */}
        {activeWeatherType === "thunderstorm" && (
          <div className="absolute inset-0 bg-indigo-400/20 mix-blend-screen animate-storm-flash pointer-events-none" />
        )}

        {/* Falling Raindrops Particles */}
        {(activeWeatherType === "rain" || activeWeatherType === "thunderstorm") && (
          <svg className="absolute inset-0 w-full h-full opacity-60 pointer-events-none">
            <g stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round">
              <line x1="12%" y1="5%" x2="14%" y2="28%" className="animate-rain" style={{ animationDelay: "0s" }} />
              <line x1="28%" y1="2%" x2="30%" y2="24%" className="animate-rain" style={{ animationDelay: "0.3s" }} />
              <line x1="45%" y1="8%" x2="47%" y2="30%" className="animate-rain" style={{ animationDelay: "0.6s" }} />
              <line x1="62%" y1="3%" x2="64%" y2="25%" className="animate-rain" style={{ animationDelay: "0.2s" }} />
              <line x1="78%" y1="6%" x2="80%" y2="28%" className="animate-rain" style={{ animationDelay: "0.8s" }} />
              <line x1="91%" y1="2%" x2="93%" y2="23%" className="animate-rain" style={{ animationDelay: "0.4s" }} />
            </g>
          </svg>
        )}

        {/* Soft Drifting Translucent Clouds */}
        {(activeWeatherType === "cloudy" ||
          activeWeatherType === "partly_cloudy_day" ||
          activeWeatherType === "partly_cloudy_night") && (
          <svg className="absolute inset-0 w-full h-full opacity-25 dark:opacity-20 pointer-events-none animate-cloud-drift">
            <ellipse cx="20%" cy="40%" rx="65" ry="16" fill="currentColor" className="text-slate-400 dark:text-slate-500 blur-xs" />
            <ellipse cx="65%" cy="30%" rx="85" ry="20" fill="currentColor" className="text-slate-400 dark:text-slate-500 blur-xs" />
            <ellipse cx="85%" cy="50%" rx="55" ry="14" fill="currentColor" className="text-slate-400 dark:text-slate-500 blur-xs" />
          </svg>
        )}

        {/* Misty / Fog Layer */}
        {activeWeatherType === "fog" && (
          <div className="absolute inset-0 bg-gradient-to-t from-teal-500/10 via-slate-300/15 to-transparent blur-md animate-mist-float pointer-events-none" />
        )}

        {/* Sunny Radiant Glow */}
        {activeWeatherType === "sunny" && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-24 bg-amber-400/20 dark:bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        )}

        {/* Sunset Radiant Glow */}
        {(activeWeatherType === "sunset" || activeWeatherType === "sunrise") && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-rose-500/20 via-orange-500/10 to-transparent blur-sm pointer-events-none" />
        )}
      </div>

      {/* Outer Card Foreground Content Container */}
      <div className="relative w-full flex flex-col items-center justify-center px-4 sm:px-5 py-2 overflow-visible">
        {/* Top Info Bar: Location Badge, Weather Details, Phase Status & Clock */}
        <div className="relative z-10 flex items-center justify-between w-full gap-2 px-1 text-[11px] sm:text-xs">
          {/* Left Side: Phase & Location Chip */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Celestial Phase */}
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
              {isDaytime ? (
                <WbSunny sx={{ fontSize: 15 }} className="text-amber-500 animate-spin-slow" />
              ) : (
                <img
                  src="/moon.svg"
                  alt="Moon Phase"
                  className="w-4 h-4 object-contain drop-shadow-xs animate-pulse"
                />
              )}
              <span className="tracking-tight text-slate-800 dark:text-slate-100">{phaseInfo.label}</span>
            </div>

            {/* Perundurai New Bus Stand Weather Badge (Clickable to open weather details modal) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setWeatherModalOpen((prev) => !prev);
              }}
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all cursor-pointer backdrop-blur-md shadow-2xs hover:scale-105 active:scale-95 ${
                activeWeatherType === "sunny"
                  ? "bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-700/60 hover:border-amber-400"
                  : activeWeatherType === "rain"
                  ? "bg-cyan-100/80 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-300/80 dark:border-cyan-700/60 hover:border-cyan-400"
                  : activeWeatherType === "thunderstorm"
                  ? "bg-purple-100/80 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300/80 dark:border-purple-700/60 hover:border-purple-400"
                  : activeWeatherType === "sunset" || activeWeatherType === "sunrise"
                  ? "bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300/80 dark:border-rose-700/60 hover:border-rose-400"
                  : "bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-300/80 dark:border-slate-700/70 hover:border-slate-400"
              }`}
              title="Click for Nava Technologies Live Weather & Background Themes"
            >
              <LocationOn sx={{ fontSize: 11 }} className="text-rose-500" />
              <span className="font-bold">Nava Technologies</span>
              <span className="opacity-75 font-normal hidden md:inline">(Perundurai)</span>
              <span className="opacity-40">•</span>
              <span className="flex items-center gap-0.5">
                {renderWeatherIcon(activeWeatherType, 12)}
                <span className="font-bold">
                  {weatherData ? `${weatherData.temperature}°C` : "37°C"}
                </span>
              </span>
              <span className="text-[9px] opacity-75 hidden sm:inline">
                {previewTheme !== "auto"
                  ? `(${activeTheme.name})`
                  : weatherData?.conditionText || "Sunny"}
              </span>
              <Tune sx={{ fontSize: 11 }} className="opacity-60 ml-0.5" />
            </button>
          </div>

          {/* Right Side: Digital Clock Badge */}
          <div
            className={`flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border transition-all ${
              isHovering
                ? isDaytime
                  ? "text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/70 border-amber-300/80 dark:border-amber-700/60 shadow-xs"
                  : "text-indigo-700 dark:text-indigo-300 bg-indigo-100/90 dark:bg-indigo-950/70 border-indigo-300/80 dark:border-indigo-700/60 shadow-xs"
                : "text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 border-slate-200/70 dark:border-slate-700/70 shadow-2xs"
            }`}
          >
            <AccessTime
              sx={{ fontSize: 13 }}
              className={
                isDaytime
                  ? isHovering
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-amber-500 dark:text-amber-400"
                  : isHovering
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-indigo-500 dark:text-indigo-400"
              }
            />
            <span>{displayTimeStr}</span>
          </div>
        </div>

        {/* Expansive Celestial Sky Arc & Real-Time / Interactive Sun or Moon (z-10) */}
        <div className="relative z-10 w-full h-[46px] sm:h-[50px] flex items-center justify-center overflow-visible my-0.5 pointer-events-none">
          <svg
            viewBox="0 0 540 50"
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            <defs>
              {/* Daylight Arc Trajectory Gradient */}
              <linearGradient id="arcSkyGradientDay" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.45" />
                <stop offset="25%" stopColor="#fb923c" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#facc15" stopOpacity="0.95" />
                <stop offset="75%" stopColor="#fb923c" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.45" />
              </linearGradient>

              {/* Nighttime Arc Trajectory Gradient */}
              <linearGradient id="arcSkyGradientNight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                <stop offset="25%" stopColor="#8b5cf6" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.95" />
                <stop offset="75%" stopColor="#6366f1" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.45" />
              </linearGradient>

              {/* Sun Core Disc Gradient */}
              <radialGradient id="sunCoreGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="25%" stopColor="#fef08a" />
                <stop offset="65%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </radialGradient>

              {/* Sunrise / Sunset Amber Gradient */}
              <radialGradient id="sunsetCoreGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff1f2" />
                <stop offset="35%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#e11d48" />
              </radialGradient>

              {/* Luminous Moon Gradient */}
              <radialGradient id="moonCoreGrad" cx="40%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="45%" stopColor="#e0e7ff" />
                <stop offset="80%" stopColor="#c7d2fe" />
                <stop offset="100%" stopColor="#818cf8" />
              </radialGradient>

              {/* Lunar Aura Gradient */}
              <radialGradient id="moonAuraGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.55" />
                <stop offset="60%" stopColor="#818cf8" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
              </radialGradient>

              {/* Solar Ambient Glow Filter */}
              <filter id="solarGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Lunar Ambient Glow Filter */}
              <filter id="lunarGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="4.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Arch Trajectory Track */}
            <path
              d="M 28 38 Q 270 -8 512 38"
              fill="none"
              stroke={isDaytime ? "url(#arcSkyGradientDay)" : "url(#arcSkyGradientNight)"}
              strokeWidth="2.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
              className={isDaytime ? "opacity-90 dark:opacity-80" : "opacity-90 dark:opacity-80"}
            />

            {/* Faint Ground Horizon Line */}
            <line
              x1="18"
              y1="40"
              x2="522"
              y2="40"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 4"
              className="text-slate-300 dark:text-slate-700 opacity-70"
            />

            {/* Night Sky Micro Twinkling Stars along Arc */}
            {!isDaytime && (
              <g className="pointer-events-none">
                <circle cx="95" cy="27" r="1.1" fill="#818cf8" opacity="0.75" className="animate-pulse" />
                <circle cx="205" cy="14" r="1.2" fill="#a855f7" opacity="0.85" />
                <circle cx="335" cy="14" r="1.1" fill="#818cf8" opacity="0.75" className="animate-pulse" />
                <circle cx="445" cy="27" r="1.2" fill="#6366f1" opacity="0.85" />
              </g>
            )}

            {/* HORIZON LABELS & TICKS */}
            {/* Left Label: Perundurai Sunrise / Sunset */}
            <text
              x="28"
              y="47"
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-500 font-mono text-[8px] font-bold"
            >
              {isDaytime ? weatherData?.sunriseTime || "6:09 AM" : weatherData?.sunsetTime || "6:24 PM"}
            </text>

            {/* Quarter Tick */}
            <line
              x1="149"
              y1="23"
              x2="149"
              y2="26"
              stroke="currentColor"
              strokeWidth="1"
              className="text-slate-300 dark:text-slate-600"
            />
            <text
              x="149"
              y="21"
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-500 font-mono text-[7px]"
            >
              {isDaytime ? "9 AM" : "9 PM"}
            </text>

            {/* Center Peak Tick & Label: 12 PM in Day, 12 AM in Night */}
            <line
              x1="270"
              y1="11"
              x2="270"
              y2="15"
              stroke="currentColor"
              strokeWidth="1.5"
              className={isDaytime ? "text-amber-500/80 dark:text-amber-400/80" : "text-indigo-500/80 dark:text-indigo-400/80"}
            />
            <text
              x="270"
              y="9"
              textAnchor="middle"
              className={
                isDaytime
                  ? "fill-amber-500 dark:fill-amber-400 font-mono text-[8px] font-bold tracking-wider"
                  : "fill-indigo-600 dark:fill-indigo-400 font-mono text-[8px] font-bold tracking-wider"
              }
            >
              {isDaytime ? "12 PM" : "12 AM"}
            </text>

            {/* Three-Quarter Tick */}
            <line
              x1="391"
              y1="23"
              x2="391"
              y2="26"
              stroke="currentColor"
              strokeWidth="1"
              className="text-slate-300 dark:text-slate-600"
            />
            <text
              x="391"
              y="21"
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-500 font-mono text-[7px]"
            >
              {isDaytime ? "3 PM" : "3 AM"}
            </text>

            {/* Right Label: Perundurai Sunset / Sunrise */}
            <text
              x="512"
              y="47"
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-500 font-mono text-[8px] font-bold"
            >
              {isDaytime ? weatherData?.sunsetTime || "6:24 PM" : weatherData?.sunriseTime || "6:09 AM"}
            </text>

            {/* CELESTIAL BODY: SUN (Day) or MOON (Night) */}
            <g
              transform={`translate(${currentX}, ${currentY})`}
              className={
                isHovering
                  ? "transition-transform duration-75 ease-out"
                  : "transition-transform duration-700 ease-out"
              }
            >
              {isDaytime ? (
                /* SUN ANIMATION (Daytime) */
                <g filter="url(#solarGlow)">
                  {/* Outer Pulsing Solar Flare Halo */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isHovering ? "15" : "13"}
                    fill={phaseInfo.glowColor}
                    className="animate-pulse"
                  />

                  {/* Rotating Corona Rays */}
                  <g className="animate-[spin_18s_linear_infinite] origin-center">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                      <line
                        key={deg}
                        x1="0"
                        y1="-9.5"
                        x2="0"
                        y2="-12.5"
                        stroke={phaseInfo.accentColor}
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        transform={`rotate(${deg})`}
                      />
                    ))}
                  </g>

                  {/* Sun Core Disc */}
                  <circle
                    cx="0"
                    cy="0"
                    r="7.5"
                    fill={
                      effectiveDecimalHours < sunriseDecimal + 1.5 || effectiveDecimalHours > sunsetDecimal - 1.5
                        ? "url(#sunsetCoreGrad)"
                        : "url(#sunCoreGrad)"
                    }
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="drop-shadow-sm"
                  />

                  {/* Subtle Sun Core Specular Highlight */}
                  <circle
                    cx="-2.5"
                    cy="-2.5"
                    r="2.2"
                    fill="#ffffff"
                    opacity="0.7"
                  />
                </g>
              ) : (
                /* ANIMATED MOON WITH STARDUST (Nighttime) */
                <g filter="url(#lunarGlow)">
                  <circle
                    cx="0"
                    cy="0"
                    r={isHovering ? "16" : "14"}
                    fill="rgba(129, 140, 248, 0.35)"
                    className="animate-pulse"
                  />

                  <circle
                    cx="0"
                    cy="0"
                    r="11"
                    fill="url(#moonAuraGrad)"
                    className="animate-[spin_26s_linear_infinite] origin-center opacity-75"
                  />

                  <image
                    href="/moon.svg"
                    x="-10"
                    y="-10"
                    width="20"
                    height="20"
                    className="drop-shadow-md pointer-events-none"
                  />

                  <g>
                    <path
                      d="M -9 -7 L -8 -5 L -6 -6 L -7 -4 L -9 -7 Z"
                      fill="#6366f1"
                      className="animate-ping"
                      style={{ animationDuration: "2.8s" }}
                    />
                    <circle cx="9.5" cy="-6" r="1.2" fill="#818cf8" className="animate-pulse" />
                    <circle cx="10" cy="8.5" r="1.2" fill="#a5b4fc" />
                    <circle cx="-10.5" cy="5.5" r="1" fill="#818cf8" />
                  </g>
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Bottom Horizon Subtext: Day vs Night Dynamic Labels */}
        <div className="relative z-10 flex items-center justify-between w-full px-2 text-[9px] sm:text-[10px] font-medium text-slate-400 dark:text-slate-500">
          {isDaytime ? (
            <>
              <span className="inline-flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <span className="text-amber-500 font-bold">🌅</span>
                <span>East • Rise ({weatherData?.sunriseTime || "6:09 AM"})</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-amber-600/90 dark:text-amber-400/90 font-semibold">
                <WbSunny sx={{ fontSize: 13 }} className="text-amber-500" />
                <span>12:00 PM Solar Zenith</span>
              </span>
              <span className="inline-flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <span className="text-rose-500 font-bold">🌇</span>
                <span>West • Set ({weatherData?.sunsetTime || "6:24 PM"})</span>
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                <img
                  src="/moon.svg"
                  alt="East Moonrise"
                  className="w-3.5 h-3.5 object-contain inline-block drop-shadow-xs"
                />
                <span>East • Rise ({weatherData?.sunsetTime || "6:24 PM"})</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-indigo-600/90 dark:text-indigo-400/90 font-semibold">
                <AutoAwesome sx={{ fontSize: 13 }} className="text-purple-500 dark:text-purple-400" />
                <span>12:00 AM Midnight Zenith</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                <DarkMode sx={{ fontSize: 13 }} className="text-slate-400 dark:text-slate-500 opacity-80" />
                <span>West • Set ({weatherData?.sunriseTime || "6:09 AM"})</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Weather & Location Details Modal / Dropdown */}
      {weatherModalOpen && (
        <div
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full right-0 sm:right-2 mt-2.5 w-[calc(100vw-2rem)] sm:w-[410px] max-w-[420px] rounded-2xl bg-white/98 dark:bg-slate-900/98 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-slate-900/20 dark:shadow-slate-950/60 p-4 sm:p-5 z-20 animate-fade-in text-slate-800 dark:text-slate-100 space-y-3.5 max-h-[85vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-800">
            {/* Left Location & Title Details */}
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/15 via-rose-500/10 to-orange-500/15 dark:from-rose-500/25 dark:to-orange-500/25 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <LocationOn sx={{ fontSize: 20 }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
                    Nava Technologies
                  </h4>
                  <a
                    href={NAVA_LOCATION.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center p-0.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors shrink-0"
                    title="Open Nava Technologies on Google Maps"
                  >
                    <OpenInNew sx={{ fontSize: 13 }} />
                  </a>
                </div>
                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5">
                  {NAVA_LOCATION.fullName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {NAVA_LOCATION.landmark}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={handleCopyCoords}
                    className="inline-flex items-center gap-1 text-[9px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 px-2 py-0.5 rounded-md border border-slate-200/70 dark:border-slate-700/60 transition-colors cursor-pointer"
                    title="Click to copy GPS coordinates"
                  >
                    {copiedCoords ? (
                      <>
                        <Check sx={{ fontSize: 11 }} className="text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold">
                          Copied!
                        </span>
                      </>
                    ) : (
                      <>
                        <ContentCopy sx={{ fontSize: 10 }} />
                        <span>
                          {NAVA_LOCATION.latitude}° N, {NAVA_LOCATION.longitude}° E
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              <button
                type="button"
                onClick={async () => {
                  setIsRefreshingWeather(true);
                  const data = await fetchNavaWeather(true);
                  setWeatherData(data);
                  setIsRefreshingWeather(false);
                }}
                disabled={isRefreshingWeather}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all cursor-pointer"
                title="Refresh Live Weather"
              >
                <Refresh
                  sx={{ fontSize: 17 }}
                  className={isRefreshingWeather ? "animate-spin text-indigo-600 dark:text-indigo-400" : ""}
                />
              </button>
              <button
                type="button"
                onClick={() => setWeatherModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
                title="Close"
              >
                <Close sx={{ fontSize: 17 }} />
              </button>
            </div>
          </div>

          {/* Current Weather Highlight Card */}
          <div className="relative overflow-hidden rounded-xl p-3 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-50/50 dark:from-amber-950/30 dark:via-slate-800/60 dark:to-slate-900/60 border border-amber-200/60 dark:border-amber-900/30 flex items-center justify-between gap-3 shadow-2xs">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {weatherData ? `${weatherData.temperature}°` : "38°"}
                  <span className="text-lg font-bold text-slate-500 dark:text-slate-400">C</span>
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  • Feels {weatherData ? `${weatherData.feelsLike}°C` : "39°C"}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {weatherData?.conditionText || "Sunny & Clear"}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  Live Perundurai Weather
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 dark:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center shadow-md shadow-amber-500/10">
                {renderWeatherIcon(activeWeatherType, 26)}
              </div>
            </div>
          </div>

          {/* Current Weather Stats Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col items-center justify-center text-center shadow-2xs hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors">
              <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center mb-1">
                <Thermostat sx={{ fontSize: 15 }} />
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Temp
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {weatherData ? `${weatherData.temperature}°C` : "38°C"}
              </span>
              <span className="text-[9px] font-medium text-slate-400 mt-0.5">
                Feels {weatherData ? `${weatherData.feelsLike}°C` : "39°C"}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col items-center justify-center text-center shadow-2xs hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors">
              <div className="w-6 h-6 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center mb-1">
                <WaterDrop sx={{ fontSize: 15 }} />
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Humidity
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {weatherData ? `${weatherData.humidity}%` : "27%"}
              </span>
              <span className="text-[9px] font-medium text-slate-400 mt-0.5">Relative</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex flex-col items-center justify-center text-center shadow-2xs hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors">
              <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-500 flex items-center justify-center mb-1">
                <Air sx={{ fontSize: 15 }} />
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Wind
              </span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {weatherData ? `${weatherData.windSpeed} km/h` : "11 km/h"}
              </span>
              <span className="text-[9px] font-medium text-slate-400 mt-0.5">Breeze</span>
            </div>
          </div>

          {/* Sunrise / Sunset Celestial Timing Bar */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-rose-500/10 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-rose-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs">
            {/* Sunrise */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 dark:bg-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <WbTwilight sx={{ fontSize: 16 }} className="rotate-180" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700/90 dark:text-amber-400/90">
                  Sunrise
                </p>
                <p className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
                  {weatherData?.sunriseTime || "6:09 AM"}
                </p>
              </div>
            </div>

            {/* Sun Trajectory Gradient Line */}
            <div className="flex-1 mx-3 flex items-center justify-center">
              <div className="w-full h-px bg-gradient-to-r from-amber-400/60 via-orange-400/60 to-rose-400/60 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500" />
              </div>
            </div>

            {/* Sunset */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-wider text-rose-700/90 dark:text-rose-400/90">
                  Sunset
                </p>
                <p className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">
                  {weatherData?.sunsetTime || "6:24 PM"}
                </p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 dark:bg-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <WbTwilight sx={{ fontSize: 16 }} />
              </div>
            </div>
          </div>

          {/* Interactive Weather Background Theme Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Weather Background Theme
              </span>
              {previewTheme === "auto" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Auto Sync
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setPreviewTheme("auto")}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Reset to Auto ↺
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-[11px]">
              {THEME_OPTIONS.map((item) => {
                const isSelected = previewTheme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPreviewTheme(item.id)}
                    className={`px-2 py-1.5 rounded-xl border font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? item.activeClass
                        : "bg-slate-50/90 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs active:scale-95"
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SunArcTracker;
