# Creata hardening BUGLOG

Baseline captured 2026-09-29. Branch: `hardening/v1`. No push/deploy/PR.

| ID | Area | Severity (P0-P3) | Symptom | Root cause | Fix | Status | Test proving fix |
|---|---|---:|---|---|---|---|---|
| H-001 | Secrets | P1 | Service-role credential configured under a `NEXT_PUBLIC_` env name | Next.js exposes `NEXT_PUBLIC_*` values to browser bundles; service-role key bypasses RLS | Moved server-only reads to `SUPABASE_SERVICE_ROLE_KEY`; renamed local env key without printing its value | Fixed locally | Static search confirms no service-role `NEXT_PUBLIC_` references; production build pending |
| H-002 | TypeScript/X search | P2 | Typecheck failed on `threadsProfileUrl` | Inferred candidate type omitted optional property assigned/read downstream | Explicitly typed candidate shape | Fixed locally | `npx tsc --noEmit` passes |
| H-003 | Cookie/legal consent | P2 | No policy-versioned consent/settings or legal pages found | Feature absent | Added versioned necessary/optional choices, first-party cookie, logged-in persistence endpoint, global settings link, and draft legal pages | Implemented locally; migration and counsel/owner review pending | Consent unit tests pass; manually exercise fresh profile, version bump, DB persistence, and script gate |
| H-004 | Signup geo/currency | P2 | Signup country lock and admin reporting were missing | Original code trusted leftmost XFF and could skip email-confirmed signup | Resolve after signup; use rightmost public XFF hop by default (optional exact proxy skip list), lock currency once, add admin aggregates/override and explicit NGN prices | Partial; host header behavior, pricing confirmation, migration application and live signup need owner verification | Geo tests cover default, optional proxy skip, country mapping and fallback; live Supabase integration remains |
| H-005 | Onboarding | P2 | No onboarding profile flow/table or prompt context found | Feature absent | Added three-step save/resume profile, validation, account edit link, search prompt context, and admin breakdown | Implemented locally; migration 08 and live integration pending | Typecheck/build pass; authenticated save/resume/prompt integration checklist remains |
| H-006 | Search relevance / evidence reports | P1 | Keyword retrieval could admit irrelevant profiles; no measured precision evidence | Upstream search adapters return limited profile evidence (often fewer than five captions) | Added query understanding, negative adjacency map, pre-score media/adjacency rejects, batched strict JSON LLM gate, weighted thresholds/cache/fail-closed behavior, and evidence/caution report UI | Partial; live 200-result labeled evaluation and richer upstream captions/site/review/cadence evidence remain open | Synthetic unit tests pass; do not claim production precision or furniture 0-false-positive benchmark yet |
| H-007 | Browser/server console baseline | P2 | Browser emitted a GoTrue warning about multiple clients; full authenticated audit unavailable | Shared Supabase module created an admin client when imported by browser components | Admin client is now instantiated only on server; added route/global error boundaries and visible billing fetch errors | Partial; fresh public-route console check clean; authenticated dashboard/admin/network audit unavailable | Browser refresh after fix showed no new console errors/warnings; prior warning was timestamped before fix; HTTP route smoke and build pass |

## Baseline findings
- Stack: Next.js 16 App Router, React 19, TypeScript, Supabase SSR/JS, Tailwind v4; no test/lint scripts are defined.
- API routes are broadly bypassed by middleware auth matching; each sensitive handler must enforce its own authentication.
- Baseline `npx tsc --noEmit` failed with three errors in `app/api/search/x/route.ts` (candidate type missing `threadsProfileUrl`).
- `.env.local` is ignored. Secret values were not printed or committed.

## Scope/assumptions
- "USABroadcast" is interpreted as media/news/channel/broadcast accounts, consistent with the report's explicit reject list.
- No third-party cookie/script loading was found in the initial source scan. Consent UI alone is not a substitute for auditing future script additions.
- Public Supabase project URL and publishable/anon key are necessarily browser-visible for direct Supabase client usage; they are not secrets. Never put a service-role key in a `NEXT_PUBLIC_*` variable. Rotate any service-role key that may have been exposed in a browser bundle.
- This is local-only work on `hardening/v1`; do not push or deploy before owner says `GREEN LIGHT`.

## Owner approval gate
Nothing pushed, deployed, or opened as a PR. Awaiting explicit `GREEN LIGHT` before shipping.

## 30-minute execution cutoff
Stopped active implementation at 2026-09-29 17:00 UTC, before the requested deadline. `npx tsc --noEmit` passed after the targeted type fix. `npm run build` crashed with exit code -7 (WSL/mounted Windows filesystem environment); do not treat this as a clean build. Browser smoke checks could not connect to the local dev server. Signup geo unit smoke tests passed for public IPv4, proxy-chain selection, private/loopback rejection, and x-real-ip fallback.

## Follow-up verification (2026-09-29)
- Rechecked `npx tsc --noEmit`: passed.
- Started `npm run dev`: Next.js 16.2.10 became ready; it warns that the `middleware` convention is deprecated.
- HTTP smoke checks returned 200 for `/`, `/auth/signup`, `/auth/signin`, `/auth/forgot-password`, `/pricing`, `/leads`, `/account`, `/settings`, `/admin/login`, `/admin`, and `/admin/users`.
- Rechecked `npm run build`: passed. Next.js emitted only the middleware-to-proxy deprecation warning; all 48 static pages generated and the dynamic route build completed.
- This is server-response evidence only. The in-app browser could not attach (`Timed out waiting for the Browser webview to attach`), so client console errors, browser network failures, authenticated dashboard behavior, and admin behavior remain unverified. No server error output was observed during the requests. H-007 remains open; do not claim the zero-console-errors exit criterion is met.
- The checkout already contained uncommitted edits before this follow-up. Those edits were preserved; no commit was created during this verification.

## Hardening implementation follow-up (2026-09-29)
- Local commit `1bedbda` checkpoints the reviewed pre-existing geo/server-key baseline. Additional T1/T3/T4/T5 work is in the current uncommitted working tree pending final verification/commit.
- Added migrations 07 (consent) and 08 (onboarding), each with a separate manual down script. A checked-in schema snapshot was recorded before these migrations; it is based on SQL files, not a live database dump.
- `npm test` covers currency mapping/fallback, trusted-proxy IP selection/private rejection, consent policy gating, schema validation, weighted scoring, furniture negative adjacency, strict LLM response rejection, and evidence formatting. All current unit tests pass. Furniture fixtures are synthetic and do not establish result precision.
- Current `npm run build` passes, generating 54 static pages; `npx tsc --noEmit` passes. The app reports the Next middleware-to-proxy deprecation warning. The test runner emits Node's MODULE_TYPELESS_PACKAGE_JSON warning because TS files are imported directly.
- HTTP checks returned 200 for all 15 public/auth/account/onboarding/admin/legal routes. They do not execute or inspect browser JavaScript. The browser audit remains open.
- Owner actions/decisions: verify host XFF behavior; confirm NGN prices/reference rate; apply migrations 06-08; confirm OpenRouter model retention/training/region, processor roles/retention, company/legal contact, and effective dates; run real 10-query × 20-result eval. Geo does not require a new env setting. Do not treat the draft policies or current lead reports as legal advice or validated precision.

## Browser console follow-up (2026-09-29)
- Captured the local browser console on landing. It contained a Supabase warning: multiple GoTrueClient instances shared one browser storage key.
- Root cause: `lib/supabase.ts` constructed both the browser client and elevated admin client even when imported by client components. The admin client now initializes only server-side.
- Refreshed and visited landing, signup/signin/forgot-password, pricing, leads, account/settings/onboarding, admin routes, and policy pages. No new console error/warning entries were captured after the fix; the browser log retains the original warning timestamp from before the refresh.
- Authenticated dashboard/admin interactions and full Network-panel request inspection remain unverified because no authenticated session was used. HTTP smoke routes return 200 and unauthenticated sensitive API checks return 401.
