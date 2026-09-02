import { apiClient } from "./client";
import type { AuthResponse, LoginCredentials, PermissionCheckResponse, PasswordEvaluationResult, GoogleLoginPayload } from "../types";

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword?: string;
}

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

  googleLogin: async (payload: GoogleLoginPayload): Promise<AuthResponse> => {
    return apiClient<AuthResponse>("/api/auth/google-login", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({
        idToken: payload.idToken,
        email: payload.email.trim(),
        name: payload.name?.trim(),
        profileImage: payload.profileImage,
      }),
    });
  },

  evaluatePassword: async (password: string): Promise<PasswordEvaluationResult> => {
    return apiClient<PasswordEvaluationResult>("/api/auth/validate-password", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({ password }),
    });
  },

  getPermissions: async (): Promise<PermissionCheckResponse> => {
    return apiClient<PermissionCheckResponse>("/api/auth/permissions");
  },

  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    return apiClient<ForgotPasswordResponse>("/api/auth/forgot-password", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({ email: email.trim() }),
    });
  },

  verifyOtp: async (email: string, otp: string): Promise<ForgotPasswordResponse> => {
    return apiClient<ForgotPasswordResponse>("/api/auth/verify-otp", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
    });
  },

  verify2FaLogin: async (email: string, otp: string): Promise<AuthResponse> => {
    return apiClient<AuthResponse>("/api/auth/login-2fa-verify", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
    });
  },

  resend2FaOtp: async (email: string): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>("/api/auth/resend-2fa-otp", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({ email: email.trim() }),
    });
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<ForgotPasswordResponse> => {
    return apiClient<ForgotPasswordResponse>("/api/auth/reset-password", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({
        email: payload.email.trim(),
        otp: payload.otp.trim(),
        newPassword: payload.newPassword,
        confirmPassword: payload.confirmPassword ?? payload.newPassword,
      }),
    });
  },

  logout: async (userId?: number, email?: string): Promise<{ success: boolean; message: string }> => {
    try {
      return await apiClient<{ success: boolean; message: string }>("/api/auth/logout", {
        method: "POST",
        includeJson: true,
        body: JSON.stringify({ userId, email }),
      });
    } catch {
      return { success: true, message: "Logged out" };
    }
  },
};


