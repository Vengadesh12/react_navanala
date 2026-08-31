import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AccountCircleOutlined,
  LockOutlined,
  Lock,
  Save,
  Refresh,
  PersonOutline,
  EmailOutlined,
  PhoneOutlined,
  LocationOnOutlined,
  CakeOutlined,
  Security,
  CheckCircleOutline,
  Visibility,
  VisibilityOff,
  Check,
  ErrorOutline,
  VpnKey,
  Search,
  SearchOff,
  Close,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { profileService } from "../../api/profile.service";
import { authService } from "../../api/auth.service";
import { useAuth } from "../../hooks/useAuth";
import { showSuccessToast, showErrorToast } from "../../utils/alerts";
import type { UserProfile, ProfileFormData, ChangePasswordFormData, PasswordEvaluationResult } from "../../types";

export const ProfilePage: React.FC = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [savingPassword, setSavingPassword] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Eye icon visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Real-time backend password strength evaluation
  const [newPasswordEval, setNewPasswordEval] = useState<PasswordEvaluationResult | null>(null);
  const [isValidatingPassword, setIsValidatingPassword] = useState<boolean>(false);

  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    email: "",
    phone: "",
    age: 28,
    address: "",
  });

  const [passwordData, setPasswordData] = useState<ChangePasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await profileService.getProfile();
      setProfile(data);
      setFormData({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        age: data.age || 28,
        address: data.address || "",
      });
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to load profile from database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Debounced API call to evaluate password strength via backend API
  useEffect(() => {
    const pwd = passwordData.newPassword;
    if (!pwd) {
      setNewPasswordEval(null);
      setIsValidatingPassword(false);
      return;
    }

    setIsValidatingPassword(true);
    const timer = setTimeout(async () => {
      try {
        const result = await authService.evaluatePassword(pwd);
        setNewPasswordEval(result);
      } catch (err) {
        console.error("Profile password evaluation error:", err);
      } finally {
        setIsValidatingPassword(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [passwordData.newPassword]);

  // Real-time Password Security Criteria Checklist & Live Match
  const passwordCriteria = useMemo(() => {
    const pwd = passwordData.newPassword;
    const confirm = passwordData.confirmPassword;
    return {
      minLength: pwd.length >= 8,
      hasUpper: /[A-Z]/.test(pwd),
      hasLower: /[a-z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(pwd),
      matchesConfirm: pwd.length > 0 && confirm.length > 0 && pwd === confirm,
    };
  }, [passwordData.newPassword, passwordData.confirmPassword]);

  const isPasswordStrong =
    passwordCriteria.minLength &&
    passwordCriteria.hasUpper &&
    passwordCriteria.hasLower &&
    passwordCriteria.hasNumber &&
    passwordCriteria.hasSpecial;

  const canSubmitPassword =
    !savingPassword &&
    passwordData.currentPassword.trim().length > 0 &&
    isPasswordStrong &&
    passwordCriteria.matchesConfirm &&
    !isValidatingPassword;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showErrorToast("Name and email are required.");
      return;
    }

    setSavingProfile(true);
    try {
      await profileService.updateProfile(formData);
      showSuccessToast("Profile details updated successfully!");
      fetchProfile();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword.trim()) {
      showErrorToast("Current password is required.");
      return;
    }
    if (!isPasswordStrong) {
      showErrorToast("New password must meet all strong security criteria (8+ characters, uppercase, lowercase, number, special character).");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showErrorToast("New strong password and confirm password do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await profileService.changePassword(passwordData);
      showSuccessToast("Password changed and succesfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNewPasswordEval(null);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const q = searchQuery.toLowerCase().trim();

  const matchOverviewCard =
    !q ||
    [
      "account profile",
      "profile overview",
      "user profile",
      "super admin",
      profile?.name || authUser?.name || "",
      profile?.email || authUser?.email || "",
      profile?.roleName || "",
      profile?.phone || "",
      profile?.address || "",
    ].some((t) => t?.toLowerCase().includes(q));

  const matchPersonalCard =
    !q ||
    [
      "personal information",
      "contact profile",
      "full name",
      "contact phone",
      "age",
      "office address",
      formData.name,
      formData.phone,
      formData.address,
    ].some((t) => t?.toLowerCase().includes(q));

  const matchPasswordCard =
    !q ||
    [
      "security",
      "password",
      "security & password",
      "change password",
      "current password",
      "new password",
      "confirm password",
      "credentials",
    ].some((t) => t?.toLowerCase().includes(q));

  const matchAnyProfile = matchOverviewCard || matchPersonalCard || matchPasswordCard;

  return (
    <WorkspaceLayout
      label="Account Profile"
      icon="👤"
      showHero={false}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search profile details, personal info, security..."
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Active Search Results Banner */}
        {q && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Search sx={{ fontSize: 18, color: "#6366f1" }} />
              <span>
                Filtering profile cards for{" "}
                <span className="rounded-md bg-white dark:bg-slate-900 px-2 py-0.5 font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Close sx={{ fontSize: 15 }} />
              <span>Clear Filter</span>
            </button>
          </div>
        )}

        {/* Header Title */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Workspace Management /</span>
            <span className="text-xs font-semibold text-slate-800">Account Profile & Security</span>
          </div>

          <button
            type="button"
            onClick={() => fetchProfile()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Refresh sx={{ fontSize: 16, color: "#64748b" }} className={loading ? "animate-spin text-blue-600" : ""} />
            <span>Refresh Profile</span>
          </button>
        </div>

        {!matchAnyProfile ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <SearchOff sx={{ fontSize: 36, color: "#94a3b8" }} />
            <h3 className="mt-2 text-sm font-bold text-slate-800">No profile cards matched &ldquo;{searchQuery}&rdquo;</h3>
            <p className="mt-1 text-xs text-slate-500">Try searching for name, email, phone, personal information, or password.</p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-4 inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 cursor-pointer"
            >
              <Close sx={{ fontSize: 14 }} />
              <span>Clear Search</span>
            </button>
          </div>
        ) : (
          <>
            {/* User Card Overview */}
            {matchOverviewCard && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col sm:flex-row items-center gap-6">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || authUser?.name || "Admin")}&background=2563eb&color=fff&size=128`}
                  alt={profile?.name}
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-blue-50"
                />

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{profile?.name || authUser?.name}</h2>
                    <span className="self-center sm:self-auto rounded-full bg-purple-100 px-3 py-0.5 text-xs font-bold text-purple-700">
                      {profile?.roleName || "Super Admin"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{profile?.email || authUser?.email}</p>

                  <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <PhoneOutlined sx={{ fontSize: 14 }} />
                      <span>{profile?.phone || "No phone registered"}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CakeOutlined sx={{ fontSize: 14 }} />
                      <span>Age: {profile?.age || 28}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <LocationOnOutlined sx={{ fontSize: 14 }} />
                      <span>{profile?.address || "HQ Office"}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2 Main Forms Grid */}
            {(matchPersonalCard || matchPasswordCard) && (
              <div
                className={`grid grid-cols-1 gap-6 items-start ${
                  matchPersonalCard && matchPasswordCard ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-2xl mx-auto"
                }`}
              >
                {/* Left Form: Profile Details */}
                {matchPersonalCard && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <PersonOutline sx={{ fontSize: 20 }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
                        <p className="text-[11px] text-slate-400">Update your contact profile </p>
                      </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="mt-5 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                        <div className="relative">
                          <PersonOutline sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                        <div className="relative">
                          <EmailOutlined sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            disabled
                            value={profile?.email || authUser?.email || ""}
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-xs text-slate-500 cursor-not-allowed"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">Email address is managed by system administrator</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                          <div className="relative">
                            <PhoneOutlined sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden transition-colors"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                          <div className="relative">
                            <CakeOutlined sx={{ fontSize: 16 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="number"
                              min={18}
                              max={100}
                              value={formData.age}
                              onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 28 })}
                              className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden transition-colors"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Office / Home Address</label>
                        <div className="relative">
                          <LocationOnOutlined sx={{ fontSize: 16 }} className="absolute left-3 top-3 text-slate-400" />
                          <textarea
                            rows={3}
                            placeholder="Enter physical address..."
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden transition-colors resize-none"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <Save sx={{ fontSize: 16 }} />
                          <span>{savingProfile ? "Updating Database..." : "Save Profile Details"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Right Form: Change Password */}
                {matchPasswordCard && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
                          <VpnKey sx={{ fontSize: 20 }} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Security & Password</h3>
                          <p className="text-[11px] text-slate-400">Update your account authentication credentials</p>
                        </div>
                      </div>

                      <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
                        {/* 1. Current Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password *</label>
                  <div className="relative">
                    <LockOutlined sx={{ fontSize: 16 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      required
                      placeholder="Enter current password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-10 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                      title={showCurrentPassword ? "Hide password" : "Show password"}
                      aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                    >
                      {showCurrentPassword ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                    </button>
                  </div>
                </div>

                {/* 2. New Strong Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Strong Password *</label>
                  <div className="relative">
                    <Lock sx={{ fontSize: 16 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 8 characters with mix of case, digits, symbols"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className={`w-full rounded-xl pl-9 pr-10 py-2 text-xs text-slate-800 transition-all focus:outline-hidden ${passwordData.newPassword.length > 0
                        ? isPasswordStrong
                          ? "border border-emerald-500 ring-1 ring-emerald-500/20"
                          : "border border-amber-400 ring-1 ring-amber-400/20"
                        : "border border-slate-200 focus:border-blue-500"
                        }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                      title={showNewPassword ? "Hide password" : "Show password"}
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    >
                      {showNewPassword ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                    </button>
                  </div>
                </div>

                {/* 3. Confirm New Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Confirm New Password *</label>
                    {passwordData.confirmPassword.length > 0 && (
                      <div className="flex items-center">
                        {passwordCriteria.matchesConfirm ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-600/20">
                            <Check sx={{ fontSize: 12 }} /> Passwords Match
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full ring-1 ring-rose-600/20">
                            <ErrorOutline sx={{ fontSize: 12 }} /> Does Not Match
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Lock sx={{ fontSize: 16 }} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Repeat your new password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className={`w-full rounded-xl pl-9 pr-10 py-2 text-xs text-slate-800 transition-all focus:outline-hidden ${passwordData.confirmPassword.length > 0
                        ? passwordCriteria.matchesConfirm
                          ? "border border-emerald-500 ring-1 ring-emerald-500/20"
                          : "border border-rose-400 ring-1 ring-rose-400/20"
                        : "border border-slate-200 focus:border-blue-500"
                        }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
                    </button>
                  </div>
                </div>

                {/* Real-time Backend Password Strength Evaluation Feedback & Checklist */}
                {(passwordData.newPassword.length > 0 || passwordData.confirmPassword.length > 0) && (
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 p-3.5 text-xs shadow-2xs space-y-2.5 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Password Security Checklist:
                      </span>
                      <div className="flex items-center gap-1">
                        {isValidatingPassword ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600">
                            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent inline-block" />
                            Evaluating API...
                          </span>
                        ) : isPasswordStrong && passwordCriteria.matchesConfirm ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <Check sx={{ fontSize: 12 }} /> Strong & Matched
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            {newPasswordEval?.strengthLabel || (isPasswordStrong ? "Strong" : "Weak")} ({newPasswordEval?.score || (isPasswordStrong ? 100 : Math.round(([passwordCriteria.minLength, passwordCriteria.hasUpper, passwordCriteria.hasLower, passwordCriteria.hasNumber, passwordCriteria.hasSpecial].filter(Boolean).length) * 20))}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Animated Strength Progress Bar */}
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${(newPasswordEval?.score || 0) <= 20
                          ? "bg-rose-500 w-1/5"
                          : (newPasswordEval?.score || 0) <= 40
                            ? "bg-rose-400 w-2/5"
                            : (newPasswordEval?.score || 0) <= 60
                              ? "bg-amber-500 w-3/5"
                              : (newPasswordEval?.score || 0) <= 80
                                ? "bg-blue-500 w-4/5"
                                : "bg-emerald-500 w-full"
                          }`}
                      />
                    </div>

                    {/* Criteria Checklist Grid */}
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                      <div
                        className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.minLength ? "text-emerald-700 font-semibold" : "text-slate-500"
                          }`}
                      >
                        {passwordCriteria.minLength ? (
                          <Check sx={{ fontSize: 13 }} className="text-emerald-600 shrink-0" />
                        ) : (
                          <ErrorOutline sx={{ fontSize: 13 }} className="text-slate-400 shrink-0" />
                        )}
                        <span>8+ Characters</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasUpper ? "text-emerald-700 font-semibold" : "text-slate-500"
                          }`}
                      >
                        {passwordCriteria.hasUpper ? (
                          <Check sx={{ fontSize: 13 }} className="text-emerald-600 shrink-0" />
                        ) : (
                          <ErrorOutline sx={{ fontSize: 13 }} className="text-slate-400 shrink-0" />
                        )}
                        <span>Uppercase (A-Z)</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasLower ? "text-emerald-700 font-semibold" : "text-slate-500"
                          }`}
                      >
                        {passwordCriteria.hasLower ? (
                          <Check sx={{ fontSize: 13 }} className="text-emerald-600 shrink-0" />
                        ) : (
                          <ErrorOutline sx={{ fontSize: 13 }} className="text-slate-400 shrink-0" />
                        )}
                        <span>Lowercase (a-z)</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasNumber ? "text-emerald-700 font-semibold" : "text-slate-500"
                          }`}
                      >
                        {passwordCriteria.hasNumber ? (
                          <Check sx={{ fontSize: 13 }} className="text-emerald-600 shrink-0" />
                        ) : (
                          <ErrorOutline sx={{ fontSize: 13 }} className="text-slate-400 shrink-0" />
                        )}
                        <span>Number (0-9)</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.hasSpecial ? "text-emerald-700 font-semibold" : "text-slate-500"
                          }`}
                      >
                        {passwordCriteria.hasSpecial ? (
                          <Check sx={{ fontSize: 13 }} className="text-emerald-600 shrink-0" />
                        ) : (
                          <ErrorOutline sx={{ fontSize: 13 }} className="text-slate-400 shrink-0" />
                        )}
                        <span>Special (!@#$%...)</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 transition-colors ${passwordCriteria.matchesConfirm ? "text-emerald-700 font-semibold" : "text-slate-500"
                          }`}
                      >
                        {passwordCriteria.matchesConfirm ? (
                          <Check sx={{ fontSize: 13 }} className="text-emerald-600 shrink-0" />
                        ) : (
                          <ErrorOutline sx={{ fontSize: 13 }} className="text-slate-400 shrink-0" />
                        )}
                        <span>Passwords Match</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={!canSubmitPassword}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingPassword ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Securing Password...</span>
                      </>
                    ) : (
                      <>
                        <LockOutlined sx={{ fontSize: 16 }} />
                        <span>Change Password</span>
                      </>
                    )}
                  </button>

                  {/* Dynamic helper warning when password is typed but not yet strong or matching */}
                  {passwordData.newPassword.length > 0 && !canSubmitPassword && !savingPassword && (
                    <p className="mt-2 text-[11px] text-amber-600 text-center font-medium flex items-center justify-center gap-1">
                      <ErrorOutline sx={{ fontSize: 13 }} />
                      {!isPasswordStrong
                        ? "Ensure new password meets all strong security requirements."
                        : !passwordCriteria.matchesConfirm
                          ? "Ensure new password and confirmation match."
                          : !passwordData.currentPassword.trim()
                            ? "Current password is required."
                            : "Evaluating password security..."}
                    </p>
                  )}
                </div>
              </form>
            </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                      {/* <Security sx={{ fontSize: 15, color: "#10b981" }} /> */}
                      {/* <span>Passwords are salted and cryptographically hashed with PBKDF2 in PostgreSQL.</span> */}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
};

export default ProfilePage;

