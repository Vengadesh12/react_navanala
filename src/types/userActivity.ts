export interface UserSessionItem {
  id: number;
  userId: number;
  email: string;
  userName: string;
  roleName: string;
  ipAddress: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  loginTime: string;
  logoutTime?: string | null;
  isActive: boolean;
  durationFormatted: string;
  status: "Active" | "Completed" | string;
}

export interface UserActivitySummary {
  activeUsersCount: number;
  totalLoginsToday: number;
  totalLogoutsToday: number;
  totalSessionsRecorded: number;
  activeSessions: UserSessionItem[];
  recentActivities: UserSessionItem[];
}

export interface UserActivityQuery {
  search?: string;
  status?: "all" | "active" | "completed" | string;
  page?: number;
  pageSize?: number;
}

export interface PagedUserActivityResponse {
  items: UserSessionItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
