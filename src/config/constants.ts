const rawApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8080").trim();
// Strip trailing /api or /api/ so it cleanly attaches to service paths like "/api/users" and static paths like "/uploads"
export const API_URL = rawApiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");

export const STORAGE_KEYS = {
  LOGGED_IN_USER: "loggedInUser",
  ACCESS_TOKEN: "accessToken",
  LOGIN_TIMESTAMP: "loginTimestamp",
} as const;

export const SESSION_TIMEOUT_MS = 5 * 60 * 60 * 1000; // 5 hours in milliseconds (18,000,000 ms)

export const SUPER_ADMIN_ROLE_ID = 2;
