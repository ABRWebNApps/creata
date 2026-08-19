-- ============================================================
-- PRODUCTION FIX: user_plans table hardening
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add missing columns for admin status/credit management
ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'blocked')),
  ADD COLUMN IF NOT EXISTS status_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Fix typo in service role policy (user_plums → user_plans)
DROP POLICY IF EXISTS "Service role full access" ON user_plans;

CREATE POLICY "Service role full access"
  ON user_plans
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Users can insert their own plan row (for upsert on first credit use)
CREATE POLICY "Users can insert own plan"
  ON user_plans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Ensure updated_at auto-updates (function already exists, recreate trigger safely)
DROP TRIGGER IF EXISTS set_updated_at ON user_plans;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON user_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Verify structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_plans'
ORDER BY ordinal_position;