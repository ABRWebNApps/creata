/* ── OSINT Engine — Main orchestrator ── */
/* Pure search + extraction + smart fallback generation */

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
 *  1. Quick bio regex (fast path)
 *  2. Search engine queries (parallel) - Bing then DDG fallback
 *  3. Crawl found URLs
 *  4. Crawl lead's own profile page
 *  5. Smart generated email fallback if no real emails found
 *  6. Return results — user clicks Save when ready
 */
export async function enrichLead(opts: EnrichOptions): Promise<EnrichResult> {
  const result: EnrichResult = {
    emails: [],
    phones: [],
    aliases: [],
    errors: [],
  };

  // Clean names for search — strip trailing digits from handle
  const cleanHandle = stripTrailingDigits(opts.leadHandle);
  const searchName = opts.leadNickname || cleanHandle;
  // For generated emails: use the name parts separately
  const nameParts = searchName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || searchName;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  try {
    // ── Step 1: Fast-path bio extraction ──
    const bioEmails = extractEmailsFromBio(opts.leadBio);
    for (const email of bioEmails) {
      const conf = Math.max(BIO_REGEX_CONFIDENCE, computeEmailConfidence(email, opts.leadHandle, searchName));
      result.emails.push({ email, source_url: null, confidence: conf });
    }

    const bioWebsite = extractWebsiteFromBio(opts.leadBio);
    if (bioWebsite) {
      result.aliases.push({ platform: "website", profile_url: bioWebsite });
    }

    // ── Step 2: Build targeted search queries ──
    const queries = buildQueries(opts, searchName, cleanHandle);

    // ── Step 3: Run search engine queries (parallel) ──
    const searchResults = await Promise.allSettled(
      queries.map(async (q) => {
        const { results } = await searchEngine(q);
        // Extract emails from search result titles + snippets only
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
          const conf = computeEmailConfidence(email, opts.leadHandle, searchName);
          if (conf >= MIN_CONFIDENCE) {
            result.emails.push({ email, source_url: null, confidence: conf });
          }
        }
      }

      // Detect cross-platform profiles
      for (const sr of results) {
        const alias = detectPlatformAlias(sr.url, sr.title, opts, searchName);
        if (alias && !result.aliases.some((a) => a.profile_url === alias.profile_url)) {
          result.aliases.push(alias);
        }
      }

      // Queue top N URLs for crawling
      const urlsToCrawl = results.slice(0, MAX_CRAWL_PER_QUERY).map((r) => r.url);

      // ── Step 5: Crawl found URLs ──
      for (const url of urlsToCrawl) {
        try {
          const crawl = await crawlPage(url);
          collectCrawlResults(crawl, url, result, opts.leadHandle, searchName);
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
            const conf = Math.max(OWN_PROFILE_CONFIDENCE, computeEmailConfidence(email, opts.leadHandle, searchName));
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

    // ── Step 7: Smart generated email fallback ──
    // Only generate if we found 0 real emails AND we have enough name info
    if (result.emails.length === 0 && (firstName || lastName)) {
      const generated = generateProbableEmails(firstName, lastName, cleanHandle, opts.leadNickname);
      for (const email of generated) {
        if (!result.emails.some((e) => e.email === email)) {
          result.emails.push({ email, source_url: null, confidence: 45 });
        }
      }
    }

  } catch (err) {
    result.errors.push(`Enrichment error: ${(err as Error).message}`);
  }

  return result;
}

/**
 * Strip trailing digits from a handle.
 * jondoe4567 → jondoe
 */
function stripTrailingDigits(s: string): string {
  return s.replace(/\d+$/, "");
}

/**
 * Build targeted search queries.
 * Uses the clean name (nickname or stripped handle) not the raw handle with digits.
 */
function buildQueries(opts: EnrichOptions, searchName: string, cleanHandle: string): string[] {
  const queries: string[] = [];

  // Phase 1: Search by clean name
  queries.push(searchName);
  queries.push(`${searchName} email`);
  queries.push(`${searchName} contact`);
  queries.push(`${searchName} linkedin`);
  queries.push(`${searchName} twitter`);

  // Phase 2: Clean handle queries
  if (cleanHandle.toLowerCase() !== searchName.toLowerCase()) {
    queries.push(cleanHandle);
    queries.push(`${cleanHandle} email`);
  }

  return queries;
}

/**
 * Generate smart probable email addresses when scraping finds nothing.
 * Uses clean name parts — no trailing digits from handles.
 * Patterns make realistic personal email addresses a real person might use.
 */
function generateProbableEmails(
  firstName: string,
  lastName: string,
  cleanHandle: string,
  nickname: string | undefined,
): string[] {
  const emails: string[] = [];
  const f = firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const l = lastName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const clean = cleanHandle.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9._-]/g, "");
  const nick = nickname ? nickname.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "") : "";

  const domains = ["gmail.com", "outlook.com", "proton.me", "yahoo.com", "icloud.com"];

  // Pattern 1: firstname.lastname@gmail.com
  if (f && l) {
    for (const d of domains) {
      emails.push(`${f}.${l}@${d}`);
    }
    emails.push(`${f}${l}@gmail.com`);
    emails.push(`${l}.${f}@gmail.com`);
  }

  // Pattern 2: Based on handle if different from name
  if (clean && clean !== `${f}${l}` && clean !== f) {
    emails.push(`${clean}@gmail.com`);
    emails.push(`${clean}@outlook.com`);
  }

  // Pattern 3: Nickname-based (most accurate if available)
  if (nick && nick !== clean && nick !== `${f}.${l}`) {
    emails.push(`${nick}@gmail.com`);
    emails.push(`${nick}@proton.me`);
  }

  // Pattern 4: First name only (if no last name)
  if (f && !l) {
    emails.push(`${f}@gmail.com`);
    emails.push(`${f}@outlook.com`);
  }

  // Pattern 5: First initial + last name
  if (f && l) {
    emails.push(`${f[0]}${l}@gmail.com`);
  }

  // Deduplicate
  return [...new Set(emails)];
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
 * Collect crawl results into enrichment result.
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