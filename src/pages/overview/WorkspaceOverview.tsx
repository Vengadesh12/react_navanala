import React, { useState } from "react";
import {
  History,
  Settings,
  Assessment,
  Assignment,
  CalendarMonth,
} from "@mui/icons-material";
import { SearchInput } from "../../components/common/SearchInput";

export type WorkspaceOverviewType = "reports" | "projects" | "calendar" | "settings" | "audit";

interface OverviewMetric {
  label: string;
  value: string;
  note: string;
  icon: string;
}

interface OverviewItem {
  title: string;
  detail: string;
  time: string;
  tag: string;
}

interface OverviewSectionData {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  metrics: OverviewMetric[];
  section: string;
  items: OverviewItem[];
}

const pageContent: Record<WorkspaceOverviewType, OverviewSectionData> = {
  reports: {
    eyebrow: "INSIGHTS & AUDIT LOGS",
    title: "Access Analytics & Compliance",
    description: "Export access certifications, role distribution metrics, and security audits.",
    icon: <Assessment sx={{ fontSize: 24 }} />,
    metrics: [
      { label: "Reports Generated", value: "18", note: "+4 this month", icon: "indigo" },
      { label: "Exports Ready", value: "06", note: "CSV & JSON", icon: "emerald" },
      { label: "Role Coverage", value: "100%", note: "Across workspace members", icon: "purple" },
    ],
    section: "Available Compliance Reports",
    items: [
      { title: "User Directory & Role Mapping", detail: "Complete breakdown of members and active role tiers", time: "Updated today", tag: "PDF / CSV" },
      { title: "Permission Matrix Audit", detail: "Historical log of permission grants and revocations", time: "Updated recently", tag: "JSON" },
      { title: "Privileged Access Log", detail: "Super Admin action tracking and policy events", time: "Active", tag: "CSV" },
    ],
  },
  projects: {
    eyebrow: "ORGANIZATION INITIATIVES",
    title: "RBAC Deployment & Projects",
    description: "Track migration to least-privilege roles across workspace business units.",
    icon: <Assignment sx={{ fontSize: 24 }} />,
    metrics: [
      { label: "Active Rollouts", value: "04", note: "Across departments", icon: "indigo" },
      { label: "On Track", value: "03", note: "75% completion", icon: "emerald" },
      { label: "Pending Reviews", value: "01", note: "Due this week", icon: "amber" },
    ],
    section: "Active Role Initiatives",
    items: [
      { title: "Engineering Role Segmentation", detail: "Lead Developer role configuration & matrix assignment", time: "On Track", tag: "DevOps" },
      { title: "Finance Access Cleanup", detail: "Revoking legacy administrative roles and adjusting scope", time: "Review Due", tag: "Finance" },
      { title: "Quarterly Access Certification", detail: "Auditing all active directory member permissions", time: "On Track", tag: "Security" },
    ],
  },
  calendar: {
    eyebrow: "ACCESS TIMELINE",
    title: "Security Reviews & Milestones",
    description: "Scheduled access certifications, quarterly audits, and role evaluations.",
    icon: <CalendarMonth sx={{ fontSize: 24 }} />,
    metrics: [
      { label: "Upcoming Reviews", value: "05", note: "This quarter", icon: "indigo" },
      { label: "Team Availability", value: "92%", note: "Ready for certification", icon: "emerald" },
      { label: "Due This Week", value: "02", note: "Before Friday", icon: "amber" },
    ],
    section: "Scheduled Governance Events",
    items: [
      { title: "Quarterly Role Audit", detail: "All Managers & Super Admins · 10:00 AM", time: "Tomorrow", tag: "Review" },
      { title: "New Manager Onboarding", detail: "Access team · 02:30 PM", time: "Next week", tag: "Training" },
      { title: "Policy Sync Meeting", detail: "Security Council · 09:00 AM", time: "Upcoming", tag: "Policy" },
    ],
  },
  settings: {
    eyebrow: "SYSTEM CONFIGURATION",
    title: "Workspace Preferences & Security",
    description: "Manage default role assignments, password policies, and security alerts.",
    icon: <Settings sx={{ fontSize: 24 }} />,
    metrics: [
      { label: "Security Level", value: "High", note: "JWT Enforced", icon: "emerald" },
      { label: "Alert Channels", value: "03", note: "Email, Webhook, SMS", icon: "indigo" },
      { label: "Session Timeout", value: "24h", note: "Auto-refresh enabled", icon: "purple" },
    ],
    section: "Configuration Sections",
    items: [
      { title: "Default Role for New Members", detail: "Automatically assign Member on signup", time: "Configured", tag: "RBAC" },
      { title: "Security Alerts & Notifications", detail: "Receive email alerts on Super Admin role modifications", time: "Active", tag: "Alerts" },
      { title: "REST API & CORS Policies", detail: "Configured for local & production API endpoints", time: "Connected", tag: "API" },
    ],
  },
  audit: {
    eyebrow: "IMMUTABLE AUDIT TRAIL",
    title: "Security & Role Activity Logs",
    description: "Comprehensive record of sign-ins, permission grants, and role modifications.",
    icon: <History sx={{ fontSize: 24 }} />,
    metrics: [
      { label: "Events This Week", value: "142", note: "+18% activity", icon: "indigo" },
      { label: "Successful Logins", value: "128", note: "98.8% success rate", icon: "emerald" },
      { label: "Privilege Changes", value: "03", note: "All verified", icon: "purple" },
    ],
    section: "Chronological Activity Feed",
    items: [
      { title: "Permission Matrix modified", detail: "Capabilities updated in the Permission Matrix", time: "12 min ago", tag: "Permissions" },
      { title: "Member record updated", detail: "Directory profile edited by Workspace Manager", time: "1 hour ago", tag: "Directory" },
      { title: "New Role created: Compliance Officer", detail: "Created with view-only permissions for Audit & Reports", time: "Yesterday", tag: "Roles" },
      { title: "User signed in successfully", detail: "Admin authenticated via secure JWT token", time: "Yesterday", tag: "Auth" },
    ],
  },
};

export interface WorkspaceOverviewProps {
  type: WorkspaceOverviewType;
}

export const WorkspaceOverview: React.FC<WorkspaceOverviewProps> = ({ type }) => {
  const content = pageContent[type] || pageContent.reports;
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = content.items.filter(
    (item) =>
      !searchTerm ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.detail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Metrics Row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {content.metrics.map((m, idx) => (
          <div
            className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            key={idx}
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              {content.icon}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {m.label}
              </div>
              <div className="text-2xl font-bold text-slate-900">{m.value}</div>
              <div className="text-[11px] font-semibold text-emerald-600">{m.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Items List with Search */}
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  {content.eyebrow}
                </p>
                <h3 className="text-base font-bold text-slate-900">{content.section}</h3>
              </div>

              <SearchInput
                className="min-w-[220px]"
                placeholder="Filter records..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>

            <div className="divide-y divide-slate-100">
              {filteredItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">
                      {idx + 1}
                    </div>
                    <div>
                      <strong className="block text-xs font-bold text-slate-900">
                        {item.title}
                      </strong>
                      <p className="text-[11px] text-slate-500">{item.detail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                      {item.tag}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Summary Card */}
        <div>
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white shadow-xl shadow-indigo-950/20">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-500/20 text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
              {content.icon}
            </div>

            <span className="mt-6 block text-[10px] font-bold uppercase tracking-wider text-indigo-400">
              Workspace Overview
            </span>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-white leading-snug">
              {content.title}
            </h3>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              {content.description}
            </p>

            <div className="mt-8 border-t border-slate-800 pt-5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>System Security</span>
                <span className="font-semibold text-emerald-400">Protected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceOverview;
