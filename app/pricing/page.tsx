"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import {
  Sparkles, CheckCircle, Zap, Shield, Crown,
  ArrowRight, Mail, Search, Download, Users,
  Building2, Wallet, Naira,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSubscription, PLAN_CONFIGS } from "@/lib/subscription-context";
import type { Plan } from "@/lib/subscription-context";

function PricingContent() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, refreshSubscription, preferredCurrency, setPreferredCurrency } = useSubscription();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [verifying, setVerifying] = useState(false);
  const [verifiedPlan, setVerifiedPlan] = useState<string | null>(null);
  const [subscribeLoading, setSubscribeLoading] = useState<Plan | null>(null);

  // ── Handle Paystack redirect (reference in URL) ──────────────────────────
  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference) return;

    let cancelled = false;
    setVerifying(true);

    (async () => {
      try {
        const res = await fetch(`/api/paystack/verify?reference=${reference}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.success) {
          const planKey = data.plan || "basic";
          try {
            localStorage.setItem("creata_plan", planKey);
            localStorage.setItem("creata_credits_remaining", String(data.credits));
            localStorage.setItem("creata_total_purchased", String(data.credits));
          } catch {}

          await refreshSubscription();
          setVerifiedPlan(data.plan || "basic");

          // Clean the URL
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, "", cleanUrl);
        } else {
          alert(`Payment verification failed: ${data.message || "something went wrong"}`);
        }
      } catch (err: any) {
        if (!cancelled) alert(`Verification error: ${err.message}`);
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();

    return () => { cancelled = true; };
  }, [searchParams, refreshSubscription]);

  // ── Subscribe handler ────────────────────────────────────────────────────
  const subscribe = useCallback(
    async (planId: Plan) => {
      if (!user) {
        router.push("/auth/signin");
        return;
      }

      const planConfig = PLAN_CONFIGS[planId];
      if (!planConfig || planConfig.priceUsd <= 0) {
        alert("This plan is free — no payment needed.");
        return;
      }

      setSubscribeLoading(planId);

      try {
        // Use the new subscription endpoint for recurring payments
        const res = await fetch("/api/paystack/initialize-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user.email,
            plan: planId,
            currency: preferredCurrency,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Payment initialization failed");
        }

        // Redirect to Paystack checkout
        if (data.authorization_url) {
          window.location.href = data.authorization_url;
        } else {
          throw new Error("No authorization URL returned from Paystack");
        }
      } catch (err: any) {
        alert(`Payment error: ${err.message}`);
      } finally {
        setSubscribeLoading(null);
      }
    },
    [user, router, preferredCurrency]
  );

  // ── Loading state ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-black" />
      </div>
    );
  }

  const currentPlan = subscription?.plan ?? "free";

  // ── Feature icon mapping ─────────────────────────────────────────────────
  const featureIcons: Record<string, React.ReactNode> = {
    "one free credit": <Search className="w-4 h-4 text-blue-600 flex-shrink-0" />,
    "15 search credits": <Zap className="w-4 h-4 text-blue-600 flex-shrink-0" />,
    "35 search credits": <Zap className="w-4 h-4 text-blue-600 flex-shrink-0" />,
    "50 search credits": <Zap className="w-4 h-4 text-blue-600 flex-shrink-0" />,
    "save & export leads": <Download className="w-4 h-4 text-emerald-600 flex-shrink-0" />,
    "lead extracting": <Zap className="w-4 h-4 text-blue-600 flex-shrink-0" />,
    "email finder": <Mail className="w-4 h-4 text-purple-600 flex-shrink-0" />,
    "enrich lead": <Users className="w-4 h-4 text-indigo-600 flex-shrink-0" />,
    "buying-signal insight": <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />,
  };

  const formatPrice = (planConfig: typeof PLAN_CONFIGS.basic) => {
    if (planConfig.priceUsd === 0) return "Free";
    if (preferredCurrency === "NGN") {
      return `₦${planConfig.priceNgn.toLocaleString()}`;
    }
    return `$${planConfig.priceUsd}`;
  };

  const planCards = [
    {
      id: "free" as Plan,
      emoji: "🎁", name: "Free",
      tagline: "Get a taste — one free credit",
      price: 0, creditsOnSubscribe: 1, maxLeadsPerSearch: 20,
      features: PLAN_CONFIGS.free.features,
      cta: currentPlan === "free" ? "Current plan" : "Get started",
    },
    {
      id: "basic" as Plan,
      emoji: "🚀", name: "Basic",
      tagline: "For solo operators who need consistent leads",
      price: PLAN_CONFIGS.basic.priceUsd, creditsOnSubscribe: 15, maxLeadsPerSearch: 20,
      features: PLAN_CONFIGS.basic.features,
      cta: currentPlan === "basic" ? "Current plan" : "Subscribe",
      popular: true,
    },
    {
      id: "pro" as Plan,
      emoji: "⚡", name: "Pro",
      tagline: "Full lead extracting, email finding, enrichment",
      price: PLAN_CONFIGS.pro.priceUsd, creditsOnSubscribe: 35, maxLeadsPerSearch: 30,
      features: PLAN_CONFIGS.pro.features,
      cta: currentPlan === "pro" ? "Current plan" : "Subscribe",
    },
    {
      id: "premium" as Plan,
      emoji: "🔥", name: "Premium",
      tagline: "Maximum power — unlimited potential",
      price: PLAN_CONFIGS.premium.priceUsd, creditsOnSubscribe: 50, maxLeadsPerSearch: 40,
      features: PLAN_CONFIGS.premium.features,
      cta: currentPlan === "premium" ? "Current plan" : "Subscribe",
    },
  ];

  const getConfig = (id: Plan) => PLAN_CONFIGS[id];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative pt-20 pb-12 sm:pt-28 sm:pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-50 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 relative text-center">
          {/* Bag secured banner */}
          {verifiedPlan && (
            <div className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl mb-8 animate-slide-up">
              <Crown className="w-5 h-5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold text-sm">
                Bag secured! 🎉 {verifiedPlan} plan is live
              </span>
            </div>
          )}

          {/* Verifying spinner */}
          {verifying && (
            <div className="inline-flex items-center gap-3 px-5 py-3 bg-blue-50 border border-blue-200 rounded-2xl mb-8">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
              <span className="text-blue-700 font-medium text-sm">
                Verifying your payment... hold tight
              </span>
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            Pick your plan
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed mb-6">
            First one&apos;s on us. Upgrade when you&apos;re ready to go viral.
          </p>

          {/* ── Currency Toggle ── */}
          <div className="inline-flex items-center gap-3 bg-gray-100 rounded-2xl p-1.5 shadow-sm">
            <button
              onClick={() => setPreferredCurrency("NGN")}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                preferredCurrency === "NGN"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              ₦ NGN
            </button>
            <button
              onClick={() => setPreferredCurrency("USD")}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                preferredCurrency === "USD"
                  ? "bg-white text-black shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              $ USD
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {preferredCurrency === "NGN"
              ? "Pay in Naira — recurring subscription via Paystack"
              : "Pay in Dollars — one-time with auto-renewal tracking"}
          </p>
        </div>
      </section>

      {/* ── Plan Cards ── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-4 gap-6 lg:gap-8">
          {planCards.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isFree = plan.id === "free";
            const needsPayment = !isFree && !isCurrent;
            const config = getConfig(plan.id);
            const displayPrice = formatPrice(config);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border transition-all duration-300 ${
                  isCurrent
                    ? "border-blue-400 ring-2 ring-blue-400/30 bg-blue-50/50"
                    : plan.popular
                    ? "border-gray-300 bg-white hover:border-gray-400 hover:shadow-lg"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                }`}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-md">
                      <Zap className="w-3 h-3" />
                      Most popular
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-md">
                      <CheckCircle className="w-3 h-3" />
                      Active plan
                    </span>
                  </div>
                )}

                <div className="p-6 sm:p-8 flex flex-col flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{plan.emoji}</span>
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{plan.tagline}</p>
                    </div>
                  </div>

                  {/* Price — shows selected currency */}
                  <div className="mb-5">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-bold">Free</span>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{displayPrice}</span>
                        <span className="text-sm text-gray-400">/mo</span>
                      </div>
                    )}
                    {plan.price > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {preferredCurrency === "NGN"
                          ? `~$${config.priceUsd}/mo USD`
                          : `~₦${config.priceNgn.toLocaleString()}/mo NGN`}
                      </p>
                    )}
                  </div>

                  {/* Credits count */}
                  <div className="flex items-center gap-2 mb-6 py-3 px-4 bg-gray-50 rounded-xl">
                    <Zap className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">
                      {plan.creditsOnSubscribe} credits / month
                    </span>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        {featureIcons[feature] || (
                          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="text-sm text-gray-600 leading-relaxed capitalize">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {isCurrent ? (
                    <div className="w-full py-3.5 text-sm font-semibold text-center rounded-xl bg-blue-100 text-blue-700 cursor-default">
                      <CheckCircle className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                      Active plan
                    </div>
                  ) : isFree ? (
                    <Link
                      href="/"
                      className="w-full py-3.5 text-sm font-semibold text-center rounded-xl bg-black text-white hover:opacity-90 transition-opacity inline-block"
                    >
                      Start free
                      <ArrowRight className="w-4 h-4 inline ml-1.5 -mt-0.5" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => subscribe(plan.id)}
                      disabled={subscribeLoading === plan.id}
                      className="w-full py-3.5 text-sm font-semibold text-center rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {subscribeLoading === plan.id ? (
                        <span className="inline-flex items-center gap-2">
                          <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          Processing...
                        </span>
                      ) : (
                        <>
                          Subscribe — {displayPrice}/mo
                          <Wallet className="w-4 h-4 inline ml-1.5 -mt-0.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-gray-100 py-16 bg-gray-50/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Secure, no lock-in</h3>
          <p className="text-sm text-gray-500 max-w-lg mx-auto leading-relaxed">
            Paystack handles everything. Cancel anytime — your credits stay until you use &apos;em.
            NGN subscriptions auto-renew monthly. USD subscribers get reminders before each billing cycle.
          </p>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="text-sm text-gray-400">Creata — AI-native lead generation</p>
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </main>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-black" /></div>}>
      <PricingContent />
    </Suspense>
  );
}