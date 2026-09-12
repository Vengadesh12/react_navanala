import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { authService } from "../api/auth.service";
import { menuService } from "../api/menu.service";
import { canAccess as checkCanAccess, getFirstAccessiblePath } from "../config/workspace.config";
import {
  clearSession,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
  setLoginTimestamp,
  isSessionExpired,
  getSessionRemainingMs,
} from "../utils/storage";
import { showErrorAlert } from "../utils/alerts";
import type { AuthResponseData, LoggedInUser, LoginCredentials, MenuItemDto, GoogleLoginPayload } from "../types";

export interface LoginResult {
  requiresTwoFactor?: boolean;
  message?: string;
  redirectPath?: string;
}

interface AuthContextType {
  user: LoggedInUser | null;
  menus: MenuItemDto[];
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  loginWithGoogle: (payload: GoogleLoginPayload) => Promise<string>;
  verify2FaLogin: (email: string, otp: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshPermissions: (force?: boolean) => Promise<string[]>;
  refreshMenus: () => Promise<MenuItemDto[]>;
  can: (permission?: string) => boolean;
  completeFirstLoginPasswordChange: () => void;
  updateCurrentUser: (userData: Partial<LoggedInUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LoggedInUser | null>(getStoredUser);
  const [menus, setMenus] = useState<MenuItemDto[]>(() => getStoredUser()?.menus || []);
  const [loading, setLoading] = useState<boolean>(false);
  const cachedUserId = useRef<number | null>(getStoredUser()?.id || null);
  const syncRequest = useRef<Promise<string[]> | null>(null);
  const isLoggingOutRef = useRef<boolean>(false);

  // Global listener for terminated/expired/force-logged-out sessions
  useEffect(() => {
    const handleForceLogout = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const msg = customEvent.detail || "Your session has expired. Please log in again.";
      const isExpired = msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("5 hours");
      const title = isExpired ? "Session Expired" : "Session Terminated";
      isLoggingOutRef.current = true;
      clearSession();
      cachedUserId.current = null;
      syncRequest.current = null;
      setUser(null);
      setMenus([]);
      isLoggingOutRef.current = false;
      showErrorAlert(title, msg);
    };

    window.addEventListener("auth:force-logout", handleForceLogout);
    return () => {
      window.removeEventListener("auth:force-logout", handleForceLogout);
    };
  }, []);


  const completeFirstLoginPasswordChange = useCallback(() => {
    setUser((prev) => {
      if (!prev) return null;
      const updated: LoggedInUser = { ...prev, isFirstLogin: false };
      setStoredUser(updated);
      return updated;
    });
  }, []);

  const updateCurrentUser = useCallback((userData: Partial<LoggedInUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated: LoggedInUser = { ...prev, ...userData };
      setStoredUser(updated);
      return updated;
    });
  }, []);

  const saveAuthSession = async (data: AuthResponseData): Promise<string> => {
    // Save token and login timestamp
    setStoredToken(data.token);
    setLoginTimestamp(Date.now());

    // Use menus from login response (or fallback fetch if empty)
    let userMenus = data.menus || [];
    if (userMenus.length === 0) {
      try {
        userMenus = await menuService.getUserMenus();
      } catch {
        userMenus = [];
      }
    }

    setMenus(userMenus);
    cachedUserId.current = data.id;

    const loggedInUserData: LoggedInUser = {
      id: data.id,
      name: data.name,
      email: data.email,
      profileImage: data.profileImage,
      roleId: data.roleId,
      roleName: data.roleName,
      departmentName: data.departmentName,
      designationName: data.designationName,
      permissions: data.permissions || [],
      menus: userMenus,
      menuNames: data.menuNames || userMenus.map(m => m.label || (m as any).name || "").filter(Boolean),
      token: data.token,
      phone: data.phone,
      age: data.age,
      address: data.address,
      isFirstLogin: data.isFirstLogin ?? false,
    };

    setStoredUser(loggedInUserData);
    setUser(loggedInUserData);

    return getFirstAccessiblePath(loggedInUserData);
  };

  // Dedicated function to explicitly refresh menus on-demand
  const refreshMenus = useCallback(async (): Promise<MenuItemDto[]> => {
    if (!user || isLoggingOutRef.current || !getStoredToken()) return [];
    try {
      const fetchedMenus = await menuService.getUserMenus();
      if (isLoggingOutRef.current || !getStoredToken()) return [];
      setMenus(fetchedMenus);
      setUser((prev) => {
        if (!prev) return null;
        const updated: LoggedInUser = { ...prev, menus: fetchedMenus };
        setStoredUser(updated);
        return updated;
      });
      return fetchedMenus;
    } catch {
      return menus;
    }
  }, [user, menus]);

  // Synchronize permissions and menus only when needed (or when force = true)
  const refreshPermissions = useCallback(
    async (force: boolean = false): Promise<string[]> => {
      const token = getStoredToken();
      if (isLoggingOutRef.current || !token) return [];

      const currentStored = getStoredUser();
      const currentUser = user || currentStored;
      if (!currentUser) return [];

      // If data is already cached in memory for this user and not forcing, return immediately without network calls
      if (
        !force &&
        cachedUserId.current === currentUser.id &&
        Array.isArray(currentUser.permissions) &&
        currentUser.permissions.length > 0
      ) {
        return currentUser.permissions;
      }

      // Deduplicate concurrent inflight requests
      if (syncRequest.current) {
        return syncRequest.current;
      }

      const request = Promise.allSettled([
        authService.getPermissions(),
        menuService.getUserMenus(),
      ])
        .then(([permsResult, menusResult]) => {
          // If session was cleared/logged out while request was in-flight, discard response
          if (isLoggingOutRef.current || !getStoredToken()) {
            return [];
          }

          const currentStoredUser = getStoredUser();
          const baseUser = user || currentStoredUser;
          if (!baseUser) return [];

          const perms =
            permsResult.status === "fulfilled"
              ? permsResult.value.permissions || []
              : baseUser.permissions || [];

          const userMenus =
            menusResult.status === "fulfilled"
              ? menusResult.value || []
              : baseUser.menus || [];

          // Compare if permissions or menus actually changed before updating state
          const oldPerms = baseUser.permissions || [];
          const permsSet = new Set(perms);
          const oldPermsSet = new Set(oldPerms);
          const permsChanged =
            !Array.isArray(oldPerms) ||
            oldPerms.length !== perms.length ||
            perms.some((p) => !oldPermsSet.has(p)) ||
            oldPerms.some((p) => !permsSet.has(p));

          const oldMenus = menus || [];
          const menusChanged =
            !Array.isArray(oldMenus) ||
            oldMenus.length !== userMenus.length ||
            userMenus.some((m, i) => m.id !== oldMenus[i]?.id);

          cachedUserId.current = baseUser.id;

          if (menusChanged) {
            setMenus(userMenus);
          }

          if (permsChanged || menusChanged || !baseUser.permissions || baseUser.permissions.length === 0) {
            const updatedUser: LoggedInUser = {
              ...baseUser,
              permissions: perms,
              menus: userMenus,
              menuNames: userMenus.map((m) => m.label || (m as any).name || "").filter(Boolean),
            };
            setUser(updatedUser);
            setStoredUser(updatedUser);
          }

          return perms;
        })
        .catch(() => user?.permissions || [])
        .finally(() => {
          syncRequest.current = null;
        });

      syncRequest.current = request;
      return request;
    },
    [user, menus]
  );

  // 1. Revalidate fresh permissions and menus on app startup/refresh if user session exists and is not expired
  useEffect(() => {
    if (isSessionExpired()) {
      window.dispatchEvent(
        new CustomEvent("auth:force-logout", {
          detail: "Your session has expired after 5 hours. Please log in again.",
        })
      );
      return;
    }
    if (getStoredToken()) {
      refreshPermissions(true);
    }
  }, [refreshPermissions]);

  // 2. Proactive 5-hour session expiration timer and visibility/focus listener
  useEffect(() => {
    if (!user?.token) return;

    const checkAndTriggerExpiration = () => {
      if (isSessionExpired()) {
        window.dispatchEvent(
          new CustomEvent("auth:force-logout", {
            detail: "Your session has expired after 5 hours. Please log in again.",
          })
        );
        return true;
      }
      return false;
    };

    if (checkAndTriggerExpiration()) return;

    // Set countdown timeout for the remaining time of the 5-hour session
    const remainingMs = getSessionRemainingMs();
    const timerId = setTimeout(() => {
      checkAndTriggerExpiration();
    }, remainingMs);

    // When the tab becomes visible or receives focus, check if session elapsed while user was away
    const handleFocusOrVisibility = () => {
      checkAndTriggerExpiration();
    };

    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
    };
  }, [user?.token]);

  // 3. Periodic heartbeat session check every 15s to detect force logout and sync permissions
  useEffect(() => {
    if (!user?.token) return;

    const interval = setInterval(async () => {
      if (isLoggingOutRef.current || !getStoredToken()) return;
      if (isSessionExpired()) {
        window.dispatchEvent(
          new CustomEvent("auth:force-logout", {
            detail: "Your session has expired after 5 hours. Please log in again.",
          })
        );
        return;
      }
      try {
        await refreshPermissions(true);
      } catch {
        // If 401, client.ts automatically dispatches auth:force-logout
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [user?.token, refreshPermissions]);

  const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      if (response.requiresTwoFactor) {
        return {
          requiresTwoFactor: true,
          message: response.message || "Two-Factor Authentication is required. A 6-digit OTP has been sent to your email.",
        };
      }

      const redirectPath = await saveAuthSession(response.data);
      return {
        requiresTwoFactor: false,
        redirectPath,
      };
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (payload: GoogleLoginPayload): Promise<string> => {
    setLoading(true);
    try {
      const response = await authService.googleLogin(payload);
      return await saveAuthSession(response.data);
    } finally {
      setLoading(false);
    }
  };

  const verify2FaLogin = async (email: string, otp: string): Promise<string> => {
    setLoading(true);
    try {
      const response = await authService.verify2FaLogin(email, otp);
      return await saveAuthSession(response.data);
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async (): Promise<void> => {
    isLoggingOutRef.current = true;
    const currentUserId = user?.id;
    const currentUserEmail = user?.email;

    // Immediately & synchronously wipe local session and state so no in-flight requests or route guards can resurrect it
    clearSession();
    cachedUserId.current = null;
    syncRequest.current = null;
    setUser(null);
    setMenus([]);

    // Notify backend first so database receives authorization token and records session logout cleanly
    try {
      if (currentUserId || currentUserEmail) {
        await authService.logout(currentUserId, currentUserEmail);
      }
    } catch (err) {
      console.warn("Backend logout notification failed:", err);
    } finally {
      // Ensure local state remains cleared
      clearSession();
      cachedUserId.current = null;
      syncRequest.current = null;
      setUser(null);
      setMenus([]);
      isLoggingOutRef.current = false;
    }
  }, [user]);

  const can = useCallback(
    (permission?: string): boolean => {
      return checkCanAccess(user, permission);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        menus,
        loading,
        login,
        loginWithGoogle,
        verify2FaLogin,
        logout,
        refreshPermissions,
        refreshMenus,
        can,
        completeFirstLoginPasswordChange,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
