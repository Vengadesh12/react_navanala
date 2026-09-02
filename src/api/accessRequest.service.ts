import { apiClient } from "./client";
import type {
  AccessRequestItem,
  AccessRequestQueryParams,
  AccessRequestSummary,
  AvailablePermissionItem,
  CreateAccessRequestPayload,
  PagedAccessRequestResponse,
  ReviewAccessRequestPayload,
} from "../types";

export const accessRequestService = {
  getAvailablePermissions: async (): Promise<AvailablePermissionItem[]> => {
    const res = await apiClient<{ success: boolean; data: AvailablePermissionItem[] }>(
      "/api/access-requests/available-permissions"
    );
    return res.data || [];
  },

  getMyRequests: async (): Promise<AccessRequestItem[]> => {
    const res = await apiClient<{ success: boolean; data: AccessRequestItem[] }>(
      "/api/access-requests/my-requests"
    );
    return res.data || [];
  },

  getRequests: async (query?: AccessRequestQueryParams): Promise<PagedAccessRequestResponse> => {
    const params = new URLSearchParams();
    if (query?.status && query.status !== "all") params.append("status", query.status);
    if (query?.priority && query.priority !== "all") params.append("priority", query.priority);
    if (query?.module && query.module !== "all") params.append("module", query.module);
    if (query?.search) params.append("search", query.search);
    if (query?.onlyMyRequests) params.append("onlyMyRequests", "true");
    if (query?.page) params.append("page", query.page.toString());
    if (query?.pageSize) params.append("pageSize", query.pageSize.toString());

    const queryString = params.toString();
    return apiClient<PagedAccessRequestResponse>(`/api/access-requests${queryString ? `?${queryString}` : ""}`);
  },

  getSummary: async (): Promise<AccessRequestSummary> => {
    return apiClient<AccessRequestSummary>("/api/access-requests/summary");
  },

  getRequestById: async (id: number): Promise<{ success: boolean; message?: string; data: AccessRequestItem }> => {
    return apiClient<{ success: boolean; message?: string; data: AccessRequestItem }>(`/api/access-requests/${id}`);
  },

  createRequest: async (
    payload: CreateAccessRequestPayload
  ): Promise<{ success: boolean; message?: string; data: AccessRequestItem }> => {
    return apiClient<{ success: boolean; message?: string; data: AccessRequestItem }>("/api/access-requests", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(payload),
    });
  },

  approveRequest: async (
    id: number,
    payload: ReviewAccessRequestPayload
  ): Promise<{ success: boolean; message?: string }> => {
    return apiClient<{ success: boolean; message?: string }>(`/api/access-requests/${id}/approve`, {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(payload),
    });
  },

  rejectRequest: async (
    id: number,
    payload: ReviewAccessRequestPayload
  ): Promise<{ success: boolean; message?: string }> => {
    return apiClient<{ success: boolean; message?: string }>(`/api/access-requests/${id}/reject`, {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(payload),
    });
  },

  deleteRequest: async (id: number): Promise<{ success: boolean; message?: string }> => {
    return apiClient<{ success: boolean; message?: string }>(`/api/access-requests/${id}`, {
      method: "DELETE",
    });
  },
};
