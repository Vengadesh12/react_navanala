import { apiClient } from "./client";
import type { User, UserFormData } from "../types";

export const userService = {
  getUsers: async (): Promise<User[]> => {
    return apiClient<User[]>("/get");
  },

  createUser: async (userData: UserFormData): Promise<{ message?: string; data?: User }> => {
    return apiClient<{ message?: string; data?: User }>("/api/users", {
      method: "POST",
      includeJson: true,
      body: JSON.stringify({
        name: userData.name.trim(),
        email: userData.email.trim(),
        password: userData.password,
        phone: userData.phone.trim(),
        age: Number(userData.age),
        address: userData.address.trim(),
        roleId: Number(userData.roleId),
        designationId: Number(userData.designationId),
      }),
    });
  },

  updateUser: async (id: number | string, userData: UserFormData): Promise<{ message?: string; data?: User }> => {
    return apiClient<{ message?: string; data?: User }>(`/api/users/${id}`, {
      method: "PUT",
      includeJson: true,
      body: JSON.stringify({
        name: userData.name.trim(),
        email: userData.email.trim(),
        password: userData.password,
        phone: userData.phone.trim(),
        age: Number(userData.age),
        address: userData.address.trim(),
        roleId: Number(userData.roleId),
        designationId: Number(userData.designationId),
      }),
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
