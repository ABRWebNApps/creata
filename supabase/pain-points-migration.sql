-- Add pain_points column to saved_leads for storing AI-suggested pain points per lead
ALTER TABLE saved_leads ADD COLUMN IF NOT EXISTS pain_points JSONB DEFAULT '[]'::jsonb;

-- Add linkedin to platform check constraint
ALTER TABLE saved_leads DROP CONSTRAINT IF EXISTS saved_leads_platform_check;
ALTER TABLE saved_leads ADD CONSTRAINT saved_leads_platform_check 
  CHECK (platform = ANY (ARRAY['tiktok', 'instagram', 'x', 'linkedin']));