import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { FirstLoginChangePasswordModal } from "../auth/FirstLoginChangePasswordModal";
import { useAuth } from "../../hooks/useAuth";
import { getFirstAccessiblePath } from "../../config/workspace.config";

export interface WorkspaceLayoutProps {
  permission?: string;
  label: string;
  icon?: string;
  showHero?: boolean;
  showTopbar?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  showSearchBar?: boolean;
  children: React.ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  permission,
  label,
  icon = "◫",
  showHero = true,
  showTopbar = true,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  showSearchBar,
  children,
}) => {
  const navigate = useNavigate();
  const { user, logout, refreshPermissions, can } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (Array.isArray(user.permissions)) {
      const isAllowed = can(permission);
      if (!isAllowed) {
        navigate(getFirstAccessiblePath(user), { replace: true });
      }
      setChecking(false);
      return;
    }

    refreshPermissions()
      .then(() => {
        const isAllowed = can(permission);
        if (!isAllowed) {
          navigate(getFirstAccessiblePath(user), { replace: true });
        }
      })
      .catch(() => {
        if (!can(permission)) {
          navigate(getFirstAccessiblePath(user), { replace: true });
        }
      })
      .finally(() => {
        setChecking(false);
      });
  }, [navigate, permission, user]);

  if (checking) {
    return <LoadingSpinner fullScreen message="Verifying workspace credentials..." />;
  }

  if (!user || !can(permission)) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        user={user}
        activeKey={permission}
        menuOpen={menuOpen}
        onCloseMenu={() => setMenuOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Modern Sticky Topbar */}
        {showTopbar && (
          <Topbar
            user={user}
            label={label}
            onOpenMenu={() => setMenuOpen(true)}
            onLogout={handleLogout}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
            showSearchBar={showSearchBar}
          />
        )}

        {/* Optional Page Hero */}
        {showHero && (
          <section className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white">
            <div className="mx-auto max-w-7xl">
              <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-lg backdrop-blur-sm">
                  {icon}
                </span>
                {label} Workspace
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Role-based access management and real-time controls for {label.toLowerCase()}.
              </p>
            </div>
          </section>
        )}

        {/* Children View Content */}
        <div className="flex-1 pb-12">{children}</div>
      </main>

      {/* First-Login Mandatory Password Change Modal */}
      {user?.isFirstLogin && (
        <FirstLoginChangePasswordModal isOpen={Boolean(user.isFirstLogin)} />
      )}
    </div>
  );
};

export default WorkspaceLayout;
