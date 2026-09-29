CREATE TABLE IF NOT EXISTS public.onboarding_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT '',
  business_type TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  offer TEXT NOT NULL DEFAULT '',
  ideal_customer TEXT NOT NULL DEFAULT '',
  target_regions TEXT[] NOT NULL DEFAULT '{}',
  main_goal TEXT NOT NULL DEFAULT '',
  lead_volume TEXT NOT NULL DEFAULT '',
  acquisition_source TEXT NOT NULL DEFAULT '',
  completed_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own onboarding" ON public.onboarding_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own onboarding" ON public.onboarding_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own onboarding" ON public.onboarding_profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
