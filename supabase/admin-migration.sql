-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'moderator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin users can read admin_users" ON admin_users FOR SELECT USING (auth.uid() IN (SELECT user_id FROM admin_users));
CREATE POLICY "Superadmin can manage admin_users" ON admin_users FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'superadmin'));

-- 2. Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read all logs" ON activity_logs FOR SELECT USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- 3. Blocked/suspended users tracking
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked'));
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS rate_limit_max INTEGER DEFAULT 0;
ALTER TABLE user_plans ADD COLUMN IF NOT EXISTS rate_limit_window INTEGER DEFAULT 60; -- seconds

-- 4. Function to log activity (callable from anywhere)
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