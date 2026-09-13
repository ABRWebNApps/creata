"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminGuard from "@/lib/admin/admin-guard";
import { adminFetch } from "@/lib/admin/api";
import { PLAN_CONFIGS } from "@/lib/subscription-context";
import {
  Shield,
  Users,
  Activity,
  BarChart3,
  Settings,
  ChevronLeft,
  Ban,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Menu,
  X,
  Calendar,
  Clock,
  Zap as ZapIcon,
} from "lucide-react";

type User = {
  id: string;
  email: string;
  plan: string;
  credits: number;
  search_count: number;
  status: "active" | "suspended" | "blocked";
  isAdmin: boolean;
  created_at?: string;
  last_active?: string;
};

type ActivityLog = {
  id: string;
  timestamp: string;
  action: string;
  details: Record<string, unknown> | null;
  ip: string;
};

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  active: {
    label: "Active",
    classes:
      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  },
  suspended: {
    label: "Suspended",
    classes:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  },
  blocked: {
    label: "Blocked",
    classes: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  },
};

const PLAN_EMOJI: Record<string, string> = {
  free: "🆓",
  basic: "🚀",
  pro: "⚡",
  premium: "🔥",
};

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
  premium: "Premium",
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/activities", label: "Activity", icon: Activity },
  { href: "/admin/revenue", label: "Revenue", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creditInput, setCreditInput] = useState("");
  const [creditMessage, setCreditMessage] = useState("");
  const [creditSuccess, setCreditSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [usersRes, logsRes] = await Promise.all([
        adminFetch("/api/admin/users"),
        adminFetch(`/api/admin/activities?user_id=${userId}&limit=20`),
      ]);

      const usersList: User[] = usersRes.users ?? usersRes ?? [];
      const foundUser = usersList.find((u) => u.id === userId);
      if (!foundUser) {
        setError("User not found.");
      } else {
        setUser(foundUser);
      }

      setLogs(logsRes.logs ?? logsRes.activities ?? logsRes.data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateStatus = async (newStatus: string) => {
    if (!user) return;
    setActionLoading(true);
    try {
      await adminFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, status: newStatus }),
      });
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const setRips = async (amount: number, action: 'set' | 'add' | 'deduct') => {
    if (!user) return;
    setActionLoading(true);
    setCreditMessage("");
    try {
      const result = await adminFetch("/api/admin/rips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, rips: amount, action }),
      });
      setCreditInput("");
      setCreditSuccess(true);
      if (action === 'set') {
        setCreditMessage(`Rips set to ${result.rips ?? amount}`);
      } else {
        setCreditMessage(`Rips ${action === 'add' ? 'added' : 'deducted'}: ${result.previous} → ${result.new_rips}`);
      }
      await fetchData();
    } catch (err: any) {
      setCreditSuccess(false);
      setCreditMessage(err.message || "Failed to update rips");
    } finally {
      setActionLoading(false);
    }
  };

  const isActive = (href: string) => false; // never highlight in detail page

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
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
          {mobileOpen && (
            <nav className="px-4 pb-4 space-y-1 border-t border-gray-100 dark:border-gray-800 pt-2">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    isActive(item.href)
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          )}
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
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    isActive(item.href)
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
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
              {/* Back button */}
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-6"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Users
              </Link>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-6">
                  <div className="h-8 w-64 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
                  <div className="h-40 bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />
                  <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />
                </div>
              )}

              {/* User detail content */}
              {!loading && user && (
                <>
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-all">
                          {user.email}
                        </h1>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-0.5 text-xs font-semibold rounded-full ${
                            STATUS_BADGE[user.status]?.classes ??
                            STATUS_BADGE.active.classes
                          }`}
                        >
                          {user.status === "blocked" ? (
                            <Ban className="w-3 h-3" />
                          ) : user.status === "suspended" ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <CheckCircle className="w-3 h-3" />
                          )}
                          {STATUS_BADGE[user.status]?.label ?? "Active"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        User ID: {user.id}
                      </p>
                    </div>
                    <button
                      onClick={fetchData}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 self-start"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>

                  {/* Info cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {/* Plan */}
                    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-5 bg-gray-50/50 dark:bg-gray-900/30">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                        Plan
                      </p>
                      <p className="text-lg font-semibold">
                        <span className="mr-1.5">
                          {PLAN_EMOJI[user.plan] ?? "📋"}
                        </span>
                        <span className="capitalize">
                          {PLAN_LABEL[user.plan] ?? user.plan}
                        </span>
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {user.credits} credits remaining
                      </p>
                      {(() => {
                        const cfg = PLAN_CONFIGS[user.plan as keyof typeof PLAN_CONFIGS];
                        if (!cfg) return null;
                        return (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Max leads/search: <span className="font-semibold text-gray-700 dark:text-gray-300">{cfg.maxLeadsPerSearch}</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Enrichment: <span className={`font-semibold ${cfg.canEnrich ? "text-green-600" : "text-gray-400"}`}>{cfg.canEnrich ? "Yes" : "No"}</span>
                            </p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Status & Actions */}
                    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-5 bg-gray-50/50 dark:bg-gray-900/30">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                        Status Actions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {user.status !== "active" && (
                          <button
                            onClick={() => updateStatus("active")}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Activate
                          </button>
                        )}
                        {user.status !== "suspended" && (
                          <button
                            onClick={() => updateStatus("suspended")}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Suspend
                          </button>
                        )}
                        {user.status !== "blocked" && (
                          <button
                            onClick={() => updateStatus("blocked")}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Block
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-5 bg-gray-50/50 dark:bg-gray-900/30">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                        Dates
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-400">Joined:</span>
                          <span className="font-medium">
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-400">Last active:</span>
                          <span className="font-medium">
                            {user.last_active
                              ? new Date(user.last_active).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Credits Management */}
                  <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-5 bg-gray-50/50 dark:bg-gray-900/30 mb-8">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
                      <ZapIcon className="w-3.5 h-3.5 text-yellow-500" />
                      Credits Management
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current credits</p>
                        <p className="text-2xl font-bold">{user.credits ?? 0} credit{(user.credits ?? 0) !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Set credits to</label>
                        <input
                          type="number"
                          value={creditInput}
                          onChange={(e) => setCreditInput(e.target.value)}
                          placeholder="Enter amount"
                          min="0"
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setRips(Number(creditInput), 'set')}
                          disabled={!creditInput || actionLoading || creditInput === ""}
                          className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          Set Credits
                        </button>
                        <button
                          onClick={() => setRips(10, 'add')}
                          disabled={actionLoading}
                          className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          +10 Gift
                        </button>
                        <button
                          onClick={() => setRips(5, 'deduct')}
                          disabled={actionLoading}
                          className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          -5 Deduct
                        </button>
                      </div>
                    </div>
                    {creditMessage && (
                      <p className={`text-xs mt-2 ${creditSuccess ? "text-green-600" : "text-red-600"}`}>
                        {creditMessage}
                      </p>
                    )}
                  </div>

                  {/* Activity Logs */}
                  <div>
                    <h2 className="text-xl font-bold tracking-tight mb-4">
                      Recent Activity
                    </h2>
                    <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                            <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                              Timestamp
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
                                colSpan={4}
                                className="px-5 py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                              >
                                No recent activity found.
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