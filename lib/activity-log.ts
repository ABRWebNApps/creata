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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      email: user.email,
      action,
      details,
    });
  } catch (err) {
    // silent — logging should never break the app
    console.warn("logActivity failed:", err);
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