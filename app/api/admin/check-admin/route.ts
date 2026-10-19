import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  // Read token from Authorization header (set by admin login page)
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    console.error('[admin/check-admin] auth.getUser failed:', error?.message);
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: admin, error: adminError } = await supabaseAdmin
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  // Surface lookup errors as 500 (not swallowed 403) so the real cause is visible
  if (adminError) {
    console.error('[admin/check-admin] admin_users lookup failed:', adminError.message);
    return NextResponse.json({ error: 'Admin lookup failed: ' + adminError.message }, { status: 500 });
  }

  if (!admin) return NextResponse.json({ error: 'Not an admin' }, { status: 403 });

  return NextResponse.json({ admin: true, role: admin.role });
}