══════════════════════════════════════════════════════════════════
 CREATA AUTOMATION BLUEPRINT
 Signal → Profile → Enrich → OFFER
══════════════════════════════════════════════════════════════════
 Status: PLAN (no code written yet)
 Author: Grace, for BNF
 Date: 2026-10-28
 Reference model studied: chrisx.ai (Chris Lee) — 4 engine pages
 Golden rule: this does NOT change Creata's vision. Search-by-intent
 stays the front door. We only ADD two things behind it.
 Deliberately OUT of scope: running ads. No ads-money / ads-make /
 ads-launch inside the product, ever.

──────────────────────────────────────────────────────────────────
 PART 0 — WHAT CREATA ALREADY IS (read off the code, not guessed)
──────────────────────────────────────────────────────────────────

Stack (package.json): Next.js 16.2.10 (app router), React 19,
Tailwind 4, Supabase (@supabase/ssr + supabase-js), Paystack,
Radix UI + shadcn-style components. Deploy: Vercel (default branch
main, GitHub Actions in .github/workflows/deploy.yml).

What the product does today (from app/page.tsx landing copy):
  "Search TikTok, Instagram, X, LinkedIn and Facebook by what people
   are actually saying — a complaint, a question, a caption — and get
   the buying signal plus the pain point analysis that tells you what
   to say next."
  - 5 platforms, one query. Credits roll over month to month.
  - Enrichment (email finding) is included in Pro and Premium only.

The real pipeline that already runs (verified in code):
  app/api/discover/route.ts
    → /api/ai/generate-keywords        (AI keyword gen, 30s abort)
    → /api/search/{tiktok|instagram|linkedin|x|facebook}
    → lib/lead-quality.ts              (filterRelevantLeads)
  Results land in the `saved_leads` table.

saved_leads columns already present (from migrations):
  handle, nickname, platform (tiktok|instagram|x|linkedin|facebook),
  profile_url, bio, tags, pain_points (JSONB),
  matched_comment, matched_caption      ← the BUYING SIGNAL
  enriched_emails, enriched_phones, enriched_aliases (JSONB),
  enriched_at

Enrichment engine that already exists (lib/osint/*):
  engine.ts    – parallel pipeline, <30s target
  searcher.ts  – DuckDuckGo + Bing scrape (free) → Firecrawl fallback
  crawler.ts   – direct fetch → Firecrawl scrape (bypasses Vercel IP)
  extractor.ts – email/phone/URL regex + confidence scoring
  config.ts    – user-agent rotation, timeouts, confidence constants
  Endpoint: app/api/osint/enrich/route.ts
    - auth via Supabase token
    - plan-gated: only "pro" and "premium" (agency→premium)
    - verifies lead ownership before enriching
  Tables (migration 03): lead_emails, lead_phones, lead_aliases,
    osint_queries (all with RLS keyed to saved_leads.user_id)

bio-enrichment.ts: client-side REGEX structuring of a bio into
  role / focus / niche / content_focus / audience / summary.
  NOTE: this is heuristic regex, NOT an LLM. A real improvement hook.

docs/osint-marketing-pipeline.md: the planned FREE stack
  (Sherlock, theHarvester, Holehe, dorking, WHOIS). Planned, not built.

VERDICT: Creata already stops one step short of what BNF wants.
It produces "here is the lead + what to say." It does NOT yet:
  (A) reach into contact-database providers (Apify / Dropleads) for
      a real verified email + firmographic business details, and
  (B) turn a qualified prospect into an OFFER (the genesis flow).

──────────────────────────────────────────────────────────────────
 PART 1 — THE ENGINE, SET RIGHT (insight-first)
──────────────────────────────────────────────────────────────────

Creata is NOT a lead-gen tool. It is a customer-acquisition tool that
is native to social media: it searches by INSIGHT. The unit of value is
the SIGNAL — "the second somebody said, out loud, that they needed this"
— not the profile. The canonical pipeline, confirmed in the code:

  1. INSIGHT   user types what their buyer would say ("tired of manual
               invoicing").                                    [exists]
  2. SEARCH    /api/ai/generate-keywords → 5-platform search.    [exists]
  3. SIGNAL    every match carries matched_comment / matched_caption
               — the actual words.                               [exists]
  4. PAIN      suggestPainPoints(...) analyses each match's text. [exists]
  5. PROFILE   who said it: handle, nickname, bio (structured).   [exists]
  6. ENRICH    contact + business for that author (Pro/Premium).  [A→v2]
  7. OFFER     turn the qualified signal into an offer.           [B→new]

So signal + pain come FIRST and are the product's core; the profile is
"who said which"; enrichment is downstream. Enrichment is attached to a
saved_lead that ALREADY holds the signal + pain — so the "which" is
never lost (matches the existing data model).

TWO ROLES FOR THE FILTER-SEARCH ACTOR (both in Phase 1):
  SOURCE  — sourceProfilesByFilters(): pull PROFILES by ICP filters
            (title / seniority / country / company size). These are the
            people whose own content Creata then reads for signal+pain.
            This is "stage one" — the who, discovered by ICP.
  ENRICH  — enrichWithProviders(): fetch the contact for the author of a
            signal we already hold, only after identity corroboration.

The offer step (Phase 2) is the genesis flow (offer → demo → close)
rebuilt INSIDE Creata. The chrisx.ai idea we borrow is per-vertical
"Engines" — productized, pre-packaged offers per niche. We take the
SHAPE, not their ad-running. Creata never runs ads.

──────────────────────────────────────────────────────────────────
 PART 2 — FEATURE A: CONTACT + BUSINESS ENRICHMENT
          (Apify / Dropleads behind the existing Enrich button)
──────────────────────────────────────────────────────────────────

Principle: keep the existing engine as Tier 1. Add paid providers as
Tier 2, fired ON DEMAND, normalised into the SAME data model.

Cascade design:
  Tier 1 (free, exists today)
    bio regex → own-profile crawl → DDG/Bing → Firecrawl
    Fast, no cost, lower yield. ALWAYS runs first.
  Tier 2 (paid, NEW)
    A1. Apify actor braveleads/leads-finder-linkedin-apollo-leads-generator
        Input: person name + company/domain + country (+ employee size
        when we have it). Output: VERIFIED email + title + company.
        Proven in our 100-lead run. ~$0.002/lead + $0.05 start.
    A2. Dropleads (secondary)
        POST /api/v2/prime-db/leads/enrich — reveals email (charged).
        X-API-Key header, base https://prime.dropleads.io
        KNOWN BUG: search/count routes hang forever (curl exit 000).
        So: only call /enrich when we already hold a company identity;
        never block the user on a Dropleads /search.
  Tier 3 (business details, NEW)
    Firmographics for company-type leads: domain, industry, employee
    range, location, tech. Populated from the same Apify payload.

Rules:
  - Tier 2 fires ONLY when Tier 1 returned no email with
    confidence >= MIN_CONFIDENCE (50), OR the lead is a business
    account (not a personal creator). No double-charging.
  - Apify before Dropleads (dependency order).
  - Results written to the SAME tables + columns:
      lead_emails  (add source enum value: 'apify' | 'dropleads',
                    verified=TRUE for provider-confirmed emails)
      lead_aliases (unchanged)
      NEW lead_business (firmographic JSONB per lead)
      saved_leads.enriched_* JSONB mirror (already the page-load path)

New / changed files:
  lib/osint/providers.ts            ← NEW orchestrator (tier cascade)
  lib/osint/providers/apify.ts      ← NEW   (actor run + poll)
  lib/osint/providers/dropleads.ts  ← NEW   (enrich only)
  lib/osint/types.ts                ← add Business, provider sources
  app/api/osint/enrich/route.ts     ← call providers.ts after engine.ts
  supabase/migrations/12_lead_business.sql        ← NEW table + RLS
  supabase/migrations/13_email_source_enum.sql    ← widen `source`

Env (never in memory / never printed):
  APIFY_TOKEN, DROPLEADS_API_KEY, FIRECRAWL_API_KEY (exists)

Cost → credits mapping (Creata already sells credits):
  - Search hit = 1 credit (today).
  - A Tier-2 verified email = N credits (suggest 3–5), charged only
    when an email is actually returned. Free/Basic get search only
    (matches current plan gate); Pro/Premium get enrichment; a
    top-up credit inherits the plan's features (current rule).

Acceptance for Feature A:
  - On a lead with no bio email, Enrich returns >= 1 provider-verified
    email when one exists publicly, and business details for company
    leads, in the same response shape the UI already consumes.
  - No regression: Tier-1-only leads behave exactly as today.
  - Apify free-tier cap (100 leads/month) can never bill Creata
    platform-wide — it bills the USER's credit, gated per plan.

──────────────────────────────────────────────────────────────────
 PART 3 — FEATURE B: GENESIS "OFFER" INSIDE CREATA (the broadening)
──────────────────────────────────────────────────────────────────

The genesis flow today lives OUTSIDE the product, in Codex/Claude
(/root/squad/, .claude/skills/execution-genesis-*). It reads
squad/business.md and writes business.md → demos → sales.md.
We re-implement the SAME OUTPUT CONTRACTS as in-product API routes +
a wizard, triggered from a prospect profile that already has a
buying signal + pain point.

Trigger point (must use data that already exists on the lead):
  saved_leads.matched_comment / matched_caption   (the signal)
  saved_leads.pain_points                         (the pain analysis)
  onboarding_profiles (role, business_type, industry, offer,
                        ideal_customer, target_regions, main_goal)
                                          ← the user's own context
  So the offer is generated FROM the prospect's real signal + the
  user's real business. No invented facts — carries the genesis rule.

The 3 sub-features map 1:1 to the 3 genesis agents:

  B1. OFFER BUILDER  (genesis-offer)
     Route:  app/api/offer/generate/route.ts
     Input:  leadId + userId onboarding profile
     Output: an `offers` row whose JSONB carries the business.md
             sections: THE SENTENCE, WHO, THE PROBLEM, THE PROMISE,
             PRICE, WHAT HE GETS, THE BUILD, OBJECTIONS.
     UI:     app/leads/[id] → "Build offer" button → offer editor
             page with the 8 sections, editable line by line
             (mirrors genesis "change any line" behaviour).

  B2. DEMO GENERATOR  (genesis-demo)
     Route:  app/api/offer/demo/route.ts
     Output: a single-file HTML demo (offer_demos.html) built in the
             prospect's trade shape (winner copied, facts = the
             prospect's own, never the winner's words).
     UI:     "Generate demo" → preview iframe → export/download.
     Rule carried over: never deploy, never host, never fabricate.

  B3. SALES SCRIPT  (genesis-close)
     Route:  app/api/offer/script/route.ts
     Output: offer_scripts JSONB — the message, the call, the 5
             objections, the yes, the no-show, the 3 follow-ups.
     Links:  booking + payment. Creata ALREADY has Paystack (for its
             own subs). For the user's payment link we use THEIR own
             link (paste/connect), NOT ours. No Cal.com dependency
             in v1 — accept a pasted booking URL. (Keeps it real.)

New / changed files:
  app/api/offer/generate/route.ts   ← NEW
  app/api/offer/demo/route.ts       ← NEW
  app/api/offer/script/route.ts     ← NEW
  app/leads/[id]/offer/page.tsx     ← NEW (editor UI)
  app/offers/page.tsx               ← NEW (list of built offers)
  app/api/offers/route.ts           ← NEW (list/CRUD)
  supabase/migrations/14_offers.sql ← NEW (offers, offer_demos,
                                        offer_scripts + RLS)

Async reality (critical, not a guess): the existing discover route
already aborts keyword-gen at 30s because Vercel serverless has a
hard time limit. Offer/demo generation is heavier. So it MUST be:
  POST /api/offer/generate → enqueue job → 202 with jobId
  GET  /api/offer/status?id= → poll → done
Store job state in an `offer_jobs` table (or reuse osint_queries
pattern). The UI polls; no long-held serverless request.

──────────────────────────────────────────────────────────────────
 PART 4 — THE chrisx.ai IDEA, ADAPTED (the "Engines")
──────────────────────────────────────────────────────────────────

What Chris Lee actually built (from the 4 pages I read):
  "Copy the #1 in your market." For each vertical he ships an
  *Engine* page — Case Engine (law), Realty Engine (real estate),
  Dental Engine (dental), Business (generic). Same skeleton every
  time: The work (a real market preview) → Who it's for (3 pains) →
  See the work first (4 steps: Bring them in / Catch them / Close
  them / Scale) → Before & After → 3 steps → founder proof →
  2 packaging tiers ($3,000 once + $297/mo; or $5,000/4 weeks + ad
  budget) → FAQ → agreement. The recurring engine is "find who's
  winning, take it apart, rebuild it for you, then fix 1 leaking
  step a week."

The idea we take (NO ads):
  Package Creata's offer output into per-vertical presets = Engines.
  An Engine = a preset bundle:
    - ICP definition (who the buyer is)
    - signal keywords (what to search on the 5 platforms)
    - offer template (THE SENTENCE / PRICE / THE BUILD defaults)
    - demo shape (the trade's winning structure)
    - the standing objection set
  Creata already has the bones for this: app/leads/categories +
  app/api/categories + pain_points. Engines are a thin preset layer
  on top of what exists — not a rebuild.

The "1 step fixed a week" loop, minus ads:
  The chrisx recurring value is weekly iteration on the ONE leaking
  step. In Creata that becomes: re-run the intent search for the
  Engine's keywords weekly, surface NEW signals on saved leads, and
  update the offer when a new pain point appears. Same compounding
  idea, zero ad spend.

──────────────────────────────────────────────────────────────────
 PART 5 — PHASES (each produces a real, testable artefact)
──────────────────────────────────────────────────────────────────

PHASE 0 — Foundations (3–5 days)
  0.1  Migration 12: lead_business table + RLS (copy the 03 pattern).
  0.2  Migration 13: widen lead_emails.source enum.
  0.3  lib/osint/providers.ts skeleton + env wiring (APIFY_TOKEN,
       DROPLEADS_API_KEY) behind a feature flag.
  0.4  Confirm Vercel plan's max function duration (drives Phase 2).
  Deliverable: empty provider layer that runs Tier 1 and logs Tier 2
  as "would-call". Acceptance: zero behaviour change to users.

PHASE 1 — Enrichment v2 (1–2 weeks)
  1.1  providers/apify.ts: run braveleads actor, poll run, map to
       lead_emails/lead_business. (REUSE the input shape from the
       100-lead run: personTitle, personCountry, companyEmployeeSize.)
  1.2  providers/dropleads.ts: /enrich only, Apify-miss fallback.
  1.3  Tier cascade logic + "fire only on miss / business lead".
  1.4  Credit pricing for a verified email; enforce in the existing
       credit-enforcement.ts path.
  Deliverable: Enrich button returns provider-verified emails +
  business details. Acceptance: gold set of 20 leads, measure yield
  lift vs. Tier-1-only; cost per verified email recorded.

PHASE 2 — Offer builder = genesis-offer (2 weeks)
  2.1  Migration 14: offers / offer_jobs + RLS.
  2.2  app/api/offer/generate + /status (async job pattern).
  2.3  Offer editor UI off the lead detail page.
  2.4  Enforce the genesis laws in the prompt/validator: no invented
       quote/number/seller, one price form, no guarantee.
  Deliverable: a saved, editable offer per qualified lead.
  Acceptance: generated offer on 10 real leads, buyer-quote column
  refused when no signal exists.

PHASE 3 — Demo generator = genesis-demo (2 weeks)
  3.1  app/api/offer/demo (single-file HTML per trade shape).
  3.2  Preview + export in the offer editor.
  3.3  No-slop checks ported from the genesis references.
  Deliverable: a downloadable working demo per offer.

PHASE 4 — Sales script = genesis-close (1 week)
  4.1  app/api/offer/script → offer_scripts JSONB.
  4.2  Pasted booking URL + the USER's own payment link (their
       Paystack/Stripe link, never Creata's).
  4.3  Objections pulled from BUYER WORDS, not invented.
  Deliverable: message + call + objections + follow-ups per offer.

PHASE 5 — Engines / verticals (1–2 weeks)
  5.1  Engine preset table (or JSON presets) + picker at search time.
  5.2  Seed 3 engines: e.g. B2B AI agency, real estate, local service.
  5.3  Weekly re-search loop per engine (cron) → new signals surfaced.
  Deliverable: a user searches inside an Engine and gets a full
  signal→offer funnel tuned to that niche.

PHASE 6 — Pricing / gating / admin (ongoing)
  6.1  Add the offer step to Basic/Pro/Premium tiering.
  6.2  Admin: usage, cost per user (Apify spend), offer counts.
  6.3  Update pricing page + landing copy ("...and then build the
       offer, in the same tab").

──────────────────────────────────────────────────────────────────
 PART 6 — UI WIREFRAME (what the user actually clicks)
──────────────────────────────────────────────────────────────────

Lead detail page (app/leads/[id]) becomes a 4-step rail:

   [ SIGNAL ]        matched_comment / matched_caption   (exists)
   [ PAIN ]          pain_points                         (exists)
   [ ENRICH ]        emails + phone + aliases + business (A→v2)
   [ BUILD OFFER ▸ ]  ── the new step ────────────────────────────
        │
        ├─ Tab 1  OFFER   8 editable sections (business.md shape)
        ├─ Tab 2  DEMO    iframe preview + Export HTML
        └─ Tab 3  SCRIPT  message / call / objections / links
                                     └─ Export / copy to clipboard

New top-level nav item: "Offers" (app/offers) — every built offer,
its engine, and its status (draft → demoed → ready to send).

Nothing sends. Nothing deploys. Same as the genesis rule the whole
squad already obeys — the user sends by hand.

──────────────────────────────────────────────────────────────────
 PART 7 — WHAT WE DELIBERATELY DO NOT DO
──────────────────────────────────────────────────────────────────

  - No ads. No ads-money / ads-make / ads-launch in-product. (BNF's
    explicit instruction.) chrisx's ad layer is the part we drop.
  - No auto-send / auto-DM. The user sends.
  - No hosting the demo for the prospect. Export only (genesis rule).
  - No change to the core vision: intent search remains the front
    door and the first screen. The offer is a value-add behind it.
  - No new invented facts anywhere — the no-invention law from the
    genesis skills becomes a validator in the API.

──────────────────────────────────────────────────────────────────
 PART 8 — HONEST RISKS / OPEN QUESTIONS (no guessing)
──────────────────────────────────────────────────────────────────

  R1  Vercel function duration limits → offer/demo MUST be an async
      job + poll (Phase 2). Confirm the account's max duration first.
  R2  Apify free tier = 100 leads/month. If platform-funded it dies
      instantly. → must bill per-user credit. Decision needed.
  R3  Dropleads /search hangs (documented bug) → pin to /enrich only.
  R4  Provider emails are "verified" not SMTP-guaranteed → label
      honestly in the UI (the apify-icp-lead-gen skill already says so).
  R5  Legal/trust: enrichment of real people's emails + AI offers →
      keep the OSINT consent records (migration 07) enforced; the
      product already has a consent path.
  R6  Cost per verified email must be measured before pricing is set.
  R7  Where does the OPENAI/AI key come from for offer generation?
      generate-keywords already uses one — reuse the same provider.

  OPEN QUESTIONS FOR BNF:
  Q1  Bill the Apify/Dropleads cost to the user's CREDIT, or eat it
      into the plan price? (Blocker for Phase 1.)
  Q2  Launch with which 3 Engines first? (Blocker for Phase 5.)
  Q3  Offer generation model/provider — reuse the keyword-gen key?
  Q4  Do we want the demo exported as HTML only, or also a hosted
      preview link inside Creata (not public)?

══════════════════════════════════════════════════════════════════
 END — no code written yet. Approve a phase and I start Phase 0.
══════════════════════════════════════════════════════════════════
