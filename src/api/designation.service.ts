import { apiClient } from "./client";
import type { Designation } from "../types";

export const designationService = {
  getDesignations: async (): Promise<Designation[]> => {
    return apiClient<Designation[]>("/api/designations");
  },

  getDesignationById: async (id: number | string): Promise<Designation> => {
    return apiClient<Designation>(`/api/designations/${id}`);
  },

  createDesignation: async (data: { name: string; description?: string; departmentId?: number | null }): Promise<{ success: boolean; message: string; data: Designation }> => {
    return apiClient<{ success: boolean; message: string; data: Designation }>("/api/designations", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({
        name: data.name.trim(),
        description: data.description?.trim() || "",
        departmentId: data.departmentId ?? null,
      }),
    });
  },

  updateDesignation: async (
    id: number | string,
    data: { name: string; description?: string; departmentId?: number | null }
  ): Promise<{ success: boolean; message: string; data: Designation }> => {
    return apiClient<{ success: boolean; message: string; data: Designation }>(`/api/designations/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify({
        name: data.name.trim(),
        description: data.description?.trim() || "",
        departmentId: data.departmentId ?? null,
      }),
    });
  },

  deleteDesignation: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>(`/api/designations/${id}`, {
      method: "DELETE",
    });
  },
};

