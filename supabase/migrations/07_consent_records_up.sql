CREATE TABLE IF NOT EXISTS public.consent_records (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL,
  choices JSONB NOT NULL CHECK (jsonb_typeof(choices) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own consent" ON public.consent_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own consent" ON public.consent_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own consent" ON public.consent_records
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
