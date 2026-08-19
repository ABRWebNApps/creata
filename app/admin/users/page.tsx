"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AdminGuard from "@/lib/admin/admin-guard";
import { adminFetch } from "@/lib/admin/api";
import {
  Shield,
  Users,
  Activity,
  BarChart3,
  Settings,
  Search,
  Ban,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";

type User = {
  id: string;
  email: string;
  plan: string;
  credits: number;
  search_count: number;
  status: "active" | "suspended" | "blocked";
  isAdmin: boolean;
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
  free: "🆓 free",
  basic: "🚀 basic",
  agency: "🔥 agency",
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/activities", label: "Activity", icon: Activity },
  { href: "/admin/revenue", label: "Revenue", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminUsersPage() {
  const pathname = usePathname();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/users");
      const list: User[] = res.users ?? res ?? [];
      setUsers(list);
      setFiltered(list);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Filter locally as user types
  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(users);
    } else {
      setFiltered(
        users.filter((u) => u.email.toLowerCase().includes(q))
      );
    }
  }, [search, users]);

  const updateStatus = async (userId: string, newStatus: string) => {
    setActionLoading(userId);
    try {
      await adminFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, status: newStatus }),
      });
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const isActive = (href: string) => pathname === href;

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
          {/* Mobile dropdown */}
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
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Users</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage user accounts and permissions
                  </p>
                </div>
                <button
                  onClick={fetchUsers}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 self-start"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by email..."
                  className="w-full pl-11 pr-4 py-3 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              )}

              {/* Users table */}
              {!loading && (
                <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                          Email
                        </th>
                        <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                          Plan
                        </th>
                        <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                          Credits
                        </th>
                        <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                          Searches
                        </th>
                        <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                          Status
                        </th>
                        <th className="text-left px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                          Admin?
                        </th>
                        <th className="text-right px-5 py-3.5 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filtered.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-5 py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                          >
                            {search
                              ? "No users match your search."
                              : "No users found."}
                          </td>
                        </tr>
                      ) : (
                        filtered.map((user) => {
                          const statusBadge = STATUS_BADGE[user.status] ?? STATUS_BADGE.active;
                          const planDisplay = PLAN_EMOJI[user.plan] ?? user.plan;
                          return (
                            <tr
                              key={user.id}
                              onClick={() => router.push(`/admin/users/${user.id}`)}
                              className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                            >
                              <td className="px-5 py-4 font-medium">{user.email}</td>
                              <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                                {planDisplay}
                              </td>
                              <td className="px-5 py-4">{user.credits}</td>
                              <td className="px-5 py-4">{user.search_count}</td>
                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusBadge.classes}`}
                                >
                                  {user.status === "blocked" ? (
                                    <Ban className="w-3 h-3" />
                                  ) : user.status === "suspended" ? (
                                    <AlertTriangle className="w-3 h-3" />
                                  ) : (
                                    <CheckCircle className="w-3 h-3" />
                                  )}
                                  {statusBadge.label}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                {user.isAdmin ? (
                                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                    Yes
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">No</span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {user.status !== "active" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateStatus(user.id, "active");
                                      }}
                                      disabled={actionLoading === user.id}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      Activate
                                    </button>
                                  )}
                                  {user.status !== "suspended" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateStatus(user.id, "suspended");
                                      }}
                                      disabled={actionLoading === user.id}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                      Suspend
                                    </button>
                                  )}
                                  {user.status !== "blocked" && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateStatus(user.id, "blocked");
                                      }}
                                      disabled={actionLoading === user.id}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                                    >
                                      <Ban className="w-3 h-3" />
                                      Block
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}