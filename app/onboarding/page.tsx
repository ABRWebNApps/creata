"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = { role: string; business_type: string; industry: string; offer: string; ideal_customer: string; target_regions: string[]; main_goal: string; lead_volume: string; acquisition_source: string };
const empty: Profile = { role: "", business_type: "", industry: "", offer: "", ideal_customer: "", target_regions: [], main_goal: "", lead_volume: "", acquisition_source: "" };
const steps = [
  [["role", "Your role"], ["business_type", "Business type"], ["industry", "Industry or niche"]],
  [["offer", "What you sell or offer"], ["ideal_customer", "Ideal customer"], ["target_regions", "Target countries or regions (comma separated)"]],
  [["main_goal", "Main goal"], ["lead_volume", "Monthly lead volume target"], ["acquisition_source", "How did you find Creata?"]],
] as const;

export default function OnboardingPage() {
  const [profile, setProfile] = useState<Profile>(empty);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const router = useRouter();
  useEffect(() => { void (async () => { const { data } = await supabase.auth.getSession(); const token = data.session?.access_token; if (!token) { router.replace("/auth/signin"); return; } const response = await fetch("/api/account/onboarding", { headers: { Authorization: `Bearer ${token}` } }); const result = await response.json(); if (result.profile) { if (result.profile.completed_at) { router.replace("/"); return; } setProfile({ ...empty, ...result.profile }); } setBusy(false); })().catch(() => { setMessage("Could not load your profile."); setBusy(false); }); }, [router]);
  async function save(complete: boolean, advance = false, leave = false) { setBusy(true); setMessage(""); try { const { data } = await supabase.auth.getSession(); const response = await fetch("/api/account/onboarding", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ ...profile, complete }) }); if (!response.ok) throw new Error(); setMessage(complete ? "Profile saved." : "Progress saved."); if (complete || leave) router.push("/account"); else if (advance) setStep((s) => Math.min(2, s + 1)); } catch { setMessage("Could not save your profile. Please try again."); } finally { setBusy(false); } }
  if (busy && !message) return <main className="mx-auto max-w-2xl p-10" aria-busy="true">Loading your profile…</main>;
  return <main className="mx-auto max-w-2xl px-6 py-14"><p className="text-sm text-slate-500">Step {step + 1} of 3 · You can skip and finish later</p><h1 className="mt-2 text-3xl font-bold">Tell us what you’re working on</h1><div className="mt-8 rounded-2xl border bg-white p-6"><div className="space-y-4">{steps[step].map(([field, label]) => { const value = field === "target_regions" ? profile.target_regions.join(", ") : profile[field as keyof Profile] as string; return <label key={field} className="block text-sm font-medium">{label}<textarea maxLength={500} rows={2} value={value} onChange={(e) => setProfile((old) => ({ ...old, [field]: field === "target_regions" ? e.target.value.split(",").map((x) => x.trim()).filter(Boolean) : e.target.value }))} className="mt-2 w-full rounded-xl border p-3" /></label>; })}</div><div className="mt-6 flex flex-wrap gap-3"><button disabled={busy} onClick={() => step < 2 ? save(false, true) : save(true)} className="rounded-lg bg-slate-900 px-4 py-2 text-white">{step < 2 ? "Save and continue" : "Finish"}</button><button disabled={busy} onClick={() => save(false, false, true)} className="rounded-lg border px-4 py-2">Save and skip</button>{step > 0 && <button onClick={() => setStep((s) => Math.max(0, s - 1))} className="rounded-lg px-4 py-2">Back</button>}</div>{message && <p className="mt-4 text-sm" role="status">{message}</p>}</div></main>;
}
