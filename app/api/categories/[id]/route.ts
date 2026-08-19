import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

function getAuthUser(token: string) {
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return authClient.auth.getUser(token);
}

function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// GET /api/categories/[id] — get leads in a category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: userError } = await getAuthUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getAdminClient();

    // Get category
    const { data: category, error: catError } = await admin
      .from("lead_categories")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (catError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Get leads in this category
    const { data: leads, error: leadsError } = await admin
      .from("saved_leads")
      .select("*")
      .eq("user_id", user.id)
      .eq("category_id", id)
      .order("created_at", { ascending: false });

    if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      category,
      leads: leads || [],
      total: (leads || []).length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/categories/[id] — delete category (leads uncategorized, not deleted)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: userError } = await getAuthUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getAdminClient();

    // Unassign leads from this category first (FK ON DELETE SET NULL handles this,
    // but doing it explicitly gives us control)
    await admin
      .from("saved_leads")
      .update({ category_id: null })
      .eq("user_id", user.id)
      .eq("category_id", id);

    // Delete category
    const { error } = await admin
      .from("lead_categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}