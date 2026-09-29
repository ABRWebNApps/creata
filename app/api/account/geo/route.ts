import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getPublicClientIp, hashSignupIp, lookupSignupGeo } from "@/lib/geo";

/** Stores a best-effort country/currency snapshot for the authenticated signup; never blocks signup itself. */
export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabaseAdmin.from("user_plans").select("country_code,currency").eq("user_id", user.id).maybeSingle();
  if (existing?.country_code || existing?.currency) return NextResponse.json({ success: true, locked: true });

  const ip = getPublicClientIp(request.headers);
  const geo = await lookupSignupGeo(ip);
  const update: Record<string, string | null> = { country_code: geo.countryCode, currency: geo.currency, geo_source: geo.source };
  if (ip) {
    const ipHash = hashSignupIp(ip);
    if (ipHash) update.signup_ip_hash = ipHash;
  }
  const { error: updateError } = await supabaseAdmin.from("user_plans").update(update).eq("user_id", user.id);
  if (updateError) return NextResponse.json({ error: "Signup location could not be saved" }, { status: 503 });
  return NextResponse.json({ success: true, country_code: geo.countryCode, currency: geo.currency });
}