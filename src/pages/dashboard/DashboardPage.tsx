import React, { useState, useEffect, useCallback } from "react";
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
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { dashboardService } from "../../api/dashboard.service";
import { useAuth } from "../../hooks/useAuth";
import type { DashboardSummaryResponse, DashboardChartPoint } from "../../types";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("7d");
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChartPoint, setActiveChartPoint] = useState<number | null>(null);

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

  const handleTimeframeToggle = () => {
    const next: "7d" | "30d" | "90d" =
      timeframe === "7d" ? "30d" : timeframe === "30d" ? "90d" : "7d";
    setTimeframe(next);
  };

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
      ...points.map((p) => Math.max(p.active, p.newUsers)),
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

    const firstX = activeCoords[0]?.x || paddingLeft;
    const lastX = activeCoords[activeCoords.length - 1]?.x || width - paddingRight;
    const bottomY = paddingTop + plotHeight;

    const activeAreaD = `${activeLineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    const newAreaD = `${newLineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    const activePoint =
      activeChartPoint !== null && activeChartPoint < points.length
        ? points[activeChartPoint]
        : null;

    return (
      <div className="relative mt-6 select-none">
        {/* Selected Data Tooltip Banner */}
        {activePoint && (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{activePoint.day}</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                <span>Active: <strong className="text-slate-900 dark:text-slate-100">{activePoint.active}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>New: <strong className="text-slate-900 dark:text-slate-100">{activePoint.newUsers}</strong></span>
              </span>
            </div>
          </div>
        )}

        <div className="relative h-64 w-full">
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

            {/* Area Fill: New Users */}
            <path d={newAreaD} fill="url(#newGradient)" />
            {/* Line: New Users */}
            <path d={newLineD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

            {/* Area Fill: Active Users */}
            <path d={activeAreaD} fill="url(#activeGradient)" />
            {/* Line: Active Users */}
            <path d={activeLineD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />

            {/* Circle dots for New Users */}
            {newCoords.map((pt, idx) => (
              <circle
                key={`n-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={activeChartPoint === idx ? 5 : 3.5}
                fill="#10b981"
                className="cursor-pointer transition-all hover:scale-125"
                onMouseEnter={() => setActiveChartPoint(idx)}
                onClick={() => setActiveChartPoint(idx)}
              />
            ))}

            {/* Circle dots for Active Users */}
            {activeCoords.map((pt, idx) => (
              <circle
                key={`a-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r={activeChartPoint === idx ? 5.5 : 4}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth="1.5"
                className="cursor-pointer transition-all hover:scale-125"
                onMouseEnter={() => setActiveChartPoint(idx)}
                onClick={() => setActiveChartPoint(idx)}
              />
            ))}
          </svg>

          {/* X-Axis Day Labels */}
          <div className="mt-2 flex justify-between pl-10 pr-4 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {points.map((d, i) => (
              <button
                type="button"
                key={d.day + i}
                className={`cursor-pointer transition-colors ${activeChartPoint === i
                    ? "font-bold text-blue-600 dark:text-blue-400"
                    : "hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                onClick={() => setActiveChartPoint(i)}
              >
                {d.day}
              </button>
            ))}
          </div>
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

  return (
    <WorkspaceLayout permission="dashboard.view" label="Dashboard" showHero={false}>
      <div className="w-full min-h-screen bg-slate-50/50 dark:bg-[#0b0f19] px-4 py-6 sm:px-8 space-y-6">
        {/* Header Title & Date Range */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Welcome back, {user?.name || "Administrator"}
            </h1>
          </div>

          {/* Date Picker & Live Refresh Button */}
          <div className="flex items-center gap-2">
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

            <button
              type="button"
              onClick={handleTimeframeToggle}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <CalendarTodayOutlined sx={{ fontSize: 16, color: "#64748b" }} />
              <span>{summary?.dateRangeDescription || timeframeLabels[timeframe]}</span>
              <KeyboardArrowDown sx={{ fontSize: 16, color: "#94a3b8" }} />
            </button>
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

        {/* 4 Top KPI Metric Cards with Glow Gradient Background in Light & Dark Mode */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Users */}
          <div className="relative overflow-hidden rounded-2xl border border-purple-200/70 dark:border-purple-900/60 bg-gradient-to-br from-purple-500/10 via-white to-white dark:from-purple-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Total Users</span>
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
              <span className="text-[10px] font-medium text-purple-600/80 dark:text-purple-400/80">30-day user growth</span>
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

          {/* Card 2: Total Roles */}
          <div className="relative overflow-hidden rounded-2xl border border-blue-200/70 dark:border-blue-900/60 bg-gradient-to-br from-blue-500/10 via-white to-white dark:from-blue-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Total Roles</span>
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
              <span className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80">Configured hierarchies</span>
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

          {/* Card 3: Permissions */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Permissions</span>
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
              <span className="text-[10px] font-medium text-emerald-600/80 dark:text-emerald-400/80">Active privilege matrix</span>
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

          {/* Card 4: Active Sessions */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-900/60 bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Active Sessions</span>
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
              <span className="text-[10px] font-medium text-amber-600/80 dark:text-amber-400/80">Real-time concurrency</span>
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
        </div>

        {/* Middle Row: Dynamic Charts Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Chart: Users Overview (2 Cols) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Users Overview</h3>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600" />
                    <span>Active Users</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>New Users</span>
                  </div>
                </div>
              </div>

              {/* Timeframe Selector Button */}
              <button
                type="button"
                onClick={handleTimeframeToggle}
                className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              >
                <span>{timeframeLabels[timeframe]}</span>
                <KeyboardArrowDown sx={{ fontSize: 16, color: "#94a3b8" }} />
              </button>
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

          {/* Right Chart: Users by Role (Donut Chart) */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Users by Role</h3>
                <Link to="/roles" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer" aria-label="View all roles">
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
                      <div key={item.name + item.roleId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[110px]" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">
                          {item.count}{" "}
                          <span className="font-normal text-slate-400 dark:text-slate-500">({item.percentage})</span>
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
        </div>

        {/* Bottom Row: Recent Users & Recent Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Card: Recent Users Table */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Users</h3>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    Live DB
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
                    {summary?.recentUsers && summary.recentUsers.length > 0 ? (
                      summary.recentUsers.slice(0, 5).map((userItem) => (
                        <tr key={userItem.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
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
                            <span className={`inline-block rounded-md px-2.5 py-0.5 text-[11px] font-semibold ${userItem.roleBadge}`}>
                              {userItem.role}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 rounded-full ${userItem.status === "Active" ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                              />
                              <span
                                className={`font-medium ${userItem.status === "Active" ? "text-slate-700 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"
                                  }`}
                              >
                                {userItem.status}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap text-xs">
                            {userItem.lastLogin === "Active now" || userItem.lastLogin?.toLowerCase().includes("active") ? (
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
                        <td colSpan={5} className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                          {loading ? "Loading users from database..." : "No users found in database."}
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

          {/* Right Card: Recent Activity */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Activity</h3>
                  <span className="rounded-full bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    System Feed
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
                {summary?.recentActivities && summary.recentActivities.length > 0 ? (
                  summary.recentActivities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between gap-3 p-1.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${act.iconBg}`}>
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
                    {loading ? "Loading recent system events..." : "No recent activity recorded."}
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
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default DashboardPage;
