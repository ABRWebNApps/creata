import { supabase } from "@/lib/supabase";

let cachedToken: string | null = null;

async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  const { data: { session } } = await supabase.auth.getSession();
  cachedToken = session?.access_token ?? null;
  return cachedToken;
}

export async function adminFetch(url: string, options?: RequestInit) {
  const token = await getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return res.json();
}