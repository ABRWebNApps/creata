import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { CONSENT_POLICY_VERSION } from "@/lib/consent";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const record = await request.json().catch(() => null);
  const c = record?.choices;
  if (record?.version !== CONSENT_POLICY_VERSION || typeof record?.timestamp !== "string" || !Number.isFinite(Date.parse(record.timestamp)) || !c || c.necessary !== true || [c.preferences, c.analytics, c.marketing].some((v) => typeof v !== "boolean")) {
    return NextResponse.json({ error: "Invalid consent record" }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from("consent_records").upsert({
    user_id: user.id,
    version: CONSENT_POLICY_VERSION,
    consented_at: record.timestamp,
    choices: { necessary: true, preferences: c.preferences, analytics: c.analytics, marketing: c.marketing },
  }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "Consent could not be saved" }, { status: 503 });
  return NextResponse.json({ success: true });
}
