import { apiClient } from "./client";
import type {
  ApprovalItem,
  ApprovalActionPayload,
  ApprovalQueryParams,
  ApprovalSummary,
  CreateApprovalPayload,
  PagedApprovalResponse,
} from "../types";

export const approvalService = {
  getApprovals: async (query?: ApprovalQueryParams): Promise<PagedApprovalResponse> => {
    const params = new URLSearchParams();
    if (query?.status && query.status !== "ALL") params.append("status", query.status);
    if (query?.category && query.category !== "ALL") params.append("category", query.category);
    if (query?.priority && query.priority !== "ALL") params.append("priority", query.priority);
    if (query?.scope) params.append("scope", query.scope);
    if (query?.search) params.append("search", query.search);
    if (query?.page) params.append("page", query.page.toString());
    if (query?.pageSize) params.append("pageSize", query.pageSize.toString());

    const queryString = params.toString();
    return apiClient<PagedApprovalResponse>(`/api/approvals${queryString ? `?${queryString}` : ""}`);
  },

  getSummary: async (): Promise<ApprovalSummary> => {
    return apiClient<ApprovalSummary>("/api/approvals/summary");
  },

  getApprovalById: async (id: number): Promise<{ success: boolean; message?: string; data: ApprovalItem }> => {
    return apiClient<{ success: boolean; message?: string; data: ApprovalItem }>(`/api/approvals/${id}`);
  },

  createApproval: async (
    payload: CreateApprovalPayload
  ): Promise<{ success: boolean; message?: string; data: ApprovalItem }> => {
    return apiClient<{ success: boolean; message?: string; data: ApprovalItem }>("/api/approvals", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(payload),
    });
  },

  processAction: async (
    id: number,
    payload: ApprovalActionPayload
  ): Promise<{ success: boolean; message?: string; data: ApprovalItem }> => {
    return apiClient<{ success: boolean; message?: string; data: ApprovalItem }>(`/api/approvals/${id}/action`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify(payload),
    });
  },

  deleteApproval: async (id: number): Promise<{ success: boolean; message?: string }> => {
    return apiClient<{ success: boolean; message?: string }>(`/api/approvals/${id}`, {
      method: "DELETE",
    });
  },
};
