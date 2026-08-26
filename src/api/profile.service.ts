import { apiClient } from "./client";
import type { UserProfile, ProfileFormData, ChangePasswordFormData } from "../types";

export const profileService = {
  getProfile: async (): Promise<UserProfile> => {
    return apiClient<UserProfile>("/api/profile");
  },

  updateProfile: async (data: ProfileFormData): Promise<{ message?: string; data?: UserProfile }> => {
    return apiClient<{ message?: string; data?: UserProfile }>("/api/profile", {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  changePassword: async (data: ChangePasswordFormData): Promise<{ message?: string; success?: boolean }> => {
    return apiClient<{ message?: string; success?: boolean }>("/api/profile/change-password", {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },
};
