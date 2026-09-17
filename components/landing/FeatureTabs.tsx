"use client";

import { useState } from "react";

const TABS = [
  {
    id: "intent",
    label: "Search by intent",
    headline: "Type what your buyer would say. We find them.",
    body: "Describe the problem your customer has — not the profile you want. 'tired of manual invoicing' returns people who just posted exactly that, across five platforms at once.",
    data: [
      { pip: "🔍", label: "Query match", value: "Semantic + keyword" },
      { pip: "📱", label: "Platforms", value: "TikTok, IG, X, LI, FB" },
      { pip: "⚡", label: "Avg. response", value: "2.4s" },
    ],
  },
  {
    id: "trigger",
    label: "See the trigger",
    headline: "Every lead comes with a reason.",
    body: "Not just a name and a follower count — you see the exact comment, caption, or question that tells you this person is ready to buy. No guesswork.",
    data: [
      { pip: "💬", label: "Trigger text", value: "Original post shown" },
      { pip: "🎯", label: "Intent score", value: "AI-rated" },
      { pip: "📊", label: "Engagement", value: "Comments + likes" },
    ],
  },
  {
    id: "painpoints",
    label: "Analyze pain points",
    headline: "Know what's actually broken before you reach out.",
    body: "Every lead's profile is analyzed to surface their real problems — not just keywords. Creata identifies the pain, assigns severity, and suggests a solution angle so your first message lands.",
    data: [
      { pip: "🧠", label: "Pain extracted", value: "From bio + posts" },
      { pip: "📋", label: "Severity rating", value: "High / Medium / Low" },
      { pip: "💡", label: "Solution angle", value: "Suggested opening" },
    ],
  },
  {
    id: "enrich",
    label: "Enrich in one click",
    headline: "One click from lead to outreach.",
    body: "Pull their email, bio link, and cross-platform handles — automatically. No switching tabs, no copy-paste, no enrichment spreadsheet.",
    data: [
      { pip: "📧", label: "Email found", value: "80%+ match rate" },
      { pip: "🔗", label: "Bio links", value: "Extracted" },
      { pip: "🔄", label: "Cross-platform", value: "Auto-matched" },
    ],
  },
  {
    id: "topup",
    label: "Top up, don't wait",
    headline: "Run out? Buy more in seconds.",
    body: "Credits roll over. No reset, no expiry. Top up when you need more — your pipeline keeps going.",
    data: [
      { pip: "💳", label: "Minimum top-up", value: "$5 / 2 credits" },
      { pip: "📅", label: "Rollover", value: "Unused credits persist" },
      { pip: "⚡", label: "Activation", value: "Instant" },
    ],
  },
];

export default function FeatureTabs() {
  const [active, setActive] = useState(TABS[0].id);

  const panel = TABS.find(t => t.id === active) ?? TABS[0];

  return (
    <section className="py-14 sm:py-28">
      <div className="max-w-[1180px] mx-auto px-[20px] sm:px-8">
        {/* Headline */}
        <div className="mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight text-[var(--color-ink)]">
            Search by intent.
          </h2>
          <p className="text-sm sm:text-lg text-[var(--color-ink-soft)] mt-2 max-w-xl">
            See the trigger. Enrich in one click. Top up, don&apos;t wait.
          </p>
        </div>

        <div className="lg:flex lg:gap-16">
          {/* Tab list — sticky on desktop */}
          <div className="lg:sticky lg:top-28 lg:self-start flex lg:flex-col gap-2 mb-6 lg:mb-0 lg:w-56 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {TABS.map((tab) => {
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={`flex-shrink-0 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-[10px] text-left transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-card"
                      : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-tint)]"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content panel */}
          <div className="flex-1">
            <div
              key={panel.id}
              className="card-shadow rounded-[28px] bg-white p-6 sm:p-10 animate-fade-in"
            >
              <h3 className="text-xl sm:text-3xl font-display font-bold tracking-tight text-[var(--color-ink)] mb-3 sm:mb-4">
                {panel.headline}
              </h3>
              <p className="text-sm sm:text-lg text-[var(--color-ink-soft)] leading-relaxed mb-6 sm:mb-8 max-w-2xl">
                {panel.body}
              </p>

              {/* Mock data view */}
              <div className="rounded-[18px] bg-[var(--color-paper-tint)] p-4 sm:p-5 space-y-2 sm:space-y-3">
                {panel.data.map((row) => (
                  <div
                    key={row.pip}
                    className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 rounded-[10px] bg-white card-shadow"
                  >
                    <span className="text-base sm:text-lg flex-shrink-0">{row.pip}</span>
                    <span className="text-xs sm:text-sm font-medium text-[var(--color-ink)] flex-1">
                      {row.label}
                    </span>
                    <span className="text-xs sm:text-sm text-[var(--color-ink-soft)] font-mono">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}