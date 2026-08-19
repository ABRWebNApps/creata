"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGuard from "@/lib/admin/admin-guard";
import { adminFetch } from "@/lib/admin/api";
import {
  Shield, Users, Activity, BarChart3, Search, Ban, CheckCircle, RefreshCw, Settings, Menu, X,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/activities", label: "Activity", icon: Activity },
  { href: "/admin/revenue", label: "Revenue", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

type AdminStats = {
  totalUsers: number;
  activeToday: number;
  searchesToday: number;
  revenue: number;
  suspendedCount: number;
  blockedCount: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch("/api/admin/stats");
      // Map snake_case from API to camelCase frontend expects
      setStats({
        totalUsers: data.total_users ?? 0,
        activeToday: data.active_today ?? 0,
        searchesToday: data.total_searches_today ?? 0,
        revenue: data.total_revenue ?? 0,
        suspendedCount: data.suspended_count ?? 0,
        blockedCount: data.blocked_count ?? 0,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const cards = [
    { label: "Total Users", value: stats?.totalUsers ?? "—", icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { label: "Active Today", value: stats?.activeToday ?? "—", icon: Activity, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
    { label: "Searches Today", value: stats?.searchesToday ?? "—", icon: Search, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
    { label: "Revenue", value: stats?.revenue != null ? `$${stats.revenue.toLocaleString()}` : "—", icon: BarChart3, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
    { label: "Suspended", value: stats?.suspendedCount ?? "—", icon: Ban, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
    { label: "Blocked", value: stats?.blockedCount ?? "—", icon: CheckCircle, color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800" },
  ];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {/* Mobile header with hamburger */}
        <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 md:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white dark:text-black" />
              </div>
              <span className="text-base font-semibold">Admin</span>
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          {/* Mobile dropdown nav */}
          {menuOpen && (
            <nav className="px-4 pb-4 space-y-1 border-t border-gray-100 dark:border-gray-800 pt-3">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    pathname === item.href ? "bg-black dark:bg-white text-white dark:text-black" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
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
                <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white dark:text-black" />
                </div>
                <span className="text-lg font-semibold">Admin</span>
              </Link>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    pathname === item.href ? "bg-black dark:bg-white text-white dark:text-black" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
              <Link href="/" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-xl">&larr; Back to app</Link>
            </div>
          </aside>

          <main className="flex-1">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Admin overview and system metrics</p>
                </div>
                <button onClick={fetchStats} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>

              {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-xl"><p className="text-sm text-red-600 dark:text-red-400">{error}</p></div>}

              {loading && !stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl mb-4" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 mb-2" />
                      <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-16" />
                    </div>
                  ))}
                </div>
              )}

              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
                  {cards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                      <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-4`}>
                        <card.icon className={`w-5 h-5 ${card.color}`} />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
                      <p className="text-2xl sm:text-3xl font-bold tracking-tight">{card.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}