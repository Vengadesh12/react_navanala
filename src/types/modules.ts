// ==========================================
// AUDIT LOG TYPES
// ==========================================
export interface AuditLog {
  id: number;
  action: string;
  module: string;
  performedBy: string;
  details: string;
  ipAddress: string;
  status: string;
  createdAt: string;
  deletedFlag: number;
}

export interface AuditLogFormData {
  action: string;
  module: string;
  details: string;
  status?: string;
  ipAddress?: string;
}

export interface AuditLogOverviewResponse {
  totalEvents: number;
  successfulLogins: number;
  privilegeChanges: number;
  logs: AuditLog[];
}

// ==========================================
// REPORT TYPES
// ==========================================
export interface Report {
  id: number;
  title: string;
  description: string;
  categoryId?: number;
  category: string;
  format: string;
  createdBy: string;
  status: string;
  fileSize: string;
  createdAt: string;
  deletedFlag: number;
}

export interface ReportFormData {
  title: string;
  description: string;
  categoryId?: number;
  category: string;
  format: string;
}

export interface ReportCategory {
  id: number;
  name: string;
  description?: string;
  deletedFlag: number;
  createdAt: string;
}

export interface CreateReportCategoryFormData {
  name: string;
  description?: string;
}

export interface ReportsOverviewResponse {
  reportsGenerated: number;
  exportsReady: number;
  roleCoverage: string;
  reports: Report[];
  categories?: ReportCategory[];
}

// ==========================================
// PROJECT TYPES
// ==========================================
export interface Project {
  id: number;
  name: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  leadName: string;
  progressPercentage: number;
  dueDate: string;
  createdAt: string;
  deletedFlag: number;
}

export interface ProjectFormData {
  name: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  leadName: string;
  progressPercentage: number;
  dueDate: string;
}

export interface ProjectCategory {
  id: number;
  name: string;
  description?: string;
  deletedFlag: number;
  createdAt: string;
}

export interface CreateProjectCategoryFormData {
  name: string;
  description?: string;
}

export interface ProjectsOverviewResponse {
  activeRollouts: number;
  onTrackCount: number;
  pendingReviewsCount: number;
  projects: Project[];
}

// ==========================================
// SCHEDULE TYPES
// ==========================================
export interface ScheduleEvent {
  id: number;
  title: string;
  description: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  organizer: string;
  status: string;
  priority: string;
  attendeesCount: number;
  createdAt: string;
  deletedFlag: number;
}

export interface ScheduleFormData {
  title: string;
  description: string;
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  organizer: string;
  status: string;
  priority: string;
  attendeesCount: number;
}

export interface EventType {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt?: string;
  createdBy?: string;
  eventCount?: number;
}

export interface CreateEventTypeFormData {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface SchedulesOverviewResponse {
  upcomingReviews: number;
  teamAvailability: string;
  dueThisWeek: number;
  schedules: ScheduleEvent[];
  eventTypes?: EventType[];
}

// ==========================================
// SYSTEM SETTINGS TYPES
// ==========================================
export interface SettingCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
  createdAt: string;
  createdBy: string;
  deletedFlag: number;
  settingsCount?: number;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
}

export interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  category: string;
  description: string;
  dataType: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateSettingRequest {
  settingKey: string;
  settingValue: string;
  category: string;
  description: string;
  dataType?: string;
}

export interface UpdateSettingRequest {
  settingKey: string;
  settingValue: string;
  category: string;
  description: string;
  dataType?: string;
}

export interface SettingsOverviewResponse {
  securityLevel: string;
  alertChannels: number;
  sessionTimeout: string;
  totalSettings?: number;
  totalCategories?: number;
  settings: SystemSetting[];
  categories?: SettingCategory[];
}

// ==========================================
// USER PROFILE TYPES
// ==========================================
export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  age?: number;
  address?: string;
  roleId?: number | null;
  roleName?: string;
  permissions?: string[];
}

export interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  age: number;
  address: string;
}

export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ==========================================
// DEPARTMENT TYPES
// ==========================================
import type { Designation } from "./user";

export interface Department {
  id: number;
  name: string;
  description?: string;
  deletedFlag: number;
  createdAt: string;
  designationCount?: number;
  userCount?: number;
  designations?: Designation[];
}

export interface CreateDepartmentFormData {
  name: string;
  description?: string;
  designationIds?: number[];
}

export interface UpdateDepartmentFormData {
  name: string;
  description?: string;
  designationIds?: number[];
}

export interface DepartmentOverviewResponse {
  totalDepartments: number;
  totalDesignations: number;
  mappedDesignations: number;
  unassignedDesignations: number;
  departments: Department[];
  unassignedList: Designation[];
}
