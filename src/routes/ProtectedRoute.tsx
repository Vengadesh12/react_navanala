import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { getFirstAccessiblePath } from "../config/workspace.config";

export interface ProtectedRouteProps {
  permission?: string;
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permission, children }) => {
  const { user, can, refreshPermissions } = useAuth();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied" | "login">(() => {
    if (!user) return "login";
    if (can(permission)) {
      return "allowed";
    }
    return "checking";
  });

  useEffect(() => {
    if (!user) {
      setStatus("login");
      return;
    }

    if (can(permission)) {
      setStatus("allowed");
      return;
    }

    let isMounted = true;
    // Attempt fresh revalidation with server before denying
    refreshPermissions(true)
      .then(() => {
        if (!isMounted) return;
        setStatus(can(permission) ? "allowed" : "denied");
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus(can(permission) ? "allowed" : "denied");
      });

    return () => {
      isMounted = false;
    };
  }, [permission, user, can, refreshPermissions]);

  if (status === "checking") {
    return <LoadingSpinner fullScreen message="Verifying role permissions..." />;
  }

  if (status === "login") {
    return <Navigate to="/login" replace />;
  }

  if (status === "denied") {
    const targetPath = getFirstAccessiblePath(user);
    const safePath = !targetPath || targetPath === "/login" ? "/profile" : targetPath;
    return <Navigate to={safePath} replace />;
  }

  return children;
};

export default ProtectedRoute;
