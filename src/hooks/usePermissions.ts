import { useAuth } from "./useAuth";

export const usePermissions = () => {
  const { user, can, refreshPermissions } = useAuth();

  return {
    permissions: user?.permissions || [],
    roleId: user?.roleId,
    roleName: user?.roleName,
    isSuperAdmin: Number(user?.roleId) === 2,
    hasPermission: can,
    refreshPermissions,
  };
};
