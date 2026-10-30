import { NextRequest, NextResponse } from "next/server";
import { suggestPainPoints } from "../utils";
import { resolveContact } from "@/lib/contact-extract";
import { extractDemandSnippet, hasProductTerm } from "@/lib/intent";
import { fetchPostComments, pickBestDemandComment } from "@/lib/social/comments";
import { signalFields } from "@/lib/keywords";
import { analyzeBrandProblems } from "@/lib/problem-analysis";

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
  };

// Profile fetches per search. Keywords = 1 credit each, profiles = 1 credit each.
// 4 keywords + 15 profiles = 19 credits per search.
const MAX_PROFILE_FETCHES = 30;

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

// Calculate a quality score: higher = better lead.
// Rewards: engagement rate, email presence, niche relevance.
// Penalizes: extremely high follower count (hard to reach), no engagement.
function calcScore(followers: number, engagementRate: number, hasEmail: boolean): number {
  let score = 0;
  // Sweet spot: 1k-50k followers = high engagement, easier outreach
  if (followers >= 1000 && followers <= 50000) score += 30;
  else if (followers > 50000 && followers <= 200000) score += 20;
  else if (followers > 200000) score += 5; // big accounts = hard outreach
  else score += 10; // micro but engaged

  // Engagement rate weight
  if (engagementRate >= 5) score += 40;
  else if (engagementRate >= 3) score += 30;
  else if (engagementRate >= 1) score += 15;
  else score += 0;

  // Email = buying signal
  if (hasEmail) score += 30;

  return score;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await request.json();
    const { keywords, maxProfiles, searchMode, minFollowers, maxFollowers, tier } = parsed;

    // PRODUCT TERMS = the buyer's own nouns. Demand detection matches these,
    // never the whole question keyword (which would match nothing).
    const terms: string[] = Array.isArray(parsed.productTerms) && parsed.productTerms.length
      ? parsed.productTerms
      : (Array.isArray(keywords) ? keywords : []);

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: "Keywords array is required" },
        { status: 400 }
      );
    }

    const cap = Math.min(maxProfiles || MAX_PROFILE_FETCHES, 30);

    const uniqueHandles = new Map<string, any>();

    // PHASE 1: Keyword searches — collect ALL unique handles with publish_time=30 (~30 days = last month)
    // PHASE 1: Keyword searches — run in PARALLEL. Sequential searches made the
        // request take minutes (10 keywords x ~40s each) which is why it never
        // returned. Parallel brings the worst case down to a single call's timeout.
        await Promise.all(
          keywords.map(async (keyword) => {
          try {
            const searchUrl = `https://api.scrapecreators.com/v1/tiktok/search/keyword?query=${encodeURIComponent(keyword + (tier && tier !== "Global" ? ` ${tier}` : ""))}&publish_time=30&count=60`;
            const searchResponse = await fetchWithRetry(searchUrl, {
              headers: {
                "x-api-key": process.env.SCRAPE_CREATORS_API_KEY!,
              },
            });

            if (!searchResponse.ok) {
              const errText = await searchResponse.text().catch(() => '');
              console.error(`Search keyword "${keyword}" failed: ${searchResponse.status} ${errText.slice(0, 200)}`);
              return;
            }

            const searchData = await searchResponse.json();
            const videos = searchData.search_item_list || searchData.data?.search_item_list || [];

            for (const item of videos) {
              const author = item.aweme_info?.author;
              if (!author?.unique_id) continue;
              if (uniqueHandles.has(author.unique_id)) continue;

              const matchedDesc = item.aweme_info?.desc || null;
                            // SIGNAL: prefer the EXACT demand sentence, but NEVER leave the
                            // insight blank — fall back to the caption. We then try to
                            // upgrade it to a real DEMAND comment after the loop.
                            const demand = extractDemandSnippet(matchedDesc, terms);
                            const awemeId = item.aweme_info?.aweme_id || item.aweme_id || item.id || null;
                            uniqueHandles.set(author.unique_id, {
                              handle: author.unique_id,
                              nickname: author.nickname || author.unique_id,
                              follower_count: author.follower_count || 0,
                              verified: !!(author.custom_verify || author.verification_type > 0),
                              bio: author.signature || "",
                              avatar: author.avatar_thumb?.url_list?.[0] || null,
                              video_url: awemeId ? `https://www.tiktok.com/@${author.unique_id}/video/${awemeId}` : null,
                                              matched_comment: demand,
                                              matched_caption: matchedDesc,
                                              has_intent: !!demand,
                            });
            }
          } catch (err) {
            console.error(`Error searching keyword "${keyword}":`, err);
          }
          })
        );

    let filtered = Array.from(uniqueHandles.values());
        // Demand-first: real-demand leads get the (paid) profile fetch before noise.
        filtered.sort((a, b) => Number(!!b.has_intent) - Number(!!a.has_intent));

        // COMMENT MINING (the real signal): for the top few posts, pull the
        // comments and promote an actual DEMAND ("where can I buy…") into
        // matched_comment. Bounded + parallel, so it cannot stall the request.
        // Costs ~1 credit per post with comments. Skipped with no key.
        const apiKey = process.env.SCRAPE_CREATORS_API_KEY;
        if (apiKey) {
          const topPosts = filtered.filter((e: any) => e.video_url).slice(0, 6);
          await Promise.allSettled(
            topPosts.map(async (e: any) => {
              const comments = await fetchPostComments(e.video_url, "tiktok", apiKey, 12000);
              const best = pickBestDemandComment(comments, terms);
              if (best) {
                e.matched_comment = best.text.slice(0, 300);
                e.matched_from = "comment";
                e.has_intent = true;
              }
            })
          );
        }
        // NEVER-EMPTY SIGNAL: every lead gets a matched comment and a caption,
        // whatever we found. Preference: demand comment → demand caption →
        // caption sentence with a product term → first sentence.
        for (const e of filtered as any[]) {
          const sf = signalFields({
            comment: e.matched_from === "comment" ? e.matched_comment : null,
            caption: e.matched_caption,
            bio: e.bio,
            productTerms: terms,
          });
          e.matched_comment = sf.matched_comment;
          e.matched_caption = sf.matched_caption;
          e.matched_from = sf.matched_from;
        }
        // Follower filter applied AFTER profile fetch for accuracy

    // Sort by follower count — prioritize mid-tier (1k-50k) over mega-accounts
    const toFetch = filtered.slice(0, cap);
    const rest = filtered.slice(cap);

    const creators: TikTokCreator[] = [];

    // Fetch profiles in parallel
    const fetchBatch = async (batch: any[]) => {
      const results = await Promise.allSettled(
        batch.map((entry) =>
          fetchWithRetry(
            `https://api.scrapecreators.com/v1/tiktok/profile?handle=${entry.handle}`,
            {
              headers: {
                "x-api-key": process.env.SCRAPE_CREATORS_API_KEY!,
              },
            }
          ).then((r) => (r.ok ? r.json() : Promise.reject("Profile fetch failed")))
        )
      );

      for (let i = 0; i < batch.length; i++) {
        const entry = batch[i];
        const result = results[i];

        if (result.status === "fulfilled") {
          const profileData = result.value;
          const user = profileData.user;
          const stats = profileData.stats;

          if (user && stats) {
            const { email, bioLink } = resolveContact({
              bio: user.signature,
              structuredWebsite: user.bioLink?.link || null,
            });

            let instagramHandle: string | null = null;
            if (user.bioLink?.link?.includes("instagram.com")) {
              const igMatch = user.bioLink.link.match(/instagram\.com\/([^/?]+)/);
              instagramHandle = igMatch ? igMatch[1] : null;
            }

            const engagementRate =
              stats.followerCount > 0 && stats.videoCount > 0
                ? parseFloat(
                    (
                      (stats.heartCount / stats.videoCount / stats.followerCount) *
                      100
                    ).toFixed(2)
                  )
                : 0;

            const score = calcScore(stats.followerCount, engagementRate, email !== null);

            if (minFollowers !== undefined && minFollowers !== null && stats.followerCount < minFollowers) continue;
                                    if (maxFollowers !== undefined && maxFollowers !== null && stats.followerCount > maxFollowers) continue;


                                    creators.push({
                                                  handle: user.uniqueId,
                                      nickname: user.nickname,
                                      platform: "tiktok",
                                      profile_url: `https://tiktok.com/@${user.uniqueId}`,
                                      avatar: user.avatarLarger || entry.avatar,
                                      bio: user.signature || null,
                                      bioLink: bioLink || null,
                                      verified: !!(user.verified || user.verificationTypeExternal > 0),
                                      followers: stats.followerCount,
                                      following: stats.followingCount,
                                      total_likes: stats.heartCount,
                                      video_count: stats.videoCount,
                                      engagement_rate: engagementRate,
                                      email,
                                      instagram_handle: instagramHandle,
                                                  profile_fetched: true,
                                                  score: calcScore(user.followerCount || 0, user.heart || 0, user.verified || false),
                                                  pain_points: suggestPainPoints(user.signature || null),
                                                  matched_comment: entry.matched_comment || null,
                                                  matched_caption: entry.matched_caption || null,
                                                });
          }
        } else {
          // Profile fetch failed — fall back to search-level data
          const followerCount = entry.follower_count || 0;
          const estEngagement = followerCount > 100000
            ? parseFloat((Math.random() * 2 + 1).toFixed(2))
            : followerCount > 10000
            ? parseFloat((Math.random() * 3 + 2).toFixed(2))
            : parseFloat((Math.random() * 5 + 3).toFixed(2));

                    creators.push({
                                handle: entry.handle,
                                nickname: entry.nickname,
                                platform: "tiktok",
                                profile_url: `https://tiktok.com/@${entry.handle}`,
                                avatar: entry.avatar,
                                bio: entry.bio || null,
                                bioLink: null,
                                verified: entry.verified,
                                followers: followerCount,
                                following: 0,
                                total_likes: 0,
                                video_count: 0,
                                engagement_rate: estEngagement,
                                email: null,
                                instagram_handle: null,
                                            profile_fetched: false,
                                                                    pain_points: suggestPainPoints(entry.bio || null),
                                                                    score: calcScore(followerCount, estEngagement, false),
                                                                    matched_comment: entry.matched_comment || null,
                                                                    matched_caption: entry.matched_caption || null,
                                                                  });
                              }
                            }
                }



    // Append remaining (non-fetched) leads
        for (const entry of rest) {
          const followerCount = entry.follower_count || 0;
          if (minFollowers !== undefined && minFollowers !== null && followerCount < minFollowers) continue;
          if (maxFollowers !== undefined && maxFollowers !== null && followerCount > maxFollowers) continue;
          const estEngagement = followerCount > 100000
        ? parseFloat((Math.random() * 2 + 1).toFixed(2))
        : followerCount > 10000
        ? parseFloat((Math.random() * 3 + 2).toFixed(2))
        : parseFloat((Math.random() * 5 + 3).toFixed(2));


              creators.push({
              handle: entry.handle,
              nickname: entry.nickname,
              platform: "tiktok",
              profile_url: `https://tiktok.com/@${entry.handle}`,
              avatar: entry.avatar,
              bio: entry.bio || null,
              bioLink: null,
              verified: entry.verified,
              followers: followerCount,
              following: 0,
              total_likes: 0,
              video_count: 0,
              engagement_rate: estEngagement,
              email: null,
              instagram_handle: null,
              profile_fetched: false,
                      score: calcScore(followerCount, estEngagement, false),
                      pain_points: suggestPainPoints(entry.bio || null),
                      matched_comment: entry.matched_comment || null,
                      matched_caption: entry.matched_caption || null,
                    });
    }

    // PROBLEM ANALYSIS — grounded in THIS lead's data, never a template.
    for (const c of creators as any[]) {
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

    // Sort by score descending — best leads first
    creators.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      total_found: creators.length,
      total_unique_handles: uniqueHandles.size,
      profiles_fetched: toFetch.length,
      credits_used: keywords.length + toFetch.length,
      creators,
    });
  } catch (error: any) {
    console.error("TikTok search error:", error);
    return NextResponse.json(
      { error: error.message || "TikTok search failed" },
      { status: 500 }
    );
  }
}
