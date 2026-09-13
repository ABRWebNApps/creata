import { NextRequest, NextResponse } from "next/server";

type LinkedInCreator = {
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
  location: string | null;
  headline: string | null;
  profile_fetched: boolean;
  pain_points: string[];
  score: number;
  matched_comment?: string | null;
  matched_caption?: string | null;
};

// Max profile fetches to conserve credits
const MAX_PROFILE_FETCHES = 30;
// Max search posts per keyword
const MAX_SEARCH_POSTS = 60;

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

function calcScore(followers: number, hasEmail: boolean, hasAbout: boolean): number {
  let score = 0;
  // LinkedIn sweet spot: 500-10k followers (high engagement, niche professionals)
  if (followers >= 500 && followers <= 10000) score += 35;
  else if (followers > 10000 && followers <= 100000) score += 25;
  else if (followers > 100000) score += 10;
  else score += 15;

  if (hasEmail) score += 30;
  if (hasAbout) score += 15;

  return score;
}

// Generate pain point suggestions from bio/about text
function suggestPainPoints(bio: string | null, headline: string | null): string[] {
  const text = `${headline || ""} ${bio || ""}`.toLowerCase();
  const painPoints: string[] = [];

  // Industry-specific pain point patterns
  if (text.includes("market") || text.includes("brand") || text.includes("growth")) {
    painPoints.push("Struggling to scale their reach or engagement");
    painPoints.push("Need better brand positioning in a crowded market");
  }
  if (text.includes("financ") || text.includes("invest") || text.includes("wealth") || text.includes("money")) {
    painPoints.push("Uncertain about investment strategies in current economy");
    painPoints.push("Looking for passive income or wealth preservation");
  }
  if (text.includes("tech") || text.includes("startup") || text.includes("founder") || text.includes("saas")) {
    painPoints.push("Difficulty with customer acquisition and retention");
    painPoints.push("Balancing product development with go-to-market strategy");
  }
  if (text.includes("health") || text.includes("wellness") || text.includes("fitness") || text.includes("mental")) {
    painPoints.push("Overwhelmed by conflicting health/wellness advice online");
    painPoints.push("Struggling to build consistent healthy habits");
  }
  if (text.includes("career") || text.includes("job") || text.includes("recruit") || text.includes("hire")) {
    painPoints.push("Frustrated with traditional job search or hiring processes");
    painPoints.push("Need better career growth or talent acquisition strategies");
  }
  if (text.includes("content") || text.includes("social") || text.includes("influencer")) {
    painPoints.push("Content fatigue — difficulty standing out in their niche");
    painPoints.push("Monetization challenges despite audience growth");
  }
  if (text.includes("real estate") || text.includes("property") || text.includes("housing")) {
    painPoints.push("Navigating market volatility and interest rate uncertainty");
    painPoints.push("Finding qualified leads in a shifting market");
  }
  if (text.includes("coach") || text.includes("consult") || text.includes("trainer")) {
    painPoints.push("Difficulty converting followers into paying clients");
    painPoints.push("Need scalable systems for client acquisition");
  }
  if (text.includes("design") || text.includes("creative") || text.includes("artist") || text.includes("photo")) {
    painPoints.push("Undervalued work — struggling to charge premium rates");
    painPoints.push("Finding consistent high-quality clients");
  }
  if (text.includes("lawyer") || text.includes("legal") || text.includes("attorney")) {
    painPoints.push("Client acquisition costs too high in competitive practice areas");
    painPoints.push("Need to differentiate their firm in a saturated market");
  }
  if (text.includes("sal") || text.includes("revenue") || text.includes("business development")) {
    painPoints.push("Hit revenue plateau — need new channels or strategies");
    painPoints.push("Long sales cycles draining pipeline efficiency");
  }

  // Generic — add if we have less than 3
  if (painPoints.length < 3) {
    if (bio) painPoints.push("Audience growth has plateaued and needs fresh strategies");
    painPoints.push("Time management — too busy for content creation");
  }

  // De-duplicate and return top 3
  return Array.from(new Set(painPoints)).slice(0, 3);
}

export async function POST(request: NextRequest) {
  try {
    const { keywords, minFollowers, maxFollowers, tier } = await request.json();

    if (!keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: "Keywords array is required" },
        { status: 400 }
      );
    }

    const uniqueAuthors = new Map<string, any>();

    // PHASE 1: Search LinkedIn posts by keyword (1 credit per keyword)
    for (const keyword of keywords) {
      try {
        const searchUrl = `https://api.scrapecreators.com/v1/linkedin/search/posts?query=${encodeURIComponent(keyword + (tier && tier !== "Global" ? ` ${tier}` : ""))}&count=${MAX_SEARCH_POSTS}`;
        const searchResponse = await fetchWithRetry(searchUrl, {
          headers: {
            "x-api-key": process.env.SCRAPE_CREATORS_API_KEY!,
          },
        });

        if (!searchResponse.ok) {
          const errText = await searchResponse.text().catch(() => '');
          console.error(`LinkedIn search keyword "${keyword}" failed: ${searchResponse.status} ${errText.slice(0, 200)}`);
          continue;
        }

        const searchData = await searchResponse.json();
        const posts = searchData.posts || [];

        for (const post of posts) {
          const author = post.author;
          if (!author?.url) continue;

          // Extract handle from profile URL
          const urlMatch = author.url.match(/linkedin\.com\/in\/([^/?]+)/);
          const handle = urlMatch ? urlMatch[1] : author.url.split('/').pop();
          if (!handle || uniqueAuthors.has(handle)) continue;

          uniqueAuthors.set(handle, {
            handle,
            name: author.name || handle,
            avatar: author.image || null,
            followers: author.followers || 0,
            profile_url: author.url,
            post_title: post.name || "",
            post_description: post.description || "",
            post_date: post.datePublished || "",
            matched_comment: post.description || null,
            matched_caption: null,
          });
        }
      } catch (err) {
        console.error(`Error searching LinkedIn keyword "${keyword}":`, err);
      }
    }

    // Filter by follower range
    let filtered = Array.from(uniqueAuthors.values());
    if (minFollowers !== undefined && minFollowers !== null) {
      filtered = filtered.filter(e => e.followers >= minFollowers);
    }
    if (maxFollowers !== undefined && maxFollowers !== null) {
      filtered = filtered.filter(e => e.followers <= maxFollowers);
    }

    // Sort by follower count descending — prioritize pros
    filtered.sort((a, b) => b.followers - a.followers);
    const toFetch = filtered.slice(0, MAX_PROFILE_FETCHES);
    const rest = filtered.slice(MAX_PROFILE_FETCHES);

    const creators: LinkedInCreator[] = [];

    // PHASE 2: Fetch detailed profiles (1 credit each)
    const fetchBatch = async (batch: any[]) => {
      const results = await Promise.allSettled(
        batch.map((entry) =>
          fetchWithRetry(
            `https://api.scrapecreators.com/v1/linkedin/profile?url=${encodeURIComponent(entry.profile_url)}`,
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

          const followerCount = profileData.followers || 0;

          let email: string | null = null;
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const bioEmails = profileData.about?.match(emailRegex);
          if (bioEmails?.length) email = bioEmails[0];

          // Estimate engagement based on followers and activity
          const postsCount = profileData.recentPosts?.length || 0;
          const hasActivity = profileData.activity?.length > 0 || profileData.articles?.length > 0;
          const engagementRate = followerCount > 0
            ? parseFloat(Math.min((postsCount / Math.max(followerCount, 1)) * 100, 10).toFixed(2))
            : 1.0;

          const score = calcScore(followerCount, email !== null, !!profileData.about);
          const painPoints = suggestPainPoints(profileData.about, null);

          creators.push({
            handle: entry.handle,
            nickname: profileData.name || entry.name,
            platform: "linkedin",
            profile_url: entry.profile_url,
            avatar: profileData.image || entry.avatar,
            bio: profileData.about || entry.post_description || null,
            bioLink: null,
            verified: false,
            followers: followerCount,
            following: 0,
            total_likes: 0,
            video_count: 0,
            engagement_rate: engagementRate,
            email,
            location: profileData.location || null,
            headline: profileData.name || null,
            profile_fetched: true,
            pain_points: painPoints,
            score,
            matched_comment: entry.matched_comment || null,
            matched_caption: entry.matched_caption || null,
          });
        } else {
          // Profile fetch failed — fall back to search-level data
          const followerCount = entry.followers || 0;
          const estEngagement = followerCount > 100000
            ? parseFloat((1.0 + (Math.random() * 1 - 0.5)).toFixed(2))
            : followerCount > 10000
            ? parseFloat((2.5 + (Math.random() * 1.5 - 0.75)).toFixed(2))
            : parseFloat((4.0 + (Math.random() * 2 - 1)).toFixed(2));

          const score = calcScore(followerCount, false, false);
          const painPoints = suggestPainPoints(entry.post_description, null);

          creators.push({
            handle: entry.handle,
            nickname: entry.name,
            platform: "linkedin",
            profile_url: entry.profile_url,
            avatar: entry.avatar,
            bio: entry.post_description || null,
            bioLink: null,
            verified: false,
            followers: followerCount,
            following: 0,
            total_likes: 0,
            video_count: 0,
            engagement_rate: estEngagement,
            email: null,
            location: null,
            headline: null,
            profile_fetched: false,
            pain_points: painPoints,
            score,
            matched_comment: entry.matched_comment || null,
            matched_caption: entry.matched_caption || null,
          });
        }
      }
    };

    await fetchBatch(toFetch);

    // Append remaining (non-fetched) leads
    for (const entry of rest) {
      const followerCount = entry.followers || 0;
      const estEngagement = followerCount > 100000
        ? parseFloat((1.0 + (Math.random() * 1 - 0.5)).toFixed(2))
        : followerCount > 10000
        ? parseFloat((2.5 + (Math.random() * 1.5 - 0.75)).toFixed(2))
        : parseFloat((4.0 + (Math.random() * 2 - 1)).toFixed(2));

      const score = calcScore(followerCount, false, false);
      const painPoints = suggestPainPoints(entry.post_description, null);

      creators.push({
        handle: entry.handle,
        nickname: entry.name,
        platform: "linkedin",
        profile_url: entry.profile_url,
        avatar: entry.avatar,
        bio: entry.post_description || null,
        bioLink: null,
        verified: false,
        followers: followerCount,
        following: 0,
        total_likes: 0,
        video_count: 0,
        engagement_rate: estEngagement,
        email: null,
        location: null,
        headline: null,
        profile_fetched: false,
        pain_points: painPoints,
        score,
        matched_comment: entry.matched_comment || null,
        matched_caption: entry.matched_caption || null,
      });
    }

    // Sort by score descending — best leads first
    creators.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      total_found: creators.length,
      total_unique_handles: uniqueAuthors.size,
      profiles_fetched: toFetch.length,
      credits_used: keywords.length + toFetch.length,
      creators,
    });
  } catch (error: any) {
    console.error("LinkedIn search error:", error);
    return NextResponse.json(
      { error: error.message || "LinkedIn search failed" },
      { status: 500 }
    );
  }
}