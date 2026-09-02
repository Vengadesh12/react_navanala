import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  KeyOutlined,
  LockOpen,
  Lock,
  CheckCircle,
  HourglassEmpty,
  CancelOutlined,
  Search,
  FilterList,
  Refresh,
  Send,
  Check,
  Close,
  PersonOutline,
  CorporateFare,
  Shield,
  PriorityHigh,
  AutoAwesome,
  InfoOutlined,
  DeleteOutline,
  AdminPanelSettings,
  FactCheck,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { useAuth } from "../../hooks/useAuth";
import { accessRequestService } from "../../api/accessRequest.service";
import { showSuccessAlert, showErrorAlert, showConfirmDialog } from "../../utils/alerts";
import { getProfileImageUrl } from "../../utils/image";
import type {
  AccessRequestItem,
  AccessRequestSummary,
  AvailablePermissionItem,
} from "../../types";

export const RequestAccessPage: React.FC = () => {
  const { user, refreshPermissions } = useAuth();

  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    const roleId = Number(user.roleId);
    const roleName = (user.roleName || "").toLowerCase();
    return roleId === 2 || roleName.includes("super admin") || roleName === "admin";
  }, [user]);

  // Tab State: 'catalog' | 'queue' | 'history'
  const [activeTab, setActiveTab] = useState<"catalog" | "queue" | "history">(() =>
    isSuperAdmin ? "queue" : "catalog"
  );

  // Data States
  const [permissions, setPermissions] = useState<AvailablePermissionItem[]>([]);
  const [requests, setRequests] = useState<AccessRequestItem[]>([]);
  const [myRequests, setMyRequests] = useState<AccessRequestItem[]>([]);
  const [summary, setSummary] = useState<AccessRequestSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters for Catalog
  const [catalogSearch, setCatalogSearch] = useState<string>("");
  const [catalogModule, setCatalogModule] = useState<string>("all");
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<"all" | "granted" | "locked">("all");

  // Filters for Requests Queue
  const [queueSearch, setQueueSearch] = useState<string>("");
  const [queueStatus, setQueueStatus] = useState<string>("all");
  const [queuePriority, setQueuePriority] = useState<string>("all");

  // Modals
  const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);
  const [selectedPermission, setSelectedPermission] = useState<AvailablePermissionItem | null>(null);
  const [requestReason, setRequestReason] = useState<string>("");
  const [requestPriority, setRequestPriority] = useState<"Low" | "Medium" | "High" | "Urgent">("Medium");
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);

  // Review Modal (Approve / Reject)
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequestItem | null>(null);
  const [reviewAction, setReviewAction] = useState<"Approve" | "Reject">("Approve");
  const [reviewComments, setReviewComments] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // Load Data
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [permList, summaryData, myReqs] = await Promise.all([
        accessRequestService.getAvailablePermissions(),
        accessRequestService.getSummary(),
        accessRequestService.getMyRequests(),
      ]);

      setPermissions(permList);
      setSummary(summaryData);
      setMyRequests(myReqs);

      // If Super Admin, also fetch all team requests
      if (isSuperAdmin) {
        const pagedQueue = await accessRequestService.getRequests({ pageSize: 100 });
        setRequests(pagedQueue.items || []);
      }
    } catch (err: any) {
      console.error("Failed to load access request data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unique modules list for category filter
  const modulesList = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => {
      if (p.module) set.add(p.module);
    });
    return Array.from(set).sort();
  }, [permissions]);

  // Filtered Permissions Catalog
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      if (catalogModule !== "all" && p.module !== catalogModule) return false;
      if (catalogStatusFilter === "granted" && !p.isGranted) return false;
      if (catalogStatusFilter === "locked" && p.isGranted) return false;

      if (catalogSearch.trim()) {
        const s = catalogSearch.toLowerCase();
        const matchName = p.name.toLowerCase().includes(s);
        const matchKey = p.permissionKey.toLowerCase().includes(s);
        const matchDesc = p.description.toLowerCase().includes(s);
        const matchMod = p.module.toLowerCase().includes(s);
        if (!matchName && !matchKey && !matchDesc && !matchMod) return false;
      }
      return true;
    });
  }, [permissions, catalogModule, catalogStatusFilter, catalogSearch]);

  // Filtered Queue Requests
  const filteredQueueRequests = useMemo(() => {
    return requests.filter((r) => {
      if (queueStatus !== "all" && r.status.toLowerCase() !== queueStatus.toLowerCase()) return false;
      if (queuePriority !== "all" && r.priority.toLowerCase() !== queuePriority.toLowerCase()) return false;

      if (queueSearch.trim()) {
        const s = queueSearch.toLowerCase();
        const matchUser = r.userName.toLowerCase().includes(s) || r.userEmail.toLowerCase().includes(s);
        const matchPerm = r.permissionName.toLowerCase().includes(s) || r.permissionKey.toLowerCase().includes(s);
        const matchReason = r.reason.toLowerCase().includes(s);
        const matchDept = r.departmentName?.toLowerCase().includes(s);
        if (!matchUser && !matchPerm && !matchReason && !matchDept) return false;
      }
      return true;
    });
  }, [requests, queueStatus, queuePriority, queueSearch]);

  // Open Request Modal for a Permission
  const handleOpenRequestModal = (perm: AvailablePermissionItem) => {
    if (perm.isGranted) return;
    setSelectedPermission(perm);
    setRequestReason("");
    setRequestPriority("Medium");
    setRequestModalOpen(true);
  };

  // Submit Access Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPermission) return;
    if (!requestReason.trim()) {
      showErrorAlert("Justification Required", "Please provide a brief reason why you need this permission.");
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await accessRequestService.createRequest({
        permissionKey: selectedPermission.permissionKey,
        reason: requestReason.trim(),
        priority: requestPriority,
      });

      if (res.success) {
        showSuccessAlert(
          "Request Submitted",
          `Your request for ${selectedPermission.name} has been sent to Super Administrators for approval.`
        );
        setRequestModalOpen(false);
        await loadData(true);
        setActiveTab("history");
      }
    } catch (err: any) {
      showErrorAlert("Request Failed", err?.message || "Failed to submit permission request.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Open Review Modal for Super Admin
  const handleOpenReviewModal = (req: AccessRequestItem, action: "Approve" | "Reject") => {
    setSelectedRequest(req);
    setReviewAction(action);
    setReviewComments("");
    setReviewModalOpen(true);
  };

  // Submit Admin Review Decision
  const handleSubmitReview = async () => {
    if (!selectedRequest) return;

    setSubmittingReview(true);
    try {
      if (reviewAction === "Approve") {
        await accessRequestService.approveRequest(selectedRequest.id, {
          comments: reviewComments.trim() || undefined,
        });
        showSuccessAlert(
          "Access Granted",
          `Permission '${selectedRequest.permissionName}' granted to ${selectedRequest.userName}.`
        );
      } else {
        await accessRequestService.rejectRequest(selectedRequest.id, {
          comments: reviewComments.trim() || undefined,
        });
        showSuccessAlert(
          "Request Rejected",
          `Permission request for ${selectedRequest.userName} has been rejected.`
        );
      }

      setReviewModalOpen(false);
      await loadData(true);
      await refreshPermissions(true);
      window.dispatchEvent(new Event("access-requests-updated"));
    } catch (err: any) {
      showErrorAlert("Action Failed", err?.message || `Failed to ${reviewAction.toLowerCase()} request.`);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Cancel / Withdraw User's Own Pending Request
  const handleCancelRequest = async (id: number) => {
    const confirm = await showConfirmDialog(
      "Cancel Request?",
      "Are you sure you want to withdraw this permission access request?",
      "Withdraw Request",
      "Keep It",
      true
    );

    if (confirm.isConfirmed) {
      try {
        await accessRequestService.deleteRequest(id);
        showSuccessAlert("Request Withdrawn", "Your permission request has been cancelled.");
        await loadData(true);
      } catch (err: any) {
        showErrorAlert("Error", err?.message || "Failed to cancel request.");
      }
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "high":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "medium":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return {
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: <CheckCircle sx={{ fontSize: 13 }} />,
          label: "Approved & Granted",
        };
      case "rejected":
        return {
          bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          icon: <CancelOutlined sx={{ fontSize: 13 }} />,
          label: "Rejected",
        };
      default:
        return {
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          icon: <HourglassEmpty sx={{ fontSize: 13 }} className="animate-spin" />,
          label: "Pending Review",
        };
    }
  };

  return (
    <WorkspaceLayout
      label="Request Access"
      showHero={false}
      searchValue={catalogSearch}
      onSearchChange={setCatalogSearch}
      searchPlaceholder="Search permissions or modules..."
    >
      <div className="w-full min-h-screen bg-slate-50/50 dark:bg-[#0b0f19] px-4 py-6 sm:px-8 space-y-6">
        {/* Header Title Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-500/10 shrink-0">
              <KeyOutlined sx={{ fontSize: 24 }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Request Access & Permission Matrix
                </h1>
                <span className="hidden sm:inline-block rounded-full bg-indigo-500/10 dark:bg-indigo-950/80 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                  RBAC Dynamic Grant
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browse catalog permissions, request elevated access, and manage organizational permission approvals
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Refresh
                sx={{ fontSize: 16, color: "#64748b" }}
                className={refreshing ? "animate-spin text-blue-600" : ""}
              />
              <span>{refreshing ? "Syncing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {/* Metric KPI Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total System Capabilities</span>
              <div className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400">
                <Shield sx={{ fontSize: 18 }} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {permissions.length}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {permissions.filter((p) => p.isGranted).length} active for you
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {isSuperAdmin ? "Pending Admin Review" : "My Pending Requests"}
              </span>
              <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                <HourglassEmpty sx={{ fontSize: 18 }} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {summary?.pendingRequests ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Awaiting decision
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Approved Access</span>
              <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle sx={{ fontSize: 18 }} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {summary?.approvedRequests ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Granted & active
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rejected Requests</span>
              <div className="rounded-lg bg-rose-500/10 p-1.5 text-rose-600 dark:text-rose-400">
                <CancelOutlined sx={{ fontSize: 18 }} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {summary?.rejectedRequests ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              Declined requests
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "queue"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <AdminPanelSettings sx={{ fontSize: 16 }} />
              <span>Incoming Access Requests (Admin Queue)</span>
              {(summary?.pendingRequests ?? 0) > 0 && (
                <span className="ml-1 rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white shadow-xs">
                  {summary?.pendingRequests}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "catalog"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <LockOpen sx={{ fontSize: 16 }} />
            <span>Explore & Request Permissions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            }`}
          >
            <FactCheck sx={{ fontSize: 16 }} />
            <span>My Request History</span>
            {myRequests.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.2 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                {myRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: Permissions Catalog & Request View */}
        {activeTab === "catalog" && (
          <div className="space-y-4">
            {/* Catalog Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Module Category Filter Dropdown */}
                <select
                  value={catalogModule}
                  onChange={(e) => setCatalogModule(e.target.value)}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Modules ({permissions.length})</option>
                  {modulesList.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod} ({permissions.filter((p) => p.module === mod).length})
                    </option>
                  ))}
                </select>

                {/* Status Toggle Pills */}
                <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setCatalogStatusFilter("all")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                      catalogStatusFilter === "all"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogStatusFilter("locked")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                      catalogStatusFilter === "locked"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Need Access ({permissions.filter((p) => !p.isGranted).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogStatusFilter("granted")}
                    className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                      catalogStatusFilter === "granted"
                        ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Active / Granted ({permissions.filter((p) => p.isGranted).length})
                  </button>
                </div>
              </div>

              <span className="text-xs text-slate-400">
                Showing {filteredPermissions.length} of {permissions.length} capabilities
              </span>
            </div>

            {/* Permission Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPermissions.map((perm) => (
                <div
                  key={perm.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                    perm.isGranted
                      ? "border-emerald-200/80 dark:border-emerald-950/80 bg-gradient-to-b from-emerald-500/5 to-transparent dark:bg-slate-900/80"
                      : perm.hasPendingRequest
                      ? "border-amber-200/80 dark:border-amber-950/80 bg-gradient-to-b from-amber-500/5 to-transparent dark:bg-slate-900/80"
                      : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                        {perm.module}
                      </span>
                      {perm.isGranted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle sx={{ fontSize: 12 }} />
                          <span>Active Access</span>
                        </span>
                      ) : perm.hasPendingRequest ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <HourglassEmpty sx={{ fontSize: 12 }} />
                          <span>Pending Review</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          <Lock sx={{ fontSize: 12 }} />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      {perm.name}
                    </h3>
                    <code className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                      {perm.permissionKey}
                    </code>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {perm.description || "System permission governing capability access."}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    {perm.isGranted ? (
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check sx={{ fontSize: 14 }} />
                        Granted to your role/user
                      </span>
                    ) : perm.hasPendingRequest ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab("history")}
                        className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      >
                        View Pending Request →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenRequestModal(perm)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <KeyOutlined sx={{ fontSize: 14 }} />
                        <span>Request Access</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredPermissions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                <Shield sx={{ fontSize: 36, color: "#94a3b8" }} className="mx-auto" />
                <h4 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                  No matching permissions found
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your search filter or module category.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Super Admin Review Queue */}
        {activeTab === "queue" && isSuperAdmin && (
          <div className="space-y-4">
            {/* Queue Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search sx={{ fontSize: 16 }} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by requester, email, permission..."
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="w-64 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 py-1.5 pl-8 pr-3 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={queueStatus}
                  onChange={(e) => setQueueStatus(e.target.value)}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending Only</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>

                {/* Priority Filter */}
                <select
                  value={queuePriority}
                  onChange={(e) => setQueuePriority(e.target.value)}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="all">All Priorities</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <span className="text-xs text-slate-400">
                {filteredQueueRequests.length} incoming requests
              </span>
            </div>

            {/* Requests List */}
            <div className="space-y-3">
              {filteredQueueRequests.map((req) => {
                const statusMeta = getStatusBadge(req.status);
                const isPending = req.status.toLowerCase() === "pending";

                return (
                  <div
                    key={req.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs transition-all lg:flex-row lg:items-center lg:justify-between"
                  >
                    {/* Left: Employee Info & Requested Permission */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                        {req.userName.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {req.userName}
                          </h4>
                          <span className="text-[11px] text-slate-400">({req.userEmail})</span>
                          {req.roleName && (
                            <span className="rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.2 text-[10px] font-bold border border-purple-500/20">
                              {req.roleName}
                            </span>
                          )}
                          {req.departmentName && (
                            <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.2 text-[10px] font-semibold border border-blue-500/20">
                              {req.departmentName}
                            </span>
                          )}
                        </div>

                        {/* Requested Permission Banner */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Requested:
                          </span>
                          <span className="rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 text-xs font-bold border border-indigo-500/20">
                            {req.permissionName} ({req.permissionKey})
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.2 text-[10px] font-bold ${getPriorityBadge(
                              req.priority
                            )}`}
                          >
                            {req.priority} Priority
                          </span>
                        </div>

                        {/* Reason / Justification */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mt-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Reason: </span>
                          "{req.reason}"
                        </p>

                        {/* Reviewer Note if reviewed */}
                        {req.reviewerName && (
                          <div className="text-[11px] text-slate-400 pt-1">
                            Reviewed by <span className="font-semibold text-slate-600 dark:text-slate-300">{req.reviewerName}</span>
                            {req.reviewerComments && <span> — Note: "{req.reviewerComments}"</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Status Pill & Decision Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.bg}`}
                      >
                        {statusMeta.icon}
                        <span>{statusMeta.label}</span>
                      </span>

                      {isPending && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(req, "Approve")}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                          >
                            <Check sx={{ fontSize: 14 }} />
                            <span>Approve & Grant</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(req, "Reject")}
                            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
                          >
                            <Close sx={{ fontSize: 14 }} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredQueueRequests.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                  <CheckCircle sx={{ fontSize: 36, color: "#10b981" }} className="mx-auto" />
                  <h4 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                    No pending access requests
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    All permission requests have been reviewed and processed.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: My Request History */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                My Access Request Submissions ({myRequests.length})
              </h3>
            </div>

            <div className="space-y-3">
              {myRequests.map((req) => {
                const statusMeta = getStatusBadge(req.status);
                const isPending = req.status.toLowerCase() === "pending";

                return (
                  <div
                    key={req.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 text-xs font-bold border border-indigo-500/20">
                          {req.permissionName}
                        </span>
                        <code className="text-[11px] font-mono text-slate-500">
                          {req.permissionKey}
                        </code>
                        <span
                          className={`rounded-md border px-2 py-0.2 text-[10px] font-bold ${getPriorityBadge(
                            req.priority
                          )}`}
                        >
                          {req.priority} Priority
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">My Justification: </span>
                        "{req.reason}"
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                        <span>Submitted on {new Date(req.createdAt).toLocaleDateString()}</span>
                        {req.reviewerName && (
                          <span>
                            • Decision by <strong className="text-slate-600 dark:text-slate-300">{req.reviewerName}</strong>
                            {req.reviewerComments && ` ("${req.reviewerComments}")`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.bg}`}
                      >
                        {statusMeta.icon}
                        <span>{statusMeta.label}</span>
                      </span>

                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(req.id)}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Withdraw / Cancel Request"
                        >
                          <DeleteOutline sx={{ fontSize: 16 }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {myRequests.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                  <KeyOutlined sx={{ fontSize: 36, color: "#94a3b8" }} className="mx-auto" />
                  <h4 className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                    No requests submitted yet
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Explore the permissions catalog and request access for tools or features you need.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("catalog")}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-indigo-700 cursor-pointer"
                  >
                    <LockOpen sx={{ fontSize: 15 }} />
                    <span>Browse Capabilities</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 1: Request Access Submission Form */}
        {requestModalOpen && selectedPermission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 animate-scale-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <KeyOutlined sx={{ fontSize: 20 }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Request Access to Permission
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Submit justification for administrator review
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Close sx={{ fontSize: 18 }} />
                </button>
              </div>

              {/* Selected Permission Banner */}
              <div className="rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    {selectedPermission.name}
                  </span>
                  <span className="rounded bg-indigo-200/60 dark:bg-indigo-800/80 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:text-indigo-300">
                    {selectedPermission.module}
                  </span>
                </div>
                <code className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 block mt-1">
                  {selectedPermission.permissionKey}
                </code>
                <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 mt-1">
                  {selectedPermission.description}
                </p>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                {/* Priority Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Urgency / Priority
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["Low", "Medium", "High", "Urgent"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setRequestPriority(p)}
                        className={`rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
                          requestPriority === p
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Justification Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Business Justification / Reason *
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {requestReason.length} / 500
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="e.g., I need access to customer invoices to generate tax reports for client ABC project deliveries."
                    required
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setRequestModalOpen(false)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest || !requestReason.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 text-xs font-bold shadow-md shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send sx={{ fontSize: 14 }} />
                    <span>{submittingRequest ? "Submitting..." : "Submit Access Request"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Super Admin Decision (Approve / Reject) */}
        {reviewModalOpen && selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 animate-scale-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                      reviewAction === "Approve"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-rose-500/10 text-rose-600"
                    }`}
                  >
                    {reviewAction === "Approve" ? <Check sx={{ fontSize: 20 }} /> : <Close sx={{ fontSize: 20 }} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {reviewAction === "Approve" ? "Approve & Grant Permission" : "Reject Permission Request"}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Requested by {selectedRequest.userName} ({selectedRequest.userEmail})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Close sx={{ fontSize: 18 }} />
                </button>
              </div>

              {/* Summary of request */}
              <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Target Permission:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedRequest.permissionName} ({selectedRequest.permissionKey})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Employee Role / Dept:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedRequest.roleName || "No Role"} • {selectedRequest.departmentName || "No Dept"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">User's Reason:</span>
                  <p className="italic text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                    "{selectedRequest.reason}"
                  </p>
                </div>
              </div>

              {/* Review Comments */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {reviewAction === "Approve" ? "Approval Notes (Optional)" : "Rejection Reason / Comments *"}
                </label>
                <textarea
                  rows={3}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder={
                    reviewAction === "Approve"
                      ? "e.g., Access granted for quarterly invoicing workflow."
                      : "e.g., This permission requires senior manager designation."
                  }
                  className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className={`inline-flex items-center gap-1.5 rounded-xl text-white px-4 py-2 text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer ${
                    reviewAction === "Approve"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-500/25"
                  }`}
                >
                  {reviewAction === "Approve" ? (
                    <>
                      <Check sx={{ fontSize: 15 }} />
                      <span>{submittingReview ? "Granting..." : "Confirm & Grant Access"}</span>
                    </>
                  ) : (
                    <>
                      <Close sx={{ fontSize: 15 }} />
                      <span>{submittingReview ? "Rejecting..." : "Confirm Rejection"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
};

export default RequestAccessPage;
