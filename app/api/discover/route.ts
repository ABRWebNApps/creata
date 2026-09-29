import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { filterRelevantLeads } from "@/lib/lead-quality";

export async function POST(request: NextRequest) {
  try {
    const { query, tier = "Global", platform = "tiktok", searchMode = "leads", minFollowers, maxFollowers, maxLeads } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const { data: { user } } = token ? await supabaseAdmin.auth.getUser(token) : { data: { user: null } };
    const { data: profile } = user ? await supabaseAdmin.from("onboarding_profiles").select("role,business_type,industry,offer,ideal_customer,target_regions,main_goal").eq("user_id", user.id).maybeSingle() : { data: null };
    const businessContext = profile ? { role: profile.role, business_type: profile.business_type, industry: profile.industry, offer: profile.offer, ideal_customer: profile.ideal_customer, target_regions: profile.target_regions, goal: profile.main_goal } : null;

    console.log("🔍 Discovery started:", { query, platform, tier, searchMode, minFollowers, maxFollowers });

    // STEP 1: Generate keywords with AI
    const baseUrl = request.nextUrl.origin;
    const keywordResponse = await fetch(
      `${baseUrl}/api/ai/generate-keywords`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, tier, platform, searchMode, businessContext }),
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
          tier,
        }),
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`${platform} search failed`);
    }

    const searchData = await searchResponse.json();
    const relevantCreators = await filterRelevantLeads(
      keywordData.query_understanding?.target_category || query,
      Array.isArray(searchData.creators) ? searchData.creators : [],
      businessContext?.offer || "",
      businessContext?.target_regions || [],
      keywordData.query_understanding?.must_be || [],
      keywordData.query_understanding?.must_not_be || [],
      keywordData.query_understanding?.geo_filter || (tier === "Global" ? null : tier),
    );

    // Enforce plan lead cap: slice results to respect maxLeads (free=20, basic=20, pro=30, premium=40)
    const cappedCreators = maxLeads && relevantCreators.length > maxLeads
      ? relevantCreators.slice(0, maxLeads)
      : relevantCreators;
    const requestedCount = typeof maxLeads === "number" && maxLeads > 0 ? maxLeads : 20;

    return NextResponse.json({
      success: true,
      total_found: cappedCreators.length,
      creators: cappedCreators,
      platform: platform,
      keywords: keywordData.keywords,
      niche: keywordData.niche,
      business_context_applied: Boolean(businessContext),
      quality_gate: { input_count: Array.isArray(searchData.creators) ? searchData.creators.length : 0, accepted_count: cappedCreators.length, requested_count: requestedCount, fail_closed: relevantCreators.length === 0, message: cappedCreators.length < requestedCount ? `Returned ${cappedCreators.length} of ${requestedCount} requested. Other profiles did not meet the evidence threshold or could not be verified.` : null },
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
