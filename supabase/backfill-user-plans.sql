-- Backfill user_plans rows for existing users who signed up before the migration
-- Run this in Supabase SQL Editor

INSERT INTO user_plans (user_id, plan, credits_remaining, total_purchased, status)
SELECT 
  u.id,
  'free',
  1,
  0,
  'active'
FROM auth.users u
LEFT JOIN user_plans up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;