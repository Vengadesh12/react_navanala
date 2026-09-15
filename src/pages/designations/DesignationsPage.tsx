import React, { useEffect, useState, useMemo } from "react";
import {
  BadgeOutlined,
  CorporateFare,
  People,
  Add,
  Search,
  EditOutlined,
  DeleteOutline,
  GridViewOutlined,
  TableRowsOutlined,
  Refresh,
  CheckCircle,
  WorkOutline,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { MetricCard } from "../../components/common/MetricCard";
import { SearchInput } from "../../components/common/SearchInput";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { EmptyState } from "../../components/common/EmptyState";
import { Pagination } from "../../components/common/Pagination";
import { SortableHeader } from "../../components/common/SortableHeader";
import { useTableSort } from "../../hooks/useTableSort";
import { DesignationModal } from "./components/DesignationModal";
import { designationService } from "../../api/designation.service";
import { departmentService } from "../../api/department.service";
import { userService } from "../../api/user.service";
import { useAuth } from "../../hooks/useAuth";
import {
  showConfirmDialog,
  showErrorAlert,
  showSuccessAlert,
} from "../../utils/alerts";
import type { Department, Designation, User } from "../../types";

export const DesignationsPage: React.FC = () => {
  const { can } = useAuth();
  const canCreate = can("designations.create") || can("designations.manage");
  const canEdit = can("designations.edit") || can("designations.manage");
  const canDelete = can("designations.delete") || can("designations.manage");

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [desRes, deptRes, userRes] = await Promise.allSettled([
        designationService.getDesignations(),
        departmentService.getDepartments(),
        userService.getUsers(),
      ]);

      if (desRes.status === "fulfilled" && Array.isArray(desRes.value)) {
        setDesignations(desRes.value);
      }
      if (deptRes.status === "fulfilled" && Array.isArray(deptRes.value)) {
        setDepartments(deptRes.value);
      }
      if (userRes.status === "fulfilled" && Array.isArray(userRes.value)) {
        setUsers(userRes.value);
      }
    } catch (err: any) {
      console.error("Error loading designations data:", err);
      showErrorAlert(
        "Failed to Load",
        err?.message || "Could not retrieve designations data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute live user counts per designation ID
  const designationMemberCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    users.forEach((u) => {
      const desId = Number(u.designationId ?? u.DesignationId);
      if (desId) {
        counts[desId] = (counts[desId] || 0) + 1;
      }
    });
    return counts;
  }, [users]);

  // Enriched designations list with resolved department names and user counts
  const enrichedDesignations = useMemo(() => {
    const deptMap = new Map<number, string>();
    departments.forEach((d) => {
      deptMap.set(d.id, d.name);
    });

    return designations.map((d) => {
      const desId = Number(d.id ?? d.Id ?? 0);
      const dDeptId = d.departmentId ?? d.DepartmentId;
      const deptIdNum = dDeptId ? Number(dDeptId) : null;
      const resolvedDeptName = deptIdNum ? deptMap.get(deptIdNum) ?? d.departmentName ?? d.DepartmentName ?? null : null;
      const memberCount = designationMemberCounts[desId] ?? d.userCount ?? 0;

      return {
        ...d,
        id: desId,
        name: d.name ?? d.Name ?? "",
        description: d.description ?? d.Description ?? "",
        departmentId: deptIdNum,
        departmentName: resolvedDeptName,
        userCount: memberCount,
      };
    });
  }, [designations, departments, designationMemberCounts]);

  // Filtered designations by search query and department filter
  const filteredDesignations = useMemo(() => {
    return enrichedDesignations.filter((d) => {
      // Department filter
      if (deptFilter === "unassigned") {
        if (d.departmentId !== null && d.departmentId !== undefined) return false;
      } else if (deptFilter !== "all") {
        if (String(d.departmentId) !== deptFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (d.name || "").toLowerCase().includes(q);
        const matchesDept = (d.departmentName || "").toLowerCase().includes(q);
        const matchesDesc = (d.description || "").toLowerCase().includes(q);
        return matchesName || matchesDept || matchesDesc;
      }

      return true;
    });
  }, [enrichedDesignations, deptFilter, searchQuery]);

  // Reset pagination to page 1 on filter or search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, deptFilter]);

  // Sorting
  const { sortKey, sortDirection, handleSort, sortedData } = useTableSort<Designation>({
    data: filteredDesignations,
    initialSortKey: "name",
    initialDirection: "asc",
  });

  // Paginated data
  const paginatedDesignations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  // Metric computations
  const metrics = useMemo(() => {
    const total = enrichedDesignations.length;
    const assignedDepts = new Set(
      enrichedDesignations.map((d) => d.departmentId).filter(Boolean)
    ).size;
    const totalAssignedUsers = Object.values(designationMemberCounts).reduce(
      (acc, count) => acc + count,
      0
    );

    return {
      total,
      assignedDepts,
      totalAssignedUsers,
    };
  }, [enrichedDesignations, designationMemberCounts]);

  // Actions
  const handleOpenAdd = () => {
    setEditingDesignation(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (des: Designation) => {
    setEditingDesignation(des);
    setModalOpen(true);
  };

  const handleDelete = async (des: Designation) => {
    const desId = des.id ?? des.Id;
    if (!desId) return;

    const assignedCount = des.userCount ?? 0;
    const warningText =
      assignedCount > 0
        ? `"${des.name}" currently has ${assignedCount} assigned member(s). Deleting it will remove the title link for these users.`
        : `Are you sure you want to delete "${des.name}"? This action can be reversed by an administrator.`;

    const confirm = await showConfirmDialog(
      "Delete Designation",
      warningText,
      "Delete Designation",
      "Cancel",
      true
    );

    if (confirm.isConfirmed) {
      try {
        await designationService.deleteDesignation(desId);
        showSuccessAlert(
          "Designation Deleted",
          `Designation "${des.name}" was successfully removed.`
        );
        fetchData();
      } catch (err: any) {
        console.error("Delete designation error:", err);
        showErrorAlert(
          "Delete Failed",
          err?.response?.data?.message || err?.message || "Could not delete designation."
        );
      }
    }
  };

  return (
    <WorkspaceLayout
      permission="designations.view"
      label="Designations"
      icon="💼"
      showHero={false}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search designations by title, department, or description..."
      showSearchBar={true}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 animate-fade-in pb-12">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Designations"
            value={metrics.total}
            note="Configured workspace job titles"
            icon={<BadgeOutlined sx={{ fontSize: 22 }} />}
            color="blue"
          />
          <MetricCard
            label="Active Titles"
            value={metrics.total}
            note="Ready for user profile assignment"
            icon={<CheckCircle sx={{ fontSize: 22 }} />}
            color="emerald"
          />
          <MetricCard
            label="Linked Departments"
            value={metrics.assignedDepts}
            note="Departments with defined roles"
            icon={<CorporateFare sx={{ fontSize: 22 }} />}
            color="teal"
          />
          <MetricCard
            label="Assigned Members"
            value={metrics.totalAssignedUsers}
            note="Employees with designations"
            icon={<People sx={{ fontSize: 22 }} />}
            color="purple"
          />
        </div>

        {/* Action & Filter Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-3">
            {/* Inline search */}
            <div className="w-64 sm:w-72">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Filter by title..."
              />
            </div>

            {/* Department Dropdown Filter */}
            <div className="flex items-center gap-2">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:focus:border-blue-400"
              >
                <option value="all">All Departments</option>
                <option value="unassigned">Unassigned (No Dept)</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
                title="Table view"
              >
                <TableRowsOutlined sx={{ fontSize: 16 }} />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "cards"
                    ? "bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-400"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
                title="Grid view"
              >
                <GridViewOutlined sx={{ fontSize: 16 }} />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-hidden disabled:opacity-50 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Refresh designations"
            >
              <Refresh
                sx={{
                  fontSize: 16,
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                }}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Add Designation Button */}
            {canCreate && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-hidden focus:ring-3 focus:ring-blue-500/30 transition-all cursor-pointer"
              >
                <Add sx={{ fontSize: 18 }} />
                <span>Add Designation</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <LoadingSpinner message="Loading designations..." />
          </div>
        ) : filteredDesignations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <EmptyState
              icon={<BadgeOutlined sx={{ fontSize: 44, color: "#3b82f6" }} />}
              title="No Designations Found"
              description={
                searchQuery || deptFilter !== "all"
                  ? "No designations match your active filter criteria. Try adjusting the search or department filter."
                  : "No designations have been defined in this workspace yet."
              }
              actionText={canCreate ? "Create First Designation" : undefined}
              onAction={canCreate ? handleOpenAdd : undefined}
            />
          </div>
        ) : viewMode === "table" ? (
          /* Table View */
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/50 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <SortableHeader
                      sortKey="name"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Designation Title
                    </SortableHeader>
                    <SortableHeader
                      sortKey="departmentName"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Department
                    </SortableHeader>
                    <SortableHeader
                      sortKey="userCount"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    >
                      Assigned Members
                    </SortableHeader>
                    <th className="px-5 py-3.5 font-bold uppercase tracking-wider text-[11px]">Description</th>
                    <th className="px-5 py-3.5 text-center font-bold uppercase tracking-wider text-[11px]">Status</th>
                    {(canEdit || canDelete) && (
                      <th className="px-5 py-3.5 text-right font-bold uppercase tracking-wider text-[11px]">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedDesignations.map((des) => (
                    <tr
                      key={des.id}
                      className="group transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                    >
                      {/* Title */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                            <BadgeOutlined sx={{ fontSize: 18 }} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {des.name}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">
                              ID: #{des.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-5 py-4">
                        {des.departmentName ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300">
                            <CorporateFare sx={{ fontSize: 13 }} />
                            <span>{des.departmentName}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Assigned Members */}
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                          <People sx={{ fontSize: 14 }} />
                          <span>{des.userCount ?? 0}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-5 py-4 max-w-xs truncate text-xs text-slate-500 dark:text-slate-400">
                        {des.description || "—"}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>

                      {/* Actions */}
                      {(canEdit || canDelete) && (
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(des)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-blue-400 cursor-pointer"
                                title="Edit designation"
                              >
                                <EditOutlined sx={{ fontSize: 17 }} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(des)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors dark:hover:bg-rose-950/50 dark:hover:text-rose-400 cursor-pointer"
                                title="Delete designation"
                              >
                                <DeleteOutline sx={{ fontSize: 17 }} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            <div className="border-t border-slate-200/80 px-4 py-3 dark:border-slate-800">
              <Pagination
                currentPage={page}
                totalItems={filteredDesignations.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        ) : (
          /* Cards Grid View */
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedDesignations.map((des) => (
                <div
                  key={des.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-md hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                          <BadgeOutlined sx={{ fontSize: 22 }} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white leading-tight">
                            {des.name}
                          </h3>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            ID: #{des.id}
                          </span>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                        Active
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {des.departmentName ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300">
                          <CorporateFare sx={{ fontSize: 13 }} />
                          <span>{des.departmentName}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                          Unassigned
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
                        <People sx={{ fontSize: 13 }} />
                        <span>{des.userCount ?? 0} members</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {des.description || "No description provided."}
                    </p>
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(des)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <EditOutlined sx={{ fontSize: 14 }} />
                          <span>Edit</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(des)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <DeleteOutline sx={{ fontSize: 14 }} />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Grid Pagination */}
            <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Pagination
                currentPage={page}
                totalItems={filteredDesignations.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </div>
        )}

        {/* Modal */}
        <DesignationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          designation={editingDesignation}
          departments={departments}
          onSaved={fetchData}
        />
      </div>
    </WorkspaceLayout>
  );
};
