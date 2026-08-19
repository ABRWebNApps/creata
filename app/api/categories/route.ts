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

// GET /api/categories — list user's categories with lead counts
export async function GET(request: NextRequest) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: userError } = await getAuthUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getAdminClient();

    // Get categories with lead count
    const { data: categories, error } = await admin
      .from("lead_categories")
      .select("id, name, description, created_at, user_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get lead counts for each category
    const categoriesWithCounts = await Promise.all(
      (categories || []).map(async (cat) => {
        const { count, error: countError } = await admin
          .from("saved_leads")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("category_id", cat.id);

        return {
          ...cat,
          lead_count: countError ? 0 : (count || 0),
        };
      })
    );

    // Also get uncategorized count
    const { count: uncategorizedCount, error: uncatError } = await admin
      .from("saved_leads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("category_id", null);

    return NextResponse.json({
      success: true,
      categories: categoriesWithCounts,
      uncategorized_count: uncatError ? 0 : (uncategorizedCount || 0),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/categories — create new category
export async function POST(request: NextRequest) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: userError } = await getAuthUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data, error } = await admin
      .from("lead_categories")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || "",
      })
      .select()
      .single();

    if (error?.code === "23505") {
      return NextResponse.json({ error: "Category with this name already exists" }, { status: 409 });
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, category: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/categories — assign category to leads (bulk)
export async function PUT(request: NextRequest) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: userError } = await getAuthUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { lead_ids, category_id } = await request.json();

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json({ error: "lead_ids array is required" }, { status: 400 });
    }

    const admin = getAdminClient();

    // Verify category belongs to user
    if (category_id) {
      const { data: cat } = await admin
        .from("lead_categories")
        .select("id")
        .eq("id", category_id)
        .eq("user_id", user.id)
        .single();

      if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const { error } = await admin
      .from("saved_leads")
      .update({ category_id: category_id || null })
      .eq("user_id", user.id)
      .in("id", lead_ids);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, updated: lead_ids.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/categories — update category name/description
export async function PATCH(request: NextRequest) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: { user }, error: userError } = await getAuthUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { category_id, name, description } = await request.json();
    if (!category_id) return NextResponse.json({ error: "category_id is required" }, { status: 400 });

    const admin = getAdminClient();

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();

    const { data, error } = await admin
      .from("lead_categories")
      .update(updates)
      .eq("id", category_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error?.code === "23505") {
      return NextResponse.json({ error: "Category name already exists" }, { status: 409 });
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, category: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}