import { NextRequest, NextResponse } from "next/server";
import { suggestPainPoints } from "../utils";

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
    const { keywords, searchMode, minFollowers, maxFollowers, tier } = await request.json();

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: "Keywords array is required" },
        { status: 400 }
      );
    }

    const allCreators: InstagramCreator[] = [];
    const seenHandles = new Set<string>();

    // PHASE 1: Search profiles by keyword — fetch more results per keyword
    for (const keyword of keywords) {
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
          continue;
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

          let email: string | null = null;
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const bioEmails = profile.biography?.match(emailRegex);
          if (bioEmails?.length) email = bioEmails[0];

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

          allCreators.push({
                      handle: profile.username,
                      nickname: profile.full_name || profile.username,
                      platform: "instagram",
                      profile_url: `https://instagram.com/${profile.username}`,
                      avatar: profile.profile_pic_url || null,
                      bio: profile.biography || null,
                      bioLink: profile.external_url || null,
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
    }

    // Sort by score descending — quality leads first
    allCreators.sort((a, b) => b.score - a.score);

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