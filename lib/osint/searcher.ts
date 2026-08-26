/* ── Search Engine Scraper — Fetch-based, no browser needed ── */
/* Uses DuckDuckGo (clean HTML, no JS) + Bing as fallback      */
/* Deployable on Vercel, WSL, Windows — anywhere fetch works   */

import { buildHeaders, FETCH_TIMEOUT } from "./config";
import type { SearchResult } from "./types";

const DDG_URL = "https://html.duckduckgo.com/html";
const BING_URL = "https://www.bing.com/search";

/**
 * Run a search engine query via plain HTTP fetch.
 * DuckDuckGo returns clean HTML results without JavaScript.
 */
export async function searchEngine(
  query: string,
  engine: "google" | "bing" = "bing",
): Promise<{ results: SearchResult[]; rawHtml: string }> {
  let rawHtml = "";
  let results: SearchResult[] = [];

  try {
    // Build URL and headers
    const isDdg = engine !== "bing";
    const url = isDdg
      ? `${DDG_URL}?q=${encodeURIComponent(query)}`
      : `${BING_URL}?q=${encodeURIComponent(query)}&hl=en`;

    const headers = buildHeaders();
    // DDG needs a real referer
    if (isDdg) headers["Origin"] = "https://duckduckgo.com";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);

    rawHtml = await response.text();

    if (isDdg) {
      results = parseDdgResults(rawHtml);
    } else {
      results = parseBingResults(rawHtml);
    }
  } catch (err) {
    console.error(`searchEngine error (${engine}):`, (err as Error).message);
  }

  return { results, rawHtml };
}

/**
 * Parse DuckDuckGo HTML results.
 * DDG uses <a class="result__a" href="..."> for result links,
 * with <a class="result__snippet"> for descriptions.
 */
function parseDdgResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  // Each result is inside <div class="result results_links_deep">
  const blockRe = /<div[^>]*class="[^"]*\bresults_links_deep\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(html)) !== null) {
    const block = match[1];

    // Extract URL — DDG wraps in redirect: <a class="result__a" href="//duckduckgo.com/l/?uddg=...">
    const aMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"/i);
    if (!aMatch) continue;

    // Decode DDG redirect URL
    let url = decodeDdgUrl(aMatch[1]);
    if (!url.startsWith("http") || seen.has(url)) continue;
    seen.add(url);

    // Title is the text of the <a class="result__a">
    const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : "";

    // Snippet is in <a class="result__snippet">
    const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : "";

    results.push({ url, title, snippet });
  }

  // Fallback: try extracting all external links from DDG result links
  if (results.length < 3) {
    const fallbackRe = /uddg=([^"&]+)/g;
    while ((match = fallbackRe.exec(html)) !== null) {
      try {
        const url = decodeURIComponent(match[1]);
        if (seen.has(url) || !url.startsWith("http")) continue;
        seen.add(url);
        results.push({ url, title: "", snippet: "" });
      } catch {}
    }
  }

  return results.slice(0, 10);
}

/** Decode DuckDuckGo redirect URL */
function decodeDdgUrl(raw: string): string {
  if (raw.includes("duckduckgo.com/l/")) {
    const uddgMatch = raw.match(/uddg=([^&]+)/);
    if (uddgMatch) {
      try {
        return decodeURIComponent(uddgMatch[1]);
      } catch {}
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

    // Decode Bing tracking URL (fetch returns bing.com/ck/a redirects)
    if (rawUrl.includes("bing.com/ck/a")) {
      const uPos = rawUrl.indexOf("&u=");
      if (uPos > 0) {
        try {
          const enc = rawUrl.substring(uPos + 3).split("&")[0];
          const dec = Buffer.from(enc, "base64").toString("utf-8");
          const decoded = dec.replace(/^[^a-zA-Z0-9]+/, "");
          if (decoded.startsWith("http")) rawUrl = decoded;
        } catch {}
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

/** Strip HTML tags */
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