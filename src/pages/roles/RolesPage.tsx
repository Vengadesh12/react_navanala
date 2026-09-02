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
  People,
  ContentCopy,
  ArrowForward,
  Star,
  Search,
  SearchOff,
  Close,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { MetricCard } from "../../components/common/MetricCard";
import { SearchInput } from "../../components/common/SearchInput";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EmptyState } from "../../components/common/EmptyState";
import { Pagination } from "../../components/common/Pagination";
import { SortableHeader } from "../../components/common/SortableHeader";
import { useTableSort } from "../../hooks/useTableSort";
import { RoleModal } from "./components/RoleModal";
import { roleService } from "../../api/role.service";
import { userService } from "../../api/user.service";
import { permissionService } from "../../api/permission.service";
import { useAuth } from "../../hooks/useAuth";
import { getRoleMeta } from "../../config/workspace.config";
import { showConfirmDialog, showErrorAlert, showSuccessAlert, showWarningAlert } from "../../utils/alerts";
import type { Role, RoleFormData, User, PermissionsApiResponse } from "../../types";

export const RolesPage: React.FC = () => {
  const { can } = useAuth();
  const canCreateRoles = can("roles.create") || can("roles.manage");
  const canEditRoles = can("roles.edit") || can("roles.manage");
  const canDeleteRoles = can("roles.delete") || can("roles.manage");
  const canManagePerms = can("permissions.manage");

  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SYSTEM" | "CUSTOM">("ALL");
  const [sortBy, setSortBy] = useState<"id_asc" | "id_desc" | "name" | "members">("id_asc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const fetchRolesAndData = async () => {
    setLoading(true);
    setError("");
    try {
      const [rolesData, usersData, permsData] = await Promise.allSettled([
        roleService.getRoles(),
        userService.getUsers(),
        permissionService.getPermissionsMatrix(),
      ]);

      if (rolesData.status === "fulfilled") {
        setRoles(rolesData.value);
      } else {
        throw rolesData.reason;
      }

      if (usersData.status === "fulfilled" && Array.isArray(usersData.value)) {
        setUsers(usersData.value);
      }

      if (permsData.status === "fulfilled" && permsData.value) {
        setPermissionMatrix(permsData.value);
      }
    } catch (fetchError: any) {
      console.error("GET Roles API Error:", fetchError);
      setError("Could not load roles. Verify that the C# backend API is active.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndData();
  }, []);

  // Map role ID to member count
  const roleMembersCount = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      const rId = String(u.roleId);
      counts[rId] = (counts[rId] || 0) + 1;
    });
    return counts;
  }, [users]);

  // Map role ID to assigned permission count
  const rolePermissionsCount = useMemo(() => {
    const counts: Record<string, number> = {};
    if (permissionMatrix?.roles) {
      permissionMatrix.roles.forEach((r) => {
        counts[String(r.roleId)] = (r.permissionKeys || []).length;
      });
    }
    return counts;
  }, [permissionMatrix]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, sortBy]);

  const filteredRoles = useMemo(() => {
    let result = [...roles];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          String(r.id).includes(q)
      );
    }

    // Type filter
    if (typeFilter === "SYSTEM") {
      result = result.filter((r) => Number(r.id) === 2 || r.name?.toLowerCase().includes("super admin"));
    } else if (typeFilter === "CUSTOM") {
      result = result.filter((r) => !(Number(r.id) === 2 || r.name?.toLowerCase().includes("super admin")));
    }

    return result;
  }, [roles, searchQuery, typeFilter]);

  const { sortKey, sortDirection, handleSort, sortedData: sortedRoles } = useTableSort<Role>({
    data: filteredRoles,
    initialSortKey: "id",
    initialDirection: "asc",
    getSortValue: (role, key) => {
      switch (key) {
        case "id":
          return Number(role.id);
        case "name":
          return (role.name || "").toLowerCase();
        case "description":
          return (role.description || "").toLowerCase();
        case "members":
          return roleMembersCount[String(role.id)] || 0;
        case "permissions":
          return rolePermissionsCount[String(role.id)] || 0;
        case "status":
          return 1;
        default:
          return (role as any)[key];
      }
    },
  });

  const paginatedRoles = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRoles.slice(start, start + pageSize);
  }, [sortedRoles, page, pageSize]);

  const systemRolesCount = useMemo(() => {
    return roles.filter((r) => Number(r.id) === 2 || r.name?.toLowerCase().includes("super admin")).length;
  }, [roles]);

  const customRolesCount = useMemo(() => {
    return roles.length - systemRolesCount;
  }, [roles, systemRolesCount]);

  const totalAssignedUsers = useMemo(() => {
    return users.filter((u) => u.roleId && Number(u.roleId) > 0).length;
  }, [users]);

  const openAddModal = () => {
    setEditingRole(null);
    setModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setModalOpen(true);
  };

  const handleCloneRole = (role: Role) => {
    setEditingRole({
      id: 0,
      name: `${role.name} (Copy)`,
      description: role.description || "",
    });
    setModalOpen(true);
  };

  const handleSaveRole = async (formData: RoleFormData, isEditing: boolean) => {
    setSaving(true);
    try {
      if (isEditing && editingRole && editingRole.id !== 0) {
        const res = await roleService.updateRole(editingRole.id, formData);
        await fetchRolesAndData();
        setModalOpen(false);
        await showSuccessAlert(
          "Role Updated",
          res.message || `Role "${formData.name}" was saved successfully.`
        );
      } else {
        const res = await roleService.createRole(formData);
        await fetchRolesAndData();
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

    const assignedCount = roleMembersCount[String(role.id)] || 0;
    const warningMsg = assignedCount > 0
      ? `There are ${assignedCount} active user(s) currently assigned to "${role.name}". Deleting it will detach their assigned role permissions.`
      : "Users currently assigned to this role will lose their granted permissions.";

    const result = await showConfirmDialog(
      `Delete "${role.name}" Role?`,
      warningMsg,
      "Yes, Delete Role",
      "Keep Role",
      true
    );

    if (!result.isConfirmed) return;

    try {
      await roleService.deleteRole(role.id);
      await fetchRolesAndData();
      await showSuccessAlert("Role Deleted", `The role "${role.name}" has been removed.`);
    } catch (delError: any) {
      console.error("Delete Role Error:", delError);
      await showErrorAlert("Deletion Failed", delError.message || "Failed to delete role.");
    }
  };

  const q = searchQuery.toLowerCase().trim();

  const matchTotalRoles =
    !q ||
    [
      "total roles",
      "roles",
      "role",
      "system",
      "custom",
      String(roles.length),
    ].some((t) => t.toLowerCase().includes(q));

  const matchAssignedMembers =
    !q ||
    [
      "assigned members",
      "members",
      "users",
      "assigned",
      String(totalAssignedUsers),
    ].some((t) => t.toLowerCase().includes(q));

  const matchRbacStatus =
    !q ||
    [
      "rbac status",
      "rbac",
      "active",
      "enforced",
      "status",
    ].some((t) => t.toLowerCase().includes(q));

  const visibleMetricCount =
    (matchTotalRoles ? 1 : 0) +
    (matchAssignedMembers ? 1 : 0) +
    (matchRbacStatus ? 1 : 0);

  return (
    <WorkspaceLayout
      permission="roles.view"
      label="Roles"
      icon="♙"
      showHero={false}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search roles by title, description, or ID..."
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Active Search Results Banner */}
        {q && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Search sx={{ fontSize: 18, color: "#6366f1" }} />
              <span>
                Showing <strong>{filteredRoles.length}</strong> matching role{filteredRoles.length === 1 ? "" : "s"} for{" "}
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

        {/* Stats Row - rendered dynamically when matching */}
        {visibleMetricCount > 0 && (
          <div
            className={`mb-6 grid grid-cols-1 gap-4 ${
              visibleMetricCount === 1
                ? "sm:grid-cols-1 md:max-w-md"
                : visibleMetricCount === 2
                ? "sm:grid-cols-2"
                : "sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {matchTotalRoles && (
              <MetricCard
                label="Total Roles"
                value={roles.length}
                note={`${systemRolesCount} System • ${customRolesCount} Custom`}
                icon={<Shield sx={{ fontSize: 24 }} />}
                iconBgColor="bg-purple-50 text-purple-600"
              />
            )}

            {matchAssignedMembers && (
              <MetricCard
                label="Assigned Members"
                value={totalAssignedUsers}
                note="Active across all roles"
                icon={<People sx={{ fontSize: 24 }} />}
                iconBgColor="bg-blue-50 text-blue-600"
              />
            )}

            {matchRbacStatus && (
              <MetricCard
                label="RBAC Status"
                value="Active"
                note="Enforced across workspace"
                icon={<CheckCircle sx={{ fontSize: 24 }} />}
                iconBgColor="bg-emerald-50 text-emerald-600"
              />
            )}
          </div>
        )}

        {/* Filter & Actions Bar */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 min-w-[240px]">
              <SearchInput
                className="w-full"
                placeholder="Search roles by title, description, or ID..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>

            {/* Type Filter */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                  typeFilter === "ALL" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setTypeFilter("ALL")}
              >
                All ({roles.length})
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                  typeFilter === "SYSTEM" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setTypeFilter("SYSTEM")}
              >
                System ({systemRolesCount})
              </button>
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                  typeFilter === "CUSTOM" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setTypeFilter("CUSTOM")}
              >
                Custom ({customRolesCount})
              </button>
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all focus:border-indigo-600 focus:outline-none cursor-pointer"
            >
              <option value="id_asc">Sort: ID (Low to High)</option>
              <option value="id_desc">Sort: ID (High to Low)</option>
              <option value="name">Sort: Name (A to Z)</option>
              <option value="members">Sort: Most Members</option>
            </select>
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
              onClick={fetchRolesAndData}
              disabled={loading}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              title="Refresh Roles"
            >
              <Refresh sx={{ fontSize: 18 }} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Syncing..." : "Refresh"}</span>
            </button>

            {canManagePerms && (
              <Link
                to="/permissions"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                <Key sx={{ fontSize: 18, color: "#6366f1" }} />
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
        {loading && <LoadingSpinner message="Loading workspace roles & access tiers..." />}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
            <p className="font-semibold">{error}</p>
            <button
              onClick={fetchRolesAndData}
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.map((role) => {
              const isSuper = Number(role.id) === 2 || role.name?.toLowerCase().includes("super admin");
              const meta = getRoleMeta(role.id, role.name);
              const memberCount = roleMembersCount[String(role.id)] || 0;
              const permCount = rolePermissionsCount[String(role.id)];
              const totalPerms = permissionMatrix?.permissions?.length || 0;

              return (
                <div
                  key={role.id}
                  className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                    isSuper
                      ? "border-purple-200/90 bg-gradient-to-b from-white via-purple-50/20 to-purple-50/40"
                      : "border-slate-200/80 hover:border-indigo-200 hover:bg-gradient-to-b hover:from-white hover:to-slate-50/40"
                  }`}
                >
                  {/* Top Bar / Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className={`grid h-12 w-12 place-items-center rounded-2xl border shadow-xs transition-transform group-hover:scale-105 ${meta.color}`}>
                        {isSuper ? <Security sx={{ fontSize: 24 }} /> : <Shield sx={{ fontSize: 24 }} />}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100/80 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 shadow-2xs">
                            <Star sx={{ fontSize: 13, color: "#9333ea" }} />
                            System Role
                          </span>
                        ) : (
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.color}`}>
                            Role #{role.id}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role Title & Description */}
                    <div className="mt-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900 capitalize group-hover:text-indigo-900 transition-colors">
                          {role.name}
                        </h3>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {role.description || "No specific description provided for this role."}
                      </p>
                    </div>

                    {/* Quick Stats Badges: Members & Permissions */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        to={`/add-user?role=${role.id}`}
                        title={`View ${memberCount} user(s) assigned to ${role.name}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <People sx={{ fontSize: 14 }} />
                        <span>{memberCount} {memberCount === 1 ? "Member" : "Members"}</span>
                      </Link>

                      {isSuper ? (
                        <Link
                          to={`/permissions?roleId=${role.id}`}
                          title="View Super Admin Permissions"
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 transition-colors hover:border-purple-300 hover:bg-purple-100"
                        >
                          <Key sx={{ fontSize: 14 }} />
                          <span>Full Access</span>
                        </Link>
                      ) : permCount !== undefined && totalPerms > 0 ? (
                        <Link
                          to={`/permissions?roleId=${role.id}`}
                          title={`Manage ${permCount} active permission(s) for ${role.name}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Key sx={{ fontSize: 14 }} />
                          <span>{permCount}/{totalPerms} Perms</span>
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-6 border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      {canManagePerms ? (
                        <Link
                          to={`/permissions?roleId=${role.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                          title={`Configure permissions for ${role.name}`}
                        >
                          <Key sx={{ fontSize: 15 }} />
                          <span>Permissions</span>
                          <ArrowForward sx={{ fontSize: 14 }} />
                        </Link>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">View access</span>
                      )}

                      <div className="flex items-center gap-1">
                        {canCreateRoles && (
                          <button
                            type="button"
                            onClick={() => handleCloneRole(role)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Clone Role"
                          >
                            <ContentCopy sx={{ fontSize: 16 }} />
                          </button>
                        )}

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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <SortableHeader sortKey="id" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="whitespace-nowrap">
                      ID
                    </SortableHeader>
                    <SortableHeader sortKey="name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="whitespace-nowrap">
                      Role Name
                    </SortableHeader>
                    <SortableHeader sortKey="description" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="whitespace-nowrap">
                      Description
                    </SortableHeader>
                    <SortableHeader sortKey="members" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="whitespace-nowrap">
                      Members
                    </SortableHeader>
                    <SortableHeader sortKey="permissions" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="whitespace-nowrap">
                      Permissions
                    </SortableHeader>
                    <SortableHeader sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="whitespace-nowrap">
                      Status
                    </SortableHeader>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRoles.map((role) => {
                    const isSuper = Number(role.id) === 2 || role.name?.toLowerCase().includes("super admin");
                    const meta = getRoleMeta(role.id, role.name);
                    const memberCount = roleMembersCount[String(role.id)] || 0;
                    const permCount = rolePermissionsCount[String(role.id)];
                    const totalPerms = permissionMatrix?.permissions?.length || 0;

                    return (
                      <tr key={role.id} className="transition-colors hover:bg-slate-50/80">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">#{role.id}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className={`grid h-8 w-8 place-items-center rounded-xl border ${meta.color}`}>
                              {isSuper ? <Security sx={{ fontSize: 18 }} /> : <Shield sx={{ fontSize: 18 }} />}
                            </span>
                            <div>
                              <strong className="font-bold text-slate-900 capitalize">{role.name}</strong>
                              {isSuper && (
                                <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-700">
                                  System
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="max-w-xs px-6 py-4 text-xs text-slate-500">
                          {role.description || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/add-user?role=${role.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                          >
                            <People sx={{ fontSize: 14 }} />
                            <span>{memberCount}</span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          {isSuper ? (
                            <Link
                              to={`/permissions?roleId=${role.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:underline"
                            >
                              <Key sx={{ fontSize: 14 }} />
                              <span>Full System</span>
                            </Link>
                          ) : permCount !== undefined && totalPerms > 0 ? (
                            <Link
                              to={`/permissions?roleId=${role.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                            >
                              <Key sx={{ fontSize: 14 }} />
                              <span>{permCount}/{totalPerms}</span>
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManagePerms && (
                              <Link
                                to={`/permissions?roleId=${role.id}`}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 shadow-2xs hover:bg-slate-50 transition-colors"
                              >
                                Matrix
                              </Link>
                            )}
                            {canCreateRoles && (
                              <button
                                type="button"
                                onClick={() => handleCloneRole(role)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                                title="Clone Role"
                              >
                                <ContentCopy sx={{ fontSize: 16 }} />
                              </button>
                            )}
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={page}
              totalItems={filteredRoles.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
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
