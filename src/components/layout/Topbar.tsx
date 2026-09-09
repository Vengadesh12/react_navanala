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
  const [localSearch, setLocalSearch] = useState("");
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    Number(user?.roleId) === 2 ? "Super Admin" : user?.roleName || "Super Admin"
  );
  const userName = user?.name || "Vengadesh M";
  const userEmail = user?.email || "admin@example.com";

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
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 px-6 backdrop-blur-md transition-colors duration-200">
      {/* Left: Hamburger & Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button
          className="rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer transition-colors border border-slate-200/80 dark:border-slate-800 shadow-2xs"
          type="button"
          onClick={onOpenMenu}
          aria-label="Toggle navigation menu"
        >
          <MenuIcon sx={{ fontSize: 20 }} />
        </button>

        {/* Search Bar */}
        {showSearchBar && (
          <div className="relative w-full max-w-xs">
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
      </div>

      {/* Center: Live Current Time with Seconds */}
      <div className="flex items-center justify-center px-2">
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
            <span className="hidden md:inline-block text-[11px] font-sans font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 pr-2 mr-0.5">
              {dateFormatted}
            </span>
            <span>{timeFormatted}</span>
            <span className="text-[10px] font-bold tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 rounded px-1 py-0.5 uppercase font-sans">
              {ampm}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Theme Toggle, Notifications & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Modern Sleek Dual-Track Capsule Theme Switch */}
        <button
          type="button"
          onClick={toggleDarkMode}
          role="switch"
          aria-checked={isDarkMode}
          aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className={`group relative inline-flex h-9 w-[68px] shrink-0 cursor-pointer items-center rounded-full p-1 transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 select-none hover:scale-[1.03] active:scale-95 ${
            isDarkMode
              ? "bg-slate-800/90 border border-slate-700/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] hover:border-indigo-500/50"
              : "bg-slate-200/90 border border-slate-300/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] hover:border-amber-400/50"
          }`}
        >
          {/* Sun Track Icon (Left) */}
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
              !isDarkMode
                ? "opacity-0 scale-75 pointer-events-none"
                : "opacity-60 text-slate-400 group-hover:text-amber-400 group-hover:opacity-100"
            }`}
          >
            <LightModeOutlined sx={{ fontSize: 16 }} />
          </span>

          {/* Moon Track Icon (Right) */}
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ${
              isDarkMode
                ? "opacity-0 scale-75 pointer-events-none"
                : "opacity-60 text-slate-400 group-hover:text-indigo-400 group-hover:opacity-100"
            }`}
          >
            <DarkModeOutlined sx={{ fontSize: 16 }} />
          </span>

          {/* Sliding Thumb Knob */}
          <span
            className={`absolute top-1 left-1 flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform shadow-md ${
              isDarkMode
                ? "translate-x-[32px] bg-slate-900 text-indigo-400 border border-indigo-500/40 shadow-[0_2px_8px_rgba(99,102,241,0.4)]"
                : "translate-x-0 bg-white text-amber-500 border border-amber-200/80 shadow-[0_2px_8px_rgba(245,158,11,0.35)]"
            }`}
          >
            {isDarkMode ? (
              <DarkModeOutlined
                sx={{
                  fontSize: 17,
                  filter: "drop-shadow(0 0 5px rgba(129, 140, 248, 0.7))",
                }}
              />
            ) : (
              <LightModeOutlined
                sx={{
                  fontSize: 17,
                  filter: "drop-shadow(0 0 6px rgba(245, 158, 11, 0.8))",
                }}
              />
            )}
          </span>
        </button>

        {/* Notification Bell with Badge */}
        <div className="relative">
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <NotificationsNone sx={{ fontSize: 22 }} />
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
              5
            </span>
          </button>
        </div>

        {/* User Avatar, Info & Dropdown Trigger */}
        <div className="relative pl-3 border-l border-slate-100 dark:border-slate-800" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors cursor-pointer group focus:outline-none"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <img
              src={getProfileImageUrl(user?.profileImage, userName)}
              alt={userName}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-700 group-hover:ring-blue-500 shadow-xs transition-all"
            />

            <div className="hidden sm:flex flex-col text-left justify-center">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {userName}
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400 leading-tight mt-0.5">
                {roleMeta.name}
              </span>
            </div>

            <KeyboardArrowDown
              sx={{ fontSize: 18 }}
              className={`text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180 text-blue-600 dark:text-blue-400" : "group-hover:text-slate-600 dark:group-hover:text-slate-200"
              }`}
            />
          </button>

          {/* Dropdown Menu below profile */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl shadow-slate-900/10 dark:shadow-black/40 z-50 animate-fadeIn">
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


