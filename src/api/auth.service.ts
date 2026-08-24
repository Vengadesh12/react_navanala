import { apiClient } from "./client";
import type { AuthResponse, LoginCredentials, PermissionCheckResponse } from "../types";

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return apiClient<AuthResponse>("/api/auth/login", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
      }),
    });
  },

  getPermissions: async (): Promise<PermissionCheckResponse> => {
    return apiClient<PermissionCheckResponse>("/api/auth/permissions");
  },
};
