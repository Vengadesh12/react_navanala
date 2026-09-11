import type { ReactNode } from "react";

export interface Permission {
  id?: number;
  name: string;
  description: string;
  permissionKey: string;
  category?: string;
}

export interface RolePermissionItem {
  roleId: number | string;
  roleName: string;
  permissionKeys: string[];
}

export interface DepartmentPermissionItem {
  departmentId: number | string;
  departmentName: string;
  permissionKeys: string[];
}

export interface PermissionsApiResponse {
  permissions: Permission[];
  roles: RolePermissionItem[];
  departments?: DepartmentPermissionItem[];
}

export interface PermissionCategory {
  id: string;
  name: string;
  desc: string;
  icon: ReactNode;
  color: string;
  keys: string[];
}

export interface CategoryWithPermissions extends PermissionCategory {
  permissions: Permission[];
  totalInCat: number;
}

export interface UserPermissionOverview {
  userId: number;
  name: string;
  email: string;
  roleId?: number | null;
  roleName: string;
  departmentId?: number | null;
  departmentName: string;
  designationId?: number | null;
  designationName: string;
  directPermissionsCount: number;
  rolePermissionsCount?: number;
  departmentPermissionsCount?: number;
  totalEffectivePermissionsCount: number;
}

export interface UserPermissionDetail {
  permissionId: number;
  permissionKey: string;
  name: string;
  description: string;
  category: string;
  access: string;
  isAllowed: boolean;
  isDirect: boolean;
  isFromRole?: boolean;
  isFromDepartment?: boolean;
  source: string; // "UserDirectGrant" | "SuperAdmin" | "Role" | "Department" | "RoleAndDepartment" | "DefaultDeny"
  departmentName?: string | null;
  roleName?: string | null;
  userPermissionId?: number | null;
  grantedAt?: string | null;
}

export interface UserPermissionProfile {
  userId: number;
  name: string;
  email: string;
  roleId?: number | null;
  roleName: string;
  departmentId?: number | null;
  departmentName: string;
  designationId?: number | null;
  designationName: string;
  directCount: number;
  roleCount?: number;
  departmentCount?: number;
  totalCount: number;
  permissions: UserPermissionDetail[];
}

export interface AssignPermissionPayload {
  permissionKey: string;
  reason?: string;
}

