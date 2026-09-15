export interface Role {
  id: number | string;
  name: string;
  description?: string;
  isSuperAdmin?: boolean;
  isSystemRole?: boolean;
  createdAt?: string;
  CreatedAt?: string;
}

export interface RoleFormData {
  name: string;
  description?: string;
}

export interface RoleMeta {
  name: string;
  color: string;
  badge: string;
  ring: string;
}
