# Creata Search Engine — reverse-engineered plan

Status: PLAN ONLY. Nothing below is implemented yet.
Written after verifying every endpoint against `https://docs.scrapecreators.com/openapi.json`.

═══════════════════════════════════════════════════════════════════════
## 1. THE ROOT CAUSE — why we keep returning solutions
═══════════════════════════════════════════════════════════════════════

Every platform's search returns POSTS. On every platform, the post that
matches "how do i grow my business" was written by someone ANSWERING it.

    search result  = the person selling the answer   (SOLUTION)
    the askers     = the people COMMENTING on it     (DEMAND)

Today's pipeline takes the POST AUTHOR as the lead, then hunts for a demand
comment to decorate them. That is inverted. No filter fixes an inverted
pipeline — it will keep surfacing content creators no matter how strict the
demand gate is.

**The inversion is the whole fix:**

| Platform has comments? | The lead IS |
|---|---|
| TikTok, Instagram | the COMMENT AUTHOR whose comment is a demand |
| LinkedIn, X (Threads) | the POST AUTHOR, and only if the post itself is a demand |

Consequence: `matched_comment` becomes the lead's OWN words, by construction.
"Never an empty matched field" stops being a fallback chain and becomes a
structural guarantee. That whole bug class dies.

═══════════════════════════════════════════════════════════════════════
## 2. RECENCY — verified capabilities
═══════════════════════════════════════════════════════════════════════

Nothing older than ~5 months may reach a result row. Verified parameters:

| Endpoint | Recency control | Verified enum / format |
|---|---|---|
| `/v1/tiktok/search/keyword` | `date_posted` + `sort_by` | `date_posted`: yesterday, this-week, this-month, last-3-months, **last-6-months**, all-time. `sort_by`: relevance, most-liked, **date-posted** |
| `/v1/tiktok/video/comments` | comment `create_time` (epoch) | returned per comment + `cursor` paging |
| `/v2/instagram/post/comments` | comment creation timestamp | returned per comment + `cursor` |
| `/v1/linkedin/search/posts` | `date_posted` | last-hour, last-day, **last-week**, last-month, last-year (Google-indexed) |
| `/v1/threads/search` | `start_date` / `end_date` | free-form dates — **and only 10 results per request** |

Rule to implement: request the widest safe bucket (`last-6-months` on TikTok),
then apply a HARD client-side gate `age <= 150 days` on the post AND on every
comment. Buckets are coarse; the gate is exact.

Known gap: `/v1/linkedin/search/posts` exposes no reliable per-post date in its
schema. LinkedIn recency is therefore bucket-only, and must be labelled as such.

═══════════════════════════════════════════════════════════════════════
## 3. THE QUERY ENGINE — brief → keywords (the part that is broken today)
═══════════════════════════════════════════════════════════════════════

Today "Search by intent" takes the user's words and appends suffixes
(`... problem`, `... tips`, `... solution`) — which is literally a
solution-query generator. And a long brief is passed through near-verbatim.

New design: three pure stages, no LLM required (LLM optional, as an enhancer).

### Stage 1 — DECODE the input into a spec
Input is either a short niche ("digital marketing") or a long brief (the
electronics paragraph). Both become the same shape:

    {
      audience:  "individual",              // individual | business
      regions:   ["United States","United Kingdom"],
      verticals: ["electronics","gaming accessories","home and kitchen",
                  "garden accessories","pet supplies"],
      intent:    "purchase",                // purchase | problem
      exclude:   ["wholesaler","retailer","supplier","dealer","distributor","business"]
    }

The long brief collapses to this — verbosity, audience framing and region
sentences are DISCARDED, never passed to a platform.

### Stage 2 — derive the ASK verbs
Two intent families, each a template set:

PURCHASE (electronics, products):
    where can i buy {v}?            is {v} worth it?
    {v} recommendations?            what is the best {v}?
    anyone know a cheap {v}?        looking for affordable {v}
    which {v} should i get?         i need help choosing a {v}

PROBLEM (services, marketing, health):
    how do i {verb} {object}?       struggling with {object}
    anyone else {problem}?          need help with {object}
    {object} is not working         how can i {verb} {object}?

`{verb} {object}` comes from a per-niche problem map. This is the "split the
same niche into many questions" requirement:

    digital marketing → grow my business, get more followers, get clients,
                        get leads, scale, run ads, build a funnel, get traffic
    → "how do i grow my business?", "how do i get more followers?",
      "how do i get clients?", "how do i scale?", "how do i get leads?",
      "anyone else struggling to get traffic?"

So the user's instinct is exactly right: the query is NOT the niche, it is
"get me people struggling with <niche>", then split into question forms.

### Stage 3 — build the query set
`verticals × ask templates`, deduped, capped (~6-8 per run), region appended
only when the platform's search honours location. Alongside the queries, emit:

- `productTerms` — the vertical/object nouns ONLY (used by the demand gate)
- `excludeTerms` — the trade nouns (used by the seller gate)

═══════════════════════════════════════════════════════════════════════
## 4. THE GATES — one classifier, every route
═══════════════════════════════════════════════════════════════════════

Move these into one shared module so no route can drift:

    isDemand(text, productTerms)        // already exists in lib/intent.ts
    isSellerSide(text, bio)             // NEW — the "no wholesalers/retailers/businesses" rule
    isFresh(ts, 150 days)               // NEW — hard recency gate
    isTradeAccount(bio, platformFlags)  // NEW — business flag / trade nouns

`isSellerSide` = existing SOLUTION_MARKERS plus trade nouns:
wholesale, supplier, distributor, retailer, dealer, MOQ, bulk order, B2B,
we supply, we ship, agency, our clients, dm for price, reseller.

A lead that trips `isSellerSide` is DROPPED, never decorated. That is the
difference between "exclude businesses" and "rank businesses lower".

═══════════════════════════════════════════════════════════════════════
## 5. THE PIPELINE, per platform
═══════════════════════════════════════════════════════════════════════

### TikTok (commenter-as-lead)
1. `search/keyword` per ask-query, parallel (≤6): `date_posted=last-6-months`,
   `sort_by=date-posted`, `count=40`.
2. Keep videos with `age <= 150d`. Build `https://www.tiktok.com/@<h>/video/<id>`.
3. Newest 8-10 videos → `video/comments` (page 1, `cursor` for more).
4. Keep comments where `isFresh(create_time)` AND `isDemand(text, productTerms)`
   AND `!isSellerSide(text)`.
5. **Each surviving comment author becomes a lead** — handle, avatar, their
   exact comment as `matched_comment`, the source post caption as
   `matched_caption`, the post URL as the source link.
6. Enrich the top leads via `tiktok/profile` (email, bio, link, IG handle).
7. Problem analysis grounded in their comment + bio.

### Instagram (commenter-as-lead)
`search/profiles` is the WRONG entry point — it returns ACCOUNTS, i.e. sellers.
Switch to a post/reel search for the niche, then `v2/instagram/post/comments`,
then the same steps 4-7 as TikTok.

### LinkedIn (post-only)
`linkedin/search/posts` with `date_posted=last-week` (or last-month). The lead
is the post author and ONLY when `isDemand(post.description, productTerms)` is
true and `isSellerSide` is false. No comments endpoint exists.

### X / Twitter (post-only)
`threads/search` with `start_date = now-150d` — note it returns **10 results per
request**, so the current `count=60` is silently a lie and must be paged or
accepted as 10. Same demand+recency+seller gate on the post.

### Facebook
`adLibrary/search/ads` returns ADVERTISERS — the purest sellers on the platform.
It is the wrong source for "find people with problems". Park it; if Facebook
matters later, `marketplace/search` or `events/search` are the right doors.

═══════════════════════════════════════════════════════════════════════
## 6. WHAT THE USER SEES
═══════════════════════════════════════════════════════════════════════

- Matched comment = the lead's own words. Always present, because a lead
  without a demand is not a lead.
- Honest labelling: `Commenter (asking)` vs `Poster (asking)`.
- Comment age shown ("3 weeks ago") — trust comes from provable freshness.
- A link to the source post, so BNF can verify the signal himself.
- Priority sort: strongest demand first (intentScore, then recency).

New columns needed: `matched_url` (source post), `lead_kind`
(`commenter` | `poster`). Either a small migration, or ride them in the
existing `tags` JSONB to avoid a migration.

═══════════════════════════════════════════════════════════════════════
## 7. COST
═══════════════════════════════════════════════════════════════════════

Per TikTok search: 6 keyword queries + 8 comment fetches + ~15 profile
enrichments ≈ 29 credits. Same order as today, but every credit now buys a
person who ASKED, not a person who advertises.

═══════════════════════════════════════════════════════════════════════
## 8. RISKS / UNKNOWNS — do not skip
═══════════════════════════════════════════════════════════════════════

1. `date_posted` + `sort_by` on TikTok are spec-only, UNVERIFIED live.
   Verify with `count=3` (~3 credits) before wiring.
2. LinkedIn search is Google-indexed → thin, best-effort, weak dates.
3. Comment demand is rarer than keyword match. Volume will DROP. That is the
   point — but it must be expected, not discovered. May need more videos or
   more credits to hold volume.
4. Commenters are small accounts. `minFollowers` must default to 0 or the
   whole list empties.
5. Instagram post-search endpoint choice is not yet decided
   (`v1/instagram/search` vs `v2/instagram/reels/search`) — pick after a
   count=2 probe.

═══════════════════════════════════════════════════════════════════════
## 9. STAGING
═══════════════════════════════════════════════════════════════════════

Phase 0  FREE-ish  verify date_posted/sort_by + comment create_time live (≈3 credits)
Phase 1  0 credits lib/query-spec.ts — brief → spec → ask queries + terms. Unit-testable.
Phase 2  0 credits lib/demand.ts — isSellerSide / isFresh / isTradeAccount, shared by all routes.
Phase 3  TikTok    commenter-as-lead rewrite (the proof of concept).
Phase 4  Instagram post-search + commenter-as-lead.
Phase 5  LinkedIn + X  post-only demand gate + recency gate.
Phase 6  UI        lead_kind label, source link, comment age.
Phase 7  DB        matched_url + lead_kind (migration or tags JSONB).

Phase 3 is the decision point: if TikTok returns real askers, the model is
proven and 4-7 are mechanical.
