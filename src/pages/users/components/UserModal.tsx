import React, { useState, useEffect } from "react";
import { People, Close, Visibility, VisibilityOff } from "@mui/icons-material";
import type { Role, User, UserFormData, UserFormErrors } from "../../../types";

export interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: UserFormData, isEditing: boolean) => Promise<void>;
  editingUser: User | null;
  roles: Role[];
  saving: boolean;
}

const emptyForm: UserFormData = {
  name: "",
  email: "",
  password: "",
  phone: "",
  age: "",
  address: "",
  roleId: "",
};

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingUser,
  roles,
  saving,
}) => {
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name || editingUser.Name || "",
        email: editingUser.email || editingUser.Email || "",
        password: "",
        phone: editingUser.phone || editingUser.Phone || "",
        age: editingUser.age || editingUser.Age || "",
        address: editingUser.address || editingUser.Address || "",
        roleId: editingUser.roleId ?? editingUser.RoleId ?? "",
      });
    } else {
      setFormData(emptyForm);
    }
    setErrors({});
    setShowPassword(false);
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((curr) => ({ ...curr, [name]: value }));
    setErrors((curr) => ({ ...curr, [name]: "" }));
  };

  const validateForm = (): boolean => {
    const nextErrors: UserFormErrors = {};
    if (!formData.name.trim()) nextErrors.name = "Full name is required";
    else if (formData.name.trim().length < 3)
      nextErrors.name = "Name must be at least 3 characters";

    if (!formData.email.trim()) nextErrors.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      nextErrors.email = "Please enter a valid email address";

    if (!editingUser && !formData.password?.trim())
      nextErrors.password = "Password is required for new accounts";

    if (!formData.roleId) nextErrors.roleId = "Role selection is required";

    if (!formData.phone.trim()) nextErrors.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(formData.phone.trim()))
      nextErrors.phone = "Enter a valid 10-digit phone number";

    if (!formData.age) nextErrors.age = "Age is required";
    else if (Number(formData.age) < 18 || Number(formData.age) > 100)
      nextErrors.age = "Age must be between 18 and 100";

    if (!formData.address.trim()) nextErrors.address = "Address is required";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    await onSave(formData, Boolean(editingUser));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={() => !saving && onClose()}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <People sx={{ fontSize: 22 }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editingUser ? "Edit Member Account" : "Add New Directory Member"}
              </h2>
              <p className="text-xs text-slate-500">
                {editingUser
                  ? "Update profile details and role permissions."
                  : "Create a user account with role-based access."}
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
          <div className="px-6 py-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="name">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${
                  errors.name
                    ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                }`}
                placeholder="e.g. Maya Patel"
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="email">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${
                  errors.email
                    ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                }`}
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="password">
                {editingUser ? "Password (Leave blank to keep)" : "Password *"}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={`w-full rounded-xl border bg-white py-2 pl-3.5 pr-10 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${
                    errors.password
                      ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                  }`}
                  placeholder={editingUser ? "••••••••••••" : "Create password"}
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  onClick={() => setShowPassword((p) => !p)}
                >
                  {showPassword ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.password}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="roleId">
                Assigned Role <span className="text-rose-500">*</span>
              </label>
              <select
                id="roleId"
                name="roleId"
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                  errors.roleId
                    ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                }`}
                value={formData.roleId}
                onChange={handleChange}
              >
                <option value="">Select a Role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {errors.roleId && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.roleId}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="phone">
                Phone Number (10 Digits) <span className="text-rose-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                maxLength={10}
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${
                  errors.phone
                    ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                }`}
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange}
              />
              {errors.phone && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.phone}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="age">
                Age (18-100) <span className="text-rose-500">*</span>
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min={18}
                max={100}
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${
                  errors.age
                    ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                }`}
                placeholder="e.g. 28"
                value={formData.age}
                onChange={handleChange}
              />
              {errors.age && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.age}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="address">
                Physical / Work Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="address"
                name="address"
                rows={2}
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${
                  errors.address
                    ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                }`}
                placeholder="Enter street, city, state, postal code..."
                value={formData.address}
                onChange={handleChange}
              />
              {errors.address && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.address}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 rounded-b-2xl">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
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
              {saving ? "Saving Member..." : editingUser ? "Save Changes" : "Add User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
