"use client";

export default function CookieSettingsButton() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event("creata:cookie-settings"))} className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">Cookie settings</button>;
}
