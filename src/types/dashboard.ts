export interface DashboardKpiMetrics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalRoles: number;
  totalPermissions: number;
  activeSessions: number;
  usersGrowth: string;
  rolesGrowth: string;
  permissionsGrowth: string;
  sessionsGrowth: string;
}

export interface DashboardRoleDistributionItem {
  roleId: number;
  name: string;
  count: number;
  percentageValue: number;
  percentage: string;
  color: string;
  strokeDash: string;
  strokeOffset: string;
}

export interface DashboardRecentUserItem {
  id: number;
  name: string;
  email: string;
  roleId?: number | null;
  role: string;
  roleBadge: string;
  status: string;
  lastLogin: string;
  avatar: string;
  phone?: string;
}

export interface DashboardActivityItem {
  id: number;
  type: string;
  title: string;
  targetName?: string;
  targetHighlight?: string;
  actionText?: string;
  author: string;
  time: string;
  iconBg: string;
}

export interface DashboardChartPoint {
  day: string;
  active: number;
  newUsers: number;
  total: number;
}

export interface DashboardSummaryResponse {
  kpis: DashboardKpiMetrics;
  roleDistribution: DashboardRoleDistributionItem[];
  recentUsers: DashboardRecentUserItem[];
  recentActivities: DashboardActivityItem[];
  chartData: DashboardChartPoint[];
  dateRangeDescription: string;
}
