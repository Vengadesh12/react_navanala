import type { MenuItemDto } from "./navigation";

export interface LoggedInUser {
  id: number;
  name: string;
  email: string;
  roleId: number | string;
  roleName?: string;
  permissions: string[];
  menus?: MenuItemDto[];
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
  menus?: MenuItemDto[];
  token: string;
}

export interface AuthResponse {
  success?: boolean;
  message?: string;
  requiresTwoFactor?: boolean;
  data: AuthResponseData;
}

export interface PermissionCheckResponse {
  permissions: string[];
}

export interface PasswordCriteriaStatus {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export interface PasswordEvaluationResult {
  isValid: boolean;
  isStrong: boolean;
  score: number;
  strengthLabel: "Empty" | "Very Weak" | "Weak" | "Fair" | "Good" | "Strong" | string;
  criteria: PasswordCriteriaStatus;
  errors: string[];
  message?: string;
}


