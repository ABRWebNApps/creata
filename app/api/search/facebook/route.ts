import { NextRequest, NextResponse } from "next/server";
import { suggestPainPoints, isHighValueLead } from "../utils";

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
  matched_comment?: string | null;
  matched_caption?: string | null;
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
    const seenPageIds = new Set<string>();

    // Phase 1: Search Facebook Ad Library for business pages running ads
    // Uses v1/facebook/adLibrary/search/ads which returns real business pages
    for (const keyword of keywords) {
      if (creators.length >= MAX_SEARCH_USERS) break;

      try {
        const res = await fetch(
          `https://api.scrapecreators.com/v1/facebook/adLibrary/search/ads?query=${encodeURIComponent(keyword)}&country=ALL&status=ALL`,
          { headers: { "x-api-key": API_KEY }, signal: AbortSignal.timeout(15000) }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const searchResults = data.searchResults || data.data?.searchResults || [];
        if (!Array.isArray(searchResults) || searchResults.length === 0) continue;

        for (const ad of searchResults) {
          const pageId = ad.page_id || "";
          if (!pageId || seenPageIds.has(pageId)) continue;
          seenPageIds.add(pageId);

          const pageName = ad.page_name || pageId;
          const snapshot = ad.snapshot || {};
          const bodyText = snapshot.body?.text || "";
          const avatarUrl = snapshot.page_profile_picture_url || null;
          const linkUrl = snapshot.link_url || null;
          const ctaText = snapshot.cta_text || null;
          // Use the actual page profile URI (contains the vanity handle, not numeric ID)
          const profileUri = snapshot.page_profile_uri || "";
          // Extract handle from profile URI, fallback to page_id
          const handle = profileUri ? profileUri.replace(/https?:\/\/[^\/]+\//, '').replace(/\/$/, '') : pageId;
          const pageLikes = snapshot.page_like_count || 0;
          const pageCategories = snapshot.page_categories || null;

          // Build creator from Ad Library page data
          const creator: FacebookCreator = {
            handle: handle,
            nickname: pageName,
            platform: "facebook",
            profile_url: profileUri || `https://facebook.com/${pageId}`,
            avatar: avatarUrl,
            bio: bodyText || null,
            bioLink: linkUrl,
            verified: false,
            followers: pageLikes,
            friends_count: 0,
            engagement_rate: 0,
            email: null,
            website: linkUrl,
            location: null,
            category: Array.isArray(pageCategories) ? pageCategories[0] : (typeof pageCategories === 'string' ? pageCategories : null),
            profile_fetched: false,
            score: 0,
            pain_points: suggestPainPoints(bodyText || null),
            matched_caption: ctaText || null,
          };

          // Filter: pass snapshot body text as bio + cta text as matchedContent
          if (!isHighValueLead(creator.bio, creator.matched_caption || null, keywords)) continue;
          creators.push(creator);
        }
      } catch (err) {
        console.error(`Facebook Ad Library search error for "${keyword}":`, err);
      }
    }

    // Phase 2: Deep-fetch best leads' profiles (up to MAX_PROFILE_FETCHES)
    // Profile fetch enriches with followers, category, email, etc.
    const toFetch = creators.slice(0, MAX_PROFILE_FETCHES);
    await Promise.allSettled(
      toFetch.map(async (lead) => {
        if (!isHighValueLead(lead.bio || null, lead.matched_caption || null, keywords)) return;
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
          lead.bioLink = p.website || p.external_url || lead.bioLink;
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
      creators,
    });
  } catch (error: any) {
    console.error("Facebook search error:", error);
    return NextResponse.json(
      { error: error.message || "Facebook search failed" },
      { status: 500 }
    );
  }
}