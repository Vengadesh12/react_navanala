export interface PurchaseDto {
  id: number;
  approvalRequestId: number;
  itemName: string;
  category: string;
  quantity: number;
  estimatedAmount?: number;
  employeeName: string;
  employeeEmail: string;
  departmentName?: string;
  vendorName: string;
  vendorContact?: string;
  vendorEmail?: string;
  quotationNumber?: string;
  quotationAmount: number;
  quotationDate: string;
  deliveryTimeline?: string;
  paymentTerms?: string;
  notes?: string;
  status: "Quotation Received" | "PO Issued" | "In Procurement" | "Delivered" | "Completed" | "Cancelled" | string;
  createdByUserId: number;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePurchasePayload {
  approvalRequestId: number;
  vendorName: string;
  vendorContact?: string;
  vendorEmail?: string;
  quotationNumber?: string;
  quotationAmount: number;
  quotationDate?: string;
  deliveryTimeline?: string;
  paymentTerms?: string;
  notes?: string;
  status?: string;
}

export interface UpdatePurchasePayload {
  vendorName: string;
  vendorContact?: string;
  vendorEmail?: string;
  quotationNumber?: string;
  quotationAmount: number;
  quotationDate?: string;
  deliveryTimeline?: string;
  paymentTerms?: string;
  notes?: string;
  status: string;
}

export interface ApprovedProductDto {
  id: number;
  itemName: string;
  category: string;
  quantity: number;
  estimatedAmount?: number;
  priority: string;
  employeeName: string;
  employeeEmail: string;
  departmentName?: string;
  description: string;
  reviewedAt?: string;
  reviewedByName?: string;
  hasExistingQuotation: boolean;
  quotationCount?: number;
  existingPurchaseId?: number;
}

export interface PurchaseSummaryDto {
  totalPurchases: number;
  totalQuotationValue: number;
  quotationReceivedCount: number;
  poIssuedCount: number;
  inProcurementCount: number;
  deliveredCount: number;
  completedCount: number;
  approvedItemsPendingQuotation: number;
}

export interface PurchaseQueryParameters {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedPurchaseResponse {
  data: PurchaseDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
