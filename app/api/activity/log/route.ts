import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    let token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;

    if (token) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const body = await request.json();
      const { action, details = {} } = body;
      if (!action) {
        return NextResponse.json({ error: "Missing 'action' field" }, { status: 400 });
      }
      await supabaseAdmin.from("activity_logs").insert({
        user_id: user.id,
        email: user.email,
        action,
        details,
        ip_address: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null,
      });
      return NextResponse.json({ success: true });
    }

    // Try SSR cookies
    const { createServerClient } = await import("@supabase/ssr");
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      }
    );
    const { data: { user: u2 } } = await supabase.auth.getUser();
    if (!u2) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, details = {} } = body;
    if (!action) {
      return NextResponse.json({ error: "Missing 'action' field" }, { status: 400 });
    }
    await supabaseAdmin.from("activity_logs").insert({
      user_id: u2.id,
      email: u2.email,
      action,
      details,
      ip_address: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}