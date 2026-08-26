-- Add JSONB columns to store enriched contact data directly on saved_leads
-- This avoids needing separate lead_emails/lead_phones table migrations
-- and makes enrichment data always available on page load

ALTER TABLE saved_leads ADD COLUMN IF NOT EXISTS enriched_emails JSONB DEFAULT '[]'::jsonb;
ALTER TABLE saved_leads ADD COLUMN IF NOT EXISTS enriched_phones JSONB DEFAULT '[]'::jsonb;
ALTER TABLE saved_leads ADD COLUMN IF NOT EXISTS enriched_aliases JSONB DEFAULT '[]'::jsonb;
ALTER TABLE saved_leads ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;