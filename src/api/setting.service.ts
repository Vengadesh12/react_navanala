import { apiClient } from "./client";
import type {
  SettingsOverviewResponse,
  SystemSetting,
  SettingCategory,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateSettingRequest,
  UpdateSettingRequest,
} from "../types";

export const settingService = {
  getSettings: async (category?: string, search?: string): Promise<SettingsOverviewResponse> => {
    const params = new URLSearchParams();
    if (category && category !== "ALL") params.append("category", category);
    if (search && search.trim()) params.append("search", search.trim());
    const queryString = params.toString();
    return apiClient<SettingsOverviewResponse>(`/api/settings${queryString ? `?${queryString}` : ""}`);
  },

  getCategories: async (): Promise<SettingCategory[]> => {
    return apiClient<SettingCategory[]>("/api/settings/categories");
  },

  createCategory: async (data: CreateCategoryRequest): Promise<{ message?: string; data?: SettingCategory; success?: boolean }> => {
    return apiClient<{ message?: string; data?: SettingCategory; success?: boolean }>("/api/settings/categories", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  updateCategory: async (id: number, data: UpdateCategoryRequest): Promise<{ message?: string; data?: SettingCategory; success?: boolean }> => {
    return apiClient<{ message?: string; data?: SettingCategory; success?: boolean }>(`/api/settings/categories/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  deleteCategory: async (id: number): Promise<{ message?: string; success?: boolean }> => {
    return apiClient<{ message?: string; success?: boolean }>(`/api/settings/categories/${id}`, {
      method: "DELETE",
    });
  },

  updateSettingsBulk: async (settings: Record<string, string>): Promise<{ message?: string; success?: boolean }> => {
    return apiClient<{ message?: string; success?: boolean }>("/api/settings/bulk", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({ settings }),
    });
  },

  createSetting: async (data: CreateSettingRequest): Promise<{ message?: string; data?: SystemSetting; success?: boolean }> => {
    return apiClient<{ message?: string; data?: SystemSetting; success?: boolean }>("/api/settings", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  updateSetting: async (id: number, data: UpdateSettingRequest): Promise<{ message?: string; data?: SystemSetting; success?: boolean }> => {
    return apiClient<{ message?: string; data?: SystemSetting; success?: boolean }>(`/api/settings/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  deleteSetting: async (id: number): Promise<{ message?: string; success?: boolean }> => {
    return apiClient<{ message?: string; success?: boolean }>(`/api/settings/${id}`, {
      method: "DELETE",
    });
  },
};


