import { SUPER_ADMIN_ROLE_ID } from "./constants";
import type { LoggedInUser, NavMenuItem, RoleMeta } from "../types";

export const workspaceMenus: NavMenuItem[] = [
  { key: "dashboard.view", label: "Dashboard", icon: "◫", to: "/dashboard", group: "Core Access", desc: "System metrics & access summary" },
  { key: "users.view", label: "User Directory", icon: "▦", to: "/add-user", group: "Core Access", desc: "Manage members & assign roles" },
  { key: "roles.view", label: "Roles", icon: "♙", to: "/roles", group: "Core Access", desc: "Configure workspace roles" },
  { key: "permissions.manage", label: "Permission Matrix", icon: "⚿", to: "/permissions", group: "Core Access", desc: "Role permission assignments" },
  { key: "user_activity.view", label: "User Activity", icon: "⏱", to: "/user-activity", group: "Operations & Audit", desc: "Live active sessions & login/logout tracking" },
  { key: "audit.view", label: "Audit Logs", icon: "◌", to: "/audit", group: "Operations & Audit", desc: "Activity & security events" },
  { key: "reports.view", label: "Reports", icon: "▤", to: "/reports", group: "Operations & Audit", desc: "Insights & exports" },
  { key: "projects.view", label: "Projects", icon: "◇", to: "/projects", group: "Operations & Audit", desc: "Project initiatives" },
  { key: "calendar.view", label: "Schedule", icon: "□", to: "/calendar", group: "Operations & Audit", desc: "Team rhythm & reviews" },
  { key: "settings.view", label: "Settings", icon: "⚙", to: "/settings", group: "Preferences", desc: "Workspace configuration" },
];

export const canAccess = (user: LoggedInUser | null, permission?: string): boolean => {
  if (!user) return false;
  if (Number(user.roleId) === SUPER_ADMIN_ROLE_ID) return true; // Super Admin bypass
  if (!permission) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
};

export const getFirstAccessiblePath = (user: LoggedInUser | null): string => {
  if (!user) return "/login";
  if (Number(user.roleId) === SUPER_ADMIN_ROLE_ID) return "/dashboard";
  if (user.menus && user.menus.length > 0 && user.menus[0]?.route) {
    return user.menus[0].route;
  }
  const accessibleMenu = workspaceMenus.find((menu) => canAccess(user, menu.key));
  if (accessibleMenu?.to) {
    return accessibleMenu.to;
  }
  return "/profile";
};

export const getRoleMeta = (roleId?: number | string, roleName?: string): RoleMeta => {
  const id = Number(roleId);
  const nameLower = (roleName || "").toLowerCase();

  if (id === SUPER_ADMIN_ROLE_ID || nameLower.includes("super admin")) {
    return {
      name: "Super Admin",
      color: "bg-purple-100 text-purple-700 border-purple-200",
      badge: "bg-purple-500",
      ring: "ring-purple-400",
    };
  }
  if (id === 1 || nameLower.includes("admin")) {
    return {
      name: roleName || "Admin",
      color: "bg-indigo-100 text-indigo-700 border-indigo-200",
      badge: "bg-indigo-500",
      ring: "ring-indigo-400",
    };
  }
  if (id === 3 || nameLower.includes("manager") || nameLower.includes("lead")) {
    return {
      name: roleName || "Manager",
      color: "bg-teal-100 text-teal-700 border-teal-200",
      badge: "bg-teal-500",
      ring: "ring-teal-400",
    };
  }
  return {
    name: roleName || "Member",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    badge: "bg-slate-500",
    ring: "ring-slate-400",
  };
};
