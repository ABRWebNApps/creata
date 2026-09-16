import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthUser } from "@/lib/admin/check-admin";

export async function GET(req: NextRequest) {
  const authed = await getAuthUser(req);
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // ── Real payment data ────────────────────────────────────
    const { data: payments, error: payErr } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("status", "success")
      .order("created_at", { ascending: false });

    if (payErr) throw payErr;

    // ── Subscriptions count ──────────────────────────────────
    const { data: activeSubs, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("id, plan, currency")
      .eq("status", "active");

    if (subErr) throw subErr;

    // ── User plans ───────────────────────────────────────────
    const { data: plansData, error: plansErr } = await supabaseAdmin
      .from("user_plans")
      .select("*")
      .neq("plan", "free");

    if (plansErr) throw plansErr;

    // Compute revenue from actual payments
    let totalRevenueUSD = 0;
    let totalRevenueNGN = 0;
    let totalRevenueInUSD = 0;
    const paymentList = (payments ?? []).map(p => {
      if (p.currency === "USD") totalRevenueUSD += p.amount;
      else if (p.currency === "NGN") totalRevenueNGN += p.amount;
      // Approx USD conversion for total display
      totalRevenueInUSD += p.currency === "USD" ? p.amount : p.amount / 1500;
      return {
        email: p.email,
        plan: p.plan,
        amount: p.amount,
        currency: p.currency,
        date: p.created_at,
        reference: p.paystack_reference,
      };
    });

    // Plan distribution
    let basicCount = 0;
    let proCount = 0;
    let premiumCount = 0;
    for (const p of plansData ?? []) {
      if (p.plan === "basic") basicCount++;
      else if (p.plan === "pro") proCount++;
      else if (p.plan === "premium" || p.plan === "agency") premiumCount++;
    }

    const subscriptionDistribution = {
      basic: (activeSubs ?? []).filter(s => s.plan === "basic").length,
      pro: (activeSubs ?? []).filter(s => s.plan === "pro").length,
      premium: (activeSubs ?? []).filter(s => s.plan === "premium").length,
    };

    return NextResponse.json({
      total_revenue: Math.round(totalRevenueInUSD * 100) / 100,
      total_revenue_usd: totalRevenueUSD,
      total_revenue_ngn: totalRevenueNGN,
      total_subscribers: (activeSubs ?? []).length,
      basic_count: basicCount,
      pro_count: proCount,
      premium_count: premiumCount,
      subscription_distribution: subscriptionDistribution,
      recent_payments: paymentList.slice(0, 50),
      payment_count: paymentList.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}