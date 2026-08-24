import { apiClient } from "./client";
import type { PermissionsApiResponse } from "../types";

export const permissionService = {
  getPermissionsMatrix: async (): Promise<PermissionsApiResponse> => {
    return apiClient<PermissionsApiResponse>("/api/permissions");
  },

  updateRolePermissions: async (
    roleId: number | string,
    permissionKeys: string[]
  ): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/permissions/${roleId}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify({ permissionKeys }),
    });
  },
};
