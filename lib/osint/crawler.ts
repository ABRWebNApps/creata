/* ── Page Crawler — Firecrawl-scrape primary, direct fetch fallback ── */
/* Firecrawl scrape gets us the page content reliably (bypasses Vercel IP  */
/* blocks). Direct fetch tried first (no credit cost), Firecrawl on fail.   */

import { buildHeaders, FETCH_TIMEOUT, getFirecrawlApiKey } from "./config";
import { extractEmails, extractPhones, extractUrls } from "./extractor";
import { firecrawlScrape } from "./searcher";
import type { CrawlResult } from "./types";

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
 * Crawl a single page.
 * Strategy: try direct fetch first (free), Firecrawl scrape on failure (1 credit).
 * Firecrawl scrape is ALSO used for social/contact pages (JS rendering) even when
 * direct fetch succeeds, to get more complete content.
 */
export async function crawlPage(url: string): Promise<CrawlResult> {
  if (shouldSkipUrl(url)) {
    return { emails: [], phones: [], urls: [] };
  }

  const normalizedUrl = normalizeUrl(url);
  let content: string | null = null;

  // Strategy 1: Direct fetch (free, no credit cost)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const response = await fetch(normalizedUrl, {
      headers: buildHeaders(),
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (response.ok) {
      content = await response.text();
    }
  } catch {
    // fetch failed, fall through to Firecrawl
  }

  // Strategy 2: Firecrawl scrape (1 credit, reliable).
  // ALWAYS fall back to Firecrawl when direct fetch gave us nothing —
  // Vercel IPs get blocked by most sites, so direct fetch is often empty.
  if (!content) {
    const fcContent = await firecrawlScrape(normalizedUrl);
    if (fcContent) {
      content = fcContent;
    }
  }

  // Strategy 3: For social/contact pages, ALSO prefer Firecrawl content
  // even when direct fetch worked — Firecrawl renders JS and gets the
  // full page, not just initial HTML.
  if (content && isSocialOrContactUrl(normalizedUrl)) {
    const fcContent = await firecrawlScrape(normalizedUrl);
    if (fcContent) {
      content = fcContent;
    }
  }

  if (!content) {
    return { emails: [], phones: [], urls: [] };
  }

  // Extract contacts from content
  const emailDedup = new Set<string>();
  const emails = extractEmails(content, emailDedup).slice(0, 10);
  const phones = extractPhones(content).slice(0, 5);
  const urls = extractUrls(content).slice(0, 10);

  // Also try plain text for phone regex (strip HTML tags)
  const plainText = content.replace(/<[^>]*>/g, " ");
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
 * Check if a URL is a social media or contact page where JS rendering
 * matters — always use Firecrawl for these.
 */
function isSocialOrContactUrl(url: string): boolean {
  const lower = url.toLowerCase();
  const patterns = [
    "linkedin.com/in/",
    "linkedin.com/company/",
    "instagram.com/",
    "twitter.com/",
    "facebook.com/",
    "contact",
    "/about",
    "/team",
    "/staff",
  ];
  return patterns.some((p) => lower.includes(p));
}