import { apiClient } from "./client";
import type {
  ReportsOverviewResponse,
  Report,
  ReportFormData,
  ReportCategory,
  CreateReportCategoryFormData,
} from "../types";

export const reportService = {
  getReports: async (category?: string, search?: string): Promise<ReportsOverviewResponse> => {
    const params = new URLSearchParams();
    if (category && category !== "ALL") params.append("category", category);
    if (search) params.append("search", search);
    const queryString = params.toString();
    return apiClient<ReportsOverviewResponse>(`/api/reports${queryString ? `?${queryString}` : ""}`);
  },

  createReport: async (data: ReportFormData): Promise<{ message?: string; data?: Report }> => {
    return apiClient<{ message?: string; data?: Report }>("/api/reports", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  updateReport: async (id: number, data: Partial<ReportFormData> & { status?: string }): Promise<{ message?: string; data?: Report }> => {
    return apiClient<{ message?: string; data?: Report }>(`/api/reports/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  deleteReport: async (id: number): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/reports/${id}`, {
      method: "DELETE",
    });
  },

  getCategories: async (): Promise<ReportCategory[]> => {
    return apiClient<ReportCategory[]>("/api/report-categories");
  },

  createCategory: async (
    data: CreateReportCategoryFormData
  ): Promise<{ message?: string; data: ReportCategory }> => {
    return apiClient<{ message?: string; data: ReportCategory }>("/api/report-categories", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  deleteCategory: async (id: number): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/report-categories/${id}`, {
      method: "DELETE",
    });
  },

  downloadReport: async (id: number, title: string, format: string): Promise<void> => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const response = await fetch(`http://localhost:5125/api/reports/${id}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download report document.");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const ext = format.toLowerCase() === "pdf" ? "txt" : format.toLowerCase();
    link.download = `${title.replace(/\s+/g, "_")}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
