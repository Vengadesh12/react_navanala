import { SUPER_ADMIN_ROLE_ID } from "./constants";
import type { LoggedInUser, NavMenuItem, RoleMeta } from "../types";

export const workspaceMenus: NavMenuItem[] = [
  { key: "dashboard.view", label: "Dashboard", icon: "◫", to: "/dashboard", group: "Core Access", desc: "System metrics & access summary" },
  { key: "users.view", label: "User Directory", icon: "▦", to: "/add-user", group: "Core Access", desc: "Manage members & assign roles" },
  { key: "roles.view", label: "Roles", icon: "♙", to: "/roles", group: "Core Access", desc: "Configure workspace roles" },
  { key: "departments.view", label: "Departments", icon: "🏢", to: "/departments", group: "Core Access", desc: "Department hierarchy & designation mapping" },
  { key: "permissions.manage", label: "Permission Matrix", icon: "⚿", to: "/permissions", group: "Core Access", desc: "Role permission assignments" },
  { key: "approvals.view", label: "Create Approval", icon: "✓", to: "/create-approval", group: "Core Access", desc: "Raise resource requests and manager approval workflows" },
  { key: "purchases.view", label: "Purchases", icon: "🛒", to: "/purchases", group: "Core Access", desc: "Manage approved product vendor quotations & procurement" },
  { key: "invoices.view", label: "Invoice", icon: "🧾", to: "/invoices", group: "Core Access", desc: "Generate & manage customer invoices with GST and PDF download" },
  { key: "user_activity.view", label: "User Activity", icon: "⏱", to: "/user-activity", group: "Operations & Audit", desc: "Live active sessions & login/logout tracking" },
  { key: "audit.view", label: "Audit Logs", icon: "◌", to: "/audit", group: "Operations & Audit", desc: "Activity & security events" },
  { key: "reports.view", label: "Reports", icon: "▤", to: "/reports", group: "Operations & Audit", desc: "Insights & exports" },
  { key: "projects.view", label: "Projects", icon: "◇", to: "/projects", group: "Operations & Audit", desc: "Project initiatives" },
  { key: "calendar.view", label: "Schedule", icon: "□", to: "/calendar", group: "Operations & Audit", desc: "Team rhythm & reviews" },
  { key: "settings.view", label: "Settings", icon: "⚙", to: "/settings", group: "Preferences", desc: "Workspace configuration" },
];

export const canAccess = (user: LoggedInUser | null, permission?: string): boolean => {
  if (!user) return false;
  const roleId = Number(user.roleId);
  const roleName = (user.roleName || "").toLowerCase();
  const deptName = (user.departmentName || "").toLowerCase();
  const designationName = (user.designationName || "").toLowerCase();

  // Super Admin bypass
  if (roleId === SUPER_ADMIN_ROLE_ID || roleName.includes("super admin") || roleName === "admin") return true;

  if (!permission) return true;

  // Purchases module specific access rule: Super Admin, Manager, or HR Department
  if (permission === "purchases.view" || permission === "purchases.manage" || permission === "purchases.create") {
    const isManager = roleId === 3 || roleName.includes("manager") || designationName.includes("manager") || roleName.includes("lead");
    const isHrDepartment = deptName.includes("hr") || deptName.includes("human resources") || designationName.includes("hr");
    if (isManager || isHrDepartment) return true;
  }

  // Invoices module specific access rule: Super Admin, Manager
  if (permission === "invoices.view" || permission === "invoices.create" || permission === "invoices.edit" || permission === "invoices.delete" || permission === "invoices.manage") {
    const isManager = roleId === 3 || roleName.includes("manager") || designationName.includes("manager") || roleName.includes("lead");
    if (isManager) return true;
  }

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
  const nameLower = (roleName || "").toLowerCase().trim();

  if (id === SUPER_ADMIN_ROLE_ID || nameLower.includes("super admin")) {
    return {
      name: roleName || "Super Admin",
      color: "bg-purple-50 text-purple-700 border-purple-200",
      badge: "bg-purple-600",
      ring: "ring-purple-400",
    };
  }
  if (nameLower.includes("admin")) {
    return {
      name: roleName || "Admin",
      color: "bg-indigo-50 text-indigo-700 border-indigo-200",
      badge: "bg-indigo-600",
      ring: "ring-indigo-400",
    };
  }
  if (nameLower.includes("manager") || nameLower.includes("lead") || nameLower.includes("supervisor")) {
    return {
      name: roleName || "Manager",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      badge: "bg-emerald-600",
      ring: "ring-emerald-400",
    };
  }
  if (nameLower.includes("employee") || nameLower.includes("member") || nameLower.includes("staff") || nameLower.includes("user")) {
    return {
      name: roleName || "Employee",
      color: "bg-sky-50 text-sky-700 border-sky-200",
      badge: "bg-sky-600",
      ring: "ring-sky-400",
    };
  }
  if (nameLower.includes("auditor") || nameLower.includes("compliance") || nameLower.includes("security")) {
    return {
      name: roleName || "Auditor",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      badge: "bg-amber-600",
      ring: "ring-amber-400",
    };
  }

  const palettes = [
    { color: "bg-blue-50 text-blue-700 border-blue-200", badge: "bg-blue-600", ring: "ring-blue-400" },
    { color: "bg-rose-50 text-rose-700 border-rose-200", badge: "bg-rose-600", ring: "ring-rose-400" },
    { color: "bg-teal-50 text-teal-700 border-teal-200", badge: "bg-teal-600", ring: "ring-teal-400" },
    { color: "bg-violet-50 text-violet-700 border-violet-200", badge: "bg-violet-600", ring: "ring-violet-400" },
    { color: "bg-cyan-50 text-cyan-700 border-cyan-200", badge: "bg-cyan-600", ring: "ring-cyan-400" },
  ];
  const idx = Math.abs(id || (roleName ? roleName.length : 0)) % palettes.length;
  return {
    name: roleName || "Role",
    ...palettes[idx],
  };
};
