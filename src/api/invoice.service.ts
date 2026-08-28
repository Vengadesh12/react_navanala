import { apiClient } from "./client";
import type {
  InvoiceDto,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  InvoiceSummaryDto,
  PagedInvoiceResponse,
} from "../types/invoice";

export const invoiceService = {
  getInvoices: async (params?: {
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PagedInvoiceResponse> => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== "ALL") q.append("status", params.status);
    if (params?.search) q.append("search", params.search);
    if (params?.startDate) q.append("startDate", params.startDate);
    if (params?.endDate) q.append("endDate", params.endDate);
    if (params?.page) q.append("page", params.page.toString());
    if (params?.pageSize) q.append("pageSize", params.pageSize.toString());

    const qs = q.toString();
    return apiClient<PagedInvoiceResponse>(`/api/invoices${qs ? `?${qs}` : ""}`);
  },

  getSummary: async (): Promise<InvoiceSummaryDto> => {
    return apiClient<InvoiceSummaryDto>("/api/invoices/summary");
  },

  getInvoiceById: async (id: number): Promise<InvoiceDto> => {
    return apiClient<InvoiceDto>(`/api/invoices/${id}`);
  },

  createInvoice: async (payload: CreateInvoicePayload): Promise<InvoiceDto> => {
    return apiClient<InvoiceDto>("/api/invoices", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(payload),
    });
  },

  updateInvoice: async (id: number, payload: UpdateInvoicePayload): Promise<InvoiceDto> => {
    return apiClient<InvoiceDto>(`/api/invoices/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify(payload),
    });
  },

  deleteInvoice: async (id: number): Promise<{ success: boolean; message?: string }> => {
    return apiClient<{ success: boolean; message?: string }>(`/api/invoices/${id}`, {
      method: "DELETE",
    });
  },
};
