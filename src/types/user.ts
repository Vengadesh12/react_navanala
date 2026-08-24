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
  deletedFlag?: number | string;
  DeletedFlag?: number | string;
  deletedflag?: number | string;
}

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  phone: string;
  age: number | string;
  address: string;
  roleId: number | string;
}

export interface UserFormErrors {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  age?: string;
  address?: string;
  roleId?: string;
}

export type UserStatusFilter = "ALL" | "ACTIVE" | "DELETED";
