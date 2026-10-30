-- ──────────────────────────────────────────────────────────────────────
-- 12_enriched_business.sql
-- Tier-2 provider enrichment (Apify / Dropleads) — firmographic details
-- found for a lead (company, domain, industry, size, location).
-- Mirrors the enriched_* JSONB pattern from 04_enrichment_columns.sql so
-- business data rides along on page load exactly like emails/phones do.
-- Additive + idempotent. Safe to run on production.
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE saved_leads
  ADD COLUMN IF NOT EXISTS enriched_business JSONB DEFAULT '{}'::jsonb;
