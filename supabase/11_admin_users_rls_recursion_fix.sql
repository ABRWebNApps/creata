-- ═══════════════════════════════════════════════════════════════════
-- 11_admin_users_rls_recursion_fix.sql
-- Fix: Postgres 42P17 "infinite recursion detected in policy for
--      relation admin_users".
--
-- ROOT CAUSE
--   Two shapes of recursive policy:
--   (a) A policy ON admin_users whose USING clause SELECTs from
--       admin_users  → evaluating the policy re-enters itself.
--       e.g. USING (auth.uid() IN (SELECT user_id FROM admin_users))
--   (b) Same thing hidden behind an EXISTS(...FROM admin_users)
--       subquery — file 10 left one of these in the
--       "Superadmin can manage admin_users" policy, so the recursion
--       survived even after is_admin() was introduced.
--
-- FIX
--   ALL admin_users lookups inside policies go through
--   SECURITY DEFINER helpers that run with row_security = off.
--   No policy body may SELECT from admin_users directly.
--
-- Idempotent. Run ONCE in Supabase SQL Editor
-- (Dashboard → SQL Editor → paste → Run).
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. SECURITY DEFINER helpers (RLS disabled inside the function)
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND role = 'superadmin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin()      FROM public;
REVOKE ALL ON FUNCTION public.is_superadmin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- 2. admin_users policies — function-only bodies (no direct SELECT)
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin users can read admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins read admin_users"          ON public.admin_users;
CREATE POLICY "Admin users can read admin_users" ON public.admin_users
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Superadmin can manage admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Superadmin manage admin_users"     ON public.admin_users;
CREATE POLICY "Superadmin can manage admin_users" ON public.admin_users
  FOR ALL USING (public.is_superadmin());

-- ─────────────────────────────────────────────────────────────────
-- 3. Dependent-table policies that referenced admin_users directly
--    (these recurse too, via admin_users' own SELECT policy)
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can read all logs" ON public.activity_logs;
CREATE POLICY "Admins can read all logs" ON public.activity_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins read all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read all payments" ON public.payments;
CREATE POLICY "Admins read all payments" ON public.payments
  FOR SELECT USING (public.is_admin());

-- NOTE: no admin policy is added for saved_leads. Leads are read/written
-- through the service-role client (RLS bypassed) in app/api/leads/*, so a
-- saved_leads policy is unnecessary — and its RLS state is not managed by
-- any migration, so touching it here could error.

-- ─────────────────────────────────────────────────────────────────
-- 4. Verification — run each block separately, expect no errors
-- ─────────────────────────────────────────────────────────────────
-- (a) helpers answer without recursion:
--     SELECT public.is_admin(), public.is_superadmin();

-- (b) admin_users is readable (this is the query that used to 42P17):
--     SELECT user_id, role FROM public.admin_users;

-- (c) no policy body still references admin_users directly.
--     MUST return zero rows after this migration:
--     SELECT schemaname, tablename, policyname
--     FROM pg_policies
--     WHERE (qual       LIKE '%FROM admin_users%'
--         OR  with_check LIKE '%FROM admin_users%')
--       AND tablename = 'admin_users';

-- (d) list every admin_users policy and its helper:
--     SELECT policyname, cmd, qual
--     FROM pg_policies WHERE tablename = 'admin_users';
--
-- NOTE: this migration only fixes RLS. The "supabaseKey is required" /
-- empty-results errors are a SEPARATE issue — the service-role key must
-- be named SUPABASE_SERVICE_ROLE_KEY on Vercel (no NEXT_PUBLIC_ prefix).
-- ═══════════════════════════════════════════════════════════════════
