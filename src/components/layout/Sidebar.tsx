import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  SpaceDashboard,
  GridView,
  Security,
  PersonOutline,
  ReceiptLongOutlined,
  SettingsOutlined,
  AccountCircleOutlined,
  LogoutOutlined,
  Assessment,
  Assignment,
  CalendarMonth,
  Close,
  Shield,
  HistoryToggleOffOutlined,
  CorporateFare,
  FactCheckOutlined,
  ShoppingCartOutlined,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { showConfirmDialog } from "../../utils/alerts";
import { approvalService } from "../../api/approval.service";
import type { LoggedInUser } from "../../types";

export interface SidebarProps {
  user: LoggedInUser | null;
  activeKey?: string;
  menuOpen: boolean;
  onCloseMenu: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeKey,
  menuOpen,
  onCloseMenu,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, can } = useAuth();
  const currentPath = location.pathname;

  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      const res = await approvalService.getSummary();
      if (res && typeof res.pendingCount === "number") {
        setPendingApprovalsCount(res.pendingCount);
      }
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    fetchPendingApprovals();
    const interval = setInterval(fetchPendingApprovals, 15000);
    const handleUpdate = () => fetchPendingApprovals();
    window.addEventListener("approvals-updated", handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener("approvals-updated", handleUpdate);
    };
  }, [fetchPendingApprovals]);

  const handleLogout = async () => {
    const res = await showConfirmDialog(
      "Sign Out?",
      "Are you sure you want to end your active session?",
      "Sign Out",
      "Cancel",
      true
    );
    if (res.isConfirmed) {
      await logout();
      navigate("/login", { replace: true });
    }
  };

  const navManagement = [
    { label: "Roles", path: "/roles", permissionKey: "roles.view", icon: <GridView sx={{ fontSize: 18 }} /> },
    { label: "Departments", path: "/departments", permissionKey: "departments.view", icon: <CorporateFare sx={{ fontSize: 18 }} /> },
    { label: "Permissions", path: "/permissions", permissionKey: "permissions.manage", icon: <Security sx={{ fontSize: 18 }} /> },
    { label: "Users", path: "/users", permissionKey: "users.view", icon: <PersonOutline sx={{ fontSize: 18 }} /> },
    { label: "Create Approval", path: "/create-approval", permissionKey: "approvals.view", icon: <FactCheckOutlined sx={{ fontSize: 18 }} /> },
    { label: "Purchases", path: "/purchases", permissionKey: "purchases.view", icon: <ShoppingCartOutlined sx={{ fontSize: 18 }} /> },
    { label: "Invoice", path: "/invoices", permissionKey: "invoices.view", icon: <ReceiptLongOutlined sx={{ fontSize: 18 }} /> },
  ];

  const navSystem = [
    { label: "User Activity", path: "/user-activity", permissionKey: "user_activity.view", icon: <HistoryToggleOffOutlined sx={{ fontSize: 18 }} /> },
    { label: "Audit Logs", path: "/audit", permissionKey: "audit.view", icon: <ReceiptLongOutlined sx={{ fontSize: 18 }} /> },
    { label: "Reports", path: "/reports", permissionKey: "reports.view", icon: <Assessment sx={{ fontSize: 18 }} /> },
    { label: "Projects", path: "/projects", permissionKey: "projects.view", icon: <Assignment sx={{ fontSize: 18 }} /> },
    { label: "Schedule", path: "/calendar", permissionKey: "calendar.view", icon: <CalendarMonth sx={{ fontSize: 18 }} /> },
    { label: "Settings", path: "/settings", permissionKey: "settings.view", icon: <SettingsOutlined sx={{ fontSize: 18 }} /> },
  ];

  const navAccount: { label: string; path: string; icon: React.ReactNode; permissionKey?: string }[] = [
    { label: "Profile", path: "/profile", icon: <AccountCircleOutlined sx={{ fontSize: 18 }} /> },
  ];

  const isDashboardActive = currentPath === "/dashboard" || currentPath === "/";

  const isItemActive = (item: { path: string; permissionKey?: string }) => {
    if (activeKey && item.permissionKey && activeKey === item.permissionKey) {
      return currentPath === item.path || (item.path === "/users" && currentPath === "/add-user") || (item.path === "/invoices" && currentPath === "/invoice");
    }
    if (currentPath === item.path) return true;
    if (item.path === "/users" && currentPath === "/add-user") return true;
    if (item.path === "/invoices" && currentPath === "/invoice") return true;
    return false;
  };

  const filteredManagement = navManagement.filter((item) => can(item.permissionKey));
  const filteredSystem = navSystem.filter((item) => can(item.permissionKey));
  const filteredAccount = navAccount.filter((item) => !item.permissionKey || can(item.permissionKey));

  return (
    <>
      {/* Mobile Menu Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={onCloseMenu}
        />
      )}

      {/* Main Aside */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col justify-between bg-[#0b1021] text-white p-4 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 overflow-y-auto ${menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex flex-1 flex-col min-h-0">
          {/* Brand Header */}
          <div className="mb-6 flex shrink-0 items-center justify-between px-2 pt-1">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="h-10 w-10 overflow-hidden rounded-xl bg-white p-1 shadow-md shadow-blue-500/20 ring-1 ring-white/10 flex items-center justify-center">
                <img src="/navanala-logo.png" alt="NavaNala Technologies" className="h-full w-full object-contain" />
              </div>
             <span className="text-sm font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors whitespace-nowrap flex-shrink-0">
  NAVANALA TECHNOLOGIES
</span>
            </Link>
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
              type="button"
              onClick={onCloseMenu}
              aria-label="Close navigation menu"
            >
              <Close sx={{ fontSize: 18 }} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
            {/* Top Dashboard Button */}
            {can("dashboard.view") && (
              <div>
                <Link
                  to="/dashboard"
                  onClick={onCloseMenu}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${isDashboardActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-slate-400 hover:bg-slate-900/80 hover:text-white"
                    }`}
                >
                  <SpaceDashboard sx={{ fontSize: 18 }} />
                  <span>Dashboard</span>
                </Link>
              </div>
            )}

            {/* MANAGEMENT Section */}
            {filteredManagement.length > 0 && (
              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
                  MANAGEMENT
                </p>
                <div className="mt-1 space-y-0.5">
                  {filteredManagement.map((item) => {
                    const isActive = isItemActive(item);
                    return (
                      <Link
                        key={item.label}
                        to={item.path}
                        onClick={onCloseMenu}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${isActive
                          ? "bg-blue-600 text-white shadow-md font-semibold"
                          : "text-slate-300 hover:bg-slate-900/60 hover:text-white"
                          }`}
                      >
                        <span className={isActive ? "text-white" : "text-slate-400"}>
                          {item.icon}
                        </span>
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{item.label}</span>
                          {(item.permissionKey === "approvals.view" || item.path === "/create-approval") && pendingApprovalsCount > 0 && (
                            <span
                              className="relative flex h-2 w-2 shrink-0"
                              title={`${pendingApprovalsCount} active approval request(s)`}
                            >
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-xs shadow-rose-500/50"></span>
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SYSTEM Section */}
            {filteredSystem.length > 0 && (
              <div>
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
                  SYSTEM
                </p>
                <div className="mt-1 space-y-0.5">
                  {filteredSystem.map((item) => {
                    const isActive = isItemActive(item);
                    return (
                      <Link
                        key={item.label}
                        to={item.path}
                        onClick={onCloseMenu}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${isActive
                          ? "bg-blue-600 text-white shadow-md font-semibold"
                          : "text-slate-300 hover:bg-slate-900/60 hover:text-white"
                          }`}
                      >
                        <span className={isActive ? "text-white" : "text-slate-400"}>
                          {item.icon}
                        </span>
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{item.label}</span>
                          {(item.permissionKey === "approvals.view" || item.path === "/create-approval") && pendingApprovalsCount > 0 && (
                            <span
                              className="relative flex h-2 w-2 shrink-0"
                              title={`${pendingApprovalsCount} active approval request(s)`}
                            >
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-xs shadow-rose-500/50"></span>
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ACCOUNT Section */}
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/80">
                ACCOUNT
              </p>
              <div className="mt-1 space-y-0.5">
                {filteredAccount.map((item) => {
                  const isActive = isItemActive(item);
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={onCloseMenu}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${isActive
                        ? "bg-blue-600 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-900/60 hover:text-white"
                        }`}
                    >
                      <span className={isActive ? "text-white" : "text-slate-400"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {/* Show logout button in sidebar when role has no access to dashboard */}
                {!can("dashboard.view") && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-900/60 hover:text-rose-400 transition-all cursor-pointer text-left"
                  >
                    <LogoutOutlined sx={{ fontSize: 18, color: "#94a3b8" }} />
                    <span>Logout</span>
                  </button>
                )}
              </div>
            </div>
          </nav>
        </div>

        {/* Upgrade to Pro Card */}

      </aside>
    </>
  );
};

