import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const FIELDS = ["role", "business_type", "industry", "offer", "ideal_customer", "main_goal", "lead_volume", "acquisition_source"] as const;
const MAX_LENGTH = 500;

async function getUser(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : user;
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin.from("onboarding_profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Onboarding profile unavailable" }, { status: 503 });
  return NextResponse.json({ profile: data });
}

export async function PUT(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid profile" }, { status: 400 });
  const values: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = body[field] ?? "";
    if (typeof value !== "string" || value.length > MAX_LENGTH) return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
    values[field] = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  }
  if (!Array.isArray(body.target_regions) || body.target_regions.length > 20 || body.target_regions.some((x: unknown) => typeof x !== "string" || x.length > 80)) {
    return NextResponse.json({ error: "Invalid target regions" }, { status: 400 });
  }
  const profile = { ...values, user_id: user.id, target_regions: body.target_regions.map((x: string) => x.replace(/[\u0000-\u001f\u007f]/g, "").trim()).filter(Boolean), completed_at: body.complete === true ? new Date().toISOString() : null, version: 1, updated_at: new Date().toISOString() };
  const { data, error } = await supabaseAdmin.from("onboarding_profiles").upsert(profile, { onConflict: "user_id" }).select("*").single();
  if (error) return NextResponse.json({ error: "Onboarding profile could not be saved" }, { status: 503 });
  return NextResponse.json({ profile: data });
}
