import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyWebhookSignature, creditUserPlan, PLAN_PRICING } from "@/lib/paystack";
import type { PlanId } from "@/lib/paystack";

/**
 * POST /api/paystack/webhook
 * Handles Paystack webhook events:
 *  - charge.success → grant credits, create subscription
 *  - subscription.create → log subscription
 *  - subscription.disable → mark cancelled
 *  - invoice.create/payment_failed → notify user
 *
 * IMPORTANT: Route handler config must disable body parsing
 * so we can read the raw body for signature verification.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Read raw body for signature verification ──────────────
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const { event: eventType, data } = event;

    // ── Event router ──────────────────────────────────────────
    switch (eventType) {

      // ── charge.success: user completed payment ────────────
      case "charge.success": {
        const tx = data;
        const metadata = tx.metadata || {};

        // Skip non-subscription charges
        if (!metadata.is_subscription && !metadata.plan) {
          return NextResponse.json({ status: "ignored" });
        }

        const planId = (metadata.plan || "basic") as PlanId;
        const currency = tx.currency as "NGN" | "USD";
        const email = tx.customer?.email;
        const userId = await resolveUserIdByEmail(email);
        const amountMajor = currency === "NGN"
          ? Math.round(tx.amount / 100)
          : tx.amount / 100;

        if (!userId) {
          console.warn("Webhook: no user found for email", email);
          return NextResponse.json({ status: "no_user" });
        }

        // ── Check for duplicate reference ──────────────────
        const { data: existing } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("paystack_reference", tx.reference)
          .maybeSingle();

        if (existing) {
          return NextResponse.json({ status: "duplicate" });
        }

        // ── Record the payment ─────────────────────────────
        const nextDue = metadata.next_due
          ? new Date(metadata.next_due)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const { data: payment, error: payErr } = await supabaseAdmin
          .from("payments")
          .insert({
            user_id: userId,
            email,
            plan: planId,
            currency,
            amount: amountMajor,
            amount_kobo: tx.amount,
            paystack_reference: tx.reference,
            paystack_transaction_id: tx.id,
            status: "success",
            payment_type: "subscription",
            period_start: new Date().toISOString(),
            period_end: nextDue.toISOString(),
            metadata: {
              plan: planId,
              authorization_code: tx.authorization?.authorization_code,
              customer_code: tx.customer?.customer_code,
            },
          })
          .select("id")
          .single();

        if (payErr) {
          console.error("Failed to record payment:", payErr);
          return NextResponse.json({ error: payErr.message }, { status: 500 });
        }

        // ── Create/update subscription record ──────────────
        const authCode = tx.authorization?.authorization_code;
        const customerCode = tx.customer?.customer_code;
        const subCode = tx.plan?.subscription_code || tx.subscription_code;

        await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              plan: planId,
              currency,
              email,
              paystack_subscription_code: subCode || null,
              paystack_customer_code: customerCode,
              authorization_code: authCode || null,
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: nextDue.toISOString(),
              next_due_date: nextDue,
            },
            { onConflict: "user_id, plan, currency" }
          );

        // ── Credit the user's plan ─────────────────────────
        await creditUserPlan(userId, planId);

        // Log activity
        await supabaseAdmin.from("activity_logs").insert({
          user_id: userId,
          email,
          action: "subscribe",
          details: { plan: planId, currency, amount: amountMajor, reference: tx.reference },
        });

        return NextResponse.json({ status: "ok" });
      }

      // ── subscription.create: Paystack confirms subscription ──
      case "subscription.create": {
        const sub = data;
        const planCode = sub.plan?.plan_code;
        const email = sub.customer?.email;
        const userId = await resolveUserIdByEmail(email);

        if (!userId) return NextResponse.json({ status: "no_user" });

        // Extract plan info from our cache
        const { data: paystackPlan } = await supabaseAdmin
          .from("paystack_plans")
          .select("name")
          .eq("plan_code", planCode)
          .maybeSingle();

        const planName = paystackPlan?.name || "basic";
        // Extract plan ID from name like "Creata Basic (NGN)"
        const planId = planName.toLowerCase().includes("pro")
          ? "pro" : planName.toLowerCase().includes("premium")
          ? "premium" : "basic";
        const currency = planName.includes("USD") ? "USD" : "NGN";

        await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              plan: planId,
              currency,
              email,
              paystack_subscription_code: sub.subscription_code,
              paystack_customer_code: sub.customer?.customer_code,
              authorization_code: sub.authorization?.authorization_code,
              status: "active",
              current_period_start: sub.current_period_start,
              current_period_end: sub.next_payment_date,
              created_at: new Date().toISOString(),
            },
            { onConflict: "user_id, plan, currency" }
          );

        return NextResponse.json({ status: "ok" });
      }

      // ── subscription.disable: cancelled or expired ──────────
      case "subscription.disable": {
        const sub = data;
        const subCode = sub.subscription_code;
        const email = sub.customer?.email;

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: sub.cancelled_at ? "cancelled" : "expired",
            cancelled_at: sub.cancelled_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("paystack_subscription_code", subCode);

        // Also set user_plans to free if no other active sub
        if (email) {
          const userId = await resolveUserIdByEmail(email);
          if (userId) {
            const { data: activeSubs } = await supabaseAdmin
              .from("subscriptions")
              .select("id")
              .eq("user_id", userId)
              .eq("status", "active")
              .limit(1);

            if (!activeSubs || activeSubs.length === 0) {
              await supabaseAdmin
                .from("user_plans")
                .update({
                  plan: "free",
                  credits_remaining: 1,
                  subscription_end: null,
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", userId);
            }
          }
        }

        return NextResponse.json({ status: "ok" });
      }

      // ── invoice.payment_failed: charge failed ─────────────
      case "invoice.payment_failed": {
        const inv = data;
        const email = inv.customer?.email;
        console.warn(`Payment failed for ${email}: ${inv.transaction?.message}`);

        // Log for admin visibility
        if (email) {
          const userId = await resolveUserIdByEmail(email);
          if (userId) {
            await supabaseAdmin.from("activity_logs").insert({
              user_id: userId,
              email,
              action: "admin_action",
              details: {
                event: "payment_failed",
                message: inv.transaction?.message,
                reference: inv.transaction?.reference,
              },
            });
          }
        }

        return NextResponse.json({ status: "logged" });
      }

      default:
        // Acknowledge unhandled events — Paystack expects 200
        return NextResponse.json({ status: "unhandled" });
    }
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Helper: Resolve user ID from email ───────────────────────

async function resolveUserIdByEmail(email: string): Promise<string | null> {
  if (!email) return null;

  // Query auth.users via admin API — list all and find by email
  try {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (user) return user.id;
  } catch {}

  // Last resort: try user_plans where user's auth email matches
  try {
    const { data: allPlans } = await supabaseAdmin
      .from("user_plans")
      .select("user_id")
      .limit(500);
    if (allPlans && allPlans.length > 0) {
      const ids = allPlans.map(p => p.user_id);
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const match = authUsers?.users?.find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (match) return match.id;
    }
  } catch {}

  return null;
}