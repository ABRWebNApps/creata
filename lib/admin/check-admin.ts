import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function getAuthUser(req: NextRequest) {
  // 1. Authorization header takes priority (set by admin login page / AdminGuard)
  let token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null;

  // 2. Fallback: try Supabase auth cookies
  if (!token) {
    for (const cookie of req.cookies.getAll()) {
      if (cookie.name.endsWith('-auth-token') && cookie.name.startsWith('sb-')) {
        try {
          const parsed = JSON.parse(decodeURIComponent(cookie.value));
          if (parsed[0]) {
            token = parsed[0];
            break;
          }
        } catch {
          continue;
        }
      }
    }
  }

  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('user_id, role')
    .eq('user_id', user.id)
    .single();

  if (!admin) return null;

  return { ...user, admin_role: admin.role };
}