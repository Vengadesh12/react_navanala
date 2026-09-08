import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { authService } from "../api/auth.service";
import { menuService } from "../api/menu.service";
import { canAccess as checkCanAccess, getFirstAccessiblePath } from "../config/workspace.config";
import { clearSession, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from "../utils/storage";
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

  // Global listener for terminated/force-logged-out sessions
  useEffect(() => {
    const handleForceLogout = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const msg = customEvent.detail || "Your session has been terminated by an administrator. Please log in again.";
      isLoggingOutRef.current = true;
      clearSession();
      cachedUserId.current = null;
      syncRequest.current = null;
      setUser(null);
      setMenus([]);
      isLoggingOutRef.current = false;
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
      if (isLoggingOutRef.current || !getStoredToken()) return;
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
      if (!user || isLoggingOutRef.current || !getStoredToken()) return [];

      // If data is already cached in memory for this user and not forcing, return immediately without network calls
      // Note: An empty array [] is a valid permissions set for 0-permission users
      if (
        !force &&
        cachedUserId.current === user.id &&
        Array.isArray(user.permissions)
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
          // If session was cleared/logged out while request was in-flight, discard response
          if (isLoggingOutRef.current || !getStoredToken() || cachedUserId.current === null) {
            return [];
          }

          const perms =
            permsResult.status === "fulfilled"
              ? permsResult.value.permissions || []
              : user.permissions || [];

          const userMenus =
            menusResult.status === "fulfilled"
              ? menusResult.value || []
              : user.menus || [];

          // Compare if permissions or menus actually changed before updating state
          const permsChanged =
            !Array.isArray(user.permissions) ||
            user.permissions.length !== perms.length ||
            user.permissions.some((p, i) => p !== perms[i]);

          const menusChanged =
            !Array.isArray(menus) ||
            menus.length !== userMenus.length ||
            menus.some((m, i) => m.id !== userMenus[i].id);

          cachedUserId.current = user.id;

          if (menusChanged) {
            setMenus(userMenus);
          }

          if (permsChanged || menusChanged) {
            const updatedUser: LoggedInUser = {
              ...user,
              permissions: perms,
              menus: userMenus,
            };
            setUser(updatedUser);
            setStoredUser(updatedUser);
          }

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
    if (user?.token && (!Array.isArray(user.menus) || !Array.isArray(user.permissions))) {
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
