/* ── Search Engine Scraper — Fetch-based, no browser needed ── */
/* Uses Bing (primary, works on Vercel) + DuckDuckGo as fallback */

import { buildHeaders, FETCH_TIMEOUT } from "./config";
import type { SearchResult } from "./types";

const DDG_URL = "https://html.duckduckgo.com/html";
const BING_URL = "https://www.bing.com/search";

/**
 * Run search engine queries. Bing first, fallback to DDG.
 */
export async function searchEngine(
  query: string,
  _engine?: string,
): Promise<{ results: SearchResult[]; rawHtml: string }> {
  // Try Bing first (most reliable on Vercel/Node.js fetch)
  const bing = await tryBing(query);
  if (bing.results.length >= 3) return bing;

  // Fallback to DDG
  const ddg = await tryDdg(query);
  if (ddg.results.length > 0) return ddg;

  // Return whatever we got
  return bing.results.length > 0 ? bing : ddg;
}

/** Search via Bing HTML */
async function tryBing(query: string): Promise<{ results: SearchResult[]; rawHtml: string }> {
  try {
    const url = `${BING_URL}?q=${encodeURIComponent(query)}&hl=en`;
    const headers = buildHeaders();
    headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    headers["Accept-Language"] = "en-US,en;q=0.5";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const response = await fetch(url, { headers, signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);

    const rawHtml = await response.text();
    const results = parseBingResults(rawHtml);
    return { results, rawHtml };
  } catch (err) {
    console.error("Bing search failed:", (err as Error).message);
    return { results: [], rawHtml: "" };
  }
}

/** Search via DuckDuckGo HTML */
async function tryDdg(query: string): Promise<{ results: SearchResult[]; rawHtml: string }> {
  try {
    const url = `${DDG_URL}?q=${encodeURIComponent(query)}`;
    const headers = buildHeaders();
    headers["Origin"] = "https://duckduckgo.com";
    headers["Referer"] = "https://duckduckgo.com/";
    headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const response = await fetch(url, { headers, signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);

    const rawHtml = await response.text();
    const results = parseDdgResults(rawHtml);
    return { results, rawHtml };
  } catch (err) {
    console.error("DDG search failed:", (err as Error).message);
    return { results: [], rawHtml: "" };
  }
}

/**
 * Parse DuckDuckGo HTML results.
 */
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
      } catch { }
    }
  }

  return results.slice(0, 10);
}

function decodeDdgUrl(raw: string): string {
  if (raw.includes("duckduckgo.com/l/")) {
    const uddgMatch = raw.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        return decodeURIComponent(uddgMatch[1]);
      } catch { }
    }
  }
  return raw;
}

/**
 * Parse Bing search results from HTML.
 */
function parseBingResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  const liRe = /<li[^>]*class="[^"]*b_algo[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;

  while ((match = liRe.exec(html)) !== null) {
    const li = match[1];
    const aMatch = li.match(/<a\s+href="(https?:\/\/[^"]+?)"/i);
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
        } catch { }
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
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}