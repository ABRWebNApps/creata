import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { enrichLead } from "@/lib/osint/engine";
import { MAX_CRAWL_PER_QUERY } from "@/lib/osint/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

function getAuthUser(token: string) {
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return authClient.auth.getUser(token);
}

// POST /api/osint/enrich — enrich a single lead
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: no token" }, { status: 401 });
    }
    const { data: { user }, error: userError } = await getAuthUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { leadId } = body;
    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
    }

    // 3. Load lead from DB (security: verify ownership)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: lead, error: loadError } = await adminClient
      .from("saved_leads")
      .select("id, handle, nickname, platform, profile_url, bio, user_id")
      .eq("id", leadId)
      .single();

    if (loadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (lead.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Run enrichment
    const result = await enrichLead({
      leadId: lead.id,
      leadNickname: lead.nickname,
      leadHandle: lead.handle,
      leadPlatform: lead.platform,
      leadProfileUrl: lead.profile_url,
      leadBio: lead.bio,
      maxCrawlPerQuery: MAX_CRAWL_PER_QUERY,
    });

    // 5. Return results — surface only real configuration errors, not
    //    expected crawl/search failures (they're silent now in the engine)
    return NextResponse.json({
      success: true,
      data: {
        emails: result.emails,
        phones: result.phones,
        aliases: result.aliases,
        errors: result.errors.slice(0, 3),
        total_errors: result.errors.length,
      },
    });
  } catch (error: any) {
    console.error("Enrich API error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}