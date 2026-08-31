/* ── Search Engine Scraper — Free engines first, Firecrawl fallback ── */
/* 1. DuckDuckGo + Bing scrape the search results directly (0 credits)   */
/* 2. Firecrawl search (1 credit) only when free engines return nothing  */
/* 3. Firecrawl scrape for full page content when direct fetch is blocked */

import { getFirecrawlApiKey, buildHeaders } from "./config";
import type { SearchResult } from "./types";

const FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v1/search";
const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v1/scrape";

const FIRECRAWL_TIMEOUT = 15_000;
const FREE_ENGINE_TIMEOUT = 6_000;

/* ── HTML helpers ── */

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(url: string): string {
  let u = url.trim();
  // DuckDuckGo wraps real URLs in //duckduckgo.com/l/?uddg=<encoded>&rut=...
  if (u.includes("uddg=")) {
    const m = u.match(/[?&]uddg=([^&]+)/);
    if (m) {
      try { u = decodeURIComponent(m[1]); } catch { /* keep as-is */ }
    }
  }
  if (u.startsWith("//")) u = "https:" + u;
  return u;
}

function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = r.url.replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/* ── Free engine: DuckDuckGo HTML (0 credits) ── */

async function duckDuckGoSearch(query: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FREE_ENGINE_TIMEOUT);
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: { ...buildHeaders(), "Accept-Language": "en-US,en;q=0.9" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return [];

    const html = await res.text();
    const results: SearchResult[] = [];
    // Each DDG result block starts with <div class="result results_links ...
    const blocks = html.split(/<div class="result results_links/);
    for (const block of blocks.slice(1)) {
      const hrefMatch = block.match(/href="([^"]+)"/);
      const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      if (!hrefMatch || !titleMatch) continue;
      const url = normalizeUrl(hrefMatch[1]);
      if (!url.startsWith("http")) continue;
      if (url.includes("duckduckgo.com")) continue;
      results.push({
        url,
        title: stripTags(titleMatch[1]),
        snippet: snippetMatch ? stripTags(snippetMatch[1]) : "",
      });
    }
    return results;
  } catch {
    return [];
  }
}

/* ── Free engine: Bing (0 credits) ── */

async function bingSearch(query: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FREE_ENGINE_TIMEOUT);
    const res = await fetch(
      `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=15&setlang=en`,
      {
        headers: { ...buildHeaders(), "Accept-Language": "en-US,en;q=0.9" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return [];

    const html = await res.text();
    const results: SearchResult[] = [];
    const blocks = html.match(/<li class="b_algo"[\s\S]*?<\/li>/g) || [];
    for (const block of blocks) {
      const urlMatch = block.match(/<h2><a href="([^"]+)"/);
      const titleMatch = block.match(/<h2>[\s\S]*?>(.*?)<\/a><\/h2>/);
      const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      if (!urlMatch) continue;
      const url = urlMatch[1];
      if (!url.startsWith("http")) continue;
      if (url.includes("bing.com") || url.includes("microsoft.com")) continue;
      results.push({
        url,
        title: titleMatch ? stripTags(titleMatch[1]) : "",
        snippet: snippetMatch ? stripTags(snippetMatch[1]) : "",
      });
    }
    return results;
  } catch {
    return [];
  }
}

/* ── Firecrawl search — 1 credit. Used when free engines return nothing ── */

async function firecrawlSearch(query: string): Promise<SearchResult[]> {
  const apiKey = getFirecrawlApiKey();
  if (!apiKey) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT);

    const res = await fetch(FIRECRAWL_SEARCH_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, limit: 10 }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) {
      console.error(`[osint] Firecrawl search ${res.status} for "${query}"`);
      return [];
    }

    const json = await res.json() as { success?: boolean; data?: Array<{ url: string; title?: string; description?: string }> };
    if (!json.success || !json.data) return [];

    return json.data
      .map((d) => ({
        url: d.url,
        title: d.title || "",
        snippet: d.description || "",
      }))
      .filter((r) => r.url.startsWith("http") && !r.url.includes("firecrawl.dev"));
  } catch {
    return [];
  }
}

/**
 * Firecrawl scrape — 1 credit. Fetches full page content as markdown.
 * This is the RELIABLE way to get page content (unlike direct fetch
 * which gets blocked on Vercel IPs).
 */
export async function firecrawlScrape(url: string): Promise<string | null> {
  const apiKey = getFirecrawlApiKey();
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FIRECRAWL_TIMEOUT);

    const res = await fetch(FIRECRAWL_SCRAPE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"] }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) {
      console.error(`[osint] Firecrawl scrape ${res.status} for ${url}`);
      return null;
    }

    const json = await res.json() as { success?: boolean; data?: { markdown?: string } };
    return json.success && json.data?.markdown ? json.data.markdown : null;
  } catch {
    return null;
  }
}

/**
 * Build dorking-style search queries based on a person's name/handle.
 * These are designed to find pages that are likely to contain email addresses.
 */
export function buildEmailSearchQueries(name: string, handle: string): string[] {
  const n = name.trim();
  const h = handle.replace(/^@/, "").trim();
  const queries: string[] = [];

  // Core name search — Firecrawl handles this well
  queries.push(n);

  // Email-specific searches (these often find contact pages)
  queries.push(`"${n}" email`);
  queries.push(`"${n}" contact`);
  queries.push(`"${n}" @`);

  // Handle-based searches
  if (h && h !== n.toLowerCase().replace(/\s/g, "")) {
    queries.push(h);
    queries.push(`"${h}" email`);
  }

  // Common email pattern searches — finds inboxes, directories, contact pages
  queries.push(`"${n}" "gmail.com" OR "outlook.com"`);
  queries.push(`"${n}" mail`);

  // LinkedIn profile search (often has email in contact info)
  queries.push(`site:linkedin.com/in "${n}"`);

  // Business/corporate pages — these often list email
  queries.push(`"${n}" "contact us" OR "email"`);

  return queries;
}

/**
 * Main search entry point.
 * Free engines (DDG + Bing, 0 credits) fire first in parallel and win
 * if any return results. Firecrawl (1 credit) is the reliable fallback.
 */
export async function searchEngine(
  query: string,
): Promise<{ results: SearchResult[]; rawHtml: string }> {
  const [ddg, bing] = await Promise.allSettled([
    duckDuckGoSearch(query),
    bingSearch(query),
  ]);

  let results: SearchResult[] = [];
  if (ddg.status === "fulfilled") results = results.concat(ddg.value);
  if (bing.status === "fulfilled") results = results.concat(bing.value);
  results = dedupeResults(results).slice(0, 10);

  // Free engines won — no credit spent
  if (results.length > 0) {
    return { results, rawHtml: rawFromResults(results) };
  }

  // Firecrawl fallback (1 credit) — reliable when free engines are blocked
  const fc = await firecrawlSearch(query);
  const fcResults = dedupeResults(fc).slice(0, 10);
  return { results: fcResults, rawHtml: rawFromResults(fcResults) };
}

function rawFromResults(results: SearchResult[]): string {
  return results.map((r) => `${r.title} ${r.snippet}`).join(" ");
}