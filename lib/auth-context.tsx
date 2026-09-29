"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";
import { logActivity } from "@/lib/activity-log";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any; hasSession: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (_event === "SIGNED_IN" && session?.user.user_metadata?.geo_source === "server") void recordSignupGeo(session.access_token);
    });

    return () => subscription.unsubscribe();
  }, []);

  const recordSignupGeo = async (accessToken?: string) => {
    if (!accessToken) return;
    try {
      const response = await fetch("/api/account/geo", { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) return;
      const result = await response.json();
      if (result.currency === "NGN" || result.currency === "USD") window.dispatchEvent(new CustomEvent("creata:signup-currency", { detail: result.currency }));
    } catch (error) { console.error("Signup currency could not be synchronized", error); }
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { geo_source: "server" },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=%2Fonboarding`,
      },
    });
    if (!error) await recordSignupGeo(data.session?.access_token);
    return { error, hasSession: Boolean(data.session) };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) logActivity("sign_in", { email });
    return { error };
  };

  const signOut = async () => {
    await logActivity("sign_out");
    await supabase.auth.signOut();
    // Force full page reload so middleware catches the redirect
    window.location.href = "/auth/signin";
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
