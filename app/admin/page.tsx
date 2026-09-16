"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGuard from "@/lib/admin/admin-guard";
import { adminFetch } from "@/lib/admin/api";
import {
  Shield, Users, Activity, BarChart3, Search, Ban, CheckCircle,
  RefreshCw, Settings, Menu, X, DollarSign, Zap, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock, AlertTriangle, CreditCard,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/activities", label: "Activity", icon: Activity },
  { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

type AdminStats = {
  total_users: number;
  active_today: number;
  total_searches_today: number;
  total_searches_month: number;
  total_revenue: number;
  revenue_usd: number;
  revenue_ngn: number;
  total_paid_users: number;
  suspended_count: number;
  blocked_count: number;
  active_subscriptions: number;
  usd_subscriptions: number;
  ngn_subscriptions: number;
  today_cost: number;
  month_cost: number;
  avg_cost_per_search: number;
  daily_searches: Record<string, number>;
  plan_distribution: Record<string, number>;
  subscription_breakdown: Record<string, number>;
  recent_activity: {
    id: string;
    email: string;
    action: string;
    details: any;
    timestamp: string;
  }[];
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
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const formatCurrency = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNaira = (n: number) => `₦${n.toLocaleString()}`;

  // ── Stat cards ────────────────────────────────────────────
  const cards = [
    { label: "Total Users", value: stats?.total_users ?? "—", sub: `${stats?.total_paid_users ?? 0} paid`, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Active Today", value: stats?.active_today ?? "—", sub: `${stats?.total_searches_today ?? 0} searches`, icon: Activity, color: "text-green-600", bg: "bg-green-100" },
    { label: "Revenue", value: stats?.total_revenue != null ? formatCurrency(stats.total_revenue) : "—", sub: stats?.revenue_ngn ? formatNaira(stats.revenue_ngn) : "", icon: DollarSign, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Active Subscriptions", value: stats?.active_subscriptions ?? "—", sub: `${stats?.usd_subscriptions ?? 0} USD · ${stats?.ngn_subscriptions ?? 0} NGN`, icon: CreditCard, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Searches (30d)", value: stats?.total_searches_month ?? "—", sub: `$${(stats?.month_cost ?? 0).toFixed(2)} cost`, icon: Search, color: "text-indigo-600", bg: "bg-indigo-100" },
    { label: "Cost Today", value: formatCurrency(stats?.today_cost ?? 0), sub: `@ $${stats?.avg_cost_per_search?.toFixed(3) ?? "—"}/search`, icon: Zap, color: "text-red-600", bg: "bg-red-100" },
  ];

  // ── Daily search chart (last 7 days) ─────────────────────
  const dailyData = stats?.daily_searches ?? {};
  const dayLabels = Object.keys(dailyData).slice(-7);
  const dayValues = dayLabels.map(d => dailyData[d]);
  const maxVal = Math.max(...(dayValues.length ? dayValues : [1]));

  return (
    <AdminGuard>
      <div className="min-h-screen bg-white text-gray-900">
        {/* Mobile header */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 md:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-base font-semibold">Admin</span>
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-gray-100">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          {menuOpen && (
            <nav className="px-4 pb-4 space-y-1 border-t border-gray-100 pt-3">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    pathname === item.href ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}>
                  <item.icon className="w-4 h-4" /> {item.label}
                </Link>
              ))}
            </nav>
          )}
        </header>

        <div className="flex">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex flex-col w-64 min-h-screen border-r border-gray-100 bg-gray-50/50">
            <div className="p-6 border-b border-gray-100">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-semibold">Admin</span>
              </Link>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    pathname === item.href ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}>
                  <item.icon className="w-4 h-4" /> {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <Link href="/" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-xl">&larr; Back to app</Link>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
                  <p className="text-sm text-gray-500 mt-1">Live system metrics and activity</p>
                </div>
                <button onClick={fetchStats} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Skeleton */}
              {loading && !stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-100 p-6 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-xl mb-4" />
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                      <div className="h-7 bg-gray-200 rounded w-16" />
                    </div>
                  ))}
                </div>
              )}

              {stats && (
                <>
                  {/* Stat cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
                    {cards.map((card) => (
                      <div key={card.label} className="rounded-2xl border border-gray-100 p-6 hover:border-gray-300 transition-colors">
                        <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-4`}>
                          <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                        <p className="text-2xl sm:text-3xl font-bold tracking-tight">{card.value}</p>
                        {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Two-column layout: Chart + Plan Dist */}
                  <div className="grid lg:grid-cols-2 gap-6 mb-8">
                    {/* Daily Searches Chart */}
                    <div className="rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Searches (7 Days)</h2>
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                      </div>
                      {dayLabels.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No search data yet</p>
                      ) : (
                        <div className="flex items-end gap-2 h-32">
                          {dayLabels.map((day, i) => (
                            <div key={day} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-xs font-semibold text-gray-700">{dayValues[i]}</span>
                              <div
                                className="w-full bg-blue-500 rounded-t-md transition-all"
                                style={{ height: `${(dayValues[i] / maxVal) * 100}%`, minHeight: dayValues[i] > 0 ? '4px' : '0' }}
                              />
                              <span className="text-[10px] text-gray-400">{day.slice(5)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Plan Distribution */}
                    <div className="rounded-2xl border border-gray-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Plan Distribution</h2>
                        <Users className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="space-y-3">
                        {Object.entries(stats.plan_distribution ?? {}).map(([plan, count]) => {
                          const total = stats.total_users || 1;
                          const pct = Math.round((count / total) * 100);
                          const emoji = plan === "free" ? "🆓" : plan === "basic" ? "🚀" : plan === "pro" ? "⚡" : plan === "premium" ? "🔥" : "📋";
                          return (
                            <div key={plan}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="font-medium capitalize">{emoji} {plan}</span>
                                <span className="text-gray-500">{count} ({pct}%)</span>
                              </div>
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${
                                  plan === "free" ? "bg-gray-400" :
                                  plan === "basic" ? "bg-amber-500" :
                                  plan === "pro" ? "bg-purple-500" :
                                  "bg-pink-500"
                                }`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity Feed */}
                  <div className="rounded-2xl border border-gray-100 p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Recent Activity</h2>
                      <Link href="/admin/activities" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all →</Link>
                    </div>
                    {stats.recent_activity.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">No recent activity</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.recent_activity.slice(0, 10).map((a) => (
                          <div key={a.id} className="flex items-start gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              a.action === "search" ? "bg-blue-100 text-blue-600" :
                              a.action === "sign_in" ? "bg-green-100 text-green-600" :
                              a.action === "subscribe" ? "bg-amber-100 text-amber-600" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {a.action === "search" ? <Search className="w-4 h-4" /> :
                               a.action === "sign_in" ? <ArrowUpRight className="w-4 h-4" /> :
                               a.action === "subscribe" ? <CreditCard className="w-4 h-4" /> :
                               <Activity className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{a.email || "Anonymous"}</p>
                              <p className="text-xs text-gray-500 capitalize">{a.action.replace(/_/g, " ")}</p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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