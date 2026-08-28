import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Close,
  AccountTreeOutlined,
  CheckCircle,
  BadgeOutlined,
  WarningAmber,
} from "@mui/icons-material";
import { departmentService } from "../../../api/department.service";
import { showSuccessAlert, showErrorAlert } from "../../../utils/alerts";
import type { Department, Designation } from "../../../types";

export interface MapDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
  allDesignations: Designation[];
  onMapped: () => void;
}

export const MapDesignationModal: React.FC<MapDesignationModalProps> = ({
  isOpen,
  onClose,
  department,
  allDesignations,
  onMapped,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unassigned" | "assigned">("all");

  useEffect(() => {
    if (isOpen && department) {
      const currentIds = department.designations
        ? department.designations.map((d) => d.id ?? d.Id ?? 0).filter(Boolean)
        : [];
      setSelectedIds(currentIds);
      setSearch("");
      setFilterMode("all");
    }
  }, [isOpen, department]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const filteredDesignations = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allDesignations.filter((d) => {
      const matchesSearch =
        !q ||
        (d.name || "").toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const isUnassigned = !d.departmentId && !d.departmentName;
      const isCurrentDept = d.departmentId === department?.id;

      if (filterMode === "unassigned") return isUnassigned;
      if (filterMode === "assigned") return isCurrentDept;
      return true;
    });
  }, [allDesignations, search, filterMode, department]);

  if (!isOpen || !department) return null;

  const toggle = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    const idsToAdd = filteredDesignations.map((d) => d.id ?? d.Id ?? 0).filter(Boolean);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const unassignedCount = allDesignations.filter(
    (d) => !d.departmentId && !d.departmentName
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await departmentService.updateDepartment(department.id, {
        name: department.name,
        description: department.description || "",
        designationIds: selectedIds,
      });

      showSuccessAlert(
        "Designations Mapped Successfully",
        `Updated designation mappings for "${department.name}" (${selectedIds.length} roles mapped).`
      );
      onMapped();
      onClose();
    } catch (err: any) {
      console.error("Mapping Error:", err);
      showErrorAlert("Mapping Failed", err?.message || "Failed to update designations.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-slate-200 animate-scale-in dark:bg-slate-900 dark:text-white dark:ring-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
              <AccountTreeOutlined sx={{ fontSize: 22 }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Map Roles to {department.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Check job designations to associate them under this department
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <Close sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {/* Search & Filter Tabs */}
          <div className="space-y-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search designations to map..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                    filterMode === "all"
                      ? "bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  All ({allDesignations.length})
                </button>
                {unassignedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterMode("unassigned")}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                      filterMode === "unassigned"
                        ? "bg-amber-100 text-amber-900 shadow-xs dark:bg-amber-950 dark:text-amber-300"
                        : "text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                    }`}
                  >
                    <WarningAmber sx={{ fontSize: 13 }} />
                    <span>Unassigned ({unassignedCount})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFilterMode("assigned")}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                    filterMode === "assigned"
                      ? "bg-white text-teal-700 shadow-xs dark:bg-slate-900 dark:text-teal-400"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  In {department.name} ({selectedIds.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-[11px] font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* List of Designations */}
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 space-y-1.5 dark:border-slate-800 dark:bg-slate-950/50">
            {filteredDesignations.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                No matching designations found.
              </p>
            ) : (
              filteredDesignations.map((des) => {
                const desId = des.id ?? des.Id ?? 0;
                const isSelected = selectedIds.includes(desId);
                const isUnassigned = !des.departmentId && !des.departmentName;
                const otherDept =
                  !isUnassigned &&
                  des.departmentName &&
                  des.departmentName !== department.name;

                return (
                  <div
                    key={desId}
                    onClick={() => toggle(desId)}
                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-teal-500/10 border border-teal-500/30 text-teal-950 dark:text-teal-200"
                        : isUnassigned
                        ? "bg-amber-50/70 border border-amber-200/60 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:border-amber-900/30 dark:hover:bg-amber-950/40"
                        : "hover:bg-slate-100 border border-transparent text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          isSelected
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                        }`}
                      >
                        {isSelected && <CheckCircle sx={{ fontSize: 13 }} />}
                      </div>

                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                          isUnassigned
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300"
                        }`}
                      >
                        <BadgeOutlined sx={{ fontSize: 14 }} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {des.name}
                          </span>
                          {isUnassigned && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                              Unassigned
                            </span>
                          )}
                        </div>
                        {des.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {des.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {otherDept && (
                      <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        In {des.departmentName}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-medium">
              {selectedIds.length} designations mapped to {department.name}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? "Saving..." : "Save Mapping"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
