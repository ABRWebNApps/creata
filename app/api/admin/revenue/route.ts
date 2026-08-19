import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/admin/check-admin';

const PLAN_PRICES: Record<string, number> = {
  basic: 10.99,
  agency: 40.99,
};

export async function GET(req: NextRequest) {
  const authed = await getAuthUser(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Get all non-free plans
    const { data: plansData, error: plansErr } = await supabaseAdmin
      .from('user_plans')
      .select('*')
      .neq('plan', 'free')
      .order('updated_at', { ascending: false });

    if (plansErr) {
      return NextResponse.json({ error: plansErr.message }, { status: 500 });
    }

    // Get all auth users to resolve emails
    const { data: authUsers, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    const userEmailMap = new Map<string, string>();
    for (const u of authUsers.users) {
      userEmailMap.set(u.id, u.email ?? 'unknown@email.com');
    }

    const plans = plansData ?? [];

    let basic_count = 0;
    let agency_count = 0;

    for (const p of plans) {
      if (p.plan === 'basic') basic_count++;
      else if (p.plan === 'agency') agency_count++;
    }

    const total_subscribers = basic_count + agency_count;
    const total_revenue = basic_count * PLAN_PRICES.basic + agency_count * PLAN_PRICES.agency;

    const recent_payments = plans.map((p) => ({
      email: userEmailMap.get(p.user_id) ?? 'unknown@email.com',
      plan: p.plan,
      amount: PLAN_PRICES[p.plan] ?? 0,
      date: p.updated_at ?? p.created_at,
      reference: p.id,
    }));

    return NextResponse.json({
      total_revenue,
      total_subscribers,
      basic_count,
      agency_count,
      recent_payments,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}