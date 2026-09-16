import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { PLAN_PRICING, ensurePaystackPlan, paystackApi } from "@/lib/paystack";
import type { PlanId } from "@/lib/paystack";

/**
 * POST /api/paystack/initialize-subscription
 * Creates a Paystack subscription (NGN recurring or USD one-time setup).
 * For NGN: creates a Paystack plan + returns subscription authorization URL.
 * For USD: creates a one-time charge with next-due tracking metadata.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, plan: planId, currency } = await request.json();

    if (!email || !planId || !currency) {
      return NextResponse.json(
        { error: "Missing required fields: email, plan, currency" },
        { status: 400 }
      );
    }

    const pricing = PLAN_PRICING[planId as PlanId];
    if (!pricing || pricing.usd === 0) {
      return NextResponse.json({ error: `Invalid plan: ${planId}` }, { status: 400 });
    }

    if (currency !== "NGN" && currency !== "USD") {
      return NextResponse.json({ error: "Currency must be NGN or USD" }, { status: 400 });
    }

    // ── Get or create Paystack customer ──────────────────────
    let customerCode: string;

    // Check if customer already exists
    const { data: existingCus } = await supabaseAdmin
      .from("subscriptions")
      .select("paystack_customer_code")
      .eq("email", email)
      .not("paystack_customer_code", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingCus?.paystack_customer_code) {
      customerCode = existingCus.paystack_customer_code;
    } else {
      // Find or create customer on Paystack
      const customers = await paystackApi<any[]>("GET", `/customer?email=${encodeURIComponent(email)}`);
      if (customers && customers.length > 0) {
        customerCode = customers[0].customer_code;
      } else {
        const newCus = await paystackApi<{ customer_code: string }>("POST", "/customer", {
          email,
          first_name: email.split("@")[0],
        });
        customerCode = newCus.customer_code;
      }
    }

    // Save customer code
    await supabaseAdmin
      .from("subscriptions")
      .update({ paystack_customer_code: customerCode })
      .eq("email", email)
      .is("paystack_customer_code", null);

    if (currency === "NGN") {
      // ── NGN: Paystack native recurring subscription ─────────
      // 1. Ensure plan exists on Paystack
      const planCode = await ensurePaystackPlan(planId as PlanId, "NGN");

      // 2. First, charge the customer once to get an authorization
      // (Paystack requires an authorization to create a subscription)
      const amountKobo = pricing.ngn * 100;

      const charge = await paystackApi<{
        authorization_url: string;
        access_code: string;
        reference: string;
      }>("POST", "/transaction/initialize", {
        email,
        amount: amountKobo,
        currency: "NGN",
        plan: planCode,
        metadata: {
          plan: planId,
          currency: "NGN",
          is_subscription: true,
        },
        callback_url: "https://www.creata.tech/pricing",
      });

      return NextResponse.json({
        authorization_url: charge.authorization_url,
        reference: charge.reference,
        plan: planId,
        currency: "NGN",
      });
    } else {
      // ── USD: One-time setup with manual recurring tracking ──
      const amountCents = Math.round(pricing.usd * 100);

      const charge = await paystackApi<{
        authorization_url: string;
        access_code: string;
        reference: string;
      }>("POST", "/transaction/initialize", {
        email,
        amount: amountCents,
        currency: "USD",
        metadata: {
          plan: planId,
          currency: "USD",
          is_subscription: true,
          next_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        callback_url: "https://www.creata.tech/pricing",
      });

      return NextResponse.json({
        authorization_url: charge.authorization_url,
        reference: charge.reference,
        plan: planId,
        currency: "USD",
      });
    }
  } catch (error: any) {
    console.error("Paystack subscription init error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}