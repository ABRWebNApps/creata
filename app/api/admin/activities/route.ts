import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getAuthUser } from '@/lib/admin/check-admin';

export async function GET(req: NextRequest) {
  const authed = await getAuthUser(req);
  if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const userIdFilter = searchParams.get('user_id');
  const actionFilter = searchParams.get('action');
  const emailFilter = searchParams.get('email');

  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (userIdFilter) query = query.eq('user_id', userIdFilter);
  if (actionFilter) query = query.eq('action', actionFilter);
  if (emailFilter) query = query.ilike('email', `%${emailFilter}%`);

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data,
    total: count ?? 0,
    page,
    limit,
    total_pages: count ? Math.ceil(count / limit) : 0,
  });
}