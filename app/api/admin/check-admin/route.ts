import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  // Read token from Authorization header (set by admin login page)
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!admin) return NextResponse.json({ error: 'Not an admin' }, { status: 403 });

  return NextResponse.json({ admin: true, role: admin.role });
}