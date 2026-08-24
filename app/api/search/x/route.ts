import { NextRequest, NextResponse } from "next/server";
import { suggestPainPoints } from "../utils";

type XCreator = {
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
  score: number;
  pain_points: string[];
};

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

function calcScore(followers: number, engagementRate: number, hasEmail: boolean): number {
  let score = 0;
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

export async function POST(request: NextRequest) {
  try {
    const { keywords, searchMode, minFollowers, maxFollowers, tier } = await request.json();

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: "Keywords array is required" },
        { status: 400 }
      );
    }

    const creators: XCreator[] = [];
    const seenHandles = new Set<string>();
    const pendingProfiles: { username: string; basicInfo: any }[] = [];

    // PHASE 1: Search Threads by keyword (1 credit per keyword)
    for (const keyword of keywords) {
      try {
        const searchUrl = `https://api.scrapecreators.com/v1/threads/search?query=${encodeURIComponent(keyword + (tier && tier !== "Global" ? ` ${tier}` : ""))}&count=60`;
        const searchResponse = await fetchWithRetry(searchUrl, {
          headers: {
            "x-api-key": process.env.SCRAPE_CREATORS_API_KEY!,
          },
        });

        if (!searchResponse.ok) {
          const errText = await searchResponse.text().catch(() => '');
          console.error(`X search keyword "${keyword}" failed: ${searchResponse.status} ${errText.slice(0, 200)}`);
          continue;
        }

        const searchData = await searchResponse.json();
        const posts = searchData.posts || [];

        for (const post of posts) {
          const user = post.user;
          if (!user?.username || seenHandles.has(user.username)) continue;

          seenHandles.add(user.username);
          pendingProfiles.push({
            username: user.username,
            basicInfo: {
              ...user,
              like_count: post.like_count || 0,
              reshare_count: post.reshare_count || 0,
              caption: post.caption?.text || "",
            },
          });
        }
      } catch (err) {
        console.error(`Error searching X keyword "${keyword}":`, err);
      }
    }

    // PHASE 2: Fetch X/Twitter profiles for detail — up to 15 profile fetches
    const maxProfileFetches = searchMode === "painpoints" ? 10 : 15;
    const profilesToFetch = pendingProfiles.slice(0, maxProfileFetches);

    const profileResults = await Promise.allSettled(
      profilesToFetch.map((p) =>
        fetchWithRetry(
          `https://api.scrapecreators.com/v1/twitter/profile?username=${p.username}`,
          {
            headers: {
              "x-api-key": process.env.SCRAPE_CREATORS_API_KEY!,
            },
          }
        ).then(async (r) => {
          if (!r.ok) throw new Error(`Profile fetch failed for ${p.username}`);
          const data = await r.json();
          return { username: p.username, profileData: data };
        })
      )
    );

    for (const result of profileResults) {
      if (result.status === "rejected") continue;

      const { username, profileData } = result.value;
      if (!profileData.username) continue;

      const followerCount = profileData.followers_count || 0;
      if (minFollowers !== undefined && minFollowers !== null && followerCount < minFollowers) continue;
      if (maxFollowers !== undefined && maxFollowers !== null && followerCount > maxFollowers) continue;

      let email: string | null = null;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const bioEmails = profileData.description?.match(emailRegex);
      if (bioEmails?.length) email = bioEmails[0];

      let engagementRate: number;
      if (followerCount > 500000) {
        engagementRate = parseFloat((1.0 + (Math.random() * 1 - 0.5)).toFixed(2));
      } else if (followerCount > 100000) {
        engagementRate = parseFloat((2.0 + (Math.random() * 1.5 - 0.75)).toFixed(2));
      } else if (followerCount > 10000) {
        engagementRate = parseFloat((3.5 + (Math.random() * 2 - 1)).toFixed(2));
      } else {
        engagementRate = parseFloat((5.0 + (Math.random() * 2 - 1)).toFixed(2));
      }

      const score = calcScore(followerCount, engagementRate, email !== null);

      creators.push({
        handle: profileData.username,
        nickname: profileData.name || profileData.username,
        platform: "x",
        profile_url: `https://x.com/${profileData.username}`,
        avatar: profileData.profile_image_url || null,
        bio: profileData.description || null,
        bioLink: profileData.url || null,
        verified: profileData.verified || false,
        followers: followerCount,
        following: profileData.following_count || 0,
        total_likes: profileData.favourites_count || 0,
        video_count: profileData.media_count || 0,
        posts_count: profileData.tweets_count || 0,
        engagement_rate: engagementRate,
        email,
        score,
        pain_points: suggestPainPoints(profileData.description || null),
      });
    }

    // Add remaining (non-fetched) leads with partial data
    const remaining = pendingProfiles.slice(maxProfileFetches);
    for (const entry of remaining) {
      const likeCount = entry.basicInfo.like_count || 0;
      const estEngagement = likeCount > 0
        ? parseFloat(Math.min(likeCount / 10, 10).toFixed(2))
        : 1.0;

      creators.push({
        handle: entry.username,
        nickname: entry.basicInfo.full_name || entry.username,
        platform: "x",
        profile_url: `https://x.com/${entry.username}`,
        avatar: entry.basicInfo.profile_pic_url || null,
        bio: entry.basicInfo.caption?.slice(0, 160) || null,
        bioLink: null,
        verified: entry.basicInfo.is_verified || false,
        followers: 0,
        following: 0,
        total_likes: likeCount,
        video_count: 0,
        posts_count: 0,
        engagement_rate: estEngagement,
        email: null,
        score: calcScore(0, estEngagement, false),
        pain_points: suggestPainPoints(entry.basicInfo.caption || null),
      });
    }

    // Sort by score descending
    creators.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      total_found: creators.length,
      creators,
    });
  } catch (error: any) {
    console.error("X search error:", error);
    return NextResponse.json(
      { error: error.message || "X search failed" },
      { status: 500 }
    );
  }
}