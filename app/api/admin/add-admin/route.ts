import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  // Superadmin check — read auth token from header
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (!admin || admin.role !== 'superadmin') {
    return NextResponse.json({ error: 'Only superadmins can add new admins' }, { status: 403 });
  }

  const { email, role = 'admin' } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  // Find user by email
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const targetUser = users?.users?.find(u => u.email === email);
  if (!targetUser) return NextResponse.json({ error: 'No user found with that email' }, { status: 404 });

  // Check if already admin
  const { data: existing } = await supabaseAdmin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', targetUser.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: 'User is already an admin' }, { status: 409 });

  const { error: insertErr } = await supabaseAdmin
    .from('admin_users')
    .insert({ user_id: targetUser.id, role });

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}