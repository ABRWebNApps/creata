"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminGuard from "@/lib/admin/admin-guard";
import { adminFetch } from "@/lib/admin/api";
import { PLAN_PRICING } from "@/lib/paystack";
import {
  Shield, Users, Activity, BarChart3, Settings,
  DollarSign, CreditCard, Plus, Trash2, CheckCircle,
} from "lucide-react";

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/activities", label: "Activity", icon: Activity },
  { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSettingsPage() {
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [adminList, setAdminList] = useState<{ email: string; role: string }[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);

  const fetchAdmins = async () => {
    setAdminLoading(true);
    try {
      const users = await adminFetch("/api/admin/users");
      const list: any[] = users.users ?? users ?? [];
      const admins = list.filter((u: any) => u.isAdmin);
      setAdminList(admins.map((a: any) => ({ email: a.email, role: a.admin_role || "admin" })));
    } catch {} finally { setAdminLoading(false); }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const addAdmin = async () => {
    setMsg("");
    if (!newAdminEmail.trim()) return;
    try {
      await adminFetch("/api/admin/add-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newAdminEmail.trim(), role: "admin" }),
      });
      setMsg("Admin added successfully!");
      setMsgType("success");
      setNewAdminEmail("");
      fetchAdmins();
    } catch (err: any) {
      setMsg(err.message || "Failed to add admin");
      setMsgType("error");
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-white text-gray-900">
        <div className="flex">
          <aside className="hidden md:flex flex-col w-64 min-h-screen border-r border-gray-100 bg-gray-50/50">
            <div className="p-6 border-b border-gray-100">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
                <span className="text-lg font-semibold">Admin</span>
              </Link>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {sidebarLinks.map(item => (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    item.href === "/admin/settings" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}>
                  <item.icon className="w-4 h-4" /> {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <main className="flex-1">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Admin Settings</h1>
              <p className="text-sm text-gray-500 mb-8">Manage admins, plans, and system configuration</p>

              {/* ── Plan Config ── */}
              <div className="rounded-2xl border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-semibold mb-1">Subscription Plans</h2>
                <p className="text-sm text-gray-500 mb-4">Current pricing configuration (update via .env / redeploy)</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {Object.entries(PLAN_PRICING).filter(([_, p]) => p.usd > 0).map(([id, plan]) => (
                    <div key={id} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      <p className="text-lg font-semibold mb-1">{plan.emoji} {plan.name}</p>
                      <p className="text-2xl font-bold mb-2">${plan.usd}<span className="text-sm text-gray-500 font-normal">/mo</span></p>
                      <p className="text-sm text-gray-500">₦{plan.ngn.toLocaleString()}/mo</p>
                      <p className="text-sm text-gray-500">{plan.creditsOnSubscribe} credits</p>
                      <p className="text-xs text-gray-400 mt-2">{plan.maxLeadsPerSearch} leads/search · {plan.canEnrich ? "Enrichment ✓" : "No enrichment"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Admin List ── */}
              <div className="rounded-2xl border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-semibold mb-1">Current Admins</h2>
                <p className="text-sm text-gray-500 mb-4">Users with admin access ({adminList.length} total)</p>
                {adminLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
                ) : adminList.length === 0 ? (
                  <p className="text-sm text-gray-400">No admins found.</p>
                ) : (
                  <div className="space-y-2">
                    {adminList.map((a, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
                          <div><p className="text-sm font-medium">{a.email}</p><p className="text-xs text-gray-500">{a.role}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Add Admin ── */}
              <div className="rounded-2xl border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-semibold mb-1">Add Admin</h2>
                <p className="text-sm text-gray-500 mb-4">Grant admin access to a user by their email</p>
                {msg && (
                  <div className={`mb-4 p-3 rounded-xl text-sm ${
                    msgType === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
                  }`}>{msg}</div>
                )}
                <div className="flex gap-3">
                  <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400" />
                  <button onClick={addAdmin}
                    className="px-5 py-2.5 text-sm font-semibold bg-black text-white rounded-xl hover:opacity-90 transition-opacity">
                    <Plus className="w-4 h-4 inline mr-1 -mt-0.5" /> Add Admin
                  </button>
                </div>
              </div>

              {/* ── System Info ── */}
              <div className="rounded-2xl border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-semibold mb-1">System</h2>
                <p className="text-sm text-gray-500 mb-4">Database tables and integration status</p>
                <div className="space-y-2 text-sm">
                  {[
                    { table: "user_plans", desc: "User credits, plans, account status" },
                    { table: "subscriptions", desc: "NGN + USD recurring subscriptions" },
                    { table: "payments", desc: "Payment history from Paystack" },
                    { table: "paystack_plans", desc: "Cached Paystack plan codes" },
                    { table: "activity_logs", desc: "All user and admin actions" },
                    { table: "admin_users", desc: "Admin accounts and roles" },
                  ].map(t => (
                    <div key={t.table} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl">
                      <code className="text-xs font-mono text-blue-600">{t.table}</code>
                      <span className="text-gray-500">— {t.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}