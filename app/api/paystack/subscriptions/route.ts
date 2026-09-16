import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthUser } from "@/lib/admin/check-admin";

/**
 * GET /api/paystack/subscriptions
 * Returns all active subscriptions for the current user (or all users if admin).
 */
export async function GET(request: NextRequest) {
  try {
    const authed = await getAuthUser(request);
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = !!authed.admin_role;

    let query = supabaseAdmin
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isAdmin) {
      query = query.eq("user_id", authed.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Also fetch payments
    let paymentsQuery = supabaseAdmin
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!isAdmin) {
      paymentsQuery = paymentsQuery.eq("user_id", authed.id);
    }

    const { data: payments } = await paymentsQuery;

    return NextResponse.json({
      subscriptions: data ?? [],
      payments: payments ?? [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/paystack/subscriptions
 * Manage subscription: cancel, pause, resume
 * Body: { action: "cancel" | "pause" | "resume", subscription_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authed = await getAuthUser(request);
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, subscription_id } = await request.json();

    if (!action || !subscription_id) {
      return NextResponse.json(
        { error: "Missing required fields: action, subscription_id" },
        { status: 400 }
      );
    }

    // Fetch the subscription and verify ownership
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("id", subscription_id)
      .single();

    if (subErr || !sub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    // Verify ownership (or admin)
    const isAdmin = !!authed.admin_role;
    if (sub.user_id !== authed.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    switch (action) {
      case "cancel": {
        // If NGN with Paystack sub code, cancel via Paystack API
        if (sub.paystack_subscription_code && sub.currency === "NGN") {
          const paystackRes = await fetch(
            `https://api.paystack.co/subscription/${sub.paystack_subscription_code}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ status: "cancelled" }),
            }
          );
          const paystackData = await paystackRes.json();
          if (!paystackData.status) {
            console.warn("Paystack cancel warning:", paystackData.message);
          }
        }

        // Update local DB
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription_id);

        // If no other active subscriptions, revert user to free
        const { data: otherActive } = await supabaseAdmin
          .from("subscriptions")
          .select("id")
          .eq("user_id", sub.user_id)
          .eq("status", "active")
          .neq("id", subscription_id)
          .limit(1);

        if (!otherActive || otherActive.length === 0) {
          await supabaseAdmin
            .from("user_plans")
            .update({
              plan: "free",
              credits_remaining: 1,
              subscription_end: null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", sub.user_id);
        }

        break;
      }

      case "pause": {
        // Only for NGN subscriptions via Paystack
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "paused", updated_at: new Date().toISOString() })
          .eq("id", subscription_id);
        break;
      }

      case "resume": {
        await supabaseAdmin
          .from("subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", subscription_id);
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Log activity
    await supabaseAdmin.from("activity_logs").insert({
      user_id: sub.user_id,
      email: authed.email,
      action: "subscribe",
      details: {
        action,
        subscription_id,
        plan: sub.plan,
        currency: sub.currency,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}