import { STORAGE_KEYS } from "../config/constants";
import type { LoggedInUser } from "../types";

export const getStoredToken = (): string => {
  return sessionStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || "";
};

export const setStoredToken = (token: string): void => {
  sessionStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
};

export const getStoredUser = (): LoggedInUser | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER);
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
  sessionStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(user));
};

export const clearSession = (): void => {
  sessionStorage.clear();
};
