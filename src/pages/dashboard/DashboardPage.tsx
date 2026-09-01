import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  MoreVert,
  North,
  CalendarTodayOutlined,
  KeyboardArrowDown,
  PersonOutline,
  ShieldOutlined,
  KeyOutlined,
  AssignmentOutlined,
  PersonAddOutlined,
  LoginOutlined,
  ArrowForward,
  Refresh,
  SecurityOutlined,
  WarningAmberOutlined,
  Search,
  SearchOff,
  Close,
  Check,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { dashboardService } from "../../api/dashboard.service";
import { useAuth } from "../../hooks/useAuth";
import { getProfileImageUrl } from "../../utils/image";
import type { DashboardSummaryResponse, DashboardChartPoint } from "../../types";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("7d");
  const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState<boolean>(false);
  const timeframeDropdownRef = useRef<HTMLDivElement>(null);
  const [headerTimeframeOpen, setHeaderTimeframeOpen] = useState<boolean>(false);
  const headerTimeframeRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChartPoint, setActiveChartPoint] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    series: "active" | "new" | "audit";
  } | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<"all" | "active" | "new" | "audit">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const timeframeLabels: Record<"7d" | "30d" | "90d", string> = {
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
  };

  const loadDashboard = useCallback(async (tf: "7d" | "30d" | "90d", isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await dashboardService.getSummary(tf);
      setSummary(data);
      if (data.chartData && data.chartData.length > 0) {
        setActiveChartPoint(data.chartData.length - 1);
      }
    } catch (err: any) {
      console.error("Failed to load dashboard summary:", err);
      setError(err?.message || "Failed to load dashboard statistics from database.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(timeframe);
  }, [timeframe, loadDashboard]);

  // Close timeframe dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        timeframeDropdownRef.current &&
        !timeframeDropdownRef.current.contains(event.target as Node)
      ) {
        setTimeframeDropdownOpen(false);
      }
      if (
        headerTimeframeRef.current &&
        !headerTimeframeRef.current.contains(event.target as Node)
      ) {
        setHeaderTimeframeOpen(false);
      }
    };

    if (timeframeDropdownOpen || headerTimeframeOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [timeframeDropdownOpen, headerTimeframeOpen]);

  // Helper to build dynamic SVG path coordinates for Area Chart
  const renderAreaChart = (points: DashboardChartPoint[]) => {
    if (!points || points.length === 0) return null;

    const width = 600;
    const height = 180;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 20;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(
      ...points.map((p) => Math.max(p.active, p.newUsers, p.auditLogs ?? 0)),
      10
    );

    // Generate coordinate pairs
    const activeCoords = points.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(points.length - 1, 1)) * plotWidth;
      const y = paddingTop + plotHeight - (p.active / maxVal) * plotHeight;
      return { x, y, data: p };
    });

    const newCoords = points.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(points.length - 1, 1)) * plotWidth;
      const y = paddingTop + plotHeight - (p.newUsers / maxVal) * plotHeight;
      return { x, y, data: p };
    });

    const auditCoords = points.map((p, idx) => {
      const x = paddingLeft + (idx / Math.max(points.length - 1, 1)) * plotWidth;
      const y = paddingTop + plotHeight - ((p.auditLogs ?? 0) / maxVal) * plotHeight;
      return { x, y, data: p };
    });

    // Smooth Bezier Curve Path Builder
    const buildPath = (coords: typeof activeCoords) => {
      if (coords.length === 0) return "";
      let d = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i];
        const p1 = coords[i + 1];
        const cx = (p0.x + p1.x) / 2;
        d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
      }
      return d;
    };

    const activeLineD = buildPath(activeCoords);
    const newLineD = buildPath(newCoords);
    const auditLineD = buildPath(auditCoords);

    const firstX = activeCoords[0]?.x || paddingLeft;
    const lastX = activeCoords[activeCoords.length - 1]?.x || width - paddingRight;
    const bottomY = paddingTop + plotHeight;

    const activeAreaD = `${activeLineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    const newAreaD = `${newLineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    const auditAreaD = `${auditLineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    const activeIdx =
      activeChartPoint !== null && activeChartPoint >= 0 && activeChartPoint < points.length
        ? activeChartPoint
        : points.length - 1;

    const displayIdx = hoveredPoint?.index ?? activeIdx;
    const displayPoint = points[displayIdx] || null;
    const hoveredSeries = hoveredPoint?.series;

    const showActive = selectedSeries === "all" || selectedSeries === "active";
    const showNew = selectedSeries === "all" || selectedSeries === "new";
    const showAudit = selectedSeries === "all" || selectedSeries === "audit";

    const handleChartPointerMove = (
      clientX: number,
      clientY: number,
      currentTarget: HTMLElement | SVGSVGElement
    ) => {
      const rect = currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || points.length <= 1) return;
      const relativeX = clientX - rect.left;
      const relativeY = clientY - rect.top;
      const svgX = (relativeX / rect.width) * width;
      const svgY = (relativeY / rect.height) * height;

      // 1. Find nearest X point index
      let closestIdx = 0;
      let minXDistance = Infinity;
      for (let i = 0; i < points.length; i++) {
        const ptX = paddingLeft + (i / (points.length - 1)) * plotWidth;
        const dist = Math.abs(svgX - ptX);
        if (dist < minXDistance) {
          minXDistance = dist;
          closestIdx = i;
        }
      }

      // 2. Find nearest series at closestIdx based on vertical distance
      const candidates: Array<{ series: "active" | "new" | "audit"; y: number }> = [];
      if (showActive && activeCoords[closestIdx])
        candidates.push({ series: "active", y: activeCoords[closestIdx].y });
      if (showNew && newCoords[closestIdx])
        candidates.push({ series: "new", y: newCoords[closestIdx].y });
      if (showAudit && auditCoords[closestIdx])
        candidates.push({ series: "audit", y: auditCoords[closestIdx].y });

      let closestSeries: "active" | "new" | "audit" = candidates[0]?.series || "active";
      let minYDistance = Infinity;
      for (const c of candidates) {
        const distY = Math.abs(svgY - c.y);
        if (distY < minYDistance) {
          minYDistance = distY;
          closestSeries = c.series;
        }
      }

      setHoveredPoint({ index: closestIdx, series: closestSeries });
      setActiveChartPoint(closestIdx);
    };

    // Calculate exact target coordinate for the floating tooltip
    const getHoveredCoordinates = () => {
      if (!hoveredPoint || !points[hoveredPoint.index]) return null;
      const idx = hoveredPoint.index;
      let targetX = activeCoords[idx]?.x ?? paddingLeft;
      let targetY = 20;

      if (hoveredPoint.series === "active" && activeCoords[idx]) {
        targetY = activeCoords[idx].y;
        targetX = activeCoords[idx].x;
      } else if (hoveredPoint.series === "new" && newCoords[idx]) {
        targetY = newCoords[idx].y;
        targetX = newCoords[idx].x;
      } else if (hoveredPoint.series === "audit" && auditCoords[idx]) {
        targetY = auditCoords[idx].y;
        targetX = auditCoords[idx].x;
      }

      const leftPercent = (targetX / width) * 100;
      const topPercent = (targetY / height) * 100;
      const isNearTop = targetY < 55;

      return { leftPercent, topPercent, isNearTop, targetX, targetY };
    };

    const tooltipPos = getHoveredCoordinates();

    return (
      <div className="relative mt-4 select-none">
        {/* Selected Data Tooltip Banner */}
        {displayPoint && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50/90 dark:bg-slate-800/90 px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 shadow-xs backdrop-blur-xs transition-all duration-150">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{displayPoint.day}</span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                • {hoveredPoint ? "Hovered point" : "Timeline snapshot"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-medium">
              <span
                className={`flex items-center gap-1.5 transition-all duration-150 ${
                  showActive
                    ? hoveredSeries
                      ? hoveredSeries === "active"
                        ? "opacity-100 font-bold scale-105"
                        : "opacity-40"
                      : "opacity-100"
                    : "opacity-30 line-through"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full bg-blue-600 transition-all ${
                    hoveredSeries === "active" ? "ring-4 ring-blue-500/40" : "ring-2 ring-blue-500/20"
                  }`}
                />
                <span>
                  Active Users:{" "}
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">{displayPoint.active}</strong>
                </span>
              </span>
              <span
                className={`flex items-center gap-1.5 transition-all duration-150 ${
                  showNew
                    ? hoveredSeries
                      ? hoveredSeries === "new"
                        ? "opacity-100 font-bold scale-105"
                        : "opacity-40"
                      : "opacity-100"
                    : "opacity-30 line-through"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full bg-emerald-500 transition-all ${
                    hoveredSeries === "new" ? "ring-4 ring-emerald-500/40" : "ring-2 ring-emerald-500/20"
                  }`}
                />
                <span>
                  New Users:{" "}
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">+{displayPoint.newUsers}</strong>
                </span>
              </span>
              <span
                className={`flex items-center gap-1.5 transition-all duration-150 ${
                  showAudit
                    ? hoveredSeries
                      ? hoveredSeries === "audit"
                        ? "opacity-100 font-bold scale-105"
                        : "opacity-40"
                      : "opacity-100"
                    : "opacity-30 line-through"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full bg-purple-500 transition-all ${
                    hoveredSeries === "audit" ? "ring-4 ring-purple-500/40" : "ring-2 ring-purple-500/20"
                  }`}
                />
                <span>
                  Audit Logs:{" "}
                  <strong className="text-purple-700 dark:text-purple-400 font-bold">
                    {displayPoint.auditLogs ?? 0}
                  </strong>
                </span>
              </span>
            </div>
          </div>
        )}

        <div
          className="relative h-64 w-full cursor-crosshair group"
          onMouseMove={(e) => handleChartPointerMove(e.clientX, e.clientY, e.currentTarget)}
          onMouseLeave={() => setHoveredPoint(null)}
          onTouchMove={(e) => {
            if (e.touches.length > 0) {
              handleChartPointerMove(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
            }
          }}
          onTouchStart={(e) => {
            if (e.touches.length > 0) {
              handleChartPointerMove(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
            }
          }}
          onTouchEnd={() => setHoveredPoint(null)}
        >
          {/* Floating Live Tooltip - ONLY shows when hovering a point and ONLY shows that point's metric */}
          {hoveredPoint && tooltipPos && (
            <div
              className="absolute z-30 pointer-events-none transition-all duration-75 ease-out"
              style={{
                left: `${tooltipPos.leftPercent}%`,
                top: tooltipPos.isNearTop
                  ? `calc(${tooltipPos.topPercent}% + 14px)`
                  : `calc(${tooltipPos.topPercent}% - 14px)`,
                transform: `${
                  tooltipPos.leftPercent < 18
                    ? "translateX(4px)"
                    : tooltipPos.leftPercent > 82
                    ? "translateX(calc(-100% - 4px))"
                    : "translateX(-50%)"
                } ${tooltipPos.isNearTop ? "translateY(0%)" : "translateY(-100%)"}`,
              }}
            >
              {hoveredPoint.series === "active" && (
                <div className="rounded-xl border border-blue-500/40 bg-slate-900/95 text-white px-3.5 py-2 text-xs shadow-2xl backdrop-blur-md min-w-[130px] ring-2 ring-blue-500/20">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1 mb-1.5">
                    <span className="font-bold text-slate-100">{points[hoveredPoint.index].day}</span>
                    <span className="text-[10px] font-semibold text-blue-400">Active</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-400/40" />
                      <span>Active Users</span>
                    </span>
                    <span className="font-extrabold text-blue-400 text-sm">{points[hoveredPoint.index].active}</span>
                  </div>
                </div>
              )}

              {hoveredPoint.series === "new" && (
                <div className="rounded-xl border border-emerald-500/40 bg-slate-900/95 text-white px-3.5 py-2 text-xs shadow-2xl backdrop-blur-md min-w-[130px] ring-2 ring-emerald-500/20">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1 mb-1.5">
                    <span className="font-bold text-slate-100">{points[hoveredPoint.index].day}</span>
                    <span className="text-[10px] font-semibold text-emerald-400">New</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-400/40" />
                      <span>New Users</span>
                    </span>
                    <span className="font-extrabold text-emerald-400 text-sm">+{points[hoveredPoint.index].newUsers}</span>
                  </div>
                </div>
              )}

              {hoveredPoint.series === "audit" && (
                <div className="rounded-xl border border-purple-500/40 bg-slate-900/95 text-white px-3.5 py-2 text-xs shadow-2xl backdrop-blur-md min-w-[130px] ring-2 ring-purple-500/20">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1 mb-1.5">
                    <span className="font-bold text-slate-100">{points[hoveredPoint.index].day}</span>
                    <span className="text-[10px] font-semibold text-purple-400">Audit</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-purple-500 ring-2 ring-purple-400/40" />
                      <span>Audit Logs</span>
                    </span>
                    <span className="font-extrabold text-purple-400 text-sm">{points[hoveredPoint.index].auditLogs ?? 0}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="newGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="auditGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            <g>
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = paddingTop + plotHeight * (1 - ratio);
                return (
                  <line
                    key={idx}
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth="1"
                    strokeDasharray={idx === 0 ? "none" : "2 2"}
                  />
                );
              })}
            </g>

            {/* Y-Axis Numeric Labels */}
            {[0, 0.5, 1].map((ratio, idx) => {
              const y = paddingTop + plotHeight * (1 - ratio);
              const val = Math.round(maxVal * ratio);
              return (
                <text
                  key={idx}
                  x={paddingLeft - 8}
                  y={y + 3}
                  className="text-[10px] fill-slate-400 dark:fill-slate-500 text-right font-medium"
                  textAnchor="end"
                >
                  {val}
                </text>
              );
            })}

            {/* Area Fill & Line: Audit Logs (Purple) */}
            {showAudit && (
              <>
                <path d={auditAreaD} fill="url(#auditGradient)" className="transition-all duration-300" />
                <path
                  d={auditLineD}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </>
            )}

            {/* Area Fill & Line: New Users (Emerald) */}
            {showNew && (
              <>
                <path d={newAreaD} fill="url(#newGradient)" className="transition-all duration-300" />
                <path
                  d={newLineD}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </>
            )}

            {/* Area Fill & Line: Active Users (Blue) */}
            {showActive && (
              <>
                <path d={activeAreaD} fill="url(#activeGradient)" className="transition-all duration-300" />
                <path
                  d={activeLineD}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              </>
            )}

            {/* Vertical Guide Line on Active Point */}
            {hoveredPoint !== null && activeCoords[hoveredPoint.index] && (
              <line
                x1={activeCoords[hoveredPoint.index].x}
                y1={paddingTop}
                x2={activeCoords[hoveredPoint.index].x}
                y2={paddingTop + plotHeight}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />
            )}

            {/* Full-coverage Column Hit Areas with zero dead zones */}
            {points.map((point, idx) => {
              const sliceWidth = plotWidth / Math.max(points.length - 1, 1);
              const xCenter = paddingLeft + idx * sliceWidth;
              const xLeft = idx === 0 ? paddingLeft - 8 : xCenter - sliceWidth / 2;
              const colWidth =
                idx === 0 || idx === points.length - 1 ? sliceWidth / 2 + 8 : sliceWidth;

              return (
                <rect
                  key={`hit-${point.day}-${idx}`}
                  x={xLeft}
                  y={0}
                  width={colWidth}
                  height={height}
                  fill="#000000"
                  opacity="0"
                  style={{ cursor: "pointer", pointerEvents: "all" }}
                  onMouseEnter={() => {
                    setActiveChartPoint(idx);
                    setHoveredPoint((prev) => ({
                      index: idx,
                      series: prev?.series || "active",
                    }));
                  }}
                  onClick={() => {
                    setActiveChartPoint(idx);
                    setHoveredPoint((prev) => ({
                      index: idx,
                      series: prev?.series || "active",
                    }));
                  }}
                />
              );
            })}

            {/* Circle dots for Audit Logs */}
            {showAudit &&
              auditCoords.map((pt, idx) => {
                const isHovered = hoveredPoint?.index === idx && hoveredPoint?.series === "audit";
                return (
                  <g key={`aud-group-${idx}`}>
                    {/* Glowing Ring when hovered */}
                    {isHovered && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="11"
                        fill="#8b5cf6"
                        fillOpacity="0.35"
                        className="pointer-events-none animate-pulse"
                      />
                    )}
                    {/* Visible Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 7 : activeIdx === idx ? 5 : 3.5}
                      fill="#8b5cf6"
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      className="pointer-events-none transition-all duration-150"
                    />
                    {/* Transparent Hit target */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="14"
                      fill="#000000"
                      opacity="0"
                      className="cursor-pointer"
                      style={{ pointerEvents: "all" }}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        setHoveredPoint({ index: idx, series: "audit" });
                        setActiveChartPoint(idx);
                      }}
                      onClick={() => {
                        setHoveredPoint({ index: idx, series: "audit" });
                        setActiveChartPoint(idx);
                      }}
                    />
                  </g>
                );
              })}

            {/* Circle dots for New Users */}
            {showNew &&
              newCoords.map((pt, idx) => {
                const isHovered = hoveredPoint?.index === idx && hoveredPoint?.series === "new";
                return (
                  <g key={`new-group-${idx}`}>
                    {/* Glowing Ring when hovered */}
                    {isHovered && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="11"
                        fill="#10b981"
                        fillOpacity="0.35"
                        className="pointer-events-none animate-pulse"
                      />
                    )}
                    {/* Visible Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 7 : activeIdx === idx ? 5 : 3.5}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      className="pointer-events-none transition-all duration-150"
                    />
                    {/* Transparent Hit target */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="14"
                      fill="#000000"
                      opacity="0"
                      className="cursor-pointer"
                      style={{ pointerEvents: "all" }}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        setHoveredPoint({ index: idx, series: "new" });
                        setActiveChartPoint(idx);
                      }}
                      onClick={() => {
                        setHoveredPoint({ index: idx, series: "new" });
                        setActiveChartPoint(idx);
                      }}
                    />
                  </g>
                );
              })}

            {/* Circle dots for Active Users */}
            {showActive &&
              activeCoords.map((pt, idx) => {
                const isHovered = hoveredPoint?.index === idx && hoveredPoint?.series === "active";
                return (
                  <g key={`act-group-${idx}`}>
                    {/* Glowing Ring when hovered */}
                    {isHovered && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="11"
                        fill="#2563eb"
                        fillOpacity="0.35"
                        className="pointer-events-none animate-pulse"
                      />
                    )}
                    {/* Visible Dot */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 7.5 : activeIdx === idx ? 5.5 : 4}
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      className="pointer-events-none transition-all duration-150"
                    />
                    {/* Transparent Hit target */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="14"
                      fill="#000000"
                      opacity="0"
                      className="cursor-pointer"
                      style={{ pointerEvents: "all" }}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        setHoveredPoint({ index: idx, series: "active" });
                        setActiveChartPoint(idx);
                      }}
                      onClick={() => {
                        setHoveredPoint({ index: idx, series: "active" });
                        setActiveChartPoint(idx);
                      }}
                    />
                  </g>
                );
              })}
          </svg>

          {/* X-Axis Day Labels */}
          <div className="mt-2 flex justify-between pl-10 pr-4 text-[11px] font-medium text-slate-400 dark:text-slate-500 overflow-x-auto">
            {points.map((d, i) => (
              <button
                type="button"
                key={d.day + i}
                className={`cursor-pointer transition-all whitespace-nowrap px-1.5 py-0.5 rounded-md ${
                  displayIdx === i
                    ? "font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 shadow-2xs"
                    : "hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
                }`}
                onMouseEnter={() => {
                  setActiveChartPoint(i);
                  setHoveredPoint((prev) => ({
                    index: i,
                    series: prev?.series || "active",
                  }));
                }}
                onClick={() => {
                  setActiveChartPoint(i);
                  setHoveredPoint((prev) => ({
                    index: i,
                    series: prev?.series || "active",
                  }));
                }}
              >
                {d.day}
              </button>
            ))}
          </div>
        </div>

        {/* Quick KPI Summary Footnote inside Card */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {points.reduce((acc, p) => acc + p.active, 0)}
              </span>
              <span>Total Active Sessions</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{points.reduce((acc, p) => acc + p.newUsers, 0)}
              </span>
              <span>New Registrations</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {points.reduce((acc, p) => acc + (p.auditLogs ?? 0), 0)}
              </span>
              <span>Audit Events Logged</span>
            </span>
          </div>
          <Link
            to="/audit"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
          >
            <span>Explore full audit trail</span>
            <ArrowForward sx={{ fontSize: 13 }} />
          </Link>
        </div>
      </div>
    );
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_create":
        return <PersonAddOutlined sx={{ fontSize: 18 }} />;
      case "role_update":
        return <ShieldOutlined sx={{ fontSize: 18 }} />;
      case "permission_change":
        return <KeyOutlined sx={{ fontSize: 18 }} />;
      case "user_login":
        return <LoginOutlined sx={{ fontSize: 18 }} />;
      default:
        return <SecurityOutlined sx={{ fontSize: 18 }} />;
    }
  };

  const q = searchQuery.toLowerCase().trim();

  // 1. KPI Cards Matchers
  const matchTotalUsers =
    !q ||
    [
      "total users",
      "users",
      "user",
      "active members",
      "members",
      "growth",
      "user growth",
      "30-day user growth",
      String(summary?.kpis.totalUsers ?? ""),
      String(summary?.kpis.activeUsers ?? ""),
      String(summary?.kpis.usersGrowth ?? ""),
    ].some((term) => term.toLowerCase().includes(q));

  const matchTotalRoles =
    !q ||
    [
      "total roles",
      "roles",
      "role",
      "rbac",
      "role matrix",
      "matrix",
      "configured hierarchies",
      "hierarchies",
      "hierarchy",
      String(summary?.kpis.totalRoles ?? ""),
      String(summary?.kpis.rolesGrowth ?? ""),
    ].some((term) => term.toLowerCase().includes(q));

  const matchPermissions =
    !q ||
    [
      "permissions",
      "permission",
      "granular access keys",
      "access keys",
      "access",
      "privilege",
      "privilege matrix",
      "keys",
      "active privilege matrix",
      String(summary?.kpis.totalPermissions ?? ""),
      String(summary?.kpis.permissionsGrowth ?? ""),
    ].some((term) => term.toLowerCase().includes(q));

  const matchActiveSessions =
    !q ||
    [
      "active sessions",
      "sessions",
      "session",
      "jwt",
      "live jwt",
      "authenticated",
      "concurrency",
      "real-time concurrency",
      "live",
      String(summary?.kpis.activeSessions ?? ""),
      String(summary?.kpis.sessionsGrowth ?? ""),
    ].some((term) => term.toLowerCase().includes(q));

  // 2. Charts Cards Matchers
  const matchUsersOverview =
    !q ||
    [
      "users overview",
      "users & audit overview",
      "audit",
      "audit logs",
      "audit log",
      "audit events",
      "audit trail",
      "overview",
      "chart",
      "area chart",
      "active users",
      "new users",
      "user growth",
      "analytics",
      "timeline",
      "trend",
      timeframeLabels[timeframe],
      ...(summary?.chartData?.map((p) => p.day) || []),
    ].some((term) => term.toLowerCase().includes(q));

  const matchUsersByRole =
    !q ||
    [
      "users by role",
      "roles",
      "role",
      "donut",
      "donut chart",
      "distribution",
      "breakdown",
      ...(summary?.roleDistribution?.map((r) => r.name) || []),
    ].some((term) => term.toLowerCase().includes(q));

  // 3. Lists Cards Matchers
  const isRecentUsersCardExplicit =
    !q ||
    [
      "recent users",
      "user directory",
      "users",
      "user",
      "table",
      "live db",
    ].some((term) => term.toLowerCase().includes(q));

  const filteredRecentUsers = !q
    ? (summary?.recentUsers || [])
    : isRecentUsersCardExplicit
    ? (summary?.recentUsers || [])
    : (summary?.recentUsers || []).filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.role?.toLowerCase().includes(q) ||
          u.status?.toLowerCase().includes(q) ||
          u.lastLogin?.toLowerCase().includes(q)
      );

  const matchRecentUsers =
    !q || isRecentUsersCardExplicit || filteredRecentUsers.length > 0;

  const isRecentActivityCardExplicit =
    !q ||
    [
      "recent activity",
      "activity",
      "activities",
      "system feed",
      "feed",
      "audit",
      "logs",
      "trail",
      "events",
    ].some((term) => term.toLowerCase().includes(q));

  const filteredRecentActivities = !q
    ? (summary?.recentActivities || [])
    : isRecentActivityCardExplicit
    ? (summary?.recentActivities || [])
    : (summary?.recentActivities || []).filter(
        (act) =>
          act.title?.toLowerCase().includes(q) ||
          act.author?.toLowerCase().includes(q) ||
          act.actionText?.toLowerCase().includes(q) ||
          act.type?.toLowerCase().includes(q) ||
          act.time?.toLowerCase().includes(q)
      );

  const matchRecentActivity =
    !q || isRecentActivityCardExplicit || filteredRecentActivities.length > 0;

  // Total visible cards calculation
  const visibleKpiCount =
    (matchTotalUsers ? 1 : 0) +
    (matchTotalRoles ? 1 : 0) +
    (matchPermissions ? 1 : 0) +
    (matchActiveSessions ? 1 : 0);

  const visibleChartCount =
    (matchUsersOverview ? 1 : 0) + (matchUsersByRole ? 1 : 0);

  const visibleListCount =
    (matchRecentUsers ? 1 : 0) + (matchRecentActivity ? 1 : 0);

  const totalVisibleCards =
    visibleKpiCount + visibleChartCount + visibleListCount;

  return (
    <WorkspaceLayout
      permission="dashboard.view"
      label="Dashboard"
      showHero={false}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search dashboard cards, metrics, users..."
    >
      <div className="w-full min-h-screen bg-slate-50/50 dark:bg-[#0b0f19] px-4 py-6 sm:px-8 space-y-6">
        {/* Header Title & Date Range / Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <Link to="/profile" className="shrink-0 group block" title="Go to profile">
              <img
                src={getProfileImageUrl(user?.profileImage, user?.name || "Administrator")}
                alt={user?.name || "User avatar"}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-blue-500/20 group-hover:ring-blue-500 shadow-sm transition-all"
              />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Welcome back, {user?.name || "Administrator"}
                </h1>
                {user?.roleName && (
                  <span className="hidden sm:inline-block rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900">
                    {user.roleName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Workspace administration & live system controls overview
              </p>
            </div>
          </div>

          {/* Inline Search Bar, Date Picker & Live Refresh Button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick in-page Search Input */}
            <div className="relative w-full sm:w-60">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search sx={{ fontSize: 16 }} />
              </div>
              <input
                type="text"
                placeholder="Search dashboard cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-8 pr-8 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <Close sx={{ fontSize: 15 }} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => loadDashboard(timeframe, true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60"
              title="Refresh database metrics"
            >
              <Refresh
                sx={{ fontSize: 16, color: "#64748b" }}
                className={refreshing ? "animate-spin text-blue-600" : ""}
              />
              <span>{refreshing ? "Syncing..." : "Refresh"}</span>
            </button>

            {/* Header Timeframe Dropdown */}
            <div className="relative" ref={headerTimeframeRef}>
              <button
                type="button"
                onClick={() => setHeaderTimeframeOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold shadow-2xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  headerTimeframeOpen
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
                aria-haspopup="listbox"
                aria-expanded={headerTimeframeOpen}
              >
                <CalendarTodayOutlined
                  sx={{ fontSize: 16, color: headerTimeframeOpen ? "#2563eb" : "#64748b" }}
                />
                <span>{summary?.dateRangeDescription || timeframeLabels[timeframe]}</span>
                <KeyboardArrowDown
                  sx={{ fontSize: 16 }}
                  className={`transition-transform duration-200 ${
                    headerTimeframeOpen ? "rotate-180 text-blue-600" : "text-slate-400"
                  }`}
                />
              </button>

              {headerTimeframeOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-xl shadow-slate-900/10 dark:shadow-black/40 z-30 animate-fadeIn"
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Select Range
                  </div>
                  {(
                    [
                      { value: "7d", label: "Last 7 Days", desc: "Past 1 week" },
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
                          setTimeframe(opt.value);
                          setHeaderTimeframeOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-700/60"
                        }`}
                      >
                        <div>
                          <span className="block leading-tight">{opt.label}</span>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                            {opt.desc}
                          </span>
                        </div>
                        {isSelected && (
                          <Check sx={{ fontSize: 16 }} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 p-4 text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center gap-2">
              <WarningAmberOutlined sx={{ fontSize: 18 }} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadDashboard(timeframe)}
              className="font-bold underline hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Active Search Results Feedback Banner */}
        {q && totalVisibleCards > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Search sx={{ fontSize: 18, color: "#6366f1" }} />
              <span>
                Showing <strong>{totalVisibleCards}</strong> of <strong>8</strong> dashboard cards matching{" "}
                <span className="rounded-md bg-white dark:bg-slate-900 px-2 py-0.5 font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Close sx={{ fontSize: 15 }} />
              <span>Clear Filter</span>
            </button>
          </div>
        )}

        {/* Empty State when no cards match search */}
        {totalVisibleCards === 0 && (
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-xs">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <SearchOff sx={{ fontSize: 32 }} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">
              No dashboard cards match &ldquo;{searchQuery}&rdquo;
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              We couldn&apos;t find any KPI metrics, analytical charts, users, or recent activity matching your search criteria.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span>Suggested searches:</span>
              {["Users", "Roles", "Permissions", "Sessions", "Overview", "Activity"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(tag)}
                  className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 1. Top KPI Metric Cards Grid - rendered only when matching */}
        {visibleKpiCount > 0 && (
          <div
            className={`grid grid-cols-1 gap-5 ${
              visibleKpiCount === 1
                ? "sm:grid-cols-1 md:max-w-md"
                : visibleKpiCount === 2
                ? "sm:grid-cols-2"
                : visibleKpiCount === 3
                ? "sm:grid-cols-2 lg:grid-cols-3"
                : "sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {/* Card 1: Total Users */}
            {matchTotalUsers && (
              <div className="relative overflow-hidden rounded-2xl border border-purple-200/70 dark:border-purple-900/60 bg-gradient-to-br from-purple-500/10 via-white to-white dark:from-purple-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                      Total Users
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                        {loading && !summary ? "..." : summary?.kpis.totalUsers ?? 0}
                      </span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
                        <North sx={{ fontSize: 13, strokeWidth: 2 }} />
                        <span>{summary?.kpis.usersGrowth || "+12.5%"}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {summary?.kpis.activeUsers ?? 0} active members
                    </p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-purple-500 text-white shadow-md shadow-purple-500/25">
                    <PersonOutline sx={{ fontSize: 24 }} />
                  </div>
                </div>
                {/* Mini Sparkline Purple */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-purple-100/60 dark:border-purple-900/40">
                  <span className="text-[10px] font-medium text-purple-600/80 dark:text-purple-400/80">
                    30-day user growth
                  </span>
                  <svg className="h-5 w-20 overflow-visible" viewBox="0 0 80 24" fill="none">
                    <path
                      d="M0 16 C 15 14, 25 22, 40 10 C 55 0, 65 18, 80 8"
                      stroke="#a855f7"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Card 2: Total Roles */}
            {matchTotalRoles && (
              <div className="relative overflow-hidden rounded-2xl border border-blue-200/70 dark:border-blue-900/60 bg-gradient-to-br from-blue-500/10 via-white to-white dark:from-blue-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                      Total Roles
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                        {loading && !summary ? "..." : summary?.kpis.totalRoles ?? 0}
                      </span>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center">
                        <North sx={{ fontSize: 13, strokeWidth: 2 }} />
                        <span>{summary?.kpis.rolesGrowth || "+5.2%"}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">RBAC role matrix</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-500 text-white shadow-md shadow-blue-500/25">
                    <ShieldOutlined sx={{ fontSize: 24 }} />
                  </div>
                </div>
                {/* Mini Sparkline Blue */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-blue-100/60 dark:border-blue-900/40">
                  <span className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80">
                    Configured hierarchies
                  </span>
                  <svg className="h-5 w-20 overflow-visible" viewBox="0 0 80 24" fill="none">
                    <path
                      d="M0 18 C 20 20, 30 16, 45 14 C 60 12, 65 6, 80 8"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Card 3: Permissions */}
            {matchPermissions && (
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Permissions
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                        {loading && !summary ? "..." : summary?.kpis.totalPermissions ?? 0}
                      </span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
                        <North sx={{ fontSize: 13, strokeWidth: 2 }} />
                        <span>{summary?.kpis.permissionsGrowth || "+8.7%"}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Granular access keys</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                    <KeyOutlined sx={{ fontSize: 24 }} />
                  </div>
                </div>
                {/* Mini Sparkline Emerald */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-emerald-100/60 dark:border-emerald-900/40">
                  <span className="text-[10px] font-medium text-emerald-600/80 dark:text-emerald-400/80">
                    Active privilege matrix
                  </span>
                  <svg className="h-5 w-20 overflow-visible" viewBox="0 0 80 24" fill="none">
                    <path
                      d="M0 18 C 15 16, 25 22, 40 16 C 55 10, 65 14, 80 8"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Card 4: Active Sessions */}
            {matchActiveSessions && (
              <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-900/60 bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      Active Sessions
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                        {loading && !summary ? "..." : summary?.kpis.activeSessions ?? 0}
                      </span>
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center">
                        <North sx={{ fontSize: 13, strokeWidth: 2 }} />
                        <span>{summary?.kpis.sessionsGrowth || "+3.1%"}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Live JWT authenticated</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/25">
                    <AssignmentOutlined sx={{ fontSize: 24 }} />
                  </div>
                </div>
                {/* Mini Sparkline Amber */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-amber-100/60 dark:border-amber-900/40">
                  <span className="text-[10px] font-medium text-amber-600/80 dark:text-amber-400/80">
                    Real-time concurrency
                  </span>
                  <svg className="h-5 w-20 overflow-visible" viewBox="0 0 80 24" fill="none">
                    <path
                      d="M0 16 C 15 14, 25 20, 40 14 C 55 8, 65 18, 80 14"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Middle Row: Dynamic Charts Section */}
        {visibleChartCount > 0 && (
          <div
            className={`grid grid-cols-1 gap-6 ${
              visibleChartCount === 2 ? "lg:grid-cols-3" : "lg:grid-cols-1"
            }`}
          >
            {/* Left Chart: Users Overview */}
            {matchUsersOverview && (
              <div
                className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs ${
                  visibleChartCount === 2 ? "lg:col-span-2" : "w-full"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Users & Audit Overview
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Active logins, registrations & audit activity trail
                      </p>
                    </div>

                    {/* Interactive Series Filter Toggles */}
                    <div className="flex items-center gap-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 p-1 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <button
                        type="button"
                        onClick={() => setSelectedSeries("all")}
                        className={`rounded-lg px-2 py-1 font-medium transition-all cursor-pointer ${
                          selectedSeries === "all"
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSeries("active")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-all cursor-pointer ${
                          selectedSeries === "active"
                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:text-blue-600"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                        <span>Active</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSeries("new")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-all cursor-pointer ${
                          selectedSeries === "new"
                            ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:text-emerald-600"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>New</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSeries("audit")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-all cursor-pointer ${
                          selectedSeries === "audit"
                            ? "bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs font-semibold"
                            : "text-slate-600 dark:text-slate-400 hover:text-purple-600"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-purple-500" />
                        <span>Audit Logs</span>
                      </button>
                    </div>
                  </div>

                  {/* Timeframe Selector Dropdown */}
                  <div className="relative self-start sm:self-auto" ref={timeframeDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setTimeframeDropdownOpen((prev) => !prev)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        timeframeDropdownOpen
                          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold"
                          : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                      aria-haspopup="listbox"
                      aria-expanded={timeframeDropdownOpen}
                    >
                      <CalendarTodayOutlined
                        sx={{ fontSize: 13, color: timeframeDropdownOpen ? "#2563eb" : "#94a3b8" }}
                      />
                      <span>{timeframeLabels[timeframe]}</span>
                      <KeyboardArrowDown
                        sx={{ fontSize: 16 }}
                        className={`transition-transform duration-200 ${
                          timeframeDropdownOpen ? "rotate-180 text-blue-600" : "text-slate-400"
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
                            { value: "7d", label: "Last 7 Days", desc: "Past 1 week" },
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
                                setTimeframe(opt.value);
                                setTimeframeDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-700/60"
                              }`}
                            >
                              <div>
                                <span className="block leading-tight">{opt.label}</span>
                                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                                  {opt.desc}
                                </span>
                              </div>
                              {isSelected && (
                                <Check sx={{ fontSize: 16 }} className="text-blue-600 dark:text-blue-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dynamic Interactive SVG Chart */}
                {summary?.chartData ? (
                  renderAreaChart(summary.chartData)
                ) : (
                  <div className="flex h-64 items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                    Loading live chart data...
                  </div>
                )}
              </div>
            )}

            {/* Right Chart: Users by Role (Donut Chart) */}
            {matchUsersByRole && (
              <div
                className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs flex flex-col justify-between ${
                  visibleChartCount === 2 ? "lg:col-span-1" : "w-full max-w-2xl"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Users by Role</h3>
                    <Link
                      to="/roles"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label="View all roles"
                    >
                      <MoreVert sx={{ fontSize: 18 }} />
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-6">
                    {/* Dynamic Donut Chart SVG */}
                    <div className="relative grid h-44 w-44 place-items-center shrink-0">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
                        {/* Background Track */}
                        <circle
                          cx="100"
                          cy="100"
                          r="68"
                          fill="none"
                          stroke="#f1f5f9"
                          className="dark:stroke-slate-800"
                          strokeWidth="28"
                        />

                        {/* Role Circles */}
                        {summary?.roleDistribution?.map((roleItem) => (
                          <circle
                            key={roleItem.name + roleItem.roleId}
                            cx="100"
                            cy="100"
                            r="68"
                            fill="none"
                            stroke={roleItem.color}
                            strokeWidth="28"
                            strokeDasharray={roleItem.strokeDash}
                            strokeDashoffset={roleItem.strokeOffset}
                            className="transition-all duration-500"
                          />
                        ))}
                      </svg>

                      {/* Center Text inside Donut */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-none">
                          {summary?.kpis.activeUsers ?? summary?.kpis.totalUsers ?? 0}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">
                          Active Users
                        </span>
                      </div>
                    </div>

                    {/* Roles Breakdown Legend from Database */}
                    <div className="flex-1 space-y-2.5 w-full">
                      {summary?.roleDistribution && summary.roleDistribution.length > 0 ? (
                        summary.roleDistribution.map((item) => (
                          <div
                            key={item.name + item.roleId}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span
                                className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[110px]"
                                title={item.name}
                              >
                                {item.name}
                              </span>
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                              {item.count}{" "}
                              <span className="font-normal text-slate-400 dark:text-slate-500">
                                ({item.percentage})
                              </span>
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">
                          No roles configured in database.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Bottom Row: Recent Users & Recent Activity Cards Grid */}
        {visibleListCount > 0 && (
          <div
            className={`grid grid-cols-1 gap-6 ${
              visibleListCount === 2 ? "lg:grid-cols-2" : "lg:grid-cols-1"
            }`}
          >
            {/* Left Card: Recent Users Table */}
            {matchRecentUsers && (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs flex flex-col justify-between w-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Users</h3>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {q && !isRecentUsersCardExplicit
                          ? `${filteredRecentUsers.length} matched`
                          : ""}
                      </span>
                    </div>
                    <Link
                      to="/users"
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <th className="pb-3 font-semibold">USER</th>
                          <th className="pb-3 font-semibold">ROLE</th>
                          <th className="pb-3 font-semibold">STATUS</th>
                          <th className="pb-3 font-semibold">LAST LOGIN</th>
                          <th className="pb-3 font-semibold text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                        {filteredRecentUsers.length > 0 ? (
                          filteredRecentUsers.slice(0, 5).map((userItem) => (
                            <tr
                              key={userItem.id}
                              className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <td className="py-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={userItem.avatar}
                                    alt={userItem.name}
                                    className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                                  />
                                  <div>
                                    <span className="block font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                      {userItem.name}
                                    </span>
                                    <span className="block text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
                                      {userItem.email}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3">
                                <span
                                  className={`inline-block rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${userItem.roleBadge}`}
                                >
                                  {userItem.role}
                                </span>
                              </td>
                              <td className="py-3">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`h-2 w-2 rounded-full ${
                                      userItem.status === "Active" ? "bg-emerald-500" : "bg-rose-500"
                                    }`}
                                  />
                                  <span
                                    className={`font-medium ${
                                      userItem.status === "Active"
                                        ? "text-slate-700 dark:text-slate-300"
                                        : "text-slate-500 dark:text-slate-400"
                                    }`}
                                  >
                                    {userItem.status}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap text-xs">
                                {userItem.lastLogin === "Active now" ||
                                userItem.lastLogin?.toLowerCase().includes("active") ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {userItem.lastLogin}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 font-normal">
                                    {userItem.lastLogin || "Never"}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-right">
                                <Link
                                  to="/users"
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                  aria-label="User actions"
                                >
                                  <MoreVert sx={{ fontSize: 18 }} />
                                </Link>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-8 text-center text-xs text-slate-400 dark:text-slate-500"
                            >
                              {loading
                                ? "Loading users from database..."
                                : "No matching users found."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to="/users"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                  >
                    <span>View all users directory</span>
                    <ArrowForward sx={{ fontSize: 14 }} />
                  </Link>
                </div>
              </div>
            )}

            {/* Right Card: Recent Activity */}
            {matchRecentActivity && (
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs flex flex-col justify-between w-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Activity</h3>
                      <span className="rounded-full bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                        {q && !isRecentActivityCardExplicit
                          ? `${filteredRecentActivities.length} matched`
                          : "System Feed"}
                      </span>
                    </div>
                    <Link
                      to="/audit"
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="space-y-3.5">
                    {filteredRecentActivities.length > 0 ? (
                      filteredRecentActivities.map((act) => (
                        <div
                          key={act.id}
                          className="flex items-center justify-between gap-3 p-1.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${act.iconBg}`}
                            >
                              {getActivityIcon(act.type)}
                            </div>
                            <div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                                {act.title}
                              </p>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                {act.author} {act.actionText ? `· ${act.actionText}` : ""}
                              </span>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {act.time}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                        {loading
                          ? "Loading recent system events..."
                          : "No matching activity recorded."}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to="/audit"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
                  >
                    <span>View audit trail and security logs</span>
                    <ArrowForward sx={{ fontSize: 14 }} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};

export default DashboardPage;
