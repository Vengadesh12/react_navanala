import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  ShieldOutlined,
  Tune,
  Add,
  Save,
  CheckCircleOutline,
  Close,
  Storage,
  CachedOutlined,
  Search,
  SearchOff,
  LockOutlined,
  VerifiedUserOutlined,
  AdminPanelSettingsOutlined,
  Key,
  HourglassEmpty,
  Refresh,
  Send,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { settingService } from "../../api/setting.service";
import { accessRequestService } from "../../api/accessRequest.service";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";
import { showConfirmDialog, showSuccessToast, showErrorToast, showWarningAlert } from "../../utils/alerts";
import type { SystemSetting, SettingCategory, CreateSettingRequest } from "../../types";

const TABS = [
  { key: "General", label: "General", icon: <Tune sx={{ fontSize: 18 }} /> },
  { key: "Security", label: "Security", icon: <ShieldOutlined sx={{ fontSize: 18 }} /> },
];

export const SettingsPage: React.FC = () => {
  const { user, can, refreshPermissions } = useAuth();
  const { isDarkMode, setDarkMode } = useTheme();

  // Role & Maintenance Mode Permission Logic
  const roleId = Number(user?.roleId);
  const roleName = (user?.roleName || "").toLowerCase();
  const isSuperAdminOrAdmin = roleId === 2 || roleName.includes("super admin") || roleName === "admin";
  const hasMaintenancePermission = isSuperAdminOrAdmin || can("settings.maintenance");

  const [maintenanceRequestPending, setMaintenanceRequestPending] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState<boolean>(false);
  const [requestReason, setRequestReason] = useState<string>("");
  const [requestPriority, setRequestPriority] = useState<"Low" | "Normal" | "High" | "Urgent">("Normal");
  const [submittingAccessRequest, setSubmittingAccessRequest] = useState<boolean>(false);

  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [categories, setCategories] = useState<SettingCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("General");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, string>>({
    app_name: "Role Management System",
    app_url: "http://localhost:5173",
    timezone: "(GMT+05:30) Asia/Kolkata",
    date_format: "DD MMM YYYY",
    items_per_page: "10",
    enable_registration: "true",
    email_verification: "true",
    session_timeout: "24 Hours",
    two_factor_auth: "false",
    password_expiry: "true",
    login_attempt_limit: "true",
    maintenance_mode: "false",
    dark_mode_enabled: "false",
  });
  const [savingGeneral, setSavingGeneral] = useState<boolean>(false);
  const [clearingCache, setClearingCache] = useState<boolean>(false);

  // Add Key Modal
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [keyFormData, setKeyFormData] = useState<CreateSettingRequest>({
    settingKey: "",
    settingValue: "",
    category: "General",
    description: "",
    dataType: "string",
  });
  const [savingKey, setSavingKey] = useState<boolean>(false);

  const checkMaintenanceRequest = useCallback(async () => {
    if (!user || hasMaintenancePermission) return;
    try {
      const myReqs = await accessRequestService.getMyRequests();
      const pending = myReqs.some(
        (r) => r.permissionKey.toLowerCase() === "settings.maintenance" && r.status === "Pending"
      );
      setMaintenanceRequestPending(pending);
    } catch {
      // Fallback
    }
  }, [user, hasMaintenancePermission]);

  useEffect(() => {
    checkMaintenanceRequest();
  }, [checkMaintenanceRequest]);

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await settingService.getCategories();
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }
    } catch {
      // Fallback
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await settingService.getSettings();
      setSettings(res.settings || []);
      if (res.categories && res.categories.length > 0) {
        setCategories(res.categories);
      }

      const map: Record<string, string> = { ...formValues };
      (res.settings || []).forEach((s) => {
        map[s.settingKey] = s.settingValue;
      });
      setFormValues(map);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to load settings from database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, [fetchSettings, fetchCategories]);

  // Handle single toggle ON / OFF with instant database persistence
  const handleToggle = async (key: string, label: string) => {
    if (key === "maintenance_mode" && !hasMaintenancePermission) {
      showErrorToast("Access Denied: Maintenance Mode requires 'settings.maintenance' permission or Super Admin / Admin role.");
      if (!maintenanceRequestPending) {
        setIsAccessModalOpen(true);
      }
      return;
    }

    if (key === "dark_mode_enabled") {
      const nextIsOn = !isDarkMode;
      setDarkMode(nextIsOn);
      setFormValues((prev) => ({ ...prev, [key]: nextIsOn ? "true" : "false" }));
      showSuccessToast(`${label} ${nextIsOn ? "enabled" : "disabled"}`);
      return;
    }

    const isCurrentlyOn = formValues[key] === "true";
    const nextIsOn = !isCurrentlyOn;
    const nextValue = nextIsOn ? "true" : "false";

    // Instant optimistic UI update
    setFormValues((prev) => ({ ...prev, [key]: nextValue }));

    try {
      await settingService.updateSettingsBulk({ [key]: nextValue });
      showSuccessToast(`${label} ${nextIsOn ? "enabled" : "disabled"}`);
    } catch (err: any) {
      // Revert if error
      setFormValues((prev) => ({ ...prev, [key]: isCurrentlyOn ? "true" : "false" }));
      showErrorToast(err?.message || "Failed to update setting in database.");
    }
  };

  // Handle general form change
  const handleChange = (key: string, val: string) => {
    setFormValues((prev) => ({ ...prev, [key]: val }));
  };

  // Save General Settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    try {
      await settingService.updateSettingsBulk({
        app_name: formValues.app_name,
        app_url: formValues.app_url,
        timezone: formValues.timezone,
        date_format: formValues.date_format,
        items_per_page: formValues.items_per_page,
        session_timeout: formValues.session_timeout,
      });
      showSuccessToast("General settings saved successfully!");
      fetchSettings();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to save general settings.");
    } finally {
      setSavingGeneral(false);
    }
  };

  // Clear Cache Action
  const handleClearCache = async () => {
    const confirmed = await showConfirmDialog(
      "Clear Application Cache?",
      "This will clear local workspace cache, purge temporary sessions, and re-fetch latest data from PostgreSQL."
    );

    if (!confirmed) return;

    setClearingCache(true);
    try {
      localStorage.removeItem("role_manage_cached_settings");
      sessionStorage.clear();
      await fetchSettings();
      await fetchCategories();
      showSuccessToast("Application cache cleared");
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to clear cache.");
    } finally {
      setClearingCache(false);
    }
  };

  // Create Custom Key Action
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyFormData.settingKey.trim()) {
      showErrorToast("Setting key is required.");
      return;
    }

    setSavingKey(true);
    try {
      await settingService.createSetting({
        settingKey: keyFormData.settingKey.trim(),
        settingValue: keyFormData.settingValue.trim(),
        category: keyFormData.category.trim(),
        description: keyFormData.description.trim(),
        dataType: keyFormData.dataType,
      });

      showSuccessToast(`Setting '${keyFormData.settingKey}' registered and saved in database!`);
      setIsKeyModalOpen(false);
      setKeyFormData({
        settingKey: "",
        settingValue: "",
        category: activeTab,
        description: "",
        dataType: "string",
      });
      fetchSettings();
      fetchCategories();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to register setting key.");
    } finally {
      setSavingKey(false);
    }
  };

  const renderToggleSwitch = (key: string, label: string, isChecked: boolean, disabled: boolean = false) => (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      onClick={() => {
        if (disabled) {
          if (key === "maintenance_mode") {
            if (maintenanceRequestPending) {
              showWarningAlert("Request Pending", "Your request for Maintenance Mode permission is currently pending review by a Super Admin.");
            } else {
              setIsAccessModalOpen(true);
            }
          }
          return;
        }
        handleToggle(key, label);
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${
        isChecked ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          isChecked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  const q = searchQuery.toLowerCase().trim();

  // Search filtering for General
  const matchGeneralSettings =
    !q ||
    [
      "general settings",
      "application name",
      "application url",
      "timezone",
      "date format",
      "items per page",
      formValues.app_name,
      formValues.app_url,
      formValues.timezone,
      formValues.date_format,
    ].some((t) => t?.toLowerCase().includes(q));

  const matchOtherPreferences =
    !q ||
    [
      "other preferences",
      "workspace preferences",
      "user registration",
      "email verification",
      "maintenance mode",
      "user session timeout",
      "session timeout",
      formValues.session_timeout,
    ].some((t) => t?.toLowerCase().includes(q));

  const matchSystemInformation =
    !q ||
    [
      "system information",
      "system version",
      "environment",
      "last updated",
      "admin",
      user?.name || "",
    ].some((t) => t?.toLowerCase().includes(q));

  const matchAnyGeneral =
    matchGeneralSettings || matchOtherPreferences || matchSystemInformation;

  // Search filtering for Security
  const matchSecuritySettings =
    !q ||
    [
      "security",
      "two-factor authentication",
      "2fa",
      "password expiry",
      "password",
      "login attempt limit",
      "account lockout",
      "rate limiting",
    ].some((t) => t?.toLowerCase().includes(q));

  // Custom setting keys for active tab (excluding pre-rendered core keys)
  const coreGeneralKeys = [
    "app_name",
    "app_url",
    "timezone",
    "date_format",
    "items_per_page",
    "enable_registration",
    "email_verification",
    "session_timeout",
    "maintenance_mode",
    "dark_mode_enabled",
  ];

  const coreSecurityKeys = [
    "two_factor_auth",
    "password_expiry",
    "login_attempt_limit",
  ];

  const customGeneralSettings = settings.filter(
    (s) =>
      s.category.toLowerCase() === "general" &&
      !coreGeneralKeys.includes(s.settingKey)
  );

  const customSecuritySettings = settings.filter(
    (s) =>
      s.category.toLowerCase() === "security" &&
      !coreSecurityKeys.includes(s.settingKey)
  );

  const is2FaEnabled = formValues.two_factor_auth === "true";

  return (
    <WorkspaceLayout
      permission="settings.view"
      label="Settings"
      icon="⚙"
      showHero={false}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search settings (e.g. application name, 2FA, timezone)..."
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Active Search Results Banner */}
        {q && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Search sx={{ fontSize: 18, color: "#6366f1" }} />
              <span>
                Filtering settings for{" "}
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

        {/* ========================================================================= */}
        {/* Header Title & Breadcrumb                                                */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <span className="text-slate-500 hover:text-slate-700 cursor-pointer">Home</span>
              <span>&gt;</span>
              <span className="text-slate-900 dark:text-white font-semibold">Settings</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Tab Navigation - General & Security Only                                */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-6 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 pb-3 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap relative ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: General Settings                                                  */}
        {/* ========================================================================= */}
        {activeTab === "General" && (
          !matchAnyGeneral ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
              <SearchOff sx={{ fontSize: 36, color: "#94a3b8" }} />
              <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                No settings matched &ldquo;{searchQuery}&rdquo;
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Try searching for application name, timezone, registration, or session timeout.
              </p>
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (General Settings + Other Preferences) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Card 1: General Settings */}
                {matchGeneralSettings && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                          <Settings sx={{ fontSize: 20 }} />
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-slate-900 dark:text-white">General Settings</h2>
                          <p className="text-xs text-slate-500">Configure basic workspace identity and parameters</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setKeyFormData({
                            settingKey: "",
                            settingValue: "",
                            category: "General",
                            description: "",
                            dataType: "string",
                          });
                          setIsKeyModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        <Add sx={{ fontSize: 16 }} />
                        <span>Add Key</span>
                      </button>
                    </div>

                    <form onSubmit={handleSaveGeneral} className="space-y-4 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Application Name
                        </label>
                        <input
                          type="text"
                          value={formValues.app_name || ""}
                          onChange={(e) => handleChange("app_name", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Application URL
                        </label>
                        <input
                          type="text"
                          value={formValues.app_url || ""}
                          onChange={(e) => handleChange("app_url", e.target.value)}
                          readOnly
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-600 dark:text-slate-400 cursor-not-allowed focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Default Timezone
                          </label>
                          <select
                            value={formValues.timezone || "(GMT+05:30) Asia/Kolkata"}
                            onChange={(e) => handleChange("timezone", e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                          >
                            <option value="(GMT+05:30) Asia/Kolkata">(GMT+05:30) Asia/Kolkata</option>
                            <option value="(GMT+00:00) UTC">(GMT+00:00) UTC</option>
                            <option value="(GMT-05:00) Eastern Time (US & Canada)">(GMT-05:00) Eastern Time (US & Canada)</option>
                            <option value="(GMT-08:00) Pacific Time (US & Canada)">(GMT-08:00) Pacific Time (US & Canada)</option>
                            <option value="(GMT+01:00) Central European Time">(GMT+01:00) Central European Time</option>
                            <option value="(GMT+08:00) Singapore, Beijing">(GMT+08:00) Singapore, Beijing</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Date Format
                          </label>
                          <select
                            value={formValues.date_format || "DD MMM YYYY"}
                            onChange={(e) => handleChange("date_format", e.target.value)}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                          >
                            <option value="DD MMM YYYY">DD MMM YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Items Per Page
                        </label>
                        <select
                          value={formValues.items_per_page || "10"}
                          onChange={(e) => handleChange("items_per_page", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                        >
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={savingGeneral}
                          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <Save sx={{ fontSize: 16 }} />
                          <span>{savingGeneral ? "Saving Changes..." : "Save Changes"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Card 2: Workspace Preferences */}
                {matchOtherPreferences && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <Tune sx={{ fontSize: 20 }} />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Preferences</h2>
                        <p className="text-xs text-slate-500">Access controls, registration policies, and timeouts</p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-4 pt-1">
                      {/* Enable Registration */}
                      <div className="flex items-center justify-between pt-3">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Enable Registration</h3>
                          <p className="text-[11px] text-slate-500">Allow new users to register on portal</p>
                        </div>
                        {renderToggleSwitch("enable_registration", "User Registration", formValues.enable_registration === "true")}
                      </div>

                      {/* Email Verification */}
                      <div className="flex items-center justify-between pt-4">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Email Verification</h3>
                          <p className="text-[11px] text-slate-500">Require email confirmation before initial login</p>
                        </div>
                        {renderToggleSwitch("email_verification", "Email Verification", formValues.email_verification === "true")}
                      </div>

                      {/* Maintenance Mode */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Maintenance Mode</h3>
                            {hasMaintenancePermission ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                <AdminPanelSettingsOutlined sx={{ fontSize: 13 }} />
                                {isSuperAdminOrAdmin ? "Admin Access" : "Permission Granted"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                <LockOutlined sx={{ fontSize: 13 }} />
                                Super Admin & Admin Only
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Restrict system access to administrative users only
                            {!hasMaintenancePermission && (
                              <span className="block sm:inline text-amber-600 dark:text-amber-400 font-medium sm:ml-1">
                                (Requires &lsquo;settings.maintenance&rsquo; permission)
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-center">
                          {!hasMaintenancePermission && (
                            maintenanceRequestPending ? (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                  <HourglassEmpty sx={{ fontSize: 13 }} />
                                  <span>Request Pending</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setCheckingStatus(true);
                                    try {
                                      await refreshPermissions();
                                      await checkMaintenanceRequest();
                                      showSuccessToast("Checked permission status!");
                                    } finally {
                                      setCheckingStatus(false);
                                    }
                                  }}
                                  disabled={checkingStatus}
                                  title="Check if access request has been approved"
                                  className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                                >
                                  <Refresh sx={{ fontSize: 14 }} className={checkingStatus ? "animate-spin" : ""} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setIsAccessModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 transition-colors shadow-2xs cursor-pointer"
                              >
                                <Key sx={{ fontSize: 14 }} />
                                <span>Request Access</span>
                              </button>
                            )
                          )}
                          <div>
                            {renderToggleSwitch(
                              "maintenance_mode",
                              "Maintenance Mode",
                              formValues.maintenance_mode === "true",
                              !hasMaintenancePermission
                            )}
                          </div>
                        </div>
                      </div>

                      {/* User Session Timeout */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">User Session Timeout</h3>
                          <p className="text-[11px] text-slate-500">Automatically log out inactive users</p>
                        </div>
                        <select
                          value={formValues.session_timeout || "24 Hours"}
                          onChange={async (e) => {
                            const val = e.target.value;
                            handleChange("session_timeout", val);
                            try {
                              await settingService.updateSettingsBulk({ session_timeout: val });
                              showSuccessToast(`Session timeout updated to ${val} in database!`);
                            } catch (err: any) {
                              showErrorToast(err?.message || "Failed to update timeout.");
                            }
                          }}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden min-w-[140px]"
                        >
                          <option value="15 Minutes">15 Minutes</option>
                          <option value="30 Minutes">30 Minutes</option>
                          <option value="1 Hour">1 Hour</option>
                          <option value="2 Hours">2 Hours</option>
                          <option value="24 Hours">24 Hours</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Custom General Keys */}
                {customGeneralSettings.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Additional General Keys
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-3">
                      {customGeneralSettings.map((setting) => {
                        const isBool =
                          setting.dataType === "boolean" ||
                          setting.settingValue === "true" ||
                          setting.settingValue === "false";
                        const isValTrue = (formValues[setting.settingKey] ?? setting.settingValue) === "true";

                        return (
                          <div
                            key={setting.id}
                            className="flex items-center justify-between pt-3"
                          >
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                                {setting.settingKey}
                              </h4>
                              <p className="text-[11px] text-slate-500">{setting.description}</p>
                            </div>
                            <div>
                              {isBool ? (
                                renderToggleSwitch(setting.settingKey, setting.settingKey, isValTrue)
                              ) : (
                                <input
                                  type={setting.dataType === "number" ? "number" : "text"}
                                  value={formValues[setting.settingKey] ?? setting.settingValue}
                                  onChange={(e) => handleChange(setting.settingKey, e.target.value)}
                                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (System Info & Cache Maintenance) */}
              <div className="lg:col-span-5 space-y-6">
                {/* System Information */}
                {matchSystemInformation && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <Storage sx={{ fontSize: 20 }} />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">System Information</h2>
                        <p className="text-xs text-slate-500">Environment build and deployment specs</p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs pt-1">
                      <div className="flex items-center justify-between py-2.5">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">System Version</span>
                        <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                          v1.0.0
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2.5">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Environment</span>
                        <span className="rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                          Development
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2.5">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Database Engine</span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">PostgreSQL 18</span>
                      </div>

                      <div className="flex items-center justify-between py-2.5">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Active Admin</span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold">{user?.name || "Admin User"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Workspace Cache Maintenance */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                      <CachedOutlined sx={{ fontSize: 20 }} />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Cache</h3>
                      <p className="text-xs text-slate-500">Purge temporary cache & reload</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Clears client-side session cache and refreshes settings from PostgreSQL.
                  </p>

                  <button
                    type="button"
                    onClick={handleClearCache}
                    disabled={clearingCache}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <CachedOutlined sx={{ fontSize: 16 }} />
                    <span>{clearingCache ? "Clearing Cache..." : "Purge Local Cache"}</span>
                  </button>
                </div>

                {/* Real-time DB Sync card */}
                
              </div>
            </div>
          )
        )}

        {/* ========================================================================= */}
        {/* TAB 2: Security Settings                                                 */}
        {/* ========================================================================= */}
        {activeTab === "Security" && (
          !matchSecuritySettings ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
              <SearchOff sx={{ fontSize: 36, color: "#94a3b8" }} />
              <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                No security settings matched &ldquo;{searchQuery}&rdquo;
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Try searching for 2FA, password expiry, or login attempts.
              </p>
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (Security Controls) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        <ShieldOutlined sx={{ fontSize: 22 }} />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Security Configurations</h2>
                        <p className="text-xs text-slate-500">
                          Manage multi-factor authentication, password policies, and login limits
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setKeyFormData({
                          settingKey: "",
                          settingValue: "",
                          category: "Security",
                          description: "",
                          dataType: "string",
                        });
                        setIsKeyModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      <Add sx={{ fontSize: 16 }} />
                      <span>Add Key</span>
                    </button>
                  </div>

                  {/* Core Security Controls */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-4">
                    {/* Two-Factor Authentication */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Two-Factor Authentication (2FA)
                          </h3>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              is2FaEnabled
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {is2FaEnabled ? "Enforced" : "Optional"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Require two-step verification for all administrative and elevated accounts
                        </p>
                      </div>
                      {renderToggleSwitch("two_factor_auth", "Two-Factor Authentication", formValues.two_factor_auth === "true")}
                    </div>

                    {/* Password Expiry */}
                    <div className="flex items-center justify-between pt-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Password Expiry</h3>
                          <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                            90 Days
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Force workspace members to cycle and update passwords periodically
                        </p>
                      </div>
                      {renderToggleSwitch("password_expiry", "Password Expiry", formValues.password_expiry === "true")}
                    </div>

                    {/* Login Attempt Limit */}
                    <div className="flex items-center justify-between pt-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">Login Attempt Limit</h3>
                          <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                            5 Attempts
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Automatically lock account after 5 consecutive failed login attempts
                        </p>
                      </div>
                      {renderToggleSwitch("login_attempt_limit", "Login Attempt Limit", formValues.login_attempt_limit === "true")}
                    </div>
                  </div>

                  {/* Dynamic Custom Security Setting Keys */}
                  {customSecuritySettings.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Additional Security Parameters
                      </h4>
                      {customSecuritySettings.map((setting) => {
                        const isBool =
                          setting.dataType === "boolean" ||
                          setting.settingValue === "true" ||
                          setting.settingValue === "false";
                        const isValTrue = (formValues[setting.settingKey] ?? setting.settingValue) === "true";

                        return (
                          <div
                            key={setting.id}
                            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40"
                          >
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                                {setting.settingKey}
                              </h4>
                              <p className="text-[11px] text-slate-500">{setting.description}</p>
                            </div>
                            <div>
                              {isBool ? (
                                renderToggleSwitch(setting.settingKey, setting.settingKey, isValTrue)
                              ) : (
                                <input
                                  type={setting.dataType === "number" ? "number" : "text"}
                                  value={formValues[setting.settingKey] ?? setting.settingValue}
                                  onChange={(e) => handleChange(setting.settingKey, e.target.value)}
                                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-1 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (Security Posture & DB Sync) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Security Posture Summary */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <VerifiedUserOutlined sx={{ fontSize: 20 }} />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Security Posture</h3>
                      <p className="text-xs text-slate-500">Active defense & access governance</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Security Tier:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {is2FaEnabled ? "High (2FA & RBAC)" : "Standard (RBAC)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Password Policy:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formValues.password_expiry === "true" ? "Enforced (90d)" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Brute Force Protection:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formValues.login_attempt_limit === "true" ? "Active (5 limits)" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real-time DB Sync */}
               
              </div>
            </div>
          )
        )}
      </div>

      {/* ========================================================================= */}
      {/* Modal: Add Setting Key (General / Security Only)                          */}
      {/* ========================================================================= */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-100 dark:border-slate-800 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Configuration Setting Key</h3>
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Setting Key *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. security_enforce_https"
                  value={keyFormData.settingKey}
                  onChange={(e) => setKeyFormData((prev) => ({ ...prev, settingKey: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={keyFormData.category}
                    onChange={(e) => setKeyFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="General">General</option>
                    <option value="Security">Security</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Data Type</label>
                  <select
                    value={keyFormData.dataType}
                    onChange={(e) => setKeyFormData((prev) => ({ ...prev, dataType: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                  >
                    <option value="string">String / Text</option>
                    <option value="boolean">Boolean (True/False)</option>
                    <option value="number">Numeric</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Initial Value</label>
                <input
                  type="text"
                  placeholder="e.g. true or 120"
                  value={keyFormData.settingValue}
                  onChange={(e) => setKeyFormData((prev) => ({ ...prev, settingValue: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Explain what this configuration controls..."
                  value={keyFormData.description}
                  onChange={(e) => setKeyFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKey}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {savingKey ? "Saving..." : "Save Setting Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Maintenance Mode Access Request Modal                                    */}
      {/* ========================================================================= */}
      {isAccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <Key sx={{ fontSize: 22 }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Request Maintenance Mode Access
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Submit permission request to Super Admin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccessModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200/70 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <LockOutlined sx={{ fontSize: 18, color: "#d97706", flexShrink: 0, mt: 0.2 }} />
              <div className="text-[11px] leading-relaxed">
                Permission <code className="px-1 py-0.5 font-bold rounded bg-amber-100 dark:bg-amber-900/60">settings.maintenance</code> allows switching the entire workspace into maintenance mode.
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!requestReason.trim()) {
                  showErrorToast("Please provide a reason for requesting this permission.");
                  return;
                }
                setSubmittingAccessRequest(true);
                try {
                  await accessRequestService.createRequest({
                    permissionKey: "settings.maintenance",
                    reason: requestReason.trim(),
                    priority: requestPriority,
                  });
                  showSuccessToast("Access request submitted successfully! Super Admin will review it.");
                  setIsAccessModalOpen(false);
                  setRequestReason("");
                  setMaintenanceRequestPending(true);
                } catch (err: any) {
                  showErrorToast(err?.message || "Failed to submit access request.");
                } finally {
                  setSubmittingAccessRequest(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Justification / Business Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="E.g., Need to toggle maintenance mode during scheduled upgrade..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Urgency / Priority
                </label>
                <select
                  value={requestPriority}
                  onChange={(e) => setRequestPriority(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:outline-hidden"
                >
                  <option value="Low">Low - General administrative inquiry</option>
                  <option value="Normal">Normal - Standard operational requirement</option>
                  <option value="High">High - Scheduled deployment or audit</option>
                  <option value="Urgent">Urgent - Critical outage / live issue resolution</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAccessModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAccessRequest}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <Send sx={{ fontSize: 14 }} />
                  <span>{submittingAccessRequest ? "Submitting..." : "Submit Request"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};

export default SettingsPage;
