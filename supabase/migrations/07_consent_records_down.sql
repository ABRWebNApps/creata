DROP POLICY IF EXISTS "Users update own consent" ON public.consent_records;
DROP POLICY IF EXISTS "Users insert own consent" ON public.consent_records;
DROP POLICY IF EXISTS "Users read own consent" ON public.consent_records;
DROP TABLE IF EXISTS public.consent_records;
