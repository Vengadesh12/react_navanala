import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  Search,
  Add,
  DeleteOutline,
  Refresh,
  VisibilityOutlined,
  CheckCircleOutline,
  WarningAmberOutlined,
  ErrorOutline,
  Close,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { auditService } from "../../api/audit.service";
import { showConfirmDialog, showSuccessToast, showErrorToast } from "../../utils/alerts";
import type { AuditLog, AuditLogFormData } from "../../types";

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({ totalEvents: 0, successfulLogins: 0, privilegeChanges: 0 });
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [viewLog, setViewLog] = useState<AuditLog | null>(null);
  const [formData, setFormData] = useState<AuditLogFormData>({
    action: "",
    module: "Security",
    details: "",
    status: "Success",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditService.getLogs(selectedModule, searchTerm);
      setLogs(res.logs || []);
      setStats({
        totalEvents: res.totalEvents,
        successfulLogins: res.successfulLogins,
        privilegeChanges: res.privilegeChanges,
      });
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to load audit logs from database.");
    } finally {
      setLoading(false);
    }
  }, [selectedModule, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.action.trim() || !formData.details.trim()) {
      showErrorToast("Action and details are required.");
      return;
    }

    setSubmitting(true);
    try {
      await auditService.createLog(formData);
      showSuccessToast("Audit log event recorded successfully!");
      setIsCreateOpen(false);
      setFormData({ action: "", module: "Security", details: "", status: "Success" });
      fetchLogs();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to record log.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await showConfirmDialog(
      "Delete Audit Entry?",
      "Are you sure you want to remove this log record?",
      "Delete",
      "Cancel",
      true
    );
    if (res.isConfirmed) {
      try {
        await auditService.deleteLog(id);
        showSuccessToast("Audit log deleted from database.");
        fetchLogs();
      } catch (err: any) {
        showErrorToast(err?.message || "Failed to delete log.");
      }
    }
  };

  const modules = ["ALL", "Users", "Roles", "Permissions", "Auth", "Security", "Reports", "Projects"];

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <CheckCircleOutline sx={{ fontSize: 13 }} />
            <span>Success</span>
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            <WarningAmberOutlined sx={{ fontSize: 13 }} />
            <span>Warning</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
            <ErrorOutline sx={{ fontSize: 13 }} />
            <span>Failed</span>
          </span>
        );
    }
  };

  return (
    <WorkspaceLayout permission="audit.view" label="Audit Logs" icon="◌" showHero={false}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">


          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLogs()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Refresh sx={{ fontSize: 16, color: "#64748b" }} className={loading ? "animate-spin text-blue-600" : ""} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Add sx={{ fontSize: 16 }} />
              <span>Record Event</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Total Events */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-500/10 via-white to-white dark:from-indigo-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Total Events</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.totalEvents}</span>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">+18% activity</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Audit trail log entries</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-500 text-white shadow-md shadow-indigo-500/25">
                <History sx={{ fontSize: 24 }} />
              </div>
            </div>
          </div>

          {/* Card 2: Successful Logins */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Successful Logins</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.successfulLogins}</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">98.8% rate</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Verified authentications</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                <CheckCircleOutline sx={{ fontSize: 24 }} />
              </div>
            </div>
          </div>

          {/* Card 3: Privilege Changes */}
          <div className="relative overflow-hidden rounded-2xl border border-purple-200/70 dark:border-purple-900/60 bg-gradient-to-br from-purple-500/10 via-white to-white dark:from-purple-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Privilege Changes</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.privilegeChanges}</span>
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">verified</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Role assignment modifications</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-purple-500 text-white shadow-md shadow-purple-500/25">
                <History sx={{ fontSize: 24 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {modules.map((mod) => (
              <button
                key={mod}
                onClick={() => setSelectedModule(mod)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${selectedModule === mod
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {mod}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search sx={{ fontSize: 18 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search action or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Main Audit Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3.5">EVENT ACTION</th>
                  <th className="px-5 py-3.5">MODULE</th>
                  <th className="px-5 py-3.5">PERFORMED BY</th>
                  <th className="px-5 py-3.5">STATUS</th>
                  <th className="px-5 py-3.5">IP ADDRESS</th>
                  <th className="px-5 py-3.5">TIMESTAMP</th>
                  <th className="px-5 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 max-w-[220px] truncate" title={log.action}>
                        {log.action}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          {log.module}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">{log.performedBy}</td>
                      <td className="px-5 py-3.5">{getStatusBadge(log.status)}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">{log.ipAddress}</td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setViewLog(log)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 cursor-pointer"
                          title="View Details"
                        >
                          <VisibilityOutlined sx={{ fontSize: 17 }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(log.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Delete"
                        >
                          <DeleteOutline sx={{ fontSize: 17 }} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      {loading ? "Loading audit logs from database..." : "No audit events found matching filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Event Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Audit Log Event</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Action *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Permission Matrix modified"
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Module</label>
                  <select
                    value={formData.module}
                    onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Security">Security</option>
                    <option value="Users">Users</option>
                    <option value="Roles">Roles</option>
                    <option value="Permissions">Permissions</option>
                    <option value="Auth">Auth</option>
                    <option value="Reports">Reports</option>
                    <option value="Projects">Projects</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Success">Success</option>
                    <option value="Warning">Warning</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Details & Scope *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain event details, impacted user/role IDs, and outcome..."
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Audit Log Details</h3>
              <button
                type="button"
                onClick={() => setViewLog(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Log ID:</span>
                <span className="font-bold text-slate-800">#{viewLog.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Action:</span>
                <span className="font-bold text-slate-800">{viewLog.action}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Module:</span>
                <span className="font-semibold text-blue-600">{viewLog.module}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Performed By:</span>
                <span className="font-medium text-slate-700">{viewLog.performedBy}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Status:</span>
                <span>{getStatusBadge(viewLog.status)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">IP Address:</span>
                <span className="font-mono text-slate-600">{viewLog.ipAddress}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400 font-medium">Recorded At:</span>
                <span className="text-slate-600">{new Date(viewLog.createdAt).toLocaleString()}</span>
              </div>
              <div className="pt-2">
                <span className="block text-slate-400 font-medium mb-1">Details:</span>
                <p className="rounded-xl bg-slate-50 p-3 text-slate-700 leading-relaxed border border-slate-100">
                  {viewLog.details}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewLog(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};

export default AuditPage;
