"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) router.replace("/admin/login");
          return;
        }

        const res = await fetch("/api/admin/check-admin", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (cancelled) return;
        if (res.ok) {
          setIsAdmin(true);
        } else if (res.status === 500) {
          const body = await res.json().catch(() => ({}));
          setServerError(body?.error || "Admin check failed (server error)");
        } else {
          router.replace("/admin/login");
        }
      } catch {
        setServerError("Network error — could not verify admin status.");
      }
    };

    check();
    return () => { cancelled = true; };
  }, [router]);

  if (serverError) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-800/80 rounded-2xl p-8 max-w-md border border-red-800/50">
          <h2 className="text-xl font-bold text-red-400 mb-2">Admin check failed</h2>
          <p className="text-gray-400 text-sm mb-4">{serverError}</p>
          <p className="text-gray-500 text-xs">Check Vercel env vars (SUPABASE_SERVICE_ROLE_KEY) and production database. See Vercel Function logs for details.</p>
          <button onClick={() => { setServerError(null); setIsAdmin(null); }} className="mt-4 text-sm text-blue-400 hover:text-blue-300">Retry</button>
        </div>
      </div>
    );
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-gray-300 dark:border-gray-700 border-t-black dark:border-t-white" />
      </div>
    );
  }

  return <>{children}</>;
}