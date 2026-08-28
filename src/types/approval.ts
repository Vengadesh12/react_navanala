export interface ApprovalItem {
  id: number;
  userId: number;
  employeeName: string;
  employeeEmail: string;
  departmentName?: string | null;
  itemName: string;
  category: string;
  description: string;
  quantity: number;
  priority: "Low" | "Medium" | "High" | "Urgent" | string;
  estimatedAmount?: number | null;
  status: "Pending" | "Approved" | "Rejected" | string;
  comments?: string | null;
  reviewedById?: number | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  deletedFlag: number;
}

export interface CreateApprovalPayload {
  itemName: string;
  category: string;
  description: string;
  quantity: number;
  priority: string;
  estimatedAmount?: number | null;
}

export interface ApprovalActionPayload {
  action: "Approve" | "Reject" | string;
  comments?: string;
}

export interface ApprovalSummary {
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  myRequestsCount: number;
}

export interface PagedApprovalResponse {
  items: ApprovalItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  summary: ApprovalSummary;
}

export interface ApprovalQueryParams {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  scope?: "all" | "my";
  page?: number;
  pageSize?: number;
}
