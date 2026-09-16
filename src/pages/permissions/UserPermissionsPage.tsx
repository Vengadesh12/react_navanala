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
  ArrowBack,
  ChevronRight,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { MetricCard } from "../../components/common/MetricCard";
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
  const { user: currentUser, refreshPermissions } = useAuth();

  // Master user directory state
  const [usersOverview, setUsersOverview] = useState<UserPermissionOverview[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState<string>("");
  const [userFilterMode, setUserFilterMode] = useState<"all" | "direct-only" | "admins">("all");
  const [mobileTab, setMobileTab] = useState<"directory" | "detail">("directory");

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
  const [selectedPermKeysToAdd, setSelectedPermKeysToAdd] = useState<string[]>([]);
  const [assigningProgress, setAssigningProgress] = useState<{ current: number; total: number } | null>(null);
  const [addReason, setAddReason] = useState<string>("");
  const [modalSearch, setModalSearch] = useState<string>("");
  const [modalCategory, setModalCategory] = useState<string>("all");

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
        return Boolean(u.isSuperAdmin) || role.includes("admin") || role.includes("manager");
      }
      return true;
    });
  }, [usersOverview, userSearch, userFilterMode]);

  // Auto-select first matching user if current selected user is filtered out by search
  useEffect(() => {
    if (userSearch.trim() && filteredUsers.length > 0) {
      if (!selectedUserId || !filteredUsers.some((u) => u.userId === selectedUserId)) {
        setSelectedUserId(filteredUsers[0].userId);
      }
    }
  }, [userSearch, filteredUsers, selectedUserId]);

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
      if (permTab === "role") {
        const isSuperAdmin = Boolean(userProfile.isSuperAdmin || userProfile.roleName?.toLowerCase().includes("super admin"));
        if (isSuperAdmin) {
          if (p.isDirect) return false;
        } else if (!p.isFromRole || p.isDirect) {
          return false;
        }
      }
      if (permTab === "department" && (!p.isFromDepartment || p.isDirect)) return false;

      // Category filter
      if (categoryFilter !== "all" && p.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      // Search filter
      if (permSearch.trim()) {
        const query = permSearch.trim().toLowerCase();
        const matchesKey = (p.permissionKey || "").toLowerCase().includes(query);
        const matchesName = (p.name || "").toLowerCase().includes(query);
        const matchesDesc = (p.description || "").toLowerCase().includes(query);
        const matchesCat = (p.category || "").toLowerCase().includes(query);
        return matchesKey || matchesName || matchesDesc || matchesCat;
      }

      return true;
    });
  }, [userProfile, permTab, categoryFilter, permSearch]);

  // Permissions that the selected user DOES NOT currently have (!p.isAllowed)
  const missingPermissionsForModal = useMemo(() => {
    if (!userProfile?.permissions) return [];

    // Keys the user already has active access to (via Direct, Role, or Department)
    const userAllowedKeys = new Set(
      userProfile.permissions
        .filter((p) => p.isAllowed)
        .map((p) => p.permissionKey.toLowerCase())
    );

    const list: Array<{
      permissionKey: string;
      name: string;
      description: string;
      category: string;
    }> = [];

    const seen = new Set<string>();

    // 1. From userProfile.permissions
    userProfile.permissions.forEach((p) => {
      const keyLower = p.permissionKey.toLowerCase();
      if (!userAllowedKeys.has(keyLower) && !seen.has(keyLower)) {
        seen.add(keyLower);
        list.push({
          permissionKey: p.permissionKey,
          name: p.name || p.permissionKey,
          description: p.description || "",
          category: p.category || (p.permissionKey.includes(".") ? p.permissionKey.split(".")[0] : "general"),
        });
      }
    });

    // 2. Fallback / merge any from allSystemPermissions that user doesn't have
    allSystemPermissions.forEach((p) => {
      const keyLower = p.permissionKey.toLowerCase();
      if (!userAllowedKeys.has(keyLower) && !seen.has(keyLower)) {
        seen.add(keyLower);
        list.push({
          permissionKey: p.permissionKey,
          name: p.name || p.permissionKey,
          description: p.description || "",
          category: p.category || (p.permissionKey.includes(".") ? p.permissionKey.split(".")[0] : "general"),
        });
      }
    });

    return list;
  }, [allSystemPermissions, userProfile]);

  // Categories for modal (only unassigned permissions)
  const availableModalCategories = useMemo(() => {
    const set = new Set<string>();
    missingPermissionsForModal.forEach((p) => {
      if (p.category) {
        set.add(p.category);
      }
    });
    return Array.from(set).sort();
  }, [missingPermissionsForModal]);

  // Filtered unassigned permissions inside Add Modal by search & category
  const filteredModalPermissions = useMemo(() => {
    return missingPermissionsForModal.filter((p) => {
      // Category filter
      if (modalCategory !== "all" && (p.category || "").toLowerCase() !== modalCategory.toLowerCase()) {
        return false;
      }

      // Search filter
      if (modalSearch.trim()) {
        const q = modalSearch.trim().toLowerCase();
        const matchesKey = (p.permissionKey || "").toLowerCase().includes(q);
        const matchesName = (p.name || "").toLowerCase().includes(q);
        const matchesDesc = (p.description || "").toLowerCase().includes(q);
        const matchesCat = (p.category || "").toLowerCase().includes(q);
        return matchesKey || matchesName || matchesDesc || matchesCat;
      }

      return true;
    });
  }, [missingPermissionsForModal, modalSearch, modalCategory]);

  // Open Add Modal and reset selection state
  const handleOpenAddModal = () => {
    setSelectedPermKeysToAdd([]);
    setAddReason("");
    setModalSearch("");
    setModalCategory("all");
    setAssigningProgress(null);
    setIsAddModalOpen(true);
  };

  // Toggle selection for a single permission
  const togglePermissionSelection = (permKey: string) => {
    setSelectedPermKeysToAdd((prev) =>
      prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]
    );
  };

  // Toggle selection for all currently filtered permissions in modal
  const handleToggleSelectAllModal = () => {
    const allFilteredKeys = filteredModalPermissions.map((p) => p.permissionKey);
    if (allFilteredKeys.length === 0) return;

    const areAllFilteredSelected = allFilteredKeys.every((k) => selectedPermKeysToAdd.includes(k));

    if (areAllFilteredSelected) {
      // Unselect all currently filtered keys
      setSelectedPermKeysToAdd((prev) => prev.filter((k) => !allFilteredKeys.includes(k)));
    } else {
      // Add any filtered keys not yet selected
      setSelectedPermKeysToAdd((prev) => {
        const set = new Set([...prev, ...allFilteredKeys]);
        return Array.from(set);
      });
    }
  };

  // Clear all selections
  const handleClearModalSelection = () => {
    setSelectedPermKeysToAdd([]);
  };

  // Assign Permissions Action (Multi-select)
  const handleAssignPermissions = async () => {
    if (!selectedUserId || selectedPermKeysToAdd.length === 0) {
      showErrorAlert("Selection Required", "Please select at least one permission to assign.");
      return;
    }

    try {
      setActionLoading(true);
      const totalCount = selectedPermKeysToAdd.length;

      const result = await permissionService.assignUserPermissions(
        selectedUserId,
        selectedPermKeysToAdd,
        addReason,
        (current, total) => {
          setAssigningProgress({ current, total });
        }
      );

      if (result.errors.length === 0) {
        showSuccessAlert(
          "Permissions Assigned",
          `Successfully granted ${result.successCount} direct permission${result.successCount > 1 ? "s" : ""} to ${userProfile?.name || "user"}.`
        );
      } else if (result.successCount > 0) {
        showSuccessAlert(
          "Partially Assigned",
          `Granted ${result.successCount} of ${totalCount} permissions. Failed: ${result.errors.join(", ")}`
        );
      } else {
        showErrorAlert(
          "Assignment Failed",
          result.errors.join("; ") || "Could not assign permissions."
        );
      }

      setIsAddModalOpen(false);
      setSelectedPermKeysToAdd([]);
      setAddReason("");
      // Refresh details and overview counts
      await Promise.all([
        fetchUserDetails(selectedUserId),
        fetchUsersOverview(selectedUserId),
        selectedUserId === currentUser?.id ? refreshPermissions(true) : Promise.resolve(),
      ]);
    } catch (err: any) {
      showErrorAlert("Assignment Failed", err.message || "Could not assign permissions.");
    } finally {
      setActionLoading(false);
      setAssigningProgress(null);
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
      await Promise.all([
        fetchUserDetails(selectedUserId),
        fetchUsersOverview(selectedUserId),
        selectedUserId === currentUser?.id ? refreshPermissions(true) : Promise.resolve(),
      ]);
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

  const isSelectedSuperAdmin = Boolean(userProfile?.isSuperAdmin || userProfile?.roleName?.toLowerCase().includes("super admin"));
  const userDirectCount = userProfile?.directCount ?? userProfile?.permissions?.filter(p => p.isDirect).length ?? 0;
  const userRoleCount = (userProfile?.roleCount !== undefined && userProfile.roleCount > 0)
    ? userProfile.roleCount
    : (isSelectedSuperAdmin
        ? (userProfile?.permissions?.length ?? 39)
        : (userProfile?.permissions?.filter(p => p.isFromRole && !p.isDirect).length ?? 0));
  const userDeptCount = userProfile?.departmentCount ?? userProfile?.permissions?.filter(p => p.isFromDepartment && !p.isDirect).length ?? 0;
  const userTotalCount = userProfile?.totalCount ?? userProfile?.permissions?.filter(p => p.isAllowed).length ?? 0;

  return (
    <WorkspaceLayout
      permission="permissions.manage"
      label="User Permissions"
      icon="🛡️"
      showHero={false}
      searchValue={userSearch}
      onSearchChange={setUserSearch}
      searchPlaceholder="Search users by name, role, department..."
    >
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3.5 sm:space-y-4 animate-fade-in">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 sm:pb-1 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              User Permissions
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage user-level permissions, direct access overrides, and view role/department inheritance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (selectedUserId) {
                  fetchUserDetails(selectedUserId);
                }
                fetchUsersOverview(selectedUserId || undefined);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh permissions data"
            >
              <Refresh sx={{ fontSize: 16 }} />
              <span>Refresh</span>
            </button>

            {selectedUserId && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer hover:scale-[1.02]"
              >
                <Add sx={{ fontSize: 16 }} />
                <span>Add Permission</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Summary Stats Cards (2x2 on mobile, 4-col on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <MetricCard
            label="Total Users"
            value={stats.totalUsers}
            note="Active accounts"
            icon={<Person sx={{ fontSize: 22 }} />}
            color="blue"
            onClick={() => setUserFilterMode("all")}
            className={`p-3.5! sm:p-5! ${userFilterMode === "all" ? "ring-2 ring-blue-500/60 ring-offset-2 dark:ring-offset-slate-900" : ""}`}
          />

          <MetricCard
            label="With Overrides"
            value={stats.usersWithDirect}
            note="Custom access"
            icon={<Shield sx={{ fontSize: 22 }} />}
            color="emerald"
            onClick={() => setUserFilterMode(userFilterMode === "direct-only" ? "all" : "direct-only")}
            className={`p-3.5! sm:p-5! ${userFilterMode === "direct-only" ? "ring-2 ring-emerald-500/60 ring-offset-2 dark:ring-offset-slate-900" : ""}`}
          />

          <MetricCard
            label="Direct Grants"
            value={stats.totalDirectGrants}
            note="Active overrides"
            icon={<VpnKey sx={{ fontSize: 22 }} />}
            color="indigo"
            onClick={() => setPermTab(permTab === "direct" ? "all" : "direct")}
            className={`p-3.5! sm:p-5! ${permTab === "direct" ? "ring-2 ring-indigo-500/60 ring-offset-2 dark:ring-offset-slate-900" : ""}`}
          />

          <MetricCard
            label="Capabilities"
            value={stats.totalSystemCapabilities}
            note="Workspace features"
            icon={<DoneAll sx={{ fontSize: 22 }} />}
            color="purple"
            className="p-3.5! sm:p-5!"
          />
        </div>

        {/* Mobile Master-Detail Segmented View Switcher (Visible on < lg screens) */}
        <div className="lg:hidden flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMobileTab("directory")}
            className={`flex-1 py-2 px-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === "directory"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <PersonOutline sx={{ fontSize: 16 }} />
            <span>Users ({filteredUsers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("detail")}
            className={`flex-1 py-2 px-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileTab === "detail"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Shield sx={{ fontSize: 16 }} />
            <span className="truncate max-w-[130px] sm:max-w-none">
              {userProfile?.name ? `${userProfile.name.split(" ")[0]}'s Permissions` : "Permissions"}
            </span>
          </button>
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Left Column: Users Directory Master List (4 Cols on desktop, full width on mobile) */}
          <div
            className={`${
              mobileTab === "directory" ? "flex" : "hidden"
            } lg:flex lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex-col h-[calc(100vh-210px)] min-h-[460px] lg:h-[calc(100vh-19rem)] lg:min-h-[540px] lg:max-h-[750px]`}
          >
            {/* Header & Filter */}
            <div className="shrink-0 p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 space-y-2.5 sm:space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
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
              <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto scrollbar-none whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setUserFilterMode("all")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
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
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer ${
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
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
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
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
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
                      onClick={() => {
                        setSelectedUserId(u.userId);
                        setMobileTab("detail");
                      }}
                      className={`w-full text-left p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer flex items-center gap-2.5 sm:gap-3 ${
                        isSelected
                          ? "bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600 shadow-xs"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        className={`h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs ${
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
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold shrink-0">
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

                      {/* Mobile Arrow Chevron */}
                      <div className="lg:hidden text-slate-400 shrink-0 pl-1">
                        <ChevronRight sx={{ fontSize: 18 }} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Selected User's Permissions Detail (8 Cols on desktop, full width on mobile) */}
          <div
            className={`${
              mobileTab === "detail" ? "flex" : "hidden"
            } lg:flex lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex-col h-[calc(100vh-210px)] min-h-[460px] lg:h-[calc(100vh-19rem)] lg:min-h-[540px] lg:max-h-[750px]`}
          >
            {loadingDetails ? (
              <div className="p-12 sm:p-16 text-center">
                <LoadingSpinner message="Loading user permission matrix..." />
              </div>
            ) : !userProfile ? (
              <div className="p-12 sm:p-16 text-center text-slate-400 space-y-3">
                <Person sx={{ fontSize: 48 }} className="opacity-40" />
                <p className="text-xs sm:text-sm">Select a user from the directory to inspect and manage their permissions.</p>
                <button
                  type="button"
                  onClick={() => setMobileTab("directory")}
                  className="lg:hidden inline-flex items-center gap-1.5 rounded-xl bg-blue-600 text-white px-4 py-2 text-xs font-semibold cursor-pointer shadow-sm"
                >
                  <PersonOutline sx={{ fontSize: 16 }} />
                  <span>Browse User Directory</span>
                </button>
              </div>
            ) : (
              <>
                {/* User Detail Banner */}
                <div className="shrink-0 p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white">
                  {/* Mobile Back Button */}
                  <div className="lg:hidden mb-2.5">
                    <button
                      type="button"
                      onClick={() => setMobileTab("directory")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 active:bg-white/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      <ArrowBack sx={{ fontSize: 14 }} />
                      <span>Back to User Directory</span>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 sm:h-13 sm:w-13 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg sm:text-xl font-bold text-white shadow-lg ring-2 ring-white/20 shrink-0">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white truncate max-w-[200px] sm:max-w-none">
                            {userProfile.name}
                          </h2>
                          {Boolean(userProfile.isSuperAdmin || userProfile.roleName?.toLowerCase().includes("super admin")) && (
                            <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold shrink-0">
                              👑 Super Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 truncate">{userProfile.email}</p>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
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
                    <div className="space-y-2.5 sm:space-y-2">
                      {/* Mobile 4-col Stat Grid (< sm) */}
                      <div className="grid grid-cols-4 gap-1 sm:hidden bg-white/10 dark:bg-slate-950/60 p-2 rounded-xl text-center backdrop-blur-xs">
                        <div>
                          <p className="text-[10px] text-slate-300 font-medium">Direct</p>
                          <p className="text-sm font-bold text-emerald-400">{userDirectCount}</p>
                        </div>
                        <div className="border-l border-white/15">
                          <p className="text-[10px] text-slate-300 font-medium">Role</p>
                          <p className="text-sm font-bold text-purple-300">{userRoleCount}</p>
                        </div>
                        <div className="border-l border-white/15">
                          <p className="text-[10px] text-slate-300 font-medium">Dept</p>
                          <p className="text-sm font-bold text-sky-300">{userDeptCount}</p>
                        </div>
                        <div className="border-l border-white/15">
                          <p className="text-[10px] text-slate-300 font-medium">Total</p>
                          <p className="text-sm font-bold text-white">{userTotalCount}</p>
                        </div>
                      </div>

                      {/* Desktop Stat Row (sm and up) */}
                      <div className="hidden sm:flex items-center gap-2.5 text-right justify-end">
                        <div>
                          <p className="text-[10px] text-slate-300">Direct</p>
                          <p className="text-base font-bold text-emerald-400">
                            {userDirectCount}
                          </p>
                        </div>
                        <div className="h-6 w-px bg-white/20" />
                        <div>
                          <p className="text-[10px] text-slate-300">Role</p>
                          <p className="text-base font-bold text-purple-300">
                            {userRoleCount}
                          </p>
                        </div>
                        <div className="h-6 w-px bg-white/20" />
                        <div>
                          <p className="text-[10px] text-slate-300">Dept</p>
                          <p className="text-base font-bold text-sky-300">
                            {userDeptCount}
                          </p>
                        </div>
                        <div className="h-6 w-px bg-white/20" />
                        <div>
                          <p className="text-[10px] text-slate-300">Total</p>
                          <p className="text-base font-bold text-white">
                            {userTotalCount}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white px-3.5 py-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer"
                      >
                        <Add sx={{ fontSize: 16 }} />
                        <span>Add Direct Permission</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-Header / Filters Bar */}
                <div className="shrink-0 p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                    {/* View Filter Tabs with horizontal scroll */}
                    <div className="flex items-center rounded-xl bg-slate-200/70 dark:bg-slate-800 p-1 text-xs font-medium text-slate-600 dark:text-slate-400 overflow-x-auto scrollbar-none whitespace-nowrap max-w-full">
                      <button
                        type="button"
                        onClick={() => setPermTab("all")}
                        className={`rounded-lg px-2.5 sm:px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          permTab === "all"
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                            : "hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        All ({userProfile.permissions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermTab("direct")}
                        className={`rounded-lg px-2.5 sm:px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                          permTab === "direct"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>Direct</span>
                        <span className="rounded-full bg-emerald-500/30 px-1.5 text-[10px]">
                          {userDirectCount}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermTab("role")}
                        className={`rounded-lg px-2.5 sm:px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                          permTab === "role"
                            ? "bg-purple-600 text-white shadow-xs"
                            : "hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>Role</span>
                        <span className="rounded-full bg-purple-500/30 px-1.5 text-[10px]">
                          {userRoleCount}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPermTab("department")}
                        className={`rounded-lg px-2.5 sm:px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                          permTab === "department"
                            ? "bg-sky-600 text-white shadow-xs"
                            : "hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>Dept</span>
                        <span className="rounded-full bg-sky-500/30 px-1.5 text-[10px]">
                          {userDeptCount}
                        </span>
                      </button>
                    </div>

                    {/* Category Filter Dropdown */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:inline">
                        Category:
                      </label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full sm:w-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
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

                {/* Permissions List Display (Responsive Card View on Mobile, Table on Desktop) */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                  {filteredPermissions.length === 0 ? (
                    <div className="p-10 text-center text-xs text-slate-400 dark:text-slate-500">
                      No permissions match the selected filter.
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card View (< sm) */}
                      <div className="sm:hidden p-2.5 space-y-2">
                        {filteredPermissions.map((p) => {
                          const isDirect = p.isDirect;
                          const isAllowed = p.isAllowed;

                          return (
                            <div
                              key={p.permissionKey}
                              className={`p-3 rounded-xl border transition-all ${
                                isDirect
                                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 shadow-2xs"
                                  : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-2xs"
                              }`}
                            >
                              {/* Top: Name & Status */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  <div className="mt-0.5 shrink-0">
                                    {isDirect ? (
                                      <Shield sx={{ fontSize: 16 }} className="text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                      <LockOutlined sx={{ fontSize: 16 }} className="text-slate-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                      {p.name || p.permissionKey}
                                    </p>
                                    {p.description && (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                        {p.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0">
                                  {isAllowed ? (
                                    <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                      <CheckCircle sx={{ fontSize: 11 }} />
                                      Allowed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-slate-400 text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                      Denied
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Middle: Permission Key & Category */}
                              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                                  {p.permissionKey}
                                </span>
                                {p.category && (
                                  <span className="text-[9px] uppercase font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {p.category}
                                  </span>
                                )}
                              </div>

                              {/* Bottom: Source & Action */}
                              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  {isDirect ? (
                                    <div className="flex flex-col">
                                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                        <CheckCircle sx={{ fontSize: 11 }} />
                                        Direct Grant
                                      </span>
                                      {p.grantedAt && (
                                        <span className="text-[9px] text-slate-400">
                                          Assigned: {new Date(p.grantedAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  ) : p.source === "SuperAdmin" ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold border border-amber-300 dark:border-amber-800">
                                      👑 Super Admin
                                    </span>
                                  ) : p.source === "RoleAndDepartment" ? (
                                    <div className="flex flex-wrap gap-1">
                                      <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 text-[9px] font-medium border border-purple-200 dark:border-purple-800">
                                        Role
                                      </span>
                                      <span className="rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 px-2 py-0.5 text-[9px] font-medium border border-sky-200 dark:border-sky-800">
                                        Dept
                                      </span>
                                    </div>
                                  ) : p.isFromDepartment || p.source === "Department" ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 px-2 py-0.5 text-[10px] font-semibold border border-sky-200 dark:border-sky-800 truncate max-w-[170px]">
                                      🏢 {p.departmentName || userProfile.departmentName || "Dept"}
                                    </span>
                                  ) : p.isFromRole || p.source === "Role" || p.source === "ExplicitChildAllow" || p.source === "InheritedAllow" ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 px-2 py-0.5 text-[10px] font-medium border border-purple-200 dark:border-purple-800 truncate max-w-[170px]">
                                      ♙ {p.roleName || userProfile.roleName || "Role"}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">Denied</span>
                                  )}
                                </div>

                                <div>
                                  {isDirect ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRevokePermission(p)}
                                      disabled={actionLoading}
                                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                                    >
                                      <DeleteOutline sx={{ fontSize: 13 }} />
                                      <span>Remove</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                                      {p.isFromDepartment && !p.isFromRole ? "Dept Default" : "Role Default"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Table View (sm and up) */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700 shadow-xs">
                            <tr>
                              <th className="px-4 py-2.5 font-bold">Permission Name</th>
                              <th className="px-4 py-2.5 font-bold hidden md:table-cell">Permission Key</th>
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
                                          {p.name || p.permissionKey}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                          {p.description}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Key & Category */}
                                  <td className="px-4 py-3 hidden md:table-cell">
                                    <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                                      {p.permissionKey}
                                    </span>
                                  </td>

                                  {/* Source */}
                                  <td className="px-4 py-3">
                                    {isDirect ? (
                                      <div className="flex flex-col">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-300 dark:border-emerald-800 w-fit whitespace-nowrap">
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
                                      <div className="flex flex-wrap gap-1 items-center">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 text-[10px] font-bold border border-amber-300 dark:border-amber-800 w-fit">
                                          👑 Super Admin
                                        </span>
                                        {p.isFromDepartment && (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 px-2.5 py-0.5 text-[10px] font-medium border border-sky-200 dark:border-sky-800 w-fit whitespace-nowrap">
                                            Dept ({p.departmentName || userProfile.departmentName})
                                          </span>
                                        )}
                                      </div>
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
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Direct Permission Modal */}
      {isAddModalOpen && userProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Add sx={{ fontSize: 20 }} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Add Direct Permission
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate max-w-[220px] sm:max-w-none">
                    Grant individual direct permission to <strong className="text-slate-800 dark:text-slate-200">{userProfile.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Close sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 sm:space-y-4 flex-1">
              {/* Search & Filter Bar inside modal */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" sx={{ fontSize: 16 }} />
                    <input
                      type="text"
                      value={modalSearch}
                      autoFocus
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Search unassigned permissions..."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    {modalSearch && (
                      <button
                        type="button"
                        onClick={() => setModalSearch("")}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <Close sx={{ fontSize: 14 }} />
                      </button>
                    )}
                  </div>
                  {availableModalCategories.length > 0 && (
                    <select
                      value={modalCategory}
                      onChange={(e) => setModalCategory(e.target.value)}
                      className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shrink-0 cursor-pointer"
                    >
                      <option value="all">All Categories</option>
                      {availableModalCategories.map((c) => (
                        <option key={c} value={c}>
                          {c.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Counter indicator & Quick action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Unassigned ({missingPermissionsForModal.length})
                    </span>
                    {selectedPermKeysToAdd.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                        {selectedPermKeysToAdd.length} selected
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    {filteredModalPermissions.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleSelectAllModal}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold cursor-pointer transition-colors"
                      >
                        {filteredModalPermissions.every((p) => selectedPermKeysToAdd.includes(p.permissionKey))
                          ? "Deselect filtered"
                          : `Select filtered (${filteredModalPermissions.length})`}
                      </button>
                    )}
                    {selectedPermKeysToAdd.length > 0 && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={handleClearModalSelection}
                          className="text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 font-medium cursor-pointer transition-colors"
                        >
                          Clear all
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Permission Table inside Modal */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 sm:max-h-72 overflow-y-auto">
                {missingPermissionsForModal.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="h-10 w-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle sx={{ fontSize: 22 }} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      All Permissions Granted
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      This user already has all system permissions active via their role, department, or direct grants.
                    </p>
                  </div>
                ) : filteredModalPermissions.length === 0 ? (
                  <div className="p-8 text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      No unassigned permissions match your search.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Try adjusting your search keywords or resetting the category filter.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="w-10 px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredModalPermissions.length > 0 &&
                              filteredModalPermissions.every((p) =>
                                selectedPermKeysToAdd.includes(p.permissionKey)
                              )
                            }
                            ref={(input) => {
                              if (input) {
                                const someSelected =
                                  filteredModalPermissions.some((p) =>
                                    selectedPermKeysToAdd.includes(p.permissionKey)
                                  ) &&
                                  !filteredModalPermissions.every((p) =>
                                    selectedPermKeysToAdd.includes(p.permissionKey)
                                  );
                                input.indeterminate = someSelected;
                              }
                            }}
                            onChange={handleToggleSelectAllModal}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            title="Select / Deselect all filtered"
                          />
                        </th>
                        <th className="px-3 py-2.5 font-bold">Permission Name</th>
                        <th className="px-3 py-2.5 font-bold hidden sm:table-cell">Permission Key</th>
                        <th className="px-3 py-2.5 font-bold text-center hidden md:table-cell">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredModalPermissions.map((perm) => {
                        const isSelected = selectedPermKeysToAdd.includes(perm.permissionKey);

                        return (
                          <tr
                            key={perm.permissionKey}
                            onClick={() => togglePermissionSelection(perm.permissionKey)}
                            className={`transition-colors cursor-pointer select-none ${
                              isSelected
                                ? "bg-blue-50/90 dark:bg-blue-950/60 font-medium"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            }`}
                          >
                            {/* Checkbox */}
                            <td
                              className="w-10 px-3 py-2.5 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePermissionSelection(perm.permissionKey)}
                                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>

                            {/* Permission Name & Description */}
                            <td className="px-3 py-2.5">
                              <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                                {perm.name || perm.permissionKey}
                              </p>
                              {perm.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 font-normal">
                                  {perm.description}
                                </p>
                              )}
                              {/* Mobile Sub-tags (Key & Category) */}
                              <div className="sm:hidden flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="font-mono text-[9px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.2 rounded">
                                  {perm.permissionKey}
                                </span>
                                {perm.category && (
                                  <span className="text-[9px] uppercase font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                    {perm.category}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Permission Key */}
                            <td className="px-3 py-2.5 hidden sm:table-cell whitespace-nowrap">
                              <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                                {perm.permissionKey}
                              </span>
                            </td>

                            {/* Category Badge */}
                            <td className="px-3 py-2.5 text-center hidden md:table-cell whitespace-nowrap">
                              <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {perm.category || "General"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Selected Permissions chips summary */}
              {selectedPermKeysToAdd.length > 0 && (
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="text-blue-600 dark:text-blue-400" sx={{ fontSize: 16 }} />
                      <span className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                        Selected ({selectedPermKeysToAdd.length}):
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearModalSelection}
                      className="text-[11px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 font-medium cursor-pointer transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 sm:max-h-24 overflow-y-auto pr-1">
                    {selectedPermKeysToAdd.map((key) => (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 shadow-2xs"
                      >
                        {key}
                        <button
                          type="button"
                          onClick={() => togglePermissionSelection(key)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer ml-0.5"
                          title={`Remove ${key}`}
                        >
                          <Close sx={{ fontSize: 12 }} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
            <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
                {selectedPermKeysToAdd.length === 0
                  ? "Select one or more permissions from the list above"
                  : `${selectedPermKeysToAdd.length} permission${selectedPermKeysToAdd.length > 1 ? "s" : ""} selected for assignment`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-initial rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAssignPermissions}
                  disabled={actionLoading || selectedPermKeysToAdd.length === 0}
                  className="flex-1 sm:flex-initial rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 text-center"
                >
                  {actionLoading ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>
                        {assigningProgress
                          ? `(${assigningProgress.current}/${assigningProgress.total})...`
                          : "Assigning..."}
                      </span>
                    </>
                  ) : (
                    <span>
                      Assign {selectedPermKeysToAdd.length > 0 ? `${selectedPermKeysToAdd.length} Perms` : "Permission"}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};

export default UserPermissionsPage;
