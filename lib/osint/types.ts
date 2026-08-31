/* ── OSINT Engine Types — ported from Sky Email Extractor RE ── */

/** Search result from search engine */
export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

/** Crawl result from a single page visit */
export interface CrawlResult {
  emails: string[];
  phones: string[];
  urls: string[];
}

/** Options for a single enrichment cycle */
export interface EnrichOptions {
  leadId: string;
  leadNickname: string;
  leadHandle: string;
  leadPlatform: string;
  leadProfileUrl: string;
  leadBio: string | null;
  /** Country code for phone regex (default: 'ng') */
  country?: string;
  /** Max search results to crawl per query */
  maxCrawlPerQuery?: number;
  /** Mark emails/phones as verified if found on the lead's own profile */
  ownProfileIsVerified?: boolean;
  /** Contextual keywords extracted from bio / tags / pain_points for better niche targeting */
  leadKeywords?: string[];
}

/** Dedup query record from osint_queries */
export interface OsintQueryRecord {
  id: string;
  lead_id: string;
  query_type: string;
  query_string: string;
  results_count: number;
  ran_at: string;
}

/** Saved email DB record */
export interface LeadEmail {
  id: string;
  lead_id: string;
  email: string;
  source: "search_engine" | "page_crawl" | "bio_regex" | "cross_platform";
  source_url: string | null;
  confidence: number;
  verified: boolean;
  discovered_at: string;
}

/** Saved phone DB record */
export interface LeadPhone {
  id: string;
  lead_id: string;
  phone: string;
  source: "search_engine" | "page_crawl";
  source_url: string | null;
  country: string | null;
  confidence: number;
  discovered_at: string;
}

/** Saved cross-platform alias */
export interface LeadAlias {
  id: string;
  lead_id: string;
  platform: "linkedin" | "github" | "twitter" | "instagram" | "youtube" | "website" | "other";
  platform_handle: string | null;
  profile_url: string;
  discovered_at: string;
}

/** Enrichment result returned to the caller */
export interface EnrichResult {
  emails: { email: string; source_url: string | null; confidence: number }[];
  phones: { phone: string; source_url: string | null; confidence: number }[];
  aliases: { platform: string; profile_url: string }[];
  errors: string[];
}

/** Source type label for tracking */
export type EnrichSource = "search_engine" | "page_crawl" | "bio_regex" | "cross_platform";