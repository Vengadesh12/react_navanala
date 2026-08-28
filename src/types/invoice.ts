export interface InvoiceItemDto {
  id?: number;
  invoiceId?: number;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  orderIndex?: number;
}

export interface InvoiceDto {
  id: number;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;
  companyGstin: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  totalAmountInWords: string;
  status: "Draft" | "Pending" | "Paid" | "Overdue" | "Cancelled" | string;
  paymentMethod?: string;
  notes?: string;
  termsAndConditions?: string;
  createdByUserId: number;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  items: InvoiceItemDto[];
}

export interface CreateInvoiceItemPayload {
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

export interface CreateInvoicePayload {
  invoiceNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerGstin?: string;
  companyGstin?: string;
  invoiceDate?: string;
  dueDate?: string;
  discountAmount?: number;
  status?: string;
  paymentMethod?: string;
  notes?: string;
  termsAndConditions?: string;
  items: CreateInvoiceItemPayload[];
}

export interface UpdateInvoicePayload extends CreateInvoicePayload {}

export interface InvoiceSummaryDto {
  totalInvoices: number;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
  totalGstCollected: number;
  paidCount: number;
  pendingCount: number;
  draftCount: number;
  overdueCount: number;
}

export interface PagedInvoiceResponse {
  success: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  data: InvoiceDto[];
}
