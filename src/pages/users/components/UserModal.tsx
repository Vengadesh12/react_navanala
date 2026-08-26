import React, { useState, useEffect } from "react";
import {
  People,
  Close,
  Visibility,
  VisibilityOff,
  Check,
  ErrorOutline,
  Add,
} from "@mui/icons-material";
import { authService } from "../../../api/auth.service";
import { designationService } from "../../../api/designation.service";
import { CreateDesignationModal } from "./CreateDesignationModal";
import type {
  Role,
  Designation,
  User,
  UserFormData,
  UserFormErrors,
  PasswordEvaluationResult,
} from "../../../types";

export interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: UserFormData, isEditing: boolean) => Promise<void>;
  editingUser: User | null;
  roles: Role[];
  designations?: Designation[];
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
  designationId: "",
};

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingUser,
  roles,
  designations = [],
  saving,
}) => {
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [availableDesignations, setAvailableDesignations] = useState<Designation[]>(designations);
  const [isCreateDesignationOpen, setIsCreateDesignationOpen] = useState(false);

  // Real-time Password Evaluation State
  const [passwordEval, setPasswordEval] = useState<PasswordEvaluationResult | null>(null);
  const [isValidatingPassword, setIsValidatingPassword] = useState(false);

  useEffect(() => {
    if (designations && designations.length > 0) {
      setAvailableDesignations(designations);
    } else if (isOpen) {
      designationService
        .getDesignations()
        .then((data) => {
          if (Array.isArray(data)) setAvailableDesignations(data);
        })
        .catch((err) => {
          console.error("Failed to load designations in UserModal:", err);
        });
    }
  }, [designations, isOpen]);

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
        designationId: editingUser.designationId ?? editingUser.DesignationId ?? "",
      });
    } else {
      setFormData(emptyForm);
    }
    setErrors({});
    setShowPassword(false);
    setPasswordEval(null);
    setIsValidatingPassword(false);
  }, [editingUser, isOpen]);

  // Debounced API call to evaluate password complexity in real-time
  useEffect(() => {
    const password = formData.password;
    if (!password) {
      setPasswordEval(null);
      setIsValidatingPassword(false);
      return;
    }

    setIsValidatingPassword(true);
    const timer = setTimeout(async () => {
      try {
        const result = await authService.evaluatePassword(password);
        setPasswordEval(result);
      } catch (error) {
        console.error("Backend password evaluation error in UserModal:", error);
      } finally {
        setIsValidatingPassword(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [formData.password]);

  if (!isOpen) return null;

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((curr) => ({ ...curr, [name]: value }));
    setErrors((curr) => ({ ...curr, [name]: "" }));
  };

  const isClientStrong = (pwd: string) => {
    return (
      pwd.length >= 8 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pwd)
    );
  };

  const validateForm = (): boolean => {
    const nextErrors: UserFormErrors = {};
    if (!formData.name.trim()) nextErrors.name = "Full name is required";
    else if (formData.name.trim().length < 3)
      nextErrors.name = "Name must be at least 3 characters";

    if (!formData.email.trim()) nextErrors.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      nextErrors.email = "Please enter a valid email address";

    if (!formData.roleId) nextErrors.roleId = "Role selection is required";
    if (!formData.designationId) nextErrors.designationId = "Designation selection is required";

    if (!formData.phone.trim()) nextErrors.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(formData.phone.trim()))
      nextErrors.phone = "Enter a valid 10-digit phone number";

    if (!formData.age) nextErrors.age = "Age is required";
    else if (Number(formData.age) < 18 || Number(formData.age) > 100)
      nextErrors.age = "Age must be between 18 and 100";

    if (!formData.address.trim()) nextErrors.address = "Address is required";

    if (!editingUser) {
      if (!formData.password?.trim()) {
        nextErrors.password = "Password is required for new accounts";
      } else if (passwordEval ? !passwordEval.isStrong : !isClientStrong(formData.password)) {
        nextErrors.password =
          passwordEval?.errors?.[0] ||
          "Password must be at least 8 characters and satisfy all security checklist criteria";
      }
    } else if (formData.password?.trim()) {
      if (passwordEval ? !passwordEval.isStrong : !isClientStrong(formData.password)) {
        nextErrors.password =
          passwordEval?.errors?.[0] ||
          "New password must be at least 8 characters and satisfy all security checklist criteria";
      }
    }

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
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${errors.name
                  ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                  }`}
                placeholder="Enter Full Name"
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
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${errors.email
                  ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                  }`}
                placeholder="Enter email address"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="roleId">
                Assigned Role <span className="text-rose-500">*</span>
              </label>
              <select
                id="roleId"
                name="roleId"
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 cursor-pointer ${errors.roleId
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="designationId">
                  Designation / Job Title <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreateDesignationOpen(true)}
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  title="Create a new designation"
                >
                  <Add sx={{ fontSize: 13 }} />
                  <span>Create New</span>
                </button>
              </div>
              <select
                id="designationId"
                name="designationId"
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 cursor-pointer ${errors.designationId
                  ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                  }`}
                value={formData.designationId}
                onChange={handleChange}
              >
                <option value="">Select a Designation</option>
                {availableDesignations.map((d) => (
                  <option key={d.id ?? d.Id} value={d.id ?? d.Id}>
                    {d.name ?? d.Name}
                  </option>
                ))}
              </select>
              {errors.designationId && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.designationId}</p>}
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
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${errors.phone
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
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${errors.age
                  ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                  }`}
                placeholder="Enter your age"
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
                className={`w-full rounded-xl border bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 ${errors.address
                  ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                  }`}
                placeholder="Enter street, city, state, postal code..."
                value={formData.address}
                onChange={handleChange}
              />
              {errors.address && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.address}</p>}
            </div>

            {/* Password Field with Real-Time Security Checklist */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="password">
                {editingUser ? "Password (Leave blank to keep existing)" : "Password *"}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={`w-full rounded-xl border bg-white py-2 pl-3.5 pr-10 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 ${errors.password
                    ? "border-rose-400 bg-rose-50/50 focus:ring-rose-500/20"
                    : (formData.password?.length ?? 0) > 0
                      ? passwordEval?.isStrong
                        ? "border-emerald-500 focus:border-emerald-600 focus:ring-emerald-500/20"
                        : "border-amber-400 focus:border-amber-500 focus:ring-amber-500/20"
                      : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                    }`}
                  placeholder={editingUser ? "•••••••••••• (Leave blank to keep)" : "Create a strong password"}
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[11px] font-medium text-rose-500">{errors.password}</p>}

              {/* Real-time Backend Password Strength Evaluation Feedback */}
              {(formData.password?.length ?? 0) > 0 && (
                <div className="mt-2.5 rounded-xl border border-slate-200/90 bg-slate-50/90 p-3 text-xs shadow-2xs transition-all animate-fade-in">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Password Security Checklist:
                    </span>
                    <div className="flex items-center gap-1">
                      {isValidatingPassword ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600">
                          <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent inline-block" />
                          Evaluating API...
                        </span>
                      ) : passwordEval?.isStrong ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          <Check sx={{ fontSize: 12 }} /> Strong Password
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          {passwordEval?.strengthLabel || "Weak"} ({passwordEval?.score || 0}%)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Animated Strength Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-2.5">
                    <div
                      className={`h-full transition-all duration-300 ${(passwordEval?.score || 0) <= 20
                        ? "bg-rose-500 w-1/5"
                        : (passwordEval?.score || 0) <= 40
                          ? "bg-rose-400 w-2/5"
                          : (passwordEval?.score || 0) <= 60
                            ? "bg-amber-500 w-3/5"
                            : (passwordEval?.score || 0) <= 80
                              ? "bg-blue-500 w-4/5"
                              : "bg-emerald-500 w-full"
                        }`}
                    />
                  </div>

                  {/* Criteria Checklist Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                    <div
                      className={`flex items-center gap-1.5 transition-colors ${passwordEval?.criteria?.minLength
                        ? "text-emerald-700 font-semibold"
                        : "text-slate-500"
                        }`}
                    >
                      {passwordEval?.criteria?.minLength ? (
                        <Check sx={{ fontSize: 13 }} className="text-emerald-600 shrink-0" />
                      ) : (
                        <ErrorOutline sx={{ fontSize: 13 }} className="text-slate-400 shrink-0" />
                      )}
                      <span>8+ Characters</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 transition-colors ${passwordEval?.criteria?.hasUpper
                        ? "text-emerald-700 font-semibold"
                        : "text-slate-500"
                        }`}
                    >
                      {passwordEval?.criteria?.hasUpper ? (
                        <Check sx={{ fontSize: 13 }} className="text-emerald-600 shrink-0" />
                      ) : (
                        <ErrorOutline sx={{ fontSize: 13 }} className="text-slate-400 shrink-0" />
                      )}
                      <span>Uppercase letter (A-Z)</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 transition-colors ${passwordEval?.criteria?.hasLower
                        ? "text-emerald-700 font-semibold"
                        : "text-slate-500"
                        }`}
                    >
                      {passwordEval?.criteria?.hasLower ? (
                        <Check sx={{ fontSize: 13 }} className="text-emerald-600 shrink-0" />
                      ) : (
                        <ErrorOutline sx={{ fontSize: 13 }} className="text-slate-400 shrink-0" />
                      )}
                      <span>Lowercase letter (a-z)</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 transition-colors ${passwordEval?.criteria?.hasNumber
                        ? "text-emerald-700 font-semibold"
                        : "text-slate-500"
                        }`}
                    >
                      {passwordEval?.criteria?.hasNumber ? (
                        <Check sx={{ fontSize: 13 }} className="text-emerald-600 shrink-0" />
                      ) : (
                        <ErrorOutline sx={{ fontSize: 13 }} className="text-slate-400 shrink-0" />
                      )}
                      <span>Numeric digit (0-9)</span>
                    </div>

                    <div
                      className={`col-span-1 sm:col-span-2 flex items-center gap-1.5 transition-colors ${passwordEval?.criteria?.hasSpecial
                        ? "text-emerald-700 font-semibold"
                        : "text-slate-500"
                        }`}
                    >
                      {passwordEval?.criteria?.hasSpecial ? (
                        <Check sx={{ fontSize: 13 }} className="text-emerald-600 shrink-0" />
                      ) : (
                        <ErrorOutline sx={{ fontSize: 13 }} className="text-slate-400 shrink-0" />
                      )}
                      <span>Special character (!@#$%...)</span>
                    </div>
                  </div>
                </div>
              )}
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

      {/* Create Designation Modal Dialog */}
      <CreateDesignationModal
        isOpen={isCreateDesignationOpen}
        onClose={() => setIsCreateDesignationOpen(false)}
        onCreated={(newDes) => {
          setAvailableDesignations((prev) => {
            const exists = prev.some((d) => (d.id ?? d.Id) === (newDes.id ?? newDes.Id));
            return exists ? prev : [...prev, newDes];
          });
          const desId = newDes.id ?? newDes.Id ?? "";
          setFormData((curr) => ({ ...curr, designationId: desId }));
          setErrors((curr) => ({ ...curr, designationId: "" }));
        }}
      />
    </div>
  );
};
