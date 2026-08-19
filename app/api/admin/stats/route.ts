import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/admin/check-admin';

export async function GET(req: NextRequest) {
  const authed = await getAuthUser(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [
    { count: total_users },
    { count: active_today },
    { count: searches_today },
    { data: plansData },
    { count: suspended_count },
    { count: blocked_count },
  ] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers().then(r => ({ count: r.data?.users?.length ?? 0 })),
    supabaseAdmin.from('activity_logs').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabaseAdmin.from('activity_logs').select('id', { count: 'exact', head: true }).eq('action', 'search').gte('created_at', todayISO),
    supabaseAdmin.from('user_plans').select('plan').neq('plan', 'free'),
    supabaseAdmin.from('user_plans').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
    supabaseAdmin.from('user_plans').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
  ]);

  return NextResponse.json({
    total_users,
    active_today: active_today ?? 0,
    total_searches_today: searches_today ?? 0,
    total_revenue: (plansData ?? []).length,
    suspended_count: suspended_count ?? 0,
    blocked_count: blocked_count ?? 0,
  });
}