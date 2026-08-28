import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Add,
  Edit,
  Delete,
  People,
  Shield,
  Refresh,
  CheckCircle,
  Phone,
  Email,
  FilterList,
  RestoreFromTrash,
  WorkOutline,
  Search,
  SearchOff,
  Close,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { MetricCard } from "../../components/common/MetricCard";
import { SearchInput } from "../../components/common/SearchInput";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EmptyState } from "../../components/common/EmptyState";
import { UserModal } from "./components/UserModal";
import { CreateDesignationModal } from "./components/CreateDesignationModal";
import { userService } from "../../api/user.service";
import { roleService } from "../../api/role.service";
import { designationService } from "../../api/designation.service";
import { userActivityService } from "../../api/userActivity.service";
import { useAuth } from "../../hooks/useAuth";
import { getRoleMeta } from "../../config/workspace.config";
import { showConfirmDialog, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import type { Role, Designation, User, UserFormData, UserStatusFilter, UserSessionItem } from "../../types";

export const UsersPage: React.FC = () => {
  const { can } = useAuth();
  const [searchParams] = useSearchParams();

  const canCreateUsers = can("users.create") || can("users.manage");
  const canEditUsers = can("users.edit") || can("users.manage");
  const canDeleteUsers = can("users.delete") || can("users.manage");

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [activeSessions, setActiveSessions] = useState<UserSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usersError, setUsersError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState(() => searchParams.get("role") || "ALL");
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>("ALL");

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam) {
      setRoleFilter(roleParam);
    }
  }, [searchParams]);

  const [modalOpen, setModalOpen] = useState(false);
  const [designationModalOpen, setDesignationModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchRoles = async () => {
    try {
      const data = await roleService.getRoles();
      setRoles(data);
    } catch (error) {
      console.error("GET Roles API Error:", error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const data = await designationService.getDesignations();
      setDesignations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("GET Designations API Error:", error);
    }
  };

  const fetchActiveUsers = async () => {
    try {
      const data = await userActivityService.getActiveUsers();
      setActiveSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("GET Active Users API Error:", error);
      setActiveSessions([]);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setUsersError("");
    try {
      const [userData] = await Promise.all([
        userService.getUsers(),
        fetchActiveUsers(),
      ]);
      setUsers(userData);
    } catch (error) {
      console.error("GET Users API Error:", error);
      setUsersError("Could not load users. Check that the C# backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDesignations();
  }, []);

  const isUserActive = (user: User): boolean => {
    const rawFlag = user.deletedFlag ?? user.DeletedFlag ?? user.deletedflag;
    if (rawFlag === undefined || rawFlag === null) return true;
    const deletedFlag = typeof rawFlag === "string" ? Number(rawFlag.trim()) : Number(rawFlag);
    return !isNaN(deletedFlag) && deletedFlag !== 0;
  };

  const activeUserIds = useMemo(() => {
    return new Set(activeSessions.map((s) => Number(s.userId)).filter((id) => id > 0));
  }, [activeSessions]);

  const activeUsersCount = useMemo(() => {
    if (activeSessions.length === 0) return 0;
    return activeUserIds.size > 0 ? activeUserIds.size : activeSessions.length;
  }, [activeSessions, activeUserIds]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const userId = Number(u.id ?? u.Id);
      const userRoleId = u.roleId ?? u.RoleId;
      const userRole = roles.find((r) => String(r.id) === String(userRoleId));
      const roleName = userRole?.name || "";

      const userDesId = u.designationId ?? u.DesignationId;
      const userDes = designations.find((d) => String(d.id ?? d.Id) === String(userDesId));
      const designationName = u.designationName ?? u.DesignationName ?? userDes?.name ?? "";

      const ageStr = String(u.age ?? u.Age ?? "");

      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.address?.toLowerCase().includes(q) ||
        ageStr.includes(q) ||
        roleName.toLowerCase().includes(q) ||
        designationName.toLowerCase().includes(q);

      const matchesRole =
        roleFilter === "ALL" || String(userRoleId) === String(roleFilter);

      const active = isUserActive(u);
      const isOnline = activeUserIds.has(userId);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && active) ||
        (statusFilter === "ONLINE" && isOnline) ||
        (statusFilter === "DELETED" && !active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, roles, designations, searchQuery, roleFilter, statusFilter, activeUserIds]);

  const openAddModal = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleSaveUser = async (formData: UserFormData, isEditing: boolean) => {
    setSaving(true);
    try {
      if (isEditing && editingUser) {
        const userId = editingUser.id ?? editingUser.Id;
        const res = await userService.updateUser(userId!, formData);
        await fetchUsers();
        setModalOpen(false);
        await showSuccessAlert(
          "Member Updated",
          res.message || "User directory record updated successfully."
        );
      } else {
        const res = await userService.createUser(formData);
        await fetchUsers();
        setModalOpen(false);
        await showSuccessAlert(
          "Member Added",
          res.message || "New directory member added successfully."
        );
      }
    } catch (error: any) {
      console.error("Save User Error:", error);
      await showErrorAlert("Could Not Save", error.message || "Please verify backend connectivity.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    const userId = user.id ?? user.Id;
    const userName = user.name || user.Name || "this member";
    const result = await showConfirmDialog(
      `Delete ${userName}?`,
      "This member account will be marked as deleted and lose system access.",
      "Yes, Delete Member",
      "Cancel",
      true
    );

    if (!result.isConfirmed || !userId) return;

    try {
      await userService.deleteUser(userId);
      await fetchUsers();
      await showSuccessAlert("Member Deleted", `${userName} has been marked as deleted.`);
    } catch (error: any) {
      console.error("DELETE User Error:", error);
      await showErrorAlert("Delete Failed", error.message || "Could not complete deletion.");
    }
  };

  const handleRestore = async (user: User) => {
    const userId = user.id ?? user.Id;
    const userName = user.name || user.Name || "this member";
    if (!userId) return;

    const result = await showConfirmDialog(
      `Restore ${userName}?`,
      `Are you sure you want to restore and reactivate ${userName}'s account? They will regain access to the workspace.`,
      "Yes, Restore Member",
      "Cancel",
      false
    );

    if (!result.isConfirmed) return;

    try {
      await userService.restoreUser(userId);
      await fetchUsers();
      await showSuccessAlert("Member Restored", `${userName} has been reactivated successfully.`);
    } catch (error: any) {
      console.error("Restore User Error:", error);
      await showErrorAlert("Restore Failed", error.message || "Could not restore member.");
    }
  };

  const q = searchQuery.toLowerCase().trim();

  const matchTotalMembers =
    !q ||
    [
      "total members",
      "members",
      "registered",
      "users",
      "user",
      "directory",
      String(users.length),
    ].some((t) => t.toLowerCase().includes(q));

  const matchActiveUsersCard =
    !q ||
    [
      "active users",
      "active",
      "online",
      "currently active",
      String(activeUsersCount),
    ].some((t) => t.toLowerCase().includes(q));

  const matchRolesCard =
    !q ||
    [
      "roles assigned",
      "roles",
      "role",
      "configured",
      String(roles.length),
    ].some((t) => t.toLowerCase().includes(q));

  const visibleMetricCount =
    (matchTotalMembers ? 1 : 0) +
    (matchActiveUsersCard ? 1 : 0) +
    (matchRolesCard ? 1 : 0);

  return (
    <WorkspaceLayout
      permission="users.view"
      label="User Directory"
      icon="▦"
      showHero={false}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search by name, email, phone, age, address, or role..."
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Active Search Results Banner */}
        {q && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Search sx={{ fontSize: 18, color: "#6366f1" }} />
              <span>
                Showing <strong>{filteredUsers.length}</strong> matching member{filteredUsers.length === 1 ? "" : "s"} for{" "}
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
            {matchTotalMembers && (
              <MetricCard
                label="Total Members"
                value={users.length}
                note="Registered directory records"
                icon={<People sx={{ fontSize: 24 }} />}
                iconBgColor="bg-indigo-50 text-indigo-600"
              />
            )}

            {matchActiveUsersCard && (
              <MetricCard
                label="Active Users"
                value={activeUsersCount}
                note="Currently active in workspace"
                icon={<CheckCircle sx={{ fontSize: 24 }} />}
                iconBgColor="bg-emerald-50 text-emerald-600"
              />
            )}

            {matchRolesCard && (
              <MetricCard
                label="Roles Assigned"
                value={roles.length}
                note="Configured role options"
                icon={<Shield sx={{ fontSize: 24 }} />}
                iconBgColor="bg-purple-50 text-purple-600"
              />
            )}
          </div>
        )}

        {/* Filter Controls & Actions Bar */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex-1 min-w-[260px]">
            <SearchInput
              className="w-full"
              placeholder="Search by name, email, phone, age, address, or role..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <FilterList sx={{ fontSize: 18, color: "#64748b" }} />
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="ALL">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatusFilter)}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Accounts</option>
              <option value="ONLINE">Currently Online ({activeUsersCount})</option>
              <option value="DELETED">Deleted Only</option>
            </select>

            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
            >
              <Refresh sx={{ fontSize: 18 }} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Syncing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              onClick={() => setDesignationModalOpen(true)}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              title="Create a new job designation"
            >
              <WorkOutline sx={{ fontSize: 16, color: "#4f46e5" }} />
              <span>Add Designation</span>
            </button>

            {canCreateUsers && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 hover:shadow-md hover:-translate-y-0.5"
              >
                <Add sx={{ fontSize: 18 }} />
                <span>Add User</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && <LoadingSpinner message="Loading user directory..." />}

        {!loading && usersError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800">
            <p className="font-semibold">{usersError}</p>
            <button
              onClick={fetchUsers}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 mt-3"
              type="button"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Table Display */}
        {!loading && !usersError && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {filteredUsers.length === 0 ? (
              <EmptyState
                icon={<People sx={{ fontSize: 28 }} />}
                title="No members found"
                description={
                  searchQuery || roleFilter !== "ALL"
                    ? "Try adjusting your search criteria or role filters."
                    : "Add your first user to build the directory."
                }
                actionText={canCreateUsers && !searchQuery ? "Add First Member" : undefined}
                onAction={canCreateUsers && !searchQuery ? openAddModal : undefined}
                actionIcon={<Add sx={{ fontSize: 18 }} />}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4 whitespace-nowrap">#</th>
                      <th className="px-6 py-4 whitespace-nowrap">Member</th>
                      <th className="px-6 py-4 whitespace-nowrap">Role</th>
                      <th className="px-6 py-4 whitespace-nowrap">Designation</th>
                      <th className="px-6 py-4 whitespace-nowrap">Contact</th>
                      <th className="px-6 py-4 whitespace-nowrap">Age</th>
                      <th className="px-6 py-4 whitespace-nowrap">Address</th>
                      <th className="px-6 py-4 whitespace-nowrap">Status</th>
                      <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u, idx) => {
                      const userId = Number(u.id ?? u.Id);
                      const userRoleId = u.roleId ?? u.RoleId;
                      const role = roles.find((r) => String(r.id) === String(userRoleId));
                      const meta = getRoleMeta(userRoleId, role?.name);

                      const userDesId = u.designationId ?? u.DesignationId;
                      const userDes = designations.find((d) => String(d.id ?? d.Id) === String(userDesId));
                      const designationName = u.designationName ?? u.DesignationName ?? userDes?.name ?? "";

                      const userName = u.name || u.Name || "User";
                      const userEmail = u.email || u.Email || "";
                      const userPhone = u.phone || u.Phone || "—";
                      const userAge = u.age || u.Age;
                      const userAddress = u.address || u.Address || "—";
                      const initial = userName.charAt(0).toUpperCase();
                      const isActive = isUserActive(u);
                      const isOnline = activeUserIds.has(userId);

                      return (
                        <tr key={u.id ?? u.Id ?? idx} className="transition-colors hover:bg-slate-50/80">
                          <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                            {String(idx + 1).padStart(2, "0")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-xs font-bold text-white shadow-sm">
                                  {initial}
                                </div>
                                {isOnline && (
                                  <span
                                    className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                                    title="Online in workspace"
                                  />
                                )}
                              </div>
                              <div>
                                <strong className="block font-semibold text-slate-900">
                                  {userName}
                                </strong>
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                  <Email sx={{ fontSize: 12 }} />
                                  {userEmail}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.color}`}
                            >
                              <Shield sx={{ fontSize: 12 }} />
                              {role?.name || "Unassigned"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50/70 px-2.5 py-0.5 text-xs font-semibold text-blue-700 whitespace-nowrap">
                              {designationName || "Unassigned"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center gap-1 text-xs text-slate-700 whitespace-nowrap">
                              <Phone sx={{ fontSize: 12, color: "#64748b" }} />
                              {userPhone}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 whitespace-nowrap">
                              {userAge ? `${userAge} yrs` : "—"}
                            </span>
                          </td>
                          <td
                            className="max-w-[200px] truncate px-6 py-4 text-xs text-slate-500 whitespace-nowrap"
                            title={userAddress}
                          >
                            {userAddress}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold w-fit whitespace-nowrap ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isActive ? "bg-emerald-500 shadow-sm" : "bg-rose-500"
                                  }`}
                                />
                                {isActive ? "Active" : "Deleted"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {canEditUsers && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(u)}
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
                                  title="Edit Member"
                                >
                                  <Edit sx={{ fontSize: 16 }} />
                                </button>
                              )}

                              {canDeleteUsers && isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(u)}
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-rose-600 shadow-xs transition-all hover:border-rose-300 hover:bg-rose-50 cursor-pointer"
                                  title="Deactivate / Soft-Delete Member"
                                >
                                  <Delete sx={{ fontSize: 16 }} />
                                </button>
                              )}

                              {canDeleteUsers && !isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleRestore(u)}
                                  className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-xs transition-all hover:bg-emerald-100 cursor-pointer"
                                  title="Restore / Reactivate Member"
                                >
                                  <RestoreFromTrash sx={{ fontSize: 16 }} />
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
          </div>
        )}

        {/* User Modal Component */}
        <UserModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveUser}
          editingUser={editingUser}
          roles={roles}
          designations={designations}
          saving={saving}
        />

        {/* Create Designation Modal Dialog */}
        <CreateDesignationModal
          isOpen={designationModalOpen}
          onClose={() => setDesignationModalOpen(false)}
          onCreated={async () => {
            await fetchDesignations();
          }}
        />
      </div>
    </WorkspaceLayout>
  );
};


export default UsersPage;
