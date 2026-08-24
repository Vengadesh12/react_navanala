import { apiClient } from "./client";
import type { Role, RoleFormData } from "../types";

export const roleService = {
  getRoles: async (): Promise<Role[]> => {
    return apiClient<Role[]>("/api/roles");
  },

  createRole: async (roleData: RoleFormData): Promise<{ message?: string; data?: Role }> => {
    return apiClient<{ message?: string; data?: Role }>("/api/roles", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({
        name: roleData.name.trim(),
        description: (roleData.description || "").trim(),
      }),
    });
  },

  updateRole: async (id: number | string, roleData: RoleFormData): Promise<{ message?: string; data?: Role }> => {
    return apiClient<{ message?: string; data?: Role }>(`/api/roles/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify({
        name: roleData.name.trim(),
        description: (roleData.description || "").trim(),
      }),
    });
  },

  deleteRole: async (id: number | string): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/roles/${id}`, {
      method: "DELETE",
    });
  },
};
