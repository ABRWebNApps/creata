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
import { motion } from "motion/react";
import LandingPage from "@/components/landing/LandingPage";

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
    <>
      {!user ? (
        <LandingPage />
      ) : (
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
                )}
              </>
            );
}