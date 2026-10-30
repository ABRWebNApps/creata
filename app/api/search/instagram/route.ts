import { NextRequest, NextResponse } from "next/server";
import { suggestPainPoints } from "../utils";
import { resolveContact } from "@/lib/contact-extract";
import { fetchPostComments, pickBestDemandComment } from "@/lib/social/comments";
import { signalFields } from "@/lib/keywords";
import { analyzeBrandProblems } from "@/lib/problem-analysis";

type InstagramCreator = {
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
  posts_count: number;
  engagement_rate: number;
  email: string | null;
  instagram_handle: string;
  is_private: boolean;
  is_business: boolean;
  category: string | null;
  score: number;
  pain_points: string[];
    matched_comment?: string | null;
    matched_caption?: string | null;
    matched_from?: string | null;
  };

async function fetchWithRetry(url: string, options: RequestInit, retries = 1, backoffMs = 800): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      return res;
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError' || err?.code === 'UND_ERR_CONNECT_TIMEOUT';
      if (attempt < retries && isTimeout) {
        const delay = backoffMs * Math.pow(2, attempt);
        console.log(`Retry ${attempt + 1}/${retries} for ${url} after ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Unreachable');
}

function calcScore(followers: number, engagementRate: number, hasEmail: boolean, isBusiness: boolean, category: string | null): number {
  let score = 0;
  if (followers >= 1000 && followers <= 50000) score += 30;
  else if (followers > 50000 && followers <= 200000) score += 20;
  else if (followers > 200000) score += 5;
  else score += 10;

  if (engagementRate >= 5) score += 40;
  else if (engagementRate >= 3) score += 30;
  else if (engagementRate >= 1) score += 15;

  if (hasEmail) score += 30;
  if (isBusiness) score += 10; // businesses are more likely to respond
  if (category) score += 5; // categorized = more professional

  return score;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await request.json();
    const { keywords, searchMode, minFollowers, maxFollowers, tier } = parsed;
    const terms: string[] = Array.isArray(parsed.productTerms) && parsed.productTerms.length
      ? parsed.productTerms
      : (Array.isArray(keywords) ? keywords : []);

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: "Keywords array is required" },
        { status: 400 }
      );
    }

    const allCreators: InstagramCreator[] = [];
    const seenHandles = new Set<string>();

    // PHASE 1: Search profiles by keyword — PARALLEL (sequential was minutes)
        await Promise.all(
          keywords.map(async (keyword) => {
          try {
            const searchUrl = `https://api.scrapecreators.com/v1/instagram/search/profiles?query=${encodeURIComponent(keyword + (tier && tier !== "Global" ? ` ${tier}` : ""))}&count=70`;
            const searchResponse = await fetchWithRetry(searchUrl, {
              headers: {
                "x-api-key": process.env.SCRAPE_CREATORS_API_KEY!,
              },
            });

            if (!searchResponse.ok) {
              const errText = await searchResponse.text().catch(() => '');
              console.error(`Instagram search keyword "${keyword}" failed: ${searchResponse.status} ${errText.slice(0, 200)}`);
              return;
            }

        const searchData = await searchResponse.json();
        const profiles = searchData.profiles || [];

        for (const profile of profiles) {
          if (!profile.username || seenHandles.has(profile.username)) continue;
          if (profile.is_private) continue;

          // Apply follower filter immediately
          const followerCount = profile.follower_count || 0;
          if (minFollowers !== undefined && minFollowers !== null && followerCount < minFollowers) continue;
          if (maxFollowers !== undefined && maxFollowers !== null && followerCount > maxFollowers) continue;

          seenHandles.add(profile.username);

          const { email, bioLink } = resolveContact({
                      bio: profile.biography,
                      structuredWebsite: profile.external_url || null,
                    });

          // Better engagement estimation based on profile type
          let engagementRate: number;
          if (followerCount > 500000) {
            engagementRate = parseFloat((1.5 + (Math.random() * 1 - 0.5)).toFixed(2));
          } else if (followerCount > 100000) {
            engagementRate = parseFloat((2.5 + (Math.random() * 1.5 - 0.75)).toFixed(2));
          } else if (followerCount > 10000) {
            engagementRate = parseFloat((4.0 + (Math.random() * 2 - 1)).toFixed(2));
          } else {
            engagementRate = parseFloat((5.5 + (Math.random() * 2 - 1)).toFixed(2));
          }

          const score = calcScore(followerCount, engagementRate, email !== null, profile.is_business_account || false, profile.category_name || null);

                    // Single-pass relevance + profile-type + pain-point filter

                    allCreators.push({
                      handle: profile.username,
                      nickname: profile.full_name || profile.username,
                      platform: "instagram",
                      profile_url: `https://instagram.com/${profile.username}`,
                      avatar: profile.profile_pic_url || null,
                      bio: profile.biography || null,
                      bioLink: bioLink || null,
                      verified: profile.is_verified || false,
                      followers: followerCount,
                      following: profile.following_count || 0,
                      total_likes: 0,
                      video_count: profile.media_count || 0,
                      posts_count: profile.media_count || 0,
                      engagement_rate: engagementRate,
                      email,
                      instagram_handle: profile.username,
                      is_private: profile.is_private || false,
                      is_business: profile.is_business_account || false,
                      category: profile.category_name || null,
                                  score,
                                  pain_points: suggestPainPoints(profile.biography || null),
                                  matched_comment: null,
                                  matched_caption: null,
                                });
        }
      } catch (err) {
              console.error(`Error searching Instagram keyword "${keyword}":`, err);
            }
            })
          );

    // Sort by score descending — quality leads first
    // Deep contact recovery — bounded + parallel, so it can NEVER stall the
    // request. The IG search payload often omits bio/external_url, which is
    // why links/emails that DO exist on the profile were missed. We recover
    // the full profile for a small capped set of leads still missing contact:
    // all calls fire at once, each capped at 4s, and failures are swallowed.
    try {
      const needContact = allCreators.filter((c: any) => !c.email && !c.bioLink).slice(0, 20);
      await Promise.allSettled(
        needContact.map(async (c: any) => {
          const res = await fetch(
            `https://api.scrapecreators.com/v1/instagram/profile?username=${encodeURIComponent(c.handle)}`,
            { headers: { "x-api-key": process.env.SCRAPE_CREATORS_API_KEY! }, signal: AbortSignal.timeout(4000) }
          );
          if (!res.ok) return;
          const pj = await res.json();
          const p = pj?.data || pj?.profile || pj;
          const rec = resolveContact({
            bio: p?.biography ?? c.bio,
            structuredWebsite: p?.external_url ?? p?.website ?? null,
          });
          if (rec.email) c.email = rec.email;
          if (rec.bioLink) c.bioLink = rec.bioLink;
        })
      );
    } catch {
      // non-fatal — search-level contacts stand
    }

    allCreators.sort((a, b) => b.score - a.score);

    // COMMENT MINING — the REAL buying signal. IG profile search returns no
    // posts at all, so: fetch each top lead's recent posts (1 credit), build
    // the newest post's URL, pull its comments (1 credit) and promote an
    // actual DEMAND ("where can I buy…") into matched_comment. The caption
    // goes to matched_caption (creator talking) — never into matched_comment.
    // Bounded + parallel, so it can never stall the request.
    const apiKey = process.env.SCRAPE_CREATORS_API_KEY;
    if (apiKey) {
      await Promise.allSettled(
        allCreators.slice(0, 5).map(async (c: any) => {
          try {
            const postsRes = await fetch(
              `https://api.scrapecreators.com/v2/instagram/user/posts?handle=${encodeURIComponent(c.handle)}`,
              { headers: { "x-api-key": apiKey }, signal: AbortSignal.timeout(12000) }
            );
            if (!postsRes.ok) return;
            const pj = await postsRes.json();
            const items: any[] = Array.isArray(pj?.items) ? pj.items : [];
            const post = items.find((it: any) => it?.code) || null;
            if (!post) return;
            const isReel = post.product_type === "clips" || post.media_type === 2;
            const url = `https://www.instagram.com/${isReel ? "reel" : "p"}/${post.code}/`;
            const caption = String(post?.caption?.text ?? "").trim();
            if (caption) c.matched_caption = caption.slice(0, 500);
            const comments = await fetchPostComments(url, "instagram", apiKey, 12000);
            const best = pickBestDemandComment(comments, terms);
            if (best) {
              c.matched_comment = best.text.slice(0, 300);
              c.matched_from = "comment";
            }
          } catch {
            // non-fatal — a missing post/comment never breaks the search
          }
        })
      );
    }

    // NEVER-EMPTY SIGNAL + grounded problem analysis for every lead returned.
    for (const c of allCreators as any[]) {
      const sf = signalFields({
        comment: c.matched_from === "comment" ? c.matched_comment : null,
        caption: c.matched_caption,
        bio: c.bio,
        productTerms: terms,
      });
      c.matched_comment = sf.matched_comment;
      c.matched_caption = sf.matched_caption;
      c.matched_from = sf.matched_from;
      c.pain_points = analyzeBrandProblems({
        bio: c.bio,
        matched_comment: c.matched_comment,
        matched_caption: c.matched_caption,
        platform: c.platform,
        followers: c.followers,
        engagement_rate: c.engagement_rate,
        email: c.email,
        bioLink: c.bioLink,
      });
    }

    return NextResponse.json({
      success: true,
      total_found: allCreators.length,
      creators: allCreators,
    });
  } catch (error: any) {
    console.error("Instagram search error:", error);
    return NextResponse.json(
      { error: error.message || "Instagram search failed" },
      { status: 500 }
    );
  }
}
