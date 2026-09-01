import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoginPage } from "../pages/auth/LoginPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { UsersPage } from "../pages/users/UsersPage";
import { RolesPage } from "../pages/roles/RolesPage";
import { DepartmentsPage } from "../pages/departments/DepartmentsPage";
import { PermissionsPage } from "../pages/permissions/PermissionsPage";
import { ReportsPage } from "../pages/overview/ReportsPage";
import { ProjectsPage } from "../pages/overview/ProjectsPage";
import { CalendarPage } from "../pages/overview/CalendarPage";
import { SettingsPage } from "../pages/overview/SettingsPage";
import { ProfilePage } from "../pages/overview/ProfilePage";
import { AuditPage } from "../pages/overview/AuditPage";
import { UserActivityPage } from "../pages/activity/UserActivityPage";
import { CreateApprovalPage } from "../pages/approvals/CreateApprovalPage";
import { PurchasesPage } from "../pages/purchases/PurchasesPage";
import { InvoicesPage } from "../pages/invoices/InvoicesPage";

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected RBAC Workspace Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute permission="dashboard.view">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-user"
        element={
          <ProtectedRoute permission="users.view">
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute permission="users.view">
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute permission="roles.view">
            <RolesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute permission="departments.view">
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/permissions"
        element={
          <ProtectedRoute permission="permissions.manage">
            <PermissionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-approval"
        element={
          <ProtectedRoute permission="approvals.view">
            <CreateApprovalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute permission="approvals.view">
            <CreateApprovalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchases"
        element={
          <ProtectedRoute permission="purchases.view">
            <PurchasesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/purchase" element={<Navigate to="/purchases" replace />} />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute permission="invoices.view">
            <InvoicesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/invoice" element={<Navigate to="/invoices" replace />} />
      <Route
        path="/reports"
        element={
          <ProtectedRoute permission="reports.view">
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute permission="projects.view">
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute permission="calendar.view">
            <CalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute permission="settings.view">
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute permission="audit.view">
            <AuditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user-activity"
        element={
          <ProtectedRoute permission="user_activity.view">
            <UserActivityPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback & Root Redirection */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRoutes;
