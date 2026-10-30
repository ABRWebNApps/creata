/* ── Post-comment mining — the REAL buying signal ────────────────────────
 * A caption is the creator talking. The DEMAND ("where can I buy this?",
 * "anyone know a good X?") usually lives in the COMMENTS — real people,
 * asking out loud. This module pulls comments for a post and returns the
 * one that is an actual demand, so matched_comment can be that exact line.
 *
 * Endpoints (docs.scrapecreators.com, verified 2026-10):
 *   TikTok     GET /v1/tiktok/video/comments?url=
 *   Instagram  GET /v2/instagram/post/comments?url=
 *   Facebook   GET /v1/facebook/post/comments?url=
 * LinkedIn and X have NO comments endpoint.
 *
 * All calls: bounded by a timeout, never throw, return [] on failure.
 * ---------------------------------------------------------------------- */

import { intentScore, isDemand } from "@/lib/intent";

const SC_BASE = "https://api.scrapecreators.com";
const DEFAULT_TIMEOUT = 12000;

export interface SocialComment {
  text: string;
  author: string | null;
  likes: number;
}

function normalizeComments(list: unknown): SocialComment[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((raw) => {
      const c = raw as Record<string, unknown>;
      const user = (c?.user ?? c?.author ?? {}) as Record<string, unknown>;
      const text = String(c?.text ?? c?.comment ?? c?.content ?? c?.message ?? "").trim();
      return {
        text,
        author: (user?.unique_id ?? user?.username ?? user?.name ?? c?.username ?? null) as string | null,
        likes: Number(c?.digg_count ?? c?.like_count ?? c?.comment_like_count ?? c?.likes ?? 0),
      };
    })
    .filter((c) => c.text.length > 0);
}

/** Comments for a single post/video URL. Non-fatal; [] on any problem. */
export async function fetchPostComments(
  url: string,
  endpoint: "tiktok" | "instagram" | "facebook",
  apiKey: string,
  timeoutMs = DEFAULT_TIMEOUT
): Promise<SocialComment[]> {
  if (!url || !apiKey) return [];
  const path =
    endpoint === "tiktok" ? "/v1/tiktok/video/comments" :
    endpoint === "instagram" ? "/v2/instagram/post/comments" :
    "/v1/facebook/post/comments";
  try {
    const res = await fetch(
      `${SC_BASE}${path}?url=${encodeURIComponent(url)}`,
      { headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(timeoutMs) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const list = (json as Record<string, unknown>)?.comments
      ?? (json as { data?: Record<string, unknown> })?.data
      ?? (json as { data?: { comments?: unknown } })?.data?.comments;
    return normalizeComments(list);
  } catch {
    return [];
  }
}

/**
 * Pick the single best DEMAND comment (asking/buying marker + product term),
 * highest intent first, then most liked. null when no comment is a demand.
 */
export function pickBestDemandComment(
  comments: SocialComment[],
  productTerms: string[]
): SocialComment | null {
  let best: SocialComment | null = null;
  let bestScore = 0;
  for (const c of comments) {
    // Must be a genuine ASK (marker + term, and not a seller/promo).
    if (!isDemand(c.text, productTerms)) continue;
    const score = intentScore(c.text, productTerms) * 1000 + c.likes;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}