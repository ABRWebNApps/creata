import { supabase } from "./supabase";

type Action =
  | "sign_in"
  | "sign_out"
  | "search"
  | "save_lead"
  | "export_leads"
  | "subscribe"
  | "admin_action";

export async function logActivity(
  action: Action,
  details: Record<string, unknown> = {}
) {
  try {
    // Grab the current session token so the server can authenticate us
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    await fetch("/api/activity/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, details }),
    });
  } catch {
    // silent — logging should never break the app
  }
}

export async function logActivityServer(
  userId: string,
  email: string | undefined,
  action: string,
  details: Record<string, unknown> = {},
  ip?: string
) {
  try {
    const { supabaseAdmin } = await import("./supabase");
    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      email: email || null,
      action,
      details,
      ip_address: ip || null,
    });
  } catch {
    // silent
  }
}