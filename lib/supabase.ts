import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Server-side admin client (bypasses RLS — use only in route handlers)
// Logs a loud warning on startup if SUPABASE_SERVICE_ROLE_KEY is missing,
// then falls back to the anon key (RLS applies, queries will be empty).
// The individual route handlers will surface the real error as a 500.
export const supabaseAdmin: SupabaseClient = typeof window === "undefined"
  ? (() => {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!key) {
        console.error(
          "\n⚠️  ⚠️  ⚠️  SUPABASE_SERVICE_ROLE_KEY IS NOT SET ⚠️  ⚠️  ⚠️\n" +
          "The admin Supabase client is falling back to the anon key.\n" +
          "Every server-side admin query (admin check, consent, onboarding,\n" +
          "leads CRUD) will run with RLS active and most will return empty\n" +
          "or produce 500 errors.\n" +
          "Set SUPABASE_SERVICE_ROLE_KEY in Vercel Production dashboard,\n" +
          "then redeploy.\n"
        );
      }
      return createClient(
        supabaseUrl,
        key || supabaseKey,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
    })()
  : (null as unknown as SupabaseClient);

// Types for our database
export type SavedLead = {
  id: string;
  handle: string;
  nickname: string;
  platform: string;
  profile_url: string;
  avatar_url: string | null;
  bio: string | null;
  bio_link: string | null;
  verified: boolean;
  followers: number;
  engagement_rate: number;
  total_likes: number | null;
  video_count: number | null;
  email: string | null;
  instagram_handle: string | null;
  is_tracked: boolean;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};
