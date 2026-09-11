import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Shield,
  Person,
  PersonOutline,
  Search,
  Add,
  DeleteOutline,
  CheckCircle,
  LockOutlined,
  Refresh,
  FilterList,
  CorporateFare,
  AdminPanelSettings,
  ReceiptLongOutlined,
  ShoppingCartOutlined,
  Close,
  KeyOutlined,
  VpnKey,
  Badge,
  DoneAll,
  InfoOutlined,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { permissionService } from "../../api/permission.service";
import { useAuth } from "../../hooks/useAuth";
import { getRoleMeta } from "../../config/workspace.config";
import { showConfirmDialog, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import type {
  UserPermissionOverview,
  UserPermissionProfile,
  UserPermissionDetail,
  Permission,
} from "../../types";

export const UserPermissionsPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  // Master user directory state
  const [usersOverview, setUsersOverview] = useState<UserPermissionOverview[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState<string>("");
  const [userFilterMode, setUserFilterMode] = useState<"all" | "direct-only" | "admins">("all");

  // Selected user detail state
  const [userProfile, setUserProfile] = useState<UserPermissionProfile | null>(null);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Filter & Search inside Selected User Permissions
  const [permSearch, setPermSearch] = useState<string>("");
  const [permTab, setPermTab] = useState<"all" | "direct" | "role" | "department">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Add Permission Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [allSystemPermissions, setAllSystemPermissions] = useState<Permission[]>([]);
  const [selectedPermKeyToAdd, setSelectedPermKeyToAdd] = useState<string>("");
  const [addReason, setAddReason] = useState<string>("");
  const [modalSearch, setModalSearch] = useState<string>("");

  // Load User Directory Overview
  const fetchUsersOverview = useCallback(async (selectId?: number) => {
    try {
      setLoadingUsers(true);
      const data = await permissionService.getUsersPermissionOverview();
      setUsersOverview(data);

      if (data.length > 0) {
        const targetId = selectId || (selectedUserId && data.some(u => u.userId === selectedUserId) ? selectedUserId : data[0].userId);
        setSelectedUserId(targetId);
      }
    } catch (err: any) {
      showErrorAlert("Error", err.message || "Failed to load users overview");
    } finally {
      setLoadingUsers(false);
    }
  }, [selectedUserId]);

  // Load Selected User Details
  const fetchUserDetails = useCallback(async (userId: number) => {
    try {
      setLoadingDetails(true);
      const profile = await permissionService.getUserPermissionsDetail(userId);
      setUserProfile(profile);
    } catch (err: any) {
      showErrorAlert("Error", err.message || "Failed to load user permissions details");
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Load All System Permissions for Modal
  const fetchSystemPermissions = useCallback(async () => {
    try {
      const res = await permissionService.getPermissionsMatrix();
      if (res && res.permissions) {
        setAllSystemPermissions(res.permissions);
      }
    } catch {
      // silent fallback
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchUsersOverview();
    fetchSystemPermissions();
  }, [fetchUsersOverview, fetchSystemPermissions]);

  // When selected user changes, fetch details
  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails(selectedUserId);
    }
  }, [selectedUserId, fetchUserDetails]);

  // User list filtering
  const filteredUsers = useMemo(() => {
    return usersOverview.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.roleName.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.departmentName.toLowerCase().includes(userSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (userFilterMode === "direct-only") {
        return u.directPermissionsCount > 0;
      }
      if (userFilterMode === "admins") {
        const role = u.roleName.toLowerCase();
        return role.includes("admin") || role.includes("manager") || u.roleId === 2;
      }
      return true;
    });
  }, [usersOverview, userSearch, userFilterMode]);

  // Categories extracted from active user's permissions
  const availableCategories = useMemo(() => {
    if (!userProfile?.permissions) return [];
    const set = new Set<string>();
    userProfile.permissions.forEach((p) => {
      if (p.category) {
        set.add(p.category);
      }
    });
    return Array.from(set).sort();
  }, [userProfile]);

  // Permission list filtering for selected user
  const filteredPermissions = useMemo(() => {
    if (!userProfile?.permissions) return [];

    return userProfile.permissions.filter((p) => {
      // Tab filter
      if (permTab === "direct" && !p.isDirect) return false;
      if (permTab === "role" && (!p.isFromRole || p.isDirect)) return false;
      if (permTab === "department" && (!p.isFromDepartment || p.isDirect)) return false;

      // Category filter
      if (categoryFilter !== "all" && p.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // Search filter
      if (permSearch.trim()) {
        const query = permSearch.toLowerCase();
        const matchesKey = p.permissionKey.toLowerCase().includes(query);
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesDesc = p.description.toLowerCase().includes(query);
        const matchesCat = p.category.toLowerCase().includes(query);
        return matchesKey || matchesName || matchesDesc || matchesCat;
      }

      return true;
    });
  }, [userProfile, permTab, categoryFilter, permSearch]);

  // Available missing permissions for the Add modal (filtering out permissions user already has active/allowed)
  const availablePermissionsForModal = useMemo(() => {
    // Keys the user already has access to (via Direct, Role, or Department)
    const alreadyGrantedKeys = new Set(
      userProfile?.permissions
        .filter((p) => p.isAllowed)
        .map((p) => p.permissionKey.toLowerCase()) || []
    );

    const sourceList = allSystemPermissions.length > 0
      ? allSystemPermissions
      : (userProfile?.permissions.map((p) => ({
          name: p.name,
          description: p.description,
          permissionKey: p.permissionKey,
          category: p.category,
        })) || []);

    return sourceList.filter((p) => {
      // Exclude permissions the user already has active access to
      if (alreadyGrantedKeys.has(p.permissionKey.toLowerCase())) return false;
      if (modalSearch.trim()) {
        const q = modalSearch.toLowerCase();
        return (
          p.permissionKey.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allSystemPermissions, userProfile, modalSearch]);

  // Open Add Modal and reset selection state
  const handleOpenAddModal = () => {
    setSelectedPermKeyToAdd("");
    setAddReason("");
    setModalSearch("");
    setIsAddModalOpen(true);
  };

  // Assign Permission Action
  const handleAssignPermission = async () => {
    if (!selectedUserId || !selectedPermKeyToAdd) {
      showErrorAlert("Selection Required", "Please select a permission to assign.");
      return;
    }

    try {
      setActionLoading(true);
      await permissionService.assignUserPermission(selectedUserId, selectedPermKeyToAdd, addReason);
      showSuccessAlert("Permission Assigned", `Granted '${selectedPermKeyToAdd}' directly to user.`);
      setIsAddModalOpen(false);
      setSelectedPermKeyToAdd("");
      setAddReason("");
      // Refresh details and overview counts
      await Promise.all([fetchUserDetails(selectedUserId), fetchUsersOverview(selectedUserId)]);
    } catch (err: any) {
      showErrorAlert("Assignment Failed", err.message || "Could not assign permission.");
    } finally {
      setActionLoading(false);
    }
  };

  // Revoke Permission Action
  const handleRevokePermission = async (perm: UserPermissionDetail) => {
    if (!selectedUserId) return;

    const confirm = await showConfirmDialog(
      "Revoke Direct Permission?",
      `Are you sure you want to remove the direct permission '${perm.name}' (${perm.permissionKey}) from ${userProfile?.name}? The user will fall back to their role's inherited access.`,
      "Yes, Revoke",
      "Cancel",
      true
    );

    if (!confirm.isConfirmed) return;

    try {
      setActionLoading(true);
      await permissionService.revokeUserPermission(selectedUserId, perm.permissionKey);
      showSuccessAlert("Permission Revoked", `Direct permission '${perm.permissionKey}' has been removed.`);
      // Refresh details and overview counts
      await Promise.all([fetchUserDetails(selectedUserId), fetchUsersOverview(selectedUserId)]);
    } catch (err: any) {
      showErrorAlert("Revocation Failed", err.message || "Could not revoke permission.");
    } finally {
      setActionLoading(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalUsers = usersOverview.length;
    const usersWithDirect = usersOverview.filter((u) => u.directPermissionsCount > 0).length;
    const totalDirectGrants = usersOverview.reduce((sum, u) => sum + u.directPermissionsCount, 0);
    const totalSystemCapabilities = allSystemPermissions.length || 39;

    return { totalUsers, usersWithDirect, totalDirectGrants, totalSystemCapabilities };
  }, [usersOverview, allSystemPermissions]);

  const selectedUserOverview = usersOverview.find((u) => u.userId === selectedUserId);
  const selectedRoleMeta = getRoleMeta(selectedUserOverview?.roleId ?? undefined, selectedUserOverview?.roleName);

  return (
    <WorkspaceLayout
      permission="permissions.manage"
      label="User Permissions"
      icon="🛡️"
      showHero={false}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
        {/* Page Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
         

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (selectedUserId) {
                  fetchUserDetails(selectedUserId);
                }
                fetchUsersOverview(selectedUserId || undefined);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh permissions data"
            >
              <Refresh sx={{ fontSize: 16 }} />
              <span>Refresh</span>
            </button>

            {selectedUserId && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Add sx={{ fontSize: 18 }} />
                <span>Add Permission</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Summary Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Users</span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Person sx={{ fontSize: 18 }} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.totalUsers}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Active member accounts</p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Users with Overrides</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Shield sx={{ fontSize: 18 }} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.usersWithDirect}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Custom user-level access</p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Direct Grants</span>
              <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <VpnKey sx={{ fontSize: 18 }} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.totalDirectGrants}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Active individual overrides</p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">System Capabilities</span>
              <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <DoneAll sx={{ fontSize: 18 }} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSystemCapabilities}</p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Available workspace features</p>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Users Directory Master List (4 Cols) */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col h-[750px]">
            {/* Header & Filter */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PersonOutline sx={{ fontSize: 18 }} className="text-blue-600" />
                  <span>User Directory</span>
                </h2>
                <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                  {filteredUsers.length}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" sx={{ fontSize: 16 }} />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user, role, department..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setUserFilterMode("all")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    userFilterMode === "all"
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  All ({usersOverview.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilterMode("direct-only")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors flex items-center gap-1 ${
                    userFilterMode === "direct-only"
                      ? "bg-emerald-600 text-white font-semibold shadow-xs"
                      : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>With Grants</span>
                  <span className="text-[10px] opacity-80">({stats.usersWithDirect})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilterMode("admins")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    userFilterMode === "admins"
                      ? "bg-purple-600 text-white font-semibold shadow-xs"
                      : "bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  Admins
                </button>
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
              {loadingUsers ? (
                <div className="p-8 text-center">
                  <LoadingSpinner message="Loading users..." />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  No users matched your search criteria.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserId === u.userId;
                  const roleMeta = getRoleMeta(u.roleId ?? undefined, u.roleName);

                  return (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => setSelectedUserId(u.userId)}
                      className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600 shadow-xs"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${isSelected ? "text-blue-900 dark:text-blue-200 font-bold" : "text-slate-900 dark:text-white"}`}>
                            {u.name}
                          </p>
                          {u.directPermissionsCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.2 text-[10px] font-bold">
                              +{u.directPermissionsCount} Direct
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          {u.email}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`rounded-md px-1.5 py-0.2 text-[9px] font-semibold border ${roleMeta.color}`}
                          >
                            {u.roleName}
                          </span>
                          {u.departmentName && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                              • {u.departmentName}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected User's Permissions Detail (8 Cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col min-h-[750px]">
            {loadingDetails ? (
              <div className="p-16 text-center">
                <LoadingSpinner message="Loading user permission matrix..." />
              </div>
            ) : !userProfile ? (
              <div className="p-16 text-center text-slate-400">
                <Person sx={{ fontSize: 48 }} className="opacity-40 mb-2" />
                <p>Select a user from the directory to inspect and manage their permissions.</p>
              </div>
            ) : (
              <>
                {/* User Detail Banner */}
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="h-13 w-13 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg ring-2 ring-white/20">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold tracking-tight text-white">{userProfile.name}</h2>
                          {userProfile.roleId === 2 && (
                            <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold">
                              👑 Super Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300">{userProfile.email}</p>
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${selectedRoleMeta.color}`}>
                            {userProfile.roleName}
                          </span>
                          {userProfile.departmentName && (
                            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-200">
                              {userProfile.departmentName}
                            </span>
                          )}
                          {userProfile.designationName && (
                            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-200">
                              {userProfile.designationName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats & Add Button */}
                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2">
                      <div className="flex items-center gap-2.5 text-right">
                        <div>
                          <p className="text-[10px] text-slate-300">Direct</p>
                          <p className="text-base font-bold text-emerald-400">
                            {userProfile.directCount}
                          </p>
                        </div>
                        <div className="h-6 w-px bg-white/20" />
                        <div>
                          <p className="text-[10px] text-slate-300">Role</p>
                          <p className="text-base font-bold text-purple-300">
                            {userProfile.roleCount ?? 0}
                          </p>
                        </div>
                        <div className="h-6 w-px bg-white/20" />
                        <div>
                          <p className="text-[10px] text-slate-300">Dept</p>
                          <p className="text-base font-bold text-sky-300">
                            {userProfile.departmentCount ?? 0}
                          </p>
                        </div>
                        <div className="h-6 w-px bg-white/20" />
                        <div>
                          <p className="text-[10px] text-slate-300">Total</p>
                          <p className="text-base font-bold text-white">
                            {userProfile.totalCount}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={handleOpenAddModal}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                      >
                        <Add sx={{ fontSize: 16 }} />
                        <span>Add Direct Permission</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-Header / Filters Bar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* View Filter Tabs */}
                    <div className="flex items-center rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                      <button
                        onClick={() => setPermTab("all")}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                          permTab === "all"
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                            : "hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        All ({userProfile.permissions.length})
                      </button>
                      <button
                        onClick={() => setPermTab("direct")}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all flex items-center gap-1 ${
                          permTab === "direct"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>Direct</span>
                        <span className="rounded-full bg-emerald-500/30 px-1.5 text-[10px]">
                          {userProfile.directCount}
                        </span>
                      </button>
                      <button
                        onClick={() => setPermTab("role")}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all flex items-center gap-1 ${
                          permTab === "role"
                            ? "bg-purple-600 text-white shadow-xs"
                            : "hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>Role</span>
                        <span className="rounded-full bg-purple-500/30 px-1.5 text-[10px]">
                          {userProfile.roleCount ?? 0}
                        </span>
                      </button>
                      <button
                        onClick={() => setPermTab("department")}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all flex items-center gap-1 ${
                          permTab === "department"
                            ? "bg-sky-600 text-white shadow-xs"
                            : "hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>Department</span>
                        <span className="rounded-full bg-sky-500/30 px-1.5 text-[10px]">
                          {userProfile.departmentCount ?? 0}
                        </span>
                      </button>
                    </div>

                    {/* Category Filter Dropdown */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        Category:
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Categories</option>
                        {availableCategories.map((c) => (
                          <option key={c} value={c}>
                            {c.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Search inside permissions */}
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" sx={{ fontSize: 16 }} />
                    <input
                      type="text"
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      placeholder="Filter permissions by name, key, or category..."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Permissions List Table */}
                <div className="flex-1 overflow-y-auto">
                  {filteredPermissions.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500">
                      No permissions match the selected filter.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-xs text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-2.5 font-bold">Capability / Action</th>
                          <th className="px-4 py-2.5 font-bold hidden sm:table-cell">Permission Key</th>
                          <th className="px-4 py-2.5 font-bold">Source & Level</th>
                          <th className="px-4 py-2.5 font-bold">Status</th>
                          <th className="px-4 py-2.5 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredPermissions.map((p) => {
                          const isDirect = p.isDirect;
                          const isAllowed = p.isAllowed;

                          return (
                            <tr
                              key={p.permissionKey}
                              className={`transition-colors ${
                                isDirect
                                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40"
                                  : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                              }`}
                            >
                              {/* Name & Desc */}
                              <td className="px-4 py-3 min-w-[180px]">
                                <div className="flex items-center gap-2">
                                  {isDirect ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 shrink-0" title="Direct Grant">
                                      <Shield sx={{ fontSize: 16 }} />
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 shrink-0" title="Inherited Access">
                                      <LockOutlined sx={{ fontSize: 16 }} />
                                    </span>
                                  )}
                                  <div>
                                    <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                                      {p.name}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                      {p.description}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Key & Category */}
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                                  {p.permissionKey}
                                </span>
                              </td>

                              {/* Source */}
                              <td className="px-4 py-3">
                                {isDirect ? (
                                  <div className="flex flex-col">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800 w-fit">
                                      <CheckCircle sx={{ fontSize: 12 }} />
                                      Direct Grant
                                    </span>
                                    {p.grantedAt && (
                                      <span className="text-[9px] text-slate-400 mt-0.5">
                                        Assigned: {new Date(p.grantedAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                ) : p.source === "SuperAdmin" ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 text-[10px] font-bold border border-amber-300 dark:border-amber-800 w-fit">
                                    👑 Super Admin
                                  </span>
                                ) : p.source === "RoleAndDepartment" ? (
                                  <div className="flex flex-wrap gap-1 items-center">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 text-[10px] font-medium border border-purple-200 dark:border-purple-800 w-fit">
                                      Role ({p.roleName || userProfile.roleName})
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 px-2 py-0.5 text-[10px] font-medium border border-sky-200 dark:border-sky-800 w-fit">
                                      Dept ({p.departmentName || userProfile.departmentName})
                                    </span>
                                  </div>
                                ) : p.isFromDepartment || p.source === "Department" ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 px-2.5 py-0.5 text-[10px] font-semibold border border-sky-200 dark:border-sky-800 w-fit">
                                    🏢 Dept ({p.departmentName || userProfile.departmentName || "Department"})
                                  </span>
                                ) : p.isFromRole || p.source === "Role" || p.source === "ExplicitChildAllow" || p.source === "InheritedAllow" ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 px-2.5 py-0.5 text-[10px] font-medium border border-purple-200 dark:border-purple-800 w-fit">
                                    ♙ Role ({p.roleName || userProfile.roleName || "Role"})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 text-[10px] border border-slate-200 dark:border-slate-700 w-fit">
                                    Denied
                                  </span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3">
                                {isAllowed ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                    <CheckCircle sx={{ fontSize: 14 }} />
                                    Allowed
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">
                                    Denied
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3 text-right">
                                {isDirect ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokePermission(p)}
                                    disabled={actionLoading}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                                    title="Remove direct permission assignment for this user"
                                  >
                                    <DeleteOutline sx={{ fontSize: 14 }} />
                                    <span>Remove</span>
                                  </button>
                                ) : (
                                  <span
                                    className="text-[11px] text-slate-400 dark:text-slate-500 italic"
                                    title="Inherited access"
                                  >
                                    {p.isFromDepartment && !p.isFromRole ? "Dept Default" : "Role Default"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Direct Permission Modal */}
      {isAddModalOpen && userProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <Add sx={{ fontSize: 20 }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Add Direct Permission
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Grant individual capability to <strong className="text-slate-800 dark:text-slate-200">{userProfile.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Close sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Permission search inside modal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Search Missing Permissions
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" sx={{ fontSize: 16 }} />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search missing permissions by name or key..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Permission Select List */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Select Missing Permission ({availablePermissionsForModal.length} missing)
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {userProfile.totalCount} active / {allSystemPermissions.length || 39} total
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 p-1">
                  {availablePermissionsForModal.length === 0 ? (
                    <div className="p-6 text-center space-y-1">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {userProfile.totalCount >= (allSystemPermissions.length || 39)
                          ? "This user already has all capabilities granted."
                          : "No matching missing permissions found."}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {userProfile.totalCount >= (allSystemPermissions.length || 39)
                          ? "All system permissions are already active via role, department, or direct assignment."
                          : "Try adjusting your search keywords."}
                      </p>
                    </div>
                  ) : (
                    availablePermissionsForModal.map((perm) => {
                      const isSelected = selectedPermKeyToAdd === perm.permissionKey;

                      return (
                        <button
                          key={perm.permissionKey}
                          type="button"
                          onClick={() => setSelectedPermKeyToAdd(perm.permissionKey)}
                          className={`w-full text-left p-2.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/60 border border-blue-500"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {perm.name}
                              </p>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Missing
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                              {perm.description}
                            </p>
                            <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 inline-block">
                              {perm.permissionKey}
                            </span>
                          </div>
                          <div
                            className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {isSelected && <CheckCircle sx={{ fontSize: 14 }} />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Optional Reason / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Audit Notes / Reason (Optional)
                </label>
                <input
                  type="text"
                  value={addReason}
                  onChange={(e) => setAddReason(e.target.value)}
                  placeholder="e.g. Special access granted for procurement audit..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignPermission}
                disabled={actionLoading || !selectedPermKeyToAdd}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                {actionLoading ? "Assigning..." : "Assign Permission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};

export default UserPermissionsPage;
