/* ── Demand gates — one place, every route ────────────────────────────────
 * isDemand() already lives in lib/intent.ts. These are the other three gates
 * that decide whether a piece of text is a real buyer.
 * ---------------------------------------------------------------------- */

import { isDemand } from "@/lib/intent";

/** Trade / seller language — the "no wholesalers, retailers, businesses" rule. */
const SELLER_MARKERS: RegExp[] = [
  /\b(wholesale|wholesaler|supplier|distributor|reseller|dealer|importer|manufacturer|vendor|retailer)\b/i,
  /\b(moq|minimum order|bulk order|bulk supply|trade price|ex-?factory)\b/i,
  /\b(b2b|we supply|we ship|we deliver|we offer|we provide|we sell)\b/i,
  /\b(our clients|our customers|our team|book a call|get a quote|request a quote|free consultation)\b/i,
  /\b(dm for price|dm for details|send a dm|inbox me|whatsapp us|call us)\b/i,
  /\b(link in bio|shop now|order now|sign up|subscribe|buy now|click here)\b/i,
  /\b(here are|here is|\d+ (ways|tips|steps|reasons|things|moves|hacks|secrets))\b/i,
  /\b(follow me|follow for|with this one simple|proven (ways|methods|results))\b/i,
  /\b(we help|i help|we teach|i teach|we coach|i coach)\b/i,
];

const PROMO_HANDLE = /\b(official|hq|store|shop|boutique|enterprise|ltd|limited|inc|llc|company|group|ventures)\b/i;

/** Tab A only: never return a government / news / media / nonprofit profile. */
const EXCLUDED_PROFILE: RegExp[] = [
  /government|govt|\.gov\b|official account/i,
  /news|breaking|headlines|newsletter|journalis/i,
  /media|tv|radio|broadcast|channel|network tv/i,
  /ministry|department|agency|administration|authority/i,
  /nonprofit|foundation|\.org\b/i,
];

export function isExcludedProfile(bio: string | null | undefined, handle?: string | null): boolean {
  const t = `${bio || ""} ${handle || ""}`.trim();
  if (!t) return false;
  return EXCLUDED_PROFILE.some((re) => re.test(t));
}

/** Text reads as someone SELLING (or an ad), not someone asking. */
export function isSellerSide(text: string | null | undefined, bio?: string | null): boolean {
  const t = `${text || ""} ${bio || ""}`.trim();
  if (!t) return false;
  return SELLER_MARKERS.some((re) => re.test(t));
}

/**
 * Hard recency gate. Nothing older than `maxAgeDays` may reach a result row.
 * Accepts epoch seconds, epoch ms, or an ISO string. null/unknown = rejected.
 */
export function isFresh(ts: number | string | null | undefined, maxAgeDays = 150): boolean {
  if (ts === null || ts === undefined) return false;
  let ms: number;
  if (typeof ts === "number") ms = ts > 1e12 ? ts : ts * 1000;      // ms vs seconds
  else {
    const parsed = Date.parse(ts);
    if (Number.isNaN(parsed)) return false;
    ms = parsed;
  }
  const ageDays = (Date.now() - ms) / 86400000;
  return ageDays >= 0 && ageDays <= maxAgeDays;
}

export function ageInDays(ts: number | string | null | undefined): number | null {
  if (ts === null || ts === undefined) return null;
  const ms = typeof ts === "number" ? (ts > 1e12 ? ts : ts * 1000) : Date.parse(String(ts));
  if (Number.isNaN(ms)) return null;
  return Math.round((Date.now() - ms) / 86400000);
}

/** Business/trade account: platform flag, or a shop-style bio/handle. */
export function isTradeAccount(
  bio: string | null | undefined,
  platformFlags?: { isBusinessAccount?: boolean | null; isVerified?: boolean | null },
  handle?: string | null
): boolean {
  if (platformFlags?.isBusinessAccount) return true;
  const t = `${bio || ""} ${handle || ""}`;
  if (!t.trim()) return false;
  if (PROMO_HANDLE.test(t) && /(shop|store|supply|wholesale|sell|service|consult|agency|enterprise)/i.test(t)) return true;
  return SELLER_MARKERS.some((re) => re.test(bio || ""));
}

/** The one call a route needs: is this comment/post a genuine, fresh buyer ask? */
export function isRealDemand(
  text: string | null | undefined,
  productTerms: string[],
  ts: number | string | null | undefined,
  bio?: string | null,
  maxAgeDays = 150
): boolean {
  if (!text || !text.trim()) return false;
  if (!isFresh(ts, maxAgeDays)) return false;
  if (isSellerSide(text, bio)) return false;
  return isDemand(text, productTerms);
}
