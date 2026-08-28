import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Close,
  AccountTreeOutlined,
  CheckCircle,
  CorporateFare,
  BadgeOutlined,
  Add,
  WarningAmber,
} from "@mui/icons-material";
import { departmentService } from "../../../api/department.service";
import { showSuccessAlert, showErrorAlert } from "../../../utils/alerts";
import type { Department, Designation } from "../../../types";

export interface AssignDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  unassignedDesignations: Designation[];
  departments: Department[];
  preSelectedDesignationId?: number | null;
  onAssigned: () => void;
  onCreateDepartmentClick?: () => void;
}

export const AssignDesignationModal: React.FC<AssignDesignationModalProps> = ({
  isOpen,
  onClose,
  unassignedDesignations,
  departments,
  preSelectedDesignationId,
  onAssigned,
  onCreateDepartmentClick,
}) => {
  const [selectedDesignationIds, setSelectedDesignationIds] = useState<number[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (preSelectedDesignationId) {
        setSelectedDesignationIds([preSelectedDesignationId]);
      } else {
        // Preselect all unassigned designations by default for convenience
        setSelectedDesignationIds(
          unassignedDesignations.map((d) => d.id ?? d.Id ?? 0).filter(Boolean)
        );
      }

      // Default select the first active department if available
      if (departments.length > 0) {
        setSelectedDepartmentId(departments[0].id);
      } else {
        setSelectedDepartmentId("");
      }

      setSearch("");
      setError("");
    }
  }, [isOpen, unassignedDesignations, departments, preSelectedDesignationId]);

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

  if (!isOpen) return null;

  const filteredDesignations = unassignedDesignations.filter((d) =>
    (d.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleDesignation = (id: number) => {
    setSelectedDesignationIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedDesignationIds(
      unassignedDesignations.map((d) => d.id ?? d.Id ?? 0).filter(Boolean)
    );
  };

  const clearAll = () => {
    setSelectedDesignationIds([]);
  };

  const selectedDepartment = departments.find((d) => d.id === selectedDepartmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDesignationIds.length === 0) {
      setError("Please select at least one designation to assign.");
      return;
    }

    if (!selectedDepartmentId) {
      setError("Please select a target department.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await departmentService.mapDesignations(
        selectedDepartmentId,
        selectedDesignationIds
      );

      const targetDeptName = selectedDepartment?.name || "the department";
      const count = selectedDesignationIds.length;
      const desNames = unassignedDesignations
        .filter((d) => selectedDesignationIds.includes(d.id ?? d.Id ?? 0))
        .map((d) => d.name)
        .join(", ");

      showSuccessAlert(
        "Designation Assigned Successfully",
        `Successfully assigned ${count === 1 ? `"${desNames}"` : `${count} designations (${desNames})`} to ${targetDeptName}.`
      );

      onAssigned();
      onClose();
    } catch (err: any) {
      console.error("Assign Designation Error:", err);
      const msg = err?.message || "Failed to assign designation to department.";
      setError(msg);
      showErrorAlert("Assignment Failed", msg);
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
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-slate-200 animate-scale-in dark:bg-slate-900 dark:text-white dark:ring-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <AccountTreeOutlined sx={{ fontSize: 22 }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Assign Designations to Department
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Map unassigned organizational job titles under an active department
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
              <WarningAmber sx={{ fontSize: 16 }} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Target Department Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Department <span className="text-rose-500">*</span>
              </label>
              {onCreateDepartmentClick && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateDepartmentClick();
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer"
                >
                  <Add sx={{ fontSize: 14 }} />
                  <span>New Department</span>
                </button>
              )}
            </div>

            {departments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500 dark:border-slate-800">
                No active departments found. Please create a department first.
              </div>
            ) : (
              <select
                value={selectedDepartmentId}
                onChange={(e) => {
                  setSelectedDepartmentId(Number(e.target.value));
                  if (error) setError("");
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                required
              >
                <option value="" disabled>
                  Select target department...
                </option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({(dept.designations || []).length} existing roles, {dept.userCount || 0} members)
                  </option>
                ))}
              </select>
            )}

            {selectedDepartment && (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200/70 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-300">
                <CorporateFare sx={{ fontSize: 18 }} className="text-teal-600 dark:text-teal-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {selectedDepartment.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {selectedDepartment.description || "No description provided"}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Select Unassigned Designations */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Designation(s) to Assign <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedDesignationIds.length} of {unassignedDesignations.length} unassigned selected
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
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

            {unassignedDesignations.length > 4 && (
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search unassigned designations..."
                className="w-full mb-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            )}

            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2 space-y-1.5 dark:border-slate-800 dark:bg-slate-950/50">
              {filteredDesignations.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  {search ? "No matching unassigned designations found." : "No unassigned designations available."}
                </p>
              ) : (
                filteredDesignations.map((des) => {
                  const desId = des.id ?? des.Id ?? 0;
                  const isSelected = selectedDesignationIds.includes(desId);

                  return (
                    <div
                      key={desId}
                      onClick={() => toggleDesignation(desId)}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-teal-500/10 border border-teal-500/30 text-teal-950 dark:text-teal-200"
                          : "hover:bg-slate-100 border border-transparent text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            isSelected
                              ? "border-teal-600 bg-teal-600 text-white"
                              : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                          }`}
                        >
                          {isSelected && <CheckCircle sx={{ fontSize: 13 }} />}
                        </div>
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                          <BadgeOutlined sx={{ fontSize: 14 }} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {des.name}
                          </div>
                          {des.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {des.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        Unassigned
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-medium">
              {selectedDesignationIds.length} to be assigned
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
                disabled={loading || selectedDesignationIds.length === 0 || !selectedDepartmentId}
                className="rounded-xl bg-teal-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? "Assigning..." : "Assign to Department"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
