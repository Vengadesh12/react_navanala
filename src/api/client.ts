import { API_URL } from "../config/constants";
import { getStoredToken } from "../utils/storage";

export interface RequestOptions extends RequestInit {
  includeJson?: boolean;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (options.includeJson && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json().catch(() => ({} as any)) : ({} as any);

  if (!response.ok) {
    const errorMessage = data?.message || `Request failed with status ${response.status}`;
    if (response.status === 401 && token) {
      window.dispatchEvent(new CustomEvent("auth:force-logout", { detail: errorMessage }));
    }
    throw new Error(errorMessage);
  }

  return data as T;
}

