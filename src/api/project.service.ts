import { apiClient } from "./client";
import type {
  ProjectsOverviewResponse,
  Project,
  ProjectFormData,
  ProjectCategory,
  CreateProjectCategoryFormData,
} from "../types";

export const projectService = {
  getProjects: async (category?: string, status?: string, search?: string): Promise<ProjectsOverviewResponse> => {
    const params = new URLSearchParams();
    if (category && category !== "ALL") params.append("category", category);
    if (status && status !== "ALL") params.append("status", status);
    if (search) params.append("search", search);
    const queryString = params.toString();
    return apiClient<ProjectsOverviewResponse>(`/api/projects${queryString ? `?${queryString}` : ""}`);
  },

  createProject: async (data: ProjectFormData): Promise<{ message?: string; data?: Project }> => {
    return apiClient<{ message?: string; data?: Project }>("/api/projects", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  updateProject: async (id: number, data: ProjectFormData): Promise<{ message?: string; data?: Project }> => {
    return apiClient<{ message?: string; data?: Project }>(`/api/projects/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  deleteProject: async (id: number): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/projects/${id}`, {
      method: "DELETE",
    });
  },

  getCategories: async (): Promise<ProjectCategory[]> => {
    return apiClient<ProjectCategory[]>("/api/project-categories");
  },

  createCategory: async (
    data: CreateProjectCategoryFormData
  ): Promise<{ message?: string; data: ProjectCategory }> => {
    return apiClient<{ message?: string; data: ProjectCategory }>("/api/project-categories", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  deleteCategory: async (id: number): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/project-categories/${id}`, {
      method: "DELETE",
    });
  },
};
