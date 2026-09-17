"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What actually counts as a \"lead\" here?",
    a: "A real person on TikTok, Instagram, X, LinkedIn, or Facebook who posted something that matches what you're selling. Not a bot. Not a mass-scraped email. Someone who wrote a comment, caption, or question that signals they're in the market.",
  },
  {
    q: "How is this different from a regular scraper?",
    a: "Scrapers collect profiles. Creata collects intent — the actual words people typed that tell you they need your product. You get the context, not just the contact.",
  },
  {
    q: "What happens when I run out of searches?",
    a: "Your credits roll over month to month — nothing resets. You can top up instantly from $5 inside your account. If you're on a paid plan, your credits refill every billing cycle.",
  },
  {
    q: "Does enrichment cost extra?",
    a: "Email finding and data enrichment is included in Pro and Premium plans. Free and Basic plans get search results only. Top-up credits inherit your current plan's features — no hidden upsells per lead.",
  },
];

function FAQPageSchema() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(faqSchema),
      }}
    />
  );
}

export default function FAQAccordion() {
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (q: string) => {
    setOpen(prev => prev === q ? null : q);
  };

  return (
    <section className="py-14 sm:py-28">
      <FAQPageSchema />
      <div className="max-w-[1180px] mx-auto px-[20px] sm:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-4xl font-display font-bold tracking-tight text-[var(--color-ink)] mb-10 sm:mb-12">
            Asked before
          </h2>

          <div className="space-y-2 sm:space-y-3">
            {FAQS.map((faq) => {
              const isOpen = open === faq.q;
              return (
                <div
                  key={faq.q}
                  className="rounded-[18px] bg-[var(--color-paper-tint)] border border-[rgba(3,22,59,0.06)] overflow-hidden"
                >
                  <button
                    onClick={() => toggle(faq.q)}
                    aria-expanded={isOpen}
                    className="flex items-center justify-between w-full px-4 sm:px-6 py-4 sm:py-5 text-left font-display italic text-base sm:text-lg font-semibold text-[var(--color-ink)] hover:text-blue-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span
                      className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-ink-soft)] transition-transform duration-300 ${
                        isOpen ? "rotate-45" : ""
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </span>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="px-4 sm:px-6 pb-5 text-xs sm:text-sm text-[var(--color-ink-soft)] leading-relaxed">
                      {faq.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}