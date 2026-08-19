"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
        } else {
          router.replace("/admin/login");
        }
      } catch {
        if (!cancelled) router.replace("/admin/login");
      }
    };

    check();
    return () => { cancelled = true; };
  }, [router]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-gray-300 dark:border-gray-700 border-t-black dark:border-t-white" />
      </div>
    );
  }

  return <>{children}</>;
}