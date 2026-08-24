import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Key,
  Shield,
  Save,
  Undo,
  Layers,
  Tune,
  People,
  Refresh,
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
    id: "users",
    name: "User Directory & Management",
    desc: "Member records, role assignment, and directory operations",
    icon: <People sx={{ fontSize: 20 }} />,
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    keys: ["users.view", "users.create", "users.edit", "users.delete", "users.manage"],
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
    desc: "System configurations, preferences, and immutable audit logs",
    icon: <Tune sx={{ fontSize: 20 }} />,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    keys: ["settings.view", "audit.view"],
  },
];

export const PermissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, can } = useAuth();

  const [data, setData] = useState<PermissionsApiResponse>({ permissions: [], roles: [] });
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [originalKeys, setOriginalKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPermissionsData = () => {
    setLoading(true);
    setError("");
    permissionService
      .getPermissionsMatrix()
      .then((result) => {
        setData(result);
        if (result.roles && result.roles.length > 0) {
          const currentRole = selectedRoleId
            ? result.roles.find((r) => String(r.roleId) === String(selectedRoleId)) || result.roles[0]
            : result.roles[0];
          setSelectedRoleId(String(currentRole.roleId));
          const keys = currentRole.permissionKeys || [];
          setSelectedKeys(keys);
          setOriginalKeys(keys);
        }
      })
      .catch((err) => {
        console.error("Permissions API error:", err);
        setError("Could not load permissions. Ensure the backend database tables exist.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user || !(Number(user.roleId) === 2 || can("permissions.manage"))) {
      navigate(getFirstAccessiblePath(user), { replace: true });
      return;
    }
    fetchPermissionsData();
  }, [navigate]);

  const activeRole = useMemo(() => {
    return data.roles.find((r) => String(r.roleId) === String(selectedRoleId)) || null;
  }, [data.roles, selectedRoleId]);

  const hasUnsavedChanges = useMemo(() => {
    if (selectedKeys.length !== originalKeys.length) return true;
    const sortedSel = [...selectedKeys].sort();
    const sortedOrig = [...originalKeys].sort();
    return sortedSel.some((key, idx) => key !== sortedOrig[idx]);
  }, [selectedKeys, originalKeys]);

  const handleDropdownChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleId = e.target.value;
    if (hasUnsavedChanges) {
      const result = await showConfirmDialog(
        "Unsaved Changes",
        `You have unsaved changes for "${activeRole?.roleName}". Do you want to discard them and switch to another role?`,
        "Discard & Switch",
        "Stay Here",
        false
      );
      if (result.isConfirmed) {
        applyRoleSwitch(roleId);
      }
      return;
    }
    applyRoleSwitch(roleId);
  };

  const applyRoleSwitch = (roleId: string) => {
    const role = data.roles.find((item) => String(item.roleId) === String(roleId));
    setSelectedRoleId(String(roleId));
    const keys = role?.permissionKeys || [];
    setSelectedKeys(keys);
    setOriginalKeys(keys);
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
    setSelectedKeys(originalKeys);
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await permissionService.updateRolePermissions(selectedRoleId, selectedKeys);

      setData((current) => ({
        ...current,
        roles: current.roles.map((r) =>
          String(r.roleId) === String(selectedRoleId) ? { ...r, permissionKeys: selectedKeys } : r
        ),
      }));
      setOriginalKeys(selectedKeys);

      await showSuccessAlert(
        "Permissions Saved",
        `Permissions for role "${activeRole?.roleName}" were updated successfully.`
      );
    } catch (saveError: any) {
      console.error("Save Permissions Error:", saveError);
      await showErrorAlert("Save Failed", saveError.message || "Could not update role permissions.");
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories: CategoryWithPermissions[] = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return PERMISSION_CATEGORIES.map((cat) => {
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
  }, [data.permissions, searchQuery]);

  if (!user || !(Number(user.roleId) === 2 || can("permissions.manage"))) {
    return null;
  }

  const roleMeta = activeRole ? getRoleMeta(activeRole.roleId, activeRole.roleName) : null;

  return (
    <WorkspaceLayout permission="permissions.manage" label="Permission Matrix" icon="⚿" showHero={false}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Loading / Error States */}
        {loading && <LoadingSpinner message="Loading access control matrix..." />}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchPermissionsData}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 mt-3"
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Primary Role Selector Dropdown Card */}
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
                {/* Role Dropdown Selector */}
                <div>
                  <label
                    htmlFor="role-select"
                    className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"
                  >
                    <Shield sx={{ fontSize: 16, color: "#6366f1" }} />
                    Select Role to Configure:
                  </label>
                  <div className="relative">
                    <select
                      id="role-select"
                      value={selectedRoleId}
                      onChange={handleDropdownChange}
                      className="w-full rounded-xl border border-indigo-200 bg-white py-2.5 pl-3.5 pr-10 text-sm font-semibold text-slate-800 shadow-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
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

                {/* Quick Stats on Selected Role */}
                {activeRole && (
                  <div className="flex items-center gap-3 border-t border-slate-100 pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-xl border ${
                        roleMeta?.color || "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      <Key sx={{ fontSize: 20 }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900">{activeRole.roleName}</strong>
                        {hasUnsavedChanges && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            Unsaved
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {selectedKeys.length} of {data.permissions.length} capabilities assigned
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick Batch Actions */}
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0">
                  <button
                    type="button"
                    onClick={handleGrantAll}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                    title="Grant all system permissions to this role"
                  >
                    Grant All
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokeAll}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 shadow-sm transition-all hover:bg-rose-50"
                    title="Revoke all permissions from this role"
                  >
                    Revoke All
                  </button>
                </div>
              </div>
            </div>

            {/* Search & Actions Bar */}
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
              <div className="flex-1 min-w-[260px]">
                <SearchInput
                  className="w-full"
                  placeholder="Search permissions by name, description, or key..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Total: <strong className="text-slate-800">{data.permissions.length}</strong>
                </span>

                <button
                  type="button"
                  onClick={fetchPermissionsData}
                  disabled={loading}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                  title="Reload Matrix"
                >
                  <Refresh sx={{ fontSize: 18 }} className={loading ? "animate-spin" : ""} />
                  <span>{loading ? "Syncing..." : "Refresh"}</span>
                </button>

                <Link
                  to="/roles"
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Shield sx={{ fontSize: 18 }} />
                  <span>Roles List</span>
                </Link>

                {hasUnsavedChanges && (
                  <button
                    type="button"
                    onClick={handleDiscardChanges}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 shadow-sm transition-all hover:bg-amber-100"
                  >
                    <Undo sx={{ fontSize: 18 }} />
                    <span>Discard</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={saving || !hasUnsavedChanges}
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 ${
                    hasUnsavedChanges ? "!bg-indigo-600 shadow-md shadow-indigo-200 ring-2 ring-indigo-500/20" : ""
                  }`}
                >
                  <Save sx={{ fontSize: 18 }} />
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
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
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* Category Header */}
                    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-6 py-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-3">
                        <div className={`grid h-9 w-9 place-items-center rounded-xl border ${cat.color}`}>
                          {cat.icon}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                          <p className="text-xs text-slate-500">{cat.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500">
                          {assignedInCat} / {cat.permissions.length} active
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleCategory(catKeys, !allSelected)}
                          className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50"
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
                                ? "border-indigo-200 bg-indigo-50/40 shadow-xs"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <strong className="block text-xs font-bold text-slate-800">
                                {permission.name}
                              </strong>
                              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                                {permission.description}
                              </p>
                              <span className="mt-2 inline-block rounded font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5">
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
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
                    !
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Unsaved Changes for {activeRole?.roleName}
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
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow-sm transition-all hover:bg-slate-700 disabled:opacity-50"
                    disabled={saving}
                  >
                    <Undo sx={{ fontSize: 16 }} />
                    <span>Discard</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSavePermissions}
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 disabled:opacity-50"
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
