"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Target, Users, TrendingUp, ArrowRight, CheckCircle } from "lucide-react";

const slides = [
  {
    id: "leads",
    label: "Find Leads",
    title: "Stop hunting. Start converting.",
    subtitle: "Every lead is pre-qualified by AI — not by guesswork.",
    points: [
      "Real-time search across 5 major platforms",
      "AI ranks leads by buying intent & fit score",
      "Filter by niche, location, and follower range",
    ],
    stat: "30-100",
    statLabel: "qualified leads per search",
    gradient: "from-blue-600 to-indigo-700",
    accent: "bg-blue-50 text-blue-700",
    icon: Target,
  },
  {
    id: "analyze",
    label: "Analyze Pain Points",
    title: "Know what they need before you pitch.",
    subtitle: "Understand their struggles. Speak their language. Close faster.",
    points: [
      "AI analyzes bios for pain points and intent signals",
      "Get ready-to-use outreach angles for each lead",
      "Severity scoring — prioritize high-intent prospects",
    ],
    stat: "3x",
    statLabel: "higher reply rates with pain-point targeting",
    gradient: "from-emerald-500 to-teal-600",
    accent: "bg-emerald-50 text-emerald-700",
    icon: TrendingUp,
  },
  {
    id: "convert",
    label: "Close Deals",
    title: "From discovery to deal in one platform.",
    subtitle: "No spreadsheets. No juggling tabs. Your entire pipeline, centralized.",
    points: [
      "Save & organize leads into custom categories",
      "Track outreach status with built-in notes",
      "Export clean data for your CRM or email tool",
    ],
    stat: "85%",
    statLabel: "of users close a deal in their first week",
    gradient: "from-violet-500 to-purple-700",
    accent: "bg-violet-50 text-violet-700",
    icon: Users,
  },
];

export default function CurtainSection() {
  const [active, setActive] = useState("leads");

  const current = slides.find((s) => s.id === active)!;

  return (
    <section className="py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10 text-center">
        <p className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-3">
          How Creata converts
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
          Three steps. One pipeline.
        </h2>
        <p className="text-muted-foreground text-lg max-w-lg mx-auto">
          From raw social media to closed deal — here's how the best GTM teams use Creata.
        </p>
      </div>

      {/* Tab Buttons */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-8">
        <div className="flex flex-row items-stretch gap-2 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
          {slides.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex-1 text-center px-3 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                active === s.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Curtain Transition Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative" style={{ minHeight: 360 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 80, clipPath: "inset(0 0 0 100%)" }}
            animate={{ opacity: 1, x: 0, clipPath: "inset(0 0 0 0%)" }}
            exit={{ opacity: 0, x: -80, clipPath: "inset(0 100% 0 0)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            {/* Left — Visual Card */}
            <div className="order-2 md:order-1">
              <div
                className={`rounded-2xl bg-gradient-to-br ${current.gradient} p-6 sm:p-10 text-white shadow-xl`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <current.icon className="w-8 h-8 text-white/80" />
                  <span className="text-sm font-semibold uppercase tracking-wider text-white/70">
                    {current.label}
                  </span>
                </div>
                <p className="text-5xl sm:text-6xl font-bold mb-2">{current.stat}</p>
                <p className="text-white/80 text-sm sm:text-base">{current.statLabel}</p>

                <div className="mt-6 space-y-3">
                  {current.points.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-white/70 flex-shrink-0" />
                      <span className="text-sm text-white/90">{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Description */}
            <div className="order-1 md:order-2">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm">
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                  {current.title}
                </h3>
                <p className="text-gray-500 text-lg mb-6">{current.subtitle}</p>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-800 font-medium">
                    💡 Pro tip:
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {current.id === "leads" &&
                      "Use specific niches like 'fintech founders in Lagos' instead of broad keywords for higher-quality matches."}
                    {current.id === "analyze" &&
                      "Focus on leads with HIGH severity pain points — they're actively looking for solutions and convert fastest."}
                    {current.id === "convert" &&
                      "Create category folders for each campaign stage (e.g. 'To Contact', 'Following Up', 'Closed Won') to track progress visually."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {slides.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`w-2 h-2 rounded-full transition-all ${
                active === s.id
                  ? "bg-blue-600 w-6"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}