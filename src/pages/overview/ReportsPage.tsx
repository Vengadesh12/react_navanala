import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Assessment,
  Search,
  Add,
  DeleteOutline,
  EditOutlined,
  DownloadOutlined,
  Refresh,
  FileDownloadDoneOutlined,
  ShieldOutlined,
  CategoryOutlined,
  Close,
  GridViewOutlined,
  FormatListBulletedOutlined,
  AttachFile,
  InsertDriveFileOutlined,
  CloudUploadOutlined,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { Pagination } from "../../components/common/Pagination";
import { SortableHeader } from "../../components/common/SortableHeader";
import { useTableSort } from "../../hooks/useTableSort";
import { reportService } from "../../api/report.service";
import { showConfirmDialog, showSuccessToast, showErrorToast } from "../../utils/alerts";
import { CreateReportCategoryModal } from "./components/CreateReportCategoryModal";
import type { Report, ReportFormData, ReportCategory } from "../../types";

const getFormatBadge = (format: string) => {
  const f = format?.toUpperCase() || "";
  if (f === "PDF") {
    return "bg-rose-50 text-rose-700 border border-rose-200/60";
  }
  if (f === "CSV" || f === "EXCEL" || f === "XLSX") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
  }
  if (f === "JSON") {
    return "bg-amber-50 text-amber-700 border border-amber-200/60";
  }
  return "bg-slate-100 text-slate-700 border border-slate-200/60";
};

const getCategoryBadge = (category: string) => {
  const c = category?.toLowerCase() || "";
  if (c.includes("compliance") || c.includes("governance")) {
    return "bg-blue-50 text-blue-700 border border-blue-200/60";
  }
  if (c.includes("security") || c.includes("audit")) {
    return "bg-indigo-50 text-indigo-700 border border-indigo-200/60";
  }
  if (c.includes("user") || c.includes("role")) {
    return "bg-purple-50 text-purple-700 border border-purple-200/60";
  }
  if (c.includes("finan")) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
  }
  return "bg-slate-100 text-slate-700 border border-slate-200/60";
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
};

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [dbCategories, setDbCategories] = useState<ReportCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({ reportsGenerated: 0, exportsReady: 0, roleCoverage: "100%" });
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewMode, setViewMode] = useState<"card" | "column">("card");

  // Pagination & Sorting
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Reset page when search or category filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, searchTerm]);

  const saveAbortControllerRef = useRef<AbortController | null>(null);

  // Abort any ongoing save request when user redirects/navigates to other menu (unmounts)
  useEffect(() => {
    return () => {
      if (saveAbortControllerRef.current) {
        saveAbortControllerRef.current.abort();
        saveAbortControllerRef.current = null;
      }
    };
  }, []);

  const { sortKey, sortDirection, handleSort, sortedData: sortedReports } = useTableSort<Report>({
    data: reports,
    initialSortKey: "id",
    initialDirection: "desc",
    getSortValue: (r, key) => {
      switch (key) {
        case "id":
          return Number(r.id);
        case "title":
          return (r.title || "").toLowerCase();
        case "category":
          return (r.category || "").toLowerCase();
        case "format":
          return (r.format || "").toLowerCase();
        case "createdBy":
          return (r.createdBy || "").toLowerCase();
        case "createdAt":
          return r.createdAt || "";
        default:
          return (r as any)[key];
      }
    },
  });

  const paginatedReports = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedReports.slice(start, start + pageSize);
  }, [sortedReports, page, pageSize]);

  // Category Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  // Report Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [formData, setFormData] = useState<ReportFormData & { customCategory?: string; fileName?: string }>({
    title: "",
    description: "",
    categoryId: undefined,
    category: "Compliance",
    format: "PDF",
    customCategory: "",
    file: null,
    fileName: undefined,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await reportService.getCategories();
      setDbCategories(cats || []);
    } catch (err: any) {
      console.error("Failed to load report categories:", err);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportService.getReports(selectedCategory, searchTerm);
      setReports(res.reports || []);
      setStats({
        reportsGenerated: res.reportsGenerated,
        exportsReady: res.exportsReady,
        roleCoverage: res.roleCoverage,
      });
      if (res.categories && res.categories.length > 0) {
        setDbCategories(res.categories);
      }
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to load reports from database.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm]);

  useEffect(() => {
    fetchReports();
    fetchCategories();
  }, [fetchReports, fetchCategories]);

  // Dynamic categories list from DB with fallback defaults
  const categoryNames =
    dbCategories.length > 0
      ? dbCategories.map((c) => c.name)
      : [
          "Compliance",
          "Security",
          "Role Mapping",
          "Access Audit",
          "User Directory",
          "Financial Audit",
          "Governance",
        ];

  const filterCategories = ["ALL", ...categoryNames];
  const defaultCategory = categoryNames[0] || "Compliance";

  const openCreateModal = () => {
    setEditingReport(null);
    const initialCategory = dbCategories[0]?.name || defaultCategory;
    const initialCategoryId = dbCategories[0]?.id;
    setFormData({
      title: "",
      description: "",
      categoryId: initialCategoryId,
      category: initialCategory,
      format: "PDF",
      customCategory: "",
      file: null,
      fileName: undefined,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (report: Report) => {
    setEditingReport(report);
    setFormData({
      title: report.title,
      description: report.description,
      categoryId: report.categoryId,
      category: report.category,
      format: report.format,
      customCategory: "",
      file: null,
      fileName: report.fileName,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saveAbortControllerRef.current) {
      saveAbortControllerRef.current.abort();
      saveAbortControllerRef.current = null;
    }
    setSubmitting(false);
    setIsModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict 15 MB check: 15 * 1024 * 1024 bytes = 15,728,640 bytes
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showErrorToast(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 15 MB limit. Please select a smaller file.`);
      e.target.value = "";
      return;
    }

    // Auto-detect format based on file extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let detectedFormat = formData.format;
    if (ext === "pdf") detectedFormat = "PDF";
    else if (ext === "csv") detectedFormat = "CSV";
    else if (ext === "xlsx" || ext === "xls") detectedFormat = "Excel";
    else if (ext === "json") detectedFormat = "JSON";

    // Auto-fill title if currently blank
    let titleToSet = formData.title;
    if (!titleToSet.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      titleToSet = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    }

    setFormData((prev) => ({
      ...prev,
      title: titleToSet,
      format: detectedFormat,
      file,
      fileName: file.name,
    }));
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({
      ...prev,
      file: null,
      fileName: undefined,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      showErrorToast("Title and description are required.");
      return;
    }

    const finalCategory =
      formData.category === "__custom__"
        ? formData.customCategory?.trim() || "Compliance"
        : formData.category;

    if (!finalCategory) {
      showErrorToast("Please specify a category.");
      return;
    }

    // Resolve categoryId if matching from dbCategories
    const matchedCat = dbCategories.find(
      (c) => c.name.toLowerCase() === finalCategory.toLowerCase()
    );
    const finalCategoryId = formData.categoryId || matchedCat?.id;

    // Abort previous in-flight save if any
    if (saveAbortControllerRef.current) {
      saveAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    saveAbortControllerRef.current = controller;

    setSubmitting(true);
    try {
      if (editingReport) {
        await reportService.updateReport(editingReport.id, {
          title: formData.title,
          description: formData.description,
          categoryId: finalCategoryId,
          category: finalCategory,
          format: formData.format,
          file: formData.file,
        }, controller.signal);
        showSuccessToast("Report updated successfully!");
      } else {
        await reportService.createReport({
          title: formData.title,
          description: formData.description,
          categoryId: finalCategoryId,
          category: finalCategory,
          format: formData.format,
          file: formData.file,
        }, controller.signal);
        showSuccessToast("Report generated and saved successfully!");
      }
      setIsModalOpen(false);
      fetchReports();
      fetchCategories();
    } catch (err: any) {
      if (err?.name === "AbortError" || controller.signal.aborted) {
        console.log("Report save cancelled by user redirect/navigation.");
        return;
      }
      showErrorToast(err?.message || "Failed to save report.");
    } finally {
      setSubmitting(false);
      saveAbortControllerRef.current = null;
    }
  };

  const handleDelete = async (id: number) => {
    const res = await showConfirmDialog(
      "Delete Report?",
      "Are you sure you want to remove this compliance report?",
      "Delete",
      "Cancel",
      true
    );
    if (res.isConfirmed) {
      try {
        await reportService.deleteReport(id);
        showSuccessToast("Report deleted successfully!");
        fetchReports();
      } catch (err: any) {
        showErrorToast(err?.message || "Failed to delete report.");
      }
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      showSuccessToast(`Exporting ${report.title} (${report.format})...`);
      await reportService.downloadReport(report.id, report.title, report.format, report.fileName);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to download report document.");
    }
  };

  const q = searchTerm.toLowerCase().trim();

  const matchReportsGenerated =
    !q ||
    [
      "reports generated",
      "reports",
      "generated",
      "persistent",
      "audit",
      "compliance",
      String(stats.reportsGenerated),
    ].some((t) => t.toLowerCase().includes(q));

  const matchExportsReady =
    !q ||
    [
      "exports ready",
      "exports",
      "download",
      "pdf",
      "csv",
      "json",
      String(stats.exportsReady),
    ].some((t) => t.toLowerCase().includes(q));

  const matchRoleCoverage =
    !q ||
    [
      "role coverage",
      "roles",
      "role",
      "coverage",
      "members",
      String(stats.roleCoverage),
    ].some((t) => t.toLowerCase().includes(q));

  const visibleMetricCount =
    (matchReportsGenerated ? 1 : 0) +
    (matchExportsReady ? 1 : 0) +
    (matchRoleCoverage ? 1 : 0);

  return (
    <WorkspaceLayout
      permission="reports.view"
      label="Reports"
      icon="▤"
      showHero={false}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search reports by title, category, format..."
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Active Search Results Banner */}
        {q && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/40 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Search sx={{ fontSize: 18, color: "#6366f1" }} />
              <span>
                Showing <strong>{reports.length}</strong> matching report{reports.length === 1 ? "" : "s"} for{" "}
                <span className="rounded-md bg-white dark:bg-slate-900 px-2 py-0.5 font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  &ldquo;{searchTerm}&rdquo;
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              <Close sx={{ fontSize: 15 }} />
              <span>Clear Filter</span>
            </button>
          </div>
        )}

        {/* Header Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">
              Generate, download, and review system audit exports across members and permissions.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                fetchReports();
                fetchCategories();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Refresh
                sx={{ fontSize: 16, color: "#64748b" }}
                className={loading ? "animate-spin text-blue-600" : ""}
              />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100/80 transition-colors cursor-pointer"
            >
              <CategoryOutlined sx={{ fontSize: 16 }} />
              <span>Add Category</span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Add sx={{ fontSize: 16 }} />
              <span>Generate Report</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards - rendered dynamically when matching */}
        {visibleMetricCount > 0 && (
          <div
            className={`grid grid-cols-1 gap-4 ${
              visibleMetricCount === 1
                ? "sm:grid-cols-1 md:max-w-md"
                : visibleMetricCount === 2
                ? "sm:grid-cols-2"
                : "sm:grid-cols-3"
            }`}
          >
            {/* Card 1: Reports Generated */}
            {matchReportsGenerated && (
              <div className="relative overflow-hidden rounded-2xl border border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-500/10 via-white to-white dark:from-indigo-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Reports Generated</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.reportsGenerated}</span>
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">persistent</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Audit & compliance reports</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-500 text-white shadow-md shadow-indigo-500/25">
                    <Assessment sx={{ fontSize: 24 }} />
                  </div>
                </div>
              </div>
            )}

            {/* Card 2: Exports Ready */}
            {matchExportsReady && (
              <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Exports Ready</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.exportsReady}</span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">PDF, CSV, JSON</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Download formats ready</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                    <FileDownloadDoneOutlined sx={{ fontSize: 24 }} />
                  </div>
                </div>
              </div>
            )}

            {/* Card 3: Role Coverage */}
            {matchRoleCoverage && (
              <div className="relative overflow-hidden rounded-2xl border border-purple-200/70 dark:border-purple-900/60 bg-gradient-to-br from-purple-500/10 via-white to-white dark:from-purple-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Role Coverage</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.roleCoverage}</span>
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">all members</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Across workspace members</p>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-purple-500 text-white shadow-md shadow-purple-500/25">
                    <ShieldOutlined sx={{ fontSize: 24 }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter Controls, Add Category, Search & View Mode Switch */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {filterCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative min-w-[200px] sm:min-w-[240px] flex-1">
              <Search sx={{ fontSize: 18 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* View Mode Switch (Card Wise vs Column Wise) */}
            <div className="inline-flex items-center rounded-2xl border border-slate-200/90 bg-slate-100/90 p-1 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`flex items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === "card"
                    ? "bg-white text-blue-600 shadow-2xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Card wise view"
              >
                <GridViewOutlined sx={{ fontSize: 18 }} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("column")}
                className={`flex items-center justify-center p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === "column"
                    ? "bg-white text-blue-600 shadow-2xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Column wise view"
              >
                <FormatListBulletedOutlined sx={{ fontSize: 18 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Display: Card Wise vs Column Wise */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <Refresh sx={{ fontSize: 24 }} className="animate-spin text-blue-600 mb-2 inline-block" />
            <p>Loading reports from database...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 shadow-xs">
            No compliance reports found. Click &ldquo;Generate Report&rdquo; above to create one.
          </div>
        ) : viewMode === "card" ? (
          /* CARD WISE VIEW */
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedReports.map((report: Report) => (
                <div
                  key={report.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${getCategoryBadge(report.category)}`}>
                        {report.category}
                      </span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold ${getFormatBadge(report.format)}`}>
                        {report.format} · {report.fileSize || "Ready"}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-3 leading-snug">{report.title}</h3>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">{report.description}</p>
                    {report.fileName && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 rounded-lg px-2.5 py-1 w-fit max-w-full">
                        <InsertDriveFileOutlined sx={{ fontSize: 14 }} className="text-blue-600 shrink-0" />
                        <span className="truncate font-mono font-medium">{report.fileName}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col text-[11px] text-slate-400">
                      <span>By {report.createdBy || "System"}</span>
                      {report.createdAt && <span className="text-[10px] text-slate-400">{formatDate(report.createdAt)}</span>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownload(report)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                        title="Download Certified Export"
                      >
                        <DownloadOutlined sx={{ fontSize: 18 }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(report)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <EditOutlined sx={{ fontSize: 18 }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(report.id)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <DeleteOutline sx={{ fontSize: 18 }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={page}
              totalItems={reports.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              className="rounded-2xl border border-slate-200 bg-white shadow-xs"
            />
          </div>
        ) : (
          /* COLUMN WISE / TABLE VIEW */
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <SortableHeader sortKey="title" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-6 py-4">
                      Report Details
                    </SortableHeader>
                    <SortableHeader sortKey="category" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-6 py-4">
                      Category
                    </SortableHeader>
                    <SortableHeader sortKey="format" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-6 py-4">
                      Format & Size
                    </SortableHeader>
                    <SortableHeader sortKey="createdBy" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} className="px-6 py-4">
                      Generated By
                    </SortableHeader>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedReports.map((report: Report) => (
                    <tr key={report.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                            <Assessment sx={{ fontSize: 18 }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-sm">{report.title}</span>
                              <span className="text-[10px] font-mono text-slate-400">#{report.id}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1 max-w-md">
                              {report.description}
                            </p>
                            {report.fileName && (
                              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                                <AttachFile sx={{ fontSize: 13 }} className="text-blue-500 shrink-0" />
                                <span className="truncate max-w-xs">{report.fileName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getCategoryBadge(report.category)}`}>
                          {report.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-mono font-bold ${getFormatBadge(report.format)}`}>
                            {report.format}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {report.fileSize || "Ready"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs">
                          <span className="font-medium text-slate-800">{report.createdBy || "System Admin"}</span>
                          {report.createdAt && (
                            <p className="text-[11px] text-slate-400">{formatDate(report.createdAt)}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownload(report)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Download Certified Export"
                          >
                            <DownloadOutlined sx={{ fontSize: 18 }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(report)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <EditOutlined sx={{ fontSize: 18 }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(report.id)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <DeleteOutline sx={{ fontSize: 18 }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={page}
              totalItems={reports.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* Generate / Edit Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingReport ? "Edit Compliance Report" : "Generate Compliance Report"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Report Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. User Directory & Role Mapping"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Choose File Option (< 15 MB) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attach Report Document <span className="text-slate-400 font-normal">(Max 15 MB)</span>
                </label>
                {!formData.file && !formData.fileName ? (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/60 hover:border-blue-400 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-2 pb-2">
                      <CloudUploadOutlined className="text-slate-400 group-hover:text-blue-600 transition-colors mb-1" sx={{ fontSize: 24 }} />
                      <p className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                        Click to choose file or drag & drop
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PDF, CSV, Excel, Word, JSON, TXT · Maximum 15 MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.csv,.xlsx,.xls,.json,.doc,.docx,.txt"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/40">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-600">
                        <InsertDriveFileOutlined sx={{ fontSize: 18 }} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {formData.file?.name || formData.fileName}
                        </p>
                        <p className="text-[10px] text-blue-600 font-mono">
                          {formData.file
                            ? `${(formData.file.size / (1024 * 1024)).toFixed(2)} MB / 15 MB limit`
                            : "Existing document in database"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="cursor-pointer text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline px-2 py-1">
                        Change
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          accept=".pdf,.csv,.xlsx,.xls,.json,.doc,.docx,.txt"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                        title="Remove file"
                      >
                        <Close sx={{ fontSize: 16 }} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Category *</label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer flex items-center gap-0.5"
                      title="Create a new Category in database"
                    >
                      <Add sx={{ fontSize: 13 }} />
                      <span>New</span>
                    </button>
                  </div>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = dbCategories.find((c) => c.name === val);
                      setFormData({
                        ...formData,
                        category: val,
                        categoryId: matched?.id,
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    {categoryNames.map((catName) => (
                      <option key={catName} value={catName}>
                        {catName}
                      </option>
                    ))}
                    <option value="__custom__">+ Enter Custom Category...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Export Format</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="PDF">PDF Document (.pdf)</option>
                    <option value="CSV">CSV Spreadsheet (.csv)</option>
                    <option value="JSON">JSON Data (.json)</option>
                    <option value="Excel">Microsoft Excel (.xlsx)</option>
                  </select>
                </div>
              </div>

              {formData.category === "__custom__" && (
                <div>
                  <label className="block text-xs font-semibold text-indigo-700 mb-1">
                    Custom Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter new category name..."
                    value={formData.customCategory || ""}
                    onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                    className="w-full rounded-xl border border-indigo-200 bg-indigo-50/30 px-3.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Audit Scope *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain report parameters, member coverage, and data points included..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submitting ? "Saving..." : editingReport ? "Update Report" : "Save & Generate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Report Category Modal */}
      <CreateReportCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCreated={(newCat) => {
          fetchCategories();
          if (isModalOpen) {
            setFormData((prev) => ({
              ...prev,
              category: newCat.name,
              categoryId: newCat.id,
            }));
          }
        }}
      />
    </WorkspaceLayout>
  );
};

export default ReportsPage;
