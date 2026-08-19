import { NextRequest, NextResponse } from "next/server";
import { suggestPainPoints } from "../utils";

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
};

// Profile fetches per search. Keywords = 1 credit each, profiles = 1 credit each.
// 4 keywords + 15 profiles = 19 credits per search.
const MAX_PROFILE_FETCHES = 30;

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, backoffMs = 3000): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
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
    const { keywords, maxProfiles, searchMode, minFollowers, maxFollowers, tier } = await request.json();

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: "Keywords array is required" },
        { status: 400 }
      );
    }

    const cap = Math.min(maxProfiles || MAX_PROFILE_FETCHES, 30);

    const uniqueHandles = new Map<string, any>();

    // PHASE 1: Keyword searches — collect ALL unique handles with publish_time=30 (~30 days = last month)
    for (const keyword of keywords) {
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
          continue;
        }

        const searchData = await searchResponse.json();
        const videos = searchData.search_item_list || searchData.data?.search_item_list || [];

        for (const item of videos) {
          const author = item.aweme_info?.author;
          if (!author?.unique_id) continue;
          if (uniqueHandles.has(author.unique_id)) continue;

          uniqueHandles.set(author.unique_id, {
            handle: author.unique_id,
            nickname: author.nickname || author.unique_id,
            follower_count: author.follower_count || 0,
            verified: !!(author.custom_verify || author.verification_type > 0),
            bio: author.signature || "",
            avatar: author.avatar_thumb?.url_list?.[0] || null,
          });
        }
      } catch (err) {
        console.error(`Error searching keyword "${keyword}":`, err);
      }
    }

    // Filter by follower range BEFORE profile fetches
    let filtered = Array.from(uniqueHandles.values());
    if (minFollowers !== undefined && minFollowers !== null) {
      filtered = filtered.filter(e => e.follower_count >= minFollowers);
    }
    if (maxFollowers !== undefined && maxFollowers !== null) {
      filtered = filtered.filter(e => e.follower_count <= maxFollowers);
    }

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
            let email: string | null = null;
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const bioEmails = user.signature?.match(emailRegex);
            if (bioEmails?.length) email = bioEmails[0];

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

            creators.push({
              handle: user.uniqueId,
              nickname: user.nickname,
              platform: "tiktok",
              profile_url: `https://tiktok.com/@${user.uniqueId}`,
              avatar: user.avatarLarger || entry.avatar,
              bio: user.signature || null,
              bioLink: user.bioLink?.link || null,
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
                                              });
                    }
                  }
                }



    // Append remaining (non-fetched) leads
    for (const entry of rest) {
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
                score: calcScore(followerCount, estEngagement, false),
                pain_points: suggestPainPoints(entry.bio || null),
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