export interface Designation {
  id: number;
  Id?: number;
  name: string;
  Name?: string;
  description?: string;
  Description?: string;
  departmentId?: number | null;
  DepartmentId?: number | null;
  departmentName?: string | null;
  DepartmentName?: string | null;
  deletedFlag?: number;
  DeletedFlag?: number;
}

export interface User {
  id: number;
  Id?: number;
  name: string;
  Name?: string;
  email: string;
  Email?: string;
  phone?: string;
  Phone?: string;
  age?: number | string;
  Age?: number | string;
  address?: string;
  Address?: string;
  roleId: number | string;
  RoleId?: number | string;
  roleName?: string;
  RoleName?: string;
  designationId?: number | string;
  DesignationId?: number | string;
  designationName?: string;
  DesignationName?: string;
  deletedFlag?: number | string;
  DeletedFlag?: number | string;
  deletedflag?: number | string;
  isFirstLogin?: boolean;
  IsFirstLogin?: boolean;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  phone: string;
  age: number | string;
  address: string;
  roleId: number | string;
  designationId: number | string;
}

export interface UserFormErrors {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  age?: string;
  address?: string;
  roleId?: string;
  designationId?: string;
}

export type UserStatusFilter = "ALL" | "ACTIVE" | "ONLINE" | "DELETED";
