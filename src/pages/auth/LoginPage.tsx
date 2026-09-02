import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Visibility,
  VisibilityOff,
  Shield,
  Lock,
  Person,
  Key,
  CheckCircle,
  ArrowForward,
  Mail,
  MarkEmailRead,
  VpnKey,
  Close,
  Check,
  ErrorOutline,
  Security,
  ArrowBack,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { authService } from "../../api/auth.service";
import type { PasswordEvaluationResult } from "../../types";
import { showErrorAlert, showSuccessAlert, showWarningAlert } from "../../utils/alerts";
import { OtpInput } from "../../components/common/OtpInput";
import { getFirstAccessiblePath } from "../../config/workspace.config";
import { GOOGLE_CONFIG, isGoogleAuthAvailable } from "../../config/google.config";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, loginWithGoogle, verify2FaLogin } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", remember: true });

  useEffect(() => {
    if (user?.token) {
      const target = getFirstAccessiblePath(user);
      if (target && target !== "/login") {
        navigate(target, { replace: true });
      }
    }
  }, [user, navigate]);

  // Real-time Login Password Evaluation State
  const [loginPasswordEval, setLoginPasswordEval] = useState<PasswordEvaluationResult | null>(null);
  const [isValidatingLoginPassword, setIsValidatingLoginPassword] = useState(false);

  // Two-Factor Authentication State
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState("");
  const [twoFactorOtp, setTwoFactorOtp] = useState("");
  const [verifying2Fa, setVerifying2Fa] = useState(false);
  const [resending2Fa, setResending2Fa] = useState(false);

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // Debounced API call to evaluate login password via backend API
  useEffect(() => {
    const password = formData.password;
    if (!password) {
      setLoginPasswordEval(null);
      setIsValidatingLoginPassword(false);
      return;
    }

    setIsValidatingLoginPassword(true);
    const timer = setTimeout(async () => {
      try {
        const result = await authService.evaluatePassword(password);
        setLoginPasswordEval(result);
      } catch (error) {
        console.error("Backend password evaluation error:", error);
      } finally {
        setIsValidatingLoginPassword(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [formData.password]);


  // Strong Password Checklist
  const passwordCriteria = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(newPassword),
      matchesConfirm: newPassword.length > 0 && newPassword === confirmPassword,
    };
  }, [newPassword, confirmPassword]);

  const isPasswordStrong =
    passwordCriteria.minLength &&
    passwordCriteria.hasUpper &&
    passwordCriteria.hasLower &&
    passwordCriteria.hasNumber &&
    passwordCriteria.hasSpecial &&
    passwordCriteria.matchesConfirm;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.email.trim() || !formData.password.trim()) {
      await showWarningAlert("Missing Credentials", "Please provide both email and password to sign in.");
      return;
    }

    setLoggingIn(true);
    try {
      const result = await login({
        email: formData.email,
        password: formData.password,
        remember: formData.remember,
      });

      if (result.requiresTwoFactor) {
        setIsTwoFactorStep(true);
        setTwoFactorEmail(formData.email);
        setTwoFactorOtp("");
        await showSuccessAlert(
          "Two-Factor Authentication",
          result.message || "A 6-digit verification code has been dispatched to your email."
        );
        return;
      }

      const targetPath =
        result.redirectPath && result.redirectPath !== "/login"
          ? result.redirectPath
          : "/dashboard";
      navigate(targetPath, { replace: true });
    } catch (error: any) {
      console.error("Login API Error:", error);
      await showErrorAlert(
        "Login Failed",
        error.message || "Could not sign in. Ensure the backend C# API is running."
      );
    } finally {
      setLoggingIn(false);
    }
  };

  // Google Sign-In Callback Handler
  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setGoogleLoading(true);
    try {
      let email = "";
      let name = "";
      let picture = "";
      try {
        const base64Url = response.credential.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const parsed = JSON.parse(jsonPayload);
        email = parsed.email || "";
        name = parsed.name || parsed.given_name || "";
        picture = parsed.picture || "";
      } catch {
        // Fall back to server token reading
      }

      const targetPath = await loginWithGoogle({
        idToken: response.credential,
        email,
        name,
        profileImage: picture,
      });

      await showSuccessAlert("Google Sign-In Successful", `Welcome, ${name || email || "User"}!`);
      navigate(targetPath || "/dashboard", { replace: true });
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      await showErrorAlert("Google Sign-In Failed", error.message || "Failed to authenticate with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    if (!isGoogleAuthAvailable()) return;

    const initGsi = () => {
      const google = (window as any).google;
      if (google?.accounts?.id) {
        try {
          google.accounts.id.initialize({
            client_id: GOOGLE_CONFIG.clientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });
        } catch (err) {
          console.warn("Failed to initialize Google GIS:", err);
        }
      }
    };

    if ((window as any).google?.accounts?.id) {
      initGsi();
    } else {
      const timer = setTimeout(initGsi, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleGoogleSignInClick = () => {
    const google = (window as any).google;
    // Prefer interactive OAuth2 token popup if available
    if (google?.accounts?.oauth2) {
      setGoogleLoading(true);
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CONFIG.clientId,
          scope: "email profile openid",
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              setGoogleLoading(false);
              if (tokenResponse.error !== "popup_closed_by_user") {
                await showErrorAlert("Google Sign-In Error", tokenResponse.error);
              }
              return;
            }

            try {
              const userInfo = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
              }).then((res) => res.json());

              const targetPath = await loginWithGoogle({
                idToken: tokenResponse.access_token,
                email: userInfo.email,
                name: userInfo.name,
                profileImage: userInfo.picture,
              });

              await showSuccessAlert("Google Sign-In Successful", `Welcome, ${userInfo.name || userInfo.email}!`);
              navigate(targetPath || "/dashboard", { replace: true });
            } catch (err: any) {
              console.error("Google userinfo error:", err);
              await showErrorAlert("Sign-In Failed", err.message || "Could not retrieve Google profile.");
            } finally {
              setGoogleLoading(false);
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (err) {
        console.warn("OAuth2 client init error, falling back to ID prompt:", err);
        setGoogleLoading(false);
      }
    }

    if (google?.accounts?.id) {
      try {
        google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            showWarningAlert(
              "Google Sign-In",
              "Google Sign-In prompt could not be displayed. Please check your browser popup blocker settings."
            );
          }
        });
      } catch (err) {
        console.error("Google prompt error:", err);
      }
    } else {
      showWarningAlert(
        "Google Sign-In",
        "Google authentication service is initializing. Please check your connection and try again."
      );
    }
  };

  // 2FA OTP Submission
  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorOtp.trim().length !== 6) {
      await showWarningAlert("Incomplete Code", "Please enter the complete 6-digit verification OTP.");
      return;
    }

    setVerifying2Fa(true);
    try {
      const redirectPath = await verify2FaLogin(twoFactorEmail, twoFactorOtp);
      await showSuccessAlert("Authentication Verified", "Identity confirmed. Welcome back!");
      const targetPath =
        redirectPath && redirectPath !== "/login" ? redirectPath : "/dashboard";
      navigate(targetPath, { replace: true });
    } catch (error: any) {
      console.error("2FA Verification Error:", error);
      await showErrorAlert("Verification Failed", error.message || "Invalid or expired 2FA code.");
    } finally {
      setVerifying2Fa(false);
    }
  };

  // Resend 2FA OTP
  const handleResendTwoFactorOtp = async () => {
    setResending2Fa(true);
    try {
      const res = await authService.resend2FaOtp(twoFactorEmail);
      await showSuccessAlert("New Code Dispatched", res.message || "A fresh 2FA code has been sent to your email.");
    } catch (error: any) {
      await showErrorAlert("Resend Failed", error.message || "Failed to resend 2FA code.");
    } finally {
      setResending2Fa(false);
    }
  };

  // Step 1: Send OTP for Forgot Password
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      await showWarningAlert("Email Required", "Please enter your registered email address.");
      return;
    }

    setModalLoading(true);
    try {
      const response = await authService.forgotPassword(forgotEmail);
      await showSuccessAlert("OTP Dispatched", response.message || "A 6-digit OTP has been sent to your email.");
      setForgotStep(2);
    } catch (error: any) {
      await showErrorAlert("Request Failed", error.message || "Could not generate OTP. Verify your email address.");
    } finally {
      setModalLoading(false);
    }
  };

  // Step 2: Verify OTP for Forgot Password
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      await showWarningAlert("Invalid OTP", "Please enter the complete 6-digit OTP code.");
      return;
    }

    setModalLoading(true);
    try {
      const response = await authService.verifyOtp(forgotEmail, otpCode);
      await showSuccessAlert("OTP Verified", response.message || "OTP verified! Please set your new password.");
      setForgotStep(3);
    } catch (error: any) {
      await showErrorAlert("Verification Failed", error.message || "Invalid or expired OTP code.");
    } finally {
      setModalLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong) {
      await showWarningAlert("Password Policy", "Please ensure your new password meets all security criteria.");
      return;
    }

    setModalLoading(true);
    try {
      const response = await authService.resetPassword({
        email: forgotEmail,
        otp: otpCode,
        newPassword,
        confirmPassword,
      });

      await showSuccessAlert("Password Reset Complete", response.message || "Your password has been changed.");

      // Auto fill new credentials into login form
      setFormData({
        email: forgotEmail,
        password: newPassword,
        remember: true,
      });

      // Close modal
      setForgotModalOpen(false);
      setForgotStep(1);
      setForgotEmail("");
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      await showErrorAlert("Reset Failed", error.message || "Failed to reset password.");
    } finally {
      setModalLoading(false);
    }
  };

  const openForgotModal = () => {
    setForgotEmail(formData.email || "");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotStep(1);
    setForgotModalOpen(true);
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-900">
      {/* Left Brand Showcase Hero */}
      <section className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-12 xl:p-16 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border-r border-indigo-900/30">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white brand-logo-white p-1.5 shadow-lg shadow-indigo-500/20 backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center"
              style={{ backgroundColor: "#ffffff" }}
            >
              <img src="/navanala-icon.png" alt="NavaNala Technologies" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">NavaNala Technologies</h1>
              <p className="text-xs font-semibold text-indigo-300">Enterprise Access & Invoicing</p>
            </div>
          </div>

          <div className="mt-16 max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3.5 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
              <Key sx={{ fontSize: 14 }} /> Role-Based Access Control & 2FA
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Intelligent access governance for modern teams.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-indigo-100/80">
              Manage multi-tier roles, granular permissions, member directories, 2FA security policies, and real-time audit trails in one unified console.
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="relative z-10 grid gap-3.5 sm:grid-cols-2">
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-900/30 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-indigo-300">
              <CheckCircle sx={{ fontSize: 18 }} />
              <span className="text-xs font-bold text-white">Two-Factor Authentication</span>
            </div>
            <p className="mt-1.5 text-xs text-indigo-100/70">
              Granular OTP email validation enforced via system security settings.
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-900/30 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle sx={{ fontSize: 18 }} />
              <span className="text-xs font-bold text-white">OTP Password Recovery</span>
            </div>
            <p className="mt-1.5 text-xs text-indigo-100/70">
              Instant Gmail OTP verification with enforced strong password policies.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-indigo-900/50 pt-4 text-xs text-indigo-300/60">
          <span>&copy; {new Date().getFullYear()} NavaNala Technologies</span>
          <span>Version 2.5.0 (2FA Active)</span>
        </div>
      </section>

      {/* Right Form Panel */}
      <section className="col-span-1 lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-12 max-lg:bg-gradient-to-br max-lg:from-slate-950 max-lg:via-indigo-950 max-lg:to-slate-900 bg-white relative overflow-hidden">
        {/* Background glow effects for mobile view */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none lg:hidden" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-purple-500/15 blur-3xl pointer-events-none lg:hidden" />

        <div className="w-full max-w-md relative z-10">

          {/* ========================================================================= */}
          {/* STEP A: Two-Factor Authentication OTP Verification                       */}
          {/* ========================================================================= */}
          {isTwoFactorStep ? (
            <div className="animate-fade-in space-y-6">
              <div>
                <div className="mb-4 inline-grid h-12 w-12 place-items-center rounded-2xl max-lg:bg-indigo-500/20 max-lg:text-indigo-400 max-lg:border-indigo-500/30 bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
                  <Security sx={{ fontSize: 28 }} />
                </div>
                <h2 className="text-2xl font-bold tracking-tight max-lg:text-white text-slate-900">Two-Factor Verification</h2>
                <p className="mt-1.5 text-xs max-lg:text-indigo-200/80 text-slate-500 leading-relaxed">
                  Two-factor authentication is active on this workspace. Enter the 6-digit security code sent to{" "}
                  <strong className="max-lg:text-white text-slate-800 font-semibold">{twoFactorEmail}</strong>.
                </p>
              </div>

              <form onSubmit={handleTwoFactorSubmit} className="space-y-5">
                <div className="rounded-xl max-lg:bg-indigo-950/70 max-lg:border-indigo-800/80 bg-indigo-50/60 p-4 border border-indigo-100/80 flex items-center gap-3">
                  <MarkEmailRead sx={{ fontSize: 24 }} className="max-lg:text-indigo-400 text-indigo-600 shrink-0" />
                  <div className="text-xs max-lg:text-indigo-200 text-indigo-950">
                    <span>We sent an email with your OTP code. Please check your inbox or spam folder.</span>
                  </div>
                </div>

                <div>
                  <label className="mb-2.5 block text-xs font-bold max-lg:text-slate-200 text-slate-700 uppercase tracking-wider text-center">
                    6-Digit Verification Code
                  </label>
                  <OtpInput
                    value={twoFactorOtp}
                    onChange={(val) => setTwoFactorOtp(val)}
                    idPrefix="twoFactorOtp"
                    autoFocus={true}
                    disabled={verifying2Fa}
                  />
                </div>

                <div className="flex items-center justify-between text-xs max-lg:text-slate-400 text-slate-500 pt-1">
                  <span>Didn't receive the code?</span>
                  <button
                    type="button"
                    onClick={handleResendTwoFactorOtp}
                    disabled={resending2Fa}
                    className="font-bold max-lg:text-indigo-400 max-lg:hover:text-indigo-300 text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {resending2Fa ? "Sending code..." : "Resend Code"}
                  </button>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={verifying2Fa || twoFactorOtp.length !== 6}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3 text-sm font-bold text-white shadow-sm shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 hover:shadow-md disabled:opacity-50"
                  >
                    {verifying2Fa ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Verifying Security Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Sign In</span>
                        <ArrowForward sx={{ fontSize: 16 }} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsTwoFactorStep(false);
                      setTwoFactorOtp("");
                    }}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border max-lg:border-slate-700 max-lg:bg-slate-900/60 max-lg:text-slate-300 max-lg:hover:bg-slate-800 border-slate-200 bg-transparent py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowBack sx={{ fontSize: 16 }} />
                    <span>Back to Login</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ========================================================================= */
            /* STEP B: Standard Email & Password Form                                   */
            /* ========================================================================= */
            <div>
              <div className="mb-8">
                <div className="mb-4 inline-block h-12 w-12 overflow-hidden rounded-2xl max-lg:bg-white/10 max-lg:shadow-indigo-500/20 max-lg:backdrop-blur-md max-lg:ring-1 max-lg:ring-white/20 bg-indigo-50 p-1 shadow-xs border border-indigo-100 lg:hidden">
                  <img src="/navanala-icon.png" alt="NavaNala Technologies" className="h-full w-full object-contain" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight max-lg:text-white text-slate-900">Sign in to your account</h2>
                <p className="mt-1 text-sm max-lg:text-indigo-200/80 text-slate-500">
                  Enter your authorized credentials to access your workspace.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold max-lg:text-slate-200 text-slate-700" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="w-full rounded-xl border max-lg:border-slate-700 max-lg:bg-slate-900/90 max-lg:text-white max-lg:placeholder:text-slate-500 max-lg:focus:border-indigo-500 border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="admin@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 max-lg:text-slate-400 text-slate-400">
                      <Person sx={{ fontSize: 18 }} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-xs font-semibold max-lg:text-slate-200 text-slate-700" htmlFor="password">
                      Password
                    </label>
                    <button
                      type="button"
                      className="text-xs font-semibold max-lg:text-indigo-400 max-lg:hover:text-indigo-300 text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                      onClick={openForgotModal}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 ${formData.password.length > 0
                        ? loginPasswordEval?.isStrong
                          ? "border-emerald-500 max-lg:bg-slate-900/90 max-lg:text-white bg-white text-slate-900 focus:border-emerald-600 focus:ring-emerald-500/20"
                          : "border-amber-400 max-lg:bg-slate-900/90 max-lg:text-white bg-white text-slate-900 focus:border-amber-500 focus:ring-amber-500/20"
                        : "max-lg:border-slate-700 max-lg:bg-slate-900/90 max-lg:text-white max-lg:placeholder:text-slate-500 max-lg:focus:border-indigo-500 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-indigo-500/20"
                        }`}
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock sx={{ fontSize: 18 }} />
                    </div>
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 max-lg:text-slate-400 max-lg:hover:text-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </button>
                  </div>

                  {/* Real-time Backend Password Strength Evaluation Feedback */}
                  {formData.password.length > 0 && (
                    <div className="mt-2 rounded-xl border max-lg:border-slate-800 max-lg:bg-slate-900/90 border-slate-200/90 bg-slate-50/90 p-3 text-xs shadow-xs transition-all animate-fadeIn">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider max-lg:text-slate-400 text-slate-600">
                          Password Security Checklist:
                        </span>
                        <div className="flex items-center gap-1">
                          {isValidatingLoginPassword ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium max-lg:text-indigo-400 text-indigo-600">
                              <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent inline-block" />
                              Evaluating API...
                            </span>
                          ) : loginPasswordEval?.isStrong ? (
                            <span className="inline-flex items-center gap-1 rounded-full max-lg:bg-emerald-500/10 max-lg:text-emerald-400 max-lg:ring-emerald-500/20 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <Check sx={{ fontSize: 12 }} /> Strong Password
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full max-lg:bg-amber-500/10 max-lg:text-amber-400 max-lg:ring-amber-500/20 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                              {loginPasswordEval?.strengthLabel || "Weak"} ({loginPasswordEval?.score || 0}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Animated Strength Progress Bar */}
                      <div className="h-1.5 w-full max-lg:bg-slate-800 bg-slate-200 rounded-full overflow-hidden mb-2.5">
                        <div
                          className={`h-full transition-all duration-300 ${(loginPasswordEval?.score || 0) <= 20
                            ? "bg-rose-500 w-1/5"
                            : (loginPasswordEval?.score || 0) <= 40
                              ? "bg-rose-400 w-2/5"
                              : (loginPasswordEval?.score || 0) <= 60
                                ? "bg-amber-500 w-3/5"
                                : (loginPasswordEval?.score || 0) <= 80
                                  ? "bg-blue-500 w-4/5"
                                  : "bg-emerald-500 w-full"
                            }`}
                        />
                      </div>

                      {/* Criteria Checklist Items */}
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div
                          className={`flex items-center gap-1.5 transition-colors ${loginPasswordEval?.criteria?.minLength
                            ? "max-lg:text-emerald-400 text-emerald-700 font-semibold"
                            : "text-slate-500"
                            }`}
                        >
                          {loginPasswordEval?.criteria?.minLength ? (
                            <Check sx={{ fontSize: 13 }} className="max-lg:text-emerald-400 text-emerald-600 shrink-0" />
                          ) : (
                            <ErrorOutline sx={{ fontSize: 13 }} className="max-lg:text-slate-500 text-slate-400 shrink-0" />
                          )}
                          <span>8+ Characters</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 transition-colors ${loginPasswordEval?.criteria?.hasUpper
                            ? "max-lg:text-emerald-400 text-emerald-700 font-semibold"
                            : "text-slate-500"
                            }`}
                        >
                          {loginPasswordEval?.criteria?.hasUpper ? (
                            <Check sx={{ fontSize: 13 }} className="max-lg:text-emerald-400 text-emerald-600 shrink-0" />
                          ) : (
                            <ErrorOutline sx={{ fontSize: 13 }} className="max-lg:text-slate-500 text-slate-400 shrink-0" />
                          )}
                          <span>Uppercase letter (A-Z)</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 transition-colors ${loginPasswordEval?.criteria?.hasLower
                            ? "max-lg:text-emerald-400 text-emerald-700 font-semibold"
                            : "text-slate-500"
                            }`}
                        >
                          {loginPasswordEval?.criteria?.hasLower ? (
                            <Check sx={{ fontSize: 13 }} className="max-lg:text-emerald-400 text-emerald-600 shrink-0" />
                          ) : (
                            <ErrorOutline sx={{ fontSize: 13 }} className="max-lg:text-slate-500 text-slate-400 shrink-0" />
                          )}
                          <span>Lowercase letter (a-z)</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 transition-colors ${loginPasswordEval?.criteria?.hasNumber
                            ? "max-lg:text-emerald-400 text-emerald-700 font-semibold"
                            : "text-slate-500"
                            }`}
                        >
                          {loginPasswordEval?.criteria?.hasNumber ? (
                            <Check sx={{ fontSize: 13 }} className="max-lg:text-emerald-400 text-emerald-600 shrink-0" />
                          ) : (
                            <ErrorOutline sx={{ fontSize: 13 }} className="max-lg:text-slate-500 text-slate-400 shrink-0" />
                          )}
                          <span>Numeric digit (0-9)</span>
                        </div>

                        <div
                          className={`col-span-2 flex items-center gap-1.5 transition-colors ${loginPasswordEval?.criteria?.hasSpecial
                            ? "max-lg:text-emerald-400 text-emerald-700 font-semibold"
                            : "text-slate-500"
                            }`}
                        >
                          {loginPasswordEval?.criteria?.hasSpecial ? (
                            <Check sx={{ fontSize: 13 }} className="max-lg:text-emerald-400 text-emerald-600 shrink-0" />
                          ) : (
                            <ErrorOutline sx={{ fontSize: 13 }} className="max-lg:text-slate-500 text-slate-400 shrink-0" />
                          )}
                          <span>Special character (!@#$%...)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium max-lg:text-slate-300 text-slate-600">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={formData.remember}
                      onChange={handleChange}
                      className="h-4 w-4 rounded max-lg:border-slate-700 max-lg:bg-slate-900 border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Remember this device</span>
                  </label>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={
                      loggingIn ||
                      !formData.email.trim() ||
                      !formData.password.trim() ||
                      !loginPasswordEval?.isStrong ||
                      isValidatingLoginPassword
                    }
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loggingIn ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Authenticating...</span>
                      </>
                    ) : isValidatingLoginPassword ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Evaluating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowForward sx={{ fontSize: 16 }} />
                      </>
                    )}
                  </button>

                  {/* Helper hint when button is disabled due to password requirements */}
                  {formData.password.length > 0 && !loginPasswordEval?.isStrong && !isValidatingLoginPassword && (
                    <p className="mt-2 text-[11px] max-lg:text-amber-400 text-amber-600 text-center font-medium flex items-center justify-center gap-1">
                      <ErrorOutline sx={{ fontSize: 13 }} />
                      Sign in is disabled until password meets all strong security requirements.
                    </p>
                  )}
                </div>

                {/* Social Login Divider */}
                <div className="relative my-3 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t max-lg:border-slate-800 border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase">
                    <span className="max-lg:bg-slate-950 max-lg:text-slate-400 bg-white px-3 font-semibold tracking-wider text-slate-400">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Sign in with Google Button */}
                <div>
                  <button
                    type="button"
                    id="google-signin-btn"
                    onClick={handleGoogleSignInClick}
                    disabled={googleLoading || loggingIn}
                    className="group relative inline-flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border max-lg:border-slate-700 max-lg:bg-slate-900/90 max-lg:hover:bg-slate-800 max-lg:text-white border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:border-slate-400 hover:bg-slate-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {googleLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        <span className="max-lg:text-indigo-200 text-slate-700">Connecting Google...</span>
                      </>
                    ) : (
                      <>
                        {/* Official Google 4-Color G Logo SVG */}
                        <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                          />
                          <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                          />
                          <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            fill="#FBBC05"
                          />
                          <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            fill="#EA4335"
                          />
                        </svg>
                        <span>Sign in with Google</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>
      </section>

      {/* Forgot Password OTP Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <VpnKey sx={{ fontSize: 20 }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reset Your Password</h3>
                  <p className="text-xs text-slate-500">Step {forgotStep} of 3 &bull; OTP Verification</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Step Indicators */}
            <div className="my-5 grid grid-cols-3 gap-2">
              <div className={`h-1.5 rounded-full ${forgotStep >= 1 ? "bg-indigo-600" : "bg-slate-200"}`} />
              <div className={`h-1.5 rounded-full ${forgotStep >= 2 ? "bg-indigo-600" : "bg-slate-200"}`} />
              <div className={`h-1.5 rounded-full ${forgotStep >= 3 ? "bg-indigo-600" : "bg-slate-200"}`} />
            </div>

            {/* STEP 1: Enter Email */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered account email. We will send a secure 6-digit OTP code to verify your identity.
                </p>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="forgotEmail">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="forgotEmail"
                      type="email"
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="user@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Mail sx={{ fontSize: 18 }} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="w-1/2 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="w-1/2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {modalLoading ? "Sending OTP..." : "Send OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter 6-digit OTP */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="rounded-xl bg-indigo-50/70 p-3.5 border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
                  <MarkEmailRead sx={{ fontSize: 20 }} className="text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Check your inbox:</span> We sent a 6-digit verification OTP code to <strong>{forgotEmail}</strong>.
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
                    6-Digit Verification OTP
                  </label>
                  <OtpInput
                    value={otpCode}
                    onChange={(val) => setOtpCode(val)}
                    idPrefix="forgotOtp"
                    autoFocus={true}
                    disabled={modalLoading}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Didn't receive code?</span>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={modalLoading}
                    className="font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Resend OTP
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="w-1/2 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Change Email
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading || otpCode.length !== 6}
                    className="w-1/2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {modalLoading ? "Verifying..." : "Verify OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Enter New Strong Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="newPassword">
                    New Strong Password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock sx={{ fontSize: 18 }} />
                    </div>
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                    >
                      {showNewPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="confirmPassword">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Lock sx={{ fontSize: 18 }} />
                    </div>
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                    </button>
                  </div>
                </div>

                {/* Live Password Complexity Checklist */}
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Password Security Checklist:
                  </span>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.minLength ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                      {passwordCriteria.minLength ? <Check sx={{ fontSize: 14 }} /> : <ErrorOutline sx={{ fontSize: 14 }} />}
                      <span>8+ Characters</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasUpper ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                      {passwordCriteria.hasUpper ? <Check sx={{ fontSize: 14 }} /> : <ErrorOutline sx={{ fontSize: 14 }} />}
                      <span>Uppercase (A-Z)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasLower ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                      {passwordCriteria.hasLower ? <Check sx={{ fontSize: 14 }} /> : <ErrorOutline sx={{ fontSize: 14 }} />}
                      <span>Lowercase (a-z)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasNumber ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                      {passwordCriteria.hasNumber ? <Check sx={{ fontSize: 14 }} /> : <ErrorOutline sx={{ fontSize: 14 }} />}
                      <span>Number (0-9)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasSpecial ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                      {passwordCriteria.hasSpecial ? <Check sx={{ fontSize: 14 }} /> : <ErrorOutline sx={{ fontSize: 14 }} />}
                      <span>Special (!@#$%...)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${passwordCriteria.matchesConfirm ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                      {passwordCriteria.matchesConfirm ? <Check sx={{ fontSize: 14 }} /> : <ErrorOutline sx={{ fontSize: 14 }} />}
                      <span>Passwords Match</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(2)}
                    className="w-1/3 rounded-xl border border-slate-300 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading || !isPasswordStrong}
                    className="w-2/3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-2.5 text-xs font-semibold text-white shadow-sm hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {modalLoading ? "Updating..." : "Reset Password & Login"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default LoginPage;
