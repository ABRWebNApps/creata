-- ═══════════════════════════════════════════════════════════════════
-- 10_prod_admin_onboarding_fix.sql
-- Combined production fix: missing tables, admin RLS recursion fix,
-- admin row, backfill, verification. ALL idempotent.
-- Run ONCE in Supabase SQL Editor (Dashboard → SQL Editor).
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Account geo/currency columns (migration 06, safe re-run)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS country_code CHAR(2);
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS geo_source TEXT;
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS signup_ip_hash TEXT;

-- ─────────────────────────────────────────────────────────────────
-- 2. Consent records table (migration 07)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consent_records (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL,
  choices JSONB NOT NULL CHECK (jsonb_typeof(choices) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own consent" ON public.consent_records;
CREATE POLICY "Users read own consent" ON public.consent_records
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own consent" ON public.consent_records;
CREATE POLICY "Users insert own consent" ON public.consent_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own consent" ON public.consent_records;
CREATE POLICY "Users update own consent" ON public.consent_records
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- 3. Onboarding profiles table (migration 08)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT '',
  business_type TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  offer TEXT NOT NULL DEFAULT '',
  ideal_customer TEXT NOT NULL DEFAULT '',
  target_regions TEXT[] NOT NULL DEFAULT '{}',
  main_goal TEXT NOT NULL DEFAULT '',
  lead_volume TEXT NOT NULL DEFAULT '',
  acquisition_source TEXT NOT NULL DEFAULT '',
  completed_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own onboarding" ON public.onboarding_profiles;
CREATE POLICY "Users read own onboarding" ON public.onboarding_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own onboarding" ON public.onboarding_profiles;
CREATE POLICY "Users insert own onboarding" ON public.onboarding_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own onboarding" ON public.onboarding_profiles;
CREATE POLICY "Users update own onboarding" ON public.onboarding_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- 4. FIX: Recursive admin_users RLS → use SECURITY DEFINER helper
--    The old policy `auth.uid() IN (SELECT user_id FROM admin_users)`
--    on admin_users itself caused infinite recursion whenever a
--    table (subscriptions, payments, activity_logs) referenced
--    admin_users in its own policy. The subquery hit admin_users'
--    SELECT policy → re-entrant eval → PostgreSQL error.
-- ─────────────────────────────────────────────────────────────────

-- Security definer helper (runs as table owner, bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) $$;

-- Rewrite admin_users policies
DROP POLICY IF EXISTS "Admin users can read admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins read admin_users" ON public.admin_users;
CREATE POLICY "Admin users can read admin_users" ON public.admin_users
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Superadmin can manage admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Superadmin manage admin_users" ON public.admin_users;
CREATE POLICY "Superadmin can manage admin_users" ON public.admin_users
  FOR ALL USING (
    public.is_admin()
    AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'superadmin')
  );

-- Fix subscriptions admin policy (avoid admin_users subquery → re-entrant eval)
DROP POLICY IF EXISTS "Admins read all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins read all subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_admin());

-- Fix payments admin policy
DROP POLICY IF EXISTS "Admins read all payments" ON public.payments;
CREATE POLICY "Admins read all payments" ON public.payments
  FOR SELECT USING (public.is_admin());

-- Fix activity_logs admin policy
DROP POLICY IF EXISTS "Admins can read all logs" ON public.activity_logs;
CREATE POLICY "Admins can read all logs" ON public.activity_logs
  FOR SELECT USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────
-- 5. Add admin user for the affected account (ID from debug report)
--    Skip if already present (ON CONFLICT DO NOTHING)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.admin_users (user_id, role)
VALUES ('e4c96a65-edf1-42d6-bae9-74dc9a92ac6f', 'superadmin')
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 6. Backfill onboarding completed_at for users who saved data
--    but the flag was never set (migration gap).
-- ─────────────────────────────────────────────────────────────────
UPDATE public.onboarding_profiles
SET completed_at = updated_at
WHERE completed_at IS NULL
  AND (
    role != '' OR business_type != '' OR industry != ''
    OR offer != '' OR ideal_customer != '' OR target_regions != '{}'
    OR main_goal != '' OR lead_volume != '' OR acquisition_source != ''
  );

-- ═══════════════════════════════════════════════════════════════════
-- 7. Verification queries (copy each into SQL Editor separately)
-- ═══════════════════════════════════════════════════════════════════

-- -- Verify tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('admin_users','consent_records','onboarding_profiles','subscriptions','saved_leads','user_plans')
-- ORDER BY table_name;

-- -- Verify admin row for the production account:
-- SELECT r.user_id, r.role, u.email
-- FROM admin_users r
-- LEFT JOIN auth.users u ON u.id = r.user_id
-- WHERE r.user_id = 'e4c96a65-edf1-42d6-bae9-74dc9a92ac6f';

-- -- Verify is_admin() function works:
-- SELECT public.is_admin();

-- -- Verify subscription columns for the affected user:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'subscriptions'
--   AND column_name IN ('currency','paystack_customer_code');

-- -- Check for any recursive RLS evaluation errors:
-- -- (This should return rows without error if the fix worked)
-- -- SELECT user_id, plan, status FROM subscriptions LIMIT 1;
-- ═══════════════════════════════════════════════════════════════════

-- After running this SQL, verify SUPABASE_SERVICE_ROLE_KEY is set in
-- Vercel Production dashboard, then redeploy from the Vercel dashboard.
-- ═══════════════════════════════════════════════════════════════════