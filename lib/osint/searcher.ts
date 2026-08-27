/* ── Search Engine Scraper — Parallel multi-engine for Vercel compatibility ── */
/* Runs ALL engines in parallel, takes the first successful result set   */
/* Engines: Bing, DuckDuckGo (full + lite), Yahoo, Google              */

import { buildHeaders } from "./config";
import type { SearchResult } from "./types";

const BING_URL = "https://www.bing.com/search";
const DDG_HTML_URL = "https://html.duckduckgo.com/html";
const DDG_LITE_URL = "https://lite.duckduckgo.com/lite/";
const YAHOO_URL = "https://search.yahoo.com/search";
const GOOGLE_URL = "https://www.google.com/search";

/**
 * Run search engine queries across MULTIPLE engines in parallel.
 * Returns the best result set available.
 * On Vercel, some engines are blocked — parallel ensures at least one works.
 */
export async function searchEngine(
  query: string,
): Promise<{ results: SearchResult[]; rawHtml: string }> {
  // Run all engines in parallel
  const attempts = await Promise.allSettled([
    tryBing(query),
    tryDdgHtml(query),
    tryDdgLite(query),
    tryYahoo(query),
    tryGoogle(query),
  ]);

  // Collect all successful results, sorted by count (descending)
  const allResults: Array<{ results: SearchResult[]; rawHtml: string }> = [];
  for (const a of attempts) {
    if (a.status === "fulfilled" && a.value.results.length > 0) {
      allResults.push(a.value);
    }
  }

  if (allResults.length === 0) return { results: [], rawHtml: "" };

  // Return the engine with the most results
  allResults.sort((a, b) => b.results.length - a.results.length);
  return allResults[0];
}

/** Search via Bing HTML */
async function tryBing(query: string): Promise<{ results: SearchResult[]; rawHtml: string }> {
  try {
    const url = `${BING_URL}?q=${encodeURIComponent(query)}&hl=en`;
    const headers = buildHeaders();
    headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    headers["Accept-Language"] = "en-US,en;q=0.5";
    headers["Referer"] = "https://www.bing.com/";

    const response = await fetch(url, { headers, redirect: "follow" });
    const rawHtml = await response.text();
    const results = parseBingResults(rawHtml);
    return { results, rawHtml };
  } catch (err) {
    console.error("Bing search failed:", (err as Error).message);
    return { results: [], rawHtml: "" };
  }
}

/** Search via DuckDuckGo HTML (full version) */
async function tryDdgHtml(query: string): Promise<{ results: SearchResult[]; rawHtml: string }> {
  try {
    const url = `${DDG_HTML_URL}?q=${encodeURIComponent(query)}`;
    const headers = buildHeaders();
    headers["Origin"] = "https://duckduckgo.com";
    headers["Referer"] = "https://duckduckgo.com/";
    headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

    const response = await fetch(url, { headers, redirect: "follow" });
    const rawHtml = await response.text();
    const results = parseDdgResults(rawHtml);
    return { results, rawHtml };
  } catch (err) {
    console.error("DDG search failed:", (err as Error).message);
    return { results: [], rawHtml: "" };
  }
}

/** Search via DuckDuckGo Lite (simpler HTML, harder to block) */
async function tryDdgLite(query: string): Promise<{ results: SearchResult[]; rawHtml: string }> {
  try {
    const headers = buildHeaders();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers["Referer"] = "https://lite.duckduckgo.com/lite/";

    const response = await fetch(DDG_LITE_URL, {
      method: "POST",
      headers,
      body: `q=${encodeURIComponent(query)}`,
      redirect: "follow",
    });
    const rawHtml = await response.text();
    const results = parseDdgLiteResults(rawHtml);
    return { results, rawHtml };
  } catch (err) {
    console.error("DDG Lite search failed:", (err as Error).message);
    return { results: [], rawHtml: "" };
  }
}

/** Search via Yahoo (uses Bing results, different blocking profile) */
async function tryYahoo(query: string): Promise<{ results: SearchResult[]; rawHtml: string }> {
  try {
    const url = `${YAHOO_URL}?p=${encodeURIComponent(query)}&ei=UTF-8`;
    const headers = buildHeaders();
    headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    headers["Accept-Language"] = "en-US,en;q=0.5";
    headers["Referer"] = "https://search.yahoo.com/";

    const response = await fetch(url, { headers, redirect: "follow" });
    const rawHtml = await response.text();
    const results = parseYahooResults(rawHtml);
    return { results, rawHtml };
  } catch (err) {
    console.error("Yahoo search failed:", (err as Error).message);
    return { results: [], rawHtml: "" };
  }
}

/** Search via Google (sometimes works with mobile User-Agent on Vercel) */
async function tryGoogle(query: string): Promise<{ results: SearchResult[]; rawHtml: string }> {
  try {
    const url = `${GOOGLE_URL}?q=${encodeURIComponent(query)}&hl=en`;
    const headers = buildHeaders();
    headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    headers["Accept-Language"] = "en-US,en;q=0.5";

    // Do NOT set Referer — Google blocks known referrers
    delete headers["Referer"];

    const response = await fetch(url, { headers, redirect: "follow" });
    const rawHtml = await response.text();
    const results = parseGoogleResults(rawHtml);
    return { results, rawHtml };
  } catch (err) {
    console.error("Google search failed:", (err as Error).message);
    return { results: [], rawHtml: "" };
  }
}

/* ================================================================
   PARSERS — one per engine
   ================================================================ */

/** Parse DuckDuckGo full HTML */
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
      try { return decodeURIComponent(uddgMatch[1]); } catch { }
    }
  }
  return raw;
}

/** Parse DuckDuckGo Lite results (simpler HTML table format) */
function parseDdgLiteResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  // DDG Lite uses <tr class="result"> tables with <a rel="nofollow"> for URLs
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

    // Snippet is in a <td> with class "result-snippet" or next <td>
    const snippetMatch = row.match(/<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/i);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : "";

    results.push({ url, title, snippet });
  }

  return results.slice(0, 10);
}

/** Parse Yahoo search results */
function parseYahooResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  // Yahoo uses <div class="algo-sr"> or <div class="dd">
  const algoRe = /<div[^>]*class="[^"]*(?:algo-sr|dd)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let match: RegExpExecArray | null;

  while ((match = algoRe.exec(html)) !== null) {
    const block = match[1];
    const aMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i);
    if (!aMatch) continue;
    const url = aMatch[1].replace(/&amp;/g, "&");
    if (seen.has(url) || url.includes("yahoo.com")) continue;
    seen.add(url);

    const titleMatch = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : "";

    const snippetMatch = block.match(/<div[^>]*class="[^"]*(?:compText|snippet)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const snippet = snippetMatch ? stripTags(snippetMatch[1]) : "";

    results.push({ url, title, snippet });
  }

  return results.slice(0, 10);
}

/** Parse Google search results */
function parseGoogleResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  // Google uses <div class="g"> for each result
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

/** Parse Bing search results */
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