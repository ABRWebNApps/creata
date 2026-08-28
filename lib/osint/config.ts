/* ── OSINT Engine Configuration — browser-free, Vercel-compatible ── */

/** Random user agent pool — rotated per request to avoid detection */
export const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

/** Pick a random user agent */
export function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/** Timeout for individual search engine calls (ms) — shorter for Vercel */
export const PER_ENGINE_TIMEOUT = 8_000;

/** Timeout for HTTP fetch requests on crawl (ms) */
export const FETCH_TIMEOUT = 12_000;

/** Maximum search results to crawl per query */
export const MAX_CRAWL_PER_QUERY = 8;

/** Maximum pages to crawl per enrichment cycle */
export const MAX_PAGES_PER_CYCLE = 25;

/** Whether to crawl the lead's own profile page */
export const CRAWL_OWN_PROFILE = true;

/** Minimum confidence score for any extracted contact */
export const MIN_CONFIDENCE = 50;

/** Confidence boost for emails found on the lead's own profile page */
export const OWN_PROFILE_CONFIDENCE = 90;

/** Confidence for emails extracted from bio (fast path) */
export const BIO_REGEX_CONFIDENCE = 60;

/** Confidence for emails from search engine results (not crawled) */
export const SEARCH_RESULT_CONFIDENCE = 40;

/** Confidence for emails from crawled pages */
export const CRAWLED_PAGE_CONFIDENCE = 50;

/** Confidence for cross-platform discovery */
export const CROSS_PLATFORM_CONFIDENCE = 30;

/** Retry count for crawlPage when fetch fails */
export const CRAWL_RETRY_COUNT = 3;

/** Retry delay base (ms) — exponential backoff: 1000, 2000, 4000 */
export const CRAWL_RETRY_DELAY_MS = 1000;

/** Google search base URL */
export const GOOGLE_SEARCH_URL = "https://www.google.com/search";

/** Bing search base URL */
export const BING_SEARCH_URL = "https://www.bing.com/search";

/** Firecrawl API key from environment — null if not set */
export function getFirecrawlApiKey(): string | null {
  return process.env.FIRECRAWL_API_KEY || null;
}

/** Build standard fetch headers for search/crawl requests */
export function buildHeaders(): Record<string, string> {
  return {
    "User-Agent": randomUserAgent(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
  };
}