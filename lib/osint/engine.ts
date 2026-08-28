/* ── OSINT Engine — Main orchestrator ── */
/* Pure search + extraction. No generated email fallback — either we find  */
/* real emails from search/crawl, or we return nothing.                     */

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
  CRAWLED_PAGE_CONFIDENCE,
  MIN_CONFIDENCE,
  CRAWL_OWN_PROFILE,
} from "./config";
import type {
  EnrichOptions,
  EnrichResult,
  CrawlResult,
} from "./types";

/**
 * Run a single enrichment cycle for a lead.
 * Steps:
 *  1. Quick bio regex (fast path)
 *  2. Search engine queries (parallel)
 *  3. Crawl found URLs + discovered cross-platform aliases
 *  4. Crawl lead's own profile page
 *  5. Return results — emails found or empty
 */
export async function enrichLead(opts: EnrichOptions): Promise<EnrichResult> {
  const result: EnrichResult = {
    emails: [],
    phones: [],
    aliases: [],
    errors: [],
  };

  const cleanHandle = stripTrailingDigits(opts.leadHandle);
  const searchName = opts.leadNickname || cleanHandle;
  const nameParts = searchName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || searchName;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  try {
    // ── Step 1: Fast-path bio extraction ──
    const bioEmails = extractEmailsFromBio(opts.leadBio);
    for (const email of bioEmails) {
      const { confidence: conf } = computeEmailConfidence(email, opts.leadHandle, searchName);
      result.emails.push({ email, source_url: null, confidence: Math.max(BIO_REGEX_CONFIDENCE, conf) });
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
        const snippetText = results.map((r) => `${r.title} ${r.snippet}`).join(" ");
        const snippetEmails = extractEmails(snippetText);
        return { query: q, results, snippetEmails };
      }),
    );

    // ── Step 4: Process search results ──
    for (const srPromise of searchResults) {
      if (srPromise.status !== "fulfilled") continue;

      const { query, results, snippetEmails } = srPromise.value;

      // Capture snippet-level emails
      for (const email of snippetEmails) {
        if (!result.emails.some((e) => e.email === email)) {
          const { confidence: conf } = computeEmailConfidence(email, opts.leadHandle, searchName);
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

      // ── Step 5: Crawl found search-result URLs ──
      for (const url of urlsToCrawl) {
        const crawl = await crawlPage(url);
        collectCrawlResults(crawl, url, result, opts.leadHandle, searchName);
      }
    }

    // ── Step 6: Crawl the lead's own profile page ──
    if (CRAWL_OWN_PROFILE && opts.leadProfileUrl) {
      const ownCrawl = await crawlPage(opts.leadProfileUrl);
      for (const email of ownCrawl.emails) {
        if (!result.emails.some((e) => e.email === email)) {
          const { confidence: conf } = computeEmailConfidence(email, opts.leadHandle, searchName);
          result.emails.push({ email, source_url: opts.leadProfileUrl, confidence: Math.max(OWN_PROFILE_CONFIDENCE, conf) });
        }
      }
      for (const phone of ownCrawl.phones) {
        if (!result.phones.some((p) => p.phone === phone)) {
          result.phones.push({ phone, source_url: opts.leadProfileUrl, confidence: OWN_PROFILE_CONFIDENCE });
        }
      }
    }

    // ── Step 7: Crawl all discovered cross-platform aliases ──
    const aliasUrlsToCrawl = result.aliases
      .map((a) => a.profile_url)
      .filter((url) => url !== opts.leadProfileUrl);

    for (const url of aliasUrlsToCrawl) {
      const crawl = await crawlPage(url);
      for (const email of crawl.emails) {
        if (!result.emails.some((e) => e.email === email)) {
          const { confidence: conf } = computeEmailConfidence(email, opts.leadHandle, searchName);
          if (conf >= MIN_CONFIDENCE) {
            result.emails.push({ email, source_url: url, confidence: conf });
          }
        }
      }
      for (const phone of crawl.phones) {
        if (!result.phones.some((p) => p.phone === phone)) {
          result.phones.push({ phone, source_url: url, confidence: CRAWLED_PAGE_CONFIDENCE });
        }
      }
      // Discovered alias brought new URLs? Crawl a few of those too
      for (const nestedUrl of crawl.urls.slice(0, 3)) {
        try {
          if (nestedUrl.includes(url.split("/")[2] || url)) {
            const nestedCrawl = await crawlPage(nestedUrl);
            for (const email of nestedCrawl.emails) {
              if (!result.emails.some((e) => e.email === email)) {
                const { confidence: conf } = computeEmailConfidence(email, opts.leadHandle, searchName);
                if (conf >= MIN_CONFIDENCE) {
                  result.emails.push({ email, source_url: nestedUrl, confidence: conf });
                }
              }
            }
          }
        } catch { /* skip nested crawl failures silently */ }
      }
    }

  } catch (err) {
    result.errors.push(`Enrichment error: ${(err as Error).message}`);
  }

  return result;
}

function stripTrailingDigits(s: string): string {
  return s.replace(/\d+$/, "");
}

function buildQueries(opts: EnrichOptions, searchName: string, cleanHandle: string): string[] {
  const queries: string[] = [];
  queries.push(searchName);
  queries.push(`${searchName} email`);
  queries.push(`${searchName} contact`);
  queries.push(`${searchName} linkedin`);
  queries.push(`${searchName} twitter`);
  if (cleanHandle.toLowerCase() !== searchName.toLowerCase()) {
    queries.push(cleanHandle);
    queries.push(`${cleanHandle} email`);
  }
  return queries;
}

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

function collectCrawlResults(
  crawl: CrawlResult,
  sourceUrl: string,
  result: EnrichResult,
  handle: string,
  name: string,
) {
  for (const email of crawl.emails) {
    if (!result.emails.some((e) => e.email === email)) {
      const { confidence: conf } = computeEmailConfidence(email, handle, name);
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