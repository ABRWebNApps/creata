import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: no token" }, { status: 401 });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return NextResponse.json({ error: "Invalid session: " + (userError?.message || "no user") }, { status: 401 });
    }

    const creator = await request.json();

    // Build insert payload — conditionally include matched_comment/caption
        // (columns may not exist in older DB schemas until migration runs)
        const insertPayload: Record<string, any> = {
          user_id: user.id,
          handle: creator.handle,
          nickname: creator.nickname,
          platform: creator.platform || "tiktok",
          profile_url: creator.profile_url,
          avatar_url: creator.avatar || creator.avatar_url,
          bio: creator.bio,
          bio_link: creator.bioLink || creator.bio_link,
          verified: creator.verified,
          followers: creator.followers,
          engagement_rate: creator.engagement_rate,
          total_likes: creator.total_likes || null,
          video_count: creator.video_count || null,
          email: creator.email || null,
          instagram_handle: creator.instagram_handle || null,
          category_id: creator.category_id || null,
          pain_points: creator.pain_points || [],
        };
        if (creator.matched_comment != null) insertPayload.matched_comment = creator.matched_comment;
        if (creator.matched_caption != null) insertPayload.matched_caption = creator.matched_caption;

        const { data, error } = await adminClient
              .from("saved_leads")
              .insert(insertPayload)
                                                      .select()
                              .single();

                if (error?.code === '23505') {
                                  // Build update payload — conditionally include matched_comment/caption
                                  const updatePayload: Record<string, any> = {
                                    nickname: creator.nickname,
                                    avatar_url: creator.avatar || creator.avatar_url,
                                    bio: creator.bio,
                                    bio_link: creator.bioLink || creator.bio_link,
                                    verified: creator.verified,
                                    followers: creator.followers,
                                    engagement_rate: creator.engagement_rate,
                                    total_likes: creator.total_likes || null,
                                    video_count: creator.video_count || null,
                                    email: creator.email || null,
                                    instagram_handle: creator.instagram_handle || null,
                                    category_id: creator.category_id || null,
                                    pain_points: creator.pain_points || [],
                                  };
                                  if (creator.matched_comment != null) updatePayload.matched_comment = creator.matched_comment;
                                                                    if (creator.matched_caption != null) updatePayload.matched_caption = creator.matched_caption;
                                                    const { data: updateData, error: updateError } = await adminClient
                                                      .from("saved_leads")
                                                      .update(updatePayload)
                                          .eq("user_id", user.id)
                                          .eq("handle", creator.handle)
                                          .select()
                                          .maybeSingle();

      if (updateError) {
        console.error("Update error:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, lead: updateData });
    }

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (error: any) {
    console.error("Save lead error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}