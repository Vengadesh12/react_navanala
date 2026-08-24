export interface LoggedInUser {
  id: number;
  name: string;
  email: string;
  roleId: number | string;
  roleName?: string;
  permissions: string[];
  token?: string;
  phone?: string;
  age?: number;
  address?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthResponseData {
  id: number;
  name: string;
  email: string;
  roleId: number;
  roleName?: string;
  permissions: string[];
  token: string;
}

export interface AuthResponse {
  success?: boolean;
  message?: string;
  data: AuthResponseData;
}

export interface PermissionCheckResponse {
  permissions: string[];
}
