-- Manual rollback for migration 06. Review row values and application dependencies before running.
ALTER TABLE public.user_plans DROP COLUMN IF EXISTS signup_ip_hash;
ALTER TABLE public.user_plans DROP COLUMN IF EXISTS geo_source;
ALTER TABLE public.user_plans DROP COLUMN IF EXISTS country_code;
ALTER TABLE public.user_plans DROP COLUMN IF EXISTS currency;
