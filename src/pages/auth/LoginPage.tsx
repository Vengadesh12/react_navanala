import React, { useState } from "react";
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
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { showErrorAlert, showWarningAlert } from "../../utils/alerts";
import Swal from "sweetalert2";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", remember: true });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked, type } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleQuickFill = (email: string, password: string) => {
    setFormData({ email, password, remember: true });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.email.trim() || !formData.password.trim()) {
      await showWarningAlert("Missing Credentials", "Please provide both email and password to sign in.");
      return;
    }

    setLoggingIn(true);
    try {
      const redirectPath = await login({
        email: formData.email,
        password: formData.password,
        remember: formData.remember,
      });
      navigate(redirectPath, { replace: true });
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

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-900">
      {/* Left Brand Showcase Hero */}
      <section className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-12 xl:p-16 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 border-r border-indigo-900/30">
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 font-bold text-white shadow-lg shadow-indigo-500/30">
              <Shield sx={{ fontSize: 24 }} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">RoleVault</h1>
              <p className="text-xs font-semibold text-indigo-300">Enterprise Access & RBAC</p>
            </div>
          </div>

          <div className="mt-16 max-w-lg">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3.5 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
              <Key sx={{ fontSize: 14 }} /> Role-Based Access Control
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Intelligent access governance for modern teams.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-indigo-100/80">
              Manage multi-tier roles, granular permissions, member directories, and real-time security audit trails in one unified console.
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="relative z-10 grid gap-3.5 sm:grid-cols-2">
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-900/30 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-indigo-300">
              <CheckCircle sx={{ fontSize: 18 }} />
              <span className="text-xs font-bold text-white">Dynamic Role Matrix</span>
            </div>
            <p className="mt-1.5 text-xs text-indigo-100/70">
              Assign capabilities & navigation permissions instantly per role.
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-900/30 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle sx={{ fontSize: 18 }} />
              <span className="text-xs font-bold text-white">JWT Protected APIs</span>
            </div>
            <p className="mt-1.5 text-xs text-indigo-100/70">
              Secure endpoints backed by C# .NET Core and PostgreSQL.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-indigo-900/50 pt-4 text-xs text-indigo-300/60">
          <span>&copy; {new Date().getFullYear()} RoleVault Access System</span>
          <span>Version 2.4.0 (TypeScript)</span>
        </div>
      </section>

      {/* Right Form Panel */}
      <section className="col-span-1 lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="mb-4 inline-grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 lg:hidden">
              <Shield sx={{ fontSize: 24 }} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to your account</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your authorized credentials to access your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="admin@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Person sx={{ fontSize: 18 }} />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700" htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 cursor-pointer"
                  onClick={() =>
                    Swal.fire({
                      icon: "info",
                      title: "Password Reset",
                      text: "Contact your Super Administrator to reset your role access credentials.",
                      customClass: {
                        popup: "rounded-2xl p-6 font-sans shadow-2xl border border-slate-200",
                        confirmButton:
                          "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-indigo-800",
                      },
                      buttonsStyling: false,
                    })
                  }
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:from-indigo-700 hover:to-indigo-800 hover:shadow-md disabled:opacity-50"
            >
              {loggingIn ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowForward sx={{ fontSize: 16 }} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          {/* <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800">Super Admin (Vengadesh)</span>
                <p className="text-[10px] text-slate-400">vengadesh.kc@gmail.com</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-600 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => handleQuickFill("vengadesh.kc@gmail.com", "123456")}
              >
                Auto Fill
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
              <div>
                <span className="font-bold text-xs text-slate-800">Manager Account</span>
                <p className="text-[10px] text-slate-400">manager@gmail.com</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-600 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => handleQuickFill("manager@gmail.com", "123456")}
              >
                Auto Fill
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
              <div>
                <span className="font-bold text-xs text-slate-800">Employee Account</span>
                <p className="text-[10px] text-slate-400">test@gmail.com</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-purple-600 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => handleQuickFill("test@gmail.com", "123456")}
              >
                Auto Fill
              </button>
            </div>
          </div> */}
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
