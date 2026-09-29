"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { CONSENT_COOKIE_NAME, CONSENT_POLICY_VERSION, necessaryOnly, parseConsent, type ConsentChoices } from "@/lib/consent";

function saveCookie(record: { version: string; timestamp: string; choices: ConsentChoices }) {
  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(record))}; Max-Age=15552000; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

async function syncConsent(record: unknown) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const response = await fetch("/api/account/consent", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(record) });
    if (!response.ok) console.error("Consent record could not be synchronized", response.status);
  } catch (error) { console.error("Consent record could not be synchronized", error); }
}

export default function CookieConsent() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [choices, setChoices] = useState<ConsentChoices>(necessaryOnly);

  useEffect(() => {
    let rawCookie = "";
    try { rawCookie = decodeURIComponent(document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${CONSENT_COOKIE_NAME}=`))?.slice(CONSENT_COOKIE_NAME.length + 1) ?? ""); } catch { rawCookie = ""; }
    const stored = parseConsent(rawCookie);
    if (stored) setChoices(stored.choices);
    setOpen(!stored);
    const reopen = () => { setCustomize(true); setOpen(true); };
    window.addEventListener("creata:cookie-settings", reopen);
    return () => window.removeEventListener("creata:cookie-settings", reopen);
  }, []);

  useEffect(() => {
    if (!user) return;
    try {
      const raw = decodeURIComponent(document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${CONSENT_COOKIE_NAME}=`))?.slice(CONSENT_COOKIE_NAME.length + 1) ?? "");
      const existing = parseConsent(raw);
      if (!existing) return;
      void syncConsent(existing);
    } catch { /* Invalid local data is ignored and the banner will request a fresh choice. */ }
  }, [user]);

  function save(next: ConsentChoices) {
    const record = { version: CONSENT_POLICY_VERSION, timestamp: new Date().toISOString(), choices: next };
    setChoices(next);
    saveCookie(record);
    if (user) void syncConsent(record);
    setOpen(false);
  }

  if (!open) return null;
  return (
    <aside role="dialog" aria-modal="false" aria-labelledby="cookie-title" aria-describedby="cookie-description" className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl">
      <h2 id="cookie-title" className="text-lg font-semibold">Your cookie choices</h2>
      <p id="cookie-description" className="mt-2 text-sm text-slate-600">Necessary storage keeps the service working. Optional cookies are off unless you choose them. Read our <a className="underline" href="/cookie-policy">Cookie Policy</a>.</p>
      {customize && <fieldset className="mt-4 grid gap-3 sm:grid-cols-2"><legend className="sr-only">Optional cookie categories</legend>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked disabled /> Necessary (always on)</label>
        {(["preferences", "analytics", "marketing"] as const).map((key) => <label key={key} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={choices[key]} onChange={(e) => setChoices((old) => ({ ...old, [key]: e.target.checked }))} /> {key}</label>)}
      </fieldset>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white" onClick={() => save({ necessary: true, preferences: true, analytics: true, marketing: true })}>Accept all</button>
        <button className="rounded-lg border px-4 py-2 text-sm font-medium" onClick={() => save(necessaryOnly)}>Necessary only</button>
        {!customize ? <button className="rounded-lg border px-4 py-2 text-sm font-medium" onClick={() => setCustomize(true)}>Customize</button> : <button className="rounded-lg border px-4 py-2 text-sm font-medium" onClick={() => save({ ...choices, necessary: true })}>Save choices</button>}
      </div>
    </aside>
  );
}
