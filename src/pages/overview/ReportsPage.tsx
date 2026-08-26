import React, { useState, useEffect, useCallback } from "react";
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
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { reportService } from "../../api/report.service";
import { showConfirmDialog, showSuccessToast, showErrorToast } from "../../utils/alerts";
import type { Report, ReportFormData } from "../../types";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({ reportsGenerated: 0, exportsReady: 0, roleCoverage: "100%" });
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [categories, setCategories] = useState<string[]>([
    "Compliance",
    "Security",
    "Role Mapping",
    "Access Audit",
    "User Directory",
    "Financial Audit",
    "Governance",
  ]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewMode, setViewMode] = useState<"card" | "column">("card");

  // Category Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>("");

  // Report Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [formData, setFormData] = useState<ReportFormData & { customCategory?: string }>({
    title: "",
    description: "",
    category: "Compliance",
    format: "PDF",
    customCategory: "",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchCategories = useCallback(async () => {
    try {
      const cats = await reportService.getCategories();
      if (cats && cats.length > 0) {
        setCategories((prev) => Array.from(new Set([...prev, ...cats])));
      }
    } catch {
      // fallback to current categories
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

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showErrorToast("Category name cannot be empty.");
    } else {
      if (!categories.includes(trimmed)) {
        const updated = [...categories, trimmed];
        setCategories(updated);
      }
      setSelectedCategory(trimmed);
      showSuccessToast(`Category "${trimmed}" added successfully!`);
      setNewCategoryName("");
      setIsCategoryModalOpen(false);
    }
  };

  const openCreateModal = () => {
    setEditingReport(null);
    setFormData({
      title: "",
      description: "",
      category: categories[0] || "Compliance",
      format: "PDF",
      customCategory: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (report: Report) => {
    setEditingReport(report);
    setFormData({
      title: report.title,
      description: report.description,
      category: report.category,
      format: report.format,
      customCategory: "",
    });
    setIsModalOpen(true);
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

    // Keep category in list if new
    if (!categories.includes(finalCategory)) {
      setCategories((prev) => [...prev, finalCategory]);
    }

    setSubmitting(true);
    try {
      if (editingReport) {
        await reportService.updateReport(editingReport.id, {
          title: formData.title,
          description: formData.description,
          category: finalCategory,
          format: formData.format,
        });
        showSuccessToast("Report updated successfully!");
      } else {
        await reportService.createReport({
          title: formData.title,
          description: formData.description,
          category: finalCategory,
          format: formData.format,
        });
        showSuccessToast("Report generated and saved successfully!");
      }
      setIsModalOpen(false);
      fetchReports();
      fetchCategories();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to save report.");
    } finally {
      setSubmitting(false);
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
        showSuccessToast("Report deleted succesfully!.");
        fetchReports();
      } catch (err: any) {
        showErrorToast(err?.message || "Failed to delete report.");
      }
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      showSuccessToast(`Exporting ${report.title} (${report.format})...`);
      await reportService.downloadReport(report.id, report.title, report.format);
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to download report document.");
    }
  };

  const allCategoryTabs = ["ALL", ...categories];

  return (
    <WorkspaceLayout permission="reports.view" label="Reports" icon="▤" showHero={false}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
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
              onClick={() => fetchReports()}
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <CategoryOutlined sx={{ fontSize: 16 }} />
              <span>+ Add Category</span>
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

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Reports Generated */}
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

          {/* Card 2: Exports Ready */}
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

          {/* Card 3: Role Coverage */}
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
        </div>

        {/* Filter Controls, Add Category, Search & View Mode Switch */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {allCategoryTabs.map((cat) => (
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
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap border border-dashed border-indigo-300"
              title="Add new category"
            >
              + Category
            </button>
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
            No compliance reports found. Click "Generate Report" above to create one.
          </div>
        ) : viewMode === "card" ? (
          /* CARD WISE VIEW */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
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
        ) : (
          /* COLUMN WISE / TABLE VIEW */
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Report Details</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Format & Size</th>
                    <th className="px-6 py-4">Generated By</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((report) => (
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
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <CategoryOutlined sx={{ fontSize: 18 }} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add Report Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <Close sx={{ fontSize: 18 }} />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Identity Management, Billing Audit, ISO Certification"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generate / Edit Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingReport ? "Edit Compliance Report" : "Generate Compliance Report"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Category *</label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                    >
                      + New
                    </button>
                  </div>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
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
                  onClick={() => setIsModalOpen(false)}
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
    </WorkspaceLayout>
  );
};

export default ReportsPage;
