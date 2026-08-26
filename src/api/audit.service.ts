import { apiClient } from "./client";
import type { AuditLogOverviewResponse, AuditLog, AuditLogFormData } from "../types";

export const auditService = {
  getLogs: async (module?: string, search?: string): Promise<AuditLogOverviewResponse> => {
    const params = new URLSearchParams();
    if (module && module !== "ALL") params.append("module", module);
    if (search) params.append("search", search);
    const queryString = params.toString();
    return apiClient<AuditLogOverviewResponse>(`/api/audit${queryString ? `?${queryString}` : ""}`);
  },

  createLog: async (data: AuditLogFormData): Promise<{ message?: string; data?: AuditLog }> => {
    return apiClient<{ message?: string; data?: AuditLog }>("/api/audit", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(data),
    });
  },

  deleteLog: async (id: number): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/audit/${id}`, {
      method: "DELETE",
    });
  },
};
