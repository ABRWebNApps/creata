# Hardening configuration notes

## Country and currency

- The geo lookup calls `ipapi.co` with a 1.5-second timeout and falls back to unknown country + USD.
- Geo works without a required environment setting: it prefers the ingress-provided `X-Real-IP`, then the conventional leftmost public `X-Forwarded-For` entry; it skips private/loopback values and falls back to USD if lookup fails. If the host provides proxy hop addresses and you want right-to-left trusted-hop parsing, `TRUSTED_PROXY_IPS` accepts a comma-separated exact-IP list. Confirm your host's forwarded-header behavior before production; CIDR ranges are not supported.
- `SIGNUP_IP_HASH_SALT` is optional and server-only. Without it, no IP hash is stored.
- NGN prices have explicit build-time overrides: `NEXT_PUBLIC_BASIC_PRICE_NGN`, `NEXT_PUBLIC_PRO_PRICE_NGN`, `NEXT_PUBLIC_PREMIUM_PRICE_NGN`. Defaults preserve existing displayed values: 15,000 / 35,000 / 60,000 NGN.
- `NEXT_PUBLIC_NGN_USD_REFERENCE_RATE` is a reference field only. No automatic FX conversion is performed. Owner must confirm the NGN schedule and reference rate before production.

## Consent and data processors

No analytics/advertising tag was found in the reviewed app source. The consent component stores choices locally and attempts to persist the same versioned record for signed-in users. Analytics/marketing integrations must call `allowsOptionalScript` and load only after an affirmative choice. The draft privacy page identifies observed integrations but deliberately leaves provider retention, data role, hosting region, and transfer details for owner/legal confirmation.

## Search quality

The quality stage requires `OPENROUTER_API_KEY`; the key must remain server-only. Calls are batched, capped by a 12-second timeout, retried once for transient errors, schema-validated, and rejected on failure. Profiles are cached in process for 24 hours up to 5,000 entries. The upstream search adapters currently return fewer than five recent captions or none, so evidence depth is below the requested target and must be improved before interpreting precision results.
