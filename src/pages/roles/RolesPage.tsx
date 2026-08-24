import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Add,
  Edit,
  Delete,
  Security,
  Key,
  GridView,
  TableRows,
  CheckCircle,
  Shield,
  Refresh,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { MetricCard } from "../../components/common/MetricCard";
import { SearchInput } from "../../components/common/SearchInput";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EmptyState } from "../../components/common/EmptyState";
import { RoleModal } from "./components/RoleModal";
import { roleService } from "../../api/role.service";
import { useAuth } from "../../hooks/useAuth";
import { getRoleMeta } from "../../config/workspace.config";
import { showConfirmDialog, showErrorAlert, showSuccessAlert, showWarningAlert } from "../../utils/alerts";
import type { Role, RoleFormData } from "../../types";

export const RolesPage: React.FC = () => {
  const { can } = useAuth();
  const canCreateRoles = can("roles.create") || can("roles.manage");
  const canEditRoles = can("roles.edit") || can("roles.manage");
  const canDeleteRoles = can("roles.delete") || can("roles.manage");
  const canManagePerms = can("permissions.manage");

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await roleService.getRoles();
      setRoles(data);
    } catch (fetchError: any) {
      console.error("GET Roles API Error:", fetchError);
      setError("Could not load roles. Verify that the C# backend API is active.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        String(r.id).includes(q)
    );
  }, [roles, searchQuery]);

  const openAddModal = () => {
    setEditingRole(null);
    setModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setModalOpen(true);
  };

  const handleSaveRole = async (formData: RoleFormData, isEditing: boolean) => {
    setSaving(true);
    try {
      if (isEditing && editingRole) {
        const res = await roleService.updateRole(editingRole.id, formData);
        await fetchRoles();
        setModalOpen(false);
        await showSuccessAlert(
          "Role Updated",
          res.message || `Role "${formData.name}" was saved successfully.`
        );
      } else {
        const res = await roleService.createRole(formData);
        await fetchRoles();
        setModalOpen(false);
        await showSuccessAlert(
          "Role Created",
          res.message || `Role "${formData.name}" was created successfully.`
        );
      }
    } catch (saveError: any) {
      console.error("Save Role Error:", saveError);
      await showErrorAlert("Could Not Save", saveError.message || "Please check backend connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (Number(role.id) === 2 || role.name?.toLowerCase().includes("super admin")) {
      await showWarningAlert("Protected System Role", "The Super Admin role is protected and cannot be deleted.");
      return;
    }

    const result = await showConfirmDialog(
      `Delete "${role.name}" Role?`,
      "Users currently assigned to this role will lose their granted permissions.",
      "Yes, Delete Role",
      "Keep Role",
      true
    );

    if (!result.isConfirmed) return;

    try {
      await roleService.deleteRole(role.id);
      await fetchRoles();
      await showSuccessAlert("Role Deleted", `The role "${role.name}" has been removed.`);
    } catch (delError: any) {
      console.error("Delete Role Error:", delError);
      await showErrorAlert("Deletion Failed", delError.message || "Failed to delete role.");
    }
  };

  return (
    <WorkspaceLayout permission="roles.view" label="Roles" icon="♙" showHero={false}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Row */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Total Roles"
            value={roles.length}
            note="Defined in workspace"
            icon={<Shield sx={{ fontSize: 24 }} />}
            iconBgColor="bg-purple-50 text-purple-600"
          />

          <MetricCard
            label="RBAC Status"
            value="Active"
            note="Enforced on all routes"
            icon={<CheckCircle sx={{ fontSize: 24 }} />}
            iconBgColor="bg-emerald-50 text-emerald-600"
          />

          <MetricCard
            label="Super Admin"
            value="Role ID 2"
            note="Full system bypass"
            icon={<Security sx={{ fontSize: 24 }} />}
            iconBgColor="bg-indigo-50 text-indigo-600"
          />
        </div>

        {/* Filter & Actions Bar */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex-1 min-w-[260px]">
            <SearchInput
              className="w-full"
              placeholder="Search roles by name or description..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <GridView sx={{ fontSize: 16 }} />
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <TableRows sx={{ fontSize: 16 }} />
              </button>
            </div>

            <button
              type="button"
              onClick={fetchRoles}
              disabled={loading}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              title="Refresh Roles"
            >
              <Refresh sx={{ fontSize: 18 }} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Syncing..." : "Refresh"}</span>
            </button>

            {canManagePerms && (
              <Link
                to="/permissions"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                <Key sx={{ fontSize: 18 }} />
                <span>Permission Matrix</span>
              </Link>
            )}

            {canCreateRoles && (
              <button
                onClick={openAddModal}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 hover:shadow-md hover:-translate-y-0.5"
                type="button"
              >
                <Add sx={{ fontSize: 18 }} />
                <span>Create Role</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && <LoadingSpinner message="Loading workspace roles..." />}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchRoles}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 mt-3"
              type="button"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredRoles.length === 0 && (
          <EmptyState
            icon={<Shield sx={{ fontSize: 28 }} />}
            title="No roles found"
            description={
              searchQuery
                ? "No roles match your search query."
                : "Get started by creating your first role."
            }
            actionText={canCreateRoles && !searchQuery ? "Create Role" : undefined}
            onAction={canCreateRoles && !searchQuery ? openAddModal : undefined}
            actionIcon={<Add sx={{ fontSize: 18 }} />}
          />
        )}

        {/* Grid View */}
        {!loading && !error && filteredRoles.length > 0 && viewMode === "grid" && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.map((role) => {
              const isSuper = Number(role.id) === 2 || role.name?.toLowerCase().includes("super admin");
              const meta = getRoleMeta(role.id, role.name);

              return (
                <div
                  key={role.id}
                  className={`flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                    isSuper
                      ? "border-purple-200 bg-gradient-to-b from-white to-purple-50/40"
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className={`grid h-11 w-11 place-items-center rounded-xl border ${meta.color}`}>
                        <Shield sx={{ fontSize: 22 }} />
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}
                      >
                        {isSuper ? "System Role" : `Role #${role.id}`}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-lg font-bold text-slate-900">{role.name}</h3>
                      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-500">
                        {role.description || "No specific description provided for this role."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      {canManagePerms ? (
                        <Link
                          to="/permissions"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          <Key sx={{ fontSize: 14 }} />
                          <span>Permissions</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">View access</span>
                      )}

                      <div className="flex items-center gap-1">
                        {canEditRoles && (
                          <button
                            type="button"
                            onClick={() => openEditModal(role)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Edit Role"
                          >
                            <Edit sx={{ fontSize: 16 }} />
                          </button>
                        )}

                        {canDeleteRoles && !isSuper && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Role"
                          >
                            <Delete sx={{ fontSize: 16 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Table View */}
        {!loading && !error && filteredRoles.length > 0 && viewMode === "table" && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Role Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRoles.map((role) => {
                  const isSuper = Number(role.id) === 2 || role.name?.toLowerCase().includes("super admin");
                  const meta = getRoleMeta(role.id, role.name);

                  return (
                    <tr key={role.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">#{role.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className={`grid h-7 w-7 place-items-center rounded-lg ${meta.color}`}>
                            <Shield sx={{ fontSize: 16 }} />
                          </span>
                          <strong className="font-semibold text-slate-900">{role.name}</strong>
                          {isSuper && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                              System
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-xs px-6 py-4 text-xs text-slate-500">
                        {role.description || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canManagePerms && (
                            <Link
                              to="/permissions"
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-slate-50 transition-colors"
                            >
                              Matrix
                            </Link>
                          )}
                          {canEditRoles && (
                            <button
                              type="button"
                              onClick={() => openEditModal(role)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              <Edit sx={{ fontSize: 16 }} />
                            </button>
                          )}
                          {canDeleteRoles && !isSuper && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Delete sx={{ fontSize: 16 }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Role Modal */}
        <RoleModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveRole}
          editingRole={editingRole}
          saving={saving}
        />
      </div>
    </WorkspaceLayout>
  );
};

export default RolesPage;
