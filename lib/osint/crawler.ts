/* ── Page Crawler — Fetch & regex HTML extraction ── */
/* No browser needed. Works on Vercel, anywhere.          */

import { buildHeaders, FETCH_TIMEOUT, MAX_PAGES_PER_CYCLE } from "./config";
import { extractEmails, extractPhones, extractUrls } from "./extractor";
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
  const skipPatterns = [
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
 * Crawl a single page via HTTP fetch — visit URL, extract HTML, regex for contacts.
 */
export async function crawlPage(url: string): Promise<CrawlResult> {
  if (shouldSkipUrl(url)) {
    return { emails: [], phones: [], urls: [] };
  }

  const result: CrawlResult = { emails: [], phones: [], urls: [] };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(normalizeUrl(url), {
      headers: buildHeaders(),
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    const html = await response.text();

    // Extract from full HTML
    const emailDedup = new Set<string>();
    result.emails = extractEmails(html, emailDedup).slice(0, 10);
    result.phones = extractPhones(html).slice(0, 5);
    result.urls = extractUrls(html).slice(0, 10);

    // Also try to get visible text approximation (strip tags for phone regex)
    const text = html.replace(/<[^>]*>/g, " ");
    const textPhones = extractPhones(text);
    for (const p of textPhones) {
      if (!result.phones.includes(p)) result.phones.push(p);
    }
    result.phones = result.phones.slice(0, 5);
  } catch (err) {
    console.error(`crawlPage error: ${url.slice(0, 80)}:`, (err as Error).message);
  }

  return result;
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
    try {
      const cr = await crawlPage(sr.url);
      results.set(sr.url, cr);
    } catch {
      results.set(sr.url, { emails: [], phones: [], urls: [] });
    }
    if (i < limit - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results;
}