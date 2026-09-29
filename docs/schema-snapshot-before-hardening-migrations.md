# Schema snapshot before new hardening migrations

Captured from checked-in SQL only on 2026-09-29 before adding migrations 07 and 08. No live database was accessed, so this is not a production schema dump. Compare against the Supabase project before applying any migration.

| Existing object | Source files | Observed purpose / known fields |
|---|---|---|
| `user_plans` | `supabase/migration.sql`, `complete-migration.sql`, `admin-migration.sql`, `migrations/06_account_geo_currency.sql` | User plan/credits/status, plus country_code, currency, geo_source, signup_ip_hash |
| `saved_leads` | `supabase/complete-migration.sql`, `categories-migration.sql`, `pain-points-migration.sql`, `migration-buying-signals.sql`, migrations 04/05 | Saved social leads, category, enrichment, pain points, notes |
| `admin_users`, `activity_logs` | `supabase/admin-migration.sql`, `complete-migration.sql` | Admin authorization and activity records |
| `paystack_plans`, `subscriptions`, `payments` | `supabase/paystack-integration.sql` | Plan pricing, subscription lifecycle, payment references |
| `lead_categories` | `supabase/categories-migration.sql` | Lead categories |
| `lead_emails`, `lead_phones`, `lead_aliases`, `osint_queries` | `supabase/migrations/03_osint_enrichment.sql` | Enrichment results and query cache |
| `shown_leads` | `supabase/09_shown_leads_dedup.sql` | Search deduplication |

The SQL files are historical setup scripts and do not prove the exact currently deployed schema or RLS policies. New migrations below are additive; rollback scripts are separate and must be manually reviewed before use.
