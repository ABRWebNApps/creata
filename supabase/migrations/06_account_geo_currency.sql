-- Additive account country/currency metadata; signup remains functional if deployment is pending.
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS country_code CHAR(2);
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS geo_source TEXT;
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS signup_ip_hash TEXT;

-- Rollback (run manually only if desired):
-- ALTER TABLE public.user_plans DROP COLUMN IF EXISTS country_code;
-- ALTER TABLE public.user_plans DROP COLUMN IF EXISTS currency;
-- ALTER TABLE public.user_plans DROP COLUMN IF EXISTS geo_source;
-- ALTER TABLE public.user_plans DROP COLUMN IF EXISTS signup_ip_hash;
