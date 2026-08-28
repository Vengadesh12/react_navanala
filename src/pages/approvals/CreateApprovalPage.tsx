import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  FactCheckOutlined,
  AddCircleOutline,
  CheckCircleOutline,
  HighlightOffOutlined,
  HourglassEmptyOutlined,
  Search,
  Close,
  FilterList,
  Refresh,
  PersonOutline,
  LaptopMac,
  LayersOutlined,
  DeleteOutline,
  VisibilityOutlined,
  InfoOutlined,
  ChatBubbleOutline,
  AdminPanelSettingsOutlined,
  Check,
  Clear,
  AttachMoney,
  BusinessOutlined,
  Tune,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { approvalService } from "../../api/approval.service";
import { useAuth } from "../../hooks/useAuth";
import { showConfirmDialog, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import type {
  ApprovalItem,
  ApprovalSummary,
  CreateApprovalPayload,
} from "../../types";

const CATEGORIES = [
  "Hardware & Devices",
  "Software & Tools",
  "Office Equipment",
  "Peripherals & Accessories",
  "Training & Certifications",
  "Other",
];

const PRESETS = [
  { label: "💻 MacBook Pro 16\" M3", category: "Hardware & Devices", amount: 249900 },
  { label: "🖥️ 27\" 4K USB-C Monitor", category: "Hardware & Devices", amount: 48900 },
  { label: "⚡ Ergonomic Standing Desk", category: "Office Equipment", amount: 35000 },
  { label: "⚙️ JetBrains All Pack License", category: "Software & Tools", amount: 24500 },
  { label: "🎧 Noise-Canceling Headset", category: "Peripherals & Accessories", amount: 24999 },
  { label: "⌨️ Mechanical Ergonomic Keyboard", category: "Peripherals & Accessories", amount: 14500 },
];

export const CreateApprovalPage: React.FC = () => {
  const { user } = useAuth();

  // Strict Role detection: Only Super Admin (Role 2) or Manager (Role 3) can see all approvals & take actions
  const isManagerOrAdmin = useMemo(() => {
    if (!user) return false;
    const roleId = Number(user.roleId);
    if (roleId === 2 || roleId === 3) return true; // 2 = Super Admin, 3 = Manager
    const roleName = (user.roleName || "").trim().toLowerCase();
    return (
      roleName.includes("manager") ||
      roleName.includes("super admin") ||
      roleName === "admin"
    );
  }, [user]);

  // Data state
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [summary, setSummary] = useState<ApprovalSummary>({
    totalRequests: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    myRequestsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  // Managers default to 'all' team requests; Regular employees are locked to 'my' requests
  const [scopeFilter, setScopeFilter] = useState<"all" | "my">(isManagerOrAdmin ? "all" : "my");
  const [searchQuery, setSearchQuery] = useState("");

  // Sync scopeFilter if user role status changes
  useEffect(() => {
    if (!isManagerOrAdmin) {
      setScopeFilter("my");
    }
  }, [isManagerOrAdmin]);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<ApprovalItem | null>(null);
  const [actionModalState, setActionModalState] = useState<{
    isOpen: boolean;
    item: ApprovalItem | null;
    action: "Approve" | "Reject";
    comments: string;
    submitting: boolean;
  }>({
    isOpen: false,
    item: null,
    action: "Approve",
    comments: "",
    submitting: false,
  });

  // Create form state
  const [createForm, setCreateForm] = useState<CreateApprovalPayload>({
    itemName: "",
    category: "Hardware & Devices",
    description: "",
    quantity: 1,
    priority: "Medium",
    estimatedAmount: undefined,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  // Load approvals from backend
  const loadApprovals = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const effectiveScope = isManagerOrAdmin ? scopeFilter : "my";
        const response = await approvalService.getApprovals({
          status: statusFilter,
          category: categoryFilter,
          priority: priorityFilter,
          scope: effectiveScope,
          search: searchQuery,
          pageSize: 100,
        });

        let fetchedItems = response.items || [];
        // Strict client-side guarantee: Non-managers only see their own requests
        if (!isManagerOrAdmin && user?.id) {
          fetchedItems = fetchedItems.filter(
            (it) => Number(it.userId) === Number(user.id)
          );
        }

        setItems(fetchedItems);
        if (response.summary) {
          setSummary(response.summary);
        }
        window.dispatchEvent(new Event("approvals-updated"));
      } catch (err: any) {
        console.error("Failed to load approval requests:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, categoryFilter, priorityFilter, scopeFilter, searchQuery, isManagerOrAdmin, user?.id]
  );

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // Handle create approval submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!createForm.itemName.trim()) {
      setCreateError("Please enter the product / item name.");
      return;
    }
    if (!createForm.description.trim()) {
      setCreateError("Please provide a reason or justification for your request.");
      return;
    }

    setCreateSubmitting(true);
    try {
      const res = await approvalService.createApproval(createForm);
      showSuccessAlert(
        "Request Submitted",
        `Your request for "${res.data.itemName}" has been submitted for manager approval.`
      );
      setIsCreateModalOpen(false);
      setCreateForm({
        itemName: "",
        category: "Hardware & Devices",
        description: "",
        quantity: 1,
        priority: "Medium",
        estimatedAmount: undefined,
      });
      window.dispatchEvent(new Event("approvals-updated"));
      loadApprovals(true);
    } catch (err: any) {
      setCreateError(err.message || "Failed to submit approval request. Please try again.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Manager Decision Modal
  const openActionModal = (item: ApprovalItem, action: "Approve" | "Reject") => {
    setActionModalState({
      isOpen: true,
      item,
      action,
      comments: action === "Approve" ? "Approved for allocation." : "",
      submitting: false,
    });
  };

  // Submit Manager Decision (Approve / Reject)
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModalState.item) return;

    if (actionModalState.action === "Reject" && !actionModalState.comments.trim()) {
      showErrorAlert("Rejection Reason Required", "Please provide remarks explaining why this request is rejected.");
      return;
    }

    setActionModalState((prev) => ({ ...prev, submitting: true }));
    try {
      await approvalService.processAction(actionModalState.item.id, {
        action: actionModalState.action,
        comments: actionModalState.comments,
      });

      const actionWord = actionModalState.action === "Approve" ? "Approved" : "Rejected";
      showSuccessAlert(
        `Request ${actionWord}`,
        `Approval request #${actionModalState.item.id} for "${actionModalState.item.itemName}" by ${actionModalState.item.employeeName} has been ${actionWord.toLowerCase()}.`
      );

      setActionModalState({
        isOpen: false,
        item: null,
        action: "Approve",
        comments: "",
        submitting: false,
      });

      if (selectedItemForDetails?.id === actionModalState.item.id) {
        setSelectedItemForDetails(null);
      }

      window.dispatchEvent(new Event("approvals-updated"));
      loadApprovals(true);
    } catch (err: any) {
      showErrorAlert("Action Failed", err.message || "Failed to process approval decision.");
      setActionModalState((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Handle Cancel / Delete Request
  const handleDeleteRequest = async (item: ApprovalItem) => {
    const confirm = await showConfirmDialog(
      "Cancel Request?",
      `Are you sure you want to cancel your request for "${item.itemName}"?`,
      "Yes, Cancel It",
      "Keep Request",
      true
    );

    if (confirm.isConfirmed) {
      try {
        await approvalService.deleteApproval(item.id);
        showSuccessAlert("Request Cancelled", "The approval request has been removed.");
        if (selectedItemForDetails?.id === item.id) {
          setSelectedItemForDetails(null);
        }
        window.dispatchEvent(new Event("approvals-updated"));
        loadApprovals(true);
      } catch (err: any) {
        showErrorAlert("Error", err.message || "Failed to cancel approval request.");
      }
    }
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase();
    if (p === "urgent" || p === "critical") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          Urgent
        </span>
      );
    }
    if (p === "high") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/50">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          High
        </span>
      );
    }
    if (p === "low") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          Low
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/50">
        Medium
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "approved") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/50 shadow-2xs">
          <CheckCircleOutline sx={{ fontSize: 14, color: "#10b981" }} />
          Approved
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/50 shadow-2xs">
          <HighlightOffOutlined sx={{ fontSize: 14, color: "#f43f5e" }} />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/50 shadow-2xs">
        <HourglassEmptyOutlined sx={{ fontSize: 14, color: "#f59e0b" }} className="animate-spin" />
        Pending Review
      </span>
    );
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return "";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  return (
    <WorkspaceLayout
      permission="approvals.view"
      label="Create Approval"
      icon="✓"
      showHero={false}
      showSearchBar={false}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Page Top Header with Title & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
          </div>

          <div className="flex items-center gap-3">
            
          </div>
        </div>

        {/* Scope Selector Tabs (Managers only) */}
        {isManagerOrAdmin && (
          <div className="flex items-center justify-start">
            <div className="inline-flex items-center gap-1.5 rounded-2xl bg-white dark:bg-slate-900 p-1.5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <button
                type="button"
                onClick={() => setScopeFilter("all")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  scopeFilter === "all"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All Team Requests
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter("my")}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  scopeFilter === "my"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                My Requests ({summary.myRequestsCount})
              </button>
            </div>
          </div>
        )}

        {/* KPI Metrics Dashboard Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Requests</span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <FactCheckOutlined sx={{ fontSize: 18 }} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {summary.totalRequests}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Overall submitted resource approvals</p>
          </div>

          <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pending Review</span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300">
                <HourglassEmptyOutlined sx={{ fontSize: 18 }} className="animate-spin" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-amber-800 dark:text-amber-200">
              {summary.pendingCount}
            </p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Awaiting manager decision</p>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Approved</span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300">
                <CheckCircleOutline sx={{ fontSize: 18 }} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-800 dark:text-emerald-200">
              {summary.approvedCount}
            </p>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Authorized for allocation</p>
          </div>

          <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Rejected</span>
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300">
                <HighlightOffOutlined sx={{ fontSize: 18 }} />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-rose-800 dark:text-rose-200">
              {summary.rejectedCount}
            </p>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">Declined with manager notes</p>
          </div>
        </div>

        {/* Search, Filter Toolbar & Status Pills */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 sm:p-3 shadow-xs overflow-x-auto scrollbar-none">
          <div className="flex items-center justify-between gap-3 min-w-[780px] lg:min-w-0">
            {/* Status Filter Pills (Single straight line) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { id: "ALL", label: "All Requests", count: summary.totalRequests },
                { id: "Pending", label: "Pending", count: summary.pendingCount },
                { id: "Approved", label: "Approved", count: summary.approvedCount },
                { id: "Rejected", label: "Rejected", count: summary.rejectedCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-blue-600 text-white shadow-xs shadow-blue-500/25"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      statusFilter === tab.id
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Actions & Filters Group (Straight line on the right) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Search Box */}
              <div className="relative w-36 sm:w-44 lg:w-48">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400">
                  <Search sx={{ fontSize: 16 }} />
                </div>
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 py-1.5 pl-8 pr-7 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <Close sx={{ fontSize: 14 }} />
                  </button>
                )}
              </div>

              {/* Category Select */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 py-1.5 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none shrink-0 cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Priority Select */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 py-1.5 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none shrink-0 cursor-pointer"
              >
                <option value="ALL">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => loadApprovals(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer shrink-0"
                title="Refresh requests"
              >
                <Refresh sx={{ fontSize: 15 }} className={refreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Create Approval Button */}
              <button
                type="button"
                onClick={() => {
                  setCreateError("");
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer transform active:scale-95 shrink-0 whitespace-nowrap"
              >
                <AddCircleOutline sx={{ fontSize: 16 }} />
                <span>+ Create Approval</span>
              </button>
            </div>
          </div>
        </div>

        {/* Requests Table / Card View */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          {loading ? (
            <div className="py-16 text-center">
              <LoadingSpinner message="Loading approval requests..." />
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center px-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-3">
                <FactCheckOutlined sx={{ fontSize: 32 }} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No approval requests found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                {searchQuery || statusFilter !== "ALL" || categoryFilter !== "ALL"
                  ? "Try clearing filters or search query to see other requests."
                  : "No approval requests have been submitted yet. Raise your first request below!"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setCreateError("");
                  setIsCreateModalOpen(true);
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all cursor-pointer"
              >
                <AddCircleOutline sx={{ fontSize: 16 }} />
                <span>+ Raise New Request</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">ID & Date</th>
                    <th className="py-3.5 px-4">Employee / Requester</th>
                    <th className="py-3.5 px-4">Requested Product / Item</th>
                    <th className="py-3.5 px-4">Reason / Justification</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Status & Review</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => {
                    const isPending = item.status?.toLowerCase() === "pending";
                    const isOwner = Number(item.userId) === Number(user?.id);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* ID & Date */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            #{item.id}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatDate(item.createdAt)}
                          </p>
                        </td>

                        {/* Employee Name & Requester Info */}
                        <td className="py-3.5 px-4 align-top min-w-[180px]">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold grid place-items-center text-xs shadow-2xs shrink-0">
                              {item.employeeName?.charAt(0)?.toUpperCase() || "E"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate">
                                {item.employeeName}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {item.employeeEmail}
                              </p>
                              {item.departmentName && (
                                <span className="inline-block mt-0.5 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-semibold text-slate-600 dark:text-slate-300">
                                  {item.departmentName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Requested Item */}
                        <td className="py-3.5 px-4 align-top min-w-[200px]">
                          <p className="font-bold text-slate-900 dark:text-white leading-tight">
                            {item.itemName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40">
                              {item.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Qty: {item.quantity}
                            </span>
                            {item.estimatedAmount != null && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(item.estimatedAmount)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Reason / Description */}
                        <td className="py-3.5 px-4 align-top max-w-xs">
                          <p
                            className="text-slate-600 dark:text-slate-300 line-clamp-2 text-xs"
                            title={item.description}
                          >
                            {item.description}
                          </p>
                        </td>

                        {/* Priority */}
                        <td className="py-3.5 px-4 align-top whitespace-nowrap">
                          {getPriorityBadge(item.priority)}
                        </td>

                        {/* Status & Review Remarks */}
                        <td className="py-3.5 px-4 align-top min-w-[170px]">
                          <div>{getStatusBadge(item.status)}</div>
                          {item.comments && (
                            <div className="mt-1.5 flex items-start gap-1 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300">
                              <ChatBubbleOutline sx={{ fontSize: 12, color: "#64748b" }} className="mt-0.5 shrink-0" />
                              <span className="line-clamp-2" title={item.comments}>
                                {item.comments}
                              </span>
                            </div>
                          )}
                          {item.reviewedByName && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              By {item.reviewedByName}
                            </p>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* IF MANAGER / ADMIN and item is Pending -> Show Approve and Reject options */}
                            {isManagerOrAdmin && isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openActionModal(item, "Approve")}
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                                  title="Approve employee request"
                                >
                                  <Check sx={{ fontSize: 14 }} />
                                  <span>Approve</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openActionModal(item, "Reject")}
                                  className="inline-flex items-center gap-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                                  title="Reject employee request"
                                >
                                  <Clear sx={{ fontSize: 14 }} />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {/* View Details Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedItemForDetails(item)}
                              className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                              title="View full request details"
                            >
                              <VisibilityOutlined sx={{ fontSize: 18 }} />
                            </button>

                            {/* Employee can cancel their own pending request */}
                            {isPending && (isOwner || isManagerOrAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRequest(item)}
                                className="rounded-xl p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                title="Cancel / Delete request"
                              >
                                <DeleteOutline sx={{ fontSize: 18 }} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Create Approval Request Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                  <AddCircleOutline sx={{ fontSize: 22 }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Raise Approval Request
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Request a laptop, monitor, software license or equipment from management.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 20 }} />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-400">
                {createError}
              </div>
            )}

            {/* Quick Product Presets */}
            <div className="mt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Quick Selection Presets:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCreateForm((prev) => ({
                        ...prev,
                        itemName: preset.label.replace(/^.*? /, ""),
                        category: preset.category,
                        estimatedAmount: preset.amount,
                      }));
                    }}
                    className="rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Product / Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apple MacBook Pro 16-inch M3, 4K Monitor, JetBrains License"
                  value={createForm.itemName}
                  onChange={(e) => setCreateForm({ ...createForm, itemName: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Category & Quantity Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={createForm.quantity}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Priority & Estimated Cost Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Low">Low - Nice to have</option>
                    <option value="Medium">Medium - Standard requirement</option>
                    <option value="High">High - Needed for upcoming deliverables</option>
                    <option value="Urgent">Urgent - Work blocked without it</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Amount (₹ INR / Approx)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 85000"
                    value={createForm.estimatedAmount ?? ""}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        estimatedAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Reason / Justification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason & Business Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain why you need this product, current limitations, projects impacted, or software requirements..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 p-3.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {createSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit for Approval</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Manager Decision Modal (Approve / Reject) */}
      {actionModalState.isOpen && actionModalState.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-2xl text-white ${
                    actionModalState.action === "Approve" ? "bg-emerald-600 shadow-emerald-600/30" : "bg-rose-600 shadow-rose-600/30"
                  } shadow-md`}
                >
                  {actionModalState.action === "Approve" ? (
                    <Check sx={{ fontSize: 22 }} />
                  ) : (
                    <Clear sx={{ fontSize: 22 }} />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {actionModalState.action === "Approve" ? "Approve Request" : "Reject Request"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Review and confirm decision for request #{actionModalState.item.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setActionModalState({
                    isOpen: false,
                    item: null,
                    action: "Approve",
                    comments: "",
                    submitting: false,
                  })
                }
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Request Summary Box */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {actionModalState.item.itemName}
                </span>
                <span className="rounded-md bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                  {actionModalState.item.category}
                </span>
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Raised By: </span>
                {actionModalState.item.employeeName} ({actionModalState.item.employeeEmail})
              </div>
              <p className="text-xs text-slate-500 italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                "{actionModalState.item.description}"
              </p>
            </div>

            <form onSubmit={handleActionSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {actionModalState.action === "Approve"
                    ? "Manager Approval Remarks (Optional)"
                    : "Reason for Rejection (Required)"}
                </label>
                <textarea
                  rows={3}
                  required={actionModalState.action === "Reject"}
                  placeholder={
                    actionModalState.action === "Approve"
                      ? "e.g. Approved. IT inventory will fulfill this request next sprint."
                      : "e.g. Budget cap reached for Q3 or please utilize shared departmental equipment..."
                  }
                  value={actionModalState.comments}
                  onChange={(e) =>
                    setActionModalState({ ...actionModalState, comments: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 p-3 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setActionModalState({
                      isOpen: false,
                      item: null,
                      action: "Approve",
                      comments: "",
                      submitting: false,
                    })
                  }
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionModalState.submitting}
                  className={`inline-flex items-center gap-2 rounded-xl text-white px-5 py-2.5 text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                    actionModalState.action === "Approve"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                      : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                  }`}
                >
                  {actionModalState.submitting ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>
                      Confirm {actionModalState.action === "Approve" ? "Approval" : "Rejection"}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Full Request Details Modal */}
      {selectedItemForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30">
                  <InfoOutlined sx={{ fontSize: 22 }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Approval Request #{selectedItemForDetails.id}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Submitted on {formatDate(selectedItemForDetails.createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemForDetails(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 20 }} />
              </button>
            </div>

            {/* Status & Requester Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Requester Employee
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedItemForDetails.employeeName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedItemForDetails.employeeEmail}
                </p>
                {selectedItemForDetails.departmentName && (
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-1">
                    🏢 {selectedItemForDetails.departmentName}
                  </p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Current Status
                </span>
                <div className="mt-1">{getStatusBadge(selectedItemForDetails.status)}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Priority:</span>
                  {getPriorityBadge(selectedItemForDetails.priority)}
                </div>
              </div>
            </div>

            {/* Product & Resource Details */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Requested Item & Specifications
              </span>
              <p className="text-base font-bold text-slate-900 dark:text-white">
                {selectedItemForDetails.itemName}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                <span className="rounded-md bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-300">
                  Category: {selectedItemForDetails.category}
                </span>
                <span>Quantity: <strong>{selectedItemForDetails.quantity}</strong></span>
                {selectedItemForDetails.estimatedAmount != null && (
                  <span>
                    Est. Cost: <strong>{formatCurrency(selectedItemForDetails.estimatedAmount)}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Justification Box */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Employee Justification & Reason
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {selectedItemForDetails.description}
              </p>
            </div>

            {/* Manager Remarks Section (if reviewed) */}
            {selectedItemForDetails.comments && (
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Manager Review Feedback & Decision
                  </span>
                  {selectedItemForDetails.reviewedByName && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      Reviewed by {selectedItemForDetails.reviewedByName}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 italic">
                  "{selectedItemForDetails.comments}"
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              {/* If manager and pending, allow instant Approve/Reject from details modal */}
              {isManagerOrAdmin && selectedItemForDetails.status?.toLowerCase() === "pending" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openActionModal(selectedItemForDetails, "Approve")}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <Check sx={{ fontSize: 16 }} />
                    <span>Approve Request</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openActionModal(selectedItemForDetails, "Reject")}
                    className="inline-flex items-center gap-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <Clear sx={{ fontSize: 16 }} />
                    <span>Reject Request</span>
                  </button>
                </div>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setSelectedItemForDetails(null)}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};

export default CreateApprovalPage;
