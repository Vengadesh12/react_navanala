import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  LoginOutlined,
  CollectionsBookmarkOutlined,
  PeopleOutline,
  SettingsOutlined,
  ArrowBack,
  ArrowForward,
  Close,
  Visibility,
  VisibilityOff,
  MarkEmailRead,
  VpnKey,
  Mail,
  Favorite,
  VisibilityOutlined,
  Menu,
  Verified,
  Tune,
  ShieldOutlined,
  PersonAddOutlined,
} from "@mui/icons-material";
import { OtpInput } from "../../components/common/OtpInput";
import { showSuccessToast, showWarningAlert } from "../../utils/alerts";

// SVG Social Icons
const GoogleIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TwitterIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

const InstagramIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

type DummyMenuTab = "login" | "works" | "community" | "settings";

export const IndexedPage: React.FC = () => {
  // Active Menu in Dummy Sidebar (4 menus)
  const [activeMenu, setActiveMenu] = useState<DummyMenuTab>("login");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Form State (Mockup Login)
  const [email, setEmail] = useState("designer@uisocial.com");
  const [password, setPassword] = useState("Password@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  // Forgot Password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Language Dropdown
  const [selectedLanguage, setSelectedLanguage] = useState("🇬🇧 EN");
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Work slide index
  const [workSlide, setWorkSlide] = useState(0);
  const slides = [
    {
      author: "Andrew.ui",
      title: "UI & Illustration",
      avatar: "/andrew-avatar.png",
      tag: "Selected Works",
    },
    {
      author: "Elena.design",
      title: "3D Visuals & Motion",
      avatar: "/andrew-avatar.png",
      tag: "Featured Concept",
    },
  ];

  // Dummy Sidebar Menus Config (4 Menus)
  const dummyMenus = [
    {
      id: "login" as DummyMenuTab,
      label: "Login Page",
      subtitle: "Authentication View",
      icon: <LoginOutlined sx={{ fontSize: 20 }} />,
      badge: "Mockup",
    },
    {
      id: "works" as DummyMenuTab,
      label: "Selected Works",
      subtitle: "Artwork Gallery",
      icon: <CollectionsBookmarkOutlined sx={{ fontSize: 20 }} />,
      badge: "6 Arts",
    },
    {
      id: "community" as DummyMenuTab,
      label: "Community",
      subtitle: "Designers Network",
      icon: <PeopleOutline sx={{ fontSize: 20 }} />,
      badge: "2.4k",
    },
    {
      id: "settings" as DummyMenuTab,
      label: "Settings",
      subtitle: "Preferences & UI",
      icon: <SettingsOutlined sx={{ fontSize: 20 }} />,
    },
  ];

  const handleNextSlide = () => {
    setWorkSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setWorkSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showWarningAlert("Missing Fields", "Please enter both your email and password.");
      return;
    }

    setLoggingIn(true);
    setTimeout(() => {
      setLoggingIn(false);
      showSuccessToast(`Logged in successfully as ${email}!`);
    }, 600);
  };

  // Pure frontend Forgot password workflow
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showWarningAlert("Email Required", "Please enter your email.");
      return;
    }
    showSuccessToast("6-digit reset code sent to your email!");
    setForgotStep(2);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      showWarningAlert("Invalid Code", "Please enter the full 6-digit verification code.");
      return;
    }
    showSuccessToast("Code verified! Set your new password.");
    setForgotStep(3);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword || newPassword.length < 8) {
      showWarningAlert("Password Mismatch", "Passwords must match and be at least 8 characters.");
      return;
    }
    showSuccessToast("Password successfully reset!");
    setEmail(forgotEmail);
    setPassword(newPassword);
    setForgotModalOpen(false);
  };

  const currentSlide = slides[workSlide];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#080d1a] text-slate-100 font-sans">
      {/* ========================================================================= */}
      {/* DUMMY SIDEBAR (Left Navigation with 4 Menus)                              */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col justify-between bg-[#0b1120] border-r border-slate-800/80 p-5 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0 space-y-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-[#ea3829] to-orange-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-red-500/20 ring-1 ring-white/20">
                UI
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-white leading-tight">
                  UISOCIAL
                </h1>
                <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
                  Designer Hub
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <Close sx={{ fontSize: 20 }} />
            </button>
          </div>

          {/* Navigation Section: 4 Menus */}
          <div className="space-y-1 flex-1 overflow-y-auto pr-1">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Navigation Menus
            </p>

            {dummyMenus.map((menu) => {
              const isActive = activeMenu === menu.id;
              return (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() => {
                    setActiveMenu(menu.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-2xl px-3.5 py-3 text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-[#ea3829] to-[#d82d1f] text-white shadow-md shadow-red-500/20 font-bold"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={isActive ? "text-white" : "text-slate-400"}>
                      {menu.icon}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-bold leading-tight">{menu.label}</div>
                      <div
                        className={`text-[10px] leading-tight ${
                          isActive ? "text-white/80" : "text-slate-400"
                        }`}
                      >
                        {menu.subtitle}
                      </div>
                    </div>
                  </div>

                  {menu.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {menu.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Profile Info & Return to Main Workspace */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full overflow-hidden border border-white/20 bg-sky-400">
                <img src="/andrew-avatar.png" alt="Andrew" className="h-full w-full object-cover" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold text-white truncate">Andrew.ui</div>
                <div className="text-[10px] text-slate-400 truncate">Online Designer</div>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
          </div>

          <Link
            to="/dashboard"
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowBack sx={{ fontSize: 14 }} />
            <span>Return to Workspace</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA: Renders Different Views Based on Active Menu           */}
      {/* ========================================================================= */}
      <main className="flex-1 min-w-0 flex flex-col bg-[#080d1a] relative">
        {/* Mobile Header Bar */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-[#0b1120] border-b border-slate-800">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <Menu sx={{ fontSize: 22 }} />
          </button>

          <span className="text-sm font-black text-white">UISOCIAL</span>

          <div className="h-7 w-7 rounded-full overflow-hidden bg-sky-400">
            <img src="/andrew-avatar.png" alt="Andrew" className="h-full w-full object-cover" />
          </div>
        </div>

        {/* VIEW 1: Mockup Login Page */}
        {activeMenu === "login" && (
          <div
            className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden bg-cover bg-center"
            style={{
              backgroundImage: `radial-gradient(circle at center, rgba(15, 23, 42, 0.75), rgba(2, 6, 23, 0.95)), url('/space-art.jpg')`,
            }}
          >
            {/* Main Floating Dual-Card Container */}
            <div className="relative z-10 w-full max-w-[1020px] rounded-[36px] bg-white shadow-2xl ring-1 ring-white/20 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px] animate-fadeIn text-slate-900">
              {/* Left Column: Visual Artwork Card */}
              <div className="lg:col-span-6 p-3 sm:p-3.5 flex flex-col">
                <div
                  className="relative flex-1 rounded-[28px] overflow-hidden p-6 sm:p-8 flex flex-col justify-between text-white bg-slate-900 bg-cover bg-center shadow-inner"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.15) 50%, rgba(0, 0, 0, 0.75)), url('/space-art.jpg')`,
                  }}
                >
                  {/* Top Navigation */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xs font-medium tracking-wide text-white/90 hover:text-white cursor-pointer select-none">
                      {currentSlide.tag}
                    </span>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => showSuccessToast("Sign Up clicked")}
                        className="text-xs font-medium text-white/90 hover:text-white transition-colors cursor-pointer"
                      >
                        Sign Up
                      </button>
                      <button
                        type="button"
                        onClick={() => showSuccessToast("Join Us clicked")}
                        className="rounded-full border border-white/40 bg-white/10 backdrop-blur-xs px-4 py-1 text-xs font-medium text-white hover:bg-white/20 transition-all cursor-pointer shadow-xs"
                      >
                        Join Us
                      </button>
                    </div>
                  </div>

                  {/* Bottom Profile Info & Slide Arrows */}
                  <div className="relative z-10 flex items-center justify-between pt-24">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 rounded-full overflow-hidden border-2 border-white/60 shadow-md bg-sky-400">
                        <img
                          src={currentSlide.avatar}
                          alt={currentSlide.author}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight tracking-tight">
                          {currentSlide.author}
                        </h4>
                        <p className="text-[11px] font-medium text-white/70 leading-tight mt-0.5">
                          {currentSlide.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePrevSlide}
                        aria-label="Previous artwork"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-black/20 backdrop-blur-xs text-white hover:bg-white hover:text-slate-900 transition-all cursor-pointer active:scale-95 shadow-xs"
                      >
                        <ArrowBack sx={{ fontSize: 14 }} />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextSlide}
                        aria-label="Next artwork"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-black/20 backdrop-blur-xs text-white hover:bg-white hover:text-slate-900 transition-all cursor-pointer active:scale-95 shadow-xs"
                      >
                        <ArrowForward sx={{ fontSize: 14 }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Clean White Login Interface */}
              <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-between bg-white text-slate-900">
                {/* Top Bar: Brand Logo & Language Selector */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black tracking-tight text-slate-900 select-none">
                    UISOCIAL
                  </span>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setLangMenuOpen(!langMenuOpen)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>{selectedLanguage}</span>
                      <span className="text-[9px] text-slate-400">▼</span>
                    </button>

                    {langMenuOpen && (
                      <div className="absolute right-0 mt-1.5 w-28 rounded-xl bg-white p-1 shadow-lg border border-slate-100 text-xs z-30 animate-fadeIn">
                        {["🇬🇧 EN", "🇫🇷 FR", "🇩🇪 DE", "🇪🇸 ES"].map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => {
                              setSelectedLanguage(lang);
                              setLangMenuOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 font-medium text-slate-700 cursor-pointer"
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Content Area */}
                <div className="my-auto py-6 max-w-sm w-full mx-auto space-y-6">
                  <div className="text-center">
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                      Hi Designer
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5">
                      Welcome to UISOCIAL
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Email Input */}
                    <div>
                      <input
                        id="designerEmail"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#ea3829] focus:outline-hidden focus:ring-1 focus:ring-[#ea3829]/30 transition-all shadow-2xs"
                      />
                    </div>

                    {/* Password Input */}
                    <div>
                      <div className="relative">
                        <input
                          id="designerPassword"
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#ea3829] focus:outline-hidden focus:ring-1 focus:ring-[#ea3829]/30 transition-all shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <VisibilityOff sx={{ fontSize: 17 }} />
                          ) : (
                            <Visibility sx={{ fontSize: 17 }} />
                          )}
                        </button>
                      </div>

                      {/* Forgot Password Link */}
                      <div className="text-right pt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(email);
                            setForgotStep(1);
                            setForgotModalOpen(true);
                          }}
                          className="text-[11px] sm:text-xs font-semibold text-[#ea3829] hover:underline cursor-pointer transition-colors"
                        >
                          Forgot password ?
                        </button>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center py-2">
                      <div className="w-full border-t border-slate-200" />
                      <span className="bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider absolute">
                        or
                      </span>
                    </div>

                    {/* Google Login Button */}
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          showSuccessToast("Google SSO simulated");
                        }}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2.5 transition-all shadow-2xs cursor-pointer active:scale-[0.99]"
                      >
                        <span>Login with Google</span>
                        <GoogleIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Primary Login Button */}
                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={loggingIn}
                        className="w-full rounded-xl bg-[#ea3829] hover:bg-[#d82d1f] py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-red-500/25 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {loggingIn ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <span>Login</span>
                        )}
                      </button>
                    </div>

                    {/* Sign Up Prompt */}
                    <div className="text-center pt-2 text-xs text-slate-500 font-medium">
                      <span>Don&apos;t have an account? </span>
                      <button
                        type="button"
                        onClick={() => showSuccessToast("Sign up modal opened")}
                        className="font-bold text-[#ea3829] hover:underline cursor-pointer"
                      >
                        Sign up
                      </button>
                    </div>
                  </form>
                </div>

                {/* Bottom Social Media Icons Row */}
                <div className="flex items-center justify-center gap-5 text-slate-500 pt-2">
                  <button
                    type="button"
                    onClick={() => showSuccessToast("Facebook sign-in")}
                    className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer p-1"
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => showSuccessToast("Twitter sign-in")}
                    className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer p-1"
                    aria-label="Twitter"
                  >
                    <TwitterIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => showSuccessToast("LinkedIn sign-in")}
                    className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer p-1"
                    aria-label="LinkedIn"
                  >
                    <LinkedInIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => showSuccessToast("Instagram sign-in")}
                    className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer p-1"
                    aria-label="Instagram"
                  >
                    <InstagramIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Selected Works (Artwork Gallery) */}
        {activeMenu === "works" && (
          <div className="p-6 sm:p-10 max-w-6xl w-full mx-auto space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Selected Works</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Curated digital illustrations & 3D concepts from Andrew.ui
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-red-500/10 text-[#ea3829] border border-red-500/20 px-3 py-1 text-xs font-bold">
                  ★ Featured Portfolio
                </span>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Cosmic Odyssey", tag: "3D Art", likes: 842, views: "3.2k", img: "/space-art.jpg" },
                { title: "Character Design: Andrew", tag: "Illustration", likes: 1240, views: "5.8k", img: "/andrew-avatar.png" },
                { title: "Alien Horizon Nebula", tag: "Concept", likes: 960, views: "4.1k", img: "/space-art.jpg" },
                { title: "Isometric Cyber District", tag: "Environment", likes: 620, views: "2.7k", img: "/space-art.jpg" },
                { title: "Stylized Avatar Creator", tag: "3D Assets", likes: 1450, views: "6.9k", img: "/andrew-avatar.png" },
                { title: "Exoplanet Mountains", tag: "Digital Matte", likes: 780, views: "3.5k", img: "/space-art.jpg" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="group rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-md hover:shadow-xl flex flex-col"
                >
                  <div className="h-48 overflow-hidden relative bg-slate-950">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 right-3 rounded-full bg-black/60 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-white">
                      {item.tag}
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <h3 className="font-bold text-sm text-white group-hover:text-[#ea3829] transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <Favorite sx={{ fontSize: 14, color: "#ea3829" }} /> {item.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <VisibilityOutlined sx={{ fontSize: 14 }} /> {item.views}
                      </span>
                      <button
                        type="button"
                        onClick={() => showSuccessToast(`Viewing ${item.title}`)}
                        className="text-[#ea3829] font-bold hover:underline cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: Community & Designers Network */}
        {activeMenu === "community" && (
          <div className="p-6 sm:p-10 max-w-6xl w-full mx-auto space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">UISOCIAL Community</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Connect with top digital artists, UI designers, and 3D creators
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 text-xs font-bold">
                  ● 2,410 Online
                </span>
              </div>
            </div>

            {/* Creators Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: "Andrew.ui", role: "3D & UI Illustrator", followers: "24.5k", projects: 42, avatar: "/andrew-avatar.png" },
                { name: "Elena Rostova", role: "Motion & Brand Designer", followers: "18.2k", projects: 36, avatar: "/andrew-avatar.png" },
                { name: "Marcus Vance", role: "Concept Artist & Matte Painter", followers: "31.9k", projects: 58, avatar: "/andrew-avatar.png" },
                { name: "Sophia Chen", role: "Design Systems & Product Lead", followers: "14.7k", projects: 29, avatar: "/andrew-avatar.png" },
                { name: "Liam O'Connor", role: "Game Environment Artist", followers: "22.1k", projects: 45, avatar: "/andrew-avatar.png" },
                { name: "Zara Al-Mansoor", role: "Visual Identity & 3D Typography", followers: "16.8k", projects: 31, avatar: "/andrew-avatar.png" },
              ].map((creator, idx) => (
                <div
                  key={idx}
                  className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-slate-700 bg-sky-400">
                        <img src={creator.avatar} alt={creator.name} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white flex items-center gap-1">
                          <span>{creator.name}</span>
                          <Verified sx={{ fontSize: 15, color: "#38bdf8" }} />
                        </h3>
                        <p className="text-xs text-slate-400">{creator.role}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center py-2.5 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-white">{creator.followers}</div>
                      <div className="text-[10px] text-slate-500">Followers</div>
                    </div>
                    <div>
                      <div className="font-bold text-white">{creator.projects}</div>
                      <div className="text-[10px] text-slate-500">Projects</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => showSuccessToast(`Followed ${creator.name}!`)}
                    className="w-full rounded-xl bg-slate-800 hover:bg-[#ea3829] hover:text-white py-2 text-xs font-bold text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PersonAddOutlined sx={{ fontSize: 16 }} />
                    <span>Follow Creator</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: Settings & Configuration */}
        {activeMenu === "settings" && (
          <div className="p-6 sm:p-10 max-w-4xl w-full mx-auto space-y-8 animate-fadeIn">
            <div className="border-b border-slate-800 pb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">UISOCIAL Settings</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Manage your profile, visual themes, language, and notification preferences
              </p>
            </div>

            <div className="space-y-6">
              {/* Profile Card */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-[#ea3829]">
                    <Tune sx={{ fontSize: 20 }} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Account Information</h3>
                    <p className="text-xs text-slate-400">Personalize your creative identity</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      defaultValue="Andrew.ui"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white focus:border-[#ea3829] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Creative Specialty</label>
                    <input
                      type="text"
                      defaultValue="UI & 3D Illustration"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white focus:border-[#ea3829] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences Toggles */}
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                    <ShieldOutlined sx={{ fontSize: 20 }} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Security & Preferences</h3>
                    <p className="text-xs text-slate-400">Workspace controls and notifications</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-800 text-xs space-y-3 pt-2">
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <div className="font-bold text-white">Email Notifications</div>
                      <div className="text-slate-400">Receive alerts when someone likes or comments</div>
                    </div>
                    <span className="h-6 w-11 rounded-full bg-[#ea3829] relative inline-flex items-center p-1 cursor-pointer">
                      <span className="h-4 w-4 rounded-full bg-white ml-auto" />
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <div className="font-bold text-white">Two-Factor Authentication</div>
                      <div className="text-slate-400">Enforce 6-digit email OTP verification on sign-in</div>
                    </div>
                    <span className="h-6 w-11 rounded-full bg-[#ea3829] relative inline-flex items-center p-1 cursor-pointer">
                      <span className="h-4 w-4 rounded-full bg-white ml-auto" />
                    </span>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => showSuccessToast("Settings saved successfully!")}
                    className="rounded-xl bg-[#ea3829] hover:bg-[#d82d1f] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* Forgot Password Modal (Frontend Simulator)                                */}
      {/* ========================================================================= */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-fadeIn text-slate-900">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-red-50 text-[#ea3829]">
                  <VpnKey sx={{ fontSize: 22 }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
                  <p className="text-xs text-slate-500">Step {forgotStep} of 3 &bull; Verification</p>
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
              <div className={`h-1.5 rounded-full ${forgotStep >= 1 ? "bg-[#ea3829]" : "bg-slate-200"}`} />
              <div className={`h-1.5 rounded-full ${forgotStep >= 2 ? "bg-[#ea3829]" : "bg-slate-200"}`} />
              <div className={`h-1.5 rounded-full ${forgotStep >= 3 ? "bg-[#ea3829]" : "bg-slate-200"}`} />
            </div>

            {/* Step 1: Request OTP */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your registered email. We will simulate sending a 6-digit verification code.
                </p>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="resetEmail">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="resetEmail"
                      type="email"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs text-slate-900 shadow-2xs focus:border-[#ea3829] focus:outline-hidden focus:ring-1 focus:ring-[#ea3829]/30"
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
                    className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 rounded-xl bg-[#ea3829] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#d82d1f] cursor-pointer"
                  >
                    Send Code
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Verify OTP */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="rounded-xl bg-red-50/70 p-3.5 border border-red-100 flex items-start gap-2.5 text-xs text-red-950">
                  <MarkEmailRead sx={{ fontSize: 20 }} className="text-[#ea3829] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Verification code sent:</span> Enter any 6-digit code for <strong>{forgotEmail}</strong>.
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
                    6-Digit Verification Code
                  </label>
                  <OtpInput
                    value={otpCode}
                    onChange={(val) => setOtpCode(val)}
                    idPrefix="resetOtp"
                    autoFocus={true}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={otpCode.length !== 6}
                    className="w-1/2 rounded-xl bg-[#ea3829] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#d82d1f] disabled:opacity-50 cursor-pointer"
                  >
                    Verify Code
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: New Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="newPass">
                    New Password
                  </label>
                  <input
                    id="newPass"
                    type="password"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs text-slate-900 shadow-2xs focus:border-[#ea3829] focus:outline-hidden"
                    placeholder="Enter new password (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700" htmlFor="confirmPass">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPass"
                    type="password"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs text-slate-900 shadow-2xs focus:border-[#ea3829] focus:outline-hidden"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(2)}
                    className="w-1/3 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 rounded-xl bg-[#ea3829] py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#d82d1f] cursor-pointer"
                  >
                    Save & Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IndexedPage;
