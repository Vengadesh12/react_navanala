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

