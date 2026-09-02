import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ShoppingCartOutlined,
  AddCircleOutline,
  CheckCircleOutline,
  CheckCircle,
  StorefrontOutlined,
  Search,
  Close,
  Refresh,
  DeleteOutline,
  VisibilityOutlined,
  EditOutlined,
  LocalShippingOutlined,
  EmailOutlined,
  PhoneOutlined,
  ReceiptLongOutlined,
  FactCheckOutlined,
  LockOutlined,
  ArrowForward,
  CompareArrows,
  TrendingDownOutlined,
  WorkspacePremiumOutlined,
  PlaylistAddCheckOutlined,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Pagination } from "../../components/common/Pagination";
import { SortableHeader } from "../../components/common/SortableHeader";
import { useTableSort } from "../../hooks/useTableSort";
import { purchaseService } from "../../api/purchase.service";
import { useAuth } from "../../hooks/useAuth";
import { showConfirmDialog, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import type {
  PurchaseDto,
  ApprovedProductDto,
  PurchaseSummaryDto,
  CreatePurchasePayload,
  UpdatePurchasePayload,
} from "../../types/purchase";

const CATEGORIES = [
  "ALL",
  "Hardware & Devices",
  "Software & Tools",
  "Office Equipment",
  "Peripherals & Accessories",
  "Training & Certifications",
  "Other",
];

const STATUS_TABS = [
  { id: "ALL", label: "All Purchases" },
  { id: "Quotation Received", label: "Quotation Received" },
  { id: "PO Issued", label: "PO Issued" },
  { id: "In Procurement", label: "In Procurement" },
  { id: "Delivered", label: "Delivered" },
  { id: "Completed", label: "Completed" },
];

const PAYMENT_TERMS_PRESETS = [
  "Net 30 Days",
  "Net 15 Days",
  "100% Advance",
  "50% Advance, 50% on Delivery",
  "Immediate upon Invoice",
  "Milestone-based",
];

export const PurchasesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Strict Access Guard: Only Super Admin, Manager, and HR Department
  const isAuthorized = useMemo(() => {
    if (!user) return false;
    const roleId = Number(user.roleId);
    const roleName = (user.roleName || "").toLowerCase();
    const deptName = (user.departmentName || "").toLowerCase();
    const designationName = (user.designationName || "").toLowerCase();

    const isSuperAdmin = roleId === 2 || roleName.includes("super admin") || roleName === "admin";
    const isManager =
      roleId === 3 ||
      roleName.includes("manager") ||
      designationName.includes("manager") ||
      roleName.includes("lead");
    const isHrDepartment =
      deptName.includes("hr") || deptName.includes("human resources") || designationName.includes("hr");

    return isSuperAdmin || isManager || isHrDepartment;
  }, [user]);

  // Data states
  const [purchases, setPurchases] = useState<PurchaseDto[]>([]);
  const [approvedProducts, setApprovedProducts] = useState<ApprovedProductDto[]>([]);
  const [summary, setSummary] = useState<PurchaseSummaryDto>({
    totalPurchases: 0,
    totalQuotationValue: 0,
    quotationReceivedCount: 0,
    poIssuedCount: 0,
    inProcurementCount: 0,
    deliveredCount: 0,
    completedCount: 0,
    approvedItemsPendingQuotation: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Pagination & Sorting
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter]);

  const { sortKey, sortDirection, handleSort, sortedData: sortedPurchases } = useTableSort<PurchaseDto>({
    data: purchases,
    initialSortKey: "itemName",
    initialDirection: "asc",
    getSortValue: (p, key) => {
      switch (key) {
        case "itemName":
          return (p.itemName || "").toLowerCase();
        case "employeeName":
          return (p.employeeName || "").toLowerCase();
        case "vendorName":
          return (p.vendorName || "").toLowerCase();
        case "quotationAmount":
          return Number(p.quotationAmount || 0);
        case "quotationDate":
          return p.quotationDate || "";
        case "status":
          return (p.status || "").toLowerCase();
        default:
          return (p as any)[key];
      }
    },
  });

  const paginatedPurchases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedPurchases.slice(start, start + pageSize);
  }, [sortedPurchases, page, pageSize]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);

  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseDto | null>(null);
  const [compareApprovalId, setCompareApprovalId] = useState<number | null>(null);

  // Add form state
  const [selectedApprovalId, setSelectedApprovalId] = useState<number | "">("");
  const [vendorName, setVendorName] = useState<string>("");
  const [vendorContact, setVendorContact] = useState<string>("");
  const [vendorEmail, setVendorEmail] = useState<string>("");
  const [quotationNumber, setQuotationNumber] = useState<string>("");
  const [quotationAmount, setQuotationAmount] = useState<string>("");
  const [quotationDate, setQuotationDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [deliveryTimeline, setDeliveryTimeline] = useState<string>("3-5 Business Days");
  const [paymentTerms, setPaymentTerms] = useState<string>("Net 30 Days");
  const [notes, setNotes] = useState<string>("");
  const [purchaseStatus, setPurchaseStatus] = useState<string>("Quotation Received");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Edit form state
  const [editVendorName, setEditVendorName] = useState<string>("");
  const [editVendorContact, setEditVendorContact] = useState<string>("");
  const [editVendorEmail, setEditVendorEmail] = useState<string>("");
  const [editQuotationNumber, setEditQuotationNumber] = useState<string>("");
  const [editQuotationAmount, setEditQuotationAmount] = useState<string>("");
  const [editQuotationDate, setEditQuotationDate] = useState<string>("");
  const [editDeliveryTimeline, setEditDeliveryTimeline] = useState<string>("");
  const [editPaymentTerms, setEditPaymentTerms] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editStatus, setEditStatus] = useState<string>("Quotation Received");

  // Fetch all data
  const loadData = useCallback(async () => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      const [purchasesRes, approvedRes, summaryRes] = await Promise.all([
        purchaseService.getPurchases({
          status: statusFilter,
          category: categoryFilter,
          search: search.trim() || undefined,
        }),
        purchaseService.getApprovedProducts(),
        purchaseService.getSummary(),
      ]);

      setPurchases(purchasesRes.data || []);
      setApprovedProducts(approvedRes || []);
      setSummary(summaryRes);
    } catch (err: any) {
      showErrorAlert("Fetch Error", err?.message || "Failed to load purchase records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthorized, statusFilter, categoryFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected approved product metadata
  const selectedApprovedItem = useMemo(() => {
    if (!selectedApprovalId) return null;
    return approvedProducts.find((p) => p.id === Number(selectedApprovalId)) || null;
  }, [selectedApprovalId, approvedProducts]);

  // Existing quotes for the product selected in the Add Modal
  const existingQuotesForSelected = useMemo(() => {
    if (!selectedApprovalId) return [];
    return purchases.filter((p) => p.approvalRequestId === Number(selectedApprovalId));
  }, [selectedApprovalId, purchases]);

  // Quotes for the Compare Modal
  const compareQuotes = useMemo(() => {
    if (!compareApprovalId) return [];
    return purchases.filter((p) => p.approvalRequestId === compareApprovalId);
  }, [compareApprovalId, purchases]);

  const compareProduct = useMemo(() => {
    if (!compareApprovalId) return null;
    const foundApproved = approvedProducts.find((p) => p.id === compareApprovalId);
    if (foundApproved) return foundApproved;

    const firstQuote = purchases.find((p) => p.approvalRequestId === compareApprovalId);
    if (firstQuote) {
      return {
        id: firstQuote.approvalRequestId,
        itemName: firstQuote.itemName,
        category: firstQuote.category,
        quantity: firstQuote.quantity,
        estimatedAmount: firstQuote.estimatedAmount,
        priority: "Standard",
        employeeName: firstQuote.employeeName,
        employeeEmail: firstQuote.employeeEmail,
        departmentName: firstQuote.departmentName,
        description: "",
        hasExistingQuotation: true,
        quotationCount: compareQuotes.length,
      } as ApprovedProductDto;
    }
    return null;
  }, [compareApprovalId, approvedProducts, purchases, compareQuotes.length]);

  const minCompareAmount = useMemo(() => {
    if (compareQuotes.length === 0) return 0;
    return Math.min(...compareQuotes.map((q) => q.quotationAmount));
  }, [compareQuotes]);

  // Reset Add Form
  const resetAddForm = () => {
    setSelectedApprovalId("");
    setVendorName("");
    setVendorContact("");
    setVendorEmail("");
    setQuotationNumber("");
    setQuotationAmount("");
    setQuotationDate(new Date().toISOString().split("T")[0]);
    setDeliveryTimeline("3-5 Business Days");
    setPaymentTerms("Net 30 Days");
    setNotes("");
    setPurchaseStatus("Quotation Received");
  };

  // Open Add Modal
  const handleOpenAddModal = (preselectedApprovalId?: number) => {
    resetAddForm();
    if (preselectedApprovalId) {
      setSelectedApprovalId(preselectedApprovalId);
    } else if (approvedProducts.length > 0) {
      const firstPending = approvedProducts.find((p) => !p.hasExistingQuotation);
      if (firstPending) {
        setSelectedApprovalId(firstPending.id);
      } else {
        setSelectedApprovalId(approvedProducts[0].id);
      }
    }
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (purchase: PurchaseDto) => {
    setSelectedPurchase(purchase);
    setEditVendorName(purchase.vendorName);
    setEditVendorContact(purchase.vendorContact || "");
    setEditVendorEmail(purchase.vendorEmail || "");
    setEditQuotationNumber(purchase.quotationNumber || "");
    setEditQuotationAmount(purchase.quotationAmount.toString());
    setEditQuotationDate(purchase.quotationDate ? purchase.quotationDate.split("T")[0] : "");
    setEditDeliveryTimeline(purchase.deliveryTimeline || "");
    setEditPaymentTerms(purchase.paymentTerms || "");
    setEditNotes(purchase.notes || "");
    setEditStatus(purchase.status);
    setIsEditModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetailModal = (purchase: PurchaseDto) => {
    setSelectedPurchase(purchase);
    setIsDetailModalOpen(true);
  };

  // Open Compare Modal
  const handleOpenCompareModal = (approvalId: number) => {
    setCompareApprovalId(approvalId);
    setIsCompareModalOpen(true);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApprovalId) {
      showErrorAlert("Validation Error", "Please select an approved product request.");
      return;
    }
    if (!vendorName.trim()) {
      showErrorAlert("Validation Error", "Vendor name is required.");
      return;
    }
    const parsedAmount = parseFloat(quotationAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showErrorAlert("Validation Error", "Please provide a valid positive quotation amount.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreatePurchasePayload = {
        approvalRequestId: Number(selectedApprovalId),
        vendorName: vendorName.trim(),
        vendorContact: vendorContact.trim() || undefined,
        vendorEmail: vendorEmail.trim() || undefined,
        quotationNumber: quotationNumber.trim() || undefined,
        quotationAmount: parsedAmount,
        quotationDate: quotationDate ? new Date(quotationDate).toISOString() : undefined,
        deliveryTimeline: deliveryTimeline.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        notes: notes.trim() || undefined,
        status: purchaseStatus,
      };

      await purchaseService.createPurchase(payload);
      showSuccessAlert(
        "Quotation Recorded",
        `Vendor quotation of ₹${parsedAmount.toLocaleString()} from "${vendorName}" was saved successfully.`
      );
      setIsAddModalOpen(false);
      resetAddForm();
      await loadData();
    } catch (err: any) {
      showErrorAlert("Creation Failed", err?.message || "Failed to record vendor quotation.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    if (!editVendorName.trim()) {
      showErrorAlert("Validation Error", "Vendor name is required.");
      return;
    }
    const parsedAmount = parseFloat(editQuotationAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showErrorAlert("Validation Error", "Please provide a valid positive quotation amount.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: UpdatePurchasePayload = {
        vendorName: editVendorName.trim(),
        vendorContact: editVendorContact.trim() || undefined,
        vendorEmail: editVendorEmail.trim() || undefined,
        quotationNumber: editQuotationNumber.trim() || undefined,
        quotationAmount: parsedAmount,
        quotationDate: editQuotationDate ? new Date(editQuotationDate).toISOString() : undefined,
        deliveryTimeline: editDeliveryTimeline.trim() || undefined,
        paymentTerms: editPaymentTerms.trim() || undefined,
        notes: editNotes.trim() || undefined,
        status: editStatus,
      };

      await purchaseService.updatePurchase(selectedPurchase.id, payload);
      showSuccessAlert("Updated", `Purchase quotation #${selectedPurchase.id} updated successfully.`);
      setIsEditModalOpen(false);
      setSelectedPurchase(null);
      await loadData();
    } catch (err: any) {
      showErrorAlert("Update Failed", err?.message || "Failed to update quotation.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Quick Issue PO for a vendor quote directly from comparison
  const handleQuickIssuePo = async (purchase: PurchaseDto) => {
    const confirmed = await showConfirmDialog(
      "Issue Purchase Order (PO)",
      `Issue Purchase Order to "${purchase.vendorName}" for ₹${purchase.quotationAmount.toLocaleString()}? Status will be updated to "PO Issued".`
    );

    if (!confirmed) return;

    try {
      await purchaseService.updatePurchase(purchase.id, {
        vendorName: purchase.vendorName,
        vendorContact: purchase.vendorContact,
        vendorEmail: purchase.vendorEmail,
        quotationNumber: purchase.quotationNumber,
        quotationAmount: purchase.quotationAmount,
        quotationDate: purchase.quotationDate,
        deliveryTimeline: purchase.deliveryTimeline,
        paymentTerms: purchase.paymentTerms,
        notes: purchase.notes,
        status: "PO Issued",
      });
      showSuccessAlert("PO Issued", `Purchase Order successfully issued to ${purchase.vendorName}.`);
      await loadData();
    } catch (err: any) {
      showErrorAlert("PO Issue Failed", err?.message || "Failed to issue PO.");
    }
  };

  // Handle Delete
  const handleDelete = async (purchase: PurchaseDto) => {
    const confirmed = await showConfirmDialog(
      "Delete Purchase Quotation",
      `Are you sure you want to remove vendor quotation for "${purchase.itemName}" from ${purchase.vendorName}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await purchaseService.deletePurchase(purchase.id);
      showSuccessAlert("Deleted", `Purchase quotation #${purchase.id} was deleted successfully.`);
      await loadData();
    } catch (err: any) {
      showErrorAlert("Delete Failed", err?.message || "Failed to delete purchase record.");
    }
  };

  // Helper status color badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
      case "Delivered":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "In Procurement":
      case "PO Issued":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
      case "Cancelled":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      default:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    }
  };

  // Render Access Restricted Screen
  if (!isAuthorized) {
    return (
      <WorkspaceLayout label="Purchases" icon="🛒" showHero={false}>
        <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4 ring-8 ring-rose-500/5">
            <LockOutlined sx={{ fontSize: 32 }} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            The <strong>Purchases & Vendor Procurement</strong> module is strictly restricted to{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">Managers</span>,{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">HR Department</span> personnel, and{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">Super Admins</span>.
          </p>
          <button
            type="button"
            onClick={() => navigate("/create-approval")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <span>Go to Create Approvals</span>
            <ArrowForward sx={{ fontSize: 16 }} />
          </button>
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout label="Purchases" icon="🛒" showHero={false}>
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer disabled:opacity-60"
            >
              <Refresh sx={{ fontSize: 16 }} className={refreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <AddCircleOutline sx={{ fontSize: 16 }} />
              <span>Add Vendor Quotation</span>
            </button>
          </div>
        </div>

        {/* KPI Metrics Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Vendor Quotes</span>
              <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <StorefrontOutlined sx={{ fontSize: 16 }} />
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{summary.totalPurchases}</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Total recorded vendor bids</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Quotation Value</span>
              {/* <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <AttachMoney sx={{ fontSize: 16 }} />
              </span> */}
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              ₹{summary.totalQuotationValue.toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Cumulative quote value</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">In Procurement</span>
              <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <LocalShippingOutlined sx={{ fontSize: 16 }} />
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {summary.poIssuedCount + summary.inProcurementCount}
            </p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">PO issued & active orders</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Quotation</span>
              <span className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <FactCheckOutlined sx={{ fontSize: 16 }} />
              </span>
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
              {summary.approvedItemsPendingQuotation}
            </p>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">Approved items awaiting quotes</p>
          </div>
        </div>

        {/* Approved Products Quick-Action Ribbon with Multi-Vendor Support */}
        {approvedProducts.length > 0 && (
          <div className="rounded-2xl border border-indigo-200/70 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                  Approved Products Ready For Procurement ({approvedProducts.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any product to add a vendor quote (Multiple vendors allowed per product)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {approvedProducts.slice(0, 6).map((item) => {
                const count = item.quotationCount || 0;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl p-3 border text-left transition-all bg-white dark:bg-slate-800/90 border-indigo-200/80 dark:border-indigo-800/60 hover:shadow-md hover:border-indigo-400 cursor-pointer flex flex-col justify-between"
                    onClick={() => handleOpenAddModal(item.id)}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.itemName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.employeeName} • {item.departmentName || "General"}
                          </p>
                        </div>
                        {count > 0 ? (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircleOutline sx={{ fontSize: 12 }} />
                            {count} {count === 1 ? "Vendor" : "Vendors"}
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            0 Quotes
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
                        <span>Qty: {item.quantity}</span>
                        <span>Est: ₹{item.estimatedAmount ? item.estimatedAmount.toLocaleString() : "N/A"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/40">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddModal(item.id);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-semibold transition-colors"
                      >
                        <AddCircleOutline sx={{ fontSize: 12 }} />
                        <span>{count > 0 ? "+ Add Another Vendor" : "+ Add Vendor Quote"}</span>
                      </button>

                      {count >= 2 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCompareModal(item.id);
                          }}
                          className="inline-flex items-center justify-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-colors"
                          title="Compare all vendor quotes for this product"
                        >
                          <CompareArrows sx={{ fontSize: 13 }} />
                          <span>Compare ({count})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search, Filter Toolbar & Status Pills */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${statusFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-700"
                    }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Search & Category filter */}
            <div className="flex items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search
                  sx={{ fontSize: 16 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search item, vendor, quote#..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "ALL" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Purchases Table with Multi-Vendor Highlights */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-16">
              <LoadingSpinner message="Loading purchases and vendor quotations..." />
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
                <StorefrontOutlined sx={{ fontSize: 28 }} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Purchase Quotations Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                {search || statusFilter !== "ALL" || categoryFilter !== "ALL"
                  ? "No purchase records matched your filter criteria."
                  : "No vendor quotations have been added for approved items yet."}
              </p>
              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all cursor-pointer"
              >
                <AddCircleOutline sx={{ fontSize: 16 }} />
                <span>Add First Quotation</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <SortableHeader sortKey="itemName" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="py-3 px-4">
                      Product / Item Name
                    </SortableHeader>
                    <SortableHeader sortKey="employeeName" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="py-3 px-4">
                      Employee & Dept
                    </SortableHeader>
                    <SortableHeader sortKey="vendorName" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="py-3 px-4">
                      Vendor Details
                    </SortableHeader>
                    <SortableHeader sortKey="quotationAmount" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="py-3 px-4">
                      Quotation Amount
                    </SortableHeader>
                    <SortableHeader sortKey="quotationDate" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="py-3 px-4">
                      Delivery & Terms
                    </SortableHeader>
                    <SortableHeader sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="py-3 px-4">
                      Status
                    </SortableHeader>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {paginatedPurchases.map((purchase) => {
                    const estAmount = purchase.estimatedAmount || 0;
                    const diff = estAmount > 0 ? purchase.quotationAmount - estAmount : 0;
                    const isSaving = diff < 0;

                    // Multi-vendor calculations for this product
                    const siblingQuotes = purchases.filter((p) => p.approvalRequestId === purchase.approvalRequestId);
                    const hasMultipleVendors = siblingQuotes.length > 1;
                    const isLowestQuote =
                      hasMultipleVendors &&
                      purchase.quotationAmount === Math.min(...siblingQuotes.map((q) => q.quotationAmount));

                    return (
                      <tr
                        key={purchase.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${isLowestQuote ? "bg-emerald-500/[0.02]" : ""
                          }`}
                      >
                        {/* Item Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                              <ReceiptLongOutlined sx={{ fontSize: 18 }} />
                            </span>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-snug">
                                {purchase.itemName}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                                <span>{purchase.category}</span>
                                <span>•</span>
                                <span>Qty: {purchase.quantity}</span>
                                {purchase.quotationNumber && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-slate-600 dark:text-slate-300">
                                      #{purchase.quotationNumber}
                                    </span>
                                  </>
                                )}
                              </div>

                              {hasMultipleVendors && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <StorefrontOutlined sx={{ fontSize: 11 }} />
                                    {siblingQuotes.length} Vendor Quotes
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCompareModal(purchase.approvalRequestId)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline cursor-pointer"
                                  >
                                    Compare All
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Requesting Employee */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {purchase.employeeName}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {purchase.departmentName || "General Dept"}
                            </p>
                          </div>
                        </td>

                        {/* Vendor Details */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                              <StorefrontOutlined sx={{ fontSize: 14 }} />
                              <span>{purchase.vendorName}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                              {purchase.vendorEmail && (
                                <a
                                  href={`mailto:${purchase.vendorEmail}`}
                                  className="hover:underline flex items-center gap-0.5 text-slate-600 dark:text-slate-400"
                                >
                                  <EmailOutlined sx={{ fontSize: 12 }} />
                                  <span>{purchase.vendorEmail}</span>
                                </a>
                              )}
                              {purchase.vendorContact && (
                                <span className="flex items-center gap-0.5 text-slate-500">
                                  <PhoneOutlined sx={{ fontSize: 12 }} />
                                  <span>{purchase.vendorContact}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Quotation Amount */}
                        <td className="py-3.5 px-4">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 dark:text-white text-sm">
                                ₹{purchase.quotationAmount.toLocaleString()}
                              </p>
                              {isLowestQuote && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  <WorkspacePremiumOutlined sx={{ fontSize: 11 }} />
                                  Lowest Quote
                                </span>
                              )}
                            </div>

                            {estAmount > 0 && (
                              <p
                                className={`text-[10px] font-semibold mt-0.5 ${isSaving
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : diff === 0
                                    ? "text-slate-500"
                                    : "text-amber-600 dark:text-amber-400"
                                  }`}
                              >
                                {isSaving
                                  ? `Saving ₹${Math.abs(diff).toLocaleString()} vs est.`
                                  : diff === 0
                                    ? "Matches estimated"
                                    : `+₹${diff.toLocaleString()} over est.`}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Delivery & Terms */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <LocalShippingOutlined sx={{ fontSize: 13 }} />
                              <span>{purchase.deliveryTimeline}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {purchase.paymentTerms}
                            </p>
                            {purchase.quotationDate && (
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Date: {purchase.quotationDate}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${getStatusBadge(
                                purchase.status
                              )}`}
                            >
                              {purchase.status === "Completed" && (
                                <CheckCircle sx={{ fontSize: 12 }} />
                              )}
                              <span>{purchase.status}</span>
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(purchase)}
                              title="View Quotation Details"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <VisibilityOutlined sx={{ fontSize: 16 }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(purchase)}
                              title="Edit Quotation / Status"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <EditOutlined sx={{ fontSize: 16 }} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(purchase)}
                              title="Delete Quotation"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <DeleteOutline sx={{ fontSize: 16 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && purchases.length > 0 && (
            <Pagination
              currentPage={page}
              totalItems={purchases.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      </div>

      {/* ======================= ADD VENDOR QUOTATION MODAL ======================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <AddCircleOutline sx={{ fontSize: 20 }} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Vendor Quotation</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Add a new or competing supplier quotation for an approved product.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 overflow-y-auto">
              {/* Approved Product Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Approved Product <span className="text-rose-500">*</span>
                </label>
                {approvedProducts.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                    No approved product requests found. Please approve an employee request in the Approvals workspace first.
                  </div>
                ) : (
                  <select
                    value={selectedApprovalId}
                    onChange={(e) => setSelectedApprovalId(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="" disabled>
                      -- Choose Approved Product --
                    </option>
                    {approvedProducts.map((p) => {
                      const count = p.quotationCount || 0;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.itemName} (Req by: {p.employeeName} - {p.departmentName || "General"}, Qty: {p.quantity}) {count > 0 ? `• [${count} ${count === 1 ? "quote" : "quotes"} existing]` : "• [No quotes yet]"}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Selected Item Info Card */}
              {selectedApprovedItem && (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-slate-800/60 border border-indigo-200/80 dark:border-indigo-900/50 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900 dark:text-indigo-300">
                      {selectedApprovedItem.itemName}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Qty: {selectedApprovedItem.quantity}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    <div>
                      <span className="text-slate-400">Employee: </span>
                      {selectedApprovedItem.employeeName}
                    </div>
                    <div>
                      <span className="text-slate-400">Department: </span>
                      {selectedApprovedItem.departmentName || "General"}
                    </div>
                    <div>
                      <span className="text-slate-400">Category: </span>
                      {selectedApprovedItem.category}
                    </div>
                    <div>
                      <span className="text-slate-400">Est. Budget: </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        ₹{selectedApprovedItem.estimatedAmount ? selectedApprovedItem.estimatedAmount.toLocaleString() : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Vendor Quotations for this product preview */}
              {existingQuotesForSelected.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                      <PlaylistAddCheckOutlined sx={{ fontSize: 16 }} />
                      Existing Vendor Quotations for this Item ({existingQuotesForSelected.length})
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                      Adding another quotation allows side-by-side comparison
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {existingQuotesForSelected.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-800/40 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <StorefrontOutlined sx={{ fontSize: 13 }} className="text-amber-600" />
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{q.vendorName}</span>
                          <span className="text-slate-400">• {q.deliveryTimeline || "3-5 days"}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-slate-900 dark:text-white">
                            ₹{q.quotationAmount.toLocaleString()}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getStatusBadge(
                              q.status
                            )}`}
                          >
                            {q.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vendor Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor / Supplier Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell Technologies India, Apple Store, Lenovo Pro"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor Contact Person / Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar (+91 9876543210)"
                    value={vendorContact}
                    onChange={(e) => setVendorContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. sales@vendor.com"
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Commercials Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quotation Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      placeholder="e.g. 245000"
                      value={quotationAmount}
                      onChange={(e) => setQuotationAmount(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quotation Number / Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. QT-2026-8891"
                    value={quotationNumber}
                    onChange={(e) => setQuotationNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quotation Date
                  </label>
                  <input
                    type="date"
                    value={quotationDate}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Delivery Timeline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3-5 Business Days"
                    value={deliveryTimeline}
                    onChange={(e) => setDeliveryTimeline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {PAYMENT_TERMS_PRESETS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={purchaseStatus}
                    onChange={(e) => setPurchaseStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Quotation Received">Quotation Received</option>
                    <option value="PO Issued">PO Issued</option>
                    <option value="In Procurement">In Procurement</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Procurement Notes / Warranty Terms
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Includes 3-year OEM warranty, on-site support, or discount details."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || approvedProducts.length === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? "Saving..." : "Save Vendor Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= SIDE-BY-SIDE VENDOR COMPARISON MODAL ======================= */}
      {isCompareModalOpen && compareProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-5xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CompareArrows sx={{ fontSize: 22 }} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Vendor Quotation Comparison
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Comparing {compareQuotes.length} vendor {compareQuotes.length === 1 ? "quote" : "quotes"} for{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{compareProduct.itemName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompareModalOpen(false);
                    handleOpenAddModal(compareProduct.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <AddCircleOutline sx={{ fontSize: 15 }} />
                  <span>Add Another Vendor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCompareModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <Close sx={{ fontSize: 20 }} />
                </button>
              </div>
            </div>

            {/* Product Overview Summary Bar */}
            <div className="px-6 py-3 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400">Item: </span>
                  <span className="font-bold text-slate-900 dark:text-white">{compareProduct.itemName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Qty: </span>
                  <span className="font-bold text-slate-900 dark:text-white">{compareProduct.quantity}</span>
                </div>
                <div>
                  <span className="text-slate-400">Category: </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{compareProduct.category}</span>
                </div>
                <div>
                  <span className="text-slate-400">Requested By: </span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {compareProduct.employeeName} ({compareProduct.departmentName || "General"})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {compareProduct.estimatedAmount && (
                  <div className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-400">Est. Budget: </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ₹{compareProduct.estimatedAmount.toLocaleString()}
                    </span>
                  </div>
                )}

                {minCompareAmount > 0 && (
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                    <span className="text-[11px] font-medium">Best Deal: </span>
                    <span className="font-bold">₹{minCompareAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Comparison Cards Grid */}
            <div className="p-6 overflow-y-auto space-y-4">
              {compareQuotes.length === 0 ? (
                <div className="text-center py-12">
                  <StorefrontOutlined sx={{ fontSize: 36 }} className="text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No quotations recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Add Another Vendor" above to record a quotation.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {compareQuotes.map((quote) => {
                    const isLowest = quote.quotationAmount === minCompareAmount && compareQuotes.length > 1;
                    const estAmt = compareProduct.estimatedAmount || 0;
                    const diffEst = estAmt > 0 ? quote.quotationAmount - estAmt : 0;

                    return (
                      <div
                        key={quote.id}
                        className={`rounded-2xl p-4 border flex flex-col justify-between transition-all ${isLowest
                          ? "bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/60 dark:border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30"
                          : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-800"
                          }`}
                      >
                        <div>
                          {/* Card Header & Lowest Price Tag */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Quote #{quote.id}
                              </span>
                              <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 truncate">
                                <StorefrontOutlined sx={{ fontSize: 16 }} />
                                <span>{quote.vendorName}</span>
                              </h4>
                            </div>

                            {isLowest ? (
                              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
                                <WorkspacePremiumOutlined sx={{ fontSize: 12 }} />
                                Best Price
                              </span>
                            ) : (
                              <span
                                className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusBadge(
                                  quote.status
                                )}`}
                              >
                                {quote.status}
                              </span>
                            )}
                          </div>

                          {/* Price & Savings Display */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 mb-3">
                            <div className="text-[11px] text-slate-400 font-medium">Quoted Amount</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                              ₹{quote.quotationAmount.toLocaleString()}
                            </div>
                            {estAmt > 0 && (
                              <div
                                className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${diffEst < 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : diffEst === 0
                                    ? "text-slate-500"
                                    : "text-rose-600 dark:text-rose-400"
                                  }`}
                              >
                                {diffEst < 0 ? (
                                  <>
                                    <TrendingDownOutlined sx={{ fontSize: 14 }} />
                                    <span>Save ₹{Math.abs(diffEst).toLocaleString()} vs budget</span>
                                  </>
                                ) : diffEst === 0 ? (
                                  <span>Matches exact budget</span>
                                ) : (
                                  <span>+₹{diffEst.toLocaleString()} over budget</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Details List */}
                          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-slate-400">Delivery:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {quote.deliveryTimeline || "3-5 Days"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 dark:border-slate-800">
                              <span className="text-slate-400">Payment Terms:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {quote.paymentTerms || "Net 30"}
                              </span>
                            </div>

                            {quote.quotationNumber && (
                              <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">Quote Ref #:</span>
                                <span className="font-mono text-slate-700 dark:text-slate-300">
                                  #{quote.quotationNumber}
                                </span>
                              </div>
                            )}

                            {quote.vendorEmail && (
                              <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">Email:</span>
                                <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                                  {quote.vendorEmail}
                                </span>
                              </div>
                            )}

                            {quote.vendorContact && (
                              <div className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">Contact:</span>
                                <span className="text-slate-700 dark:text-slate-300">
                                  {quote.vendorContact}
                                </span>
                              </div>
                            )}

                            {quote.notes && (
                              <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-900/40 text-[11px] text-slate-600 dark:text-slate-400 mt-2">
                                <span className="font-semibold text-slate-500 dark:text-slate-400">Notes: </span>
                                <span>{quote.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons on Card */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          {quote.status !== "PO Issued" && quote.status !== "Completed" && (
                            <button
                              type="button"
                              onClick={() => handleQuickIssuePo(quote)}
                              className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                              <CheckCircle sx={{ fontSize: 14 }} />
                              <span>Award PO</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setIsCompareModalOpen(false);
                              handleOpenEditModal(quote);
                            }}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Quote"
                          >
                            <EditOutlined sx={{ fontSize: 15 }} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(quote)}
                            className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete Quote"
                          >
                            <DeleteOutline sx={{ fontSize: 15 }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500">
              <span>{compareQuotes.length} vendor quotes available for this product</span>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= EDIT VENDOR QUOTATION MODAL ======================= */}
      {isEditModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <EditOutlined sx={{ fontSize: 20 }} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Edit Purchase Quotation #{selectedPurchase.id}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                    {selectedPurchase.itemName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor / Supplier Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editVendorName}
                    onChange={(e) => setEditVendorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor Contact
                  </label>
                  <input
                    type="text"
                    value={editVendorContact}
                    onChange={(e) => setEditVendorContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vendor Email
                  </label>
                  <input
                    type="email"
                    value={editVendorEmail}
                    onChange={(e) => setEditVendorEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quotation Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={editQuotationAmount}
                    onChange={(e) => setEditQuotationAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Quotation Reference #
                  </label>
                  <input
                    type="text"
                    value={editQuotationNumber}
                    onChange={(e) => setEditQuotationNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Delivery Timeline
                  </label>
                  <input
                    type="text"
                    value={editDeliveryTimeline}
                    onChange={(e) => setEditDeliveryTimeline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Procurement Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Quotation Received">Quotation Received</option>
                    <option value="PO Issued">PO Issued</option>
                    <option value="In Procurement">In Procurement</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notes & Remarks
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-all disabled:opacity-60"
                >
                  {submitting ? "Updating..." : "Update Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= DETAIL MODAL ======================= */}
      {isDetailModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <VisibilityOutlined sx={{ fontSize: 20 }} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Quotation #{selectedPurchase.id}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Full supplier and approval details
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedPurchase.itemName}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${getStatusBadge(
                      selectedPurchase.status
                    )}`}
                  >
                    {selectedPurchase.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-slate-400">Category: </span>
                    {selectedPurchase.category}
                  </div>
                  <div>
                    <span className="text-slate-400">Quantity: </span>
                    {selectedPurchase.quantity}
                  </div>
                  <div>
                    <span className="text-slate-400">Requested By: </span>
                    {selectedPurchase.employeeName}
                  </div>
                  <div>
                    <span className="text-slate-400">Department: </span>
                    {selectedPurchase.departmentName || "General"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Vendor</span>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-1">{selectedPurchase.vendorName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{selectedPurchase.vendorEmail || "No email"}</p>
                  <p className="text-[11px] text-slate-500">{selectedPurchase.vendorContact || "No phone"}</p>
                </div>

                <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Quotation Commercials</span>
                  <p className="font-bold text-slate-900 dark:text-white text-base mt-1">
                    ₹{selectedPurchase.quotationAmount.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Terms: {selectedPurchase.paymentTerms || "Net 30"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Delivery: {selectedPurchase.deliveryTimeline || "3-5 Days"}
                  </p>
                </div>
              </div>

              {selectedPurchase.notes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Notes & Terms</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-1">{selectedPurchase.notes}</p>
                </div>
              )}

              {/* Multi-vendor check in Detail modal */}
              {purchases.filter((p) => p.approvalRequestId === selectedPurchase.approvalRequestId).length > 1 && (
                <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-900/40 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-indigo-900 dark:text-indigo-300 text-xs">
                      {purchases.filter((p) => p.approvalRequestId === selectedPurchase.approvalRequestId).length} Vendors Quoted for this Product
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Compare pricing, delivery, and terms across all vendors.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenCompareModal(selectedPurchase.approvalRequestId);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <CompareArrows sx={{ fontSize: 15 }} />
                    <span>Compare</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Recorded by: {selectedPurchase.createdByName || "Admin"}</span>
                <span>{new Date(selectedPurchase.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};

export default PurchasesPage;
