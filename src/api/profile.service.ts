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

  uploadProfileImage: async (file: File): Promise<{ message?: string; success?: boolean; data?: UserProfile }> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<{ message?: string; success?: boolean; data?: UserProfile }>("/api/profile/upload-image", {
      method: "POST",
      body: formData,
    });
  },

  removeProfileImage: async (): Promise<{ message?: string; success?: boolean; data?: UserProfile }> => {
    return apiClient<{ message?: string; success?: boolean; data?: UserProfile }>("/api/profile/remove-image", {
      method: "DELETE",
    });
  },
};
