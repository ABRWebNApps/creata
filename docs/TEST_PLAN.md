CREATA OWNER TEST PLAN — local hardening branch

1. Apply supabase/migrations/06_account_geo_currency.sql in the Supabase SQL editor before testing signup geolocation.
2. Set SUPABASE_SERVICE_ROLE_KEY server-side (never NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY). Optionally set SIGNUP_IP_HASH_SALT to a random private value; without it no IP hash is retained.
3. Test new signup from a Nigerian public IP: user_plans should record NG + NGN; from US/GB public IP: country code + USD. Signup must still succeed if ipapi.co is unavailable (USD fallback). Existing rows must remain unchanged on a repeated call/VPN change.
4. Confirm /api/account/geo returns 401 without a bearer access token; verify the page does not expose server-only keys in DevTools Sources/Network.
5. Verify auth/sign-in, search each existing platform, save/remove leads, category flows, subscription/pricing, Paystack verification, enrichment, and admin pages with authorized accounts.
6. Inspect browser console and Network tab on public landing, auth, dashboard/search, leads, pricing, settings, and admin routes. Log genuine errors in docs/BUGLOG.md; do not suppress console output.
7. For lead quality, label at least 20 results each across furniture, solar installers, dentists, and other target queries. Report measured precision and realtor/media false positives; do not state a precision target passed until that evaluation is actually run.

Known limitation: browser E2E/console review and live Supabase integration need the owner's authenticated local session and database migration. No signup or paid API test was run to avoid creating accounts or consuming credits.
