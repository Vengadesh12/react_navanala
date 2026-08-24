import React from "react";
import { Link } from "react-router-dom";
import { canAccess, workspaceMenus } from "../../config/workspace.config";
import type { LoggedInUser, NavGroup } from "../../types";

export interface WorkspaceNavigationProps {
  user: LoggedInUser | null;
  activeKey?: string;
  onNavigate?: () => void;
}

const groups: NavGroup[] = [
  {
    title: "Core Access",
    keys: ["dashboard.view", "users.view", "roles.view", "permissions.manage"],
  },
  {
    title: "Operations & Audit",
    keys: ["audit.view", "reports.view", "projects.view", "calendar.view"],
  },
  {
    title: "Preferences",
    keys: ["settings.view"],
  },
];

export const WorkspaceNavigation: React.FC<WorkspaceNavigationProps> = ({
  user,
  activeKey,
  onNavigate,
}) => {
  const allowed = workspaceMenus.filter((menu) => canAccess(user, menu.key));

  return (
    <nav
      className="flex-1 space-y-6 overflow-y-auto pr-1"
      aria-label="Main navigation"
    >
      {groups.map((group) => {
        const groupMenus = allowed.filter((menu) => group.keys.includes(menu.key));
        if (groupMenus.length === 0) return null;

        return (
          <div key={group.title} className="space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {group.title}
            </p>
            <div className="space-y-1 pt-1">
              {groupMenus.map((menu) => {
                const isActive = activeKey === menu.key;
                return (
                  <Link
                    key={menu.key}
                    to={menu.to}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                    title={menu.desc}
                  >
                    <span
                      className={`grid h-5 w-5 place-items-center text-sm ${
                        isActive ? "text-white" : "text-slate-400"
                      }`}
                    >
                      {menu.icon}
                    </span>
                    <span className="truncate">{menu.label}</span>
                    {menu.key === "permissions.manage" && (
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive ? "bg-white/20 text-white" : "bg-indigo-500/20 text-indigo-300"
                        }`}
                      >
                        Matrix
                      </span>
                    )}
                    {menu.key === "roles.view" && (
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        RBAC
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
};
