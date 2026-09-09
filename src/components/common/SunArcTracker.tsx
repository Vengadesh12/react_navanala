import React, { useState, useEffect, useMemo, useRef } from "react";
import { WbSunny, DarkMode, AccessTime, AutoAwesome } from "@mui/icons-material";

interface SunArcTrackerProps {
  className?: string;
}

export const SunArcTracker: React.FC<SunArcTrackerProps> = ({ className = "" }) => {
  // Live real-time clock updating every second
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  // Interactive hover tracking progress (0 to 1), or null when not hovering
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentSeconds = currentTime.getSeconds();

  // Total decimal hours for live real-time position (0 to 24)
  const liveTimeDecimal = currentHours + currentMinutes / 60 + currentSeconds / 3600;

  // Day window: 06:00 AM (6.0) to 06:00 PM (18.0) -> Exactly 12 hours
  // Night window: 06:00 PM (18.0) to 06:00 AM (6.0) -> Exactly 12 hours
  const isLiveDaytime = liveTimeDecimal >= 6.0 && liveTimeDecimal < 18.0;

  // Compute live celestial trajectory progress t between 0 and 1
  let liveProgress = 0;
  if (isLiveDaytime) {
    // Daytime (6 AM to 6 PM): 6 AM is 0, 12 PM is 0.5 (center), 6 PM is 1.0
    liveProgress = Math.min(Math.max((liveTimeDecimal - 6.0) / 12.0, 0), 1);
  } else {
    // Nighttime (6 PM to 6 AM): 6 PM is 0, 12 AM (Midnight) is 0.5 (center), 6 AM is 1.0
    let nightElapsed = 0;
    if (liveTimeDecimal >= 18.0) {
      nightElapsed = liveTimeDecimal - 18.0; // 0 to 6 hours until 24:00 (Midnight)
    } else {
      nightElapsed = liveTimeDecimal + 6.0; // 6 to 12 hours from 00:00 to 06:00
    }
    liveProgress = Math.min(Math.max(nightElapsed / 12.0, 0), 1);
  }

  // Active celestial coordinates: tracks mouse position on hover, resumes real-time on leave
  const isHovering = hoverProgress !== null;
  const activeProgress = isHovering ? hoverProgress : liveProgress;
  const isDaytime = isLiveDaytime;

  // Effective decimal hours for labels & display
  const effectiveDecimalHours = useMemo(() => {
    if (isHovering) {
      if (isDaytime) {
        // Scrubbing across daytime: 6:00 AM to 6:00 PM
        return 6.0 + hoverProgress * 12.0;
      } else {
        // Scrubbing across nighttime: 6:00 PM (18.0) -> 12:00 AM -> 6:00 AM (6.0)
        const h = 18.0 + hoverProgress * 12.0;
        return h >= 24.0 ? h - 24.0 : h;
      }
    }
    return liveTimeDecimal;
  }, [isHovering, isDaytime, hoverProgress, liveTimeDecimal]);

  // Expanded Arc path geometry:
  // ViewBox: 540 x 50
  // P0 (left): (28, 38)
  // P1 (zenith peak): (270, -8)
  // P2 (right): (512, 38)
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

  // Phase Label & Direction Indicator
  const phaseInfo = useMemo(() => {
    if (isDaytime) {
      if (effectiveDecimalHours < 8.5) {
        return {
          label: "Morning Sunrise",
          direction: "West Horizon • Sunrise (6 AM)",
          accentColor: "#f97316",
          glowColor: "rgba(249, 115, 22, 0.5)",
        };
      } else if (effectiveDecimalHours < 11.0) {
        return {
          label: "Morning Glow",
          direction: "Climbing Toward Zenith",
          accentColor: "#eab308",
          glowColor: "rgba(234, 179, 8, 0.5)",
        };
      } else if (effectiveDecimalHours <= 13.0) {
        return {
          label: "Solar Zenith",
          direction: "12:00 PM Center Peak",
          accentColor: "#f59e0b",
          glowColor: "rgba(245, 158, 11, 0.65)",
        };
      } else if (effectiveDecimalHours < 16.5) {
        return {
          label: "Afternoon Sun",
          direction: "Descending Towards Sunset",
          accentColor: "#f59e0b",
          glowColor: "rgba(245, 158, 11, 0.5)",
        };
      } else {
        return {
          label: "Golden Sunset",
          direction: "East Horizon • Sunset (6 PM)",
          accentColor: "#f43f5e",
          glowColor: "rgba(244, 63, 94, 0.6)",
        };
      }
    } else {
      // Night Phase (6 PM to 6 AM)
      if (effectiveDecimalHours >= 18.0 && effectiveDecimalHours < 20.5) {
        return {
          label: "Twilight Moonrise",
          direction: "East Horizon • Moonrise (6 PM)",
          accentColor: "#9333ea",
          glowColor: "rgba(147, 51, 234, 0.45)",
        };
      } else if (effectiveDecimalHours >= 20.5 && effectiveDecimalHours < 23.0) {
        return {
          label: "Starlit Night",
          direction: "Ascending Toward Midnight",
          accentColor: "#6366f1",
          glowColor: "rgba(99, 102, 241, 0.45)",
        };
      } else if (effectiveDecimalHours >= 23.0 || effectiveDecimalHours < 1.0) {
        return {
          label: "Midnight Moon",
          direction: "12:00 AM Midnight Zenith",
          accentColor: "#8b5cf6",
          glowColor: "rgba(139, 92, 246, 0.6)",
        };
      } else if (effectiveDecimalHours >= 1.0 && effectiveDecimalHours < 4.5) {
        return {
          label: "Silent Night",
          direction: "Descending Toward Dawn",
          accentColor: "#6366f1",
          glowColor: "rgba(99, 102, 241, 0.4)",
        };
      } else {
        return {
          label: "Pre-Dawn Moon",
          direction: "West Horizon • Moonset (6 AM)",
          accentColor: "#0284c7",
          glowColor: "rgba(2, 132, 199, 0.45)",
        };
      }
    }
  }, [isDaytime, effectiveDecimalHours]);

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

  // When mouse leaves the arc card, reset hover and smoothly return to real time
  const handleMouseLeave = () => {
    setHoverProgress(null);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative select-none cursor-pointer overflow-visible ${className}`}
      title={
        isDaytime
          ? "Daytime Solar Arc (6 AM to 6 PM) • Hover to scrub, move away for live time"
          : "Nighttime Lunar Arc (6 PM to 6 AM) • Hover to scrub, move away for live time"
      }
    >
      {/* Outer Card Background & Border (z-0: stays cleanly below sticky navbar on scroll) */}
      <div
        className={`absolute inset-0 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border shadow-xs transition-all duration-300 pointer-events-none z-0 ${
          isHovering
            ? isDaytime
              ? "border-amber-400 dark:border-amber-500/60 shadow-md shadow-amber-500/10"
              : "border-indigo-400 dark:border-indigo-500/60 shadow-md shadow-indigo-500/10"
            : isDaytime
              ? "border-slate-200/80 dark:border-slate-800 hover:border-amber-400/50 dark:hover:border-amber-500/40"
              : "border-slate-200/80 dark:border-slate-800 hover:border-indigo-400/50 dark:hover:border-indigo-500/40"
        }`}
      />

      {/* Outer Card Foreground Content Container */}
      <div className="relative w-full flex flex-col items-center justify-center px-4 sm:px-5 py-2 overflow-visible">
        {/* Top Info Bar: Phase Status & Live Digital Clock (z-10) */}
        <div className="relative z-10 flex items-center justify-between w-full gap-2 px-1 text-[11px] sm:text-xs">
          <div className="flex items-center gap-2">
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
            <span
              className={`hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isDaytime
                  ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/40"
                  : "text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-800/50"
                }`}
            >
              {phaseInfo.direction}
            </span>
          </div>

          {/* Time Badge: Consistent readable theme */}
          <div
            className={`flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border transition-all ${isHovering
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
            {isHovering && (
              ""
            )}
          </div>
        </div>

        {/* Expansive Celestial Sky Arc & Real-Time / Interactive Sun or Moon (z-40: floats ABOVE navbar and info bar) */}
        <div className="relative z-40 w-full h-[46px] sm:h-[50px] flex items-center justify-center overflow-visible my-0.5 pointer-events-none">
          <svg
            viewBox="0 0 540 50"
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            <defs>
              {/* Daylight Arc Trajectory Gradient (6 AM -> 12 PM -> 6 PM) */}
              <linearGradient id="arcSkyGradientDay" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                <stop offset="25%" stopColor="#fb923c" stopOpacity="0.65" />
                <stop offset="50%" stopColor="#facc15" stopOpacity="0.9" />
                <stop offset="75%" stopColor="#fb923c" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.35" />
              </linearGradient>

              {/* Nighttime Arc Trajectory Gradient (6 PM -> 12 AM -> 6 AM) */}
              <linearGradient id="arcSkyGradientNight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                <stop offset="25%" stopColor="#8b5cf6" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#a855f7" stopOpacity="0.9" />
                <stop offset="75%" stopColor="#6366f1" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
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
              className={isDaytime ? "opacity-85 dark:opacity-75" : "opacity-85 dark:opacity-75"}
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

            {/* HORIZON LABELS & TICKS (Clear neutral text matching application theme) */}
            {/* Left Label: 6 AM in Day, 6 PM in Night */}
            <text
              x="28"
              y="47"
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-500 font-mono text-[8px] font-bold"
            >
              {isDaytime ? "6 AM" : "6 PM"}
            </text>

            {/* Quarter Tick: 9 AM in Day, 9 PM in Night */}
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

            {/* Three-Quarter Tick: 3 PM in Day, 3 AM in Night */}
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

            {/* Right Label: 6 PM in Day, 6 AM in Night */}
            <text
              x="512"
              y="47"
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-500 font-mono text-[8px] font-bold"
            >
              {isDaytime ? "6 PM" : "6 AM"}
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
                /* SUN ANIMATION (Daytime 6 AM to 6 PM) */
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
                      effectiveDecimalHours < 8.5 || effectiveDecimalHours > 16.5
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
                /* ANIMATED MOON WITH STARDUST (Nighttime 6 PM to 6 AM) */
                <g filter="url(#lunarGlow)">
                  {/* Outer Pulsing Moonlight Aura */}
                  <circle
                    cx="0"
                    cy="0"
                    r={isHovering ? "16" : "14"}
                    fill="rgba(129, 140, 248, 0.35)"
                    className="animate-pulse"
                  />

                  {/* Rotating Soft Lunar Aura Corona */}
                  <circle
                    cx="0"
                    cy="0"
                    r="11"
                    fill="url(#moonAuraGrad)"
                    className="animate-[spin_26s_linear_infinite] origin-center opacity-75"
                  />

                  {/* Luminous Moon Image */}
                  <image
                    href="/moon.svg"
                    x="-10"
                    y="-10"
                    width="20"
                    height="20"
                    className="drop-shadow-md pointer-events-none"
                  />

                  {/* Twinkling Orbiting Stardust Stars */}
                  <g>
                    {/* Star 1 (Pulsing Diamond) */}
                    <path
                      d="M -9 -7 L -8 -5 L -6 -6 L -7 -4 L -9 -7 Z"
                      fill="#6366f1"
                      className="animate-ping"
                      style={{ animationDuration: "2.8s" }}
                    />
                    {/* Star 2 (Sparkle) */}
                    <circle cx="9.5" cy="-6" r="1.2" fill="#818cf8" className="animate-pulse" />
                    {/* Star 3 (Soft Glow) */}
                    <circle cx="10" cy="8.5" r="1.2" fill="#a5b4fc" />
                    {/* Star 4 */}
                    <circle cx="-10.5" cy="5.5" r="1" fill="#818cf8" />
                  </g>
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Bottom Horizon Subtext: Day vs Night Dynamic Labels (Clean neutral font colors, z-10) */}
        <div className="relative z-10 flex items-center justify-between w-full px-2 text-[9px] sm:text-[10px] font-medium text-slate-400 dark:text-slate-500">
          {isDaytime ? (
            <>
              <span className="inline-flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <span className="text-amber-500 font-bold">🌅</span>
                <span>West • Morning Rise (6 AM)</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-amber-600/90 dark:text-amber-400/90 font-semibold">
                <WbSunny sx={{ fontSize: 13 }} className="text-amber-500" />
                <span>12:00 PM Solar Zenith</span>
              </span>
              <span className="inline-flex items-center gap-1.5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <span className="text-rose-500 font-bold">🌇</span>
                <span>East • Sunset (6 PM)</span>
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
                <span>East • Moonrise (6 PM)</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-indigo-600/90 dark:text-indigo-400/90 font-semibold">
                <AutoAwesome sx={{ fontSize: 13 }} className="text-purple-500 dark:text-purple-400" />
                <span>12:00 AM Midnight Zenith</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                <DarkMode sx={{ fontSize: 13 }} className="text-slate-400 dark:text-slate-500 opacity-80" />
                <span>West • Moonset (6 AM)</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default SunArcTracker;
