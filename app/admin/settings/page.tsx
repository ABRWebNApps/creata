"use client";

import { useState } from "react";
import Link from "next/link";
import AdminGuard from "@/lib/admin/admin-guard";
import { adminFetch } from "@/lib/admin/api";
import {
  Shield, Users, Activity, BarChart3, Settings,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  const sidebarLinks = [
    { href: "/admin", label: "Dashboard", icon: BarChart3 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/activities", label: "Activity", icon: Activity },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const addAdmin = async () => {
    setMsg("");
    if (!newAdminEmail.trim()) return;
    try {
      const res = await adminFetch("/api/admin/add-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newAdminEmail.trim(), role: "admin" }),
      });
      setMsg("Admin added successfully!");
      setMsgType("success");
      setNewAdminEmail("");
    } catch (err: any) {
      setMsg(err.message || "Failed to add admin");
      setMsgType("error");
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {/* Mobile nav */}
        <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 md:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-black dark:bg-white rounded-lg flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white dark:text-black" />
              </div>
              <span className="text-base font-semibold">Admin</span>
            </Link>
          </div>
        </header>

        <div className="flex">
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
              {sidebarLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                    item.href === "/admin/settings"
                      ? "bg-black dark:bg-white text-white dark:text-black"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <main className="flex-1">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Admin Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Manage admin access and system configuration</p>

              {/* Add admin */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6 mb-6">
                <h2 className="text-lg font-semibold mb-1">Add Admin</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Grant admin access to a user by their email
                </p>
                {msg && (
                  <div className={`mb-4 p-3 rounded-xl text-sm ${
                    msgType === "success"
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                  }`}>
                    {msg}
                  </div>
                )}
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:border-gray-400 dark:focus:border-gray-600"
                  />
                  <button
                    onClick={addAdmin}
                    className="px-5 py-2.5 text-sm font-semibold bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity"
                  >
                    Add Admin
                  </button>
                </div>
              </div>

              {/* DB info */}
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold mb-1">Database Status</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tables used by the admin system</p>
                <div className="space-y-2 text-sm">
                  {[
                    { table: "admin_users", desc: "Admin accounts" },
                    { table: "user_plans", desc: "User credits, plans, status" },
                    { table: "activity_logs", desc: "All user activity" },
                  ].map((t) => (
                    <div key={t.table} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl">
                      <code className="text-xs font-mono text-blue-600 dark:text-blue-400">{t.table}</code>
                      <span className="text-gray-500 dark:text-gray-400">— {t.desc}</span>
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