import { NextRequest, NextResponse } from "next/server";
import { resolveContact } from "@/lib/contact-extract";
import { isRealDemand, isSellerSide, isFresh, ageInDays, isExcludedProfile } from "@/lib/demand";
import { analyzeBrandProblems } from "@/lib/problem-analysis";
import { signalFields } from "@/lib/keywords";
import { fetchPostComments, type SocialComment } from "@/lib/social/comments";
import { intentScore } from "@/lib/intent";

/* ── TWO MODES, ONE ROUTE ────────────────────────────────────────────────
 * Tab A  ("leads")      → the lead is the POST AUTHOR: a real creator /
 *                         influencer in the niche. Gov / news / media
 *                         profiles are excluded. Comments are NOT the lead.
 * Tab B  ("painpoints") → the lead is the COMMENT AUTHOR: someone asking.
 *                         Their own comment is the matching comment.
 * The branch is on searchMode. They are two different products.
 * ---------------------------------------------------------------------- */

type TikTokCreator = {
  handle: string;
  nickname: string;
  platform: string;
  profile_url: string;
  avatar: string | null;
  bio: string | null;
  bioLink: string | null;
  verified: boolean;
  followers: number;
  following: number;
  total_likes: number;
  video_count: number;
  engagement_rate: number;
  email: string | null;
  instagram_handle: string | null;
  profile_fetched: boolean;
  score: number;
  pain_points: string[];
  matched_comment?: string | null;
  matched_caption?: string | null;
  matched_url?: string | null;
  matched_from?: string | null;
  matched_age_days?: number | null;
  lead_kind?: string | null;
};

const MAX_VIDEOS = 8;           // Tab B: comment fetches (1 credit each)
const MAX_PROFILE_FETCHES = 15; // profile enrichments (1 credit each)
const MAX_AGE_DAYS = 150;

async function fetchWithRetry(url: string, options: RequestInit, retries = 1, backoffMs = 800): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError" || err?.code === "UND_ERR_CONNECT_TIMEOUT";
      if (attempt < retries && isTimeout) {
        await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, attempt)));
      } else throw err;
    }
  }
  throw new Error("Unreachable");
}

function calcScore(followers: number, engagementRate: number, hasEmail: boolean, demand = 0): number {
  let score = demand * 20;
  if (followers >= 1000 && followers <= 50000) score += 30;
  else if (followers > 50000 && followers <= 200000) score += 20;
  else if (followers > 200000) score += 5;
  else score += 10;
  if (engagementRate >= 5) score += 40;
  else if (engagementRate >= 3) score += 30;
  else if (engagementRate >= 1) score += 15;
  if (hasEmail) score += 30;
  return score;
}

type Post = {
  url: string;
  aweme_id: string | null;
  create_time: number | null;
  comment_count: number;
  caption: string | null;
  handle: string;
  nickname: string | null;
  avatar: string | null;
  authorFollowers: number;
  authorBio: string | null;
  verified: boolean;
};

type Candidate = {
  handle: string;
  avatar: string | null;
  /** the text this lead is matched on (their own comment, or their post caption) */
  signal: string;
  signalCaption: string | null;
  signalTs: number | null;
  demand: number;
  sourceUrl: string | null;
  broad: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const parsed = await request.json();
    const { keywords, maxProfiles, minFollowers, maxFollowers, tier, searchMode } = parsed;
    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: "Keywords array is required" }, { status: 400 });
    }
    const terms: string[] = Array.isArray(parsed.productTerms) && parsed.productTerms.length
      ? parsed.productTerms : keywords;
    const apiKey = process.env.SCRAPE_CREATORS_API_KEY;
    const cap = Math.min(maxProfiles || MAX_PROFILE_FETCHES, 30);
    const maxAge = typeof parsed.maxAgeDays === "number" ? parsed.maxAgeDays : MAX_AGE_DAYS;
    const mode: "author" | "commenter" = searchMode === "painpoints" ? "commenter" : "author";

    // ── SHARED PHASE 1: recent posts in the niche ──
    const posts = new Map<string, Post>();
    await Promise.all(keywords.map(async (keyword: string) => {
      try {
        const sort = mode === "author" ? "relevance" : "date-posted";
        const url = `https://api.scrapecreators.com/v1/tiktok/search/keyword?query=${encodeURIComponent(
          keyword + (tier && tier !== "Global" ? ` ${tier}` : "")
        )}&date_posted=last-6-months&sort_by=${sort}&count=40`;
        const res = await fetchWithRetry(url, { headers: { "x-api-key": apiKey! } });
        if (!res.ok) return;
        const data = await res.json();
        for (const item of (data.search_item_list || data.data?.search_item_list || [])) {
          const a = item.aweme_info || {};
          const au = a.author || {};
          const id = a.aweme_id || item.aweme_id || item.id;
          if (!au.unique_id || !id) continue;
          const url2 = `https://www.tiktok.com/@${au.unique_id}/video/${id}`;
          if (posts.has(url2)) continue;
          posts.set(url2, {
            url: url2,
            aweme_id: String(id),
            create_time: a.create_time ?? null,
            comment_count: a.statistics?.comment_count || 0,
            caption: a.desc || null,
            handle: au.unique_id,
            nickname: au.nickname || null,
            avatar: au.avatar_thumb?.url_list?.[0] || null,
            authorFollowers: au.follower_count || 0,
            authorBio: au.signature || "",
            verified: Boolean(au.custom_verify || (au.verification_type ?? 0) > 0),
          });
        }
      } catch (err) {
        console.error(`TikTok search failed for "${keyword}":`, err);
      }
    }));

    const allPosts = Array.from(posts.values());

    // ══ TAB A — the POST AUTHOR is the lead (real creators / influencers) ══
    const candidates: Candidate[] = [];
    if (mode === "author") {
      const seen = new Set<string>();
      const chosen = allPosts
        .filter((p) => isFresh(p.create_time, maxAge * 2))            // avoid dormant accounts
        .sort((a, b) => b.authorFollowers - a.authorFollowers)
        .filter((p) => {
          if (seen.has(p.handle)) return false;
          seen.add(p.handle);
          // never a government / news / media / nonprofit profile
          return !isExcludedProfile(p.authorBio, p.handle);
        })
        .slice(0, cap);
      for (const p of chosen) {
        candidates.push({
          handle: p.handle,
          avatar: p.avatar,
          signal: p.caption || p.authorBio || "",
          signalCaption: p.caption,
          signalTs: p.create_time,
          demand: 0,
          sourceUrl: p.url,
          broad: false,
        });
      }
    }

    // ══ TAB B — the COMMENT AUTHOR is the lead (someone actually asking) ══
    if (mode === "commenter") {
      const targets = allPosts
        .filter((v) => isFresh(v.create_time, maxAge) && v.comment_count > 0)
        .sort((a, b) => b.comment_count - a.comment_count)
        .slice(0, MAX_VIDEOS);

      const byHandle = new Map<string, Candidate>();
      const broadPool: Candidate[] = [];
      if (apiKey) {
        await Promise.allSettled(targets.map(async (v) => {
          const comments: SocialComment[] = await fetchPostComments(v.url, "tiktok", apiKey, 12000);
          for (const c of comments) {
            const text = (c.text || "").trim();
            if (!c.author || !text || isSellerSide(text)) continue;
            const age = ageInDays(c.createdAt);
            if (age === null || age > maxAge) continue;
            const demand = isRealDemand(text, terms, c.createdAt, undefined, maxAge);
            const cand: Candidate = {
              handle: c.author, avatar: null, signal: text, signalCaption: v.caption,
              signalTs: c.createdAt,
              demand: demand ? Math.max(1, intentScore(text, terms)) : 0,
              sourceUrl: v.url, broad: !demand,
            };
            if (demand) {
              const prev = byHandle.get(cand.handle);
              if (!prev || cand.demand > prev.demand) byHandle.set(cand.handle, cand);
            } else if (text.length > 15) broadPool.push(cand);
          }
        }));
      }
      let list = Array.from(byHandle.values());
      if (list.length === 0) {
        const seen = new Set<string>();
        list = broadPool.filter((l) => !seen.has(l.handle) && seen.add(l.handle)).slice(0, cap);
      }
      list.sort((a, b) => b.demand - a.demand);
      candidates.push(...list);
    }

    // ── SHARED: enrich each lead's OWN profile (email, link, IG handle) ──
    const toFetch = candidates.slice(0, cap);
    const enriched = new Map<string, any>();
    if (apiKey) {
      await Promise.allSettled(toFetch.map(async (l) => {
        try {
          const r = await fetchWithRetry(
            `https://api.scrapecreators.com/v1/tiktok/profile?handle=${encodeURIComponent(l.handle)}`,
            { headers: { "x-api-key": apiKey } }
          );
          if (r.ok) enriched.set(l.handle, await r.json());
        } catch { /* non-fatal */ }
      }));
    }

    const creators: TikTokCreator[] = [];
    for (const l of toFetch) {
      const pj = enriched.get(l.handle);
      const user = pj?.user;
      const stats = pj?.stats;
      const bio = user?.signature ?? null;

      const { email, bioLink } = resolveContact({
        bio,
        structuredWebsite: user?.bioLink?.link ?? null,
      });
      const igMatch = user?.bioLink?.link?.match(/instagram\.com\/([^/?]+)/);
      const followers = stats?.followerCount || 0;
      const engagementRate =
        followers > 0 && stats?.videoCount > 0
          ? parseFloat(((stats.heartCount / stats.videoCount / followers) * 100).toFixed(2))
          : 0;

      if (minFollowers !== undefined && minFollowers !== null && followers < minFollowers) continue;
      if (maxFollowers !== undefined && maxFollowers !== null && followers > maxFollowers) continue;

      // matching fields are NEVER empty: comment mode → their comment;
      // author mode → their matched post caption. signalFields guarantees it.
      const sf = signalFields({
        comment: mode === "commenter" ? l.signal : null,
        caption: l.signalCaption || (mode === "author" ? l.signal : null),
        bio,
        productTerms: terms,
      });

      creators.push({
        handle: l.handle,
        nickname: user?.nickname || l.handle,
        platform: "tiktok",
        profile_url: `https://tiktok.com/@${l.handle}`,
        avatar: user?.avatarLarger || l.avatar,
        bio,
        bioLink: bioLink || null,
        verified: Boolean(user?.verified || (user?.verificationTypeExternal ?? 0) > 0),
        followers,
        following: stats?.followingCount || 0,
        total_likes: stats?.heartCount || 0,
        video_count: stats?.videoCount || 0,
        engagement_rate: engagementRate,
        email: email || null,
        instagram_handle: igMatch ? igMatch[1] : null,
        profile_fetched: Boolean(user && stats),
        score: calcScore(followers, engagementRate, email !== null, l.demand),
        pain_points: analyzeBrandProblems({
          bio,
          matched_comment: sf.matched_comment,
          matched_caption: sf.matched_caption,
          platform: "tiktok",
          followers,
          engagement_rate: engagementRate,
          email,
          bioLink,
        }),
        matched_comment: sf.matched_comment,
        matched_caption: sf.matched_caption,
        matched_url: l.sourceUrl,
        matched_from: mode === "commenter" ? "comment" : "post",
        matched_age_days: ageInDays(l.signalTs),
        lead_kind: mode === "commenter" ? (l.broad ? "commenter-broad" : "commenter") : "author",
      });
    }

    creators.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      lead_mode: mode,
      total_found: creators.length,
      videos_scanned: allPosts.length,
      credits_used: keywords.length + (mode === "commenter" ? MAX_VIDEOS : 0) + toFetch.length,
      creators,
    });
  } catch (error: any) {
    console.error("TikTok search error:", error);
    return NextResponse.json({ error: error.message || "TikTok search failed" }, { status: 500 });
  }
}
