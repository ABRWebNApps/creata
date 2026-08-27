/* ── OSINT Engine — Main orchestrator ── */
/* Pure search + extraction — no DB writes. Returns results for user to review and save manually. */

import { searchEngine } from "./searcher";
import { crawlPage } from "./crawler";
import {
  extractEmailsFromBio,
  extractWebsiteFromBio,
  extractEmails,
  computeEmailConfidence,
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

/**
 * Run a single enrichment cycle for a lead.
 * Steps:
 *  1. Quick bio regex (fast path — no browser)
 *  2. Search engine queries (parallel)
 *  3. Crawl found URLs (1 level deep)
 *  4. Crawl lead's own profile page
 *  5. Return results — user clicks Save when ready
 */
export async function enrichLead(opts: EnrichOptions): Promise<EnrichResult> {
  const result: EnrichResult = {
    emails: [],
    phones: [],
    aliases: [],
    errors: [],
  };

  const handle = opts.leadHandle;
  // Use nickname for search if available (usually the full name without extra digits)
  const searchName = opts.leadNickname || stripTrailingDigits(handle);

  try {
    // ── Step 1: Fast-path bio extraction ──
    const bioEmails = extractEmailsFromBio(opts.leadBio);
    for (const email of bioEmails) {
      const conf = Math.max(BIO_REGEX_CONFIDENCE, computeEmailConfidence(email, handle, searchName));
      result.emails.push({ email, source_url: null, confidence: conf });
    }

    const bioWebsite = extractWebsiteFromBio(opts.leadBio);
    if (bioWebsite) {
      result.aliases.push({ platform: "website", profile_url: bioWebsite });
    }

    // ── Step 2: Build targeted search queries ──
    const queries = buildQueries(opts, searchName);

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

      // Capture snippet-level emails
      for (const email of snippetEmails) {
        if (!result.emails.some((e) => e.email === email)) {
          const conf = computeEmailConfidence(email, handle, searchName);
          if (conf >= MIN_CONFIDENCE) {
            result.emails.push({ email, source_url: null, confidence: conf });
          }
        }
      }

      // Detect cross-platform profiles from search results
      for (const sr of results) {
        const alias = detectPlatformAlias(sr.url, sr.title, opts, searchName);
        if (alias) {
          const exists = result.aliases.some((a) => a.profile_url === alias.profile_url);
          if (!exists) {
            result.aliases.push(alias);
          }
        }
      }

      // Queue top N URLs for crawling
      const urlsToCrawl = results.slice(0, MAX_CRAWL_PER_QUERY).map((r) => r.url);

      // ── Step 5: Crawl found URLs (1 level deep) ──
      for (const url of urlsToCrawl) {
        try {
          const crawl = await crawlPage(url);
          collectCrawlResults(crawl, url, result, handle, searchName);
        } catch (err) {
          result.errors.push(`Crawl failed for ${url.slice(0, 60)}: ${(err as Error).message}`);
        }
      }
    }

    // ── Step 6: Crawl the lead's own profile page ──
    if (CRAWL_OWN_PROFILE && opts.leadProfileUrl) {
      try {
        const ownCrawl = await crawlPage(opts.leadProfileUrl);
        for (const email of ownCrawl.emails) {
          if (!result.emails.some((e) => e.email === email)) {
            const conf = Math.max(OWN_PROFILE_CONFIDENCE, computeEmailConfidence(email, handle, searchName));
            result.emails.push({ email, source_url: opts.leadProfileUrl, confidence: conf });
          }
        }
        for (const phone of ownCrawl.phones) {
          if (!result.phones.some((p) => p.phone === phone)) {
            result.phones.push({ phone, source_url: opts.leadProfileUrl, confidence: OWN_PROFILE_CONFIDENCE });
          }
        }
      } catch (err) {
        result.errors.push(`Own profile crawl failed: ${(err as Error).message}`);
      }
    }

    // NO DB SAVES — user clicks Save on frontend to persist
  } catch (err) {
    result.errors.push(`Enrichment error: ${(err as Error).message}`);
  }

  return result;
}

/**
 * Strip trailing digits from a handle to get the person's real name.
 * jondoe4567 → jondoe
 * drchijiokeadimike → drchijiokeadimike (no digits)
 */
function stripTrailingDigits(s: string): string {
  return s.replace(/\d+$/, "");
}

/**
 * Build targeted search queries.
 * Uses the clean name (nickname or stripped handle) not the raw handle with digits.
 */
function buildQueries(opts: EnrichOptions, searchName: string): string[] {
  const queries: string[] = [];

  // Phase 1: Search by clean name (most accurate — finds the person's real profiles)
  queries.push(searchName);

  // Name + email/contact — targeted contact queries
  queries.push(`${searchName} email`);
  queries.push(`${searchName} contact`);

  // Platform-specific
  queries.push(`${searchName} linkedin`);

  // Also search raw handle in case the name is very different
  if (opts.leadHandle.toLowerCase() !== searchName.toLowerCase()) {
    queries.push(opts.leadHandle);
    queries.push(`${opts.leadHandle} linkedin`);
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
  searchName: string,
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
    if (p.key === opts.leadPlatform) continue;
    if (p.pattern.test(lower)) {
      const nameParts = searchName.toLowerCase().split(" ");
      const titleLower = title.toLowerCase();
      const matchesName = nameParts.some((part) => part.length > 2 && titleLower.includes(part));
      if (matchesName || nameParts.length === 0) {
        return { platform: p.key, profile_url: url };
      }
    }
  }

  return null;
}

/**
 * Collect crawl results into enrichment result (no DB writes).
 */
function collectCrawlResults(
  crawl: CrawlResult,
  sourceUrl: string,
  result: EnrichResult,
  handle: string,
  name: string,
) {
  for (const email of crawl.emails) {
    if (!result.emails.some((e) => e.email === email)) {
      const conf = Math.max(CRAWLED_PAGE_CONFIDENCE, computeEmailConfidence(email, handle, name));
      if (conf >= MIN_CONFIDENCE) {
        result.emails.push({ email, source_url: sourceUrl, confidence: conf });
      }
    }
  }

  for (const phone of crawl.phones) {
    if (!result.phones.some((p) => p.phone === phone)) {
      result.phones.push({ phone, source_url: sourceUrl, confidence: CRAWLED_PAGE_CONFIDENCE });
    }
  }
}