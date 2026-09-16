"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { PLAN_PRICING } from "@/lib/paystack";
import type { PlanId } from "@/lib/paystack";

// ── Types ──────────────────────────────────────────────────────────────────

export type Plan = PlanId;

export type UserSubscription = {
  plan: Plan;
  creditsRemaining: number;
  totalPurchased: number;
  subscriptionEnd: string | null;
  email: string | null;
  status: "active" | "suspended" | "blocked";
  maxLeadsPerSearch: number;
  canEnrich: boolean;
  currency?: "NGN" | "USD";
  paystackCustomerCode?: string;
};

export type PlanConfig = {
  id: Plan;
  name: string;
  priceUsd: number;
  priceNgn: number;
  creditsOnSubscribe: number;
  maxLeadsPerSearch: number;
  canEnrich: boolean;
  features: string[];
  emoji: string;
};

// ── Build PlanConfig from shared pricing ───────────────────────────────────

export const PLAN_CONFIGS: Record<Plan, PlanConfig> = Object.fromEntries(
  Object.entries(PLAN_PRICING).map(([id, p]) => [
    id,
    {
      id: id as Plan,
      name: p.name,
      priceUsd: p.usd,
      priceNgn: p.ngn,
      creditsOnSubscribe: p.creditsOnSubscribe,
      maxLeadsPerSearch: p.maxLeadsPerSearch,
      canEnrich: p.canEnrich,
      features: p.features,
      emoji: p.emoji,
    },
  ])
) as Record<Plan, PlanConfig>;

// ── Context shape ──────────────────────────────────────────────────────────

type SubscriptionContextType = {
  subscription: UserSubscription | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  canSearch: () => boolean;
  consumeCredit: () => Promise<boolean>;
  hasFeature: (feature: string) => boolean;
  preferredCurrency: "NGN" | "USD";
  setPreferredCurrency: (c: "NGN" | "USD") => void;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

// ── LocalStorage helpers ───────────────────────────────────────────────────

const LS_KEYS = {
  plan: "creata_plan",
  creditsRemaining: "creata_credits_remaining",
  totalPurchased: "creata_total_purchased",
  subscriptionEnd: "creata_subscription_end",
  currency: "creata_currency",
} as const;

function loadLocalSubscription(): UserSubscription | null {
  try {
    const plan = localStorage.getItem(LS_KEYS.plan) as Plan | null;
    if (!plan) return null;

    const credits = Number(localStorage.getItem(LS_KEYS.creditsRemaining));
    const total = Number(localStorage.getItem(LS_KEYS.totalPurchased));
    const end = localStorage.getItem(LS_KEYS.subscriptionEnd);

    return {
      plan,
      creditsRemaining: Number.isFinite(credits) ? credits : 1,
      totalPurchased: Number.isFinite(total) ? total : 0,
      subscriptionEnd: end || null,
      email: null,
      status: "active",
      maxLeadsPerSearch: PLAN_CONFIGS[plan]?.maxLeadsPerSearch ?? 20,
      canEnrich: PLAN_CONFIGS[plan]?.canEnrich ?? false,
    };
  } catch {
    return null;
  }
}

function saveLocalSubscription(sub: UserSubscription) {
  try {
    localStorage.setItem(LS_KEYS.plan, sub.plan);
    localStorage.setItem(LS_KEYS.creditsRemaining, String(sub.creditsRemaining));
    localStorage.setItem(LS_KEYS.totalPurchased, String(sub.totalPurchased));
    localStorage.setItem(LS_KEYS.subscriptionEnd, sub.subscriptionEnd ?? "");
  } catch {
    // localStorage may be unavailable in SSR / private mode — silently skip
  }
}

function getFreeSubscription(email: string | null): UserSubscription {
  return {
    plan: "free",
    creditsRemaining: 1,
    totalPurchased: 0,
    subscriptionEnd: null,
    email,
    status: "active",
    maxLeadsPerSearch: PLAN_CONFIGS.free.maxLeadsPerSearch,
    canEnrich: PLAN_CONFIGS.free.canEnrich,
  };
}

// ── Provider ───────────────────────────────────────────────────────────────

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferredCurrency, setPreferredCurrency] = useState<"NGN" | "USD">(() => {
    try {
      const saved = localStorage.getItem(LS_KEYS.currency) as "NGN" | "USD" | null;
      return saved === "NGN" || saved === "USD" ? saved : "NGN";
    } catch {
      return "NGN";
    }
  });

  // Persist currency preference
  const setCurrencyPref = useCallback((c: "NGN" | "USD") => {
    setPreferredCurrency(c);
    try { localStorage.setItem(LS_KEYS.currency, c); } catch {}
  }, []);

  const loadSubscription = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      // 1. If no user — fall back to cached or free
      if (!user) {
        const cached = loadLocalSubscription();
        if (cached) {
          setSubscription(cached);
        } else {
          setSubscription(getFreeSubscription(null));
          saveLocalSubscription(getFreeSubscription(null));
        }
        setLoading(false);
        return;
      }

      // 2. Fetch from Supabase FIRST (source of truth)
      const { data, error } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.warn("Subscription: Supabase fetch failed, falling back to localStorage:", error.message);
        const cached = loadLocalSubscription();
        if (cached) {
          cached.email = user.email ?? null;
          setSubscription(cached);
        } else {
          const free = getFreeSubscription(user.email ?? null);
          setSubscription(free);
          saveLocalSubscription(free);
        }
        setLoading(false);
        return;
      }

      if (data) {
        // Map legacy "agency" plan to "premium"
        const rawPlan = data.plan ?? "free";
        const plan: Plan = rawPlan === "agency" ? "premium" : (rawPlan as Plan);
        const config = PLAN_CONFIGS[plan] ?? PLAN_CONFIGS.free;
        const totalPurchased = data.total_purchased ?? (plan === "free" ? 0 : config.creditsOnSubscribe);

        // Fetch active subscription for currency info
        let subCurrency: "NGN" | "USD" | undefined;
        let customerCode: string | undefined;
        try {
          const { data: activeSub } = await supabase
            .from("subscriptions")
            .select("currency, paystack_customer_code")
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (activeSub) {
            subCurrency = activeSub.currency as "NGN" | "USD";
            customerCode = activeSub.paystack_customer_code;
          }
        } catch {}

        const sub: UserSubscription = {
          plan,
          creditsRemaining: data.credits_remaining ?? config.creditsOnSubscribe,
          totalPurchased,
          subscriptionEnd: data.subscription_end ?? null,
          email: user.email ?? null,
          status: data.status ?? "active",
          maxLeadsPerSearch: config.maxLeadsPerSearch,
          canEnrich: config.canEnrich,
          currency: subCurrency,
          paystackCustomerCode: customerCode,
        };
        setSubscription(sub);
        saveLocalSubscription(sub);
      } else {
        // No row in DB — user is on the free plan
        const free = {
          ...getFreeSubscription(user.email ?? null),
          totalPurchased: 0,
        };
        setSubscription(free);
        saveLocalSubscription(free);
      }
    } catch (err) {
      console.warn("Subscription: unexpected error, using localStorage:", err);
      const cached = loadLocalSubscription();
      if (cached) {
        setSubscription({ ...cached, email: user?.email ?? null });
      } else {
        setSubscription(getFreeSubscription(user?.email ?? null));
      }
    }

    setLoading(false);
  }, [user]);

  // Initial mount — show loading indicator
  useEffect(() => {
    loadSubscription(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // User changes — background refresh, no loading indicator.
  const prevUserId = useRef<string | undefined>(undefined);
  useEffect(() => {
    const id = user?.id;
    if (prevUserId.current !== id) {
      prevUserId.current = id;
      loadSubscription(false);
    }
  }, [user, loadSubscription]);

  const refreshSubscription = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  const canSearch = useCallback(() => {
    if (!subscription) return false;
    if (subscription.status !== "active") return false;
    return subscription.creditsRemaining > 0;
  }, [subscription]);

  const consumeCredit = useCallback(async (): Promise<boolean> => {
    if (!subscription || subscription.creditsRemaining <= 0) return false;

    const updated: UserSubscription = {
      ...subscription,
      creditsRemaining: subscription.creditsRemaining - 1,
    };

    setSubscription(updated);
    saveLocalSubscription(updated);

    // Persist to Supabase — MUST succeed to prevent credit refresh exploit
    if (user) {
      try {
        const { error } = await supabase
          .from("user_plans")
          .upsert(
            {
              user_id: user.id,
              credits_remaining: updated.creditsRemaining,
              plan: subscription.plan,
              status: subscription.status,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        if (error) {
          console.error("Subscription: failed to persist credit consumption:", error.message);
          // Revert local state on failure
          setSubscription(subscription);
          saveLocalSubscription(subscription);
          return false;
        }
      } catch (err) {
        console.error("Subscription: unexpected error persisting credit:", err);
        setSubscription(subscription);
        saveLocalSubscription(subscription);
        return false;
      }
    }

    return true;
  }, [subscription, user]);

  const hasFeature = useCallback(
    (feature: string) => {
      if (!subscription) return false;
      const config = PLAN_CONFIGS[subscription.plan];
      if (!config) return false;
      return config.features.some(
        (f) => f.toLowerCase() === feature.toLowerCase()
      );
    },
    [subscription]
  );

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        refreshSubscription,
        canSearch,
        consumeCredit,
        hasFeature,
        preferredCurrency,
        setPreferredCurrency: setCurrencyPref,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}