#!/usr/bin/env node
// ── USD Subscription Renewal & Reminder Cron ───────────────────────
// Runs daily via Hermes cron. Checks for:
//  - USD subscriptions due in 7 days → send reminder
//  - USD subscriptions due in 1 day  → send urgent reminder
//  - USD subscriptions overdue       → expire the subscription
//  - NGN subscriptions expired       → revert to free plan
//
// If reminder service unavailable (no SMS/email API), just logs.
// Requires: PAYSTACK_SECRET_KEY in env

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing Supabase env vars");
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // ── 1. USD subscriptions nearing renewal ─────────────────────
  const { data: usdDueSoon } = await supabase
    .from("subscriptions")
    .select("*, auth_users:user_id(email)")
    .eq("currency", "USD")
    .eq("status", "active")
    .lte("next_due_date", new Date(now.getTime() + 8 * 86400000).toISOString())
    .gte("next_due_date", now.toISOString());

  if (usdDueSoon && usdDueSoon.length > 0) {
    for (const sub of usdDueSoon) {
      const dueDate = new Date(sub.next_due_date);
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

      if (daysUntil === 7) {
        console.log(`REMINDER: ${sub.email} — ${sub.plan} (USD) due in 7 days`);
        // Log activity so admin sees it
        await supabase.from("activity_logs").insert({
          user_id: sub.user_id,
          email: sub.email,
          action: "admin_action",
          details: {
            event: "renewal_reminder_7d",
            plan: sub.plan,
            currency: "USD",
            due_date: sub.next_due_date,
          },
        });
      } else if (daysUntil === 1) {
        console.log(`URGENT: ${sub.email} — ${sub.plan} (USD) due tomorrow`);
        await supabase.from("activity_logs").insert({
          user_id: sub.user_id,
          email: sub.email,
          action: "admin_action",
          details: {
            event: "renewal_reminder_1d",
            plan: sub.plan,
            currency: "USD",
            due_date: sub.next_due_date,
          },
        });
      }
    }
  }

  // ── 2. USD subscriptions past due → expire ──────────────────
  const { data: usdOverdue } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("currency", "USD")
    .eq("status", "active")
    .lt("next_due_date", now.toISOString());

  if (usdOverdue && usdOverdue.length > 0) {
    for (const sub of usdOverdue) {
      console.log(`EXPIRING: ${sub.email} — ${sub.plan} (USD) — overdue`);

      await supabase
        .from("subscriptions")
        .update({
          status: "expired",
          updated_at: now.toISOString(),
        })
        .eq("id", sub.id);

      // Check if user has any other active subscription
      const { data: otherActive } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", sub.user_id)
        .eq("status", "active")
        .neq("id", sub.id)
        .limit(1);

      if (!otherActive || otherActive.length === 0) {
        await supabase
          .from("user_plans")
          .update({
            plan: "free",
            credits_remaining: 1,
            subscription_end: null,
            updated_at: now.toISOString(),
          })
          .eq("user_id", sub.user_id);

        console.log(`  → Reverted ${sub.email} to free plan`);
      }
    }
  }

  // ── 3. NGN expired subscriptions → revert ───────────────────
  const { data: ngnExpired } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("currency", "NGN")
    .eq("status", "active")
    .lt("current_period_end", now.toISOString());

  // Note: Paystack handles NGN subscription expiry via webhooks.
  // This is a safety net in case webhooks miss something.
  if (ngnExpired && ngnExpired.length > 0) {
    for (const sub of ngnExpired) {
      // First check if Paystack still considers it active
      if (sub.paystack_subscription_code) {
        try {
          const res = await fetch(
            `https://api.paystack.co/subscription/${sub.paystack_subscription_code}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              },
            }
          );
          const paystackSub = await res.json();
          // If Paystack says it's active, skip our expiry
          if (paystackSub.status && paystackSub.data?.status === "active") {
            // Extend the period end by 1 day and continue
            await supabase
              .from("subscriptions")
              .update({
                current_period_end: new Date(
                  new Date(sub.current_period_end).getTime() + 86400000
                ).toISOString(),
                updated_at: now.toISOString(),
              })
              .eq("id", sub.id);
            continue;
          }
        } catch {
          // If Paystack check fails, proceed with expiry
        }
      }

      console.log(`EXPIRING NGN: ${sub.email} — ${sub.plan} (NGN)`);
      await supabase
        .from("subscriptions")
        .update({ status: "expired", updated_at: now.toISOString() })
        .eq("id", sub.id);

      // Revert to free
      const { data: otherActive } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", sub.user_id)
        .eq("status", "active")
        .neq("id", sub.id)
        .limit(1);

      if (!otherActive || otherActive.length === 0) {
        await supabase
          .from("user_plans")
          .update({ plan: "free", credits_remaining: 1, subscription_end: null, updated_at: now.toISOString() })
          .eq("user_id", sub.user_id);
      }
    }
  }

  console.log("Cron finished: checked renewals, reminders, and expirations");
}

main().catch(err => {
  console.error("Cron error:", err);
  process.exit(1);
});