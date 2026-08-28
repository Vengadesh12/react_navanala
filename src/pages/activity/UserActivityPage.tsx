import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  HistoryToggleOffOutlined,
  PersonOutline,
  CheckCircleOutline,
  LogoutOutlined,
  Refresh,
  Search,
  SearchOff,
  VisibilityOutlined,
  BlockOutlined,
  DownloadOutlined,
  LaptopMac,
  Smartphone,
  DesktopWindows,
  Language,
  Close,
  AccessTime,
  FiberManualRecord,
  GridViewOutlined,
  FormatListBulletedOutlined,
  ShieldOutlined,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { userActivityService } from "../../api/userActivity.service";
import { useAuth } from "../../hooks/useAuth";
import { getRoleMeta } from "../../config/workspace.config";
import { showConfirmDialog, showErrorToast, showSuccessToast } from "../../utils/alerts";
import type { UserSessionItem, UserActivitySummary } from "../../types";

export const UserActivityPage: React.FC = () => {
  const { user: currentUser, can, logout } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = Number(currentUser?.roleId) === 2;
  const canForceLogout = isSuperAdmin || can("user_activity.force_logout") || can("user_activity.manage");

  // Summary & list states
  const [summary, setSummary] = useState<UserActivitySummary>({
    activeUsersCount: 0,
    totalLoginsToday: 0,
    totalLogoutsToday: 0,
    totalSessionsRecorded: 0,
    activeSessions: [],
    recentActivities: [],
  });

  const [activeTab, setActiveTab] = useState<"active" | "all">("active");
  const [activeViewMode, setActiveViewMode] = useState<"cards" | "table">("cards");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Table filtering & pagination
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pagedActivities, setPagedActivities] = useState<UserSessionItem[]>([]);

  // Modal inspection
  const [inspectSession, setInspectSession] = useState<UserSessionItem | null>(null);

  // Live real-time duration ticker updated every second (1000ms)
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate live running duration
  const getLiveDuration = useCallback(
    (session: UserSessionItem | null, nowMs: number): string => {
      if (!session || !session.loginTime) return "0s";

      const isLive = session.isActive && !session.logoutTime;
      const loginRaw = session.loginTime;
      const loginDate = new Date(loginRaw);

      if (isNaN(loginDate.getTime())) return session.durationFormatted || "0s";

      const endDate = isLive
        ? new Date(nowMs)
        : session.logoutTime
        ? new Date(session.logoutTime)
        : new Date(nowMs);

      let diffSec = Math.floor((endDate.getTime() - loginDate.getTime()) / 1000);

      // If diffSec is negative (e.g. database stored local time vs UTC mismatch):
      if (diffSec < 0) {
        const tzOffsetSec = new Date().getTimezoneOffset() * 60;
        const adjustedDiff = diffSec - tzOffsetSec;
        if (adjustedDiff >= 0 && adjustedDiff < 86400 * 365) {
          diffSec = adjustedDiff;
        } else {
          const localStr = String(loginRaw).replace("Z", "");
          const localParsed = new Date(localStr);
          if (!isNaN(localParsed.getTime())) {
            const altDiff = Math.floor((endDate.getTime() - localParsed.getTime()) / 1000);
            diffSec = altDiff >= 0 ? altDiff : 0;
          } else {
            diffSec = 0;
          }
        }
      }

      const days = Math.floor(diffSec / 86400);
      const hours = Math.floor((diffSec % 86400) / 3600);
      const minutes = Math.floor((diffSec % 3600) / 60);
      const seconds = diffSec % 60;

      let timeStr = "";
      if (days > 0) {
        timeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
      } else if (hours > 0) {
        timeStr = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        timeStr = `${minutes}m ${seconds}s`;
      } else {
        timeStr = `${seconds}s`;
      }

      return isLive ? `Active (${timeStr})` : timeStr;
    },
    []
  );

  // Auto-refresh timer interval
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await userActivityService.getSummary();
      setSummary(res);
    } catch (err: any) {
      console.warn("Failed to fetch activity summary:", err);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await userActivityService.getActivities({
        search: searchTerm,
        status: statusFilter,
        page,
        pageSize,
      });
      setPagedActivities(res.items || []);
      setTotalCount(res.totalCount || 0);
    } catch (err: any) {
      console.warn("Failed to fetch activities list:", err);
    }
  }, [searchTerm, statusFilter, page, pageSize]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSummary(), fetchActivities()]);
    setRefreshing(false);
    setLoading(false);
  }, [fetchSummary, fetchActivities]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-refresh hook (polls every 15s when enabled)
  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      fetchSummary();
      if (activeTab === "all") {
        fetchActivities();
      }
    }, 15000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, activeTab, fetchSummary, fetchActivities]);

  // Force Terminate Session
  const handleTerminateSession = async (session: UserSessionItem) => {
    if (!canForceLogout) {
      showErrorToast("Permission Denied: You do not have permission to force logout user sessions.");
      return;
    }

    const isCurrentSelf = currentUser?.id === session.userId;

    const res = await showConfirmDialog(
      "Terminate Active Session?",
      `Are you sure you want to immediately force logout ${session.userName} (${session.email})?`,
      "Force Logout",
      "Cancel",
      true
    );

    if (res.isConfirmed) {
      try {
        // Optimistically update UI immediately
        setSummary((prev) => ({
          ...prev,
          activeUsersCount: Math.max(0, prev.activeUsersCount - 1),
          totalLogoutsToday: prev.totalLogoutsToday + 1,
          activeSessions: prev.activeSessions.filter((s) => s.id !== session.id && s.userId !== session.userId),
        }));

        setPagedActivities((prev) =>
          prev.map((s) =>
            s.id === session.id || s.userId === session.userId
              ? {
                  ...s,
                  isActive: false,
                  logoutTime: new Date().toISOString(),
                  status: "Completed",
                  durationFormatted: s.durationFormatted.replace("Active (", "").replace(")", ""),
                }
              : s
          )
        );

        await userActivityService.terminateSession(session.id);

        if (isCurrentSelf) {
          showSuccessToast("Your session has ended. Redirecting to login...");
          setTimeout(async () => {
            await logout();
            navigate("/login", { replace: true });
          }, 400);
          return;
        }

        showSuccessToast(`Session for ${session.userName} terminated.`);
        refreshAll();
      } catch (err: any) {
        showErrorToast(err?.message || "Failed to terminate session.");
        refreshAll();
      }
    }
  };

  // Force Logout All Sessions for user
  const handleForceLogoutUser = async (userId: number, userName: string) => {
    const isCurrentSelf = currentUser?.id === userId;

    if (!canForceLogout && !isCurrentSelf) {
      showErrorToast("Permission Denied: You do not have permission to force logout user sessions.");
      return;
    }

    const res = await showConfirmDialog(
      isCurrentSelf ? "Sign Out All Sessions?" : "Force Logout User?",
      isCurrentSelf
        ? "Are you sure you want to end all your active sessions?"
        : `Are you sure you want to end all active sessions for ${userName}?`,
      isCurrentSelf ? "Sign Out" : "Logout User",
      "Cancel",
      true
    );

    if (res.isConfirmed) {
      try {
        // Optimistically update UI
        setSummary((prev) => ({
          ...prev,
          activeUsersCount: Math.max(0, prev.activeUsersCount - 1),
          totalLogoutsToday: prev.totalLogoutsToday + 1,
          activeSessions: prev.activeSessions.filter((s) => s.userId !== userId),
        }));

        const result = await userActivityService.forceLogoutUser(userId);

        if (isCurrentSelf) {
          showSuccessToast("All active sessions ended. Redirecting to login...");
          setTimeout(async () => {
            await logout();
            navigate("/login", { replace: true });
          }, 400);
          return;
        }

        showSuccessToast(result.message || `All active sessions for ${userName} terminated.`);
        refreshAll();
      } catch (err: any) {
        showErrorToast(err?.message || "Failed to logout user.");
        refreshAll();
      }
    }
  };

  // Export current list to CSV
  const handleExportCsv = () => {
    const listToExport = activeTab === "active" ? summary.activeSessions : pagedActivities;
    if (!listToExport || listToExport.length === 0) {
      showErrorToast("No activity records available to export.");
      return;
    }

    const headers = ["Session ID", "User ID", "User Name", "Email", "Role", "IP Address", "Device / OS", "Browser", "Login Time", "Logout Time", "Duration", "Status"];
    const rows = listToExport.map((s) => [
      s.id,
      s.userId,
      `"${s.userName.replace(/"/g, '""')}"`,
      `"${s.email}"`,
      s.roleName,
      s.ipAddress,
      s.os || "Desktop",
      s.browser || "Browser",
      new Date(s.loginTime).toISOString(),
      s.logoutTime ? new Date(s.logoutTime).toISOString() : "Active",
      s.durationFormatted,
      s.status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `user_activity_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccessToast("Activity records exported to CSV successfully.");
  };

  const getDeviceIcon = (os?: string) => {
    const osLower = (os || "").toLowerCase();
    if (osLower.includes("mac") || osLower.includes("ios")) {
      return <LaptopMac sx={{ fontSize: 16 }} className="text-slate-400" />;
    }
    if (osLower.includes("android") || osLower.includes("phone")) {
      return <Smartphone sx={{ fontSize: 16 }} className="text-slate-400" />;
    }
    return <DesktopWindows sx={{ fontSize: 16 }} className="text-slate-400" />;
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const q = searchTerm.toLowerCase().trim();

  const matchCurrentlyOnline =
    !q ||
    [
      "currently online",
      "active users",
      "active now",
      "online",
      "sessions",
      String(summary.activeUsersCount),
    ].some((t) => t.toLowerCase().includes(q));

  const matchLoginsToday =
    !q ||
    [
      "logins today",
      "logins",
      "sign-ins",
      "authentications",
      String(summary.totalLoginsToday),
    ].some((t) => t.toLowerCase().includes(q));

  const matchLogoutsToday =
    !q ||
    [
      "logouts today",
      "logouts",
      "ended",
      "expired",
      String(summary.totalLogoutsToday),
    ].some((t) => t.toLowerCase().includes(q));

  const matchTotalTracked =
    !q ||
    [
      "total tracked",
      "records",
      "historical",
      String(summary.totalSessionsRecorded),
    ].some((t) => t.toLowerCase().includes(q));

  const visibleMetricCount =
    (matchCurrentlyOnline ? 1 : 0) +
    (matchLoginsToday ? 1 : 0) +
    (matchLogoutsToday ? 1 : 0) +
    (matchTotalTracked ? 1 : 0);

  const filteredActiveSessions = useMemo(() => {
    if (!q) return summary.activeSessions;
    return summary.activeSessions.filter((s: UserSessionItem) =>
      [
        s.userName,
        s.email,
        s.roleName,
        s.ipAddress,
        s.browser,
        s.os,
        s.userAgent,
      ].some((val) => val?.toLowerCase().includes(q))
    );
  }, [summary.activeSessions, q]);

  return (
    <WorkspaceLayout
      permission="user_activity.view"
      label="User Activity"
      icon="⏱"
      showHero={false}
      searchValue={searchTerm}
      onSearchChange={(val) => {
        setSearchTerm(val);
        setPage(1);
      }}
      searchPlaceholder="Search active sessions, users, IPs..."
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Active Search Results Banner */}
        {q && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Search sx={{ fontSize: 18, color: "#6366f1" }} />
              <span>
                Showing results matching{" "}
                <span className="rounded-md bg-white dark:bg-slate-900 px-2 py-0.5 font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  &ldquo;{searchTerm}&rdquo;
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Close sx={{ fontSize: 15 }} />
              <span>Clear Filter</span>
            </button>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/80 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE TRACKING ACTIVE</span>
            </div>
            <span className="text-xs text-slate-400">
              {summary.activeUsersCount} user{summary.activeUsersCount === 1 ? "" : "s"} currently online
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Auto Refresh Toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
                autoRefresh
                  ? "border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100/70"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Toggle 15-second automatic polling"
            >
              <FiberManualRecord sx={{ fontSize: 10 }} className={autoRefresh ? "text-blue-600 animate-pulse" : "text-slate-400"} />
              <span>Auto-refresh: {autoRefresh ? "ON (15s)" : "OFF"}</span>
            </button>

            {/* Manual Refresh */}
            <button
              type="button"
              onClick={() => refreshAll()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Refresh sx={{ fontSize: 16 }} className={refreshing ? "animate-spin text-blue-600" : "text-slate-500"} />
              <span>Refresh</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <DownloadOutlined sx={{ fontSize: 16 }} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 4 Metric KPI Cards - rendered dynamically when matching */}
        {visibleMetricCount > 0 && (
          <div
            className={`grid grid-cols-1 gap-4 ${
              visibleMetricCount === 1
                ? "sm:grid-cols-1 md:max-w-md"
                : visibleMetricCount === 2
                ? "sm:grid-cols-2"
                : visibleMetricCount === 3
                ? "sm:grid-cols-3"
                : "sm:grid-cols-2 lg:grid-cols-4"
            }`}
          >
            {/* Active Users Card */}
            {matchCurrentlyOnline && (
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Currently Online</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{summary.activeUsersCount}</span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">active now</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Live active browser sessions</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                    <PersonOutline sx={{ fontSize: 24 }} />
                  </div>
                </div>
              </div>
            )}

            {/* Logins Today Card */}
            {matchLoginsToday && (
              <div className="relative overflow-hidden rounded-2xl border border-blue-200/70 dark:border-blue-900/60 bg-gradient-to-br from-blue-500/10 via-white to-white dark:from-blue-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Logins Today</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{summary.totalLoginsToday}</span>
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">sign-ins</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Successful 24-hr authentications</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-500 text-white shadow-md shadow-blue-500/25">
                    <CheckCircleOutline sx={{ fontSize: 24 }} />
                  </div>
                </div>
              </div>
            )}

            {/* Logouts Today Card */}
            {matchLogoutsToday && (
              <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-900/60 bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Logouts Today</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{summary.totalLogoutsToday}</span>
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">ended</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Terminated &amp; expired sessions</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/25">
                    <LogoutOutlined sx={{ fontSize: 24 }} />
                  </div>
                </div>
              </div>
            )}

            {/* Total Tracked Sessions */}
            {matchTotalTracked && (
              <div className="relative overflow-hidden rounded-2xl border border-purple-200/70 dark:border-purple-900/60 bg-gradient-to-br from-purple-500/10 via-white to-white dark:from-purple-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Total Tracked</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{summary.totalSessionsRecorded}</span>
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">records</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Cumulative historical audit sessions</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-purple-500 text-white shadow-md shadow-purple-500/25">
                    <HistoryToggleOffOutlined sx={{ fontSize: 24 }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Selection & Tabs Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Main Tab Buttons */}
          <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab("active");
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "active"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Currently Logged In</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {summary.activeSessions.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <HistoryToggleOffOutlined sx={{ fontSize: 16 }} />
              <span>Full Login &amp; Logout History</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {summary.totalSessionsRecorded}
              </span>
            </button>
          </div>

          {/* Right Controls depending on tab */}
          <div className="flex items-center gap-2.5">
            {activeTab === "active" ? (
              <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setActiveViewMode("cards")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    activeViewMode === "cards" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Card Grid View"
                >
                  <GridViewOutlined sx={{ fontSize: 18 }} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode("table")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    activeViewMode === "table" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Table View"
                >
                  <FormatListBulletedOutlined sx={{ fontSize: 18 }} />
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Sessions Only</option>
                  <option value="completed">Completed / Logged Out</option>
                </select>

                <div className="relative min-w-[220px]">
                  <Search sx={{ fontSize: 18 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, email, IP..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: CURRENTLY LOGGED IN USERS */}
        {activeTab === "active" && (
          <div>
            {filteredActiveSessions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                  {q ? <SearchOff sx={{ fontSize: 28 }} /> : <PersonOutline sx={{ fontSize: 28 }} />}
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {q ? `No active sessions matching "${searchTerm}"` : "No Active Sessions"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {q
                    ? "Try adjusting your search keywords or clear the search filter."
                    : "There are currently no active user sessions recorded in the workspace."}
                </p>
                {q && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setPage(1);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
                  >
                    <Close sx={{ fontSize: 14 }} />
                    <span>Clear Search</span>
                  </button>
                )}
              </div>
            ) : activeViewMode === "cards" ? (
              /* CARD GRID VIEW */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredActiveSessions.map((session: UserSessionItem) => {
                  const roleMeta = getRoleMeta(undefined, session.roleName);
                  const isCurrentSelf =
                    currentUser?.id === session.userId ||
                    Boolean(currentUser?.email && session.email && currentUser.email.toLowerCase() === session.email.toLowerCase());

                  return (
                    <div
                      key={session.id}
                      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-emerald-300 hover:shadow-md"
                    >
                      {/* Top Row: User Avatar & Live Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-bold text-white shadow-sm">
                              {session.userName ? session.userName.charAt(0).toUpperCase() : "U"}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-xs truncate" title={session.userName}>
                                {session.userName}
                              </h4>
                              {isCurrentSelf && (
                                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600 border border-blue-200/60">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate" title={session.email}>
                              {session.email}
                            </p>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${roleMeta.color}`}>
                          <ShieldOutlined sx={{ fontSize: 11 }} />
                          <span>{session.roleName}</span>
                        </span>
                      </div>

                      {/* Middle Details Grid */}
                      <div className="my-4 space-y-2 rounded-xl bg-slate-50/70 p-3 text-[11px] border border-slate-100">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1 text-slate-400">
                            <AccessTime sx={{ fontSize: 13 }} />
                            <span>Logged In:</span>
                          </span>
                          <span className="font-semibold text-slate-800">
                            {new Date(session.loginTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <FiberManualRecord sx={{ fontSize: 11 }} className="text-emerald-500 animate-pulse" />
                            <span>Online Duration:</span>
                          </span>
                          <span className="font-bold text-emerald-700 font-mono tracking-tight">
                            {getLiveDuration(session, currentTime)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Language sx={{ fontSize: 13 }} />
                            <span>IP Address:</span>
                          </span>
                          <span className="font-mono text-[11px] font-medium text-slate-700">{session.ipAddress}</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1 text-slate-400">
                            {getDeviceIcon(session.os)}
                            <span>Client / Device:</span>
                          </span>
                          <span className="text-[11px] text-slate-700 font-medium truncate max-w-[140px]" title={`${session.browser} on ${session.os}`}>
                            {session.browser} • {session.os}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
                        <button
                          type="button"
                          onClick={() => setInspectSession(session)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <VisibilityOutlined sx={{ fontSize: 15, color: "#64748b" }} />
                          <span>Details</span>
                        </button>

                        {canForceLogout && (
                          <button
                            type="button"
                            onClick={() => handleTerminateSession(session)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Terminate this session immediately"
                          >
                            <LogoutOutlined sx={{ fontSize: 14 }} />
                            <span>Force Logout</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ACTIVE TABLE VIEW */
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3.5 whitespace-nowrap">USER</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">ROLE</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">IP ADDRESS</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">CLIENT / DEVICE</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">LOGGED IN AT</th>
                        <th className="px-5 py-3.5 whitespace-nowrap">DURATION</th>
                        <th className="px-5 py-3.5 text-right whitespace-nowrap">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredActiveSessions.map((session: UserSessionItem) => {
                        const roleMeta = getRoleMeta(undefined, session.roleName);
                        const isCurrentSelf =
                          currentUser?.id === session.userId ||
                          Boolean(currentUser?.email && session.email && currentUser.email.toLowerCase() === session.email.toLowerCase());

                        return (
                          <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white shrink-0">
                                  {session.userName ? session.userName.charAt(0).toUpperCase() : "U"}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate">{session.userName}</div>
                                  <div className="text-[11px] text-slate-400 truncate">{session.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border whitespace-nowrap ${roleMeta.color}`}>
                                {session.roleName}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">{session.ipAddress}</td>
                            <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {getDeviceIcon(session.os)}
                                <span>{session.browser} ({session.os})</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                              {new Date(session.loginTime).toLocaleString()}
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 font-mono whitespace-nowrap">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {getLiveDuration(session, currentTime)}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setInspectSession(session)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 cursor-pointer"
                                title="View Details"
                              >
                                <VisibilityOutlined sx={{ fontSize: 17 }} />
                              </button>
                              {canForceLogout && (
                                <button
                                  type="button"
                                  onClick={() => handleTerminateSession(session)}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                  title="Terminate Session"
                                >
                                  <LogoutOutlined sx={{ fontSize: 17 }} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FULL LOGIN & LOGOUT ACTIVITY HISTORY */}
        {activeTab === "all" && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="px-5 py-3.5 whitespace-nowrap">USER</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">EVENT STATUS</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">ROLE</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">IP ADDRESS</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">DEVICE / BROWSER</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">LOGIN TIME</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">LOGOUT TIME</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">DURATION</th>
                      <th className="px-5 py-3.5 text-right whitespace-nowrap">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedActivities.length > 0 ? (
                      pagedActivities.map((session) => {
                        const roleMeta = getRoleMeta(undefined, session.roleName);
                        const isLive = session.isActive && !session.logoutTime;

                        return (
                          <tr key={session.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-800 text-xs font-bold text-white shrink-0">
                                  {session.userName ? session.userName.charAt(0).toUpperCase() : "U"}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate">{session.userName}</div>
                                  <div className="text-[11px] text-slate-400 truncate">{session.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {isLive ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 whitespace-nowrap">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                                  <span>Active Now</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                                  <CheckCircleOutline sx={{ fontSize: 13 }} />
                                  <span>Logged Out</span>
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border whitespace-nowrap ${roleMeta.color}`}>
                                {session.roleName}
                              </span>
                            </td>

                            <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">{session.ipAddress}</td>

                            <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {getDeviceIcon(session.os)}
                                <span className="truncate max-w-[130px]" title={`${session.browser} on ${session.os}`}>
                                  {session.browser}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                              {new Date(session.loginTime).toLocaleString()}
                            </td>

                            <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                              {session.logoutTime ? (
                                new Date(session.logoutTime).toLocaleString()
                              ) : (
                                <span className="text-emerald-600 font-bold text-[11px] whitespace-nowrap">— In Progress —</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 font-medium text-slate-700 whitespace-nowrap font-mono text-[11px]">
                              {isLive ? (
                                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 whitespace-nowrap">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  {getLiveDuration(session, currentTime)}
                                </span>
                              ) : (
                                getLiveDuration(session, currentTime)
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setInspectSession(session)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 cursor-pointer"
                                title="View Session Metadata"
                              >
                                <VisibilityOutlined sx={{ fontSize: 17 }} />
                              </button>

                              {isLive && canForceLogout && (
                                <button
                                  type="button"
                                  onClick={() => handleTerminateSession(session)}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                  title="Force Terminate"
                                >
                                  <BlockOutlined sx={{ fontSize: 17 }} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                          {loading ? "Loading user activity logs..." : "No user activity sessions found matching your filters."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalCount > pageSize && (
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
                  <span className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-800">{(page - 1) * pageSize + 1}</span> to{" "}
                    <span className="font-semibold text-slate-800">{Math.min(page * pageSize, totalCount)}</span> of{" "}
                    <span className="font-semibold text-slate-800">{totalCount}</span> records
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-medium text-slate-600">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Session Details / Inspector Modal */}
      {inspectSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <HistoryToggleOffOutlined sx={{ fontSize: 18 }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Session Activity Details</h3>
                  <span className="text-[11px] text-slate-400">Session ID #{inspectSession.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectSession(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">User:</span>
                <span className="font-bold text-slate-900">
                  {inspectSession.userName} ({inspectSession.email})
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Role Tier:</span>
                <span className="font-semibold text-blue-600">{inspectSession.roleName}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Status:</span>
                <span>
                  {inspectSession.isActive && !inspectSession.logoutTime ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                      🟢 Active Online Session
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      Session Completed (Logged Out)
                    </span>
                  )}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">IP Address:</span>
                <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                  {inspectSession.ipAddress}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Browser &amp; OS:</span>
                <span className="font-medium text-slate-800">
                  {inspectSession.browser} on {inspectSession.os}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Login Timestamp:</span>
                <span className="font-medium text-slate-700">{new Date(inspectSession.loginTime).toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Logout Timestamp:</span>
                <span className="font-medium text-slate-700">
                  {inspectSession.logoutTime ? new Date(inspectSession.logoutTime).toLocaleString() : "Currently Active"}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Total Duration:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {getLiveDuration(inspectSession, currentTime)}
                </span>
              </div>

              {inspectSession.userAgent && (
                <div className="pt-2">
                  <span className="block text-slate-400 font-medium mb-1">User Agent String:</span>
                  <div className="rounded-xl bg-slate-50 p-2.5 font-mono text-[10px] text-slate-600 leading-relaxed border border-slate-100 break-all">
                    {inspectSession.userAgent}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {inspectSession.isActive && !inspectSession.logoutTime && canForceLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setInspectSession(null);
                    handleTerminateSession(inspectSession);
                  }}
                  className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  Terminate Session
                </button>
              )}

              <button
                type="button"
                onClick={() => setInspectSession(null)}
                className="ml-auto rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};

export default UserActivityPage;
