import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Shield, Close, Key } from "@mui/icons-material";
import type { Role, RoleFormData } from "../../../types";

export interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: RoleFormData, isEditing: boolean) => Promise<void>;
  editingRole: Role | null;
  saving: boolean;
}

const emptyRole: RoleFormData = { name: "", description: "" };

export const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRole,
  saving,
}) => {
  const [formData, setFormData] = useState<RoleFormData>(emptyRole);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (editingRole) {
      setFormData({
        name: editingRole.name || "",
        description: editingRole.description || "",
      });
    } else {
      setFormData(emptyRole);
    }
    setFormError("");
  }, [editingRole, isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Role name is required.");
      return;
    }
    setFormError("");
    await onSave(formData, Boolean(editingRole));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={() => !saving && onClose()}
      role="presentation"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Shield sx={{ fontSize: 22 }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingRole ? "Edit Role Details" : "Create New Role"}
              </h2>
              <p className="text-xs text-slate-500">
                {editingRole
                  ? `Modify settings for role #${editingRole.id}`
                  : "Define a new access tier for your organization."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
            onClick={() => !saving && onClose()}
          >
            <Close sx={{ fontSize: 20 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {formError && (
              <div className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {formError}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="roleName">
                Role Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="roleName"
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="e.g. Compliance Officer, Regional Lead, Auditor"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="roleDesc">
                Description & Scope
              </label>
              <textarea
                id="roleDesc"
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Explain the scope and responsibilities associated with this role..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs text-indigo-900">
              <div className="flex items-center gap-2 font-bold text-indigo-800">
                <Key sx={{ fontSize: 16 }} />
                <span>Permission Assignment Note</span>
              </div>
              <p className="mt-1 text-[11px] text-indigo-700">
                After creating this role, configure its specific module capabilities in the{" "}
                <strong>Permission Matrix</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 rounded-b-2xl">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving Role..." : editingRole ? "Save Changes" : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
