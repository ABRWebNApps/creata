import { NextRequest, NextResponse } from "next/server";
import { PLAN_PRICING } from "@/lib/paystack";
import type { PlanId } from "@/lib/paystack";

const PAYSTACK_API = "https://api.paystack.co/transaction/verify";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        { success: false, message: "Missing reference query parameter" },
        { status: 400 }
      );
    }

    const response = await fetch(`${PAYSTACK_API}/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!data.status) {
      return NextResponse.json(
        { success: false, message: data.message || "Paystack verification failed" },
        { status: 400 }
      );
    }

    const tx = data.data;
    const planId: PlanId = (tx.metadata?.plan || "basic") as PlanId;
    const currency = tx.currency || "USD";
    const pricing = PLAN_PRICING[planId];
    const credits = pricing?.creditsOnSubscribe ?? 15;
    const amount = currency === "NGN"
      ? Math.round(tx.amount / 100)
      : tx.amount / 100;

    return NextResponse.json({
      success: true,
      plan: planId,
      credits,
      amount,
      currency,
      reference: tx.reference,
      customer_email: tx.customer?.email,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}