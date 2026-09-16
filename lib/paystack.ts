// ── Shared Paystack library ──────────────────────────────────────
// Single source of truth for plans, API calls, and webhook verification

import { supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

// ── Plan Config ─────────────────────────────────────────────────

export type PlanId = "free" | "basic" | "pro" | "premium";

export type PlanPricing = {
  id: PlanId;
  name: string;
  usd: number;          // USD per month
  ngn: number;          // NGN per month
  creditsOnSubscribe: number;
  maxLeadsPerSearch: number;
  canEnrich: boolean;
  features: string[];
  emoji: string;
};

export const PLAN_PRICING: Record<PlanId, PlanPricing> = {
  free: {
    id: "free", name: "Free", usd: 0, ngn: 0,
    creditsOnSubscribe: 1, maxLeadsPerSearch: 20, canEnrich: false,
    features: ["one free credit", "save & export leads", "leads outreach"],
    emoji: "🎁",
  },
  basic: {
    id: "basic", name: "Basic", usd: 11, ngn: 15000,
    creditsOnSubscribe: 15, maxLeadsPerSearch: 20, canEnrich: false,
    features: [
      "15 search credits", "social media lead ranking",
      "verification badges", "save & export leads",
      "leads outreach", "top-up credits available",
    ],
    emoji: "🚀",
  },
  pro: {
    id: "pro", name: "Pro", usd: 25, ngn: 35000,
    creditsOnSubscribe: 35, maxLeadsPerSearch: 30, canEnrich: true,
    features: [
      "35 search credits", "lead extracting", "email finder",
      "enrich lead data", "save & export leads", "leads outreach",
      "priority support", "top-up credits available",
      "buying-signal insight (comment + caption)",
    ],
    emoji: "⚡",
  },
  premium: {
    id: "premium", name: "Premium", usd: 40, ngn: 60000,
    creditsOnSubscribe: 50, maxLeadsPerSearch: 40, canEnrich: true,
    features: [
      "50 search credits", "lead extracting", "email finder",
      "enrich lead data", "save & export leads", "leads outreach",
      "priority support", "top-up credits available",
      "buying-signal insight (comment + caption)",
    ],
    emoji: "🔥",
  },
};

export const PLAN_LEAD_CAPS: Record<string, number> = {
  free: 20, basic: 20, pro: 30, premium: 40, agency: 40,
};

export const PLANS_WITH_ENRICHMENT = new Set(["pro", "premium"]);

// ── Paystack API helper ─────────────────────────────────────────

const PAYSTACK_API = "https://api.paystack.co";

function getSecret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY not set");
  return key;
}

function paystackHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getSecret()}`,
    "Content-Type": "application/json",
  };
}

/**
 * Call any Paystack API endpoint. Throws on HTTP or Paystack error.
 */
export async function paystackApi<T = any>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: Record<string, any>
): Promise<T> {
  const opts: RequestInit = {
    method,
    headers: paystackHeaders(),
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${PAYSTACK_API}${path}`, opts);
  const data = await res.json();

  if (!data.status) {
    throw new Error(`Paystack error: ${data.message || JSON.stringify(data)}`);
  }
  return data.data as T;
}

// ── Webhook signature verification ─────────────────────────────

/**
 * Verify a Paystack webhook event using HMAC-SHA512.
 * Returns the parsed event body, or null if verification fails.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string = getSecret()
): boolean {
  if (!signature || !rawBody) return false;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}

// ── Subscription helpers ────────────────────────────────────────

export type PaystackPlanInfo = {
  plan_code: string;
  name: string;
  amount: number;    // In kobo/cents
  currency: string;
  interval: string;
};

/**
 * Create or find a Paystack plan matching our pricing.
 * Uses DB cache to avoid duplicate plan creation.
 */
export async function ensurePaystackPlan(
  planId: PlanId,
  currency: "NGN" | "USD"
): Promise<string> {
  const pricing = PLAN_PRICING[planId];
  if (!pricing || (pricing.usd === 0 && pricing.ngn === 0)) throw new Error("Free plan has no Paystack plan");

  const amount = currency === "NGN" ? pricing.ngn * 100 : Math.round(pricing.usd * 100);
  const name = `Creata ${pricing.name} (${currency})`;

  // Check DB cache first
  const { data: existing } = await supabaseAdmin
    .from("paystack_plans")
    .select("plan_code")
    .eq("name", name)
    .maybeSingle();

  if (existing) return existing.plan_code;

  // Create on Paystack
  const plan = await paystackApi<{ plan_code: string }>("POST", "/plan", {
    name,
    amount,
    interval: "monthly",
    currency,
  });

  // Cache in DB
  await supabaseAdmin.from("paystack_plans").insert({
    plan_code: plan.plan_code,
    name,
    amount_ngn: currency === "NGN" ? amount : 0,
    amount_usd: currency === "USD" ? amount : 0,
    interval: "monthly",
    currency,
  });

  return plan.plan_code;
}

/**
 * Credit a user's account after successful payment.
 * Updates user_plans with the plan + credits.
 */
export async function creditUserPlan(
  userId: string,
  planId: PlanId,
  creditsToAdd?: number
) {
  const pricing = PLAN_PRICING[planId];
  if (!pricing) throw new Error(`Unknown plan: ${planId}`);

  const credits = creditsToAdd ?? pricing.creditsOnSubscribe;
  const now = new Date().toISOString();
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("user_plans")
    .upsert(
      {
        user_id: userId,
        plan: planId,
        credits_remaining: credits,
        total_purchased: pricing.creditsOnSubscribe,
        subscription_end: thirtyDaysLater,
        status: "active",
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

  if (error) throw new Error(`Failed to credit plan: ${error.message}`);
}