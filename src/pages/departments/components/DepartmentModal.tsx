import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Close, CorporateFare, CheckCircle } from "@mui/icons-material";
import { departmentService } from "../../../api/department.service";
import { designationService } from "../../../api/designation.service";
import { showSuccessAlert, showErrorAlert } from "../../../utils/alerts";
import type { Department, Designation } from "../../../types";

export interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: Department | null;
  onSaved: () => void;
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  department,
  onSaved,
}) => {
  const isEditing = Boolean(department);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDesignationIds, setSelectedDesignationIds] = useState<number[]>([]);
  const [allDesignations, setAllDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(department?.name || "");
      setDescription(department?.description || "");
      
      const mappedIds = department?.designations
        ? department.designations.map((d) => d.id ?? d.Id ?? 0).filter(Boolean)
        : [];
      setSelectedDesignationIds(mappedIds);
      setError("");

      // Fetch all active designations so user can select/reassign
      designationService
        .getDesignations()
        .then((res) => {
          setAllDesignations(Array.isArray(res) ? res : []);
        })
        .catch((err) => console.error("Error loading designations:", err));
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

  if (!isOpen) return null;

  const toggleDesignation = (id: number) => {
    setSelectedDesignationIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedDesignationIds(allDesignations.map((d) => d.id ?? d.Id ?? 0));
  };

  const clearAll = () => {
    setSelectedDesignationIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Department name is required.");
      return;
    }
    if (trimmedName.length < 2) {
      setError("Department name must be at least 2 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isEditing && department) {
        await departmentService.updateDepartment(department.id, {
          name: trimmedName,
          description: description.trim(),
          designationIds: selectedDesignationIds,
        });
        showSuccessAlert(
          "Department Updated",
          `Department "${trimmedName}" and mapped designations saved successfully.`
        );
      } else {
        await departmentService.createDepartment({
          name: trimmedName,
          description: description.trim(),
          designationIds: selectedDesignationIds,
        });
        showSuccessAlert(
          "Department Created",
          `Department "${trimmedName}" created and designations mapped successfully.`
        );
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Save Department Error:", err);
      const msg = err?.message || "Failed to save department. Please try again.";
      setError(msg);
      showErrorAlert("Operation Failed", msg);
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
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
              <CorporateFare sx={{ fontSize: 22 }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? "Edit Department" : "Create New Department"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? "Update department parameters and map organizational designations"
                  : "Define a workspace department and assign designations"}
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

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
              {error}
            </div>
          )}

          {/* Department Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Department Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Software Development"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description <span className="text-[10px] text-slate-400">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of department scope and team responsibilities..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Mapped Designations Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Map Designations
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select designations that belong under this department ({selectedDesignationIds.length} selected)
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

            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 space-y-1.5 dark:border-slate-800 dark:bg-slate-950/50">
              {allDesignations.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-3">No designations available.</p>
              ) : (
                allDesignations.map((des) => {
                  const desId = des.id ?? des.Id ?? 0;
                  const isSelected = selectedDesignationIds.includes(desId);
                  const isCurrentDept = des.departmentId === department?.id;
                  const isUnassigned = !des.departmentId && !des.departmentName;
                  const otherDept = !isCurrentDept && !isUnassigned && des.departmentName;

                  return (
                    <div
                      key={desId}
                      onClick={() => toggleDesignation(desId)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-teal-500/10 border border-teal-500/30 text-teal-900 dark:text-teal-200"
                          : isUnassigned
                          ? "bg-amber-50/70 border border-amber-200/60 hover:bg-amber-100/60 dark:bg-amber-950/20 dark:border-amber-900/30"
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
                        <span className="font-medium truncate">{des.name}</span>
                      </div>
                      {isUnassigned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Unassigned
                        </span>
                      )}
                      {otherDept && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Currently in: {des.departmentName}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
              {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
