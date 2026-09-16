-- ═══════════════════════════════════════════════════════════════
-- Paystack Subscriptions Integration — Recurring (NGN + USD)
-- Run ONCE in Supabase SQL Editor. Fully idempotent.
-- ═══════════════════════════════════════════════════════════════

-- 0. Fix user_plans CHECK constraint to support new plan names
ALTER TABLE user_plans DROP CONSTRAINT IF EXISTS user_plans_plan_check;
ALTER TABLE user_plans ADD CONSTRAINT user_plans_plan_check
  CHECK (plan IN ('free', 'basic', 'pro', 'premium', 'agency'));

-- ═══════════════════════════════════════════════════════════════
-- 1. PAYSTACK PLANS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS paystack_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  amount_ngn INTEGER NOT NULL DEFAULT 0,
  amount_usd INTEGER NOT NULL DEFAULT 0,
  interval TEXT NOT NULL DEFAULT 'monthly',
  currency TEXT NOT NULL DEFAULT 'NGN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add missing columns in case table existed from partial run
ALTER TABLE paystack_plans ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';

-- ═══════════════════════════════════════════════════════════════
-- 2. SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  paystack_subscription_code TEXT UNIQUE,
  paystack_customer_code TEXT,
  authorization_code TEXT,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'expired', 'trialing', 'paused')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  next_due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add missing columns
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS authorization_code TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_due_date TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Make subscription_code unique for existing rows (nulls don't compete)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_plan_currency
  ON subscriptions(user_id, plan, currency)
  WHERE status = 'active';

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users: read own subscriptions
CREATE POLICY "Users read own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Admin: read all subscriptions
CREATE POLICY "Admins read all subscriptions" ON subscriptions
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- ═══════════════════════════════════════════════════════════════
-- 3. PAYMENTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  plan TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount INTEGER NOT NULL,
  amount_kobo INTEGER NOT NULL,
  paystack_reference TEXT UNIQUE NOT NULL,
  paystack_transaction_id BIGINT,
  status TEXT NOT NULL DEFAULT 'success',
  payment_type TEXT NOT NULL DEFAULT 'subscription',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely add missing columns
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_kobo INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paystack_transaction_id BIGINT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'subscription';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users: read own payments
CREATE POLICY "Users read own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Admin: read all payments
CREATE POLICY "Admins read all payments" ON payments
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- ═══════════════════════════════════════════════════════════════
-- 4. TRIGGERS
-- ═══════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS set_updated_at_subscriptions ON subscriptions;
CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();