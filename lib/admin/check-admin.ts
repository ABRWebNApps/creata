import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';

export async function getAuthUser(req: NextRequest) {
  let token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;

  if (token) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user) {
      const { data: admin } = await supabaseAdmin
        .from('admin_users')
        .select('user_id, role')
        .eq('user_id', user.id)
        .single();
      if (admin) return { ...user, admin_role: admin.role };
    }
  }

  // Fallback: use SSR client to extract user from cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user: u2 } } = await supabase.auth.getUser();
  if (!u2) return null;

  const { data: admin } = await supabaseAdmin
    .from('admin_users')
    .select('user_id, role')
    .eq('user_id', u2.id)
    .single();
  if (!admin) return null;

  return { ...u2, admin_role: admin.role };
}