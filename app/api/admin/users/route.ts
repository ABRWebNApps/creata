import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/admin/check-admin';

export async function GET(req: NextRequest) {
  const authed = await getAuthUser(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin.rpc('get_admin_users_list');

  if (error) {
    // fallback: manual join if RPC doesn't exist
    const { data: authUsers, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

    const userIds = authUsers.users.map(u => u.id);
    const [plansRes, adminsRes, logsRes, searchCountsRes] = await Promise.all([
      supabaseAdmin.from('user_plans').select('*').in('user_id', userIds),
      supabaseAdmin.from('admin_users').select('*').in('user_id', userIds),
      supabaseAdmin.from('activity_logs').select('user_id, created_at').in('user_id', userIds).order('created_at', { ascending: false }),
      supabaseAdmin.from('activity_logs').select('user_id').eq('action', 'search').in('user_id', userIds),
    ]);

    const plansMap = new Map((plansRes.data ?? []).map(p => [p.user_id, p]));
    const adminsSet = new Set((adminsRes.data ?? []).map(a => a.user_id));
    const lastActiveMap = new Map<string, string>();
    for (const log of logsRes.data ?? []) {
      if (!lastActiveMap.has(log.user_id)) lastActiveMap.set(log.user_id, log.created_at);
    }
    const searchCountMap = new Map<string, number>();
    for (const s of searchCountsRes.data ?? []) {
      searchCountMap.set(s.user_id, (searchCountMap.get(s.user_id) ?? 0) + 1);
    }

    const users = authUsers.users.map(u => ({
      id: u.id,
      email: u.email,
      plan: plansMap.get(u.id)?.plan ?? "free",
      credits_remaining: plansMap.get(u.id)?.credits_remaining ?? 1,
      status: plansMap.get(u.id)?.status ?? "active",
      is_admin: adminsSet.has(u.id),
      search_count: searchCountMap.get(u.id) ?? 0,
      last_active: lastActiveMap.get(u.id) ?? null,
      created_at: u.created_at,
      country_code: plansMap.get(u.id)?.country_code ?? null,
      currency: plansMap.get(u.id)?.currency ?? null,
      signup_date: u.created_at,
    }));

    return NextResponse.json(users);
  }

  const { data: geoRows } = await supabaseAdmin.from("user_plans").select("user_id,country_code,currency");
  const geoByUser = new Map((geoRows ?? []).map((row) => [row.user_id, row]));
  const enriched = Array.isArray(data) ? data.map((row: Record<string, unknown>) => {
    const userId = String(row.user_id ?? row.id ?? "");
    const geo = geoByUser.get(userId);
    return { ...row, country_code: geo?.country_code ?? null, currency: geo?.currency ?? null, signup_date: row.created_at ?? null };
  }) : data;
  return NextResponse.json(enriched);
}

export async function PATCH(req: NextRequest) {
  const authed = await getAuthUser(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { user_id, status, status_reason, credits_remaining, country_code, currency } = body;
  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const updateFields: Record<string, any> = {};

  if (status) {
    updateFields.status = status;
    updateFields.status_reason = status_reason || null;
    updateFields.status_changed_at = new Date().toISOString();
  }

  // Allow admin to set credits (positive = set to that amount)
  if (credits_remaining !== undefined) {
    updateFields.credits_remaining = credits_remaining;
  }

  if (country_code !== undefined || currency !== undefined) {
    if (country_code !== undefined && country_code !== null && (typeof country_code !== "string" || !/^[A-Z]{2}$/.test(country_code))) return NextResponse.json({ error: "country_code must be an ISO alpha-2 code or null" }, { status: 400 });
    if (currency !== undefined && !["NGN", "USD"].includes(currency)) return NextResponse.json({ error: "currency must be NGN or USD" }, { status: 400 });
    if (country_code !== undefined) updateFields.country_code = country_code;
    if (currency !== undefined) updateFields.currency = currency;
    updateFields.geo_source = "admin_override";
  }

  // Ensure plan is set for upsert
  if (!updateFields.plan) {
    updateFields.plan = 'free';
  }

  // If no specific fields besides plan/user_id, set plan default
  if (Object.keys(updateFields).length === 0) {
    updateFields.plan = 'free';
  }

  const { error: updateErr } = await supabaseAdmin
    .from('user_plans')
    .upsert({
      user_id,
      ...updateFields,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  await supabaseAdmin.from('activity_logs').insert({
    user_id,
    email: authed.email,
    action: 'admin_update_user_status',
    details: JSON.stringify({ changed_by: authed.email, new_status: status, reason: status_reason }),
    ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown',
  });

  return NextResponse.json({ success: true });
}
