import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/admin/check-admin';
import { PLAN_PRICING } from '@/lib/paystack';
import type { PlanId } from '@/lib/paystack';

/**
 * PATCH /api/admin/plan-change
 * Admin: manually change a user's plan, credits, and subscription status.
 * Body: { user_id, plan, credits?, status? }
 */
export async function PATCH(req: NextRequest) {
  const authed = await getAuthUser(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id, plan, credits, status } = await req.json();

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  // Validate plan if provided
  if (plan && !PLAN_PRICING[plan as PlanId]) {
    return NextResponse.json({
      error: `Invalid plan. Must be one of: ${Object.keys(PLAN_PRICING).join(', ')}`,
    }, { status: 400 });
  }

  const updateFields: Record<string, any> = { updated_at: new Date().toISOString() };

  if (plan) updateFields.plan = plan;
  if (credits !== undefined) updateFields.credits_remaining = Math.max(0, credits);
  if (status) updateFields.status = status;

  // If switching to a paid plan, auto-set subscription_end to 30 days
  if (plan && plan !== 'free') {
    updateFields.subscription_end = new Date(Date.now() + 30 * 86400000).toISOString();
  } else if (plan === 'free') {
    updateFields.credits_remaining = 1;
    updateFields.subscription_end = null;
  }

  const { error: upsertErr } = await supabaseAdmin
    .from('user_plans')
    .upsert({ user_id, ...updateFields }, { onConflict: 'user_id' });

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  // Log the change
  await supabaseAdmin.from('activity_logs').insert({
    user_id,
    email: authed.email,
    action: 'admin_plan_change',
    details: JSON.stringify({
      changed_by: authed.email,
      new_plan: plan || null,
      new_credits: credits ?? null,
      new_status: status || null,
    }),
    ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown',
  });

  return NextResponse.json({
    success: true,
    ...updateFields,
  });
}