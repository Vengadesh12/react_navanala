import { STORAGE_KEYS, SESSION_TIMEOUT_MS } from "../config/constants";
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

export const getLoginTimestamp = (): number | null => {
  const raw =
    sessionStorage.getItem(STORAGE_KEYS.LOGIN_TIMESTAMP) ||
    localStorage.getItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
  if (!raw) return null;
  const num = Number(raw);
  return isNaN(num) || num <= 0 ? null : num;
};

export const setLoginTimestamp = (timestamp: number): void => {
  const val = String(timestamp);
  sessionStorage.setItem(STORAGE_KEYS.LOGIN_TIMESTAMP, val);
  try {
    localStorage.setItem(STORAGE_KEYS.LOGIN_TIMESTAMP, val);
  } catch {
    // Ignore storage quota / incognito errors
  }
};

/**
 * Safely parse JWT token expiration time in milliseconds since epoch.
 */
export const getTokenExpirationTime = (token: string): number | null => {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    if (parsed && typeof parsed.exp === "number") {
      return parsed.exp * 1000;
    }
  } catch {
    // Ignore parse error
  }
  return null;
};

/**
 * Calculate the exact timestamp when the current session expires.
 * Prioritizes the JWT 'exp' claim; falls back to login timestamp + 5 hours.
 */
export const getSessionExpiryTime = (): number | null => {
  const token = getStoredToken();
  const tokenExp = getTokenExpirationTime(token);
  if (tokenExp) return tokenExp;

  const loginTime = getLoginTimestamp();
  if (loginTime) {
    return loginTime + SESSION_TIMEOUT_MS;
  }

  return null;
};

/**
 * Checks if the user session has exceeded 5 hours or if the token is expired.
 */
export const isSessionExpired = (): boolean => {
  const token = getStoredToken();
  if (!token) return false;

  const expiryTime = getSessionExpiryTime();
  if (!expiryTime) return false;

  return Date.now() >= expiryTime;
};

/**
 * Returns remaining session time in milliseconds, or 0 if expired/not logged in.
 */
export const getSessionRemainingMs = (): number => {
  const expiryTime = getSessionExpiryTime();
  if (!expiryTime) return 0;
  return Math.max(0, expiryTime - Date.now());
};

export const getStoredUser = (): LoggedInUser | null => {
  if (isSessionExpired()) {
    clearSession();
    return null;
  }
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
  try {
    sessionStorage.clear();
  } catch {
    // Ignore storage errors
  }
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LOGGED_IN_USER);
    localStorage.removeItem(STORAGE_KEYS.LOGIN_TIMESTAMP);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("loginTimestamp");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch {
    // Ignore storage errors
  }
};

