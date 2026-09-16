"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminGuard from "@/lib/admin/admin-guard";
import { adminFetch } from "@/lib/admin/api";
import { PLAN_CONFIGS } from "@/lib/subscription-context";
import {
  Shield, Users, Activity, BarChart3, Settings,
  ChevronLeft, Ban, CheckCircle, AlertTriangle,
  RefreshCw, Menu, X, Calendar, Clock, Zap, DollarSign,
  CreditCard, Wallet, Download,
} from "lucide-react";

type UserDetail = {
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

type Payment = {
  id: string;
  plan: string;
  currency: string;
  amount: number;
  status: string;
  paystack_reference: string;
  created_at: string;
};

type Subscription = {
  id: string;
  plan: string;
  currency: string;
  status: string;
  current_period_end: string;
  paystack_subscription_code: string | null;
  next_due_date: string | null;
};

const NAV = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/activities", label: "Activity", icon: Activity },
  { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  active: { label: "Active", classes: "bg-green-100 text-green-700" },
  suspended: { label: "Suspended", classes: "bg-amber-100 text-amber-700" },
  blocked: { label: "Blocked", classes: "bg-red-100 text-red-700" },
};

const PLAN_OPTIONS = [
  { id: "free", label: "🆓 Free", credits: 1 },
  { id: "basic", label: "🚀 Basic", credits: 15 },
  { id: "pro", label: "⚡ Pro", credits: 35 },
  { id: "premium", label: "🔥 Premium", credits: 50 },
];

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creditInput, setCreditInput] = useState("");
  const [creditMessage, setCreditMessage] = useState("");
  const [creditSuccess, setCreditSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [planMessage, setPlanMessage] = useState("");
  const [planSuccess, setPlanSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [usersRes, logsRes, subsRes] = await Promise.all([
        adminFetch("/api/admin/users"),
        adminFetch(`/api/admin/activities?user_id=${userId}&limit=20`),
        adminFetch("/api/paystack/subscriptions"),
      ]);

      const rawList = usersRes.users ?? usersRes ?? [];
      const usersList: UserDetail[] = rawList.map((u: any) => ({
        id: u.id,
        email: u.email,
        plan: u.plan,
        credits: u.credits_remaining ?? u.credits ?? 1,
        search_count: u.search_count ?? 0,
        status: u.status || "active",
        isAdmin: u.is_admin ?? u.isAdmin ?? false,
        created_at: u.created_at || null,
        last_active: u.last_active || null,
      }));
      const foundUser = usersList.find((u) => u.id === userId);
      if (!foundUser) {
        // Try to fetch user detail from our own data
        setError("User not found.");
      } else {
        setUser(foundUser);
        setSelectedPlan(foundUser.plan);
      }

      setLogs(logsRes.data ?? logsRes.logs ?? []);
      const allSubs = subsRes.subscriptions ?? [];
      setSubscriptions(allSubs.filter((s: Subscription) => s.user_id === userId || userId === "all"));
      const allPmts = subsRes.payments ?? [];
      setPayments(allPmts.filter((p: Payment) => p.user_id === userId || userId === "all"));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const changePlan = async () => {
    if (!user) return;
    setActionLoading(true);
    setPlanMessage("");
    try {
      const planConfig = PLAN_OPTIONS.find(p => p.id === selectedPlan);
      await adminFetch("/api/admin/plan-change", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          plan: selectedPlan,
          credits: planConfig?.credits ?? 1,
        }),
      });
      setPlanSuccess(true);
      setPlanMessage(`Plan changed to ${selectedPlan} with ${planConfig?.credits ?? 1} credits`);
      await fetchData();
    } catch (err: any) {
      setPlanSuccess(false);
      setPlanMessage(err.message || "Failed to change plan");
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
        body: JSON.stringify({ user_id: user.id, credits: amount, action }),
      });
      setCreditInput("");
      setCreditSuccess(true);
      setCreditMessage(action === 'set' ? `Credits set to ${result.credits ?? amount}` : `Credits ${action === 'add' ? 'added' : 'deducted'}: ${result.previous} → ${result.new_credits}`);
      await fetchData();
    } catch (err: any) {
      setCreditSuccess(false);
      setCreditMessage(err.message || "Failed to update credits");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-white text-gray-900">
        {/* Mobile nav */}
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 md:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div>
              <span className="text-base font-semibold">Admin</span>
            </Link>
            <button onClick={() => setMobileOpen(o => !o)} className="p-2 rounded-lg hover:bg-gray-100">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          {mobileOpen && (
            <nav className="px-4 pb-4 space-y-1 border-t border-gray-100 pt-2">
              {NAV.map(item => (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 hover:bg-gray-100">
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
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
                <span className="text-lg font-semibold">Admin</span>
              </Link>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {NAV.map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl text-gray-600 hover:bg-gray-100">
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
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
              <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-6">
                <ChevronLeft className="w-4 h-4" /> Back to Users
              </Link>

              {error && !user && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {loading && (
                <div className="space-y-6">
                  <div className="h-8 w-64 bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
                  <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
                </div>
              )}

              {!loading && user && (
                <>
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-all">{user.email}</h1>
                        <span className={`inline-flex items-center gap-1 px-3 py-0.5 text-xs font-semibold rounded-full ${STATUS_BADGE[user.status]?.classes ?? STATUS_BADGE.active.classes}`}>
                          {user.status === "blocked" ? <Ban className="w-3 h-3" /> : user.status === "suspended" ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {STATUS_BADGE[user.status]?.label ?? "Active"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">ID: {user.id}</p>
                    </div>
                    <button onClick={fetchData} disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 self-start">
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                  </div>

                  {/* Info cards row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {/* Plan info */}
                    <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50/50">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Plan</p>
                      <p className="text-lg font-semibold">
                        <span className="mr-1.5">{PLAN_OPTIONS.find(p => p.id === user.plan)?.label ?? "📋"}</span>
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{user.credits} credits remaining</p>
                    </div>

                    {/* Status controls */}
                    <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50/50">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Status Controls</p>
                      <div className="flex flex-wrap gap-2">
                        {user.status !== "active" && (
                          <button onClick={() => updateStatus("active")} disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50">
                            <CheckCircle className="w-3.5 h-3.5" /> Activate
                          </button>
                        )}
                        {user.status !== "suspended" && (
                          <button onClick={() => updateStatus("suspended")} disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50">
                            <AlertTriangle className="w-3.5 h-3.5" /> Suspend
                          </button>
                        )}
                        {user.status !== "blocked" && (
                          <button onClick={() => updateStatus("blocked")} disabled={actionLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50">
                            <Ban className="w-3.5 h-3.5" /> Block
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50/50">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Dates</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm"><Calendar className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-500">Joined:</span><span className="font-medium">{user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</span></div>
                        <div className="flex items-center gap-2 text-sm"><Clock className="w-3.5 h-3.5 text-gray-400" /><span className="text-gray-500">Last active:</span><span className="font-medium">{user.last_active ? new Date(user.last_active).toLocaleDateString() : "—"}</span></div>
                        <div className="flex items-center gap-2 text-sm"><Search size={14} className="text-gray-400" /><span className="text-gray-500">Searches:</span><span className="font-medium">{user.search_count}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* ── Plan Change ── */}
                  <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50/50 mb-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5" /> Change Subscription Plan
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">Select new plan</label>
                        <select
                          value={selectedPlan}
                          onChange={(e) => setSelectedPlan(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {PLAN_OPTIONS.map(p => (
                            <option key={p.id} value={p.id}>{p.label} — {p.credits} credits</option>
                          ))}
                        </select>
                      </div>
                      <button onClick={changePlan} disabled={actionLoading || selectedPlan === user.plan}
                        className="px-5 py-2.5 text-sm font-semibold bg-black text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
                        Apply Plan
                      </button>
                    </div>
                    {planMessage && (
                      <p className={`text-xs mt-2 ${planSuccess ? "text-green-600" : "text-red-600"}`}>{planMessage}</p>
                    )}
                  </div>

                  {/* ── Credits Management ── */}
                  <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50/50 mb-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-yellow-500" /> Credits Management
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                      <div><p className="text-xs text-gray-500 mb-1">Current credits</p><p className="text-2xl font-bold">{user.credits ?? 0}</p></div>
                      <div className="flex-1 min-w-0">
                        <label className="text-xs text-gray-500 mb-1 block">Set credits to</label>
                        <input type="number" value={creditInput} onChange={(e) => setCreditInput(e.target.value)} placeholder="Enter amount" min="0"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setRips(Number(creditInput), 'set')} disabled={!creditInput || actionLoading}
                          className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Set</button>
                        <button onClick={() => setRips(10, 'add')} disabled={actionLoading}
                          className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">+10</button>
                        <button onClick={() => setRips(5, 'deduct')} disabled={actionLoading}
                          className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">-5</button>
                      </div>
                    </div>
                    {creditMessage && <p className={`text-xs mt-2 ${creditSuccess ? "text-green-600" : "text-red-600"}`}>{creditMessage}</p>}
                  </div>

                  {/* ── Active Subscriptions ── */}
                  {subscriptions.length > 0 && (
                    <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50/50 mb-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5" /> Active Subscriptions
                      </p>
                      <div className="space-y-2">
                        {subscriptions.map(sub => (
                          <div key={sub.id} className="bg-white rounded-xl p-4 border border-gray-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold capitalize">{sub.plan} — {sub.currency}</p>
                                <p className="text-xs text-gray-500">{sub.status} · {sub.paystack_subscription_code ? "Auto-renew" : "Manual"}</p>
                              </div>
                              {sub.next_due_date && (
                                <span className="text-xs text-gray-400">Next: {new Date(sub.next_due_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Payment History ── */}
                  {payments.length > 0 && (
                    <div className="rounded-2xl border border-gray-100 p-5 bg-gray-50/50 mb-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5" /> Payment History
                      </p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Plan</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Amount</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Date</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Ref</th>
                          </tr></thead>
                          <tbody className="divide-y divide-gray-100">
                            {payments.map(p => (
                              <tr key={p.id} className="hover:bg-gray-100 transition-colors">
                                <td className="px-3 py-2 capitalize font-medium">{p.plan}</td>
                                <td className="px-3 py-2 font-mono">{p.currency === "NGN" ? `₦${p.amount.toLocaleString()}` : `$${p.amount.toFixed(2)}`}</td>
                                <td className="px-3 py-2 text-gray-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                                <td className="px-3 py-2 text-xs text-gray-400 font-mono">{p.paystack_reference?.slice(0, 8)}...</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── Activity Logs ── */}
                  <div>
                    <h2 className="text-xl font-bold tracking-tight mb-4">Recent Activity</h2>
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Timestamp</th>
                            <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Action</th>
                            <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Details</th>
                            <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">IP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {logs.length === 0 ? (
                            <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-400">No activity found.</td></tr>
                          ) : (
                            logs.map(log => (
                              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-5 py-4 whitespace-nowrap text-gray-500 text-xs font-mono">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}</td>
                                <td className="px-5 py-4"><span className="inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 capitalize">{log.action.replace(/_/g, " ")}</span></td>
                                <td className="px-5 py-4 max-w-xs">{log.details ? <pre className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 overflow-x-auto max-h-24">{JSON.stringify(log.details, null, 2)}</pre> : <span className="text-gray-400">—</span>}</td>
                                <td className="px-5 py-4 text-xs font-mono text-gray-500">{log.ip || "—"}</td>
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