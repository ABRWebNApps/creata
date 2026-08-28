/* ── Page Crawler — Retry-resistant fetch + Firecrawl fallback ── */
/* No browser needed. Retries 3x with different UAs, then falls   */
/* back to Firecrawl scrape if direct fetch keeps failing.        */

import { buildHeaders, FETCH_TIMEOUT, MAX_PAGES_PER_CYCLE, CRAWL_RETRY_COUNT, CRAWL_RETRY_DELAY_MS, getFirecrawlApiKey } from "./config";
import { extractEmails, extractPhones, extractUrls } from "./extractor";
import { firecrawlScrape } from "./searcher";
import type { CrawlResult, SearchResult } from "./types";

/** URL normalization */
function normalizeUrl(url: string): string {
  let n = url.trim();
  if (!/^https?:\/\//i.test(n)) n = "https://" + n;
  const hash = n.indexOf("#");
  if (hash > 0) n = n.substring(0, hash);
  return n;
}

/** Check if URL should be skipped */
function shouldSkipUrl(url: string): boolean {
  const lower = url.toLowerCase();
  const skipPatterns: (string | RegExp)[] = [
    "google.com/search",
    "bing.com/search",
    "facebook.com/sharer",
    "twitter.com/intent",
    "linkedin.com/share",
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i,
  ];
  for (const p of skipPatterns) {
    if (typeof p === "string" && lower.includes(p)) return true;
    if (p instanceof RegExp && p.test(lower)) return true;
  }
  return false;
}

/**
 * Retry fetch — up to CRAWL_RETRY_COUNT attempts with different UAs
 * and exponential backoff between attempts.
 */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < CRAWL_RETRY_COUNT; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      // Rotate UA on each retry
      const headers = buildHeaders();

      const response = await fetch(normalizeUrl(url), {
        headers,
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Exponential backoff: 1s, 2s, 4s
      const delay = CRAWL_RETRY_DELAY_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${CRAWL_RETRY_COUNT} attempts`);
}

/**
 * Extract contacts from raw text (HTML or markdown).
 */
function extractContacts(
  text: string,
): { emails: string[]; phones: string[]; urls: string[] } {
  const emailDedup = new Set<string>();
  const emails = extractEmails(text, emailDedup).slice(0, 10);
  const phones = extractPhones(text).slice(0, 5);
  const urls = extractUrls(text).slice(0, 10);

  // Also try visible text for phone regex (stripped of HTML tags)
  const plainText = text.replace(/<[^>]*>/g, " ");
  const textPhones = extractPhones(plainText);
  for (const p of textPhones) {
    if (!phones.includes(p)) phones.push(p);
  }

  return {
    emails,
    phones: phones.slice(0, 5),
    urls,
  };
}

/**
 * Crawl a single page — tries 3x with fetch, falls back to
 * Firecrawl scrape if all fetch attempts fail.
 */
export async function crawlPage(url: string): Promise<CrawlResult> {
  if (shouldSkipUrl(url)) {
    return { emails: [], phones: [], urls: [] };
  }

  // Strategy 1: Direct fetch with retry
  try {
    const response = await fetchWithRetry(url);
    const html = await response.text();
    const { emails, phones, urls } = extractContacts(html);
    return { emails, phones, urls };
  } catch {
    // fetch failed — do NOT log, do NOT surface as user-facing error
  }

  // Strategy 2: Firecrawl scrape fallback (1 credit, only used when fetch fails)
  const fcApiKey = getFirecrawlApiKey();
  if (fcApiKey) {
    const markdown = await firecrawlScrape(url);
    if (markdown) {
      const { emails, phones, urls } = extractContacts(markdown);
      return { emails, phones, urls };
    }
  }

  return { emails: [], phones: [], urls: [] };
}

/**
 * Crawl multiple pages from search results sequentially.
 */
export async function crawlSearchResults(
  searchResults: SearchResult[],
): Promise<Map<string, CrawlResult>> {
  const results = new Map<string, CrawlResult>();
  const limit = Math.min(searchResults.length, MAX_PAGES_PER_CYCLE);

  for (let i = 0; i < limit; i++) {
    const sr = searchResults[i];
    const cr = await crawlPage(sr.url);
    results.set(sr.url, cr);
    if (i < limit - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}