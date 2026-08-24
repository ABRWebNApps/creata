import { NextRequest, NextResponse } from "next/server";
import { suggestPainPoints } from "../utils";

type FacebookCreator = {
  handle: string;
  nickname: string;
  platform: string;
  profile_url: string;
  avatar: string | null;
  bio: string | null;
  bioLink: string | null;
  verified: boolean;
  followers: number;
  friends_count: number;
  engagement_rate: number;
  email: string | null;
  website: string | null;
  location: string | null;
  category: string | null;
  profile_fetched: boolean;
  score: number;
  pain_points: string[];
};

const MAX_PROFILE_FETCHES = 30;
const MAX_SEARCH_USERS = 60;
const MIN_FOLLOWERS = 0;

function calcScore(lead: Partial<FacebookCreator>): number {
  let score = 0;
  const followers = lead.followers || 0;

  // Sweet spot: 500-50k (small-medium pages, more responsive)
  if (followers >= 500 && followers <= 10000) score += 35;
  else if (followers > 10000 && followers <= 50000) score += 25;
  else if (followers > 50000) score += 10;
  else if (followers >= 100) score += 15;

  // Bio text = likely more active
  if (lead.bio && lead.bio.length > 20) score += 15;

  // Website = can find more contact info
  if (lead.website) score += 10;

  // Location = easier to target geographically
  if (lead.location) score += 5;

  // Has a category = business/product oriented
  if (lead.category) score += 10;

  return score;
}

export async function POST(request: NextRequest) {
  try {
    const { keywords, minFollowers, maxFollowers } = await request.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: "Keywords array is required" },
        { status: 400 }
      );
    }

    const API_KEY = process.env.SCRAPE_CREATORS_API_KEY;
    if (!API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const creators: FacebookCreator[] = [];
    const seenHandles = new Set<string>();

    // Phase 1: Search users by keyword
    for (const keyword of keywords) {
      if (creators.length >= MAX_SEARCH_USERS) break;

      try {
        const res = await fetch(
          `https://api.scrapecreators.com/v1/facebook/search/users?query=${encodeURIComponent(keyword)}&limit=50`,
          { headers: { "x-api-key": API_KEY }, signal: AbortSignal.timeout(15000) }
        );
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.success || !Array.isArray(data.data)) continue;

        for (const user of data.data) {
          const handle = user.username || user.id || "";
          if (!handle || seenHandles.has(handle)) continue;
          seenHandles.add(handle);

          // Build creator from search data (minimal)
          const followerCount = user.followers_count || user.fan_count || 0;
          if (followerCount < MIN_FOLLOWERS) continue;
          if (minFollowers && followerCount < minFollowers) continue;
          if (maxFollowers && followerCount > maxFollowers) continue;

          creators.push({
            handle,
            nickname: user.name || user.full_name || handle,
            platform: "facebook",
            profile_url: `https://facebook.com/${handle}`,
            avatar: user.profile_picture || user.profile_pic_url || null,
            bio: user.about || user.biography || null,
            bioLink: null,
            verified: user.is_verified || false,
            followers: followerCount,
            friends_count: user.friends_count || 0,
            engagement_rate: user.engagement_rate || 0,
            email: null,
            website: null,
            location: user.location || null,
            category: user.category || null,
            profile_fetched: false,
            score: 0,
            pain_points: suggestPainPoints(user.bio || user.about || null),
          });
        }
      } catch (err) {
        console.error(`Facebook keyword search error for "${keyword}":`, err);
      }
    }

    // Phase 2: Deep-fetch best leads' profiles (up to MAX_PROFILE_FETCHES)
    const toFetch = creators.slice(0, MAX_PROFILE_FETCHES);
    await Promise.allSettled(
      toFetch.map(async (lead) => {
        try {
          const res = await fetch(
            `https://api.scrapecreators.com/v1/facebook/profile?url=${encodeURIComponent(lead.profile_url)}`,
            { headers: { "x-api-key": API_KEY }, signal: AbortSignal.timeout(15000) }
          );
          if (!res.ok) return;
          const data = await res.json();
          if (!data.success || !data.data) return;

          const p = data.data;
          lead.avatar = p.profile_picture || p.picture_url || lead.avatar;
          lead.bio = p.about || p.description || lead.bio;
          lead.bioLink = p.website || p.external_url || null;
          lead.location = p.location || p.hometown || lead.location;
          lead.category = p.category || p.page_type || lead.category;
          lead.email = p.email || null;
          lead.followers = p.followers_count || p.fan_count || lead.followers;
          lead.friends_count = p.friends_count || 0;
          lead.verified = p.is_verified || lead.verified;
          lead.profile_fetched = true;
          lead.pain_points = suggestPainPoints(lead.bio);
        } catch (err) {
          console.error(`Facebook profile fetch error for ${lead.handle}:`, err);
        }
      })
    );

    // Score all leads
    for (const lead of creators) {
      lead.score = calcScore(lead);
    }

    // Sort by score descending
    creators.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      total_found: creators.length,
      leads: creators,
    });
  } catch (error: any) {
    console.error("Facebook search error:", error);
    return NextResponse.json(
      { error: error.message || "Facebook search failed" },
      { status: 500 }
    );
  }
}