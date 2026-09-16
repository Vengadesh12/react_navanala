import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu as MenuIcon,
  Search,
  Close,
  NotificationsNone,
  DarkModeOutlined,
  LightModeOutlined,
  LogoutOutlined,
  KeyboardArrowDown,
  AccountCircleOutlined,
  SecurityOutlined,
  AccessTime,
} from "@mui/icons-material";
import { getRoleMeta } from "../../config/workspace.config";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { showConfirmDialog } from "../../utils/alerts";
import { getProfileImageUrl } from "../../utils/image";
import type { LoggedInUser } from "../../types";

export interface TopbarProps {
  user: LoggedInUser | null;
  label?: string;
  onOpenMenu: () => void;
  onLogout?: () => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  showSearchBar?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  user,
  label,
  onOpenMenu,
  onLogout,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search here...",
  showSearchBar = true,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 50);
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const pad = (num: number) => num.toString().padStart(2, "0");
  const timeFormatted = `${pad(displayHours)}:${pad(minutes)}:${pad(seconds)}`;
  const dateFormatted = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const fullDateTooltip = currentTime.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isControlled = onSearchChange !== undefined;
  const currentSearch = isControlled ? (searchValue ?? "") : localSearch;

  const handleSearchChange = (val: string) => {
    if (isControlled) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
    }
  };

  const handleClearSearch = () => {
    if (isControlled) {
      onSearchChange("");
    } else {
      setLocalSearch("");
    }
  };

  const roleMeta = getRoleMeta(
    user?.roleId,
    user?.roleName || (user?.isSuperAdmin ? "Super Admin" : "Role")
  );
  const userName = user?.name || "User";
  const userEmail = user?.email || "";
  const roleNameDisplay = user?.roleName || (user?.isSuperAdmin ? "Super Admin" : roleMeta.name);

  const getRoleBadgeClasses = (roleName?: string) => {
    const lower = (roleName || "").toLowerCase();
    if (lower.includes("super admin") || lower.includes("admin")) {
      return {
        bg: "bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-pink-50/60 dark:from-indigo-950/60 dark:via-purple-950/40 dark:to-slate-900/80",
        border: "border-indigo-200/70 dark:border-indigo-800/60 hover:border-indigo-300 dark:hover:border-indigo-600/60",
        text: "text-indigo-900 dark:text-indigo-200",
        icon: "text-indigo-600 dark:text-indigo-400",
      };
    }
    if (lower.includes("manager") || lower.includes("lead") || lower.includes("supervisor")) {
      return {
        bg: "bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-green-50/60 dark:from-emerald-950/60 dark:via-teal-950/40 dark:to-slate-900/80",
        border: "border-emerald-200/70 dark:border-emerald-800/60 hover:border-emerald-300 dark:hover:border-emerald-600/60",
        text: "text-emerald-900 dark:text-emerald-200",
        icon: "text-emerald-600 dark:text-emerald-400",
      };
    }
    if (lower.includes("employee") || lower.includes("member") || lower.includes("staff") || lower.includes("user")) {
      return {
        bg: "bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-cyan-50/60 dark:from-sky-950/60 dark:via-blue-950/40 dark:to-slate-900/80",
        border: "border-sky-200/70 dark:border-sky-800/60 hover:border-sky-300 dark:hover:border-sky-600/60",
        text: "text-sky-900 dark:text-sky-200",
        icon: "text-sky-600 dark:text-sky-400",
      };
    }
    return {
      bg: "bg-gradient-to-r from-purple-50/90 via-indigo-50/70 to-violet-50/60 dark:from-purple-950/60 dark:via-indigo-950/40 dark:to-slate-900/80",
      border: "border-purple-200/70 dark:border-purple-800/60 hover:border-purple-300 dark:hover:border-purple-600/60",
      text: "text-purple-900 dark:text-purple-200",
      icon: "text-purple-600 dark:text-purple-400",
    };
  };

  const roleStyles = getRoleBadgeClasses(roleNameDisplay);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    const res = await showConfirmDialog(
      "Sign Out?",
      "Are you sure you want to Logout!",
      "Sign Out",
      "Cancel",
      true
    );
    if (res.isConfirmed) {
      if (onLogout) {
        onLogout();
      } else {
        await logout();
        navigate("/login", { replace: true });
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-18 w-full min-w-0 items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 px-3 sm:px-5 lg:px-6 backdrop-blur-md transition-colors duration-200">
      {/* Mobile Search Overlay: Replaces topbar header when search is triggered on small devices */}
      {showSearchBar && mobileSearchOpen && (
        <div className="absolute inset-0 z-40 flex items-center bg-white dark:bg-slate-900 px-3 sm:hidden gap-2 shadow-md animate-fadeIn">
          <div className="relative flex-1 min-w-0">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search sx={{ fontSize: 18 }} />
            </div>
            <input
              ref={mobileInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={currentSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/90 py-2 pl-9 pr-8 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {currentSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <Close sx={{ fontSize: 16 }} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileSearchOpen(false)}
            className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Left: Hamburger, Workspace Label, Desktop Search & Role Badge */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-1 min-w-0">
        <button
          className="rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer transition-colors border border-slate-200/80 dark:border-slate-800 shadow-2xs shrink-0"
          type="button"
          onClick={onOpenMenu}
          aria-label="Toggle navigation menu"
        >
          <MenuIcon sx={{ fontSize: 20 }} />
        </button>

        {/* Page title on small screens */}
        {label && (
          <div className="flex items-center sm:hidden min-w-0">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[110px] xs:max-w-[140px]">
              {label}
            </span>
          </div>
        )}

        {/* Desktop / Tablet Search Bar */}
        {showSearchBar && (
          <div className="relative hidden sm:block w-full max-w-[170px] md:max-w-[210px] lg:max-w-xs min-w-0">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search sx={{ fontSize: 18 }} />
            </div>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={currentSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 py-2 pl-9 pr-8 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            {currentSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <Close sx={{ fontSize: 16 }} />
              </button>
            )}
          </div>
        )}

        {/* Role Name Badge: Visible on XL screens so it never crowds tablets or small laptops */}
        {roleNameDisplay && (
          <div
            className={`hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${roleStyles.border} ${roleStyles.bg} shadow-2xs transition-all select-none shrink-0`}
            title={`Current Role: ${roleNameDisplay}`}
          >
            <div className={`flex items-center ${roleStyles.icon}`}>
              <SecurityOutlined sx={{ fontSize: 16 }} />
            </div>
            <span className={`text-xs font-bold tracking-wide capitalize ${roleStyles.text}`}>
              {roleNameDisplay}
            </span>
          </div>
        )}
      </div>

      {/* Center: Live Current Time with Seconds - Hidden on mobile (< md) to avoid crowding */}
      <div className="hidden md:flex items-center justify-center shrink-0 px-2">
        <div
          className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all duration-200 select-none"
          title={`Current Local Time: ${fullDateTooltip}`}
        >
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <AccessTime sx={{ fontSize: 16 }} />
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-semibold tracking-wider tabular-nums text-slate-800 dark:text-slate-100">
            <span className="hidden lg:inline-block text-[11px] font-sans font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 pr-2 mr-0.5">
              {dateFormatted}
            </span>
            <span>{timeFormatted}</span>
            <span className="text-[10px] font-bold tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 rounded px-1 py-0.5 uppercase font-sans">
              {ampm}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Mobile Search Toggle, Theme Toggle, Notifications & User Profile */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0">
        {/* Mobile Search Toggle Icon */}
        {showSearchBar && (
          <button
            type="button"
            onClick={() => setMobileSearchOpen(true)}
            className="sm:hidden grid h-8 w-8 place-items-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer border border-slate-200/80 dark:border-slate-800 shadow-2xs"
            aria-label="Open search"
            title="Search"
          >
            <Search sx={{ fontSize: 18 }} />
          </button>
        )}

        {/* Modern Sleek Dual-Track Capsule Theme Switch */}
        <button
          type="button"
          onClick={toggleDarkMode}
          role="switch"
          aria-checked={isDarkMode}
          aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className={`group relative inline-flex h-8 w-14 sm:h-9 sm:w-[68px] shrink-0 cursor-pointer items-center rounded-full p-1 transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 select-none hover:scale-[1.02] active:scale-95 ${
            isDarkMode
              ? "bg-slate-800/90 border border-slate-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] hover:border-indigo-500/50"
              : "bg-slate-200/90 border border-slate-300/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] hover:border-amber-400/50"
          }`}
        >
          {/* Sun Track Icon (Left) */}
          <span
            className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition-all duration-300 ${
              !isDarkMode
                ? "opacity-0 scale-75 pointer-events-none"
                : "opacity-60 text-slate-400 group-hover:text-amber-400 group-hover:opacity-100"
            }`}
          >
            <LightModeOutlined sx={{ fontSize: 15 }} />
          </span>

          {/* Moon Track Icon (Right) */}
          <span
            className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition-all duration-300 ${
              isDarkMode
                ? "opacity-0 scale-75 pointer-events-none"
                : "opacity-60 text-slate-400 group-hover:text-indigo-400 group-hover:opacity-100"
            }`}
          >
            <DarkModeOutlined sx={{ fontSize: 15 }} />
          </span>

          {/* Sliding Thumb Knob */}
          <span
            className={`absolute top-1 left-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform shadow-md ${
              isDarkMode
                ? "translate-x-[24px] sm:translate-x-[32px] bg-slate-900 text-indigo-400 border border-indigo-500/40 shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
                : "translate-x-0 bg-white text-amber-500 border border-amber-200/80 shadow-[0_2px_8px_rgba(245,158,11,0.35)]"
            }`}
          >
            {isDarkMode ? (
              <DarkModeOutlined
                sx={{
                  fontSize: 15,
                  filter: "drop-shadow(0 0 5px rgba(129, 140, 248, 0.7))",
                }}
              />
            ) : (
              <LightModeOutlined
                sx={{
                  fontSize: 15,
                  filter: "drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))",
                }}
              />
            )}
          </span>
        </button>

        {/* Notification Bell with Badge */}
        <div className="relative shrink-0">
          <button
            type="button"
            className="relative grid h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 place-items-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-transparent sm:border-slate-200/60 dark:sm:border-slate-800"
            aria-label="Notifications"
          >
            <NotificationsNone sx={{ fontSize: 20 }} />
            <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] sm:text-[9px] font-bold text-white shadow-xs">
              5
            </span>
          </button>
        </div>

        {/* User Avatar, Info & Dropdown Trigger */}
        <div className="relative pl-1.5 sm:pl-2.5 border-l border-slate-200 dark:border-slate-800 shrink-0" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 sm:gap-2 p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer group focus:outline-none"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <img
              src={getProfileImageUrl(user?.profileImage, userName)}
              alt={userName}
              className="h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-700 group-hover:ring-blue-500 shadow-xs transition-all shrink-0"
            />

            <div className="hidden md:flex flex-col text-left justify-center">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors max-w-[110px] truncate">
                {userName}
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 leading-tight mt-0.5 max-w-[110px] truncate">
                {roleMeta.name}
              </span>
            </div>

            <KeyboardArrowDown
              sx={{ fontSize: 16 }}
              className={`hidden sm:block text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : "group-hover:text-slate-600 dark:group-hover:text-slate-200"
              }`}
            />
          </button>

          {/* Dropdown Menu below profile */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl shadow-slate-900/10 dark:shadow-black/40 z-50 animate-fadeIn">
              {/* Profile Summary Header */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                <img
                  src={getProfileImageUrl(user?.profileImage, userName)}
                  alt={userName}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-500/20 shadow-2xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {userName}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{userEmail}</p>
                  <span className="mt-1 inline-block rounded-full bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 text-[9px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200/40 dark:border-purple-800/50">
                    {roleMeta.name}
                  </span>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="mt-1.5 space-y-0.5">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <AccountCircleOutlined sx={{ fontSize: 18, color: "#64748b" }} />
                  <span>My Profile & Security</span>
                </Link>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
                >
                  <LogoutOutlined sx={{ fontSize: 18, color: "#e11d48" }} />
                  <span>Sign Out / Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;


