import { STORAGE_KEYS } from "../config/constants";
import type { LoggedInUser } from "../types";

export const getStoredToken = (): string => {
  return (
    sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ||
    localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ||
    ""
  );
};

export const setStoredToken = (token: string): void => {
  sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  try {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  } catch {
    // Ignore storage quota / incognito errors
  }
};

export const getStoredUser = (): LoggedInUser | null => {
  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER) ||
      localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed) return null;

    return {
      ...parsed,
      id: Number(parsed.id ?? parsed.Id ?? 0),
      name: parsed.name ?? parsed.Name ?? parsed.email ?? "User",
      email: parsed.email ?? parsed.Email ?? "",
      roleId: parsed.roleId ?? parsed.RoleId ?? 0,
      roleName: parsed.roleName ?? parsed.RoleName,
      permissions: parsed.permissions ?? parsed.Permissions ?? [],
    };
  } catch {
    return null;
  }
};

export const setStoredUser = (user: LoggedInUser): void => {
  const json = JSON.stringify(user);
  sessionStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER, json);
  try {
    localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER, json);
  } catch {
    // Ignore storage quota / incognito errors
  }
};

export const clearSession = (): void => {
  sessionStorage.clear();
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LOGGED_IN_USER);
  } catch {
    // Ignore storage errors
  }
};

