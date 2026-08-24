import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  People,
  Key,
  Security,
  Add,
  CheckCircle,
  TrendingUp,
  History,
  Lock,
  EventNote,
} from "@mui/icons-material";
import { WorkspaceLayout } from "../../components/layout/WorkspaceLayout";
import { MetricCard } from "../../components/common/MetricCard";
import { userService } from "../../api/user.service";
import { roleService } from "../../api/role.service";
import { useAuth } from "../../hooks/useAuth";
import type { Role, User } from "../../types";

interface DashboardStats {
  usersCount: number;
  rolesCount: number;
  activeRoles: Role[];
  loading: boolean;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("Active tasks");
  const [stats, setStats] = useState<DashboardStats>({
    usersCount: 0,
    rolesCount: 0,
    activeRoles: [],
    loading: true,
  });

  useEffect(() => {
    Promise.all([
      userService.getUsers().catch(() => [] as User[]),
      roleService.getRoles().catch(() => [] as Role[]),
    ]).then(([users, roles]) => {
      setStats({
        usersCount: Array.isArray(users) ? users.length : 0,
        rolesCount: Array.isArray(roles) ? roles.length : 0,
        activeRoles: Array.isArray(roles) ? roles : [],
        loading: false,
      });
    });
  }, []);

  const tasks = [
    {
      id: "T1",
      title: "Quarterly Access Certification",
      desc: "Verify active permissions and roles for all workspace accounts",
      status: "In Progress",
      tag: "Security Review",
      color: "bg-indigo-500",
      due: "Due in 2 days",
    },
    {
      id: "T2",
      title: "Super Admin MFA Policy Enforcement",
      desc: "Ensure multi-factor authentication is configured for privileged roles",
      status: "Scheduled",
      tag: "Compliance",
      color: "bg-purple-500",
      due: "Due this Friday",
    },
    {
      id: "T3",
      title: "New Role Definition: Compliance Officer",
      desc: "Assign audit logs view & report export permissions",
      status: "Pending",
      tag: "Role Setup",
      color: "bg-teal-500",
      due: "Next week",
    },
  ];

  const recentEvents = [
    {
      title: "Role permissions updated",
      desc: "Manager role granted access to Audit and Reports modules",
      time: "15m ago",
      actor: "Super Admin",
      icon: <Key sx={{ fontSize: 16 }} />,
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "New member account created",
      desc: "Maya Patel assigned to Editor access tier",
      time: "1h ago",
      actor: "Admin",
      icon: <People sx={{ fontSize: 16 }} />,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Security credential verified",
      desc: "JWT session authenticated via REST API",
      time: "2h ago",
      actor: "System",
      icon: <Security sx={{ fontSize: 16 }} />,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <WorkspaceLayout permission="dashboard.view" label="Dashboard" icon="◫" showHero={false}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-lg shadow-indigo-950/20 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-500/20 px-3 py-0.5 text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
                Console Dashboard
              </span>
              <span className="text-xs text-slate-400">Enterprise Edition</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, {user?.name || "Administrator"}!
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Here is an executive summary of your workspace roles, members, and access governance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/add-user"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-indigo-500"
            >
              <Add sx={{ fontSize: 18 }} />
              <span>Add User</span>
            </Link>
            <Link
              to="/permissions"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-700"
            >
              <Key sx={{ fontSize: 18 }} />
              <span>Permission Matrix</span>
            </Link>
          </div>
        </div>

        {/* Executive KPI Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Directory Members"
            value={stats.loading ? "..." : stats.usersCount}
            note="Active accounts"
            icon={<People sx={{ fontSize: 24 }} />}
            iconBgColor="bg-indigo-50 text-indigo-600"
          />

          <MetricCard
            label="Configured Roles"
            value={stats.loading ? "..." : stats.rolesCount}
            note="Defined access tiers"
            icon={<Shield sx={{ fontSize: 24 }} />}
            iconBgColor="bg-purple-50 text-purple-600"
          />

          <MetricCard
            label="System Security"
            value="100%"
            note="RBAC Enforcement Active"
            icon={<CheckCircle sx={{ fontSize: 24 }} />}
            iconBgColor="bg-emerald-50 text-emerald-600"
          />

          <MetricCard
            label="JWT Token Auth"
            value="Secure"
            note="Bearer validation"
            icon={<Lock sx={{ fontSize: 24 }} />}
            iconBgColor="bg-amber-50 text-amber-600"
          />
        </div>

        {/* Main 2-Column Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left 2 Cols: Access Governance Tasks */}
          <div className="space-y-6 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <EventNote sx={{ fontSize: 20, color: "#6366f1" }} />
                  <h3 className="font-bold text-slate-900 text-sm">Access Governance Tasks</h3>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {["Active tasks", "Completed", "Archived"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-lg px-3 py-1 font-semibold transition-all cursor-pointer ${
                        activeTab === tab
                          ? "bg-indigo-50 text-indigo-600"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between p-5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`mt-0.5 h-3 w-3 rounded-full ${task.color} ring-4 ring-slate-100`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-sm font-semibold text-slate-900">{task.title}</strong>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {task.tag}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{task.desc}</p>
                        <span className="mt-2 inline-block text-[11px] font-medium text-slate-400">
                          {task.due}
                        </span>
                      </div>
                    </div>

                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Access Matrix Links */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Quick Navigation</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Link
                  to="/add-user"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition-all hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                    <People sx={{ fontSize: 20 }} />
                  </div>
                  <div>
                    <strong className="block text-xs font-bold text-slate-800">User Directory</strong>
                    <span className="text-[11px] text-slate-400">Manage members</span>
                  </div>
                </Link>

                <Link
                  to="/roles"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition-all hover:border-purple-300 hover:bg-purple-50/50"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-purple-50 text-purple-600">
                    <Shield sx={{ fontSize: 20 }} />
                  </div>
                  <div>
                    <strong className="block text-xs font-bold text-slate-800">Roles Hub</strong>
                    <span className="text-[11px] text-slate-400">Manage access tiers</span>
                  </div>
                </Link>

                <Link
                  to="/permissions"
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition-all hover:border-emerald-300 hover:bg-emerald-50/50"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Key sx={{ fontSize: 20 }} />
                  </div>
                  <div>
                    <strong className="block text-xs font-bold text-slate-800">Permissions</strong>
                    <span className="text-[11px] text-slate-400">Toggle capabilities</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Live Security & Activity Feed */}
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History sx={{ fontSize: 20, color: "#6366f1" }} />
                  <h3 className="font-bold text-slate-900 text-sm">Security & Audit Feed</h3>
                </div>
                <Link to="/audit" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  View full log
                </Link>
              </div>

              <div className="relative border-l border-slate-200 pl-4 space-y-5 ml-2">
                {recentEvents.map((evt, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[23px] top-1 grid h-5 w-5 place-items-center rounded-full bg-white border border-slate-200 text-indigo-600 shadow-xs">
                      <div className="h-2 w-2 rounded-full bg-indigo-600" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400">{evt.time}</span>
                      <strong className="block text-xs font-bold text-slate-800">{evt.title}</strong>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{evt.desc}</p>
                      <span className="mt-1 inline-block text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        By {evt.actor}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Session Badge Card */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 font-bold text-white shadow-sm">
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong className="block text-sm font-bold text-slate-900">
                    {user?.name || "Super Admin"}
                  </strong>
                  <span className="text-xs text-slate-500">{user?.email || "admin@example.com"}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-indigo-100 pt-3 text-xs">
                <span className="text-slate-500">Security Tier:</span>
                <span className="font-bold text-indigo-700">Role ID #{user?.roleId || 2}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  );
};

export default DashboardPage;
