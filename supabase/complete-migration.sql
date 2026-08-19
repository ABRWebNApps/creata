-- ═══════════════════════════════════════════════════════════════
-- COMPLETE Creata Database Setup
-- Run ONCE in Supabase SQL Editor. Safe to re-run (idempotent).
-- ═══════════════════════════════════════════════════════════════

-- 1. USER PLANS — credits, subscriptions, account status
CREATE TABLE IF NOT EXISTS user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'agency')),
  credits_remaining INTEGER NOT NULL DEFAULT 1,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  subscription_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked')),
  status_reason TEXT,
  status_changed_at TIMESTAMPTZ,
  rate_limit_max INTEGER DEFAULT 0,
  rate_limit_window INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

-- Users: read own plan, update own plan (for credit consumption)
CREATE POLICY "Users read own plan" ON user_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own plan" ON user_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. ADMIN USERS
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'moderator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read admin_users" ON admin_users
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM admin_users));
CREATE POLICY "Superadmin manage admin_users" ON admin_users
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'superadmin'));

-- 3. ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read all logs" ON activity_logs
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- 4. AUTO-CREATE user_plans row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_plans (user_id, plan, credits_remaining, total_purchased)
  VALUES (NEW.id, 'free', 1, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON user_plans;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON user_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. log_activity helper function (callable from SQL)
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_email TEXT,
  p_action TEXT,
  p_details JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO activity_logs (user_id, email, action, details, ip_address)
  VALUES (p_user_id, p_email, p_action, p_details, p_ip_address)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;