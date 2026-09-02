import { apiClient } from "./client";
import { API_URL } from "../config/constants";
import { getStoredToken } from "../utils/storage";
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
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description);
    if (data.categoryId !== undefined && data.categoryId !== null) {
      formData.append("categoryId", String(data.categoryId));
    }
    formData.append("category", data.category);
    formData.append("format", data.format);
    if (data.file) {
      formData.append("file", data.file);
    }
    return apiClient<{ message?: string; data?: Report }>("/api/reports", {
      method: "POST",
      body: formData,
    });
  },

  updateReport: async (id: number, data: Partial<ReportFormData> & { status?: string }): Promise<{ message?: string; data?: Report }> => {
    const formData = new FormData();
    if (data.title !== undefined) formData.append("title", data.title);
    if (data.description !== undefined) formData.append("description", data.description);
    if (data.categoryId !== undefined && data.categoryId !== null) {
      formData.append("categoryId", String(data.categoryId));
    }
    if (data.category !== undefined) formData.append("category", data.category);
    if (data.format !== undefined) formData.append("format", data.format);
    if (data.status !== undefined) formData.append("status", data.status);
    if (data.file) {
      formData.append("file", data.file);
    }
    return apiClient<{ message?: string; data?: Report }>(`/api/reports/${id}`, {
      method: "PUT",
      body: formData,
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

  downloadReport: async (id: number, title: string, format: string, existingFileName?: string): Promise<void> => {
    const token = getStoredToken() || localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    const response = await fetch(`${API_URL}/api/reports/${id}/download`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to download report document.");
    }

    // Try to get filename from Content-Disposition header
    let fileName = existingFileName;
    const disposition = response.headers.get("Content-Disposition");
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        fileName = match[1].replace(/['"]/g, "").trim();
      }
    }

    if (!fileName) {
      const ext = format.toLowerCase().trim();
      fileName = `${title.replace(/\s+/g, "_")}.${ext}`;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
