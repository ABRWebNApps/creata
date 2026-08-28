/* ── Search Engine Scraper — Firecrawl always, free engines supplement ── */
/* Firecrawl runs as the primary search engine. Free engines (Bing, DDG,   */
/* Google) run with short timeout — their results are MERGED with          */
/* Firecrawl results for more crawl targets. Firecrawl is never skipped.   */

import { buildHeaders, getFirecrawlApiKey } from "./config";
import type { SearchResult } from "./types";

const BING_URL = "https://www.bing.com/search";
const DDG_HTML_URL = "https://html.duckduckgo.com/html";
const DDG_LITE_URL = "https://lite.duckduckgo.com/lite/";
const GOOGLE_URL = "https://www.google.com/search";

const FIRECRAWL_SEARCH_URL = "https://api.firecrawl.dev/v1/search";
const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v1/scrape";

const FREE_ENGINE_TIMEOUT = 4_000;
const FIRECRAWL_TIMEOUT = 15_000;

/**
 * Firecrawl search — 1 credit.
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
      body: JSON.stringify({ query, limit: 8 }),
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
 * Firecrawl scrape — 1 credit. Used as fallback when direct fetch fails.
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
 * Main search entry point.
 *
 * Firecrawl ALWAYS runs as primary. Free engines run in parallel with short
 * timeout — their results are MERGED with Firecrawl results (deduped by URL).
 * This gives more crawl targets while Firecrawl provides reliable search data.
 */
export async function searchEngine(
  query: string,
): Promise<{ results: SearchResult[]; rawHtml: string }> {
  // Firecrawl primary
  const fcPromise = firecrawlSearch(query);

  // Free engines — opportunistic supplement
  const freePromise = runFreeEngines(query);

  const [fcResults, freeResults] = await Promise.all([fcPromise, freePromise]);

  // Merge: Firecrawl results + any free engine URLs we don't already have
  const seen = new Set<string>();
  const merged: SearchResult[] = [];

  for (const r of fcResults) {
    if (!seen.has(r.url)) {
      seen.add(r.url);
      merged.push(r);
    }
  }
  for (const r of freeResults) {
    if (!seen.has(r.url)) {
      seen.add(r.url);
      merged.push(r);
    }
  }

  const rawHtml = merged.map((r) => `${r.title} ${r.snippet}`).join(" ");

  return { results: merged, rawHtml };
}

async function runFreeEngines(query: string): Promise<SearchResult[]> {
  const attempts = await Promise.allSettled([
    tryBing(query),
    tryDdgHtml(query),
    tryDdgLite(query),
    tryGoogle(query),
    tryGoogleMobile(query),
  ]);

  const seen = new Set<string>();
  const all: SearchResult[] = [];
  for (const a of attempts) {
    if (a.status === "fulfilled") {
      for (const r of a.value) {
        if (!seen.has(r.url)) {
          seen.add(r.url);
          all.push(r);
        }
      }
    }
  }
  return all;
}

async function fetchWithTimeout(
  urlOrReq: string | Request,
  opts?: RequestInit & { redirect?: RequestRedirect },
  timeoutMs: number = FREE_ENGINE_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(urlOrReq, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/* ── Individual free engine handlers ── */

async function tryBing(query: string): Promise<SearchResult[]> {
  try {
    const url = `${BING_URL}?q=${encodeURIComponent(query)}&hl=en`;
    const headers = buildHeaders();
    headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    headers["Accept-Language"] = "en-US,en;q=0.5";
    headers["Referer"] = "https://www.bing.com/";
    const response = await fetchWithTimeout(url, { headers, redirect: "follow" });
    return parseBingResults(await response.text());
  } catch { return []; }
}

async function tryDdgHtml(query: string): Promise<SearchResult[]> {
  try {
    const url = `${DDG_HTML_URL}?q=${encodeURIComponent(query)}`;
    const headers = buildHeaders();
    headers["Origin"] = "https://duckduckgo.com";
    headers["Referer"] = "https://duckduckgo.com/";
    headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    const response = await fetchWithTimeout(url, { headers, redirect: "follow" });
    return parseDdgResults(await response.text());
  } catch { return []; }
}

async function tryDdgLite(query: string): Promise<SearchResult[]> {
  try {
    const headers = buildHeaders();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers["Referer"] = "https://lite.duckduckgo.com/lite/";
    const response = await fetchWithTimeout(DDG_LITE_URL, {
      method: "POST", headers,
      body: `q=${encodeURIComponent(query)}`, redirect: "follow",
    });
    return parseDdgLiteResults(await response.text());
  } catch { return []; }
}

async function tryGoogle(query: string): Promise<SearchResult[]> {
  try {
    const url = `${GOOGLE_URL}?q=${encodeURIComponent(query)}&hl=en`;
    const headers = buildHeaders();
    headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    headers["Accept-Language"] = "en-US,en;q=0.5";
    delete headers["Referer"];
    const response = await fetchWithTimeout(url, { headers, redirect: "follow" });
    return parseGoogleResults(await response.text());
  } catch { return []; }
}

async function tryGoogleMobile(query: string): Promise<SearchResult[]> {
  try {
    const url = `${GOOGLE_URL}?q=${encodeURIComponent(query)}&hl=en`;
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate", "DNT": "1",
      "Upgrade-Insecure-Requests": "1",
    };
    const response = await fetchWithTimeout(url, { headers, redirect: "follow" });
    return parseGoogleResults(await response.text());
  } catch { return []; }
}

/* ================================================================
   PARSERS
   ================================================================ */

function parseDdgResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const blockRe = /<div[^>]*class="[^"]*\bresults_links_deep\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html)) !== null) {
    const block = match[1];
    const aMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"/i);
    if (!aMatch) continue;
    let url = decodeDdgUrl(aMatch[1]);
    if (!url.startsWith("http") || seen.has(url)) continue;
    seen.add(url);
    const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : "";
    const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : "";
    results.push({ url, title, snippet });
  }
  if (results.length < 3) {
    const fallbackRe = /uddg=([^"&]+)/g;
    while ((match = fallbackRe.exec(html)) !== null) {
      try {
        const url = decodeURIComponent(match[1]);
        if (seen.has(url) || !url.startsWith("http")) continue;
        seen.add(url);
        results.push({ url, title: "", snippet: "" });
      } catch { /* skip */ }
    }
  }
  return results.slice(0, 10);
}

function decodeDdgUrl(raw: string): string {
  if (raw.includes("duckduckgo.com/l/")) {
    const uddgMatch = raw.match(/uddg=([^&]+)/);
    if (uddgMatch) { try { return decodeURIComponent(uddgMatch[1]); } catch { /* skip */ } }
  }
  return raw;
}

function parseDdgLiteResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const rowRe = /<tr[^>]*class="result"[^>]*>([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;
  while ((match = rowRe.exec(html)) !== null) {
    const row = match[1];
    const urlMatch = row.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i);
    if (!urlMatch) continue;
    const url = urlMatch[1];
    if (seen.has(url) || url.includes("duckduckgo.com")) continue;
    seen.add(url);
    const titleMatch = row.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : "";
    const snippetMatch = row.match(/<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/i);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : "";
    results.push({ url, title, snippet });
  }
  return results.slice(0, 10);
}

function parseGoogleResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const gRe = /<div[^>]*class="[^"]*\bg\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let match: RegExpExecArray | null;
  while ((match = gRe.exec(html)) !== null) {
    const block = match[1];
    const aMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i);
    if (!aMatch) continue;
    let url = aMatch[1].replace(/&amp;/g, "&");
    if (seen.has(url) || url.includes("google.com")) continue;
    seen.add(url);
    const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : "";
    const snippetMatch = block.match(/<div[^>]*data-sncf[^>]*>([\s\S]*?)<\/div>/i)
      || block.match(/<span[^>]*class="[^"]*st[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : "";
    results.push({ url, title, snippet });
  }
  return results.slice(0, 10);
}

function parseBingResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  const liRe = /<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = liRe.exec(html)) !== null) {
    const li = match[1];
    const aMatch = li.match(/<a\s+href="(https?:\/\/[^\"]+?)"/i);
    if (!aMatch) continue;
    let rawUrl = aMatch[1].replace(/&amp;/g, "&");
    if (rawUrl.includes("bing.com/ck/a")) {
      const uPos = rawUrl.indexOf("&u=");
      if (uPos > 0) {
        try {
          const enc = rawUrl.substring(uPos + 3).split("&")[0];
          const dec = Buffer.from(enc, "base64").toString("utf-8");
          const decoded = dec.replace(/^[^a-zA-Z0-9]+/, "");
          if (decoded.startsWith("http")) rawUrl = decoded;
        } catch { /* skip */ }
      }
    }
    if (seen.has(rawUrl) || rawUrl.includes("bing.com")) continue;
    seen.add(rawUrl);
    const titleMatch = li.match(/<h2[^>]*>(.*?)<\/h2>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : "";
    const snippetMatch = li.match(/<p[^>]*>(.*?)<\/p>/i);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : "";
    results.push({ url: rawUrl, title, snippet });
  }
  return results;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}