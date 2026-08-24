import React from "react";
import { Link } from "react-router-dom";
import { Close, Shield } from "@mui/icons-material";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import type { LoggedInUser } from "../../types";

export interface SidebarProps {
  user: LoggedInUser | null;
  activeKey?: string;
  menuOpen: boolean;
  onCloseMenu: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeKey,
  menuOpen,
  onCloseMenu,
}) => {
  return (
    <>
      {/* Mobile Menu Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onCloseMenu}
        />
      )}

      {/* Main Aside */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-950 p-4 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex flex-1 flex-col min-h-0">
          <div className="mb-6 flex shrink-0 items-center justify-between px-2 pt-2">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <Shield sx={{ fontSize: 22 }} />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-white">RoleVault</h1>
                <span className="block text-[11px] font-semibold tracking-wider uppercase text-indigo-400">
                  Access & RBAC
                </span>
              </div>
            </Link>
            <button
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden cursor-pointer"
              type="button"
              onClick={onCloseMenu}
              aria-label="Close navigation menu"
            >
              <Close sx={{ fontSize: 20 }} />
            </button>
          </div>

          {/* Navigation links */}
          <WorkspaceNavigation
            user={user}
            activeKey={activeKey}
            onNavigate={onCloseMenu}
          />
        </div>

        {/* Sidebar Footer Branding */}
        <div className="border-t border-slate-900 px-3 py-2 text-[11px] text-slate-600">
          <span>RoleVault Governance &copy; {new Date().getFullYear()}</span>
        </div>
      </aside>
    </>
  );
};
