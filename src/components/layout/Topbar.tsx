import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu as MenuIcon,
  Search,
  NotificationsNone,
  DarkModeOutlined,
  LightModeOutlined,
  LogoutOutlined,
  KeyboardArrowDown,
  AccountCircleOutlined,
  SecurityOutlined,
} from "@mui/icons-material";
import { getRoleMeta } from "../../config/workspace.config";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { showConfirmDialog } from "../../utils/alerts";
import type { LoggedInUser } from "../../types";

export interface TopbarProps {
  user: LoggedInUser | null;
  label?: string;
  onOpenMenu: () => void;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  user,
  onOpenMenu,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      "Are you sure you want to end your active session?",
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
    <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-100 bg-white/95 px-6 backdrop-blur-md transition-colors">
      {/* Left: Hamburger & Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <button
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer transition-colors border border-slate-200/80 shadow-2xs"
          type="button"
          onClick={onOpenMenu}
          aria-label="Toggle navigation menu"
        >
          <MenuIcon sx={{ fontSize: 20 }} />
        </button>

        {/* Search Bar */}
        <div className="relative w-full max-w-xs">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search sx={{ fontSize: 18 }} />
          </div>
          <input
            type="text"
            placeholder="Search here..."
            className="w-full rounded-xl border border-slate-200/80 bg-slate-50/50 py-2 pl-9 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>
      </div>

      {/* Right: Theme Toggle, Notifications & User Profile */}
      <div className="flex items-center gap-4">
        {/* Dark Mode Quick Toggle Button */}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle dark mode theme"
        >
          {isDarkMode ? (
            <LightModeOutlined sx={{ fontSize: 21, color: "#f59e0b" }} />
          ) : (
            <DarkModeOutlined sx={{ fontSize: 21 }} />
          )}
        </button>

        {/* Notification Bell with Badge */}
        <div className="relative">
          <button
            type="button"
            className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <NotificationsNone sx={{ fontSize: 22 }} />
            <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
              5
            </span>
          </button>
        </div>

        {/* User Avatar, Info & Dropdown Trigger */}
        <div className="relative pl-3 border-l border-slate-100" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group focus:outline-none"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=2563eb&color=fff&size=128`}
              alt={userName}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-blue-500 shadow-xs transition-all"
            />

            <div className="hidden sm:flex flex-col text-left justify-center">
              <span className="text-xs font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                {userName}
              </span>
              <span className="text-[11px] font-medium text-slate-400 leading-tight mt-0.5">
                {roleMeta.name}
              </span>
            </div>

            <KeyboardArrowDown
              sx={{ fontSize: 18 }}
              className={`text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180 text-blue-600" : "group-hover:text-slate-600"
              }`}
            />
          </button>

          {/* Dropdown Menu below profile */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl shadow-slate-900/10 z-50 animate-fadeIn">
              {/* Profile Summary Header */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=2563eb&color=fff&size=128`}
                  alt={userName}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-blue-500/20 shadow-2xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {userName}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{userEmail}</p>
                  <span className="mt-1 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-bold text-purple-700">
                    {roleMeta.name}
                  </span>
                </div>
              </div>

              {/* Menu Actions */}
              <div className="mt-1.5 space-y-0.5">
                <Link
                  to="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <AccountCircleOutlined sx={{ fontSize: 18, color: "#64748b" }} />
                  <span>My Profile & Security</span>
                </Link>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
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


