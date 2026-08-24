export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5125";

export const STORAGE_KEYS = {
  LOGGED_IN_USER: "loggedInUser",
  ACCESS_TOKEN: "accessToken",
} as const;

export const SUPER_ADMIN_ROLE_ID = 2;
