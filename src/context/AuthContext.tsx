import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { authService } from "../api/auth.service";
import { menuService } from "../api/menu.service";
import { canAccess as checkCanAccess, getFirstAccessiblePath } from "../config/workspace.config";
import { clearSession, getStoredUser, setStoredToken, setStoredUser } from "../utils/storage";
import { showErrorAlert } from "../utils/alerts";
import type { AuthResponseData, LoggedInUser, LoginCredentials, MenuItemDto } from "../types";

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

  // Global listener for terminated/force-logged-out sessions
  useEffect(() => {
    const handleForceLogout = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const msg = customEvent.detail || "Your session has been terminated by an administrator. Please log in again.";
      clearSession();
      cachedUserId.current = null;
      syncRequest.current = null;
      setUser(null);
      setMenus([]);
      showErrorAlert("Session Terminated", msg);
    };

    window.addEventListener("auth:force-logout", handleForceLogout);
    return () => {
      window.removeEventListener("auth:force-logout", handleForceLogout);
    };
  }, []);

  // Periodic heartbeat session check every 15s to detect force logout
  useEffect(() => {
    if (!user?.token) return;

    const interval = setInterval(async () => {
      try {
        await authService.getPermissions();
      } catch {
        // If 401, client.ts automatically dispatches auth:force-logout
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [user?.token]);

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
    // Save token first
    setStoredToken(data.token);

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
      token: data.token,
      isFirstLogin: data.isFirstLogin ?? false,
    };

    setStoredUser(loggedInUserData);
    setUser(loggedInUserData);

    return getFirstAccessiblePath(loggedInUserData);
  };

  // Dedicated function to explicitly refresh menus on-demand
  const refreshMenus = useCallback(async (): Promise<MenuItemDto[]> => {
    if (!user) return [];
    try {
      const fetchedMenus = await menuService.getUserMenus();
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
      if (!user) return [];

      // If data is already cached in memory for this user and not forcing, return immediately without network calls
      if (
        !force &&
        cachedUserId.current === user.id &&
        user.permissions &&
        user.permissions.length > 0 &&
        menus &&
        menus.length > 0
      ) {
        return user.permissions;
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
          const perms =
            permsResult.status === "fulfilled"
              ? permsResult.value.permissions || []
              : user.permissions || [];

          const userMenus =
            menusResult.status === "fulfilled"
              ? menusResult.value || []
              : user.menus || [];

          setMenus(userMenus);

          const updatedUser: LoggedInUser = {
            ...user,
            permissions: perms,
            menus: userMenus,
          };

          cachedUserId.current = user.id;
          setUser(updatedUser);
          setStoredUser(updatedUser);
          return perms;
        })
        .catch(() => user.permissions || [])
        .finally(() => {
          syncRequest.current = null;
        });

      syncRequest.current = request;
      return request;
    },
    [user, menus]
  );

  // Fetch only once on app startup if session exists but menus/permissions are missing
  useEffect(() => {
    if (user?.token && (!user.menus || user.menus.length === 0 || !user.permissions)) {
      refreshPermissions(true);
    } else if (user?.id) {
      cachedUserId.current = user.id;
    }
  }, []);

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
    const currentUserId = user?.id;
    const currentUserEmail = user?.email;

    // Immediately & synchronously wipe local session and state
    clearSession();
    cachedUserId.current = null;
    syncRequest.current = null;
    setUser(null);
    setMenus([]);

    // Notify backend asynchronously so database tracks logout session and IP
    try {
      if (currentUserId || currentUserEmail) {
        await authService.logout(currentUserId, currentUserEmail);
      }
    } catch (err) {
      console.warn("Backend logout notification failed:", err);
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
