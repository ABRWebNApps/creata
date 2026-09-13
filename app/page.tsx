"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Users, Target, ArrowRight, CheckCircle, Quote, Zap, CreditCard, Bookmark, MessageCircle, Filter, ChevronDown, Sparkles, BarChart3, Globe, Timer, Layers } from "lucide-react";
import ResultsTable from "@/components/ResultsTable";
import Loader from "@/components/Loader";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useSubscription, PLAN_CONFIGS } from "@/lib/subscription-context";
import { logActivity } from "@/lib/activity-log";
import { useRouter } from "next/navigation";
import { CountrySelect } from "@/components/CountrySelect";
import { Button } from "@/components/ui/button";
import InfiniteTestimonials from "@/components/InfiniteTestimonials";
import CurtainSection from "@/components/CurtainSection";
import { motion } from "motion/react";

/* ── Scroll-triggered animation hook (bidirectional — Motion-style) ── */
function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Toggle visible class based on intersection — fires both ways
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        } else {
          entry.target.classList.remove("visible");
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useScrollAnimation();
  const delayClass = delay > 0 ? `delay-${delay}` : "";
  return (
    <div ref={ref} className={`animate-on-scroll ${delayClass} ${className}`}>
      {children}
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("Global");
  const [platform, setPlatform] = useState<"tiktok" | "instagram" | "x" | "linkedin" | "facebook">("tiktok");
  const [searchMode, setSearchMode] = useState<"leads" | "painpoints">("leads");
  const [showFilters, setShowFilters] = useState(false);
  const [minFollowers, setMinFollowers] = useState("");
  const [maxFollowers, setMaxFollowers] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading: subLoading, canSearch, consumeCredit } = useSubscription();
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (!user) {
      router.push("/auth/signin");
      return;
    }

    if (!canSearch()) {
      router.push("/pricing");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          tier,
          platform,
          searchMode,
          minFollowers: minFollowers ? parseInt(minFollowers) : undefined,
          maxFollowers: maxFollowers ? parseInt(maxFollowers) : undefined,
        }),
      });

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setResults(data);

      await consumeCredit();
      logActivity("search", { query, platform, tier, searchMode, total_found: data.total_found });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || subLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center" suppressHydrationWarning>
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-border border-t-blue-600" suppressHydrationWarning />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ── HERO SECTION ── */}
      <section className="relative pt-12 pb-14 sm:pt-24 sm:pb-20 bg-hero-gradient overflow-hidden">
        {/* Decorative gradient blobs */}
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-8">
            {/* Shooting star animation */}
            <div className="relative h-8 mb-6 overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 w-0.5 h-0.5 rounded-full bg-white"
                style={{ boxShadow: "0 0 4px 2px rgba(59,130,246,0.6), 0 0 8px 4px rgba(59,130,246,0.3)" }}
                animate={{
                  x: [0, 400],
                  y: [0, 120],
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1.5, 1.5, 0],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  repeatDelay: 3.5,
                  ease: "easeOut",
                  times: [0, 0.15, 0.6, 1],
                }}
              />
              <motion.div
                className="absolute top-0 left-0 h-px"
                style={{
                  width: 80,
                  background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.8), transparent)",
                }}
                animate={{
                  x: [0, 400],
                  y: [0, 120],
                  opacity: [0, 0.8, 0.8, 0],
                }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  repeatDelay: 3.5,
                  ease: "easeOut",
                  times: [0, 0.15, 0.6, 1],
                }}
              />
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-5">
              Find your next
              <br />
              <span className="gradient-text">
                social media lead
              </span>
              <br />
              in seconds, not weeks.
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
              Creata turns any idea into a pipeline of real people who want what you're selling — filtered by platform, niche, and location. No spreadsheets. No manual scrolling.
            </p>
          </div>

          {/* Credits remaining banner */}
          {user && subscription && subscription.status === "active" && (
            <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-blue-500" />
              <span>
                You have <strong className="text-foreground">{subscription.creditsRemaining}</strong>{" "}
                {subscription.creditsRemaining === 1 ? "credit" : "credits"} left{" "}
                {subscription.plan === "free" ? (
                  <Link href="/pricing" className="text-blue-600 hover:underline font-medium">
                    — upgrade for more
                  </Link>
                ) : null}
              </span>
            </div>
          )}

          {/* Blocked/Suspended warning */}
          {user && subscription && subscription.status !== "active" && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
              <p className="text-red-700 font-semibold text-lg mb-1">
                {subscription.status === "blocked" ? "Account Blocked" : "Account Suspended"}
              </p>
              <p className="text-red-600/80 text-sm">
                {subscription.status === "blocked"
                  ? "Your account has been blocked. Contact support if you think this is a mistake."
                  : "Your account has been suspended. Contact support to reactivate."}
              </p>
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-4 sm:mb-6">
            {/* Mode Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSearchMode("leads")}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-sm font-medium rounded-xl transition-all ${
                  searchMode === "leads"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "bg-white text-muted-foreground hover:text-foreground border border-input shadow-sm"
                }`}
              >
                <Users className="w-4 h-4" />
                Find Leads
              </button>
              <button
                type="button"
                onClick={() => setSearchMode("painpoints")}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-sm font-medium rounded-xl transition-all ${
                  searchMode === "painpoints"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "bg-white text-muted-foreground hover:text-foreground border border-input shadow-sm"
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Search by Pain Points
              </button>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchMode === "leads" ? 'e.g. "Get me crypto leads"' : 'e.g. "How do I start forex trading?"'}
                  className="w-full pl-12 pr-4 py-3.5 text-base bg-white border border-input rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim() || (user ? !subscription?.creditsRemaining : false)}
                className="px-8 py-3.5 text-base font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap shadow-sm shadow-blue-600/20"
              >
                {loading
                  ? "Searching..."
                  : user
                  ? subscription?.status !== "active"
                    ? subscription?.status === "blocked"
                      ? "Account blocked"
                      : "Account suspended"
                    : !subscription?.creditsRemaining
                    ? "Out of rips — upgrade"
                    : searchMode === "painpoints" ? "Analyze" : "Discover"
                  : "Sign in to search"}
              </button>
            </div>

            {/* Filters */}
            <div className="sm:hidden mb-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center gap-1.5 w-full py-2 text-sm text-muted-foreground bg-white border border-input rounded-lg hover:text-foreground transition-colors shadow-sm"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide filters" : `Filters ${minFollowers || maxFollowers ? "· active" : ""}`}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </div>

            <div className={`${showFilters ? "flex" : "hidden"} sm:flex flex-wrap items-center justify-center gap-2`}>
              <div className="inline-flex rounded-lg bg-white border border-input p-0.5 overflow-x-auto shadow-sm">
                {(["tiktok", "instagram", "x", "linkedin", "facebook"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                      platform === p
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "x" ? "X" : p === "facebook" ? "Facebook" : p}
                  </button>
                ))}
              </div>
              <CountrySelect value={tier} onChange={setTier} />

              <div className={`flex items-center gap-1.5 bg-white border border-input rounded-lg px-2.5 py-1 shadow-sm ${showFilters ? "flex-1" : ""}`}>
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  type="number"
                  value={minFollowers}
                  onChange={(e) => setMinFollowers(e.target.value)}
                  placeholder="Min"
                  className="w-16 sm:w-14 bg-transparent text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="0"
                />
                <span className="text-muted-foreground text-xs">—</span>
                <input
                  type="number"
                  value={maxFollowers}
                  onChange={(e) => setMaxFollowers(e.target.value)}
                  placeholder="Max"
                  className="w-16 sm:w-14 bg-transparent text-sm text-foreground placeholder:text-muted-foreground border-0 outline-none p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="0"
                />
              </div>
            </div>
          </form>

          {/* Example Queries */}
          {!results && !loading && (
            <div className="flex gap-2 overflow-x-auto flex-nowrap pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:hidden">
              {(searchMode === "leads"
                ? ["Get me crypto leads", "Find fitness influencers", "Healthcare leads", "Tech founders and CEOs"]
                : ["How do I start digital marketing?", "How to start forex trading?", "How do I grow my small business?", "How to make money online in Nigeria?"]
              ).map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="px-4 py-1.5 text-sm text-muted-foreground bg-white border border-input rounded-lg hover:border-blue-500 hover:text-foreground transition-colors shrink-0 shadow-sm"
                >
                  {example}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Results Section (only when signed in) */}
      {user && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-36">
          {loading && (
            <div className="min-h-[60vh] flex items-center justify-center">
              <Loader />
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-700 text-sm">Error: {error}</p>
            </div>
          )}
          {results && !loading && <ResultsTable data={results} />}
        </section>
      )}

      {!user && (
      <>
      {/* ── VALUE PROPOSITION SECTION ── */}
      <AnimatedSection>
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-3">The problem</p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5 text-foreground">
                  Your next paying customer is scrolling social media right now. You just can't find them.
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8">
                  Real people looking for what you sell are posting every day on TikTok, Instagram, X, and LinkedIn. But finding them manually takes forever — and by the time you do, someone else already got to them.
                </p>
                <div className="space-y-4">
                  {[
                    "Search every major platform at once — TikTok, Instagram, X, LinkedIn, Facebook",
                    "AI finds people who actually match what you offer — not just big follower counts",
                    "Filter by country, platform, and niche so every lead is worth your time",
                    "Save leads and come back anytime — your sales pipeline, built in seconds",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-sm leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-black/[0.06] rounded-2xl p-8 shadow-sm">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { label: "Platforms indexed", value: "5+" },
                    { label: "Avg. discovery time", value: "18s" },
                    { label: "Leads per search", value: "30-100" },
                    { label: "Data freshness", value: "Live" },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="text-3xl sm:text-4xl font-bold text-blue-600 mb-1">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="section-divider max-w-7xl mx-auto" />

      {/* ── HOW IT WORKS ── */}
      <AnimatedSection delay={1}>
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">
              Three clicks to your next lead
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-16">
              From idea to pipeline in under a minute. No setup, no onboarding calls.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: Search, title: "Describe your need", desc: "Type what you're looking for — a niche, a vibe, a location. Our AI understands intent, not just keywords." },
                { icon: Target, title: "AI finds the match", desc: "We scan millions of active profiles across platforms and rank them by relevance, engagement rate, and audience fit." },
                { icon: Bookmark, title: "Save & engage", desc: "Bookmark your best leads, track outreach, and export everything — all from one dashboard." },
              ].map((step, i) => (
                <div key={step.title} className="p-6 rounded-2xl bg-white border border-black/[0.04] hover:border-blue-200 hover:shadow-md transition-all group">
                  <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm shadow-blue-600/20 group-hover:shadow-md group-hover:shadow-blue-600/30 transition-shadow">
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="section-divider max-w-7xl mx-auto" />

      {/* ── CURTAIN TRANSITION — 3 Steps to Convert ── */}
      <CurtainSection />

      <div className="section-divider max-w-7xl mx-auto" />

      {/* ── FEATURES GRID ── */}
      <AnimatedSection delay={2}>
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <p className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-3 text-center">Platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-center text-foreground">
              Everything you need to build pipeline
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto text-center mb-16">
              One platform. Five social networks. Infinite pipeline.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Globe, title: "Multi-platform search", desc: "TikTok, Instagram, X, LinkedIn, Facebook — one query, every platform." },
                { icon: Layers, title: "Smart lead scoring", desc: "AI ranks every profile by relevance, engagement, and audience fit — not just followers." },
                { icon: BarChart3, title: "Pain point analysis", desc: "Search by what people are asking. Find leads who are actively looking for solutions." },
                { icon: Timer, title: "Live data, always fresh", desc: "Results are pulled in real-time. No stale databases, no outdated lists." },
                { icon: Target, title: "Geo-targeted discovery", desc: "Filter by country, region, or city. Find leads where you do business." },
                { icon: Bookmark, title: "Organized pipeline", desc: "Save leads, categorize them, add notes. Your sales workflow, built in seconds." },
              ].map((feat) => (
                <div key={feat.title} className="p-6 rounded-xl bg-white border border-black/[0.04] hover:border-blue-100 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                    <feat.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-base mb-2 text-foreground">{feat.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </AnimatedSection>

      <div className="section-divider max-w-7xl mx-auto" />

      {/* ── TESTIMONIALS — Infinite Marquee ── */}
      <InfiniteTestimonials />

      <div className="section-divider max-w-7xl mx-auto" />

      {/* ── CTA ── */}
      <AnimatedSection delay={4}>
        <section className="py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <div className="p-12 rounded-3xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 shadow-sm">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5 text-foreground">
                Ready to build your pipeline?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
                Join the teams that have turned lead generation from a chore into a cheat code.
              </p>
              <Link href="/auth/signup">
                <Button size="lg" className="text-base px-8 bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20">
                  Start searching <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-4">No credit card required. Free tier to get started.</p>
            </div>
          </div>
        </section>
      </AnimatedSection>
      </>

      )}

      {/* Footer */}
      <footer className="border-t border-black/[0.06] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Creata — AI-native lead generation for GTM teams
          </p>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </main>
  );
}