import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CategoryOutlined,
  Close,
  Check,
  ErrorOutline,
} from "@mui/icons-material";
import { reportService } from "../../../api/report.service";
import type { ReportCategory } from "../../../types";
import { showSuccessToast, showErrorToast } from "../../../utils/alerts";

export interface CreateReportCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newCategory: ReportCategory) => void;
}

export const CreateReportCategoryModal: React.FC<CreateReportCategoryModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (saving) return;
    setName("");
    setDescription("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }
    if (trimmedName.length < 2) {
      setError("Category name must be at least 2 characters.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await reportService.createCategory({
        name: trimmedName,
        description: description.trim(),
      });

      const createdItem = res.data;
      showSuccessToast(`Report category "${createdItem.name || trimmedName}" created successfully!`);
      setName("");
      setDescription("");
      onCreated(createdItem);
      onClose();
    } catch (err: any) {
      console.error("Create Report Category Error:", err);
      const msg = err?.message || "Failed to create report category. Please try again.";
      setError(msg);
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-scale-up space-y-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <CategoryOutlined sx={{ fontSize: 22 }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Report Category</h3>
              <p className="text-xs text-slate-500">Define a new compliance & audit classification</p>
            </div>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
            onClick={handleClose}
            disabled={saving}
          >
            <Close sx={{ fontSize: 20 }} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <ErrorOutline sx={{ fontSize: 16 }} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="reportCategoryNameInput">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="reportCategoryNameInput"
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="e.g. Identity Management, Billing Audit"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="reportCategoryDescInput">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="reportCategoryDescInput"
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              placeholder="Brief description of this report classification..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check sx={{ fontSize: 16 }} />
                  <span>Save Category</span>
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
