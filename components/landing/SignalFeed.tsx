"use client";

import { useEffect, useState, useRef, useCallback } from "react";

/* ── 100+ unique lead entries, no fast repeats ────────────────── */

const ITEMS = [
  { handle: "@alexchen", platform: "LinkedIn", tag: "High intent", trigger: '"Tired of manual invoicing — any tools that actually work?"' },
  { handle: "@jordanross", platform: "X", tag: "Buying signal", trigger: '"Need a better way to track client projects at scale"' },
  { handle: "@miriam_k", platform: "TikTok", tag: "High intent", trigger: '"Anyone recommend an invoicing app for freelancers?"' },
  { handle: "@ryantb", platform: "Instagram", tag: "Buying signal", trigger: '"My bookkeeping is a mess, send help"' },
  { handle: "@sarahp_", platform: "LinkedIn", tag: "High intent", trigger: '"Looking for a CRM that actually integrates with my stack"' },
  { handle: "@davidl_", platform: "Facebook", tag: "Buying signal", trigger: '"Recommendations for automations that save time?"' },
  { handle: "@chloe_m", platform: "TikTok", tag: "High intent", trigger: '"I hate tracking expenses — does anyone use something good?"' },
  { handle: "@marcos_r", platform: "Instagram", tag: "Buying signal", trigger: '"Need a better way to follow up with clients"' },
  { handle: "@zainab_t", platform: "LinkedIn", tag: "High intent", trigger: '"Hate manual reporting — what BI tools do you use?"' },
  { handle: "@emeka_o", platform: "Facebook", tag: "Buying signal", trigger: '"Searching for affordable email marketing software"' },
  { handle: "@lina_zh", platform: "X", tag: "High intent", trigger: '"Looking for a tool to automate my outreach sequence"' },
  { handle: "@tunde_w", platform: "TikTok", tag: "Buying signal", trigger: '"How do you guys manage multiple social accounts?"' },
  { handle: "@amina_k", platform: "LinkedIn", tag: "High intent", trigger: '"Need help with cold email — what tools are people using?"' },
  { handle: "@jake_f", platform: "Instagram", tag: "Buying signal", trigger: '"Anyone know a good tool for scheduling posts?"' },
  { handle: "@nadia_p", platform: "X", tag: "High intent", trigger: '"I waste hours on lead research — is there a faster way?"' },
  { handle: "@femi_a", platform: "Facebook", tag: "Buying signal", trigger: '"Suggestions for a simple CRM for a solo founder?"' },
  { handle: "@kiran_b", platform: "LinkedIn", tag: "High intent", trigger: '"Need pipeline visibility — what does your sales stack look like?"' },
  { handle: "@sophia_w", platform: "TikTok", tag: "Buying signal", trigger: '"Manual prospecting is killing me — any alternatives?"' },
  { handle: "@pablo_g", platform: "Instagram", tag: "High intent", trigger: '"Lost a deal because I followed up too late. Need automation"' },
  { handle: "@grace_ol", platform: "X", tag: "Buying signal", trigger: '"Where do you find B2B leads? I am stuck scraping directories"' },
  { handle: "@mike_t", platform: "LinkedIn", tag: "High intent", trigger: '"Hiring a VA just to research leads — feels inefficient"' },
  { handle: "@isaac_d", platform: "TikTok", tag: "Buying signal", trigger: '"How do you find clients without spending on ads?"' },
  { handle: "@ruth_n", platform: "Facebook", tag: "High intent", trigger: '"Recommend a good tool for outreach automation"' },
  { handle: "@dan_lee", platform: "X", tag: "Buying signal", trigger: '"Trying to scale outbound but data quality is terrible"' },
  { handle: "@tamara_s", platform: "Instagram", tag: "High intent", trigger: '"Switching from manual lists to something automated"' },
  { handle: "@kofi_ba", platform: "LinkedIn", tag: "Buying signal", trigger: '"Anyone using AI to find leads? Want to hear what works"' },
  { handle: "@hannah_j", platform: "TikTok", tag: "High intent", trigger: '"Need a way to find people asking for exactly what I sell"' },
  { handle: "@segun_p", platform: "X", tag: "Buying signal", trigger: '"Cold outreach is not working — what is the alternative?"' },
  { handle: "@laura_m", platform: "LinkedIn", tag: "High intent", trigger: '"Looking for intent-based lead gen — not just contact lists"' },
  { handle: "@yusuf_k", platform: "Facebook", tag: "Buying signal", trigger: '"Built a SaaS but no idea how to find buyers on social"' },
  { handle: "@clara_w", platform: "TikTok", tag: "High intent", trigger: '"How do sales teams find people who actually need their product?"' },
  { handle: "@ravi_p", platform: "Instagram", tag: "Buying signal", trigger: '"Need a lead gen tool that searches by pain point"' },
  { handle: "@nnedi_o", platform: "LinkedIn", tag: "High intent", trigger: '"Tired of low-quality leads from traditional databases"' },
  { handle: "@tom_s", platform: "X", tag: "Buying signal", trigger: '"Anyone know a tool that finds leads by what they post?"' },
  { handle: "@ade_m", platform: "TikTok", tag: "High intent", trigger: '"Manually scanning comments for leads — there must be a tool"' },
  { handle: "@zoe_r", platform: "Facebook", tag: "Buying signal", trigger: '"Is there a way to search X for people asking for recommendations?"' },
  { handle: "@chidi_e", platform: "LinkedIn", tag: "High intent", trigger: '"Building a sales team — need better lead sourcing tools"' },
  { handle: "@maya_h", platform: "Instagram", tag: "Buying signal", trigger: '"How do you find warm leads without spending on ads?"' },
  { handle: "@kwame_g", platform: "X", tag: "High intent", trigger: '"Looking for a tool to find startup founders looking for X"' },
  { handle: "@lisa_b", platform: "TikTok", tag: "Buying signal", trigger: '"Scrolling for leads is not scalable — what do you use?"' },
  { handle: "@james_k", platform: "LinkedIn", tag: "High intent", trigger: '"Need an alternative to Apollo — data is too stale"' },
  { handle: "@faith_w", platform: "Facebook", tag: "Buying signal", trigger: '"How do you find leads without scraping manually?"' },
  { handle: "@oliver_n", platform: "Instagram", tag: "High intent", trigger: '"Trying to automate lead qualification — any tools out there?"' },
  { handle: "@blessing_t", platform: "TikTok", tag: "Buying signal", trigger: '"Need a smarter way to find people who want my service"' },
  { handle: "@sammy_c", platform: "X", tag: "High intent", trigger: '"Looking for a tool that monitors social for buying signals"' },
  { handle: "@ndidi_a", platform: "LinkedIn", tag: "Buying signal", trigger: '"Anyone switched from manual sourcing to AI lead gen?"' },
  { handle: "@vince_m", platform: "TikTok", tag: "High intent", trigger: '"I just want to find people asking for what I sell — is that a tool?"' },
  { handle: "@tess_y", platform: "Facebook", tag: "Buying signal", trigger: '"Need a way to track competitor mentions for leads"' },
  { handle: "@rasheed_b", platform: "Instagram", tag: "High intent", trigger: '"How do sales people find warm leads these days?"' },
  { handle: "@ella_d", platform: "X", tag: "Buying signal", trigger: '"Desperately need a tool that finds intent, not profiles"' },
  { handle: "@kay_j", platform: "LinkedIn", tag: "High intent", trigger: '"Searching for a lead gen tool with real-time alerts"' },
  { handle: "@nwando_e", platform: "TikTok", tag: "Buying signal", trigger: '"Any tool that notifies you when someone posts a need?"' },
  { handle: "@derek_l", platform: "Instagram", tag: "High intent", trigger: '"Building outreach lists manually is exhausting"' },
  { handle: "@amina_s", platform: "Facebook", tag: "Buying signal", trigger: '"What do sales teams use to find leads on TikTok?"' },
  { handle: "@tim_h", platform: "X", tag: "High intent", trigger: '"Need a data enrichment tool that actually works"' },
  { handle: "@fola_o", platform: "LinkedIn", tag: "Buying signal", trigger: '"Researching leads takes too long — how do you speed it up?"' },
  { handle: "@maria_v", platform: "TikTok", tag: "High intent", trigger: '"Suggestions for finding leads in specific industries"' },
  { handle: "@ibrahim_w", platform: "Instagram", tag: "Buying signal", trigger: '"Is there a tool that searches comments for leads?"' },
  { handle: "@carla_p", platform: "LinkedIn", tag: "High intent", trigger: '"Need a platform that finds people based on what they complain about"' },
  { handle: "@tobi_s", platform: "Facebook", tag: "Buying signal", trigger: '"Looking for lead gen that does not feel like spam"' },
  { handle: "@nathan_g", platform: "X", tag: "High intent", trigger: '"How do you find B2B buyers on social media?"' },
  { handle: "@sade_b", platform: "TikTok", tag: "Buying signal", trigger: '"Need a tool that scrapes comments for pain points"' },
  { handle: "@victor_d", platform: "Instagram", tag: "High intent", trigger: '"Tired of buying lists that are full of wrong contacts"' },
  { handle: "@julia_m", platform: "LinkedIn", tag: "Buying signal", trigger: '"Any tool that connects social listening to lead gen?"' },
  { handle: "@kenny_r", platform: "Facebook", tag: "High intent", trigger: '"Searching for a tool that finds leads by intent keywords"' },
  { handle: "@philip_a", platform: "X", tag: "Buying signal", trigger: '"I need a tool that surfaces leads from Instagram comments"' },
  { handle: "@damilola_t", platform: "TikTok", tag: "High intent", trigger: '"How can I find people actively looking for my SaaS?"' },
  { handle: "@linda_k", platform: "LinkedIn", tag: "Buying signal", trigger: '"Looking for tools to improve sales prospecting workflow"' },
  { handle: "@osagie_w", platform: "Instagram", tag: "High intent", trigger: '"Anyone using intent data to prioritize leads?"' },
  { handle: "@nina_c", platform: "X", tag: "Buying signal", trigger: '"Need a better way to identify leads from social conversations"' },
  { handle: "@yemi_j", platform: "TikTok", tag: "High intent", trigger: '"Manual lead research is a bottleneck — what tools fix this?"' },
  { handle: "@tara_m", platform: "Facebook", tag: "Buying signal", trigger: '"How do you find decision makers on LinkedIn efficiently?"' },
  { handle: "@ben_u", platform: "LinkedIn", tag: "High intent", trigger: '"Need a tool that finds leads based on specific triggers"' },
  { handle: "@fiona_s", platform: "Instagram", tag: "Buying signal", trigger: '"Looking for alternatives to manual social selling"' },
  { handle: "@chika_o", platform: "X", tag: "High intent", trigger: '"Want to find leads who posted about needing my product"' },
  { handle: "@peter_d", platform: "TikTok", tag: "Buying signal", trigger: '"Is there a SaaS that finds leads from Facebook groups?"' },
  { handle: "@gloria_n", platform: "LinkedIn", tag: "High intent", trigger: '"Researching intent-based selling tools — what works?"' },
  { handle: "@max_w", platform: "Facebook", tag: "Buying signal", trigger: '"Need to automate my lead sourcing workflow"' },
  { handle: "@adanna_k", platform: "Instagram", tag: "High intent", trigger: '"Hate manual prospecting — looking for a smarter system"' },
  { handle: "@ray_p", platform: "X", tag: "Buying signal", trigger: '"How do sales teams find leads in 2026?"' },
  { handle: "@bisi_a", platform: "TikTok", tag: "High intent", trigger: '"Need a lead gen tool that searches by problem statement"' },
  { handle: "@eve_t", platform: "LinkedIn", tag: "Buying signal", trigger: '"Looking for a platform that finds leads with buying intent"' },
  { handle: "@hans_d", platform: "Facebook", tag: "High intent", trigger: '"Any tool that finds leads without me typing queries?"' },
  { handle: "@mira_w", platform: "X", tag: "Buying signal", trigger: '"Need a tool to discover leads from Twitter/X threads"' },
  { handle: "@dapo_m", platform: "Instagram", tag: "High intent", trigger: '"Switching from manual outreach to data-driven prospecting"' },
  { handle: "@sharon_t", platform: "TikTok", tag: "Buying signal", trigger: '"Tired of scraping — anyone use paid lead gen tools?"' },
  { handle: "@tayo_a", platform: "LinkedIn", tag: "High intent", trigger: '"Need a tool that scores leads by actual buying signals"' },
  { handle: "@zara_k", platform: "Facebook", tag: "Buying signal", trigger: '"How do you find warm leads without a big budget?"' },
  { handle: "@emma_j", platform: "X", tag: "High intent", trigger: '"Searching for a tool that monitors social for pain points"' },
  { handle: "@keziah_r", platform: "Instagram", tag: "Buying signal", trigger: '"I need leads that are actively looking, not just profiles"' },
  { handle: "@olayemi_g", platform: "TikTok", tag: "High intent", trigger: '"How to find startup founders who need my consulting?"' },
  { handle: "@noah_b", platform: "LinkedIn", tag: "Buying signal", trigger: '"Looking for a sales intelligence tool for SMBs"' },
  { handle: "@irene_p", platform: "Facebook", tag: "High intent", trigger: '"Need to find people saying they wish they had X"' },
  { handle: "@seyi_m", platform: "X", tag: "Buying signal", trigger: '"How do you source leads without spending weeks researching?"' },
  { handle: "@lara_o", platform: "Instagram", tag: "High intent", trigger: '"Anyone find a tool that filters leads by engagement rate?"' },
  { handle: "@chisom_n", platform: "TikTok", tag: "Buying signal", trigger: '"Need an automated way to find qualified leads daily"' },
  { handle: "@mark_t", platform: "LinkedIn", tag: "High intent", trigger: '"Evaluating lead gen platforms — recommendations?"' },
  { handle: "@ada_e", platform: "X", tag: "Buying signal", trigger: '"Tired of guessing who might buy — need real intent data"' },
  { handle: "@frank_d", platform: "Facebook", tag: "High intent", trigger: '"How do you build a steady pipeline of inbound leads?"' },
  { handle: "@jennifer_b", platform: "TikTok", tag: "Buying signal", trigger: '"Anyone know a tool that finds leads by what people caption?"' },
  { handle: "@musa_k", platform: "Instagram", tag: "High intent", trigger: '"Need a way to turn social listening into a lead list"' },
];

type FeedItem = {
  handle: string;
  platform: string;
  tag: string;
  trigger: string;
  gradient: string;
  id: number;
  entering: boolean;
};

const PLATFORM_COLORS: Record<string, string> = {
  TikTok: "from-pink-500 to-blue-500",
  Instagram: "from-purple-500 to-pink-500",
  X: "from-gray-600 to-gray-900",
  LinkedIn: "from-blue-600 to-blue-800",
  Facebook: "from-blue-600 to-indigo-600",
};

let nextItemIndex = 0; // sequential walk through ITEMS (never repeats until all consumed)
let feedIdCounter = 0;

function createGradient(platform: string): string {
  return PLATFORM_COLORS[platform] || "from-blue-500 to-purple-500";
}

function nextItem(): FeedItem {
  const src = ITEMS[nextItemIndex % ITEMS.length];
  nextItemIndex++;
  return {
    ...src,
    gradient: createGradient(src.platform),
    id: feedIdCounter++,
    entering: true,
  };
}

/* ── Relative timestamp ──────────────────────────────────── */
function randomTimestamp(): string {
  const mins = Math.floor(Math.random() * 45) + 2;
  return `${mins}m ago`;
}

export default function SignalFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const popInNext = useCallback(() => {
    const fresh = nextItem();
    setItems(prev => {
      // Keep max 3 items; the oldest gets pushed out
      const next = [...prev, fresh].slice(-3);
      return next;
    });
    // After animation, mark as settled
    popTimerRef.current = setTimeout(() => {
      setItems(prev =>
        prev.map(item => ({ ...item, entering: false }))
      );
    }, 350);
  }, []);

  // Initial seed: show 3 items immediately (no animation)
  useEffect(() => {
    const seed: FeedItem[] = [
      { ...nextItem(), entering: false },
      { ...nextItem(), entering: false },
      { ...nextItem(), entering: false },
    ];
    setItems(seed);

    // First pop-in after a beat
    const startTimer = setTimeout(() => {
      popInNext();
      timerRef.current = setInterval(popInNext, 4000);
    }, 2000);

    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      if (popTimerRef.current) clearTimeout(popTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const displayItems = reducedMotion
    ? ITEMS.slice(0, 3).map(src => ({
        ...src,
        gradient: createGradient(src.platform),
        id: -1,
        entering: false,
      }))
    : items;

  return (
    <div
      className="card-shadow rounded-[28px] bg-white overflow-hidden w-full"
      aria-live="off"
      role="presentation"
    >
      {/* Header — value statement */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[rgba(3,22,59,0.06)]">
        <span className="text-xs sm:text-sm font-semibold text-blue-600 tracking-tight">
          Get leads with high buying intent
        </span>
        <span className="text-[10px] sm:text-[11px] text-[var(--color-ink-soft)]">
          Live feed
        </span>
      </div>

      {/* Feed — social comment style */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3 min-h-[200px] sm:min-h-[260px] relative overflow-hidden">
        {displayItems.length === 0 ? (
          <>
            {[0, 1, 2].map(i => (
              <div key={i} className="h-14 sm:h-16 bg-[var(--color-paper-tint)] rounded-[12px] animate-pulse" />
            ))}
          </>
        ) : (
          displayItems.map((item) => (
            <div
              key={item.id}
              className={`
                flex items-start gap-2.5 sm:gap-3 p-3 rounded-[12px] bg-white border border-[rgba(3,22,59,0.04)]
                transition-all duration-[350ms] ease-out
                ${!reducedMotion && item.entering
                  ? "opacity-0 -translate-y-3 scale-[0.97]"
                  : "opacity-100 translate-y-0 scale-100"
                }
              `}
            >
              {/* Avatar circle */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}
              >
                <span className="text-[10px] sm:text-xs font-bold text-white">
                  {item.handle.slice(1, 3).toUpperCase()}
                </span>
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0 space-y-0.5">
                {/* Meta row */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-[var(--color-ink)]">
                    {item.handle}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-[var(--color-ink-soft)]">
                    {item.platform} · {randomTimestamp()}
                  </span>
                </div>
                {/* The quoted trigger — styled like a social comment */}
                <p className="text-xs sm:text-sm text-[var(--color-ink-soft)] leading-snug">
                  {item.trigger}
                </p>
                {/* Tag */}
                <span className={`inline-block mt-1 text-[10px] font-semibold ${
                  item.tag === "High intent"
                    ? "text-blue-600"
                    : "text-amber-600"
                }`}>
                  {item.tag === "High intent" ? "High intent" : "Buying signal"} · intent score {Math.floor(Math.random() * 30 + 70)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}