export interface MenuItemDto {
  id: number;
  menuKey: string;
  label: string;
  icon: string;
  route: string;
  groupName: string;
  description: string;
  orderIndex: number;
  permissionKey?: string | null;
  deletedFlag?: number;
}

export interface NavMenuItem {
  key: string;
  label: string;
  icon: string;
  to: string;
  group: string;
  desc: string;
  order?: number;
  permissionKey?: string | null;
}

export interface NavGroup {
  title: string;
  keys: string[];
}
