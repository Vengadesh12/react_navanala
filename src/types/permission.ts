import type { ReactNode } from "react";

export interface Permission {
  id?: number;
  name: string;
  description: string;
  permissionKey: string;
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
