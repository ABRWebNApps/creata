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
        const kwController = new AbortController();
        const kwTimeout = setTimeout(() => kwController.abort(), 30000);
        let keywordResponse;
        try {
          keywordResponse = await fetch(
            `${baseUrl}/api/ai/generate-keywords`,
            {
              signal: kwController.signal,
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query, tier, platform, searchMode, businessContext }),
            }
          );
        } catch {
          keywordResponse = null;
        } finally {
          clearTimeout(kwTimeout);
        }

        if (!keywordResponse?.ok) {
          // Fallback: use query as keywords directly
          const fallbackKeywords = [query, `${query} ${tier !== "Global" ? tier : ""}`].filter(Boolean);
          return NextResponse.json({
            success: true, total_found: 0, platform, keywords: fallbackKeywords,
            niche: query, quality_gate: { input_count: 0, accepted_count: 0, requested_count: 0, fail_closed: false,
              message: "Keyword generation timed out — try again or use a broader query." },
          });
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
    const creatorList = Array.isArray(searchData.creators) ? searchData.creators : [];
    const relevantCreators = await filterRelevantLeads(
      keywordData.query_understanding?.target_category || query,
      creatorList,
      businessContext?.offer || "",
      businessContext?.target_regions || [],
      keywordData.query_understanding?.must_be || [],
      keywordData.query_understanding?.must_not_be || [],
      keywordData.query_understanding?.geo_filter || (tier === "Global" ? null : tier),
    );

    // SAFETY NET: if quality filter rejects everything but raw results exist, return them leniently
        // Never return 0 leads when the search actually found profiles — credits burn on every query
        const finalCreators = relevantCreators.length > 0
          ? relevantCreators
          : creatorList.length > 0
            ? creatorList.slice(0, Math.max(5, typeof maxLeads === "number" && maxLeads > 0 ? maxLeads : 20))
            : null;

    // Enforce plan lead cap: slice results to respect maxLeads (free=20, basic=20, pro=30, premium=40)
        const cappedCreators = finalCreators
          ? (maxLeads && finalCreators.length > maxLeads ? finalCreators.slice(0, maxLeads) : finalCreators)
          : null;
        const requestedCount = typeof maxLeads === "number" && maxLeads > 0 ? maxLeads : 20;

        const responsePayload: Record<string, unknown> = {
          success: true,
          total_found: cappedCreators?.length ?? 0,
          platform: platform,
          keywords: keywordData.keywords,
          niche: keywordData.niche,
          business_context_applied: Boolean(businessContext),
          quality_gate: {
            input_count: creatorList.length,
            accepted_count: cappedCreators?.length ?? 0,
            requested_count: requestedCount,
            fail_closed: relevantCreators.length === 0 && creatorList.length > 0,
            message: creatorList.length === 0
              ? "Scanning social platforms for leads matching your query. Results will appear as they meet relevance criteria."
              : relevantCreators.length === 0 && creatorList.length > 0
                ? `Returned ${Math.min(creatorList.length, requestedCount)} leads matching your search. Used broad match — quality filter had no clear signal.`
                : `Returned ${cappedCreators?.length ?? 0} leads matching your search.`,
          },
        };
        if (cappedCreators) responsePayload.creators = cappedCreators;

        return NextResponse.json(responsePayload);
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
