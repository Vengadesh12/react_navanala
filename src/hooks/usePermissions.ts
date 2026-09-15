import { useAuth } from "./useAuth";

export const usePermissions = () => {
  const { user, can, refreshPermissions } = useAuth();

  return {
    permissions: user?.permissions || [],
    roleId: user?.roleId,
    roleName: user?.roleName,
    isSuperAdmin: Boolean(user?.isSuperAdmin || can("manage_all_permissions") || user?.roleName?.toLowerCase().includes("super admin")),
    hasPermission: can,
    refreshPermissions,
  };
};
