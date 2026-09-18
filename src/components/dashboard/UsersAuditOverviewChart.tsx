import React, { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarTodayOutlined,
  KeyboardArrowDown,
  Check,
  North,
  ArrowForward,
} from "@mui/icons-material";
import type { DashboardChartPoint } from "../../types";

export interface UsersAuditOverviewChartProps {
  data?: DashboardChartPoint[];
  timeframe?: "7d" | "30d" | "90d";
  onTimeframeChange?: (timeframe: "7d" | "30d" | "90d") => void;
  className?: string;
}

// Canonical baseline data representing the Sep 11 - Sep 17 7-day period
// Exactly sums to: 84 Active Sessions, 25 New Registrations, 211 Audit Events Logged
// Peak on Sep 14 matching design requirements
export const DEFAULT_CHART_DATA: DashboardChartPoint[] = [
  { day: "Sep 11", active: 10, newUsers: 3, auditLogs: 22, total: 100 },
  { day: "Sep 12", active: 12, newUsers: 4, auditLogs: 28, total: 100 },
  { day: "Sep 13", active: 11, newUsers: 3, auditLogs: 30, total: 100 },
  { day: "Sep 14", active: 16, newUsers: 6, auditLogs: 48, total: 100 }, // Highlighted / peak day
  { day: "Sep 15", active: 13, newUsers: 4, auditLogs: 34, total: 100 },
  { day: "Sep 16", active: 12, newUsers: 3, auditLogs: 27, total: 100 },
  { day: "Sep 17", active: 10, newUsers: 2, auditLogs: 22, total: 100 },
];

export const UsersAuditOverviewChart: React.FC<UsersAuditOverviewChartProps> = ({
  data,
  timeframe = "7d",
  onTimeframeChange,
  className = "",
}) => {
  // Use provided data if populated and non-empty, otherwise use canonical baseline
  const points: DashboardChartPoint[] = useMemo(() => {
    if (data && data.length > 0) {
      return data;
    }
    return DEFAULT_CHART_DATA;
  }, [data]);

  // Find index of Sep 14 by default (or index 3, or middle point)
  const defaultHighlightIdx = useMemo(() => {
    const foundIdx = points.findIndex(
      (p) => p.day.toLowerCase().includes("sep 14") || p.day.includes("14")
    );
    if (foundIdx !== -1) return foundIdx;
    return Math.min(3, Math.max(0, points.length - 1));
  }, [points]);

  const [activePointIndex, setActivePointIndex] = useState<number>(defaultHighlightIdx);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeSeries, setActiveSeries] = useState<"all" | "active" | "new" | "audit">("all");
  const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState<boolean>(false);
  const timeframeDropdownRef = useRef<HTMLDivElement>(null);

  // Sync active point if points change
  useEffect(() => {
    setActivePointIndex(defaultHighlightIdx);
  }, [defaultHighlightIdx]);

  // Close timeframe dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        timeframeDropdownRef.current &&
        !timeframeDropdownRef.current.contains(event.target as Node)
      ) {
        setTimeframeDropdownOpen(false);
      }
    };
    if (timeframeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [timeframeDropdownOpen]);

  // Timeframe labels
  const timeframeLabels: Record<"7d" | "30d" | "90d", string> = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
  };

  // Aggregates for KPI cards
  const metrics = useMemo(() => {
    const totalActive = points.reduce((sum, p) => sum + p.active, 0);
    const totalNew = points.reduce((sum, p) => sum + p.newUsers, 0);
    const totalAudit = points.reduce((sum, p) => sum + (p.auditLogs ?? 0), 0);
    return {
      totalActive,
      totalNew,
      totalAudit,
    };
  }, [points]);

  // SVG dimensions and coordinate system
  const svgWidth = 720;
  const svgHeight = 220;
  const paddingLeft = 44;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 30;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Max scale value with comfortable breathing headroom
  const maxVal = useMemo(() => {
    const highestDataPoint = Math.max(
      ...points.map((p) => Math.max(p.active, p.newUsers, p.auditLogs ?? 0)),
      10
    );
    // Round up nicely to multiples of 10 or 20
    return Math.ceil(highestDataPoint / 10) * 10;
  }, [points]);

  // Coordinate generators
  const activeCoords = useMemo(() => {
    return points.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(points.length - 1, 1)) * plotWidth;
      const y = paddingTop + plotHeight - (p.active / maxVal) * plotHeight;
      return { x, y, data: p };
    });
  }, [points, maxVal, plotWidth, plotHeight]);

  const newCoords = useMemo(() => {
    return points.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(points.length - 1, 1)) * plotWidth;
      const y = paddingTop + plotHeight - (p.newUsers / maxVal) * plotHeight;
      return { x, y, data: p };
    });
  }, [points, maxVal, plotWidth, plotHeight]);

  const auditCoords = useMemo(() => {
    return points.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(points.length - 1, 1)) * plotWidth;
      const y = paddingTop + plotHeight - ((p.auditLogs ?? 0) / maxVal) * plotHeight;
      return { x, y, data: p };
    });
  }, [points, maxVal, plotWidth, plotHeight]);

  // Smooth Cubic Bezier Path Builder
  const buildSmoothPath = (coords: Array<{ x: number; y: number }>) => {
    if (coords.length === 0) return "";
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

    let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const midX = (p0.x + p1.x) / 2;
      path += ` C ${midX.toFixed(1)} ${p0.y.toFixed(1)}, ${midX.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    return path;
  };

  const activePath = useMemo(() => buildSmoothPath(activeCoords), [activeCoords]);
  const newPath = useMemo(() => buildSmoothPath(newCoords), [newCoords]);
  const auditPath = useMemo(() => buildSmoothPath(auditCoords), [auditCoords]);

  // Subtle Area background paths (ultra-light opacity)
  const buildAreaPath = (linePath: string, coords: Array<{ x: number; y: number }>) => {
    if (!linePath || coords.length === 0) return "";
    const firstX = coords[0].x;
    const lastX = coords[coords.length - 1].x;
    const bottomY = paddingTop + plotHeight;
    return `${linePath} L ${lastX.toFixed(1)} ${bottomY} L ${firstX.toFixed(1)} ${bottomY} Z`;
  };

  const activeArea = useMemo(() => buildAreaPath(activePath, activeCoords), [activePath, activeCoords]);
  const newArea = useMemo(() => buildAreaPath(newPath, newCoords), [newPath, newCoords]);
  const auditArea = useMemo(() => buildAreaPath(auditPath, auditCoords), [auditPath, auditCoords]);

  // Currently focused point (hovered takes precedence, otherwise selected/Sep 14)
  const currentFocusedIdx = hoveredIndex !== null ? hoveredIndex : activePointIndex;
  const currentPoint = points[currentFocusedIdx] || points[0];

  // Grid ticks
  const gridTicks = [0, 0.333, 0.666, 1];

  // Pointer position tracker
  const handlePointerMove = (clientX: number, targetRect: DOMRect) => {
    if (targetRect.width <= 0 || points.length <= 1) return;
    const relativeX = clientX - targetRect.left;
    const svgX = (relativeX / targetRect.width) * svgWidth;

    let closestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < points.length; i++) {
      const ptX = paddingLeft + (i / (points.length - 1)) * plotWidth;
      const dist = Math.abs(svgX - ptX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    }

    setHoveredIndex(closestIdx);
    setActivePointIndex(closestIdx);
  };

  return (
    <div
      className={`rounded-2xl border border-slate-200/80 dark:border-slate-800/90 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xs transition-all duration-200 ${className}`}
    >
      {/* 1. Header Row: Title, Subtitle, Legend & Timeframe Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-100 dark:border-slate-800/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Users & Audit Overview
            </h2>
            {currentPoint && (
              <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/50">
                {currentPoint.day} Selected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Active logins, new account registrations, and recorded audit security events
          </p>
        </div>

        {/* Right side controls: Compact Legend & Timeframe Dropdown */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-start md:self-auto">
          {/* Compact interactive legend */}
          <div
            className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-xs font-medium"
            role="tablist"
            aria-label="Filter series"
          >
            <button
              type="button"
              onClick={() => setActiveSeries("all")}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${activeSeries === "all"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveSeries(activeSeries === "active" ? "all" : "active")}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer ${activeSeries === "active"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span>Active</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSeries(activeSeries === "new" ? "all" : "new")}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer ${activeSeries === "new"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>New</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSeries(activeSeries === "audit" ? "all" : "audit")}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all cursor-pointer ${activeSeries === "audit"
                ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-2xs font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              <span>Audit</span>
            </button>
          </div>

          {/* Timeframe selector dropdown */}
          <div className="relative" ref={timeframeDropdownRef}>
            <button
              type="button"
              onClick={() => setTimeframeDropdownOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-2xs ${timeframeDropdownOpen
                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20"
                : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750"
                }`}
              aria-haspopup="listbox"
              aria-expanded={timeframeDropdownOpen}
            >
              <CalendarTodayOutlined sx={{ fontSize: 13, color: "#64748b" }} />
              <span>{timeframeLabels[timeframe]}</span>
              <KeyboardArrowDown
                sx={{ fontSize: 16 }}
                className={`transition-transform duration-200 ${timeframeDropdownOpen ? "rotate-180 text-blue-600" : "text-slate-400"
                  }`}
              />
            </button>

            {timeframeDropdownOpen && (
              <div
                role="listbox"
                className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl shadow-slate-900/10 dark:shadow-black/40 z-30 animate-fadeIn"
              >
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Select Range
                </div>
                {(
                  [
                    { value: "7d", label: "Last 7 Days", desc: "Sep 11 – Sep 17" },
                    { value: "30d", label: "Last 30 Days", desc: "Past 1 month" },
                    { value: "90d", label: "Last 90 Days", desc: "Past 3 months" },
                  ] as const
                ).map((opt) => {
                  const isSelected = timeframe === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onTimeframeChange?.(opt.value);
                        setTimeframeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${isSelected
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                        }`}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-blue-600 dark:text-blue-400">
                        {isSelected && <Check sx={{ fontSize: 14, fontWeight: 700 }} />}
                      </span>
                      <div className="flex-1">
                        <span className="block leading-tight">{opt.label}</span>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {opt.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Focused Point Overview Banner (Subtle & Informative) */}
      {currentPoint && (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 px-3.5 py-2 border border-slate-200/60 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {currentPoint.day}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              • {hoveredIndex !== null ? "Live inspection" : "Active focus point"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
            <div
              className={`flex items-center gap-1.5 transition-opacity ${activeSeries === "all" || activeSeries === "active" ? "opacity-100" : "opacity-35"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-500/20" />
              <span className="text-slate-500 dark:text-slate-400">Active Users:</span>
              <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                {currentPoint.active}
              </strong>
            </div>

            <div
              className={`flex items-center gap-1.5 transition-opacity ${activeSeries === "all" || activeSeries === "new" ? "opacity-100" : "opacity-35"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
              <span className="text-slate-500 dark:text-slate-400">New Users:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                +{currentPoint.newUsers}
              </strong>
            </div>

            <div
              className={`flex items-center gap-1.5 transition-opacity ${activeSeries === "all" || activeSeries === "audit" ? "opacity-100" : "opacity-35"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-purple-500 ring-2 ring-purple-500/20" />
              <span className="text-slate-500 dark:text-slate-400">Audit Logs:</span>
              <strong className="text-purple-600 dark:text-purple-400 font-semibold">
                {currentPoint.auditLogs ?? 0}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modern Interactive Precision SVG Chart */}
      <div
        className="relative mt-4 h-56 sm:h-64 w-full cursor-crosshair select-none"
        onMouseMove={(e) => handlePointerMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setHoveredIndex(null)}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            handlePointerMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
          }
        }}
        onTouchStart={(e) => {
          if (e.touches.length > 0) {
            handlePointerMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
          }
        }}
        onTouchEnd={() => setHoveredIndex(null)}
      >
        <svg
          className="h-full w-full overflow-visible"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          role="graphics-document"
          aria-label="Users and Audit line chart visualization"
        >
          <defs>
            {/* Subtle light ambient gradient backdrops (ultra-low opacity, non-distracting) */}
            <linearGradient id="activeLightGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="newLightGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="auditLightGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.07" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.00" />
            </linearGradient>

            {/* Subtle column highlight gradient for the active day */}
            <linearGradient id="selectedColGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines (Subtle & Crisp) */}
          <g>
            {gridTicks.map((ratio, idx) => {
              const y = paddingTop + plotHeight * (1 - ratio);
              return (
                <line
                  key={`grid-${idx}`}
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="1"
                  strokeDasharray={idx === 0 ? "none" : "3 3"}
                />
              );
            })}
          </g>

          {/* Y-Axis Numeric Labels */}
          {gridTicks.map((ratio, idx) => {
            const y = paddingTop + plotHeight * (1 - ratio);
            const val = Math.round(maxVal * ratio);
            return (
              <text
                key={`y-label-${idx}`}
                x={paddingLeft - 10}
                y={y + 3.5}
                className="text-[10px] fill-slate-400 dark:fill-slate-500 font-medium select-none"
                textAnchor="end"
              >
                {val}
              </text>
            );
          })}

          {/* Selected / Hovered Column Background Highlight */}
          {activeCoords[currentFocusedIdx] && (
            <g className="transition-all duration-150">
              <rect
                x={activeCoords[currentFocusedIdx].x - plotWidth / (points.length * 2)}
                y={paddingTop}
                width={plotWidth / points.length}
                height={plotHeight}
                rx={6}
                fill="url(#selectedColGrad)"
                className="pointer-events-none"
              />
              <line
                x1={activeCoords[currentFocusedIdx].x}
                y1={paddingTop}
                x2={activeCoords[currentFocusedIdx].x}
                y2={paddingTop + plotHeight}
                stroke="#94a3b8"
                className="dark:stroke-slate-600"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                opacity="0.85"
              />
            </g>
          )}

          {/* 1. Audit Logs Series (Refined Violet) */}
          {(activeSeries === "all" || activeSeries === "audit") && (
            <g className="transition-opacity duration-200">
              <path d={auditArea} fill="url(#auditLightGlow)" />
              <path
                d={auditPath}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-200"
              />
            </g>
          )}

          {/* 2. New Users Series (Emerald Green) */}
          {(activeSeries === "all" || activeSeries === "new") && (
            <g className="transition-opacity duration-200">
              <path d={newArea} fill="url(#newLightGlow)" />
              <path
                d={newPath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-200"
              />
            </g>
          )}

          {/* 3. Active Users Series (Cobalt Blue) */}
          {(activeSeries === "all" || activeSeries === "active") && (
            <g className="transition-opacity duration-200">
              <path d={activeArea} fill="url(#activeLightGlow)" />
              <path
                d={activePath}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-200"
              />
            </g>
          )}

          {/* Small Data Points: Audit Logs */}
          {(activeSeries === "all" || activeSeries === "audit") &&
            auditCoords.map((pt, idx) => {
              const isCurrent = currentFocusedIdx === idx;
              return (
                <g key={`aud-pt-${idx}`}>
                  {isCurrent && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill="#8b5cf6"
                      fillOpacity="0.22"
                      className="animate-pulse pointer-events-none"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isCurrent ? 5 : 3}
                    fill="#ffffff"
                    stroke="#8b5cf6"
                    strokeWidth={isCurrent ? 2.5 : 1.5}
                    className="transition-all duration-150 pointer-events-none dark:fill-slate-900"
                  />
                </g>
              );
            })}

          {/* Small Data Points: New Users */}
          {(activeSeries === "all" || activeSeries === "new") &&
            newCoords.map((pt, idx) => {
              const isCurrent = currentFocusedIdx === idx;
              return (
                <g key={`new-pt-${idx}`}>
                  {isCurrent && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill="#10b981"
                      fillOpacity="0.22"
                      className="animate-pulse pointer-events-none"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isCurrent ? 5 : 3}
                    fill="#ffffff"
                    stroke="#10b981"
                    strokeWidth={isCurrent ? 2.5 : 1.5}
                    className="transition-all duration-150 pointer-events-none dark:fill-slate-900"
                  />
                </g>
              );
            })}

          {/* Small Data Points: Active Users */}
          {(activeSeries === "all" || activeSeries === "active") &&
            activeCoords.map((pt, idx) => {
              const isCurrent = currentFocusedIdx === idx;
              return (
                <g key={`act-pt-${idx}`}>
                  {isCurrent && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill="#2563eb"
                      fillOpacity="0.22"
                      className="animate-pulse pointer-events-none"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isCurrent ? 5.5 : 3.5}
                    fill="#ffffff"
                    stroke="#2563eb"
                    strokeWidth={isCurrent ? 2.5 : 1.8}
                    className="transition-all duration-150 pointer-events-none dark:fill-slate-900"
                  />
                </g>
              );
            })}

          {/* Interactive Column Hit Slices for Seamless Pointer Capture */}
          {points.map((p, idx) => {
            const colWidth = plotWidth / Math.max(points.length - 1, 1);
            const x = paddingLeft + idx * colWidth - colWidth / 2;
            return (
              <rect
                key={`hit-col-${idx}`}
                x={x}
                y={0}
                width={colWidth}
                height={svgHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => {
                  setHoveredIndex(idx);
                  setActivePointIndex(idx);
                }}
                onClick={() => {
                  setActivePointIndex(idx);
                }}
              />
            );
          })}
        </svg>

        {/* X-Axis Day Labels */}
        <div className="mt-1 flex justify-between pl-11 pr-6 text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {points.map((pt, idx) => {
            const isSelected = currentFocusedIdx === idx;
            return (
              <button
                type="button"
                key={`day-${pt.day}-${idx}`}
                onClick={() => setActivePointIndex(idx)}
                onMouseEnter={() => setHoveredIndex(idx)}
                className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer select-none ${isSelected
                  ? "bg-blue-50 dark:bg-blue-950/70 font-bold text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20 shadow-2xs"
                  : "hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
              >
                {pt.day}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Compact Modern KPI Cards (Below the Chart) */}
      <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Total Active Sessions */}
        <div className="group relative rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-4 transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Active Sessions
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50">
              <North sx={{ fontSize: 10, strokeWidth: 2 }} />
              <span>+14.2%</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {metrics.totalActive}
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              sessions logged
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-700/40">
            <span>Peak: {Math.max(...points.map((p) => p.active))} on Sep 14</span>
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          </div>
        </div>

        {/* Card 2: New Registrations */}
        <div className="group relative rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-4 transition-all duration-200 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              New Registrations
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50">
              <North sx={{ fontSize: 10, strokeWidth: 2 }} />
              <span>+8.5%</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              +{metrics.totalNew}
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              new user signups
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-700/40">
            <span>Peak: +{Math.max(...points.map((p) => p.newUsers))} on Sep 14</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* Card 3: Audit Events Logged */}
        <div className="group relative rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 p-4 transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-800 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Audit Events Logged
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-900/50">
              <North sx={{ fontSize: 10, strokeWidth: 2 }} />
              <span>+5.1%</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {metrics.totalAudit}
            </span>
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              events recorded
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-700/40">
            <span>Peak: {Math.max(...points.map((p) => p.auditLogs ?? 0))} on Sep 14</span>
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          </div>
        </div>
      </div>

      {/* 5. Footer Action: "Explore full audit trail →" */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
        <Link
          to="/audit"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
        >
          <span>Explore full audit trail</span>
          <ArrowForward
            sx={{ fontSize: 14 }}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </Link>
      </div>
    </div>
  );
};
