-- shown_leads table: tracks which leads have been shown to which user
-- Used to prevent showing the same lead twice across searches

CREATE TABLE IF NOT EXISTS shown_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram', 'x', 'linkedin', 'facebook')),
  handle TEXT NOT NULL,
  shown_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, handle)
);

-- Index for fast lookup when filtering
CREATE INDEX IF NOT EXISTS idx_shown_leads_user_id ON shown_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_shown_leads_user_platform ON shown_leads(user_id, platform);

-- Enable RLS
ALTER TABLE shown_leads ENABLE ROW LEVEL SECURITY;

-- Users can read their own shown_leads
CREATE POLICY "Users can read own shown_leads"
  ON shown_leads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own shown_leads
CREATE POLICY "Users can insert own shown_leads"
  ON shown_leads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());