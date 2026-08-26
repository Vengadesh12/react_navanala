import { apiClient } from "./client";
import type { MenuItemDto } from "../types";

export const menuService = {
  getUserMenus: async (): Promise<MenuItemDto[]> => {
    return apiClient<MenuItemDto[]>("/api/menus");
  },

  getAllMenus: async (): Promise<MenuItemDto[]> => {
    return apiClient<MenuItemDto[]>("/api/menus/all");
  },
};
