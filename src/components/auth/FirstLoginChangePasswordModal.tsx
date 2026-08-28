import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  LockOutlined,
  VpnKeyOutlined,
  VisibilityOutlined,
  VisibilityOffOutlined,
  CheckCircleRounded,
  CancelRounded,
  ShieldOutlined,
  LogoutOutlined,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { profileService } from "../../api/profile.service";
import { authService } from "../../api/auth.service";
import { showSuccessAlert, showErrorAlert } from "../../utils/alerts";
import type { PasswordEvaluationResult } from "../../types";

export interface FirstLoginChangePasswordModalProps {
  isOpen: boolean;
}

export const FirstLoginChangePasswordModal: React.FC<FirstLoginChangePasswordModalProps> = ({
  isOpen,
}) => {
  const { user, logout, completeFirstLoginPasswordChange } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [passwordEval, setPasswordEval] = useState<PasswordEvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side criteria calculation fallback
  const clientCriteria = {
    minLength: newPassword.length >= 8,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
  };

  const isClientStrong =
    clientCriteria.minLength &&
    clientCriteria.hasUpper &&
    clientCriteria.hasLower &&
    clientCriteria.hasNumber &&
    clientCriteria.hasSpecial;

  // Real-time backend password strength evaluation (debounced)
  useEffect(() => {
    if (!newPassword) {
      setPasswordEval(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await authService.evaluatePassword(newPassword);
        setPasswordEval(result);
      } catch {
        // Fallback to client-side criteria
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [newPassword]);

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

  const getStrengthPercent = (): number => {
    if (!newPassword) return 0;
    if (passwordEval?.score) return passwordEval.score;
    const passedCount = Object.values(clientCriteria).filter(Boolean).length;
    return Math.round((passedCount / 5) * 100);
  };

  const strengthPercent = getStrengthPercent();

  const getStrengthColor = (): string => {
    if (strengthPercent < 40) return "bg-rose-500";
    if (strengthPercent < 70) return "bg-amber-500";
    if (strengthPercent < 100) return "bg-blue-500";
    return "bg-emerald-500";
  };

  const getStrengthLabel = (): string => {
    if (!newPassword) return "Enter a new password";
    if (passwordEval?.strengthLabel) return passwordEval.strengthLabel;
    if (strengthPercent < 40) return "Weak";
    if (strengthPercent < 70) return "Fair";
    if (strengthPercent < 100) return "Good";
    return "Strong";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword.trim()) {
      setError("Please enter your current/temporary password.");
      return;
    }

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    const isStrong = passwordEval ? passwordEval.isStrong : isClientStrong;
    if (!isStrong) {
      setError("Your new password does not meet all security checklist criteria.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from your current temporary password.");
      return;
    }

    setLoading(true);
    try {
      await profileService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      // Update auth context state and persistent storage
      completeFirstLoginPasswordChange();

      await showSuccessAlert(
        "Password Updated Successfully",
        "Your password has been changed. You now have full access to your workspace."
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password. Please check your current password and try again.";
      setError(message);
      showErrorAlert("Password Update Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-login-modal-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900 text-white shadow-2xl shadow-indigo-950/50">
        {/* Header Hero Banner */}
        <div className="relative border-b border-slate-800 bg-gradient-to-br from-indigo-900/60 via-slate-900 to-purple-950/40 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-500/20">
                <ShieldOutlined sx={{ fontSize: 26 }} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300 ring-1 ring-indigo-500/30">
                  <VpnKeyOutlined sx={{ fontSize: 13 }} />
                  First Login Security
                </div>
                <h2 id="first-login-modal-title" className="mt-1 text-lg font-bold tracking-tight text-white">
                  Update Your Initial Password
                </h2>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-slate-300">
            Welcome to your workspace, <span className="font-semibold text-white">{user?.name || "Member"}</span>! Because this is your initial login, you must set a new secure password before proceeding.
          </p>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300 flex items-center gap-2">
              <CancelRounded sx={{ fontSize: 18 }} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Password Field */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="first-login-current-pwd">
              Current / Temporary Password <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="first-login-current-pwd"
                type={showCurrent ? "text" : "password"}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 shadow-inner transition-all focus:border-indigo-500 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="Enter the password provided to you"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <VisibilityOffOutlined sx={{ fontSize: 18 }} /> : <VisibilityOutlined sx={{ fontSize: 18 }} />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="first-login-new-pwd">
              New Password <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="first-login-new-pwd"
                type={showNew ? "text" : "password"}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 shadow-inner transition-all focus:border-indigo-500 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="Create a strong new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <VisibilityOffOutlined sx={{ fontSize: 18 }} /> : <VisibilityOutlined sx={{ fontSize: 18 }} />}
              </button>
            </div>

            {/* Password Strength Progress Bar */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Strength:</span>
                  <span className={`font-semibold ${strengthPercent >= 80 ? "text-emerald-400" : strengthPercent >= 60 ? "text-blue-400" : "text-amber-400"}`}>
                    {getStrengthLabel()}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                    style={{ width: `${strengthPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* 5-Criteria Security Checklist */}
            <div className="mt-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3">
              <p className="mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Security Checklist Requirements
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                <div className={`flex items-center gap-1.5 ${clientCriteria.minLength ? "text-emerald-400" : "text-slate-500"}`}>
                  {clientCriteria.minLength ? <CheckCircleRounded sx={{ fontSize: 14 }} /> : <CancelRounded sx={{ fontSize: 14 }} />}
                  <span>Min 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${clientCriteria.hasUpper ? "text-emerald-400" : "text-slate-500"}`}>
                  {clientCriteria.hasUpper ? <CheckCircleRounded sx={{ fontSize: 14 }} /> : <CancelRounded sx={{ fontSize: 14 }} />}
                  <span>Uppercase (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${clientCriteria.hasLower ? "text-emerald-400" : "text-slate-500"}`}>
                  {clientCriteria.hasLower ? <CheckCircleRounded sx={{ fontSize: 14 }} /> : <CancelRounded sx={{ fontSize: 14 }} />}
                  <span>Lowercase (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${clientCriteria.hasNumber ? "text-emerald-400" : "text-slate-500"}`}>
                  {clientCriteria.hasNumber ? <CheckCircleRounded sx={{ fontSize: 14 }} /> : <CancelRounded sx={{ fontSize: 14 }} />}
                  <span>Number (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 sm:col-span-2 ${clientCriteria.hasSpecial ? "text-emerald-400" : "text-slate-500"}`}>
                  {clientCriteria.hasSpecial ? <CheckCircleRounded sx={{ fontSize: 14 }} /> : <CancelRounded sx={{ fontSize: 14 }} />}
                  <span>Special character (!@#$%^&*)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="first-login-confirm-pwd">
              Confirm New Password <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="first-login-confirm-pwd"
                type={showConfirm ? "text" : "password"}
                className={`w-full rounded-xl border bg-slate-800/80 px-3.5 py-2.5 pr-10 text-sm text-white placeholder-slate-500 shadow-inner transition-all focus:bg-slate-800 focus:outline-none focus:ring-2 ${
                  confirmPassword && confirmPassword !== newPassword
                    ? "border-rose-500/60 focus:ring-rose-500/30"
                    : confirmPassword && confirmPassword === newPassword
                    ? "border-emerald-500/60 focus:ring-emerald-500/30"
                    : "border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30"
                }`}
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <VisibilityOffOutlined sx={{ fontSize: 18 }} /> : <VisibilityOutlined sx={{ fontSize: 18 }} />}
              </button>
            </div>
            {confirmPassword && (
              <p className={`mt-1 text-[11px] font-medium ${confirmPassword === newPassword ? "text-emerald-400" : "text-rose-400"}`}>
                {confirmPassword === newPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword || !isClientStrong || newPassword !== confirmPassword}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Updating Password...</span>
                </div>
              ) : (
                <>
                  <LockOutlined sx={{ fontSize: 18 }} />
                  <span>Set New Password &amp; Enter Workspace</span>
                </>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogoutOutlined sx={{ fontSize: 14 }} />
                <span>Not ready? Sign out of session</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
export default FirstLoginChangePasswordModal;
