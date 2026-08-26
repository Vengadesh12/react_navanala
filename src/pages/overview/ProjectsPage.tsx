import React, { useState, useEffect, useCallback } from "react";
import {
  Assignment,
  Search,
  Add,
  DeleteOutline,
  EditOutlined,
  Refresh,
  CheckCircleOutline,
  HourglassEmpty,
  Schedule,
  Close,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { projectService } from "../../api/project.service";
import { showConfirmDialog, showSuccessToast, showErrorToast } from "../../utils/alerts";
import type { Project, ProjectFormData } from "../../types";

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({ activeRollouts: 0, onTrackCount: 0, pendingReviewsCount: 0 });
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    category: "RBAC Rollout",
    status: "In Progress",
    priority: "Medium",
    leadName: "",
    progressPercentage: 50,
    dueDate: "",
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectService.getProjects(selectedCategory, selectedStatus, searchTerm);
      setProjects(res.projects || []);
      setStats({
        activeRollouts: res.activeRollouts,
        onTrackCount: res.onTrackCount,
        pendingReviewsCount: res.pendingReviewsCount,
      });
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to load projects from database.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, searchTerm]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openCreateModal = () => {
    setEditingProject(null);
    setFormData({
      name: "",
      description: "",
      category: "RBAC Rollout",
      status: "In Progress",
      priority: "Medium",
      leadName: "",
      progressPercentage: 25,
      dueDate: "Dec 31, 2026",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      category: project.category,
      status: project.status,
      priority: project.priority,
      leadName: project.leadName,
      progressPercentage: project.progressPercentage,
      dueDate: project.dueDate,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) {
      showErrorToast("Project name and description are required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingProject) {
        await projectService.updateProject(editingProject.id, formData);
        showSuccessToast("Project updated successfully!");
      } else {
        await projectService.createProject(formData);
        showSuccessToast("Project created and saved successfully!");
      }
      setIsModalOpen(false);
      fetchProjects();
    } catch (err: any) {
      showErrorToast(err?.message || "Failed to save project.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await showConfirmDialog(
      "Delete Project?",
      "Are you sure you want to remove this initiative?",
      "Delete",
      "Cancel",
      true
    );
    if (res.isConfirmed) {
      try {
        await projectService.deleteProject(id);
        showSuccessToast("Project deleted from database.");
        fetchProjects();
      } catch (err: any) {
        showErrorToast(err?.message || "Failed to delete project.");
      }
    }
  };

  const categories = ["ALL", "RBAC Rollout", "DevOps", "Security", "Finance", "Governance"];

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">Critical</span>;
      case "high":
        return <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">High</span>;
      case "medium":
        return <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Medium</span>;
      default:
        return <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">Completed</span>;
      case "review":
        return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">In Review</span>;
      case "planning":
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">Planning</span>;
      default:
        return <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">In Progress</span>;
    }
  };

  return (
    <WorkspaceLayout permission="projects.view" label="Projects" icon="◇" showHero={false}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchProjects()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Refresh sx={{ fontSize: 16, color: "#64748b" }} className={loading ? "animate-spin text-blue-600" : ""} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Add sx={{ fontSize: 16 }} />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Card 1: Active Rollouts */}
          <div className="relative overflow-hidden rounded-2xl border border-indigo-200/70 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-500/10 via-white to-white dark:from-indigo-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Active Rollouts</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.activeRollouts}</span>
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">in progress</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Across departments</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-500 text-white shadow-md shadow-indigo-500/25">
                <Assignment sx={{ fontSize: 24 }} />
              </div>
            </div>
          </div>

          {/* Card 2: On Track */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-500/10 via-white to-white dark:from-emerald-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">On Track</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.onTrackCount}</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">&gt;= 50% done</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Meeting target milestones</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                <CheckCircleOutline sx={{ fontSize: 24 }} />
              </div>
            </div>
          </div>

          {/* Card 3: Pending Reviews */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-900/60 bg-gradient-to-br from-amber-500/10 via-white to-white dark:from-amber-500/15 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xs transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Pending Reviews</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{stats.pendingReviewsCount}</span>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">due cycle</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Awaiting stakeholder review</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/25">
                <HourglassEmpty sx={{ fontSize: 24 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${selectedCategory === cat
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search sx={{ fontSize: 18 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search initiatives & leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.length > 0 ? (
            projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                        {project.category}
                      </span>
                      {getPriorityBadge(project.priority)}
                    </div>
                    {getStatusBadge(project.status)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-3">{project.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{project.description}</p>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-slate-900">{project.progressPercentage}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${project.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-700">Lead: {project.leadName}</span>
                    <span className="text-slate-400 font-medium inline-flex items-center gap-1">
                      <Schedule sx={{ fontSize: 13 }} />
                      <span>{project.dueDate}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(project)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                      title="Edit Project"
                    >
                      <EditOutlined sx={{ fontSize: 18 }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(project.id)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      title="Delete Project"
                    >
                      <DeleteOutline sx={{ fontSize: 18 }} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-xs text-slate-400">
              {loading ? "Loading projects from database..." : "No project rollouts found."}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingProject ? "Edit Project Initiative" : "Create New Project Initiative"}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engineering Role Segmentation"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="RBAC Rollout">RBAC Rollout</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Security">Security</option>
                    <option value="Finance">Finance</option>
                    <option value="Governance">Governance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project Lead</label>
                  <input
                    type="text"
                    placeholder="e.g. Arun Kumar"
                    value={formData.leadName}
                    onChange={(e) => setFormData({ ...formData, leadName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">In Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Due Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Dec 15, 2026"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Progress ({formData.progressPercentage}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={formData.progressPercentage}
                    onChange={(e) => setFormData({ ...formData, progressPercentage: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Scope *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the rollout milestone, requirements, and scope..."
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
                  {submitting ? "Saving..." : editingProject ? "Update Project" : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
};

export default ProjectsPage;
