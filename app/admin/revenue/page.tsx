"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminGuard from "@/lib/admin/admin-guard";
import { adminFetch } from "@/lib/admin/api";
import {
  Shield, Users, Activity, BarChart3, DollarSign, CreditCard, RefreshCw, Menu, X,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/activities", label: "Activity", icon: Activity },
  { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
];

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

type RevenueData = {
  total_revenue: number;
  total_subscribers: number;
  basic_count: number;
  agency_count: number;
  recent_payments: {
    email: string;
    plan: string;
    amount: number;
    date: string;
    reference: string;
  }[];
};

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const fetchRevenue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/revenue");
      setData(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRevenue(); }, []);

  const formatAmount = (amount: number) => `$${amount.toFixed(2)}`;

  const statCards = [
    {
      label: "Total Revenue",
      value: data ? formatAmount(data.total_revenue) : "—",
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Subscriptions",
      value: data?.total_subscribers ?? "—",
      icon: CreditCard,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Basic Plans",
      value: data?.basic_count ?? "—",
      icon: Users,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Agency Plans",
      value: data?.agency_count ?? "—",
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-900/30",
    },
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
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Revenue</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Payment tracking and subscription overview</p>
                </div>
                <button onClick={fetchRevenue} disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </button>
              </div>

              {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-xl"><p className="text-sm text-red-600 dark:text-red-400">{error}</p></div>}

              {/* Skeleton loader */}
              {loading && !data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl mb-4" />
                      <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 mb-2" />
                      <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-16" />
                    </div>
                  ))}
                </div>
              )}

              {/* Stats cards */}
              {data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                  {statCards.map((card) => (
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

              {/* Recent payments table */}
              {data && data.recent_payments.length > 0 && (
                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                    <h2 className="text-lg font-semibold">Recent Payments</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Most recent subscriptions first</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Email</th>
                          <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Plan</th>
                          <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                          <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                          <th className="text-left px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recent_payments.map((pmt) => (
                          <tr key={pmt.reference} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                            <td className="px-6 py-3 font-medium">{pmt.email}</td>
                            <td className="px-6 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                pmt.plan === 'agency'
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              }`}>
                                {pmt.plan}
                              </span>
                            </td>
                            <td className="px-6 py-3 font-mono">{formatAmount(pmt.amount)}</td>
                            <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                              {new Date(pmt.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="px-6 py-3 text-xs text-gray-400 dark:text-gray-500 font-mono truncate max-w-[120px]">
                              {pmt.reference.slice(0, 8)}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {data && data.recent_payments.length === 0 && (
                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
                  <DollarSign className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
                  <h3 className="text-lg font-semibold mb-1">No payments yet</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No paid subscriptions have been recorded.</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}