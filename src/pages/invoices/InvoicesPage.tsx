import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ReceiptLongOutlined,
  AddCircleOutline,
  Search,
  Close,
  Refresh,
  DeleteOutline,
  VisibilityOutlined,
  EditOutlined,
  PictureAsPdfOutlined,
  PrintOutlined,
  LockOutlined,
  LockOpenOutlined,
  Add,
  RemoveCircleOutline,
  CorporateFare,
  CheckCircle,
  AccountBalanceWalletOutlined,
  TrendingUpOutlined,
  HourglassEmptyOutlined,
  CheckCircleOutline,
  StorefrontOutlined,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Pagination } from "../../components/common/Pagination";
import { SortableHeader } from "../../components/common/SortableHeader";
import { useTableSort } from "../../hooks/useTableSort";
import { invoiceService } from "../../api/invoice.service";
import { useAuth } from "../../hooks/useAuth";
import { showConfirmDialog, showErrorAlert, showSuccessAlert } from "../../utils/alerts";
import { numberToWordsInIndianRupees } from "../../utils/numberToWords";
import type {
  InvoiceDto,
  InvoiceSummaryDto,
  CreateInvoiceItemPayload,
  CreateInvoicePayload,
} from "../../types/invoice";
import { InvoicePreviewModal } from "./components/InvoicePreviewModal";

const STATUS_TABS = [
  { id: "ALL", label: "All Invoices" },
  { id: "Paid", label: "Paid" },
  { id: "Pending", label: "Pending" },
  { id: "Draft", label: "Draft" },
  { id: "Overdue", label: "Overdue" },
];

const GST_RATES = [0, 5, 12, 18, 28];

export const InvoicesPage: React.FC = () => {
  const { user, can } = useAuth();

  // Strict check: Only users with all permissions / Super Admin can edit Company GST
  const canEditGst = useMemo(() => {
    if (!user) return false;
    const roleId = Number(user.roleId);
    const roleName = (user.roleName || "").toLowerCase();
    const isSuperAdmin = roleId === 2 || roleName.includes("super admin") || roleName === "admin";
    const hasFullPerms = can("permissions.manage") || can("invoices.manage");
    return isSuperAdmin || hasFullPerms;
  }, [user, can]);

  // Data states
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [summary, setSummary] = useState<InvoiceSummaryDto>({
    totalInvoices: 0,
    totalInvoicedAmount: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
    totalGstCollected: 0,
    paidCount: 0,
    pendingCount: 0,
    draftCount: 0,
    overdueCount: 0,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination & Sorting
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const { sortKey, sortDirection, handleSort, sortedData: sortedInvoices } = useTableSort<InvoiceDto>({
    data: invoices,
    initialSortKey: "invoiceDate",
    initialDirection: "desc",
    getSortValue: (inv, key) => {
      switch (key) {
        case "invoiceNumber":
          return inv.invoiceNumber || "";
        case "customerName":
          return (inv.customerName || "").toLowerCase();
        case "invoiceDate":
          return inv.invoiceDate || "";
        case "items":
          return inv.items?.length || 0;
        case "subtotal":
          return Number(inv.subtotal || 0);
        case "taxAmount":
          return Number(inv.taxAmount || 0);
        case "totalAmount":
          return Number(inv.totalAmount || 0);
        case "status":
          return (inv.status || "").toLowerCase();
        default:
          return (inv as any)[key];
      }
    },
  });

  const paginatedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedInvoices.slice(start, start + pageSize);
  }, [sortedInvoices, page, pageSize]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);

  // Form State
  const [editId, setEditId] = useState<number | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customerGstin, setCustomerGstin] = useState<string>("");
  const [companyGstin, setCompanyGstin] = useState<string>("36AAAAA0000A1Z5");
  const [invoiceDate, setInvoiceDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });
  const [status, setStatus] = useState<string>("Pending");
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [notes, setNotes] = useState<string>("Thank you for doing business with NavaNala Technologies.");
  const [termsAndConditions, setTermsAndConditions] = useState<string>(
    "1. Payment due within 15 days of invoice issue.\n2. 18% GST applicable as per standard Indian Tax guidelines.\n3. Remit payments via Bank Transfer / NEFT / RTGS or UPI."
  );

  // Dynamic Line Items
  const [items, setItems] = useState<CreateInvoiceItemPayload[]>([
    { productName: "", description: "", quantity: 1, unitPrice: 0, taxRate: 18 },
  ]);

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load Invoices & Summary
  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [invRes, sumRes] = await Promise.all([
        invoiceService.getInvoices({
          status: statusFilter,
          search: search.trim() || undefined,
        }),
        invoiceService.getSummary(),
      ]);

      setInvoices(invRes.data || []);
      setSummary(sumRes);
    } catch (err: any) {
      showErrorAlert("Fetch Error", err?.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time Calculations
  const calculatedSubtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  }, [items]);

  const calculatedTaxAmount = useMemo(() => {
    return items.reduce((acc, it) => {
      const base = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      const rate = Number(it.taxRate) || 0;
      return acc + (base * rate) / 100;
    }, 0);
  }, [items]);

  const calculatedDiscount = useMemo(() => {
    return Math.max(0, Number(discountAmount) || 0);
  }, [discountAmount]);

  const calculatedGrandTotal = useMemo(() => {
    return Math.max(0, calculatedSubtotal + calculatedTaxAmount - calculatedDiscount);
  }, [calculatedSubtotal, calculatedTaxAmount, calculatedDiscount]);

  const totalInWords = useMemo(() => {
    return numberToWordsInIndianRupees(calculatedGrandTotal);
  }, [calculatedGrandTotal]);

  // Item row operations
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { productName: "", description: "", quantity: 1, unitPrice: 0, taxRate: 18 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showErrorAlert("Validation", "An invoice must have at least one product item.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof CreateInvoiceItemPayload, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Reset form
  const resetForm = () => {
    setEditId(null);
    setInvoiceNumber("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setCustomerAddress("");
    setCustomerGstin("");
    setCompanyGstin("36AAAAA0000A1Z5");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setDueDate(d.toISOString().split("T")[0]);
    setStatus("Pending");
    setPaymentMethod("Bank Transfer");
    setDiscountAmount("0");
    setNotes("Thank you for doing business with NavaNala Technologies.");
    setTermsAndConditions(
      "1. Payment due within 15 days of invoice issue.\n2. 18% GST applicable as per standard Indian Tax guidelines.\n3. Remit payments via Bank Transfer / NEFT / RTGS or UPI."
    );
    setItems([{ productName: "", description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (inv: InvoiceDto) => {
    setEditId(inv.id);
    setInvoiceNumber(inv.invoiceNumber);
    setCustomerName(inv.customerName);
    setCustomerEmail(inv.customerEmail || "");
    setCustomerPhone(inv.customerPhone || "");
    setCustomerAddress(inv.customerAddress || "");
    setCustomerGstin(inv.customerGstin || "");
    setCompanyGstin(inv.companyGstin || "36AAAAA0000A1Z5");
    setInvoiceDate(inv.invoiceDate ? inv.invoiceDate.split("T")[0] : new Date().toISOString().split("T")[0]);
    setDueDate(inv.dueDate ? inv.dueDate.split("T")[0] : "");
    setStatus(inv.status);
    setPaymentMethod(inv.paymentMethod || "Bank Transfer");
    setDiscountAmount(String(inv.discountAmount || 0));
    setNotes(inv.notes || "");
    setTermsAndConditions(inv.termsAndConditions || "");

    if (inv.items && inv.items.length > 0) {
      setItems(
        inv.items.map((it) => ({
          productName: it.productName,
          description: it.description || "",
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: it.taxRate,
        }))
      );
    } else {
      setItems([{ productName: "", description: "", quantity: 1, unitPrice: 0, taxRate: 18 }]);
    }

    setIsEditModalOpen(true);
  };

  const openPreviewModal = (inv: InvoiceDto) => {
    setSelectedInvoice(inv);
    setIsPreviewModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showErrorAlert("Validation Error", "Please provide customer or organization name.");
      return;
    }

    const invalidItem = items.find((it) => !it.productName.trim() || Number(it.unitPrice) <= 0);
    if (invalidItem) {
      showErrorAlert("Validation Error", "Please provide a valid Product Name and Unit Price (> 0) for each line item.");
      return;
    }

    const payload: CreateInvoicePayload = {
      invoiceNumber: invoiceNumber.trim() || undefined,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      customerGstin: customerGstin.trim().toUpperCase() || undefined,
      companyGstin: canEditGst ? companyGstin.trim().toUpperCase() : undefined,
      invoiceDate: invoiceDate ? new Date(invoiceDate).toISOString() : undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      discountAmount: Number(discountAmount) || 0,
      status,
      paymentMethod,
      notes: notes.trim() || undefined,
      termsAndConditions: termsAndConditions.trim() || undefined,
      items: items.map((it) => ({
        productName: it.productName.trim(),
        description: it.description?.trim() || undefined,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        taxRate: Number(it.taxRate) || 0,
      })),
    };

    try {
      setSubmitting(true);
      if (editId) {
        await invoiceService.updateInvoice(editId, payload);
        showSuccessAlert("Updated!", "Invoice updated successfully.");
        setIsEditModalOpen(false);
      } else {
        await invoiceService.createInvoice(payload);
        showSuccessAlert("Created!", "Invoice created successfully.");
        setIsAddModalOpen(false);
      }
      loadData();
    } catch (err: any) {
      showErrorAlert("Error", err?.message || "Failed to save invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete action
  const handleDelete = async (inv: InvoiceDto) => {
    const res = await showConfirmDialog(
      "Delete Invoice?",
      `Are you sure you want to remove invoice #${inv.invoiceNumber} for ${inv.customerName}?`,
      "Delete Invoice",
      "Cancel",
      true
    );

    if (res.isConfirmed) {
      try {
        await invoiceService.deleteInvoice(inv.id);
        showSuccessAlert("Deleted", `Invoice #${inv.invoiceNumber} has been removed.`);
        loadData();
      } catch (err: any) {
        showErrorAlert("Error", err?.message || "Failed to delete invoice.");
      }
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st?.toLowerCase()) {
      case "paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
      case "overdue":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20";
    }
  };

  return (
    <WorkspaceLayout permission="invoices.view" label="Invoices" icon="🧾" showHero={false}>
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadData}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs transition-all cursor-pointer disabled:opacity-60"
            >
              <Refresh sx={{ fontSize: 16 }} className={refreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>

            {can("invoices.create") && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <AddCircleOutline sx={{ fontSize: 16 }} />
                <span>Add Invoice</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Metrics Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Invoiced</span>
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 flex items-center justify-center">
                <ReceiptLongOutlined sx={{ fontSize: 18 }} />
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              ₹{(summary.totalInvoicedAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {summary.totalInvoices || 0} Total Generated Invoices
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Paid Revenue</span>
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircleOutline sx={{ fontSize: 18 }} />
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              ₹{(summary.totalPaidAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
              {summary.paidCount || 0} Settled Invoices
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pending Amount</span>
              <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 flex items-center justify-center">
                <HourglassEmptyOutlined sx={{ fontSize: 18 }} />
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              ₹{(summary.totalPendingAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
              {summary.pendingCount || 0} Invoices Awaiting Payment
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">GST Collected</span>
              <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 flex items-center justify-center">
                <AccountBalanceWalletOutlined sx={{ fontSize: 18 }} />
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
              ₹{(summary.totalGstCollected || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-purple-600/80 dark:text-purple-400/80 mt-0.5 font-mono">
              GSTIN: 36AAAAA0000A1Z5
            </p>
          </div>
        </div>

        {/* Filter Bar & Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${statusFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" sx={{ fontSize: 16 }} />
            <input
              type="text"
              placeholder="Search invoice #, customer, product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-2 pl-9 pr-8 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-hidden transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <Close sx={{ fontSize: 14 }} />
              </button>
            )}
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="rounded-2xl bg-indigo-50 dark:bg-slate-800 p-4 text-indigo-600 dark:text-indigo-400">
                <ReceiptLongOutlined sx={{ fontSize: 36 }} />
              </div>
              <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">No invoices found</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                {search || statusFilter !== "ALL"
                  ? "No invoices match your active search filters."
                  : "Generate your first customer invoice with multi-product line items and GST."}
              </p>
              {can("invoices.create") && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 shadow-sm cursor-pointer"
                >
                  <AddCircleOutline sx={{ fontSize: 16 }} />
                  Create First Invoice
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/50 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <SortableHeader sortKey="invoiceNumber" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-5 py-3.5">
                      Invoice #
                    </SortableHeader>
                    <SortableHeader sortKey="customerName" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-5 py-3.5">
                      Customer / Client
                    </SortableHeader>
                    <SortableHeader sortKey="invoiceDate" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-5 py-3.5">
                      Date
                    </SortableHeader>
                    <SortableHeader sortKey="items" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-5 py-3.5">
                      Products
                    </SortableHeader>
                    <SortableHeader sortKey="subtotal" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-5 py-3.5">
                      Subtotal
                    </SortableHeader>
                    <SortableHeader sortKey="taxAmount" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-5 py-3.5">
                      GST
                    </SortableHeader>
                    <SortableHeader sortKey="totalAmount" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-5 py-3.5">
                      Grand Total
                    </SortableHeader>
                    <SortableHeader sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-5 py-3.5">
                      Status
                    </SortableHeader>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        #{inv.invoiceNumber}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{inv.customerName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {inv.customerEmail || inv.customerPhone || "No contact"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                        {inv.invoiceDate
                          ? new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                          : "-"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {inv.items?.length || 0} {inv.items?.length === 1 ? "Item" : "Items"}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-700 dark:text-slate-300">
                        ₹{(inv.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-purple-600 dark:text-purple-400">
                        ₹{(inv.taxAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          ₹{(inv.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        <div
                          className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[170px]"
                          title={inv.totalAmountInWords}
                        >
                          {inv.totalAmountInWords}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadge(
                            inv.status
                          )}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Preview Invoice & Download PDF"
                            onClick={() => openPreviewModal(inv)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            <VisibilityOutlined sx={{ fontSize: 18 }} />
                          </button>

                          {/* {(can("invoices.edit") || can("invoices.manage")) && (
                            <button
                              type="button"
                              title="Edit Invoice"
                              onClick={() => openEditModal(inv)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                            >
                              <EditOutlined sx={{ fontSize: 18 }} />
                            </button>
                          )} */}

                          <button
                            type="button"
                            title="Print Invoice Bill"
                            onClick={() => openPreviewModal(inv)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            <PrintOutlined sx={{ fontSize: 18 }} />
                          </button>

                          {can("invoices.delete") && (
                            <button
                              type="button"
                              title="Delete Invoice"
                              onClick={() => handleDelete(inv)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <DeleteOutline sx={{ fontSize: 18 }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && invoices.length > 0 && (
            <Pagination
              currentPage={page}
              totalItems={invoices.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      </div>

      {/* Add / Edit Invoice Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-slate-900 dark:text-white shadow-2xl sm:p-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 flex items-center justify-center">
                  <ReceiptLongOutlined sx={{ fontSize: 22 }} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {editId ? `Edit Invoice #${invoiceNumber}` : "Create Commercial Tax Invoice"}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    NavaNala Technologies • Multi-Product & GST Calculation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
              >
                <Close sx={{ fontSize: 20 }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Company & GST Section */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <CorporateFare className="text-indigo-600 dark:text-indigo-400" sx={{ fontSize: 18 }} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Company Origin: NavaNala Technologies
                    </span>
                  </div>
                  {canEditGst ? (
                    ""
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                      <LockOutlined sx={{ fontSize: 13 }} />
                      Company GST Locked (Requires Full Permissions)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Company Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value="NavaNala Technologies"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Company GST Number {canEditGst && <span className="text-indigo-600 font-bold">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled={!canEditGst}
                        value={companyGstin}
                        onChange={(e) => setCompanyGstin(e.target.value)}
                        placeholder="e.g. 36AAAAA0000A1Z5"
                        className={`w-full rounded-xl border px-3 py-2 text-xs uppercase font-mono tracking-wider transition-all ${canEditGst
                          ? "border-indigo-300 bg-white text-slate-900 focus:border-indigo-600 focus:outline-hidden dark:border-indigo-500/50 dark:bg-slate-900 dark:text-white"
                          : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 cursor-not-allowed"
                          }`}
                      />
                      {!canEditGst && (
                        <LockOutlined
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                          sx={{ fontSize: 14 }}
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Invoice Number
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Auto-generated (e.g. INV-2026-0001)"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Customer / Billed To Section */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/40 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block mb-3">
                  Customer / Billed To Information
                </span>
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Customer / Client Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Global Solutions"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Customer Email
                    </label>
                    <input
                      type="email"
                      placeholder="billing@customer.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Customer Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Billing Address
                    </label>
                    <input
                      type="text"
                      placeholder="Street address, City, State, PIN"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Customer GSTIN
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 36AACCA1234F1Z9"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs uppercase font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Product Line Items */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Product Line Items (Product Name, Amount & Quantity)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
                  >
                    <Add sx={{ fontSize: 14 }} />
                    Add Product
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const rowBase = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    const rowTax = (rowBase * (Number(item.taxRate) || 0)) / 100;
                    const rowTotal = rowBase + rowTax;

                    return (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 items-end shadow-xs"
                      >
                        <div className="col-span-12 sm:col-span-3">
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Product Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Enterprise Cloud Architecture"
                            value={item.productName}
                            onChange={(e) => handleItemChange(idx, "productName", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden"
                          />
                        </div>

                        <div className="col-span-12 sm:col-span-2">
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Description
                          </label>
                          <input
                            type="text"
                            placeholder="Specifications or SKU"
                            value={item.description || ""}
                            onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-1">
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs text-slate-900 dark:text-white text-center focus:border-indigo-600 focus:outline-hidden"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Amount (₹) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            value={item.unitPrice === 0 && (item as any)._unitPriceRaw === "" ? "" : item.unitPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleItemChange(idx, "unitPrice", val === "" ? 0 : parseFloat(val) || 0);
                            }}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-hidden"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                              GST %
                            </label>
                            <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400">
                              {Number(item.taxRate) || 0}%
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              placeholder="18"
                              value={item.taxRate === 0 && (item as any)._taxRateRaw === "" ? "" : item.taxRate}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleItemChange(idx, "taxRate", val === "" ? 0 : Math.max(0, parseFloat(val) || 0));
                              }}
                              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 pr-6 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:border-indigo-600 focus:outline-hidden"
                            />
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                              %
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {GST_RATES.map((rate) => (
                              <button
                                key={rate}
                                type="button"
                                onClick={() => handleItemChange(idx, "taxRate", rate)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${Number(item.taxRate) === rate
                                  ? "bg-indigo-600 text-white font-bold"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                                  }`}
                              >
                                {rate}%
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="col-span-12 sm:col-span-2 flex items-center justify-between sm:justify-end gap-2">
                          <div className="text-right">
                            <div className="text-[10px] text-slate-500">
                              Tax: <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">₹{rowTax.toFixed(2)}</span>
                            </div>
                            <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              ₹{rowTotal.toFixed(2)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 cursor-pointer"
                            title="Remove line item"
                          >
                            <RemoveCircleOutline sx={{ fontSize: 18 }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Calculation Summary & Amount in Words */}
              <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/60 via-white to-blue-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 p-4 sm:p-5 shadow-xs">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                      <TrendingUpOutlined sx={{ fontSize: 18 }} />
                      <span className="text-xs font-bold uppercase tracking-wider">Total Amount in Words</span>
                    </div>
                    <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-950 p-3.5 shadow-xs">
                      <p className="text-xs font-bold leading-relaxed text-indigo-950 dark:text-indigo-200">
                        {totalInWords}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Invoice Date
                        </label>
                        <input
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-xs">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>Subtotal (Net Amount):</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        ₹{calculatedSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-purple-700 dark:text-purple-400">
                      <span>Calculated GST Tax:</span>
                      <span className="font-mono font-bold">
                        + ₹{calculatedTaxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>Discount (₹):</span>
                      <input
                        type="number"
                        min="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-right font-mono text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                      <span className="text-indigo-700 dark:text-indigo-400">Payable Grand Total:</span>
                      <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                        ₹{calculatedGrandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">Status</label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white cursor-pointer"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] text-slate-600 dark:text-slate-400">Payment Mode</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white cursor-pointer"
                        >
                          <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                          <option value="UPI">UPI / QR Code</option>
                          <option value="Credit Card">Credit / Debit Card</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Cash">Cash</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Notes to Client
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Terms & Conditions
                  </label>
                  <textarea
                    rows={2}
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <LoadingSpinner size="sm" /> : <CheckCircle sx={{ fontSize: 16 }} />}
                  <span>{editId ? "Update Invoice" : "Generate Invoice"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Invoice Preview, Download PDF & Print Modal */}
      <InvoicePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        invoice={selectedInvoice}
      />
    </WorkspaceLayout>
  );
};

export default InvoicesPage;
