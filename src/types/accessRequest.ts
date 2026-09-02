export interface AccessRequestItem {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  departmentName?: string | null;
  roleName?: string | null;
  permissionKey: string;
  permissionName: string;
  module?: string | null;
  reason: string;
  priority: "Low" | "Medium" | "High" | "Urgent" | string;
  status: "Pending" | "Approved" | "Rejected" | string;
  reviewerId?: number | null;
  reviewerName?: string | null;
  reviewerComments?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  deletedFlag: number;
}

export interface CreateAccessRequestPayload {
  permissionKey: string;
  reason: string;
  priority: "Low" | "Medium" | "High" | "Urgent" | string;
}

export interface ReviewAccessRequestPayload {
  comments?: string;
}

export interface AvailablePermissionItem {
  id: number;
  permissionKey: string;
  name: string;
  description: string;
  module: string;
  isGranted: boolean;
  hasPendingRequest: boolean;
}

export interface AccessRequestSummary {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  myPendingRequests: number;
}

export interface PagedAccessRequestResponse {
  items: AccessRequestItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AccessRequestQueryParams {
  status?: string;
  priority?: string;
  search?: string;
  module?: string;
  page?: number;
  pageSize?: number;
  onlyMyRequests?: boolean;
}
