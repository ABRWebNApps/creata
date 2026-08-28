/* ── OSINT Engine — Main orchestrator ── */
/* 1. Firecrawl search with dorking queries to find pages likely containing emails   */
/* 2. Firecrawl scrape every result page (reliable content extraction)                */
/* 3. Multi-pass: search snippets, crawled pages, own profile, cross-platform aliases */
/* 4. Cross-platform alias discovery → scrape those too                               */
/* 5. generateProbableEmails() as absolute last resort if nothing found               */

import { searchEngine, buildEmailSearchQueries, firecrawlScrape } from "./searcher";
import { crawlPage } from "./crawler";
import {
  extractEmailsFromBio,
  extractWebsiteFromBio,
  extractEmails,
  computeEmailConfidence,
} from "./extractor";
import {
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

    // ── Step 2: Build dorking-style search queries ──
    const queries = buildEmailSearchQueries(searchName, cleanHandle);

    // ── Step 3: Run ALL search queries through Firecrawl (parallel) ──
    const searchResults = await Promise.allSettled(
      queries.map(async (q) => {
        const { results, rawHtml } = await searchEngine(q);
        // Extract emails from snippets immediately
        const snippetEmails = extractEmails(rawHtml);
        return { query: q, results, snippetEmails };
      }),
    );

    // ── Step 4: Process ALL search results — extract from snippets,
    //     detect cross-platform profiles, collect URLs to scrape
    const urlsToScrape: string[] = [];

    for (const srPromise of searchResults) {
      if (srPromise.status !== "fulfilled") continue;

      const { query, results, snippetEmails } = srPromise.value;

      // Extract emails from search snippets (free — no credit cost)
      for (const email of snippetEmails) {
        if (!result.emails.some((e) => e.email === email)) {
          const { confidence: conf } = computeEmailConfidence(email, opts.leadHandle, searchName);
          if (conf >= MIN_CONFIDENCE) {
            result.emails.push({ email, source_url: null, confidence: conf });
          }
        }
      }

      // Detect cross-platform profiles from search results
      for (const sr of results) {
        const alias = detectPlatformAlias(sr.url, sr.title, opts, searchName);
        if (alias && !result.aliases.some((a) => a.profile_url === alias.profile_url)) {
          result.aliases.push(alias);
        }
      }

      // Collect all unique URLs for scraping
      for (const r of results) {
        if (!urlsToScrape.includes(r.url)) {
          urlsToScrape.push(r.url);
        }
      }
    }

    // ── Step 5: Scrape ALL unique result URLs (Firecrawl scrape is reliable) ──
    // Limit to reasonable number to avoid burning all credits
    const maxScrape = Math.min(urlsToScrape.length, 15);
    for (let i = 0; i < maxScrape; i++) {
      const url = urlsToScrape[i];
      const crawl = await crawlPage(url);
      collectCrawlResults(crawl, url, result, opts.leadHandle, searchName);
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

    // ── Step 7: Scrape all discovered cross-platform aliases ──
    const aliasUrls = result.aliases
      .map((a) => a.profile_url)
      .filter((url) => url !== opts.leadProfileUrl);

    for (const url of aliasUrls) {
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
      // Nested URLs from alias pages
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
        } catch { /* skip */ }
      }
    }

    // ── Step 8: Firecrawl-scrape contact/about pages from the found website ──
    // If we found a website alias, try scraping common contact page paths
    const websiteUrls = result.aliases
      .filter((a) => a.platform === "website")
      .map((a) => a.profile_url);
    for (const site of websiteUrls) {
      const contactPaths = ["/contact", "/contact-us", "/about", "/team", "/about-us", "/contact-us.html"];
      for (const path of contactPaths) {
        const contactUrl = site.replace(/\/$/, "") + path;
        try {
          const contactCrawl = await crawlPage(contactUrl);
          for (const email of contactCrawl.emails) {
            if (!result.emails.some((e) => e.email === email)) {
              const { confidence: conf } = computeEmailConfidence(email, opts.leadHandle, searchName);
              if (conf >= MIN_CONFIDENCE) {
                result.emails.push({ email, source_url: contactUrl, confidence: conf });
              }
            }
          }
        } catch { /* skip */ }
      }
    }

    // ── Step 9: generateProbableEmails() as last resort ──
    if (result.emails.length === 0 && (firstName || lastName)) {
      const generated = generateProbableEmails(firstName, lastName, cleanHandle, opts.leadNickname);
      for (const email of generated) {
        if (!result.emails.some((e) => e.email === email)) {
          result.emails.push({ email, source_url: null, confidence: 50 });
        }
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

  if (f && l) {
    for (const d of domains) emails.push(`${f}.${l}@${d}`);
    emails.push(`${f}${l}@gmail.com`);
    emails.push(`${l}.${f}@gmail.com`);
  }
  if (clean && clean !== `${f}${l}` && clean !== f) {
    emails.push(`${clean}@gmail.com`);
    emails.push(`${clean}@outlook.com`);
  }
  if (nick && nick !== clean && nick !== `${f}.${l}`) {
    emails.push(`${nick}@gmail.com`);
    emails.push(`${nick}@proton.me`);
  }
  if (f && !l) {
    emails.push(`${f}@gmail.com`);
    emails.push(`${f}@outlook.com`);
  }
  if (f && l) emails.push(`${f[0]}${l}@gmail.com`);

  return [...new Set(emails)];
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