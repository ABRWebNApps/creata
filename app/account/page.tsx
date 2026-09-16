"use client";

import { useSubscription, PLAN_CONFIGS } from "@/lib/subscription-context";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Sparkles, User, CreditCard, Settings, LogOut,
  CheckCircle, Zap, ChevronRight, ArrowLeft,
  Calendar, Activity, DollarSign, AlertTriangle,
  XCircle, RefreshCw, Wallet, Download,
} from "lucide-react";

type SubscriptionRecord = {
  id: string;
  plan: string;
  currency: string;
  status: string;
  current_period_end: string;
  paystack_subscription_code: string | null;
};

type PaymentRecord = {
  id: string;
  plan: string;
  currency: string;
  amount: number;
  status: string;
  paystack_reference: string;
  created_at: string;
};

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const { subscription, loading, refreshSubscription, preferredCurrency } = useSubscription();
  const [subs, setSubs] = useState<SubscriptionRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);

  const currentPlan = subscription ? PLAN_CONFIGS[subscription.plan] : PLAN_CONFIGS.free;
  const isPaid = subscription?.plan !== "free";

  const usedCredits = subscription && currentPlan
    ? currentPlan.creditsOnSubscribe - subscription.creditsRemaining
    : 0;
  const totalCredits = currentPlan?.creditsOnSubscribe ?? 1;
  const creditPercent = Math.round(((totalCredits - usedCredits) / totalCredits) * 100);

  // Fetch subscriptions & payments
  useEffect(() => {
    if (!user) return;
    setSubsLoading(true);
    fetch("/api/paystack/subscriptions")
      .then(r => r.json())
      .then(d => {
        setSubs(d.subscriptions ?? []);
        setPayments(d.payments ?? []);
      })
      .catch(() => {})
      .finally(() => setSubsLoading(false));
  }, [user]);

  const handleCancel = async (subId: string) => {
    setCancellingId(subId);
    try {
      const res = await fetch("/api/paystack/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", subscription_id: subId }),
      });
      const data = await res.json();
      if (data.success) {
        setSubs(prev => prev.map(s => s.id === subId ? { ...s, status: "cancelled" } : s));
        await refreshSubscription();
        setCancelConfirm(null);
      } else {
        alert("Cancel failed: " + (data.error || "unknown error"));
      }
    } catch (err: any) {
      alert("Cancel error: " + err.message);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-black" />
      </div>
    );
  }

  const activeSubs = subs.filter(s => s.status === "active");
  const subEnd = subscription?.subscriptionEnd;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-6 py-12 sm:py-16">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-10">Account</h1>

        <div className="grid gap-8">
          {/* ── Profile ── */}
          <section className="rounded-2xl border border-gray-100 p-6 sm:p-8 bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Your Profile</h2>
                <p className="text-sm text-gray-500">Manage your account details</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 sm:p-5">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
              <p className="text-sm sm:text-base font-medium text-gray-900">{user?.email ?? "Not signed in"}</p>
            </div>
          </section>

          {/* ── Current Plan ── */}
          <section className="rounded-2xl border border-gray-100 p-6 sm:p-8 bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Your Plan</h2>
                <p className="text-sm text-gray-500">Current subscription details</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-gray-50 rounded-xl p-5 sm:p-6 border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{currentPlan?.emoji}</span>
                    <div>
                      <p className="text-lg font-semibold">{currentPlan?.name}</p>
                      <p className="text-sm text-gray-500">
                        {preferredCurrency === "NGN"
                          ? `₦${currentPlan?.priceNgn.toLocaleString()}/month`
                          : `$${currentPlan?.priceUsd}/month`}
                        &middot; {currentPlan?.creditsOnSubscribe} credits
                      </p>
                    </div>
                  </div>
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full">Free</span>
                  )}
                </div>

                {/* Credits bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium">Credits remaining</span>
                    <span className="text-gray-500">{subscription?.creditsRemaining ?? 0} / {totalCredits}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        creditPercent > 50 ? "bg-emerald-500" : creditPercent > 20 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${creditPercent}%` }}
                    />
                  </div>
                </div>

                {/* Subscription end */}
                {subEnd && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 pt-3 border-t border-gray-200">
                    <Calendar className="w-4 h-4" />
                    <span>Renews on {new Date(subEnd).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
                  </div>
                )}

                {/* Active subscription details */}
                {activeSubs.map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 text-xs text-gray-400 pt-2">
                    <DollarSign className="w-3 h-3" />
                    <span>{sub.currency} subscription &middot; {sub.paystack_subscription_code ? "Auto-renew" : "Manual"}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Activity className="w-4 h-4" />
                <span>Used {usedCredits} of {totalCredits} credits this period</span>
              </div>
            </div>
          </section>

          {/* ── Active Subscriptions (manage) ── */}
          {activeSubs.length > 0 && (
            <section className="rounded-2xl border border-gray-100 p-6 sm:p-8 bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Active Subscriptions</h2>
                  <p className="text-sm text-gray-500">Manage or cancel your subscriptions</p>
                </div>
              </div>

              <div className="space-y-4">
                {activeSubs.map(sub => (
                  <div key={sub.id} className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold capitalize">{sub.plan} — {sub.currency}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {sub.paystack_subscription_code ? "Auto-renews monthly via Paystack" : "Manual USD billing"}
                        </p>
                        {sub.current_period_end && (
                          <p className="text-xs text-gray-400 mt-1">
                            Next charge: {new Date(sub.current_period_end).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {cancelConfirm === sub.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCancel(sub.id)}
                            disabled={cancellingId === sub.id}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {cancellingId === sub.id ? "Cancelling..." : "Confirm cancel"}
                          </button>
                          <button
                            onClick={() => setCancelConfirm(null)}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-200 text-gray-700 hover:bg-gray-300"
                          >
                            Keep
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCancelConfirm(sub.id)}
                          className="px-4 py-2 text-xs font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Payment History ── */}
          <section className="rounded-2xl border border-gray-100 p-6 sm:p-8 bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Payment History</h2>
                <p className="text-sm text-gray-500">Past payments and subscription charges</p>
              </div>
            </div>

            {payments.length === 0 && subsLoading ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <RefreshCw className="w-6 h-6 mx-auto text-gray-400 animate-spin mb-3" />
                <p className="text-sm text-gray-500">Loading payment history...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Settings className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No payments yet. Subscribe to a plan to see history here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Plan</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Currency</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(pmt => (
                      <tr key={pmt.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium capitalize">{pmt.plan}</td>
                        <td className="px-4 py-3 font-mono">
                          {pmt.currency === "NGN" ? `₦${pmt.amount.toLocaleString()}` : `$${pmt.amount.toFixed(2)}`}
                        </td>
                        <td className="px-4 py-3">{pmt.currency}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(pmt.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            pmt.status === "success"
                              ? "bg-emerald-100 text-emerald-700"
                              : pmt.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-500"
                          }`}>
                            {pmt.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Plan Features ── */}
          <section className="rounded-2xl border border-gray-100 p-6 sm:p-8 bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Plan Features</h2>
                <p className="text-sm text-gray-500">What&apos;s included in your {currentPlan?.name} plan</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-5 sm:p-6">
              <ul className="space-y-3">
                {currentPlan?.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 capitalize">{feature}</span>
                  </li>
                ))}
              </ul>

              {currentPlan?.id === "free" && (
                <div className="mt-5 pt-5 border-t border-gray-200">
                  <p className="text-xs text-gray-400 mb-3">Upgrade to unlock more features:</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {Object.values(PLAN_CONFIGS).filter(p => p.id !== "free").map(plan => (
                      <Link key={plan.id} href="/pricing"
                        className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{plan.emoji}</span>
                          <div>
                            <p className="text-sm font-semibold capitalize">{plan.name}</p>
                            <p className="text-xs text-gray-400">
                              {preferredCurrency === "NGN"
                                ? `₦${plan.priceNgn.toLocaleString()}/mo`
                                : `$${plan.priceUsd}/mo`}
                              &middot; {plan.creditsOnSubscribe} credits
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Upgrade / Manage ── */}
          <section className="rounded-2xl border border-gray-100 p-6 sm:p-8 bg-gradient-to-br from-gray-50 to-white shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{isPaid ? "Manage Subscription" : "Upgrade Your Plan"}</h2>
                  <p className="text-sm text-gray-500">{isPaid ? "Change your plan or cancel anytime" : "Unlock more runs and premium features"}</p>
                </div>
              </div>
              <Link href="/pricing"
                className={`inline-flex items-center gap-2 px-6 py-3 font-semibold rounded-xl text-sm transition-all whitespace-nowrap ${
                  isPaid ? "bg-gray-200 text-gray-900 hover:bg-gray-300" : "bg-black text-white hover:opacity-90"
                }`}
              >
                {isPaid ? "Manage" : "Upgrade"}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        </div>
      </div>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="text-sm text-gray-400">Creata — AI-native lead generation</p>
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </main>
  );
}