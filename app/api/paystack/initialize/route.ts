import { NextRequest, NextResponse } from "next/server";
import { PLAN_PRICING } from "@/lib/paystack";
import type { PlanId } from "@/lib/paystack";

/**
 * POST /api/paystack/initialize
 * Original one-time payment init (kept for backward compatibility).
 * For subscriptions, use /api/paystack/initialize-subscription instead.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, plan: planId, amount, currency } = await request.json();

    if (!email || !planId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: email, plan, amount" },
        { status: 400 }
      );
    }

    // Validate plan
    const pricing = PLAN_PRICING[planId as PlanId];
    if (!pricing || pricing.usd === 0) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${Object.keys(PLAN_PRICING).filter(k => PLAN_PRICING[k as PlanId].usd > 0).join(", ")}` },
        { status: 400 }
      );
    }

    const useCurrency = currency || "USD";
    const amountInMajor = useCurrency === "NGN" ? pricing.ngn : amount;
    const amountInKobo = useCurrency === "NGN"
      ? pricing.ngn * 100
      : Math.round(amountInMajor * 100);

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        currency: useCurrency,
        metadata: { plan: planId, currency: useCurrency, is_subscription: false },
      }),
    });

    const data = await paystackResponse.json();

    if (!paystackResponse.ok) {
      return NextResponse.json(
        { error: data.message || "Paystack initialization failed" },
        { status: paystackResponse.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Paystack initialize error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}