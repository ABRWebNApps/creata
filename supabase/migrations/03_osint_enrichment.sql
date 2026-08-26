-- Creata OSINT Engine — Database Migration
-- Creates tables for lead enrichment data (emails, phones, aliases, query dedup)
-- Run this in Supabase SQL Editor before using the enrich button

-- ──────────────────────────────────────────────────
-- 1. lead_emails — Emails discovered via OSINT enrichment
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES saved_leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'search_engine',
  source_url TEXT,
  confidence INTEGER DEFAULT 50,
  verified BOOLEAN DEFAULT FALSE,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, email)
);

-- Index for fast lookups by lead
CREATE INDEX IF NOT EXISTS idx_lead_emails_lead_id ON lead_emails(lead_id);

-- ──────────────────────────────────────────────────
-- 2. lead_phones — Phone numbers discovered via OSINT
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_phones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES saved_leads(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'search_engine',
  source_url TEXT,
  country TEXT,
  confidence INTEGER DEFAULT 50,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_lead_phones_lead_id ON lead_phones(lead_id);

-- ──────────────────────────────────────────────────
-- 3. lead_aliases — Cross-platform profiles discovered
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES saved_leads(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_handle TEXT,
  profile_url TEXT NOT NULL,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_lead_aliases_lead_id ON lead_aliases(lead_id);

-- ──────────────────────────────────────────────────
-- 4. osint_queries — Query dedup history
-- ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS osint_queries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES saved_leads(id) ON DELETE CASCADE,
  query_type TEXT NOT NULL,
  query_string TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  ran_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lead_id, query_type, query_string)
);

CREATE INDEX IF NOT EXISTS idx_osint_queries_lead_id ON osint_queries(lead_id);

-- Enable RLS on all tables
ALTER TABLE lead_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE osint_queries ENABLE ROW LEVEL SECURITY;

-- RLS: users can only read enrich data for their own leads
CREATE POLICY "Users can read their own lead emails"
  ON lead_emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saved_leads
      WHERE saved_leads.id = lead_emails.lead_id
      AND saved_leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read their own lead phones"
  ON lead_phones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saved_leads
      WHERE saved_leads.id = lead_phones.lead_id
      AND saved_leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read their own lead aliases"
  ON lead_aliases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saved_leads
      WHERE saved_leads.id = lead_aliases.lead_id
      AND saved_leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read their own osint queries"
  ON osint_queries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saved_leads
      WHERE saved_leads.id = osint_queries.lead_id
      AND saved_leads.user_id = auth.uid()
    )
  );

-- Admin service role can do everything (used by the engine via service_role key)
CREATE POLICY "Service role full access lead_emails"
  ON lead_emails FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access lead_phones"
  ON lead_phones FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access lead_aliases"
  ON lead_aliases FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access osint_queries"
  ON osint_queries FOR ALL
  USING (true)
  WITH CHECK (true);