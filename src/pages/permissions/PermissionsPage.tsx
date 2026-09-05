import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Key,
  Shield,
  Save,
  Undo,
  Layers,
  Tune,
  People,
  Refresh,
  Search,
  Close,
  CorporateFare,
  CheckCircle,
  AccountTreeOutlined,
  InfoOutlined,
  FactCheckOutlined,
  ReceiptLongOutlined,
  ShoppingCartOutlined,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { SearchInput } from "../../components/common/SearchInput";
import { ToggleSwitch } from "../../components/common/ToggleSwitch";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { permissionService } from "../../api/permission.service";
import { useAuth } from "../../hooks/useAuth";
import { getFirstAccessiblePath, getRoleMeta } from "../../config/workspace.config";
import { showConfirmDialog, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import type {
  CategoryWithPermissions,
  PermissionCategory,
  PermissionsApiResponse,
} from "../../types";

const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: "invoices",
    name: "Invoice & Billing Governance",
    desc: "Create, view, manage, and delete customer invoices with GST control and PDF generation",
    icon: <ReceiptLongOutlined sx={{ fontSize: 20 }} />,
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
    keys: ["invoices.view", "invoices.create", "invoices.edit", "invoices.delete", "invoices.manage"],
  },
  {
    id: "purchases",
    name: "Purchases & Vendor Procurement",
    desc: "Procurement records, vendor quotes, and commercial terms for approved products",
    icon: <ShoppingCartOutlined sx={{ fontSize: 20 }} />,
    color: "bg-teal-50 text-teal-700 border-teal-200",
    keys: ["purchases.view", "purchases.create", "purchases.manage"],
  },
  {
    id: "users",
    name: "User Directory & Management",
    desc: "Member records, role assignment, and directory operations",
    icon: <People sx={{ fontSize: 20 }} />,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    keys: ["users.view", "users.create", "users.edit", "users.delete", "users.manage"],
  },
  {
    id: "departments",
    name: "Department & Hierarchy Management",
    desc: "Organizational structure, department hierarchy, and designation mapping",
    icon: <CorporateFare sx={{ fontSize: 20 }} />,
    color: "bg-teal-50 text-teal-700 border-teal-200",
    keys: ["departments.view", "departments.create", "departments.edit", "departments.delete", "departments.manage"],
  },
  {
    id: "roles",
    name: "Roles & RBAC Management",
    desc: "Create and configure access tiers in the workspace",
    icon: <Shield sx={{ fontSize: 20 }} />,
    color: "bg-purple-50 text-purple-700 border-purple-200",
    keys: ["roles.view", "roles.create", "roles.edit", "roles.delete", "roles.manage"],
  },
  {
    id: "approvals",
    name: "Approvals & Resource Requests",
    desc: "Employee product requests, equipment workflows, and manager approval decisions",
    icon: <FactCheckOutlined sx={{ fontSize: 20 }} />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    keys: ["approvals.view", "approvals.create", "approvals.manage"],
  },
  {
    id: "access",
    name: "Permission Matrix Governance",
    desc: "Assign capabilities and authorize operations",
    icon: <Key sx={{ fontSize: 20 }} />,
    color: "bg-rose-50 text-rose-700 border-rose-200",
    keys: ["permissions.manage"],
  },
  {
    id: "operations",
    name: "Operations & Workspaces",
    desc: "Access to dashboards, projects, calendar, and reports",
    icon: <Layers sx={{ fontSize: 20 }} />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    keys: ["dashboard.view", "reports.view", "projects.view", "calendar.view"],
  },
  {
    id: "system",
    name: "System Security & Audit",
    desc: "System configurations, live user activity monitoring, session force logout, and immutable audit logs",
    icon: <Tune sx={{ fontSize: 20 }} />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    keys: ["settings.view", "settings.maintenance", "audit.view", "user_activity.view", "user_activity.force_logout", "user_activity.manage"],
  },
];

export const PermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, can, refreshPermissions } = useAuth();

  const [data, setData] = useState<PermissionsApiResponse>({ permissions: [], roles: [], departments: [] });
  const [scope, setScope] = useState<"role" | "department">("role");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [originalKeys, setOriginalKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPermissionsData = (targetScope = scope, targetId?: string) => {
    setLoading(true);
    setError("");
    permissionService
      .getPermissionsMatrix()
      .then((result) => {
        setData(result);
        
        const currentScope = targetScope;
        if (currentScope === "role") {
          if (result.roles && result.roles.length > 0) {
            const roleIdFromUrl = targetId || searchParams.get("roleId") || searchParams.get("role");
            const currentRole =
              (roleIdFromUrl &&
                result.roles.find(
                  (r) =>
                    String(r.roleId) === String(roleIdFromUrl) ||
                    r.roleName?.toLowerCase() === roleIdFromUrl.toLowerCase()
                )) ||
              (selectedRoleId && result.roles.find((r) => String(r.roleId) === String(selectedRoleId))) ||
              result.roles[0];

            setSelectedRoleId(String(currentRole.roleId));
            const keys = currentRole.permissionKeys || [];
            setSelectedKeys(keys);
            setOriginalKeys(keys);
          }
        } else {
          if (result.departments && result.departments.length > 0) {
            const deptIdFromUrl = targetId || searchParams.get("deptId") || searchParams.get("departmentId");
            const currentDept =
              (deptIdFromUrl &&
                result.departments.find(
                  (d) =>
                    String(d.departmentId) === String(deptIdFromUrl) ||
                    d.departmentName?.toLowerCase() === deptIdFromUrl.toLowerCase()
                )) ||
              (selectedDeptId && result.departments.find((d) => String(d.departmentId) === String(selectedDeptId))) ||
              result.departments[0];

            setSelectedDeptId(String(currentDept.departmentId));
            const keys = currentDept.permissionKeys || [];
            setSelectedKeys(keys);
            setOriginalKeys(keys);
          }
        }
      })
      .catch((err) => {
        console.error("Permissions API error:", err);
        setError("Could not load permissions matrix. Please check backend connection.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || !(Number(user.roleId) === 2 || can("permissions.manage"))) {
      navigate(getFirstAccessiblePath(user), { replace: true });
      return;
    }

    const scopeFromUrl = searchParams.get("scope");
    const initialScope = scopeFromUrl === "department" ? "department" : "role";
    setScope(initialScope);
    fetchPermissionsData(initialScope);
  }, [navigate]);

  const activeRole = useMemo(() => {
    return data.roles.find((r) => String(r.roleId) === String(selectedRoleId)) || null;
  }, [data.roles, selectedRoleId]);

  const activeDept = useMemo(() => {
    return data.departments?.find((d) => String(d.departmentId) === String(selectedDeptId)) || null;
  }, [data.departments, selectedDeptId]);

  const hasUnsavedChanges = useMemo(() => {
    if (selectedKeys.length !== originalKeys.length) return true;
    const sortedSel = [...selectedKeys].sort();
    const sortedOrig = [...originalKeys].sort();
    return sortedSel.some((key, idx) => key !== sortedOrig[idx]);
  }, [selectedKeys, originalKeys]);

  const handleScopeChange = async (newScope: "role" | "department") => {
    if (newScope === scope) return;

    if (hasUnsavedChanges) {
      const activeName = scope === "role" ? activeRole?.roleName : activeDept?.departmentName;
      const result = await showConfirmDialog(
        "Unsaved Changes",
        `You have unsaved permission changes for "${activeName}". Do you want to discard them?`,
        "Discard & Switch",
        "Stay Here",
        false
      );
      if (!result.isConfirmed) return;
    }

    setScope(newScope);
    setSearchParams({ scope: newScope }, { replace: true });

    if (newScope === "role") {
      const targetRole = data.roles[0];
      if (targetRole) {
        setSelectedRoleId(String(targetRole.roleId));
        setSelectedKeys(targetRole.permissionKeys || []);
        setOriginalKeys(targetRole.permissionKeys || []);
      }
    } else {
      const targetDept = data.departments?.[0];
      if (targetDept) {
        setSelectedDeptId(String(targetDept.departmentId));
        setSelectedKeys(targetDept.permissionKeys || []);
        setOriginalKeys(targetDept.permissionKeys || []);
      }
    }
  };

  const handleRoleDropdownChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = e.target.value;
    if (hasUnsavedChanges) {
      const result = await showConfirmDialog(
        "Unsaved Changes",
        `You have unsaved changes for "${activeRole?.roleName}". Do you want to discard them?`,
        "Discard & Switch",
        "Stay Here",
        false
      );
      if (!result.isConfirmed) return;
    }
    applyRoleSwitch(roleId);
  };

  const applyRoleSwitch = (roleId: string) => {
    const role = data.roles.find((item) => String(item.roleId) === String(roleId));
    setSelectedRoleId(String(roleId));
    setSearchParams({ scope: "role", roleId: String(roleId) }, { replace: true });
    const keys = role?.permissionKeys || [];
    setSelectedKeys([...keys]);
    setOriginalKeys([...keys]);
  };

  const handleDeptDropdownChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptId = e.target.value;
    if (hasUnsavedChanges) {
      const result = await showConfirmDialog(
        "Unsaved Changes",
        `You have unsaved changes for department "${activeDept?.departmentName}". Do you want to discard them?`,
        "Discard & Switch",
        "Stay Here",
        false
      );
      if (!result.isConfirmed) return;
    }
    applyDeptSwitch(deptId);
  };

  const applyDeptSwitch = (deptId: string) => {
    const dept = data.departments?.find((item) => String(item.departmentId) === String(deptId));
    setSelectedDeptId(String(deptId));
    setSearchParams({ scope: "department", deptId: String(deptId) }, { replace: true });
    const keys = dept?.permissionKeys || [];
    setSelectedKeys([...keys]);
    setOriginalKeys([...keys]);
  };

  const togglePermission = (key: string) => {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    );
  };

  const handleToggleCategory = (categoryKeys: string[], shouldSelectAll: boolean) => {
    setSelectedKeys((current) => {
      if (shouldSelectAll) {
        return Array.from(new Set([...current, ...categoryKeys]));
      } else {
        return current.filter((k) => !categoryKeys.includes(k));
      }
    });
  };

  const handleGrantAll = () => {
    const allKeys = data.permissions.map((p) => p.permissionKey);
    setSelectedKeys(allKeys);
  };

  const handleRevokeAll = () => {
    setSelectedKeys([]);
  };

  const handleDiscardChanges = () => {
    setSelectedKeys([...originalKeys]);
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      if (scope === "role") {
        if (!selectedRoleId) return;
        await permissionService.updateRolePermissions(selectedRoleId, selectedKeys);

        setData((current) => ({
          ...current,
          roles: current.roles.map((r) =>
            String(r.roleId) === String(selectedRoleId) ? { ...r, permissionKeys: [...selectedKeys] } : r
          ),
        }));
        setOriginalKeys([...selectedKeys]);

        await refreshPermissions(true);
        await showSuccessAlert(
          "Role Permissions Saved",
          `Permissions for role "${activeRole?.roleName}" updated successfully.`
        );
      } else {
        if (!selectedDeptId) return;
        await permissionService.updateDepartmentPermissions(selectedDeptId, selectedKeys);

        setData((current) => ({
          ...current,
          departments: (current.departments || []).map((d) =>
            String(d.departmentId) === String(selectedDeptId) ? { ...d, permissionKeys: [...selectedKeys] } : d
          ),
        }));
        setOriginalKeys([...selectedKeys]);

        await refreshPermissions(true);
        await showSuccessAlert(
          "Department Permissions Saved",
          `Permissions for department "${activeDept?.departmentName}" updated successfully. Users with mapped designations automatically inherit these permissions!`
        );
      }
    } catch (saveError: any) {
      console.error("Save Permissions Error:", saveError);
      await showErrorAlert("Save Failed", saveError.message || "Could not update permissions.");
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories: CategoryWithPermissions[] = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const mappedKeys = new Set(PERMISSION_CATEGORIES.flatMap((c) => c.keys));
    const unmappedPerms = data.permissions.filter((p) => !mappedKeys.has(p.permissionKey));

    const categories: CategoryWithPermissions[] = PERMISSION_CATEGORIES.map((cat) => {
      const catPerms = data.permissions.filter((p) => cat.keys.includes(p.permissionKey));
      const filtered = catPerms.filter(
        (p) =>
          !q ||
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.permissionKey?.toLowerCase().includes(q)
      );
      return {
        ...cat,
        permissions: filtered,
        totalInCat: catPerms.length,
      };
    }).filter((cat) => cat.permissions.length > 0);

    if (unmappedPerms.length > 0) {
      const filteredUnmapped = unmappedPerms.filter(
        (p) =>
          !q ||
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.permissionKey?.toLowerCase().includes(q)
      );
      if (filteredUnmapped.length > 0) {
        categories.push({
          id: "other",
          name: "Additional Capabilities",
          desc: "Other permissions configured in the workspace",
          icon: <Layers sx={{ fontSize: 20 }} />,
          color: "bg-slate-50 text-slate-700 border-slate-200",
          keys: unmappedPerms.map((p) => p.permissionKey),
          permissions: filteredUnmapped,
          totalInCat: unmappedPerms.length,
        });
      }
    }

    return categories;
  }, [data.permissions, searchQuery]);

  if (!user || !(Number(user.roleId) === 2 || can("permissions.manage"))) {
    return null;
  }

  const roleMeta = activeRole ? getRoleMeta(activeRole.roleId, activeRole.roleName) : null;

  return (
    <WorkspaceLayout
      permission="permissions.manage"
      label="Permission Matrix"
      icon="⚿"
      showHero={false}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search permissions by name, description, or key..."
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Scope Switcher Segmented Control */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div className="inline-flex rounded-2xl bg-slate-200/80 p-1.5 dark:bg-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleScopeChange("role")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                scope === "role"
                  ? "bg-white text-indigo-700 shadow-md dark:bg-slate-900 dark:text-indigo-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Shield sx={{ fontSize: 17 }} />
              <span>Role Permissions</span>
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange("department")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                scope === "department"
                  ? "bg-white text-teal-700 shadow-md dark:bg-slate-900 dark:text-teal-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <CorporateFare sx={{ fontSize: 17 }} />
              <span>Department Permissions</span>
            </button>
          </div>
        </div>

        {/* Department Permission Inheritance Explanation Banner */}
        {scope === "department" && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/80 p-4 text-xs dark:border-teal-900/60 dark:bg-teal-950/40">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
              <AccountTreeOutlined sx={{ fontSize: 20 }} />
            </div>
            <div>
              <strong className="font-bold text-teal-900 dark:text-teal-200">
                Department-Level Permission Inheritance Active
              </strong>
              <p className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5">
                Any permissions assigned to a department are automatically granted to all users whose designation belongs to that department (in addition to their role permissions).
              </p>
            </div>
          </div>
        )}

        {/* Active Search Results Banner */}
        {searchQuery.trim() && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Search sx={{ fontSize: 18, color: "#6366f1" }} />
              <span>
                Showing <strong>{filteredCategories.length}</strong> matching permission categor{filteredCategories.length === 1 ? "y" : "ies"} for{" "}
                <span className="rounded-md bg-white dark:bg-slate-900 px-2 py-0.5 font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Close sx={{ fontSize: 15 }} />
              <span>Clear Filter</span>
            </button>
          </div>
        )}

        {/* Loading / Error States */}
        {loading && <LoadingSpinner message="Loading access control matrix..." />}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
            <p className="font-semibold">{error}</p>
            <button
              onClick={() => fetchPermissionsData(scope)}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 mt-3"
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Primary Selector Dropdown Card */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
                {/* Selector Dropdown */}
                {scope === "role" ? (
                  <div>
                    <label
                      htmlFor="role-select"
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      <Shield sx={{ fontSize: 16, color: "#6366f1" }} />
                      Select Role to Configure:
                    </label>
                    <div className="relative">
                      <select
                        id="role-select"
                        value={selectedRoleId}
                        onChange={handleRoleDropdownChange}
                        className="w-full rounded-xl border border-indigo-200 bg-white py-2.5 pl-3.5 pr-10 text-sm font-semibold text-slate-800 shadow-xs transition-all focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-indigo-900 dark:bg-slate-950 dark:text-white cursor-pointer"
                      >
                        {data.roles.map((role) => {
                          const count = (role.permissionKeys || []).length;
                          return (
                            <option key={role.roleId} value={role.roleId}>
                              {role.roleName} (ID: {role.roleId}) — {count} permissions active
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="dept-select"
                      className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      <CorporateFare sx={{ fontSize: 16, color: "#0d9488" }} />
                      Select Department to Configure:
                    </label>
                    <div className="relative">
                      <select
                        id="dept-select"
                        value={selectedDeptId}
                        onChange={handleDeptDropdownChange}
                        className="w-full rounded-xl border border-teal-200 bg-white py-2.5 pl-3.5 pr-10 text-sm font-semibold text-slate-800 shadow-xs transition-all focus:border-teal-600 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 dark:border-teal-900 dark:bg-slate-950 dark:text-white cursor-pointer"
                      >
                        {(data.departments || []).map((dept) => {
                          const count = (dept.permissionKeys || []).length;
                          return (
                            <option key={dept.departmentId} value={dept.departmentId}>
                              {dept.departmentName} (ID: {dept.departmentId}) — {count} permissions active
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}

                {/* Quick Stats on Selected Target */}
                {scope === "role" && activeRole ? (
                  <div className="flex items-center gap-3 border-t border-slate-100 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0 dark:border-slate-800">
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-xl border ${
                        roleMeta?.color || "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      <Key sx={{ fontSize: 20 }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900 dark:text-white">{activeRole.roleName}</strong>
                        {hasUnsavedChanges && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Unsaved
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedKeys.length} of {data.permissions.length} capabilities assigned
                      </span>
                    </div>
                  </div>
                ) : scope === "department" && activeDept ? (
                  <div className="flex items-center gap-3 border-t border-slate-100 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0 dark:border-slate-800">
                    <div className="grid h-10 w-10 place-items-center rounded-xl border bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800">
                      <CorporateFare sx={{ fontSize: 20 }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900 dark:text-white">{activeDept.departmentName}</strong>
                        {hasUnsavedChanges && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Unsaved
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedKeys.length} of {data.permissions.length} capabilities assigned
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Quick Batch Actions */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleGrantAll}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    title="Grant all permissions to this target"
                  >
                    Grant All
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokeAll}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 shadow-xs transition-all hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    title="Revoke all permissions from this target"
                  >
                    Revoke All
                  </button>
                </div>
              </div>
            </div>

            {/* Search & Actions Bar */}
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex-1 min-w-[260px]">
                <SearchInput
                  className="w-full"
                  placeholder="Search permissions by name, description, or key..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Total System Capabilities: <strong className="text-slate-800 dark:text-white">{data.permissions.length}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => fetchPermissionsData(scope)}
                  disabled={loading}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  title="Reload Matrix"
                >
                  <Refresh sx={{ fontSize: 18 }} className={loading ? "animate-spin" : ""} />
                  <span>{loading ? "Syncing..." : "Refresh"}</span>
                </button>
              </div>
            </div>

            {/* Categories & Permission Cards */}
            <div className="space-y-6">
              {filteredCategories.map((cat) => {
                const catKeys = cat.permissions.map((p) => p.permissionKey);
                const assignedInCat = catKeys.filter((k) => selectedKeys.includes(k)).length;
                const allSelected = assignedInCat === catKeys.length && catKeys.length > 0;

                return (
                  <div
                    key={cat.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Category Header */}
                    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-6 py-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="flex items-center gap-3">
                        <div className={`grid h-9 w-9 place-items-center rounded-xl border ${cat.color} dark:bg-opacity-20`}>
                          {cat.icon}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{cat.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{cat.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {assignedInCat} / {cat.permissions.length} active
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleCategory(catKeys, !allSelected)}
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          {allSelected ? "Revoke Category" : "Grant Category"}
                        </button>
                      </div>
                    </div>

                    {/* Permissions Grid */}
                    <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                      {cat.permissions.map((permission) => {
                        const isChecked = selectedKeys.includes(permission.permissionKey);

                        return (
                          <div
                            key={permission.permissionKey}
                            onClick={() => togglePermission(permission.permissionKey)}
                            className={`flex items-start justify-between gap-4 rounded-xl border p-4 transition-all cursor-pointer ${
                              isChecked
                                ? scope === "department"
                                  ? "border-teal-300 bg-teal-50/50 shadow-2xs dark:border-teal-800 dark:bg-teal-950/30"
                                  : "border-indigo-200 bg-indigo-50/40 shadow-2xs dark:border-indigo-800 dark:bg-indigo-950/30"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <strong className="block text-xs font-bold text-slate-800 dark:text-white">
                                {permission.name}
                              </strong>
                              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                {permission.description}
                              </p>
                              <span className="mt-2 inline-block rounded font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 dark:bg-slate-800 dark:text-slate-400">
                                {permission.permissionKey}
                              </span>
                            </div>

                            <ToggleSwitch
                              checked={isChecked}
                              onChange={() => togglePermission(permission.permissionKey)}
                              ariaLabel={`Toggle ${permission.name}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Floating Save Bar when changes exist */}
            {hasUnsavedChanges && (
              <div className="sticky bottom-6 z-40 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl animate-fade-in mt-6">
                <div className="flex items-center gap-3">
                  <div className={`grid h-8 w-8 place-items-center rounded-lg text-white font-bold text-xs ${scope === "department" ? "bg-teal-600" : "bg-indigo-600"}`}>
                    !
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Unsaved Changes for {scope === "role" ? activeRole?.roleName : activeDept?.departmentName}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {selectedKeys.length} permissions currently assigned
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-xs transition-all hover:bg-slate-700 disabled:opacity-50"
                    disabled={saving}
                  >
                    <Undo sx={{ fontSize: 16 }} />
                    <span>Discard</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSavePermissions}
                    className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all disabled:opacity-50 ${
                      scope === "department"
                        ? "bg-teal-600 hover:bg-teal-500 shadow-teal-600/30"
                        : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30"
                    }`}
                    disabled={saving}
                  >
                    <Save sx={{ fontSize: 16 }} />
                    <span>{saving ? "Saving Changes..." : "Save Permissions"}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
};

export default PermissionsPage;
