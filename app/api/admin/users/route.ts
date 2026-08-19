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
    }));

    return NextResponse.json(users);
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const authed = await getAuthUser(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { user_id, status, status_reason, credits_remaining } = body;
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