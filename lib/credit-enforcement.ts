// ── Centralized credit check and deduction for all search endpoints ──
// Every search route MUST use this to ensure consistent plan-based enforcement.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

const PLAN_LEAD_CAPS: Record<string, number> = {
  free: 20,
  basic: 20,
  pro: 30,
  premium: 40,
};

const PLANS_WITH_ENRICHMENT = new Set(["pro", "premium"]);

export interface CreditCheckResult {
  allowed: boolean;
  creditsRemaining: number;
  maxLeadsPerSearch: number;
  canEnrich: boolean;
  error?: string;
}

export async function checkAndDeductCredits(
  userId: string,
  cost: number = 1
): Promise<CreditCheckResult> {
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await adminClient
    .from("user_plans")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      allowed: false,
      creditsRemaining: 0,
      maxLeadsPerSearch: 20,
      canEnrich: false,
      error: "No plan found",
    };
  }

  if (data.status !== "active") {
    return {
      allowed: false,
      creditsRemaining: data.credits_remaining ?? 0,
      maxLeadsPerSearch: PLAN_LEAD_CAPS[data.plan] ?? 20,
      canEnrich: PLANS_WITH_ENRICHMENT.has(data.plan),
      error: "Account is not active",
    };
  }

  const remaining = data.credits_remaining ?? 0;
  if (remaining < cost) {
    return {
      allowed: false,
      creditsRemaining: remaining,
      maxLeadsPerSearch: PLAN_LEAD_CAPS[data.plan] ?? 20,
      canEnrich: PLANS_WITH_ENRICHMENT.has(data.plan),
      error: "Insufficient credits",
    };
  }

  // Deduct credits
  const { error: deductError } = await adminClient
    .from("user_plans")
    .update({
      credits_remaining: remaining - cost,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (deductError) {
    return {
      allowed: false,
      creditsRemaining: remaining,
      maxLeadsPerSearch: PLAN_LEAD_CAPS[data.plan] ?? 20,
      canEnrich: PLANS_WITH_ENRICHMENT.has(data.plan),
      error: "Failed to deduct credit",
    };
  }

  // Log the deduction for audit (silent fail on error)
  try {
    await adminClient
      .from("activity_logs")
      .insert({
        user_id: userId,
        action: "search_credit_deduct",
        details: JSON.stringify({
          cost,
          remaining_before: remaining,
          remaining_after: remaining - cost,
          plan: data.plan,
        }),
        created_at: new Date().toISOString(),
      });
  } catch {
    // silent — audit logging is best-effort
  }

  return {
    allowed: true,
    creditsRemaining: remaining - cost,
    maxLeadsPerSearch: PLAN_LEAD_CAPS[data.plan] ?? 20,
    canEnrich: PLANS_WITH_ENRICHMENT.has(data.plan),
  };
}

// ── Top-up helper ────────────────────────────────────────────────────────
// $5 minimum = 2 credits. Configurable rate.
export const TOP_UP_RATE_PER_CREDIT = 2.5; // $2.50 per credit (so $5 = 2 credits)

export function creditsForTopUp(amountUsd: number): number {
  return Math.floor(amountUsd / TOP_UP_RATE_PER_CREDIT);
}