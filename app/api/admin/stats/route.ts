import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/admin/check-admin';

export async function GET(req: NextRequest) {
  const authed = await getAuthUser(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const [
    // All users count
    { count: totalUsers },
    // Active today
    { count: activeToday },
    // Searches today
    { count: searchesToday },
    // Suspended
    { count: suspendedCount },
    // Blocked
    { count: blockedCount },
    // Paid users
    { data: paidPlans },
    // Revenue from payments table (successful)
    { data: payments },
    // Searches in last 30 days (for cost estimation)
    { count: searchesMonth },
    // Activity today (for dashboard feed)
    { data: recentActivity },
    // Searches last 7 days for chart
    { data: searchesWeek },
    // Totals per plan
    { data: planDistribution },
    // USD subscriptions count
    { data: usdSubs },
    // NGN subscriptions
    { data: ngnSubs },
  ] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers().then(r => ({ count: r.data?.users?.length ?? 0 })),
    supabaseAdmin.from('activity_logs').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabaseAdmin.from('activity_logs').select('id', { count: 'exact', head: true }).eq('action', 'search').gte('created_at', todayISO),
    supabaseAdmin.from('user_plans').select('*', { count: 'exact', head: true }).eq('status', 'suspended'),
    supabaseAdmin.from('user_plans').select('*', { count: 'exact', head: true }).eq('status', 'blocked'),
    supabaseAdmin.from('user_plans').select('plan').neq('plan', 'free'),
    supabaseAdmin.from('payments').select('amount, currency, created_at').eq('status', 'success'),
    supabaseAdmin.from('activity_logs').select('id', { count: 'exact', head: true }).eq('action', 'search').gte('created_at', monthAgo),
    supabaseAdmin.from('activity_logs').select('id, email, action, created_at, details').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('activity_logs').select('created_at').eq('action', 'search').gte('created_at', weekAgo),
    supabaseAdmin.from('subscriptions').select('plan').eq('status', 'active'),
    supabaseAdmin.from('subscriptions').select('id').eq('status', 'active').eq('currency', 'USD'),
    supabaseAdmin.from('subscriptions').select('id').eq('status', 'active').eq('currency', 'NGN'),
  ]);

  // ── Real revenue calculation ─────────────────────────────
  let revenueUSD = 0;
  let revenueNGN = 0;
  let revenueUSDApprox = 0;
  for (const p of payments ?? []) {
    if (p.currency === 'USD') { revenueUSD += p.amount; revenueUSDApprox += p.amount; }
    else if (p.currency === 'NGN') { revenueNGN += p.amount; revenueUSDApprox += p.amount / 1500; }
  }

  // ── Daily search counts for chart (last 7 days) ──────────
  const dailySearches: Record<string, number> = {};
  for (const s of searchesWeek ?? []) {
    const day = new Date(s.created_at).toISOString().split('T')[0];
    dailySearches[day] = (dailySearches[day] || 0) + 1;
  }

  // ── Plan distribution ────────────────────────────────────
  const planCounts: Record<string, number> = { free: 0, basic: 0, pro: 0, premium: 0 };
  for (const p of paidPlans ?? []) {
    const plan = p.plan === 'agency' ? 'premium' : p.plan;
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  }
  const totalPaid = (paidPlans ?? []).length;

  // ── Active subscription counts ───────────────────────────
  const subCounts: Record<string, number> = {};
  for (const s of planDistribution ?? []) {
    subCounts[s.plan] = (subCounts[s.plan] || 0) + 1;
  }

  // ── Cost per request (estimate based on OpenRouter/API costs) ──
  // Average cost per search: ~$0.10 for AI enrichment + platform fee
  const avgCostPerSearch = 0.10;
  const todayCost = Math.round((searchesToday ?? 0) * avgCostPerSearch * 100) / 100;
  const monthCost = Math.round((searchesMonth ?? 0) * avgCostPerSearch * 100) / 100;

  return NextResponse.json({
    total_users: totalUsers ?? 0,
    active_today: activeToday ?? 0,
    total_searches_today: searchesToday ?? 0,
    total_searches_month: searchesMonth ?? 0,
    total_revenue: Math.round(revenueUSDApprox * 100) / 100,
    revenue_usd: revenueUSD,
    revenue_ngn: revenueNGN,
    total_paid_users: totalPaid,
    suspended_count: suspendedCount ?? 0,
    blocked_count: blockedCount ?? 0,
    active_subscriptions: (usdSubs ?? []).length + (ngnSubs ?? []).length,
    usd_subscriptions: (usdSubs ?? []).length,
    ngn_subscriptions: (ngnSubs ?? []).length,
    daily_searches: dailySearches,
    plan_distribution: planCounts,
    subscription_breakdown: subCounts,
    today_cost: todayCost,
    month_cost: monthCost,
    avg_cost_per_search: avgCostPerSearch,
    recent_activity: (recentActivity ?? []).map(a => ({
      id: a.id,
      email: a.email,
      action: a.action,
      details: a.details,
      timestamp: a.created_at,
    })),
  });
}