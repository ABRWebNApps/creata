/* ── Search Engine Scraper — Firecrawl-primary with dorking queries ── */
/* Firecrawl search + scrape every result page to extract real emails.   */
/* Google-style dorking queries to find pages likely containing emails.   */

import { getFirecrawlApiKey } from "./config";
import type { SearchResult } from "./types";

const FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v1/search";
const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v1/scrape";

const FIRECRAWL_TIMEOUT = 20_000;

/**
 * Firecrawl search — 1 credit. Returns search results with URLs/titles/snippets.
 */
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
    if (!res.ok) return [];

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
    if (!res.ok) return null;

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
 * Runs ALL dorking queries through Firecrawl, merges results deduped by URL.
 */
export async function searchEngine(
  query: string,
): Promise<{ results: SearchResult[]; rawHtml: string }> {
  const results = await firecrawlSearch(query);
  const rawHtml = results.map((r) => `${r.title} ${r.snippet}`).join(" ");
  return { results, rawHtml };
}