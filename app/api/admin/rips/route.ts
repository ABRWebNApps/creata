import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/admin/check-admin';

export async function PATCH(req: NextRequest) {
  const authed = await getAuthUser(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { user_id, rips, action } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  if (action === 'set') {
    if (rips === undefined || rips < 0) {
      return NextResponse.json({ error: 'rips must be a non-negative number for action=set' }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('user_plans')
      .select('credits_remaining, plan')
      .eq('user_id', user_id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const { error: upsertErr } = await supabaseAdmin
      .from('user_plans')
      .upsert({
        user_id,
        credits_remaining: rips,
        plan: existing?.plan || 'free',
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    await supabaseAdmin.from('activity_logs').insert({
      user_id,
      email: authed.email,
      action: 'admin_set_rips',
      details: JSON.stringify({ changed_by: authed.email, new_rips: rips }),
      ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown',
    });

    return NextResponse.json({ success: true, rips });
  }

  if (action === 'add' || action === 'deduct') {
    const amount = Math.abs(rips || 0);
    if (amount === 0) {
      return NextResponse.json({ error: 'amount must be > 0 for add/deduct' }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('user_plans')
      .select('credits_remaining, plan')
      .eq('user_id', user_id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const currentRips = existing?.credits_remaining ?? 0;
    const newRips = action === 'add'
      ? currentRips + amount
      : Math.max(0, currentRips - amount);

    const { error: upsertErr } = await supabaseAdmin
      .from('user_plans')
      .upsert({
        user_id,
        credits_remaining: newRips,
        plan: existing?.plan || 'free',
        status: 'active',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    await supabaseAdmin.from('activity_logs').insert({
      user_id,
      email: authed.email,
      action: `admin_${action}_rips`,
      details: JSON.stringify({ changed_by: authed.email, amount, previous: currentRips, new_rips: newRips }),
      ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown',
    });

    return NextResponse.json({ success: true, previous: currentRips, new_rips: newRips });
  }

  return NextResponse.json({ error: 'action must be set, add, or deduct' }, { status: 400 });
}