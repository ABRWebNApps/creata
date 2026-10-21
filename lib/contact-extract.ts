/* ── Shared contact extraction ───────────────────────────────────────────
 * Restores reliable email + website / link-in-bio capture from a profile's
 * bio / about section. Used by every search route so behaviour is identical
 * across platforms.
 *
 * - Email: plain addresses AND lightly obfuscated ones ("name [at] gmail
 *   [dot] com", "name(at)gmail.com"). Skips obvious placeholders.
 * - Website: uses the platform's structured URL field first (external_url /
 *   bioLink / url), then falls back to scanning the bio text for a link.
 * ────────────────────────────────────────────────────────────────────── */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Common "junk" inboxes that are never a real lead contact.
const EMAIL_BLOCKLIST = /^(noreply|no-reply|donotreply|example|test|support@sentry|privacy)@/i;

function deobfuscate(text: string): string {
  return text
    .replace(/\s*\[\s*at\s*\]\s*/gi, "@")
    .replace(/\s*\(\s*at\s*\)\s*/gi, "@")
    .replace(/\s*\{\s*at\s*\}\s*/gi, "@")
    .replace(/\s+at\s+([a-z0-9-]+)\s*(?:\[|\(|\{)?\s*dot\s*(?:\]|\)|\})?\s*([a-z]{2,})/gi, "@$1.$2")
    .replace(/\s*\[\s*dot\s*\]\s*/gi, ".")
    .replace(/\s*\(\s*dot\s*\)\s*/gi, ".")
    .replace(/\s*\{\s*dot\s*\}\s*/gi, ".");
}

/** Extract the first plausible email from arbitrary bio/profile text. */
export function extractEmailFromText(text?: string | null): string | null {
  if (!text) return null;
  const cleaned = deobfuscate(text);
  const match = cleaned.match(EMAIL_RE);
  if (!match) return null;
  const email = match[0].replace(/[.,;:]+$/, "").toLowerCase();
  if (EMAIL_BLOCKLIST.test(email)) return null;
  return email;
}

const URL_RE = /https?:\/\/[^\s"'<>()]+|(?:www\.)[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s"'<>()]*)?/i;

// Social platforms that are not a "website" for lead purposes.
const SOCIAL_HOSTS = /(?:instagram|tiktok|twitter|x|facebook|linkedin|youtube|threads|pinterest|snapchat)\.com/i;

/** Extract a website / link-in-bio from bio text when no structured URL exists. */
export function extractWebsiteFromText(text?: string | null): string | null {
  if (!text) return null;
  const match = text.match(URL_RE);
  if (!match) return null;
  let url = match[0].replace(/[.,;:]+$/, "");
  if (SOCIAL_HOSTS.test(url)) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

/**
 * Resolve the contact fields for a lead from whatever the platform returned.
 * Structured fields win; bio text is the fallback (this is what regressed).
 */
export function resolveContact(opts: {
  bio?: string | null;
  structuredEmail?: string | null;
  structuredWebsite?: string | null;
}): { email: string | null; bioLink: string | null } {
  const email =
    (opts.structuredEmail && !EMAIL_BLOCKLIST.test(opts.structuredEmail)
      ? opts.structuredEmail.toLowerCase()
      : null) ?? extractEmailFromText(opts.bio);

  const bioLink =
    opts.structuredWebsite ||
    extractWebsiteFromText(opts.bio) ||
    null;

  return { email, bioLink };
}
