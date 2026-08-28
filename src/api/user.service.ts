import { apiClient } from "./client";
import type { User, UserFormData } from "../types";

export const userService = {
  getUsers: async (): Promise<User[]> => {
    return apiClient<User[]>("/api/users");
  },

  createUser: async (userData: UserFormData): Promise<{ message?: string; data?: User }> => {
    const payload: any = {
      name: userData.name.trim(),
      email: userData.email.trim(),
      password: userData.password,
      phone: userData.phone.trim(),
      age: Number(userData.age),
      address: userData.address.trim(),
      roleId: Number(userData.roleId),
      designationId: userData.designationId ? Number(userData.designationId) : null,
    };

    return apiClient<{ message?: string; data?: User }>("/api/users", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify(payload),
    });
  },

  updateUser: async (id: number | string, userData: UserFormData): Promise<{ message?: string; data?: User }> => {
    const payload: any = {
      name: userData.name.trim(),
      email: userData.email.trim(),
      phone: userData.phone.trim(),
      age: Number(userData.age),
      address: userData.address.trim(),
      roleId: Number(userData.roleId),
      designationId: userData.designationId ? Number(userData.designationId) : null,
    };

    if (userData.password && userData.password.trim()) {
      payload.password = userData.password;
    }

    return apiClient<{ message?: string; data?: User }>(`/api/users/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify(payload),
    });
  },

  deleteUser: async (id: number | string): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/users/${id}`, {
      method: "DELETE",
    });
  },

  restoreUser: async (id: number | string): Promise<{ message?: string }> => {
    return apiClient<{ message?: string }>(`/api/users/${id}/restore`, {
      method: "POST",
    });
  },
};
