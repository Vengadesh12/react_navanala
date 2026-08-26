import { apiClient } from "./client";
import type {
  UserActivitySummary,
  PagedUserActivityResponse,
  UserActivityQuery,
  UserSessionItem,
} from "../types";

export const userActivityService = {
  getSummary: async (): Promise<UserActivitySummary> => {
    return apiClient<UserActivitySummary>("/api/user-activity/summary");
  },

  getActivities: async (query?: UserActivityQuery): Promise<PagedUserActivityResponse> => {
    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search.trim());
    if (query?.status && query.status !== "all") params.append("status", query.status);
    if (query?.page) params.append("page", query.page.toString());
    if (query?.pageSize) params.append("pageSize", query.pageSize.toString());

    const qs = params.toString();
    return apiClient<PagedUserActivityResponse>(`/api/user-activity${qs ? `?${qs}` : ""}`);
  },

  getActiveUsers: async (): Promise<UserSessionItem[]> => {
    return apiClient<UserSessionItem[]>("/api/user-activity/active");
  },

  terminateSession: async (sessionId: number): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>(`/api/user-activity/terminate/${sessionId}`, {
      method: "POST",
    });
  },

  forceLogoutUser: async (userId: number): Promise<{ success: boolean; message: string }> => {
    return apiClient<{ success: boolean; message: string }>(`/api/user-activity/force-logout/${userId}`, {
      method: "POST",
    });
  },
};
