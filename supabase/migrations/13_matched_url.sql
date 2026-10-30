-- ──────────────────────────────────────────────────────────────────────
-- 13_matched_url.sql
-- Source post for a matched signal. Tab B leads are COMMENT AUTHORS, and the
-- matching comment was scraped from a post — this stores that post's URL so
-- the UI can offer a "Source" button straight to the evidence.
-- Additive + idempotent. Safe to run on production.
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE saved_leads
  ADD COLUMN IF NOT EXISTS matched_url TEXT;

-- Optional: which mode produced the lead, so the UI can label honestly.
--   'commenter' | 'commenter-broad'  → Tab B (comment author is the lead)
--   'author'                         → Tab A (post author is the lead)
ALTER TABLE saved_leads
  ADD COLUMN IF NOT EXISTS lead_kind TEXT;

-- Optional: age (days) of the matched comment/post at scrape time.
ALTER TABLE saved_leads
  ADD COLUMN IF NOT EXISTS matched_age_days INTEGER;

COMMENT ON COLUMN saved_leads.matched_url IS 'URL of the post/comment the signal was scraped from (Source button)';
COMMENT ON COLUMN saved_leads.lead_kind IS 'commenter | commenter-broad | author';
COMMENT ON COLUMN saved_leads.matched_age_days IS 'Age in days of the matched comment/post at scrape time';
