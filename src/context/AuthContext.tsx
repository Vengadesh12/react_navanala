import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { authService } from "../api/auth.service";
import { canAccess as checkCanAccess, getFirstAccessiblePath } from "../config/workspace.config";
import { clearSession, getStoredUser, setStoredToken, setStoredUser } from "../utils/storage";
import type { AuthResponseData, LoggedInUser, LoginCredentials } from "../types";

interface AuthContextType {
  user: LoggedInUser | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<string>;
  logout: () => void;
  refreshPermissions: () => Promise<string[]>;
  can: (permission?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LoggedInUser | null>(getStoredUser);
  const [loading, setLoading] = useState<boolean>(false);
  const permissionsUserId = useRef<number | null>(null);
  const permissionsRequest = useRef<Promise<string[]> | null>(null);

  const refreshPermissions = useCallback(async (): Promise<string[]> => {
    if (!user) return [];

    if (permissionsUserId.current === user.id) {
      return user.permissions || [];
    }

    if (permissionsRequest.current) {
      return permissionsRequest.current;
    }

    const request = authService
      .getPermissions()
      .then((result) => {
        const perms = result.permissions || [];
        const updatedUser: LoggedInUser = {
          ...user,
          permissions: perms,
        };
        permissionsUserId.current = user.id;
        setUser(updatedUser);
        setStoredUser(updatedUser);
        return perms;
      })
      .catch(() => user.permissions || [])
      .finally(() => {
        permissionsRequest.current = null;
      });

    permissionsRequest.current = request;
    return request;
  }, [user]);

  const login = async (credentials: LoginCredentials): Promise<string> => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      const data: AuthResponseData = response.data;

      const loggedInUserData: LoggedInUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        roleId: data.roleId,
        roleName: data.roleName,
        permissions: data.permissions || [],
        token: data.token,
      };

      setStoredToken(data.token);
      setStoredUser(loggedInUserData);
      setUser(loggedInUserData);
      permissionsUserId.current = loggedInUserData.id;

      return getFirstAccessiblePath(loggedInUserData);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    permissionsUserId.current = null;
    permissionsRequest.current = null;
    setUser(null);
  };

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
        loading,
        login,
        logout,
        refreshPermissions,
        can,
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
