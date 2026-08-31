/* ── OSINT Engine — Fast parallel pipeline ── */
/* 1. Search snippets + own-profile crawl (parallel, fast)         */
/* 2. Only scrape pages that SIGNAL emails (have @ in snippet)     */
/* 3. Phone max 3. Generated fallback included. Speed target <30s  */

import { searchEngine, firecrawlScrape } from "./searcher";
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
import type { EnrichOptions, EnrichResult, CrawlResult } from "./types";

export async function enrichLead(opts: EnrichOptions): Promise<EnrichResult> {
  const result: EnrichResult = { emails: [], phones: [], aliases: [], errors: [] };

  const cleanHandle = stripTrailingDigits(opts.leadHandle);
  const searchName = opts.leadNickname || cleanHandle;
  const nameParts = searchName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || searchName;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  // Extract contextual keywords from bio if none provided
  let keywords = opts.leadKeywords || [];
  if (keywords.length === 0 && opts.leadBio) {
    const bioLower = opts.leadBio.toLowerCase();
    const nichePatterns: [RegExp, string][] = [
      [/\b(real\s*estate|property|housing)/i, 'real estate'],
      [/\b(coach|consultant|mentor|advisor)/i, 'consultant'],
      [/\b(marketer|growth|sales|gtm)/i, 'marketing'],
      [/\b(crypto|web3|blockchain)/i, 'crypto'],
      [/\b(fintech|finance|invest|trading)/i, 'finance'],
      [/\b(saas|b2b|enterprise)/i, 'saas'],
      [/\b(health|wellness|fitness|nutrition)/i, 'wellness'],
      [/\b(founder|ceo|owner|entrepreneur)/i, 'entrepreneur'],
      [/\b(developer|engineer|programmer)/i, 'developer'],
      [/\b(designer|artist|photographer)/i, 'creative'],
      [/\b(lawyer|legal|attorney)/i, 'legal'],
      [/\b(agency|freelancer|freelance)/i, 'agency'],
    ];
    for (const [pattern, label] of nichePatterns) {
      if (pattern.test(bioLower)) {
        keywords.push(label);
      }
    }
  }

  try {
    // ── Step 1: Bio fast-path ──
    const bioEmails = extractEmailsFromBio(opts.leadBio);
    for (const email of bioEmails) {
      const { confidence: conf } = computeEmailConfidence(email, opts.leadHandle, searchName);
      result.emails.push({ email, source_url: null, confidence: Math.max(BIO_REGEX_CONFIDENCE, conf) });
    }

    const bioWebsite = extractWebsiteFromBio(opts.leadBio);
    if (bioWebsite) result.aliases.push({ platform: "website", profile_url: bioWebsite });

    // ── Step 2: Run 3 smart searches (parallel, fast) ──
    const smartQueries = [
      searchName,
      `${searchName} email OR contact`,
      cleanHandle,
    ];
    if (cleanHandle !== searchName.toLowerCase().replace(/\s/g, "")) {
      smartQueries.push(`${cleanHandle} email`);
    }

    // Add keyword-augmented queries for better niche targeting
    for (const kw of keywords) {
      if (kw.trim()) {
        smartQueries.push(`${searchName} ${kw}`);
        if (cleanHandle !== searchName.toLowerCase().replace(/\s/g, '')) {
          smartQueries.push(`${cleanHandle} ${kw}`);
        }
      }
    }

    const searchResponses = await Promise.allSettled(
      smartQueries.map((q) => searchEngine(q)),
    );

    // Collect all search results, detect snippets containing @ (email signals)
    const allResults: Array<{ url: string; title: string; snippet: string }> = [];
    const emailSignalPages: string[] = [];

    for (const sr of searchResponses) {
      if (sr.status !== "fulfilled") continue;
      for (const r of sr.value.results) {
        if (!allResults.some((x) => x.url === r.url)) {
          allResults.push(r);
          // Check if snippet contains @ → page likely has an email
          if (r.snippet.includes("@") || r.title.includes("@") || /email|contact|mail/i.test(r.snippet)) {
            emailSignalPages.push(r.url);
          }
        }
      }
      // Extract emails from snippets immediately
      const snippetEmails = extractEmails(sr.value.rawHtml);
      for (const email of snippetEmails) {
        if (!result.emails.some((e) => e.email === email)) {
          const { confidence: conf } = computeEmailConfidence(email, opts.leadHandle, searchName);
          if (conf >= MIN_CONFIDENCE) result.emails.push({ email, source_url: null, confidence: conf });
        }
      }
    }

    // Detect cross-platform aliases
    for (const r of allResults) {
      const alias = detectPlatformAlias(r.url, r.title, opts, searchName);
      if (alias && !result.aliases.some((a) => a.profile_url === alias.profile_url)) {
        result.aliases.push(alias);
      }
    }

    // ── Step 3: Crawl own profile (+ website from bio) in parallel ──
    const ownAndWebsite: string[] = [];
    if (CRAWL_OWN_PROFILE && opts.leadProfileUrl) ownAndWebsite.push(opts.leadProfileUrl);
    for (const a of result.aliases) {
      if (a.platform === "website" && a.profile_url !== opts.leadProfileUrl) {
        ownAndWebsite.push(a.profile_url);
      }
    }
    const ownCrawls = await Promise.allSettled(ownAndWebsite.map((u) => crawlPage(u)));
    for (const c of ownCrawls) {
      if (c.status === "fulfilled") {
        collectCrawlResults(c.value, "", result, opts.leadHandle, searchName);
      }
    }

    // ── Step 4: Scrape only pages that SIGNAL emails (max 5, parallel) ──
    const pagesToScrape = emailSignalPages.slice(0, 5).filter(
      (url) => !ownAndWebsite.includes(url),
    );
    if (pagesToScrape.length > 0) {
      const scraped = await Promise.allSettled(pagesToScrape.map((u) => crawlPage(u)));
      for (const c of scraped) {
        if (c.status === "fulfilled") {
          collectCrawlResults(c.value, "", result, opts.leadHandle, searchName);
        }
      }
    }

    // ── Step 5: If we have ANY results but no emails yet, try scraping
    //     the top 3 search results directly (firecrawl scrape bypasses blocks)
    if (result.emails.length === 0 && allResults.length > 0) {
      const topUrls = allResults.slice(0, 3).map((r) => r.url);
      const fallbackScrapes = await Promise.allSettled(topUrls.map((u) => firecrawlScrape(u)));
      for (const fs of fallbackScrapes) {
        if (fs.status === "fulfilled" && fs.value) {
          const snippetEmails = extractEmails(fs.value);
          for (const email of snippetEmails) {
            if (!result.emails.some((e) => e.email === email)) {
              const { confidence: conf } = computeEmailConfidence(email, opts.leadHandle, searchName);
              if (conf >= MIN_CONFIDENCE) result.emails.push({ email, source_url: null, confidence: conf });
            }
          }
        }
      }
    }

    // ── Step 6: Cap phones at 3 ──
    result.phones = result.phones.slice(0, 3);

    // ── Step 7: Generate fallback (only if NO real emails found) ──
    if (result.emails.length === 0 && (firstName || lastName)) {
      for (const email of generateProbableEmails(firstName, lastName, cleanHandle, opts.leadNickname)) {
        if (!result.emails.some((e) => e.email === email)) {
          result.emails.push({ email, source_url: null, confidence: 50 });
        }
      }
    }

  } catch (err) {
    result.errors.push(`Enrichment error: ${(err as Error).message}`);
    // Generate fallback even on error
    if (result.emails.length === 0 && (firstName || lastName)) {
      for (const email of generateProbableEmails(firstName, lastName, cleanHandle, opts.leadNickname)) {
        if (!result.emails.some((e) => e.email === email)) {
          result.emails.push({ email, source_url: null, confidence: 50 });
        }
      }
    }
  }

  return result;
}

function stripTrailingDigits(s: string): string {
  return s.replace(/\d+$/, "");
}

function generateProbableEmails(firstName: string, lastName: string, cleanHandle: string, nickname: string | undefined): string[] {
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
  } else if (f) {
    emails.push(`${f}@gmail.com`);
    emails.push(`${f}@outlook.com`);
  }
  if (clean && clean !== `${f}${l}` && clean !== f) {
    emails.push(`${clean}@gmail.com`);
    emails.push(`${clean}@outlook.com`);
  }
  if (nick && nick !== clean && nick !== `${f}.${l}`) {
    emails.push(`${nick}@gmail.com`);
    emails.push(`${nick}@proton.me`);
  }
  if (f && l) emails.push(`${f[0]}${l}@gmail.com`);

  return [...new Set(emails)];
}

function detectPlatformAlias(url: string, title: string, opts: EnrichOptions, searchName: string): { platform: string; profile_url: string } | null {
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

function collectCrawlResults(crawl: CrawlResult, sourceUrl: string, result: EnrichResult, handle: string, name: string) {
  const src = sourceUrl || null;
  for (const email of crawl.emails) {
    if (!result.emails.some((e) => e.email === email)) {
      const { confidence: conf } = computeEmailConfidence(email, handle, name);
      if (conf >= MIN_CONFIDENCE) result.emails.push({ email, source_url: src, confidence: conf });
    }
  }
  for (const phone of crawl.phones) {
    if (!result.phones.some((p) => p.phone === phone)) {
      result.phones.push({ phone, source_url: src, confidence: CRAWLED_PAGE_CONFIDENCE });
    }
  }
}