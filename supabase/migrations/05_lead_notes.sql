-- Add JSONB column for CRM-style lead notes
ALTER TABLE saved_leads ADD COLUMN IF NOT EXISTS lead_notes JSONB DEFAULT '[]'::jsonb;