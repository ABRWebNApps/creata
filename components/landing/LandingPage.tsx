import SignalFeed from "./SignalFeed";
import ChannelMarquee from "./ChannelMarquee";
import StatBar from "./StatBar";
import FeatureTabs from "./FeatureTabs";
import StatementBlock from "./StatementBlock";
import FAQAccordion from "./FAQAccordion";
import FinalCTA from "./FinalCTA";
import LandingFooter from "./LandingFooter";
import InfiniteTestimonials from "@/components/InfiniteTestimonials";

export default function LandingPage() {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Creata",
    url: "https://creata.tech",
    description:
      "Creata is a Lead & Customer Acquisition Platform that searches social media by buying intent and provides pain point analysis to help sales teams convert leads faster.",
    applicationCategory: "Sales Intelligence",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Creata",
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    description:
      "Search TikTok, Instagram, X, LinkedIn and Facebook by what people are actually saying. Creata surfaces buying intent signals and provides pain point analysis to tell sales teams exactly what to say next.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <main>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([orgSchema, appSchema]),
        }}
      />

      {/* ── Hero ── */}
      <section className="relative pt-16 sm:pt-28 pb-10 sm:pb-16 overflow-hidden">
        {/* Soft radial blue glow */}
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-500/4 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-[1180px] mx-auto px-[20px] sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left: staggered headline */}
            <div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold tracking-tight leading-[1.1] text-[var(--color-ink)]">
                <span className="block animate-slide-up" style={{ animationDelay: "0.1s" }}>
                  Most tools find profiles.
                </span>
                <span className="block text-blue-600 mt-1 sm:mt-2 animate-slide-up" style={{ animationDelay: "0.3s" }}>
                  Creata finds the moment
                </span>
                <span className="block mt-1 sm:mt-2 animate-slide-up" style={{ animationDelay: "0.5s" }}>
                  someone was ready to buy.
                </span>
              </h1>

              <p
                className="text-[11px] sm:text-base text-[var(--color-ink-soft)] font-body animate-slide-up mt-1 sm:mt-2"
                style={{ animationDelay: "0.6s" }}
              >
                Lead &amp; Customer Acquisition Platform
              </p>

              <p
                className="text-xs sm:text-base lg:text-lg text-[var(--color-ink-soft)] leading-relaxed mt-3 sm:mt-6 max-w-lg animate-fade-in"
                style={{ animationDelay: "0.7s" }}
              >
                Creata is a <strong>Lead &amp; Customer Acquisition Platform</strong>. Search TikTok, Instagram, X, LinkedIn and Facebook by what people are actually saying — a complaint, a question, a caption — and get the buying signal plus the pain point analysis that tells you what to say next.
              </p>

              <div
                className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2 sm:gap-3 mt-6 sm:mt-8 animate-fade-in"
                style={{ animationDelay: "0.9s" }}
              >
                <a
                  href="/auth/signup"
                  className="inline-flex items-center justify-center px-6 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-[10px] hover:bg-blue-700 transition-colors shadow-card"
                >
                  Start finding buyers
                </a>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold rounded-[10px] text-[var(--color-ink)] hover:bg-[rgba(3,22,59,0.06)] transition-colors"
                >
                  See how it works
                </a>
              </div>

              <p
                className="text-xs text-[var(--color-ink-soft)] mt-4 sm:mt-6 animate-fade-in"
                style={{ animationDelay: "1.1s" }}
              >
                No credit card required. One free credit to start.
              </p>
            </div>

            {/* Right: Signal Feed */}
            <div
              className="animate-scale-in w-full"
              style={{ animationDelay: "0.8s" }}
            >
              <SignalFeed />
            </div>
          </div>
        </div>
      </section>

      {/* ── Channel marquee ── */}
      <ChannelMarquee />

      {/* ── Stat bar ── */}
      <StatBar />

      {/* ── Feature tabs ── */}
      <div id="features">
        <FeatureTabs />
      </div>

      {/* ── Statement block ── */}
      <StatementBlock />

      {/* ── FAQ ── */}
      <div id="faq">
        <FAQAccordion />
      </div>

      {/* ── Testimonials ── */}
      <InfiniteTestimonials />

      {/* ── Final CTA ── */}
      <FinalCTA />

      {/* ── Footer ── */}
      <LandingFooter />
    </main>
  );
}