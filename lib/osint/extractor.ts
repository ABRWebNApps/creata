/* ── Email / Phone / URL extractor — ported from Sky's Boost.Regex and CEfBrushSource ── */

/** Standard email regex (RFC 5322 simplified) */
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Obfuscated email regex — handles [at], [dot], at, dot patterns */
const OBFUSCATED_EMAIL_RE =
  /[a-zA-Z0-9._%+-]+\s*\[?at\]?\s*[a-zA-Z0-9.-]+\s*\[?dot\]?\s*[a-zA-Z]{2,}/gi;

/** Email in text patterns — catches "email: user@domain", "📧 user@domain", etc */
const EMAIL_PREFIX_RE = /(?:email|e-mail|mail|📧|✉️)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;

/** Name-based email in plain text — catches "email user at domain dot com" */
const NAME_EMAIL_RE = /(?:email|contact|reach)[:\s]+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+at\s+([a-zA-Z0-9.-]+)\s+dot\s+([a-zA-Z]{2,})/gi;

/** URL regex for extracting links from HTML/text */
const URL_RE = /(https?:\/\/)[a-zA-Z0-9.\-]+(?:\.[a-zA-Z]{2,11})(?:\/[^\s"'<>]*)?/g;

/**
 * Sky's file extension blacklist — URLs ending in these are skipped.
 * Direct port from Sky's `IsSkipExtension()` function.
 */
const SKIP_EXTS = new Set([
  ".js", ".ace", ".ani", ".arc", ".arj", ".avi", ".bmp", ".cab",
  ".css", ".exe", ".gif", ".gz", ".ico", ".jar", ".jpg", ".jpeg",
  ".mid", ".mov", ".mp2", ".mp3", ".mp4", ".png", ".rar", ".zip",
  ".7z", ".doc", ".docx", ".xls", ".xlsx", ".msi", ".swf", ".tar",
  ".wav", ".csv",
]);

/** Email domains that are almost certainly not a real person's email */
const BLOCKLIST_DOMAINS = new Set([
  "example.com", "example.org", "example.net",
  "domain.com", "test.com", "test.org",
  // Search-engine internal — not real user emails
  "duckduckgo.com",
  // Error tracking / CI — hash emails, not real people
  "sentry.io", "wixpress.com", "sentry-next.wixpress.com",
  // Placeholder / template domains
  "mysite.com", "yourbusiness.com", "yourwebsite.com",
  "mywebsite.com", "oursite.com", "samplesite.com",
  "placeholder.com", "yoursite.com", "theirsite.com",
]);
// NOTE: We do NOT block gmail/yahoo/hotmail/outlook — those are real people's emails.
// We only block obviously sample/fake domains and search-engine-internal addresses.

/** Strip common prefixes that aren't actual emails */
function cleanEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  // No @ symbol? discard
  if (!email.includes("@")) return null;
  // Too long or too short
  if (email.length > 254 || email.length < 5) return null;
  // Domain part
  const parts = email.split("@");
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase();
  if (BLOCKLIST_DOMAINS.has(domain)) return null;
  // Must have a dot in domain
  if (!domain.includes(".")) return null;
  // Must not have certain TLDs that are reserved or non-routable
  const tld = domain.split(".").pop()?.toLowerCase() || "";
  const skipTlds = new Set([
    "local", "localhost", "invalid", "test", "onion", "i2p",
    "arpa",
  ]);
  if (skipTlds.has(tld)) return null;

  // ── FILTER: Asset/file paths parsed as emails ──
  // e.g. asset-2@2x-1024x442.png → domain is "2x-1024x442.png"
  // Block any email where the domain contains size/asset patterns
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|json|xml|zip|mp4|mp3|mov|pdf|woff2?)$/.test(domain)) return null;
  // Block local parts that look like filenames (e.g. asset-2)
  if (/^\d+x/.test(parts[0].split(/[.\-_]/).pop() || "")) return null;
  // Block @ followed by numbers-then-dimension pattern: @2x-1024x442
  if (/^[\d]+x-?[\d]+x/.test(parts[0])) return null;

  // ── FILTER: Hash/hex local parts (Sentry, error trackers, CI systems) ──
  // e.g. 605a7baede844d278b89dc95ae0a9123@domain.com = 32 hex chars
  const localPart = parts[0];
  if (/^[a-f0-9]{16,}$/.test(localPart)) return null;

  // ── FILTER: Placeholder/role emails that don't match a real person ──
  // e.g. you@yourbusiness.com, info@template.com
  const placeholderLocalParts = ["you", "yourname", "name", "username", "user"];
  if (placeholderLocalParts.includes(localPart)) return null;

  return email;
}

/**
 * Extract unique, clean emails from HTML/text content.
 * Also detects obfuscated emails (name [at] domain [dot] com).
 */
export function extractEmails(
  text: string,
  dedupSet?: Set<string>,
): string[] {
  const dedup = dedupSet || new Set<string>();
  const result: string[] = [];

  // Standard emails
  const rawMatches = text.match(EMAIL_RE) || [];
  for (const raw of rawMatches) {
    const cleaned = cleanEmail(raw);
    if (cleaned && !dedup.has(cleaned)) {
      dedup.add(cleaned);
      result.push(cleaned);
    }
  }

  // Obfuscated emails (name [at] domain [dot] com)
  const obfuscatedMatches = text.match(OBFUSCATED_EMAIL_RE) || [];
  for (const raw of obfuscatedMatches) {
    const deobfuscated = raw
      .toLowerCase()
      .replace(/\s*\[?at\]?\s*/g, "@")
      .replace(/\s*\[?dot\]?\s*/g, ".")
      .replace(/\s+/g, "")
      .replace(/^[^a-zA-Z0-9]+/, "");
    if (deobfuscated.includes("@")) {
      const cleaned = cleanEmail(deobfuscated);
      if (cleaned && !dedup.has(cleaned)) {
        dedup.add(cleaned);
        result.push(cleaned);
      }
    }
  }

  // Email prefix patterns (email: user@domain.com, 📧 user@domain.com)
  const prefixMatches = text.match(EMAIL_PREFIX_RE) || [];
  for (const raw of prefixMatches) {
    const email = raw.replace(/^(?:email|e-mail|mail|📧|✉️)[:\s]*/i, "").trim();
    const cleaned = cleanEmail(email);
    if (cleaned && !dedup.has(cleaned)) {
      dedup.add(cleaned);
      result.push(cleaned);
    }
  }

  // Name-based obfuscated: "email firstname lastname at domain dot com"
  const nameEmailMatches = text.match(NAME_EMAIL_RE) || [];
  for (const raw of nameEmailMatches) {
    const parts = raw.match(/(?:email|contact|reach)[:\s]+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s+at\s+([a-zA-Z0-9.-]+)\s+dot\s+([a-zA-Z]{2,})/i);
    if (parts) {
      const localPart = parts[1].toLowerCase().replace(/\s+/g, ".");
      const domain = parts[2].toLowerCase();
      const tld = parts[3].toLowerCase();
      const constructed = `${localPart}@${domain}.${tld}`;
      const cleaned = cleanEmail(constructed);
      if (cleaned && !dedup.has(cleaned)) {
        dedup.add(cleaned);
        result.push(cleaned);
      }
    }
  }

  return result;
}

/**
 * Extract URLs from HTML/text, filtering out file extensions.
 * Does NOT follow links — just extracts them from the page text.
 */
export function extractUrls(html: string): string[] {
  const raw = html.match(URL_RE) || [];
  return raw.filter((url) => {
    const path = url.split("?")[0].toLowerCase();
    const ext = path.match(/\.([a-z0-9]+)$/)?.[0];
    return !(ext && SKIP_EXTS.has(ext)) && !url.includes("google.com") && !url.includes("bing.com");
  });
}

/**
 * Extract phone numbers from text using per-region + global patterns.
 * @param text - raw text to search
 * @param country - ISO 3166-1 alpha-2 country code (default: 'ng')
 */
export function extractPhones(text: string, country: string = "ng"): string[] {
  const patterns: Record<string, RegExp> = {
    // Nigeria: +234 XXX XXX XXXX or 080XXXXXXX (exactly 11 digits starting with 0)
    ng: /(?:\+234[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{4}|0[7-9]\d{2}[\s-]?\d{3}[\s-]?\d{4})(?=\s|$|[.,!?()])/g,
    // US/CA: +1 (XXX) XXX-XXXX or (XXX) XXX-XXXX — must be 10 digits after +1
    us: /(?:\+1[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}(?=\s|$|[.,!?()])/g,
    // UK: +44 XXXX XXXXXX — 10-11 digit mobile/landline
    uk: /(?:\+44[\s-]?\d{4}[\s-]?\d{5,6}|0\d{4}[\s-]?\d{5,6})(?=\s|$|[.,!?()])/g,
    // Global: only match properly formatted numbers with +
    global: /\+\d{1,3}[\s-]?\d{4,}[\s-]?\d{4,}(?=\s|$|[.,!?()])/g,
  };

  const p = patterns[country] || patterns.global;
  const allPatterns = [p, patterns.global];
  // Only add primary pattern once if it's same as global
  const dedup = new Set<string>();
  const result: string[] = [];

  for (const pat of allPatterns) {
    const matches = text.match(pat) || [];
    for (const m of matches) {
      const cleaned = cleanPhone(m);
      if (cleaned && !dedup.has(cleaned)) {
        dedup.add(cleaned);
        result.push(cleaned);
      }
    }
  }

  return result;
}

/** Normalize phone number: remove spaces, dashes, parens */
function cleanPhone(raw: string): string | null {
  let cleaned = raw.replace(/[\s\-().]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  // Must be at least 7 digits and not just a repeating pattern
  if (digits.length < 8) return null;
  // Max 15 digits (ITU-T E.164 limit)
  if (digits.length > 15) return null;
  // Filter 6-7 digit "numbers" that aren't real phone numbers
  // Real local numbers are 8-11 digits; international are 10-15
  if (digits.length < 8 && !digits.startsWith("0")) return null;
  // Check for obvious false positives (e.g., year numbers, short IDs)
  if (/^\d{4}$/.test(digits)) return null;
  // Filter out Instagram/YouTube/Twitter internal IDs (96xxxx, 178xxxx, etc.)
  // These come from JSON data embedded in social media pages
  const intVal = parseInt(digits, 10);
  if (intVal > 1000000000 && digits.length >= 10) return null; // >1B are internal IDs
  if (digits.startsWith("936619743")) return null; // Instagram numeric session IDs
  if (digits.startsWith("178776")) return null; // Instagram media IDs
  if (digits.startsWith("10460")) return null; // Instagram user IDs
  if (digits.startsWith("3888") && digits.length > 10) return null; // YouTube channel IDs
  // Filter dates (20260825 style — 8-digit numbers that look like dates)
  if (digits.length === 8 && /^(20|19)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(digits)) return null;
  // Filter pure timestamps (13+ digit numbers starting with timestamp ranges)
  if (digits.length >= 13) return null;
  // Must have at least one non-repeating digit pattern (filters 1111111111)
  if (/^(\d)\1{6,}$/.test(digits)) return null;

  // ── STRONG JUNK FILTERS ──
  // Block numbers that look like prices/file-sizes (e.g., 18000000, 10368000)
  if (digits.length >= 8 && /^[1-9]0{5,}$/.test(digits)) return null;
  // Block sequential digits (12345678, 87654321)
  if (digits.length >= 8) {
    let asc = true, desc = true;
    for (let i = 1; i < digits.length; i++) {
      const curr = parseInt(digits[i]);
      const prev = parseInt(digits[i-1]);
      if (curr !== prev + 1) asc = false;
      if (curr !== prev - 1) desc = false;
    }
    if (asc || desc) return null;
  }
  // Block numbers that are just multiples of common fake numbers
  // (e.g., 100000000, 553648129 looks like an IP address component)
  if (digits.length === 9 && /^5{2,3}\d{6,7}$/.test(digits)) return null;
  // Block numbers without a + or 0 prefix that are < 10 digits (no country code context)
  if (!cleaned.startsWith("+") && !digits.startsWith("0") && digits.length < 10) return null;
  // Block numbers where 50%+ are zeros (likely fake/generated)
  const zeroCount = (digits.match(/0/g) || []).length;
  if (digits.length >= 8 && zeroCount / digits.length > 0.5) return null;

  return cleaned;
}

/**
 * Extract email from a structured bio field directly (fast path —
 * no browser needed, runs synchronously).
 */
export function extractEmailsFromBio(bio: string | null): string[] {
  if (!bio) return [];
  // Common patterns: "email: john@...", "📧 john@...", "john @ domain...", "DM for email"
  return extractEmails(bio);
}

/**
 * Extract website from bio — looks for common patterns like
 * "http://...", "www...." or "website: example.com"
 */
export function extractWebsiteFromBio(bio: string | null): string | null {
  if (!bio) return null;
  const urls = extractUrls(bio);
  if (urls.length > 0) return urls[0];
  // Also try "website: xyz.com" pattern (no http prefix)
  const siteRe = /(?:website|site|portfolio|blog)[:\s]*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,11})/i;
  const m = bio.match(siteRe);
  if (m) return `https://${m[1]}`;
  return null;
}

/**
 * Free email providers — real people use these, but custom domains
 * (like @drchijiokeadimike.com) are stronger indicators of
 * ownership/identity. Used for confidence scoring.
 */
const FREE_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "yahoo.co.uk", "yahoo.co.in",
  "hotmail.com", "hotmail.co.uk", "outlook.com",
  "live.com", "msn.com", "aol.com", "icloud.com",
  "mail.com", "protonmail.com", "proton.me", "pm.me",
  "zoho.com", "yandex.com", "gmx.com", "gmx.de",
  "fastmail.com", "tutanota.com", "tuta.io",
]);

/**
 * Score an email's relevance to a specific person (by handle and name).
 * Returns 0–100: higher means more likely the email belongs to this person.
 * Also returns a boolean `matchesHandle` for UI filtering.
 *
 * Rules:
 *  - Custom domain + handle match in local part = 95 (e.g., drchijioke@drchijiokeadimike.com)
 *  - Handle appears in local part = 80 (e.g., drchijiokeadimike@gmail.com)
 *  - Name appears in local part = 60 (e.g., chijioke.adimike@gmail.com)
 *  - Custom domain (no name/handle match) = 40
 *  - Free provider, no name match = 20
 */
export function computeEmailConfidence(
  email: string,
  handle: string,
  name: string,
): { confidence: number; matchesHandle: boolean } {
  const [local, domain] = email.toLowerCase().split("@");
  const handleLower = handle.toLowerCase().replace(/^@/, "");
  const nameLower = name.toLowerCase().replace(/^@/, "");

  // Check local part against handle and name
  const handleInLocal = local.includes(handleLower);
  // Also check if handle appears as a word boundary (preferred)
  const handleWordMatch = new RegExp(`\\b${escapeRegex(handleLower)}\\b`).test(local);

  const nameWords = nameLower.split(/\s+/).filter(Boolean);
  const nameWordMatch = nameWords.some((w) => w.length > 1 && local.includes(w));
  const nameInLocal = nameLower !== handleLower && local.includes(nameLower);

  const matchesHandle = handleWordMatch || handleInLocal || nameWordMatch || nameInLocal;

  const isFree = FREE_DOMAINS.has(domain);

  // Custom domain (not free provider) suggests professional/owned email
  if (!isFree) {
    if (handleInLocal) return { confidence: 95, matchesHandle: true };
    if (nameInLocal) return { confidence: 80, matchesHandle: true };
    return { confidence: 40, matchesHandle: false };
  }

  // Free provider (gmail, outlook, etc.)
  if (handleInLocal) return { confidence: 70, matchesHandle: true };
  if (nameInLocal) return { confidence: 50, matchesHandle: true };
  return { confidence: 20, matchesHandle: false };
}

/** Safe regex escape for user-provided strings */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// NOTE: generateProbableEmails is implemented in engine.ts (the orchestrator uses it).
// The extractor module only provides extraction + confidence scoring — no generation.