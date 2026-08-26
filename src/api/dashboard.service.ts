import { apiClient } from "./client";
import type { DashboardSummaryResponse } from "../types";

export const dashboardService = {
  getSummary: async (timeframe: string = "7d"): Promise<DashboardSummaryResponse> => {
    return apiClient<DashboardSummaryResponse>(`/api/dashboard/summary?timeframe=${encodeURIComponent(timeframe)}`);
  },
};
