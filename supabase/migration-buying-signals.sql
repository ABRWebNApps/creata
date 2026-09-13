-- Add matched_comment and matched_caption columns to saved_leads for buying-signal capture
ALTER TABLE saved_leads 
ADD COLUMN IF NOT EXISTS matched_comment TEXT,
ADD COLUMN IF NOT EXISTS matched_caption TEXT;