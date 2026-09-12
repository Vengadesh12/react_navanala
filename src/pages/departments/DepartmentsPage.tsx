import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CorporateFare,
  AccountTreeOutlined,
  Add,
  Search,
  EditOutlined,
  DeleteOutline,
  LinkOutlined,
  ExpandMore,
  ChevronRight,
  People,
  BadgeOutlined,
  FolderOpen,
  CheckCircle,
  WarningAmber,
  GridViewOutlined,
  AccountTree,
  TableRowsOutlined,
  Refresh,
  Key,
  ArrowForward,
} from "@mui/icons-material";
import { MetricCard } from "../../components/common/MetricCard";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { SearchInput } from "../../components/common/SearchInput";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Pagination } from "../../components/common/Pagination";
import { SortableHeader } from "../../components/common/SortableHeader";
import { useTableSort } from "../../hooks/useTableSort";
import { DepartmentModal } from "./components/DepartmentModal";
import { MapDesignationModal } from "./components/MapDesignationModal";
import { AssignDesignationModal } from "./components/AssignDesignationModal";
import { departmentService } from "../../api/department.service";
import { designationService } from "../../api/designation.service";
import { userService } from "../../api/user.service";
import { useAuth } from "../../hooks/useAuth";
import { showConfirmDialog, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import type { Department, Designation, DepartmentOverviewResponse, User } from "../../types";

export const DepartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { can } = useAuth();

  const [overview, setOverview] = useState<DepartmentOverviewResponse | null>(null);
  const [allDesignations, setAllDesignations] = useState<Designation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "cards" | "table">("tree");
  const [expandedDeptIds, setExpandedDeptIds] = useState<number[]>([]);

  // Modals state
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [mappingDepartment, setMappingDepartment] = useState<Department | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUnassignedDesId, setSelectedUnassignedDesId] = useState<number | null>(null);

  const isUserActive = (user: User): boolean => {
    const rawFlag = user.deletedFlag ?? user.DeletedFlag ?? user.deletedflag;
    if (rawFlag === undefined || rawFlag === null) return true;
    const deletedFlag = typeof rawFlag === "string" ? Number(rawFlag.trim()) : Number(rawFlag);
    return !isNaN(deletedFlag) && deletedFlag !== 0;
  };

  // Precompute user counts by department for full consistency with user directory
  const deptUserStats = useMemo(() => {
    const desToDeptMap = new Map<number, number>();
    allDesignations.forEach((des) => {
      const desId = Number(des.id ?? des.Id);
      const deptId = Number(des.departmentId ?? des.DepartmentId);
      if (desId && deptId) {
        desToDeptMap.set(desId, deptId);
      }
    });

    const stats: Record<number, { total: number; active: number; deleted: number }> = {};

    users.forEach((u) => {
      const desId = Number(u.designationId ?? u.DesignationId);
      if (!desId) return;
      const deptId = desToDeptMap.get(desId);
      if (!deptId) return;

      if (!stats[deptId]) {
        stats[deptId] = { total: 0, active: 0, deleted: 0 };
      }
      stats[deptId].total += 1;
      if (isUserActive(u)) {
        stats[deptId].active += 1;
      } else {
        stats[deptId].deleted += 1;
      }
    });

    return stats;
  }, [users, allDesignations]);

  const getDeptCounts = (dept: Department) => {
    const computed = deptUserStats[dept.id];
    if (computed) {
      return computed;
    }
    const total = dept.userCount ?? 0;
    const active = dept.activeUserCount ?? (dept.deletedUserCount !== undefined ? total - dept.deletedUserCount : total);
    const deleted = dept.deletedUserCount ?? Math.max(0, total - active);
    return { total, active, deleted };
  };

  const desMemberCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    users.forEach((u) => {
      const desId = Number(u.designationId ?? u.DesignationId);
      if (desId) {
        counts[desId] = (counts[desId] || 0) + 1;
      }
    });
    return counts;
  }, [users]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const [data, designations, usersData] = await Promise.all([
        departmentService.getOverview(),
        designationService.getDesignations(),
        userService.getUsers().catch(() => [] as User[]),
      ]);
      setOverview(data);
      setAllDesignations(Array.isArray(designations) ? designations : []);
      setUsers(Array.isArray(usersData) ? usersData : []);

      // Auto-expand all departments by default in tree view
      if (data.departments) {
        setExpandedDeptIds(data.departments.map((d) => d.id));
      }
    } catch (err: any) {
      console.error("Error loading departments overview:", err);
      showErrorAlert("Failed to Load Departments", err?.message || "Could not retrieve department data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedDeptIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const expandAll = () => {
    if (overview?.departments) {
      setExpandedDeptIds(overview.departments.map((d) => d.id));
    }
  };

  const collapseAll = () => {
    setExpandedDeptIds([]);
  };

  const handleCreateDepartment = () => {
    setEditingDepartment(null);
    setDepartmentModalOpen(true);
  };

  const handleEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setDepartmentModalOpen(true);
  };

  const handleMapDesignations = (dept: Department) => {
    setMappingDepartment(dept);
    setMappingModalOpen(true);
  };

  const handleOpenAssignModal = (desId?: number) => {
    setSelectedUnassignedDesId(desId ?? null);
    setAssignModalOpen(true);
  };

  const handleDeleteDepartment = async (dept: Department) => {
    const res = await showConfirmDialog(
      "Delete Department?",
      `Are you sure you want to deactivate "${dept.name}"? All mapped designations will be unassigned.`,
      "Delete",
      "Cancel",
      true
    );

    if (res.isConfirmed) {
      try {
        await departmentService.deleteDepartment(dept.id);
        showSuccessAlert("Department Deleted", `Department "${dept.name}" has been removed.`);
        fetchOverview();
      } catch (err: any) {
        console.error("Delete department error:", err);
        showErrorAlert("Delete Failed", err?.message || "Could not delete department.");
      }
    }
  };

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when search query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Filtered departments based on search query
  const filteredDepartments = useMemo(() => {
    if (!overview?.departments) return [];
    if (!searchQuery.trim()) return overview.departments;

    const q = searchQuery.toLowerCase().trim();
    return overview.departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q)) ||
        (d.designations && d.designations.some((des) => des.name.toLowerCase().includes(q)))
    );
  }, [overview, searchQuery]);

  const { sortKey, sortDirection, handleSort, sortedData: sortedDepartments } = useTableSort<Department>({
    data: filteredDepartments,
    initialSortKey: "id",
    initialDirection: "asc",
    getSortValue: (dept, key) => {
      switch (key) {
        case "id":
          return Number(dept.id);
        case "name":
          return (dept.name || "").toLowerCase();
        case "designations":
          return (dept.designations || []).length;
        case "members":
          return getDeptCounts(dept).total;
        default:
          return (dept as any)[key];
      }
    },
  });

  const paginatedDepartments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedDepartments.slice(start, start + pageSize);
  }, [sortedDepartments, page, pageSize]);

  const canCreate = can("departments.create") || can("departments.manage");
  const canEdit = can("departments.edit") || can("departments.manage");
  const canDelete = can("departments.delete") || can("departments.manage");

  return (
    <WorkspaceLayout
      permission="departments.view"
      label="Departments"
      icon="🏢"
      showHero={false}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search departments or designations..."
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 animate-fade-in pb-12">
        {/* Page Header */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={fetchOverview}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh departments"
          >
            <Refresh sx={{ fontSize: 16 }} />
            <span>Refresh</span>
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={handleCreateDepartment}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition-all cursor-pointer"
            >
              <Add sx={{ fontSize: 18 }} />
              <span>Add Department</span>
            </button>
          )}
        </div>

        {/* Top Metrics Cards */}
        {overview && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Departments"
              value={overview.totalDepartments}
              note="Active organizational units"
              icon={<CorporateFare sx={{ fontSize: 24 }} />}
              color="teal"
            />

            <MetricCard
              label="Mapped Designations"
              value={overview.mappedDesignations}
              sublabel={`/ ${overview.totalDesignations}`}
              note="Assigned job roles"
              icon={<AccountTreeOutlined sx={{ fontSize: 24 }} />}
              color="blue"
            />

            <MetricCard
              label="Coverage Rate"
              value={
                overview.totalDesignations > 0
                  ? `${Math.round((overview.mappedDesignations / overview.totalDesignations) * 100)}%`
                  : "100%"
              }
              note="Designations assigned"
              icon={<CheckCircle sx={{ fontSize: 24 }} />}
              color="emerald"
            />

            <MetricCard
              label="Unassigned Roles"
              value={overview.unassignedDesignations}
              note={
                overview.unassignedDesignations === 0
                  ? "All roles mapped"
                  : "Click to assign roles →"
              }
              icon={<WarningAmber sx={{ fontSize: 24 }} />}
              color="amber"
              onClick={overview.unassignedDesignations > 0 ? () => handleOpenAssignModal() : undefined}
              className={overview.unassignedDesignations > 0 ? "group ring-1 ring-amber-400/30 hover:border-amber-400" : ""}
            />
          </div>
        )}

        {/* Unassigned Warning Banner (if any) */}
        {overview && overview.unassignedList && overview.unassignedList.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
                <WarningAmber sx={{ fontSize: 20 }} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {overview.unassignedList.length} Unassigned Designation
                  {overview.unassignedList.length > 1 ? "s" : ""}
                </h4>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {overview.unassignedList.map((d) => (
                    <button
                      key={d.id ?? d.Id}
                      type="button"
                      onClick={() => handleOpenAssignModal(d.id ?? d.Id)}
                      className="group inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 shadow-2xs hover:bg-amber-100 hover:border-amber-400 transition-all cursor-pointer dark:border-amber-800 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-slate-800"
                      title={`Click to assign "${d.name}" to a department`}
                    >
                      <BadgeOutlined sx={{ fontSize: 13 }} className="text-amber-600 dark:text-amber-400" />
                      <span>{d.name}</span>
                      <span className="text-[10px] text-amber-500 font-bold group-hover:translate-x-0.5 transition-transform">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => handleOpenAssignModal()}
                className="flex items-center gap-1.5 shrink-0 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors cursor-pointer"
              >
                <AccountTree sx={{ fontSize: 15 }} />
                <span>Assign to Department</span>
              </button>
            )}
          </div>
        )}

        {/* Search, Filter & View Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="w-full sm:max-w-md">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search departments or designations..."
            />
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {viewMode === "tree" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Expand All
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            )}

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "tree"
                    ? "bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Hierarchy Tree View"
              >
                <AccountTree sx={{ fontSize: 15 }} />
                <span className="hidden sm:inline">Tree</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Department Cards View"
              >
                <GridViewOutlined sx={{ fontSize: 15 }} />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
                title="Table List View"
              >
                <TableRowsOutlined sx={{ fontSize: 15 }} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <LoadingSpinner message="Loading department hierarchy..." />
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-400 mb-3">
              <CorporateFare sx={{ fontSize: 26 }} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Departments Found</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
              {searchQuery
                ? `No departments or designations matched "${searchQuery}".`
                : "No active departments exist in the workspace."}
            </p>
            {canCreate && !searchQuery && (
              <button
                type="button"
                onClick={handleCreateDepartment}
                className="mt-4 flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition-all cursor-pointer"
              >
                <Add sx={{ fontSize: 18 }} />
                <span>Create Department</span>
              </button>
            )}
          </div>
        ) : viewMode === "tree" ? (
          /* ======================================================== */
          /* 1. HIERARCHY TREE VIEW                                    */
          /* ======================================================== */
          <div className="space-y-4">
            {filteredDepartments.map((dept) => {
              const isExpanded = expandedDeptIds.includes(dept.id);
              const designations = dept.designations || [];

              return (
                <div
                  key={dept.id}
                  className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 ${
                    isExpanded ? "ring-1 ring-teal-500/20" : ""
                  }`}
                >
                  {/* Department Node Header */}
                  <div
                    className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between transition-colors ${
                      isExpanded
                        ? "bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800"
                        : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <div
                      className="flex items-center gap-3 min-w-0 cursor-pointer select-none"
                      onClick={() => toggleExpand(dept.id)}
                    >
                      <button
                        type="button"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200/70 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
                      >
                        {isExpanded ? (
                          <ExpandMore sx={{ fontSize: 18 }} />
                        ) : (
                          <ChevronRight sx={{ fontSize: 18 }} />
                        )}
                      </button>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50 to-teal-100/50 text-teal-600 shadow-2xs dark:border-teal-800/60 dark:bg-teal-950/50 dark:text-teal-400">
                        <CorporateFare sx={{ fontSize: 22 }} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {dept.name}
                          </h3>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {designations.length} {designations.length === 1 ? "Role" : "Roles"}
                          </span>
                          {(() => {
                            const { total, active, deleted } = getDeptCounts(dept);
                            if (total === 0) return null;
                            return (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 inline-flex items-center gap-1">
                                <span>{total} {total === 1 ? "Member" : "Members"}</span>
                                {deleted > 0 && (
                                  <span className="font-semibold text-rose-600 dark:text-rose-400">({deleted} deleted)</span>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                        {dept.description && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                            {dept.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Department Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {can("permissions.manage") && (
                        <button
                          type="button"
                          onClick={() => navigate(`/permissions?scope=department&deptId=${dept.id}`)}
                          className="flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50/60 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/60 transition-colors cursor-pointer"
                          title="Configure department permissions"
                        >
                          <Key sx={{ fontSize: 15 }} />
                          <span className="hidden md:inline">Permissions</span>
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleMapDesignations(dept)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Assign or reassign designations"
                        >
                          <LinkOutlined sx={{ fontSize: 15 }} />
                          <span className="hidden md:inline">Map Roles</span>
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleEditDepartment(dept)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Edit department"
                        >
                          <EditOutlined sx={{ fontSize: 15 }} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(dept)}
                          className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 p-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
                          title="Delete department"
                        >
                          <DeleteOutline sx={{ fontSize: 15 }} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Tree Designation Branches */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-white dark:bg-slate-900">
                      {designations.length === 0 ? (
                        <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-xs text-slate-500 italic dark:border-slate-800 dark:bg-slate-950/50">
                          <span>No designations currently mapped under this department.</span>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleMapDesignations(dept)}
                              className="not-italic text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer"
                            >
                              + Map Designations
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="relative pl-3 sm:pl-6 space-y-2">
                          {/* Vertical Tree Trunk Line */}
                          <div className="absolute left-6 sm:left-9 top-2 bottom-6 w-0.5 bg-teal-200 dark:bg-teal-900/60" />

                          {designations.map((des, index) => {
                            const isLast = index === designations.length - 1;

                            return (
                              <div
                                key={des.id ?? des.Id ?? index}
                                className="relative flex items-center gap-3 group"
                              >
                                {/* Tree Branch Connector Graphic */}
                                <div className="flex items-center shrink-0 w-6">
                                  <span className="font-mono text-teal-500 dark:text-teal-400 text-sm">
                                    {isLast ? "└──" : "├──"}
                                  </span>
                                </div>

                                {/* Designation Card Node */}
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 hover:bg-teal-50/40 hover:border-teal-300 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-teal-800 dark:hover:bg-teal-950/20 transition-all">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300">
                                      <BadgeOutlined sx={{ fontSize: 16 }} />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                          {des.name}
                                        </span>
                                        {(() => {
                                          const desId = Number(des.id ?? des.Id ?? 0);
                                          const count = desMemberCounts[desId] ?? des.userCount ?? 0;
                                          if (count === 0) return null;
                                          return (
                                            <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700 border border-teal-200/60 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800">
                                              {count} {count === 1 ? "user" : "users"}
                                            </span>
                                          );
                                        })()}
                                      </div>
                                      {des.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                          {des.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : viewMode === "cards" ? (
          /* ======================================================== */
          /* 2. CARDS GRID VIEW                                        */
          /* ======================================================== */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDepartments.map((dept) => {
              const designations = dept.designations || [];
              const { total, active, deleted } = getDeptCounts(dept);

              return (
                <div
                  key={dept.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700 hover:bg-gradient-to-b hover:from-white hover:to-teal-50/20 dark:hover:from-slate-900 dark:hover:to-teal-950/20"
                >
                  <div>
                    {/* Top Bar / Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-500/10 via-teal-50 to-teal-100/50 text-teal-600 shadow-xs transition-transform duration-200 group-hover:scale-105 dark:border-teal-800/60 dark:from-teal-950/40 dark:via-teal-900/30 dark:to-teal-900/10 dark:text-teal-400">
                        <CorporateFare sx={{ fontSize: 24 }} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/70 bg-teal-50/80 px-2.5 py-0.5 text-[11px] font-bold text-teal-700 shadow-2xs dark:border-teal-900/60 dark:bg-teal-950/60 dark:text-teal-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                          {designations.length} {designations.length === 1 ? "Role" : "Roles"}
                        </span>
                      </div>
                    </div>

                    {/* Department Title & Description */}
                    <div className="mt-4">
                      <h3 className="text-lg font-bold text-slate-900 capitalize transition-colors group-hover:text-teal-600 dark:text-white dark:group-hover:text-teal-400">
                        {dept.name}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 min-h-[36px]">
                        {dept.description || "No specific description provided for this department."}
                      </p>
                    </div>

                    {/* Quick Stats Badges */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <div
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300 transition-colors"
                        title={`${total} member(s) in this department`}
                      >
                        <People sx={{ fontSize: 14 }} className="text-slate-500 dark:text-slate-400" />
                        <span>{total} {total === 1 ? "Member" : "Members"}</span>
                      </div>

                      {deleted > 0 && (
                        <span
                          className="inline-flex items-center rounded-lg border border-rose-200/80 bg-rose-50/80 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                          title={`${active} active, ${deleted} deactivated`}
                        >
                          {deleted} deactivated
                        </span>
                      )}

                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200/70 bg-teal-50/60 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300">
                        <AccountTree sx={{ fontSize: 14 }} />
                        <span>{designations.length} {designations.length === 1 ? "Designation" : "Designations"}</span>
                      </div>
                    </div>

                    {/* Designation Chips Section */}
                    <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Mapped Designations
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleMapDesignations(dept)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 cursor-pointer transition-colors"
                          >
                            <LinkOutlined sx={{ fontSize: 13 }} />
                            <span>+ Map</span>
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {designations.length === 0 ? (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                            No designations assigned yet
                          </span>
                        ) : (
                          designations.map((des) => {
                            const desId = Number(des.id ?? des.Id ?? 0);
                            const count = desMemberCounts[desId] ?? des.userCount ?? 0;
                            return (
                              <span
                                key={des.id ?? des.Id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/70 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-800 transition-colors dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-teal-800 dark:hover:bg-teal-950/30 dark:hover:text-teal-200"
                              >
                                <BadgeOutlined sx={{ fontSize: 12 }} className="text-teal-600 dark:text-teal-400" />
                                <span>{des.name}</span>
                                {count > 0 && (
                                  <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[9px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    {count}
                                  </span>
                                )}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                    <div>
                      {can("permissions.manage") ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/permissions?scope=department&deptId=${dept.id}`)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors cursor-pointer"
                          title="Configure department permissions"
                        >
                          <Key sx={{ fontSize: 14 }} />
                          <span>Permissions</span>
                          <ArrowForward sx={{ fontSize: 13 }} />
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Department Unit</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleMapDesignations(dept)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="Map designations"
                        >
                          <LinkOutlined sx={{ fontSize: 17 }} />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleEditDepartment(dept)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="Edit department"
                        >
                          <EditOutlined sx={{ fontSize: 17 }} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(dept)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete department"
                        >
                          <DeleteOutline sx={{ fontSize: 17 }} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ======================================================== */
          /* 3. TABLE LIST VIEW                                        */
          /* ======================================================== */
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <tr>
                    <SortableHeader sortKey="id" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="whitespace-nowrap">
                      #
                    </SortableHeader>
                    <SortableHeader sortKey="name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="whitespace-nowrap">
                      Department
                    </SortableHeader>
                    <SortableHeader sortKey="designations" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="whitespace-nowrap">
                      Mapped Designations
                    </SortableHeader>
                    <SortableHeader sortKey="members" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="whitespace-nowrap">
                      Members
                    </SortableHeader>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedDepartments.map((dept, index) => {
                    const designations = dept.designations || [];
                    const rowNum = (page - 1) * pageSize + index + 1;

                    return (
                      <tr key={dept.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                          #{rowNum}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {dept.name}
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">
                            {dept.description || "No description"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {designations.map((des) => (
                              <span
                                key={des.id ?? des.Id}
                                className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200/60 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800"
                              >
                                {des.name}
                              </span>
                            ))}
                            {designations.length === 0 && (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">
                          {(() => {
                            const { total, active, deleted } = getDeptCounts(dept);
                            if (total === 0) {
                              return <span className="font-normal text-slate-400 dark:text-slate-500">0</span>;
                            }
                            return (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {total}
                                </span>
                                {deleted > 0 && (
                                  <span
                                    className="inline-flex items-center rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
                                    title={`${active} active, ${deleted} deleted`}
                                  >
                                    {deleted} deleted
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {can("permissions.manage") && (
                              <button
                                type="button"
                                onClick={() => navigate(`/permissions?scope=department&deptId=${dept.id}`)}
                                className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-50 hover:text-teal-700 dark:text-teal-400 dark:hover:bg-teal-950/40 cursor-pointer"
                                title="Configure department permissions"
                              >
                                <Key sx={{ fontSize: 16 }} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleMapDesignations(dept)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                                title="Map designations"
                              >
                                <LinkOutlined sx={{ fontSize: 16 }} />
                              </button>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleEditDepartment(dept)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                                title="Edit department"
                              >
                                <EditOutlined sx={{ fontSize: 16 }} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDepartment(dept)}
                                className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30 cursor-pointer"
                                title="Delete department"
                              >
                                <DeleteOutline sx={{ fontSize: 16 }} />
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
              totalItems={filteredDepartments.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}

        {/* Modal Dialogs */}
        <DepartmentModal
          isOpen={departmentModalOpen}
          onClose={() => setDepartmentModalOpen(false)}
          department={editingDepartment}
          onSaved={fetchOverview}
        />

        <MapDesignationModal
          isOpen={mappingModalOpen}
          onClose={() => setMappingModalOpen(false)}
          department={mappingDepartment}
          allDesignations={allDesignations}
          onMapped={fetchOverview}
        />

        <AssignDesignationModal
          isOpen={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          unassignedDesignations={overview?.unassignedList || []}
          departments={overview?.departments || []}
          preSelectedDesignationId={selectedUnassignedDesId}
          onAssigned={fetchOverview}
          onCreateDepartmentClick={handleCreateDepartment}
        />
      </div>
    </WorkspaceLayout>
  );
};

