# Creata hardening BUGLOG

Baseline captured 2026-09-29. Branch: `hardening/v1`. No push/deploy/PR.

| ID | Area | Severity (P0-P3) | Symptom | Root cause | Fix | Status | Test proving fix |
|---|---|---:|---|---|---|---|---|
| H-001 | Secrets | P1 | Service-role credential configured under a `NEXT_PUBLIC_` env name | Next.js exposes `NEXT_PUBLIC_*` values to browser bundles; service-role key bypasses RLS | Moved server-only reads to `SUPABASE_SERVICE_ROLE_KEY`; renamed local env key without printing its value | Fixed locally | Static search confirms no service-role `NEXT_PUBLIC_` references; production build pending |
| H-002 | TypeScript/X search | P2 | Typecheck failed on `threadsProfileUrl` | Inferred candidate type omitted optional property assigned/read downstream | Explicitly typed candidate shape | Fixed locally | `npx tsc --noEmit` passes |
| H-003 | Cookie/legal consent | P2 | No policy-versioned consent/settings or legal pages found | Feature absent | Not implemented in this pass | Open | Consent gating + policy review needed |
| H-004 | Signup geo/currency | P2 | No verified server-side signup country/currency lock or admin reporting found | Feature absent; NGN price configuration needs owner confirmation | Added opt-in signup geo snapshot API (1.5s timeout, public-IP validation, USD fallback), metadata migration | Partial; aggregate/admin display remains open | Geo IP tests pass; Supabase integration requires migration and valid session |
| H-005 | Onboarding | P2 | No onboarding profile flow/table or prompt context found | Feature absent | Not implemented in this pass | Open | DB migration + integration/e2e tests needed |
| H-006 | Search relevance / evidence reports | P1 | Search keyword expansion can return weakly related profiles; no measured precision evidence available | Current search routes retrieve/score upstream data without a validated per-account evidence gate | Not implemented; a safe gate requires an evaluation set and upstream evidence availability | Open / evaluation required | 10-query x 20-result labeled benchmark required; no fabricated precision claims |
| H-007 | Browser/server console baseline | P2 | Complete page-by-page console/network audit not possible from initial static inspection | No browser baseline captured yet | Pending | Open | Load public/auth/app/admin routes with authorized session and inspect logs |

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
