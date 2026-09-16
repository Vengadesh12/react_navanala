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

  getDepartmentPermissions: async (
    departmentId: number | string
  ): Promise<string[]> => {
    return apiClient<string[]>(`/api/permissions/departments/${departmentId}`);
  },

  updateDepartmentPermissions: async (
    departmentId: number | string,
    permissionKeys: string[]
  ): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(
      `/api/permissions/departments/${departmentId}`,
      {
        method: "PUT",
        includeJson: true,
        body: JSON.stringify({ permissionKeys }),
      }
    );
  },

  getUsersPermissionOverview: async () => {
    return apiClient<import("../types").UserPermissionOverview[]>("/api/permissions/users-overview");
  },

  getUserPermissionsDetail: async (userId: number | string) => {
    return apiClient<import("../types").UserPermissionProfile>(`/api/permissions/users/${userId}/details`);
  },

  assignUserPermission: async (
    userId: number | string,
    permissionKey: string,
    reason?: string
  ): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/permissions/users/${userId}/assign`, {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({ permissionKey, reason }),
    });
  },

  assignUserPermissions: async (
    userId: number | string,
    permissionKeys: string[],
    reason?: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ successCount: number; errors: string[] }> => {
    let successCount = 0;
    const errors: string[] = [];
    for (let i = 0; i < permissionKeys.length; i++) {
      const key = permissionKeys[i];
      if (onProgress) {
        onProgress(i + 1, permissionKeys.length);
      }
      try {
        await apiClient<{ message?: string }>(`/api/permissions/users/${userId}/assign`, {
          method: "POST",
          includeJson: true,
          body: JSON.stringify({ permissionKey: key, reason }),
        });
        successCount++;
      } catch (err: any) {
        errors.push(err.message || `Failed to assign ${key}`);
      }
    }
    return { successCount, errors };
  },

  revokeUserPermission: async (
    userId: number | string,
    permissionKey: string
  ): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(
      `/api/permissions/users/${userId}/revoke/${encodeURIComponent(permissionKey)}`,
      {
        method: "DELETE",
      }
    );
  },
};

