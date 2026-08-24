import React from "react";
import { Menu, Logout, Security } from "@mui/icons-material";
import { getRoleMeta } from "../../config/workspace.config";
import { showConfirmDialog } from "../../utils/alerts";
import type { LoggedInUser } from "../../types";

export interface TopbarProps {
  user: LoggedInUser | null;
  label: string;
  onOpenMenu: () => void;
  onLogout: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  user,
  label,
  onOpenMenu,
  onLogout,
}) => {
  const roleMeta = getRoleMeta(
    user?.roleId,
    Number(user?.roleId) === 2 ? "Super Admin" : user?.roleName || "Member"
  );
  const userName = user?.name || user?.email || "Workspace User";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogoutClick = async () => {
    const result = await showConfirmDialog(
      "Sign Out?",
      "Are you sure you want to end your active session?",
      "Sign Out",
      "Stay Logged In",
      true
    );

    if (result.isConfirmed) {
      onLogout();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md shadow-xs">
      {/* Left Navbar: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center">
        <button
          className="mr-3 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden cursor-pointer"
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
        >
          <Menu sx={{ fontSize: 22 }} />
        </button>

        <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
          <span className="hover:text-slate-900 cursor-pointer">Workspace</span>
          <span>/</span>
          <span className="font-semibold text-slate-900">{label}</span>
        </div>
      </div>

      {/* Right Navbar: Live Sync, User Profile & Logout Button */}
      <div className="flex items-center gap-3">
        <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          <Security sx={{ fontSize: 14, color: "#6366f1" }} />
          {roleMeta.name}
        </span>

        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Sync
        </span>

        {/* User Avatar & Name Pill */}
        <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 py-1 pl-1.5 pr-3">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
            {userInitial}
          </div>
          <div className="hidden sm:block text-left">
            <span className="block max-w-[120px] truncate text-xs font-bold text-slate-900 leading-tight">
              {userName}
            </span>
            <span className="block text-[10px] text-slate-500 leading-tight">
              {roleMeta.name}
            </span>
          </div>
        </div>

        {/* Topbar Logout Button */}
        <button
          type="button"
          onClick={handleLogoutClick}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          title="Sign out of your session"
        >
          <Logout sx={{ fontSize: 16 }} />
          <span className="hidden xs:inline font-bold">Logout</span>
        </button>
      </div>
    </header>
  );
};
