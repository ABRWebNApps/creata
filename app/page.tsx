"use client";

import { useState } from "react";
import { Search, Users, Target, ArrowRight, CheckCircle, Quote, Zap, CreditCard, Bookmark, MessageCircle, Filter, ChevronDown } from "lucide-react";
import ResultsTable from "@/components/ResultsTable";
import Loader from "@/components/Loader";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useSubscription, PLAN_CONFIGS } from "@/lib/subscription-context";
import { logActivity } from "@/lib/activity-log";
import { useRouter } from "next/navigation";
import { CountrySelect } from "@/components/CountrySelect";
import { Button } from "@/components/ui/button";

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
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-border border-t-foreground" />
      </div>
    );
  }

  const currentPlan = PLAN_CONFIGS[subscription?.plan || "free"];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero + Search Section */}
      <section className="relative pt-12 pb-14 sm:pt-24 sm:pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/50 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-muted rounded-full text-sm text-muted-foreground mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live data from TikTok, Instagram, X & LinkedIn
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-4 sm:mb-5">
              Find your next
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                social media lead
              </span>
              <br />
              in seconds, not weeks.
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
              Creata turns any idea into a list of real people who want what you're selling — filtered by platform, niche, and location. No spreadsheets. No manual scrolling. Just leads and customers, ready to find.
            </p>
          </div>

          {/* Credits remaining banner */}
          {user && subscription && subscription.status === "active" && (
            <div className="mb-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>
                You have <strong className="text-foreground">{subscription.creditsRemaining}</strong>{" "}
                {subscription.creditsRemaining === 1 ? "rip" : "rips"} left{" "}
                {subscription.plan === "free" ? (
                  <Link href="/pricing" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                    — tap in for more
                  </Link>
                ) : null}
              </span>
            </div>
          )}

          {/* Blocked/Suspended warning */}
          {user && subscription && subscription.status !== "active" && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-center">
              <p className="text-destructive font-semibold text-lg mb-1">
                {subscription.status === "blocked" ? "🚫 Account Blocked" : "⏸️ Account Suspended"}
              </p>
              <p className="text-destructive/80 text-sm">
                {subscription.status === "blocked"
                  ? "Your account has been blocked. Contact support if you think this is a mistake."
                  : "Your account has been suspended. Contact support to reactivate."}
              </p>
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-4 sm:mb-6">
            {/* Mode Toggle — full-width on mobile, inline on desktop */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSearchMode("leads")}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-sm font-medium rounded-xl transition-all ${
                  searchMode === "leads"
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground border border-input"
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
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground border border-input"
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
                  className="w-full pl-12 pr-4 py-3.5 text-base bg-muted/50 border border-input rounded-xl focus:outline-none focus:border-ring focus:ring-0 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim() || (user ? !subscription?.creditsRemaining : false)}
                className="px-8 py-3.5 text-base font-semibold bg-foreground text-background rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
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

            {/* Filters — always visible on desktop, collapsible on mobile */}
            <div className="sm:hidden mb-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center gap-1.5 w-full py-2 text-sm text-muted-foreground bg-muted/30 border border-input rounded-lg hover:text-foreground transition-colors"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide filters" : `Filters ${minFollowers || maxFollowers ? "· active" : ""}`}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </div>

            <div className={`${showFilters ? "flex" : "hidden"} sm:flex flex-wrap items-center justify-center gap-2`}>
              <div className="inline-flex rounded-lg bg-muted/50 border border-input p-0.5 overflow-x-auto">
                {(["tiktok", "instagram", "x", "linkedin", "facebook"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${
                      platform === p
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "x" ? "X" : p === "facebook" ? "Facebook" : p}
                  </button>
                ))}
              </div>
              <CountrySelect value={tier} onChange={setTier} />

              {/* Follower Range Filter — full-width on mobile */}
              <div className={`flex items-center gap-1.5 bg-muted/50 border border-input rounded-lg px-2.5 py-1 ${showFilters ? "flex-1" : ""}`}>
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

          {/* Example Queries — scrollable horizontally on mobile */}
          {!results && !loading && (
            <div className="flex gap-2 overflow-x-auto flex-nowrap pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:hidden">
              {(searchMode === "leads"
                ? ["Get me crypto leads", "Find fitness influencers", "Healthcare leads", "Tech founders and CEOs"]
                : ["How do I start digital marketing?", "How to start forex trading?", "How do I grow my small business?", "How to make money online in Nigeria?"]
              ).map((example) => (
                <button
                  key={example}
                  onClick={() => setQuery(example)}
                  className="px-4 py-1.5 text-sm text-muted-foreground bg-muted/50 border border-input rounded-lg hover:border-ring hover:text-foreground transition-colors shrink-0"
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
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center">
              <p className="text-destructive text-sm">Error: {error}</p>
            </div>
          )}
          {results && !loading && <ResultsTable data={results} />}
        </section>
      )}

      {!user && (
      <>
      <section className="border-t py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">The problem
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">
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
                    <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-sm leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted/30 rounded-2xl p-8 border">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: "Platforms indexed", value: "4+" },
                  { label: "Avg. discovery time", value: "18s" },
                  { label: "Leads per search", value: "30-100" },
                  { label: "Data freshness", value: "Live" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-3xl sm:text-4xl font-bold text-foreground mb-1">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-16">
            Three clicks to your next lead
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Search, title: "Describe your need", desc: "Type what you're looking for — a niche, a vibe, a location. Our AI understands intent, not just keywords." },
              { icon: Target, title: "AI finds the match", desc: "We scan millions of active profiles across platforms and rank them by relevance, engagement rate, and audience fit." },
              { icon: Bookmark, title: "Save & engage", desc: "Bookmark your best leads, track outreach, and export everything — all from one dashboard." },
            ].map((step) => (
              <div key={step.title} className="p-6 rounded-2xl bg-muted/20 border hover:border-ring/50 transition-colors">
                <div className="w-14 h-14 bg-foreground rounded-xl flex items-center justify-center mx-auto mb-5">
                  <step.icon className="w-7 h-7 text-background" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 text-center">Trusted by brands</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-16 text-center">
            What our users say
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { quote: "Creata cut our lead generation time from two weeks to about 20 seconds. It's honestly insane.", name: "Sarah K.", role: "Brand Marketing, D2C Beauty" },
              { quote: "We used to pay agencies thousands for lists that were outdated the moment we got them. Creata is live and it shows.", name: "Marcus J.", role: "Growth Lead, Fintech" },
              { quote: "The location filter alone is a game-changer. We found local micro-influencers in Lagos in minutes.", name: "Tunde A.", role: "Founder, Web3 Agency" },
            ].map((t) => (
              <div key={t.name} className="p-6 rounded-2xl bg-muted/20 border">
                <Quote className="w-8 h-8 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">
            Ready to find your next lead?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join brands and agencies that have turned lead generation from a chore into a cheat code.
          </p>
          <Link href="/auth/signin">
            <Button size="lg" className="text-base px-8">
              Start searching <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
      </>
      )}

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Creata — AI-native lead generation
          </p>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </main>
  );
}