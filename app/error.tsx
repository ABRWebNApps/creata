"use client";

import { useEffect } from "react";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Unhandled route error", error); }, [error]);
  return <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center"><h1 className="text-2xl font-semibold">This page could not load</h1><p className="mt-3 text-slate-600">Your work is safe. Try again, or return to the home page.</p><div className="mt-6 flex gap-3"><button onClick={() => reset()} className="rounded-lg bg-slate-900 px-4 py-2 text-white">Try again</button><a href="/" className="rounded-lg border px-4 py-2">Home</a></div></main>;
}
