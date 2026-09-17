"use client";

import { Quote } from "lucide-react";

/* ── Realistic testimonials with avatar faces ── */

const testimonials = [
  {
    quote: "Creata cut our lead generation time from two weeks to about 20 seconds. It's honestly insane.",
    name: "Sarah K.",
    role: "Brand Marketing, D2C Beauty",
    avatar: "SK",
    color: "from-blue-500 to-indigo-600",
  },
  {
    quote: "We used to pay agencies thousands for lists that were outdated the moment we got them. Creata is live and it shows.",
    name: "Marcus J.",
    role: "Growth Lead, Fintech",
    avatar: "MJ",
    color: "from-emerald-500 to-teal-600",
  },
  {
    quote: "The location filter alone is a game-changer. We found local micro-influencers in Lagos in minutes.",
    name: "Tunde A.",
    role: "Founder, Web3 Agency",
    avatar: "TA",
    color: "from-violet-500 to-purple-600",
  },
  {
    quote: "We closed 3 enterprise clients in our first week using Creata. The targeting accuracy is unreal.",
    name: "Amara O.",
    role: "GTM Lead, SaaS",
    avatar: "AO",
    color: "from-rose-500 to-pink-600",
  },
  {
    quote: "I was skeptical until I saw the first search return 47 leads that actually matched our ICP. Instant convert.",
    name: "David I.",
    role: "Sales Director, EdTech",
    avatar: "DI",
    color: "from-amber-500 to-orange-600",
  },
  {
    quote: "No more scrolling for hours. Creata finds the conversations where people are already asking for what we sell.",
    name: "Chioma E.",
    role: "CEO, Digital Agency",
    avatar: "CE",
    color: "from-cyan-500 to-blue-600",
  },
  {
    quote: "We onboarded our entire SDR team in one afternoon. The UI is intuitive and the data quality is exceptional.",
    name: "Femi B.",
    role: "VP Sales, B2B SaaS",
    avatar: "FB",
    color: "from-fuchsia-500 to-pink-600",
  },
  {
    quote: "Creata replaced three different tools in our stack. One subscription, five platforms, infinite pipeline.",
    name: "Zainab K.",
    role: "Operations Lead, E-commerce",
    avatar: "ZK",
    color: "from-lime-500 to-green-600",
  },
];

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <div className="inline-flex flex-col w-[340px] sm:w-[380px] mx-3 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex-shrink-0">
      <div className="flex items-center gap-3 mb-4">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm`}>
          {t.avatar}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
          <p className="text-xs text-gray-500 truncate">{t.role}</p>
        </div>
      </div>
      <Quote className="w-6 h-6 text-blue-100 mb-2" />
      <p className="text-sm text-gray-600 leading-relaxed">
        &ldquo;{t.quote}&rdquo;
      </p>
    </div>
  );
}

export default function InfiniteTestimonials() {
  return (
    <section className="py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-12 text-center">
        <p className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-3">Trusted by GTM teams</p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
          What teams like yours are saying
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          From solo founders to enterprise sales teams — Creata works for everyone.
        </p>
      </div>

      {/* Marquee row 1 — scrolling LEFT (-50%) */}
      <div className="relative mb-6 overflow-hidden w-full mask-edges">
        <div className="marquee-left-track">
          <div className="marquee-left-content">
            {[...testimonials, ...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={`r1-${i}`} t={t} />
            ))}
          </div>
        </div>
      </div>

      {/* Marquee row 2 — scrolling RIGHT (+50%) — visually reversed */}
      <div className="relative overflow-hidden w-full mask-edges">
        <div className="marquee-right-track">
          <div className="marquee-right-content">
            {[...testimonials, ...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={`r2-${i}`} t={t} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}