"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

// ── Types ──────────────────────────────────────────────────────────────────

export type Plan = "free" | "basic" | "pro" | "premium";

export type UserSubscription = {
  plan: Plan;
  creditsRemaining: number;
  totalPurchased: number;
  subscriptionEnd: string | null;
  email: string | null;
  status: "active" | "suspended" | "blocked";
  maxLeadsPerSearch: number;
  canEnrich: boolean;
};

export type PlanConfig = {
  id: Plan;
  name: string;
  price: number;
  creditsOnSubscribe: number;
  maxLeadsPerSearch: number;
  canEnrich: boolean;
  features: string[];
  emoji: string;
};

// ── Plan configurations ────────────────────────────────────────────────────

export const PLAN_CONFIGS: Record<Plan, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    creditsOnSubscribe: 1,
    maxLeadsPerSearch: 20,
    canEnrich: false,
    features: ["one free credit", "save & export leads", "leads outreach"],
    emoji: "🎁",
  },
  basic: {
    id: "basic",
    name: "Basic",
    price: 11,
    creditsOnSubscribe: 15,
    maxLeadsPerSearch: 20,
    canEnrich: false,
    features: [
      "15 search credits",
      "social media lead ranking",
      "verification badges",
      "save & export leads",
      "leads outreach",
      "top-up credits available",
    ],
    emoji: "🚀",
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 25,
    creditsOnSubscribe: 35,
    maxLeadsPerSearch: 30,
    canEnrich: true,
    features: [
      "35 search credits",
      "lead extracting",
      "email finder",
      "enrich lead data",
      "save & export leads",
      "leads outreach",
      "priority support",
      "top-up credits available",
      "buying-signal insight (comment + caption)",
    ],
    emoji: "⚡",
  },
  premium: {
    id: "premium",
    name: "Premium",
    price: 40,
    creditsOnSubscribe: 50,
    maxLeadsPerSearch: 40,
    canEnrich: true,
    features: [
      "50 search credits",
      "lead extracting",
      "email finder",
      "enrich lead data",
      "save & export leads",
      "leads outreach",
      "priority support",
      "top-up credits available",
      "buying-signal insight (comment + caption)",
    ],
    emoji: "🔥",
  },
};

// ── Context shape ──────────────────────────────────────────────────────────

type SubscriptionContextType = {
  subscription: UserSubscription | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  canSearch: () => boolean;
  consumeCredit: () => Promise<boolean>;
  hasFeature: (feature: string) => boolean;
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
    localStorage.setItem(
      LS_KEYS.creditsRemaining,
      String(sub.creditsRemaining)
    );
    localStorage.setItem(LS_KEYS.totalPurchased, String(sub.totalPurchased));
    localStorage.setItem(
      LS_KEYS.subscriptionEnd,
      sub.subscriptionEnd ?? ""
    );
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
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [loading, setLoading] = useState(true);

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
        console.warn(
          "Subscription: Supabase fetch failed, falling back to localStorage:",
          error.message
        );
        // Fall back to whatever we have in localStorage
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
        const sub: UserSubscription = {
          plan,
          creditsRemaining: data.credits_remaining ?? config.creditsOnSubscribe,
          totalPurchased,
          subscriptionEnd: data.subscription_end ?? null,
          email: user.email ?? null,
          status: data.status ?? "active",
          maxLeadsPerSearch: config.maxLeadsPerSearch,
          canEnrich: config.canEnrich,
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
  // Guards against the mount double-run: only fires when user actually changes.
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
          // Revert local state on failure so the user sees the real count
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
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
}