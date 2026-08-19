-- ═══════════════════════════════════════════════════════════════
-- Lead Categories Migration
-- Run once in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- 1. Lead categories table
CREATE TABLE IF NOT EXISTS lead_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_lead_categories_user_id ON lead_categories(user_id);

ALTER TABLE lead_categories ENABLE ROW LEVEL SECURITY;

-- Users can manage their own categories
CREATE POLICY "Users manage own categories" ON lead_categories
  FOR ALL USING (auth.uid() = user_id);

-- 2. Add category_id to saved_leads (nullable — uncategorized leads still work)
ALTER TABLE saved_leads ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES lead_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_saved_leads_category_id ON saved_leads(category_id);