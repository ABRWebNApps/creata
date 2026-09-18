import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { query, tier = "Global", platform = "tiktok", searchMode = "leads", minFollowers, maxFollowers, maxLeads } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Discovery started:", { query, platform, tier, searchMode, minFollowers, maxFollowers });

    // STEP 1: Generate keywords with AI
    const baseUrl = request.nextUrl.origin;
    const keywordResponse = await fetch(
      `${baseUrl}/api/ai/generate-keywords`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, tier, platform, searchMode }),
      }
    );

    if (!keywordResponse.ok) {
      throw new Error("Failed to generate keywords");
    }

    const keywordData = await keywordResponse.json();
    console.log("✅ Keywords generated:", keywordData.keywords);

    // STEP 2: Search platform with keywords — PASS tier for location filtering
    const searchEndpoint =
          platform === "tiktok" ? "/api/search/tiktok" :
          platform === "instagram" ? "/api/search/instagram" :
          platform === "x" ? "/api/search/x" :
          platform === "linkedin" ? "/api/search/linkedin" :
                    platform === "facebook" ? "/api/search/facebook" :
                    "/api/search/tiktok";

    const searchResponse = await fetch(
      `${baseUrl}${searchEndpoint}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywordData.keywords,
          searchMode,
          minFollowers,
          maxFollowers,
          tier, // <-- pass tier to search routes for location-aware filtering
        }),
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`${platform} search failed`);
    }

    const searchData = await searchResponse.json();
    console.log(`✅ Found ${searchData.total_found} ${platform} creators`);

        // Enforce plan lead cap: slice results to respect maxLeads (free=20, basic=20, pro=30, premium=40)
        const cappedCreators = maxLeads && searchData.creators?.length > maxLeads
          ? searchData.creators.slice(0, maxLeads)
          : searchData.creators;

        return NextResponse.json({
          success: true,
          total_found: cappedCreators.length,
          creators: cappedCreators,
      platform: platform,
      keywords: keywordData.keywords,
      niche: keywordData.niche,
    });
  } catch (error: any) {
    console.error("❌ Discovery error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Discovery failed",
        total_found: 0,
        creators: [],
      },
      { status: 500 }
    );
  }
}