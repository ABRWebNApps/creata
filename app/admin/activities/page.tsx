"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AdminGuard from "@/lib/admin/admin-guard";
import { adminFetch } from "@/lib/admin/api";
import {
  Shield,
  Users,
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";

type ActivityLog = {
  id: string;
  timestamp: string;
  email: string;
  action: string;
  details: Record<string, unknown> | null;
  ip: string;
};

const ACTION_TYPES = [
  "",
  "search",
  "sign_in",
  "sign_up",
  "lead_save",
  "lead_export",
  "plan_change",
  "admin_action",
] as const;

const PAGE_SIZE = 25;

export default function AdminActivitiesPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [refreshInterval, setRefreshInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("limit", String(PAGE_SIZE));
      if (actionFilter) params.set("action", actionFilter);
      if (emailFilter.trim()) params.set("email", emailFilter.trim());

      const data = await adminFetch(`/api/admin/activities?${params.toString()}`);
      setLogs(data.logs ?? data.activities ?? data.data ?? []);
      setTotalPages(data.totalPages ?? data.total_pages ?? (Math.ceil((data.total ?? 0) / PAGE_SIZE) || 1));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, emailFilter]);

  // Fetch when filters or page change
  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLogs(page);
    }, 30000);
    setRefreshInterval(interval);
    return () => clearInterval(interval);
  }, [page, fetchLogs]);

  const goToPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  const handleFilterChange = () => {
    setPage(1);
  };

  const sidebarLinks = [
    { href: "/admin", label: "Dashboard", icon: BarChart3 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/activities", label: "Activity", icon: Activity },
  ];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {/* Mobile top nav */}
        <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 md:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-black dark:bg-white rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
                <Shield className="w-3.5 h-3.5 text-white dark:text-black" />
              </div>
              <span className="text-base font-semibold tracking-tight">Admin</span>
            </Link>
            <nav className="flex items-center gap-1">
              {sidebarLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    item.href === "/admin/activities"
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="flex">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex flex-col w-64 min-h-screen border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center transition-transform group-hover:scale-105">
                  <Shield className="w-4 h-4 text-white dark:text-black" />
                </div>
                <span className="text-lg font-semibold tracking-tight">Admin</span>
              </Link>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {sidebarLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    item.href === "/admin/activities"
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors rounded-xl"
              >
                <span>&larr;</span> Back to app
              </Link>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Activity Logs
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Monitor system activity — auto-refreshes every 30s
                  </p>
                </div>
                <button
                  onClick={() => fetchLogs(page)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 self-start"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={emailFilter}
                    onChange={(e) => { setEmailFilter(e.target.value); handleFilterChange(); }}
                    placeholder="Filter by email..."
                    className="w-full pl-11 pr-4 py-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
                  />
                </div>
                <select
                  value={actionFilter}
                  onChange={(e) => { setActionFilter(e.target.value); handleFilterChange(); }}
                  className="px-4 py-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">All actions</option>
                  {ACTION_TYPES.filter(Boolean).map((action) => (
                    <option key={action} value={action}>
                      {action.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-xl">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-14 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
                  ))}
                </div>
              )}

              {/* Table */}
              {!loading && (
                <>
                  <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            Email
                          </th>
                          <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            Action
                          </th>
                          <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            Details
                          </th>
                          <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                            IP
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {logs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-5 py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                            >
                              No activity logs found.
                            </td>
                          </tr>
                        ) : (
                          logs.map((log) => (
                            <tr
                              key={log.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                            >
                              <td className="px-5 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs font-mono">
                                {log.timestamp
                                  ? new Date(log.timestamp).toLocaleString()
                                  : "—"}
                              </td>
                              <td className="px-5 py-4 font-medium">{log.email}</td>
                              <td className="px-5 py-4">
                                <span className="inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                                  {log.action.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="px-5 py-4 max-w-xs">
                                {log.details ? (
                                  <pre className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-2 overflow-x-auto max-h-24">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-xs font-mono text-gray-500 dark:text-gray-400">
                                {log.ip || "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => goToPage(page - 1)}
                        disabled={page <= 1}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <button
                        onClick={() => goToPage(page + 1)}
                        disabled={page >= totalPages}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}