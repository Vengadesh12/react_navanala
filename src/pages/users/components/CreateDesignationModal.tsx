import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  WorkOutline,
  Close,
  Check,
  ErrorOutline,
} from "@mui/icons-material";
import { designationService } from "../../../api/designation.service";
import type { Designation } from "../../../types";
import { showSuccessToast, showErrorToast } from "../../../utils/alerts";

export interface CreateDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newDesignation: Designation) => void;
}

export const CreateDesignationModal: React.FC<CreateDesignationModalProps> = ({
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
      setError("Designation title is required.");
      return;
    }
    if (trimmedName.length < 2) {
      setError("Designation title must be at least 2 characters.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await designationService.createDesignation({
        name: trimmedName,
        description: description.trim(),
      });

      const createdItem = res.data;
      showSuccessToast(`Designation "${createdItem.name || trimmedName}" created successfully!`);
      setName("");
      setDescription("");
      onCreated(createdItem);
      onClose();
    } catch (err: any) {
      console.error("Create Designation Error:", err);
      const msg = err?.message || "Failed to create designation. Please try again.";
      setError(msg);
      showErrorToast(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl ring-1 ring-slate-200 animate-scale-up space-y-5 dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-800 dark:text-white"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <WorkOutline sx={{ fontSize: 22 }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Designation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Define a new organizational job title</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            onClick={handleClose}
            disabled={saving}
          >
            <Close sx={{ fontSize: 20 }} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400">
            <ErrorOutline sx={{ fontSize: 16 }} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="designationNameInput">
              Designation Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="designationNameInput"
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 shadow-2xs transition-all focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              placeholder="e.g. Lead Cloud Architect"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError("");
              }}
              autoFocus
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300" htmlFor="designationDescInput">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="designationDescInput"
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 shadow-2xs transition-all focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              placeholder="Brief summary of duties and responsibilities..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check sx={{ fontSize: 16 }} />
                  <span>Save Designation</span>
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
