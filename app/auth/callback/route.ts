import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { after, NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPublicClientIp, hashSignupIp, lookupSignupGeo } from "@/lib/geo";
import { safeAuthRedirectPath } from "@/lib/auth-redirect";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectPath = safeAuthRedirectPath(requestUrl.searchParams.get("redirect_to"));

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const signupHeaders = request.headers;
      after(async () => {
        const { data: existing } = await supabaseAdmin.from("user_plans").select("geo_source").eq("user_id", user.id).maybeSingle();
        if (existing?.geo_source) return;
        const ip = getPublicClientIp(signupHeaders);
        const geo = await lookupSignupGeo(ip);
        const update: Record<string, string | null> = { country_code: geo.countryCode, currency: geo.currency, geo_source: geo.source };
        const ipHash = ip ? hashSignupIp(ip) : "";
        if (ipHash) update.signup_ip_hash = ipHash;
        await supabaseAdmin.from("user_plans").update(update).eq("user_id", user.id).is("geo_source", null);
      });
    }
  }

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
