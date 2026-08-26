import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  ShieldOutlined,
  NotificationsNoneOutlined,
  KeyOutlined,
  AccessTime,
  Tune,
  Add,
  Refresh,
  Save,
  CheckCircleOutline,
  Close,
  CategoryOutlined,
  StorageOutlined,
  LockOutlined,
  LanguageOutlined,
  PaletteOutlined,
  DeleteOutline,
  Storage,
  InfoOutlined,
  EmailOutlined,
  CloudUploadOutlined,
  CachedOutlined,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { settingService } from "../../api/setting.service";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";
import { showConfirmDialog, showSuccessToast, showErrorToast } from "../../utils/alerts";
import type { SystemSetting, SettingCategory, CreateSettingRequest } from "../../types";

const AVAILABLE_ICONS = [
  { key: "Tune", label: "General & Controls", icon: <Tune sx={{ fontSize: 18 }} /> },
  { key: "Settings", label: "Settings & System", icon: <Settings sx={{ fontSize: 18 }} /> },
  { key: "ShieldOutlined", label: "Security & MFA", icon: <ShieldOutlined sx={{ fontSize: 18 }} /> },
  { key: "NotificationsNoneOutlined", label: "Notifications & Alerts", icon: <NotificationsNoneOutlined sx={{ fontSize: 18 }} /> },
  { key: "KeyOutlined", label: "RBAC & Permissions", icon: <KeyOutlined sx={{ fontSize: 18 }} /> },
  { key: "AccessTime", label: "Sessions & Expiry", icon: <AccessTime sx={{ fontSize: 18 }} /> },
  { key: "StorageOutlined", label: "Database & Backups", icon: <StorageOutlined sx={{ fontSize: 18 }} /> },
  { key: "LanguageOutlined", label: "Email & Web", icon: <LanguageOutlined sx={{ fontSize: 18 }} /> },
  { key: "PaletteOutlined", label: "Theming & Appearance", icon: <PaletteOutlined sx={{ fontSize: 18 }} /> },
  { key: "CategoryOutlined", label: "Custom Group", icon: <CategoryOutlined sx={{ fontSize: 18 }} /> },
];

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode, setDarkMode } = useTheme();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [categories, setCategories] = useState<SettingCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("General");
  const [formValues, setFormValues] = useState<Record<string, string>>({
    app_name: "Role Management System",
    app_url: "http://localhost:5173",
    timezone: "(GMT+05:30) Asia/Kolkata",
    date_format: "DD MMM YYYY",
    items_per_page: "10",
    enable_registration: "true",
    email_verification: "true",
    session_timeout: "30 Minutes",
    two_factor_auth: "true",
    password_expiry: "true",
    login_attempt_limit: "true",
    maintenance_mode: "false",
    smtp_host: "smtp.gmail.com",
    smtp_port: "587",
    smtp_sender: "admin@rolemanage.io",
    email_alerts_enabled: "true",
    browser_push_enabled: "true",
    dark_mode_enabled: "false",
    auto_backup_enabled: "true",
  });
  const [savingGeneral, setSavingGeneral] = useState<boolean>(false);
  const [clearingCache, setClearingCache] = useState<boolean>(false);

  // Add Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [categoryName, setCategoryName] = useState<string>("Custom Category");
  const [categoryDescription, setCategoryDescription] = useState<string>("");
  const [categoryIcon, setCategoryIcon] = useState<string>("Tune");
  const [creatingCategory, setCreatingCategory] = useState<boolean>(false);

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
    const isCurrentlyOn = key === "dark_mode_enabled" ? isDarkMode : formValues[key] === "true";
    const nextIsOn = !isCurrentlyOn;
    const nextValue = nextIsOn ? "true" : "false";

    // Instant optimistic UI update
    setFormValues((prev) => ({ ...prev, [key]: nextValue }));

    if (key === "dark_mode_enabled") {
      setDarkMode(nextIsOn);
    }

    try {
      await settingService.updateSettingsBulk({ [key]: nextValue });
      showSuccessToast(`${label} ${nextIsOn ? "enabled" : "disabled"}`);
    } catch (err: any) {
      // Revert if error
      setFormValues((prev) => ({ ...prev, [key]: isCurrentlyOn ? "true" : "false" }));
      if (key === "dark_mode_enabled") {
        setDarkMode(isCurrentlyOn);
      }
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
      showSuccessToast("General settings saved and persisted successfully!");
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

  // Create Category Action
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      showErrorToast("Category name is required.");
      return;
    }

    setCreatingCategory(true);
    try {
      const res = await settingService.createCategory({
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        icon: categoryIcon,
      });

      showSuccessToast(res.message || `Category '${categoryName.trim()}' saved successfully!`);
      setIsCategoryModalOpen(false);
      setCategoryName("");
      setCategoryDescription("");
      setCategoryIcon("Tune");

      await fetchCategories();
      await fetchSettings();
      setActiveTab(categoryName.trim());
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to create category.");
    } finally {
      setCreatingCategory(false);
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

  const defaultTabs = ["General", "Security", "Email", "Notifications", "Appearance", "Backup"];
  const dbCategoryNames = categories.map((c) => c.name);
  const allTabs = Array.from(new Set([...defaultTabs, ...dbCategoryNames]));

  const renderToggleSwitch = (key: string, label: string, isChecked: boolean) => (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      onClick={() => handleToggle(key, label)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${isChecked ? "bg-indigo-600" : "bg-slate-300"
        }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isChecked ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  );

  return (
    <WorkspaceLayout permission="settings.view" label="Settings" icon="⚙" showHero={false}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">

        {/* ========================================================================= */}
        {/* Header Title & Breadcrumb                                                */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <span className="text-slate-500 hover:text-slate-700 cursor-pointer">Home</span>
              <span>&gt;</span>
              <span className="text-slate-900 font-semibold">Settings</span>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* Tab Navigation                                                           */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-6 overflow-x-auto border-b border-slate-200 pb-0 scrollbar-thin">
          {allTabs.map((tab) => {
            const isActive = activeTab.toLowerCase() === tab.toLowerCase();
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap relative ${isActive
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                <span>{tab}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* Main Tab Content Layout (2 Columns Grid)                                 */}
        {/* ========================================================================= */}
        {activeTab === "General" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left Column (General Settings + Other Preferences) */}
            <div className="lg:col-span-7 space-y-6">

              {/* Card 1: General Settings */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Settings sx={{ fontSize: 20 }} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">General Settings</h2>
                    <p className="text-xs text-slate-500">Configure basic application settings</p>
                  </div>
                </div>

                <form onSubmit={handleSaveGeneral} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Application Name</label>
                    <input
                      type="text"
                      value={formValues.app_name || ""}
                      onChange={(e) => handleChange("app_name", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Application URL</label>
                    <input
                      type="text"
                      value={formValues.app_url || ""}
                      onChange={(e) => handleChange("app_url", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Default Timezone</label>
                    <select
                      value={formValues.timezone || "(GMT+05:30) Asia/Kolkata"}
                      onChange={(e) => handleChange("timezone", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden bg-white"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date Format</label>
                    <select
                      value={formValues.date_format || "DD MMM YYYY"}
                      onChange={(e) => handleChange("date_format", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden bg-white"
                    >
                      <option value="DD MMM YYYY">DD MMM YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Items Per Page</label>
                    <select
                      value={formValues.items_per_page || "10"}
                      onChange={(e) => handleChange("items_per_page", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden bg-white"
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

              {/* Card 2: Other Preferences */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Tune sx={{ fontSize: 20 }} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Other Preferences</h2>
                    <p className="text-xs text-slate-500">Workspace registration and access defaults</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 space-y-4 pt-1">
                  {/* Enable Registration */}
                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">Enable Registration</h3>
                      <p className="text-[11px] text-slate-500">Allow new users to register</p>
                    </div>
                    {renderToggleSwitch("enable_registration", "User Registration", formValues.enable_registration === "true")}
                  </div>

                  {/* Email Verification */}
                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">Email Verification</h3>
                      <p className="text-[11px] text-slate-500">Require email verification for new users</p>
                    </div>
                    {renderToggleSwitch("email_verification", "Email Verification", formValues.email_verification === "true")}
                  </div>

                  {/* User Session Timeout */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">User Session Timeout</h3>
                      <p className="text-[11px] text-slate-500">Automatically logout user after inactivity</p>
                    </div>
                    <select
                      value={formValues.session_timeout || "30 Minutes"}
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
                      className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden bg-white min-w-[140px]"
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

            </div>

            {/* Right Column (System Info + Security Settings + System Maintenance) */}
            <div className="lg:col-span-5 space-y-6">

              {/* Card 1: System Information */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Storage sx={{ fontSize: 20 }} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">System Information</h2>
                    <p className="text-xs text-slate-500">Environment and deployment build</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-xs pt-1">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="font-semibold text-slate-600">System Version</span>
                    <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                      v1.0.0
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="font-semibold text-slate-600">Environment</span>
                    <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                      Development
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="font-semibold text-slate-600">Last Updated</span>
                    <span className="text-slate-700 font-medium">24 May 2025, 10:30 AM</span>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <span className="font-semibold text-slate-600">Admin</span>
                    <span className="text-slate-800 font-bold">{user?.name || "Admin User"}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Security Settings */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <ShieldOutlined sx={{ fontSize: 20 }} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Security Settings</h2>
                    <p className="text-xs text-slate-500">Authentication & password policies</p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 space-y-4 pt-1">
                  {/* Two-Factor Authentication */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">Two-Factor Authentication</h3>
                      <p className="text-[11px] text-slate-500">Require 2FA for all admin accounts</p>
                    </div>
                    {renderToggleSwitch("two_factor_auth", "Two-Factor Authentication", formValues.two_factor_auth === "true")}
                  </div>

                  {/* Password Expiry */}
                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">Password Expiry</h3>
                      <p className="text-[11px] text-slate-500">Force password change every 90 days</p>
                    </div>
                    {renderToggleSwitch("password_expiry", "Password Expiry", formValues.password_expiry === "true")}
                  </div>

                  {/* Login Attempt Limit */}
                  {/* <div className="flex items-center justify-between pt-4">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">Login Attempt Limit</h3>
                      <p className="text-[11px] text-slate-500">Lock account after 5 failed attempts</p>
                    </div>
                    {renderToggleSwitch("login_attempt_limit", "Login Attempt Limit", formValues.login_attempt_limit === "true")}
                  </div> */}
                </div>
              </div>

              {/* Card 3: System Maintenance */}


            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* Dynamic Content for other Tabs (Security, Email, Notifications, etc.)    */
          /* ========================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      {activeTab === "Security" && <ShieldOutlined sx={{ fontSize: 22 }} />}
                      {activeTab === "Email" && <EmailOutlined sx={{ fontSize: 22 }} />}
                      {activeTab === "Notifications" && <NotificationsNoneOutlined sx={{ fontSize: 22 }} />}
                      {activeTab === "Appearance" && <PaletteOutlined sx={{ fontSize: 22 }} />}
                      {activeTab === "Backup" && <StorageOutlined sx={{ fontSize: 22 }} />}
                      {!["Security", "Email", "Notifications", "Appearance", "Backup"].includes(activeTab) && (
                        <Tune sx={{ fontSize: 22 }} />
                      )}
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">{activeTab} Configurations</h2>
                      <p className="text-xs text-slate-500">Manage rules and parameters for {activeTab}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setKeyFormData({
                        settingKey: "",
                        settingValue: "",
                        category: activeTab,
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

                {/* Specific Tab Features */}
                {activeTab === "Security" && (
                  <div className="divide-y divide-slate-100 space-y-4">
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">Two-Factor Authentication</h3>
                        <p className="text-[11px] text-slate-500">Require 2FA for all admin accounts</p>
                      </div>
                      {renderToggleSwitch("two_factor_auth", "Two-Factor Authentication", formValues.two_factor_auth === "true")}
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">Password Expiry</h3>
                        <p className="text-[11px] text-slate-500">Force password change every 90 days</p>
                      </div>
                      {renderToggleSwitch("password_expiry", "Password Expiry", formValues.password_expiry === "true")}
                    </div>
                  </div>
                )}

                {activeTab === "Email" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Host</label>
                      <input
                        type="text"
                        value={formValues.smtp_host || "smtp.gmail.com"}
                        onChange={(e) => handleChange("smtp_host", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">SMTP Port</label>
                        <input
                          type="text"
                          value={formValues.smtp_port || "587"}
                          onChange={(e) => handleChange("smtp_port", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Sender Email</label>
                        <input
                          type="text"
                          value={formValues.smtp_sender || "admin@rolemanage.io"}
                          onChange={(e) => handleChange("smtp_sender", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await settingService.updateSettingsBulk({
                          smtp_host: formValues.smtp_host,
                          smtp_port: formValues.smtp_port,
                          smtp_sender: formValues.smtp_sender,
                        });
                        showSuccessToast("Email SMTP parameters updated in database!");
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      <Save sx={{ fontSize: 16 }} />
                      <span>Save Email Settings</span>
                    </button>
                  </div>
                )}

                {activeTab === "Notifications" && (
                  <div className="divide-y divide-slate-100 space-y-4">
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">Email Alerts</h3>
                        <p className="text-[11px] text-slate-500">Send automatic email notifications on privilege changes</p>
                      </div>
                      {renderToggleSwitch("email_alerts_enabled", "Email Alerts", formValues.email_alerts_enabled === "true")}
                    </div>
                    <div className="flex items-center justify-between pt-4">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">Browser Push Notifications</h3>
                        <p className="text-[11px] text-slate-500">Show desktop push notifications for urgent security events</p>
                      </div>
                      {renderToggleSwitch("browser_push_enabled", "Browser Push", formValues.browser_push_enabled === "true")}
                    </div>
                  </div>
                )}

                {activeTab === "Appearance" && (
                  <div className="divide-y divide-slate-100 space-y-4">
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">Dark Mode Theme</h3>
                        <p className="text-[11px] text-slate-500">Switch workspace theme to dark palette</p>
                      </div>
                      {renderToggleSwitch("dark_mode_enabled", "Dark Mode", isDarkMode)}
                    </div>
                  </div>
                )}

                {activeTab === "Backup" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">Automatic Nightly Backup</h3>
                        <p className="text-[11px] text-slate-500">Create daily snapshot of PostgreSQL database at midnight</p>
                      </div>
                      {renderToggleSwitch("auto_backup_enabled", "Auto Backup", formValues.auto_backup_enabled === "true")}
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Last Backup Created:</span>
                        <span className="text-slate-800 font-mono">Today, 03:00 AM UTC</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Snapshot Size:</span>
                        <span className="text-slate-800 font-mono">14.2 MB</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Render any custom category setting keys */}
                {!["Security", "Email", "Notifications", "Appearance", "Backup"].includes(activeTab) && (
                  <div className="space-y-3">
                    {settings.filter((s) => s.category.toLowerCase() === activeTab.toLowerCase()).length > 0 ? (
                      settings
                        .filter((s) => s.category.toLowerCase() === activeTab.toLowerCase())
                        .map((setting) => {
                          const isBool =
                            setting.dataType === "boolean" ||
                            setting.settingValue === "true" ||
                            setting.settingValue === "false";
                          const isValTrue = (formValues[setting.settingKey] ?? setting.settingValue) === "true";

                          return (
                            <div
                              key={setting.id}
                              className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50"
                            >
                              <div>
                                <h3 className="text-xs font-bold text-slate-800 font-mono">{setting.settingKey}</h3>
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
                                    className="rounded-xl border border-slate-200 px-3 py-1 text-xs text-slate-800 bg-white"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="py-10 text-center text-xs text-slate-400">
                        No settings in this category yet. Click &quot;Add Key&quot; above to add one.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column Summary */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircleOutline sx={{ fontSize: 18, color: "#10b981" }} />
                  <span>Real-Time Database Sync</span>
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Toggling any setting or modifying configuration parameters automatically updates and commits the values to PostgreSQL.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* Modal: Create Category & Save to DB                                      */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  <CategoryOutlined sx={{ fontSize: 20 }} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Create Configuration Category</h3>
                  <p className="text-[11px] text-slate-500">Saves a new setting group directly into the database.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Integrations, Billing, SMTP Email, Cloud Storage"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Explain what configuration settings belong to this category..."
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category Icon</label>
                <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
                  {AVAILABLE_ICONS.map((item) => {
                    const isSelected = categoryIcon === item.key;
                    return (
                      <button
                        type="button"
                        key={item.key}
                        onClick={() => setCategoryIcon(item.key)}
                        title={item.label}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                      >
                        {item.icon}
                        <span className="text-[9px] font-semibold mt-1 truncate max-w-full">{item.key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCategory}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Save sx={{ fontSize: 16 }} />
                  <span>{creatingCategory ? "Saving to DB..." : "Create & Save in DB"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Modal: Add Setting Key                                                   */}
      {/* ========================================================================= */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Configuration Setting Key</h3>
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Setting Key *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. security_enforce_https"
                  value={keyFormData.settingKey}
                  onChange={(e) => setKeyFormData((prev) => ({ ...prev, settingKey: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-mono text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={keyFormData.category}
                    onChange={(e) => setKeyFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden bg-white"
                  >
                    {allTabs.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data Type</label>
                  <select
                    value={keyFormData.dataType}
                    onChange={(e) => setKeyFormData((prev) => ({ ...prev, dataType: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden bg-white"
                  >
                    <option value="string">String / Text</option>
                    <option value="boolean">Boolean (True/False)</option>
                    <option value="number">Numeric</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Value</label>
                <input
                  type="text"
                  placeholder="e.g. true or 120"
                  value={keyFormData.settingValue}
                  onChange={(e) => setKeyFormData((prev) => ({ ...prev, settingValue: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Explain what this configuration controls..."
                  value={keyFormData.description}
                  onChange={(e) => setKeyFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
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
    </WorkspaceLayout>
  );
};

export default SettingsPage;
