"use client";

import { useEffect, useState, useRef, useCallback } from "react";

/* ── Sample data ──────────────────────────────────────────── */

const DEMO_ITEMS = [
  {
    handle: "@alexchen",
    platform: "LinkedIn",
    trigger: '"tired of manual invoicing — any tools that actually work?"',
    tag: "High intent",
  },
  {
    handle: "@jordanross",
    platform: "X",
    trigger: '"need a better way to track client projects at scale"',
    tag: "Buying signal",
  },
  {
    handle: "@miriam_k",
    platform: "TikTok",
    trigger: '"anyone recommend an invoicing app for freelancers?"',
    tag: "High intent",
  },
  {
    handle: "@ryantb",
    platform: "Instagram",
    trigger: '"my bookkeeping is a mess, send help"',
    tag: "Buying signal",
  },
  {
    handle: "@sarahp_",
    platform: "LinkedIn",
    trigger: '"looking for a CRM that actually integrates with my stack"',
    tag: "High intent",
  },
  {
    handle: "@davidl_",
    platform: "Facebook",
    trigger: '"recommendations for automations that save time?"',
    tag: "Buying signal",
  },
];

const PLATFORM_COLORS: Record<string, string> = {
  TikTok: "from-pink-500 to-blue-500",
  Instagram: "from-purple-500 to-pink-500",
  X: "from-gray-600 to-gray-900",
  LinkedIn: "from-blue-600 to-blue-800",
  Facebook: "from-blue-600 to-indigo-600",
};

type FeedItem = {
  handle: string;
  platform: string;
  trigger: string;
  tag: string;
  gradient: string;
};

export default function SignalFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const advanceFeed = useCallback(() => {
    setItems(prev => {
      const item: FeedItem = {
        ...DEMO_ITEMS[index % DEMO_ITEMS.length],
        gradient: PLATFORM_COLORS[DEMO_ITEMS[index % DEMO_ITEMS.length].platform] || "from-blue-500 to-purple-500",
      };
      const next = [...prev, item].slice(-3);
      return next;
    });
    setIndex(i => i + 1);
  }, [index]);

  // First batch: show 2 items immediately, then start interval
  useEffect(() => {
    // Quick intro beats
    advanceFeed(); // item 0
    const t1 = setTimeout(advanceFeed, 400);  // item 1
    const t2 = setTimeout(advanceFeed, 900);  // item 2

    // Steady interval
    timerRef.current = setInterval(advanceFeed, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // For reduced motion: show 2 static items, no loop
  const displayItems = reducedMotion ? DEMO_ITEMS.slice(0, 2).map(item => ({
    ...item,
    gradient: PLATFORM_COLORS[item.platform] || "from-blue-500 to-purple-500",
  })) : items;

  return (
    <div
      className="card-shadow rounded-[28px] bg-white overflow-hidden"
      aria-live="off"
      role="presentation"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(3,22,59,0.06)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-live flex-shrink-0" />
          <span className="text-sm font-medium text-[var(--color-ink)] truncate">
            Search: &quot;tired of manual invoicing&quot;
          </span>
        </div>
        <span className="text-[11px] font-medium text-[var(--color-ink-soft)] tracking-wider uppercase flex-shrink-0">
          Live
        </span>
      </div>

      {/* Feed */}
      <div className="px-6 py-5 space-y-3 min-h-[220px]">
        {displayItems.length === 0 ? (
          <>
            {[0, 1, 2].map(i => (
              <div key={i} className="h-14 bg-[var(--color-paper-tint)] rounded-[10px] animate-pulse" />
            ))}
          </>
        ) : (
          displayItems.map((item, i) => (
            <div
              key={`${item.handle}-${i}`}
              className={`flex items-start gap-3 p-3 rounded-[10px] bg-[var(--color-paper-tint)] transition-all duration-500 ${
                i === displayItems.length - 1 && !reducedMotion
                  ? "animate-slide-up"
                  : ""
              }`}
            >
              {/* Avatar initials chip */}
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}
              >
                <span className="text-[11px] font-semibold text-white">
                  {item.handle.slice(1, 3).toUpperCase()}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-[var(--color-ink)]">
                    {item.handle}
                  </span>
                  <span className="text-[11px] text-[var(--color-ink-soft)]">
                    {item.platform}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-ink-soft)] leading-snug truncate font-display italic">
                  {item.trigger}
                </p>
              </div>

              {/* Tag pill */}
              <span className={`inline-flex px-2.5 py-1 text-[10px] font-semibold rounded-full flex-shrink-0 ${
                item.tag === "High intent"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-amber-50 text-amber-700"
              }`}>
                {item.tag}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}