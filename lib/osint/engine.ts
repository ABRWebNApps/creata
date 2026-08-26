/* ── OSINT Engine — Main orchestrator ── */
/* Ported from Sky Email Extractor's multi-threaded worker architecture */

import { createClient } from "@supabase/supabase-js";
import { searchEngine } from "./searcher";
import { crawlPage } from "./crawler";
import {
  extractEmailsFromBio,
  extractWebsiteFromBio,
  extractEmails,
  computeEmailConfidence,
  generateProbableEmails,
} from "./extractor";
import {
  MAX_CRAWL_PER_QUERY,
  OWN_PROFILE_CONFIDENCE,
  BIO_REGEX_CONFIDENCE,
  SEARCH_RESULT_CONFIDENCE,
  CRAWLED_PAGE_CONFIDENCE,
  CROSS_PLATFORM_CONFIDENCE,
  MIN_CONFIDENCE,
  CRAWL_OWN_PROFILE,
} from "./config";
import type {
  EnrichOptions,
  EnrichResult,
  SearchResult,
  CrawlResult,
  EnrichSource,
} from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Run a single enrichment cycle for a lead.
 * Steps:
 *  1. Quick bio regex (fast path — no browser)
 *  2. Search engine queries (parallel)
 *  3. Crawl found URLs (1 level deep)
 *  4. Crawl lead's own profile page
 *  5. Save all results to DB
 *  6. Update lead's email field with highest-confidence contact
 */
export async function enrichLead(opts: EnrichOptions): Promise<EnrichResult> {
  const result: EnrichResult = {
    emails: [],
    phones: [],
    aliases: [],
    errors: [],
  };

  const supabase = getAdminClient();
  const seenQueries = new Set<string>();
  const handle = opts.leadHandle;
  const name = opts.leadNickname || opts.leadHandle;

  try {
    // ── Step 0: Check past queries for dedup ──
    const { data: pastQueries } = await supabase
      .from("osint_queries")
      .select("query_string")
      .eq("lead_id", opts.leadId);

    for (const q of pastQueries || []) {
      seenQueries.add(q.query_string);
    }

    // ── Step 1: Fast-path bio extraction ──
    const bioEmails = extractEmailsFromBio(opts.leadBio);
    for (const email of bioEmails) {
      const conf = Math.max(BIO_REGEX_CONFIDENCE, computeEmailConfidence(email, opts.leadHandle, handle));
      result.emails.push({ email, source_url: null, confidence: conf });
      await saveEmail(supabase, opts.leadId, email, "bio_regex", null, conf);
    }

    const bioWebsite = extractWebsiteFromBio(opts.leadBio);
    if (bioWebsite) {
      result.aliases.push({ platform: "website", profile_url: bioWebsite });
      await saveAlias(supabase, opts.leadId, "website", bioWebsite, bioWebsite);
    }

    // ── Step 2: Build targeted search queries ──
    const queries = buildQueries(opts);

    // ── Step 3: Run search engine queries (parallel) ──
    const searchResults = await Promise.allSettled(
      queries.map(async (q) => {
        const { results } = await searchEngine(q, "google");
        // Extract emails from search result titles + snippets only (not raw HTML)
        const snippetText = results.map((r) => `${r.title} ${r.snippet}`).join(" ");
        const snippetEmails = extractEmails(snippetText);
        return { query: q, results, snippetEmails };
      }),
    );

    // ── Step 4: Process search results ──
    for (const srPromise of searchResults) {
      if (srPromise.status !== "fulfilled") {
        result.errors.push(`Search failed: ${srPromise.reason?.message || "unknown"}`);
        continue;
      }

      const { query, results, snippetEmails } = srPromise.value;

      // Save query to osint_queries dedup table
      await saveQuery(supabase, opts.leadId, "email_search", query, results.length);

      // Capture snippet-level emails
      for (const email of snippetEmails) {
        if (!result.emails.some((e) => e.email === email)) {
          const conf = computeEmailConfidence(email, handle, name);
          result.emails.push({ email, source_url: null, confidence: conf });
          await saveEmail(supabase, opts.leadId, email, "search_engine", null, conf);
        }
      }

      // Detect cross-platform profiles from search results
      for (const sr of results) {
        const alias = detectPlatformAlias(sr.url, sr.title, opts);
        if (alias) {
          const exists = result.aliases.some((a) => a.profile_url === alias.profile_url);
          if (!exists) {
            result.aliases.push(alias);
            await saveAlias(supabase, opts.leadId, alias.platform, alias.profile_url, alias.profile_url);
          }
        }
      }

      // Queue top N URLs for crawling
      const urlsToCrawl = results.slice(0, MAX_CRAWL_PER_QUERY).map((r) => r.url);

      // ── Step 5: Crawl found URLs (1 level deep) ──
      for (const url of urlsToCrawl) {
        try {
          const crawl = await crawlPage(url);
          await saveCrawlResults(supabase, opts.leadId, crawl, url, result, handle, name);
        } catch (err) {
          result.errors.push(`Crawl failed for ${url.slice(0, 60)}: ${(err as Error).message}`);
        }
      }
    }

    // ── Step 6: Crawl the lead's own profile page ──
    if (CRAWL_OWN_PROFILE && opts.leadProfileUrl) {
      try {
        const ownCrawl = await crawlPage(opts.leadProfileUrl);
        // Boost confidence — emails found on own profile are most reliable
        for (const email of ownCrawl.emails) {
          if (!result.emails.some((e) => e.email === email)) {
            const conf = Math.max(OWN_PROFILE_CONFIDENCE, computeEmailConfidence(email, handle, name));
            result.emails.push({ email, source_url: opts.leadProfileUrl, confidence: conf });
            await saveEmail(supabase, opts.leadId, email, "page_crawl", opts.leadProfileUrl, conf);
          }
        }
        for (const phone of ownCrawl.phones) {
          if (!result.phones.some((p) => p.phone === phone)) {
            result.phones.push({ phone, source_url: opts.leadProfileUrl, confidence: OWN_PROFILE_CONFIDENCE });
            await savePhone(supabase, opts.leadId, phone, "page_crawl", opts.leadProfileUrl, OWN_PROFILE_CONFIDENCE);
          }
        }
      } catch (err) {
        result.errors.push(`Own profile crawl failed: ${(err as Error).message}`);
      }
    }

    // ── Step 7: Update lead's email field with best result ──
    if (result.emails.length > 0) {
      // Pick highest confidence email
      const best = result.emails.sort((a, b) => b.confidence - a.confidence)[0];
      await supabase
        .from("saved_leads")
        .update({ email: best.email })
        .eq("id", opts.leadId);
    } else {
      // ── Fallback: Generate probable emails from handle/name ──
      const probableEmails = generateProbableEmails(handle, name);
      for (const [email, conf] of Array.from(probableEmails)) {
        result.emails.push({ email, source_url: null, confidence: conf });
        await saveEmail(supabase, opts.leadId, email, "bio_regex" as EnrichSource, null, conf);
      }
    }

    // ── Step 8: Save all enrichment results as JSONB on the lead row ──
    // This ensures data persists on refresh even without migration tables
    const enrichedEmails = result.emails.map((e) => ({
      email: e.email,
      confidence: e.confidence,
      source_url: e.source_url,
    }));
    const enrichedPhones = result.phones.map((p) => ({
      phone: p.phone,
      confidence: p.confidence,
    }));
    const enrichedAliases = result.aliases.map((a) => ({
      platform: a.platform,
      profile_url: a.profile_url,
    }));

    await supabase
      .from("saved_leads")
      .update({
        enriched_emails: JSON.stringify(enrichedEmails),
        enriched_phones: JSON.stringify(enrichedPhones),
        enriched_aliases: JSON.stringify(enrichedAliases),
        enriched_at: new Date().toISOString(),
      })
      .eq("id", opts.leadId);
  } catch (err) {
    result.errors.push(`Enrichment error: ${(err as Error).message}`);
  }

  return result;
}

/**
 * Build targeted search queries for a specific person.
 * Uses the handle as primary signal — this is what makes
 * enrichment find the RIGHT person, not generic results.
 */
function buildQueries(opts: EnrichOptions): string[] {
  const name = opts.leadNickname || opts.leadHandle;
  const handle = opts.leadHandle;

  const queries: string[] = [];

  // Phase 1: Bare handle search — finds the person's real profiles
  queries.push(handle);

  // Handle + email/contact — targeted contact queries
  queries.push(`${handle} email`);
  queries.push(`${handle} contact`);

  // Platform-specific: LinkedIn, GitHub, Instagram
  queries.push(`${handle} linkedin`);
  queries.push(`${handle} github`);

  // Name-based if different from handle
  if (name.toLowerCase() !== handle.toLowerCase()) {
    queries.push(`${name} ${handle} linkedin`);
  }

  return queries;
}

/**
 * Detect a cross-platform profile from a search result URL.
 */
function detectPlatformAlias(
  url: string,
  title: string,
  opts: EnrichOptions,
): { platform: string; profile_url: string } | null {
  const lower = url.toLowerCase();

  const platforms: Array<{ key: string; pattern: RegExp }> = [
    { key: "linkedin", pattern: /linkedin\.com\/in\// },
    { key: "github", pattern: /github\.com\// },
    { key: "twitter", pattern: /twitter\.com\// },
    { key: "instagram", pattern: /instagram\.com\// },
    { key: "youtube", pattern: /youtube\.com\/@/ },
  ];

  for (const p of platforms) {
    // Skip if this is the platform the lead was already found on
    if (p.key === opts.leadPlatform) continue;
    if (p.pattern.test(lower)) {
      // Ensure it's actually the same person (title/name match)
      const nameParts = (opts.leadNickname || opts.leadHandle).toLowerCase().split(" ");
      const titleLower = title.toLowerCase();
      const matchesName = nameParts.some((part) => part.length > 2 && titleLower.includes(part));
      if (matchesName || nameParts.length === 0) {
        return { platform: p.key, profile_url: url };
      }
    }
  }

  return null;
}

/* ── Database helpers ── */

async function saveEmail(
  supabase: ReturnType<typeof getAdminClient>,
  leadId: string,
  email: string,
  source: EnrichSource,
  sourceUrl: string | null,
  confidence: number,
) {
  if (confidence < MIN_CONFIDENCE) return;
  try {
    await supabase.from("lead_emails").upsert(
      {
        lead_id: leadId,
        email,
        source,
        source_url: sourceUrl,
        confidence,
        verified: source === "bio_regex" || confidence >= 90,
      },
      { onConflict: "lead_id, email", ignoreDuplicates: true },
    );
  } catch (err) {
    console.error("saveEmail error:", (err as Error).message);
  }
}

async function savePhone(
  supabase: ReturnType<typeof getAdminClient>,
  leadId: string,
  phone: string,
  source: EnrichSource,
  sourceUrl: string | null,
  confidence: number,
) {
  if (confidence < MIN_CONFIDENCE) return;
  try {
    await supabase.from("lead_phones").upsert(
      {
        lead_id: leadId,
        phone,
        source,
        source_url: sourceUrl,
        confidence,
      },
      { onConflict: "lead_id, phone", ignoreDuplicates: true },
    );
  } catch (err) {
    console.error("savePhone error:", (err as Error).message);
  }
}

async function saveAlias(
  supabase: ReturnType<typeof getAdminClient>,
  leadId: string,
  platform: string,
  profileUrl: string,
  displayUrl: string,
) {
  try {
    await supabase.from("lead_aliases").upsert(
      {
        lead_id: leadId,
        platform,
        profile_url: profileUrl,
        platform_handle: displayUrl.split("/").pop() || null,
      },
      { onConflict: "lead_id, platform", ignoreDuplicates: true },
    );
  } catch (err) {
    console.error("saveAlias error:", (err as Error).message);
  }
}

async function saveQuery(
  supabase: ReturnType<typeof getAdminClient>,
  leadId: string,
  queryType: string,
  queryString: string,
  resultsCount: number,
) {
  try {
    await supabase.from("osint_queries").upsert(
      {
        lead_id: leadId,
        query_type: queryType,
        query_string: queryString,
        results_count: resultsCount,
      },
      { onConflict: "lead_id, query_type, query_string", ignoreDuplicates: true },
    );
  } catch (err) {
    console.error("saveQuery error:", (err as Error).message);
  }
}

async function saveCrawlResults(
  supabase: ReturnType<typeof getAdminClient>,
  leadId: string,
  crawl: CrawlResult,
  sourceUrl: string,
  result: EnrichResult,
  handle: string,
  name: string,
) {
  for (const email of crawl.emails) {
    if (!result.emails.some((e) => e.email === email)) {
      const conf = Math.max(CRAWLED_PAGE_CONFIDENCE, computeEmailConfidence(email, handle, name));
      result.emails.push({ email, source_url: sourceUrl, confidence: conf });
    }
    await saveEmail(supabase, leadId, email, "page_crawl", sourceUrl, CRAWLED_PAGE_CONFIDENCE);
  }

  for (const phone of crawl.phones) {
    if (!result.phones.some((p) => p.phone === phone)) {
      result.phones.push({ phone, source_url: sourceUrl, confidence: CRAWLED_PAGE_CONFIDENCE });
    }
    await savePhone(supabase, leadId, phone, "page_crawl", sourceUrl, CRAWLED_PAGE_CONFIDENCE);
  }
}