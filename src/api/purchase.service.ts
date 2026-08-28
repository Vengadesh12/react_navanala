import { apiClient } from "./client";
import type {
  PurchaseDto,
  CreatePurchasePayload,
  UpdatePurchasePayload,
  ApprovedProductDto,
  PurchaseSummaryDto,
  PurchaseQueryParameters,
  PagedPurchaseResponse,
} from "../types/purchase";

export const purchaseService = {
  getPurchases: async (query?: PurchaseQueryParameters): Promise<PagedPurchaseResponse> => {
    const params = new URLSearchParams();
    if (query?.status && query.status !== "ALL") params.append("status", query.status);
    if (query?.category && query.category !== "ALL") params.append("category", query.category);
    if (query?.search) params.append("search", query.search);
    if (query?.page) params.append("page", query.page.toString());
    if (query?.pageSize) params.append("pageSize", query.pageSize.toString());

    const queryString = params.toString();
    return apiClient<PagedPurchaseResponse>(`/api/purchases${queryString ? `?${queryString}` : ""}`);
  },

  getApprovedProducts: async (): Promise<ApprovedProductDto[]> => {
    return apiClient<ApprovedProductDto[]>("/api/purchases/approved-products");
  },

  getSummary: async (): Promise<PurchaseSummaryDto> => {
    return apiClient<PurchaseSummaryDto>("/api/purchases/summary");
  },

  getPurchaseById: async (id: number): Promise<{ success: boolean; message?: string; data: PurchaseDto }> => {
    return apiClient<{ success: boolean; message?: string; data: PurchaseDto }>(`/api/purchases/${id}`);
  },

  createPurchase: async (
    payload: CreatePurchasePayload
  ): Promise<{ success: boolean; message?: string; data: PurchaseDto }> => {
    return apiClient<{ success: boolean; message?: string; data: PurchaseDto }>("/api/purchases", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(payload),
    });
  },

  updatePurchase: async (
    id: number,
    payload: UpdatePurchasePayload
  ): Promise<{ success: boolean; message?: string; data: PurchaseDto }> => {
    return apiClient<{ success: boolean; message?: string; data: PurchaseDto }>(`/api/purchases/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify(payload),
    });
  },

  deletePurchase: async (id: number): Promise<{ success: boolean; message?: string }> => {
    return apiClient<{ success: boolean; message?: string }>(`/api/purchases/${id}`, {
      method: "DELETE",
    });
  },
};
