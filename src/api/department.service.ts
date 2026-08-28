import { apiClient } from "./client";
import type {
  Department,
  DepartmentOverviewResponse,
  CreateDepartmentFormData,
  UpdateDepartmentFormData,
} from "../types";

export const departmentService = {
  getOverview: async (): Promise<DepartmentOverviewResponse> => {
    return apiClient<DepartmentOverviewResponse>("/api/departments/overview");
  },

  getDepartments: async (): Promise<Department[]> => {
    return apiClient<Department[]>("/api/departments");
  },

  getDepartmentById: async (id: number | string): Promise<Department> => {
    return apiClient<Department>(`/api/departments/${id}`);
  },

  createDepartment: async (
    data: CreateDepartmentFormData
  ): Promise<{ success: boolean; message: string; data: Department }> => {
    return apiClient<{ success: boolean; message: string; data: Department }>("/api/departments", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({
        name: data.name.trim(),
        description: (data.description || "").trim(),
        designationIds: data.designationIds || [],
      }),
    });
  },

  updateDepartment: async (
    id: number | string,
    data: UpdateDepartmentFormData
  ): Promise<{ success: boolean; message: string; data: Department }> => {
    return apiClient<{ success: boolean; message: string; data: Department }>(`/api/departments/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify({
        name: data.name.trim(),
        description: (data.description || "").trim(),
        designationIds: data.designationIds,
      }),
    });
  },

  deleteDepartment: async (id: number | string): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>(`/api/departments/${id}`, {
      method: "DELETE",
    });
  },

  mapDesignations: async (
    id: number | string,
    designationIds: number[]
  ): Promise<{ success: boolean; message: string; data: Department }> => {
    return apiClient<{ success: boolean; message: string; data: Department }>(
      `/api/departments/${id}/map-designations`,
      {
        method: "POST",
        includeJson: true,
        body: JSON.stringify({
          designationIds,
        }),
      }
    );
  },
};
