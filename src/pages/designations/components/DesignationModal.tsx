import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Close,
  BadgeOutlined,
  CorporateFare,
  CheckCircle,
  ErrorOutline,
} from "@mui/icons-material";
import { designationService } from "../../../api/designation.service";
import { showSuccessAlert, showErrorAlert } from "../../../utils/alerts";
import type { Department, Designation } from "../../../types";

export interface DesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  designation?: Designation | null;
  departments: Department[];
  onSaved: () => void;
}

export const DesignationModal: React.FC<DesignationModalProps> = ({
  isOpen,
  onClose,
  designation,
  departments,
  onSaved,
}) => {
  const isEditing = Boolean(designation);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setName(designation?.name ?? designation?.Name ?? "");
      const deptId = designation?.departmentId ?? designation?.DepartmentId;
      setDepartmentId(deptId ? String(deptId) : "");
      setDescription(designation?.description ?? designation?.Description ?? "");
      setError("");
    }
  }, [isOpen, designation]);

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

  const handleClose = () => {
    if (loading) return;
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Designation title is required.");
      return;
    }
    if (trimmedName.length < 2) {
      setError("Designation title must be at least 2 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const parsedDeptId = departmentId.trim() ? Number(departmentId) : null;

    try {
      if (isEditing && designation) {
        const id = designation.id ?? designation.Id;
        await designationService.updateDesignation(id!, {
          name: trimmedName,
          description: description.trim(),
          departmentId: parsedDeptId,
        });
        showSuccessAlert(
          "Designation Updated",
          `Designation "${trimmedName}" was successfully updated.`
        );
      } else {
        await designationService.createDesignation({
          name: trimmedName,
          description: description.trim(),
          departmentId: parsedDeptId,
        });
        showSuccessAlert(
          "Designation Created",
          `Designation "${trimmedName}" was successfully created.`
        );
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error("Designation save error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "An unexpected error occurred while saving the designation.";
      setError(msg);
      showErrorAlert("Save Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl ring-1 ring-slate-200 animate-scale-up space-y-6 dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800 dark:text-white"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <BadgeOutlined sx={{ fontSize: 24 }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? "Edit Designation" : "Create Designation"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEditing
                  ? "Update designation details and department alignment"
                  : "Add a new designation job title to the workspace"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close modal"
          >
            <Close sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 animate-shake">
            <ErrorOutline sx={{ fontSize: 18, marginTop: "2px" }} />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Designation Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Designation Title <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                disabled={loading}
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-blue-500/20 transition-all dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-800"
              />
            </div>
          </div>

          {/* Department Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Associated Department <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
            </label>
            <div className="relative">
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-blue-500/20 transition-all dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-400 dark:focus:bg-slate-800"
              >
                <option value="">-- No Department Assigned (Unassigned) --</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Assigning a department helps structure teams and automatic permission inheritance.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Description <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of role responsibilities, scope, or level..."
              rows={3}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-blue-500/20 transition-all dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-800 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-hidden focus:ring-3 focus:ring-blue-500/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle sx={{ fontSize: 18 }} />
                  <span>{isEditing ? "Save Changes" : "Create Designation"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
