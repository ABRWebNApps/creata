import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

/* ── Platform data ─────────────────────────────────────────── */

const PLATFORMS: Record<string, { label: string; description: string; keyword: string; longDesc: string }> = {
  tiktok: {
    label: "TikTok",
    keyword: "find leads on TikTok",
    description:
      "Find leads and buyers on TikTok who are actively asking for what you sell. Creata searches TikTok comments, captions, and video descriptions for buying intent signals — not just follower counts.",
    longDesc:
      "TikTok is the fastest-growing platform for B2B and B2C discovery, but finding real leads in the comment section is impossible to do manually. Creata searches TikTok by intent: type what your buyer would say (like 'need a better invoicing tool') and we return the actual people who posted that comment, their profile details, engagement metrics, and pain point analysis so you know exactly what to say first.",
  },
  instagram: {
    label: "Instagram",
    keyword: "find leads on Instagram",
    description:
      "Find leads and buyers on Instagram who are signaling they need your product. Creata searches Instagram posts, comments, and captions for buying intent — real people, not just profile lists.",
    longDesc:
      "Instagram is where your customers hang out, but digging through comments and DMs for leads takes hours. Creata searches Instagram by what people are actually saying in their posts and comments — complaints, questions, requests for recommendations. Every result comes with the trigger text, profile data, engagement rate, and pain point analysis that tells your sales team the opening line.",
  },
  x: {
    label: "X",
    keyword: "find leads on X",
    description:
      "Find leads and buyers on X (Twitter) who are actively looking for solutions. Creata searches X posts and threads for buying intent signals — real conversations, not bot accounts.",
    longDesc:
      "X is where buyers ask 'does anyone know a tool for...' in real time. Creata surfaces those exact posts — the question, the thread context, and the author's profile. Every lead includes the trigger tweet, bio data, engagement metrics, and AI-powered pain point analysis so you can start the conversation with something relevant, not a cold pitch.",
  },
  linkedin: {
    label: "LinkedIn",
    keyword: "find leads on LinkedIn",
    description:
      "Find B2B leads and decision-makers on LinkedIn who are signaling buying intent. Creata searches LinkedIn posts and comments for pain points and purchase triggers.",
    longDesc:
      "LinkedIn is the #1 B2B lead source, but the signal-to-noise ratio is brutal. Creata cuts through by searching LinkedIn posts and comments for actual buying intent — someone asking for a CRM recommendation, complaining about manual reporting, or looking for an automation tool. Each lead comes with the trigger post, profile details, company info, and pain point analysis with a suggested opening message.",
  },
  facebook: {
    label: "Facebook",
    keyword: "find leads on Facebook",
    description:
      "Find leads and buyers in Facebook groups and public posts who are actively looking for what you sell. Creata searches Facebook for buying intent signals.",
    longDesc:
      "Facebook groups are where niche conversations happen — real people asking for real recommendations. Creata searches Facebook public posts and group discussions for buying intent. Whether someone is asking for 'a simple CRM for solo founders' or 'recommendations for email automation,' Creata surfaces the lead, their profile, engagement data, and pain point analysis so you can reach out with context.",
  },
};

/* ── Generate static params ────────────────────────────────── */

export async function generateStaticParams() {
  return Object.keys(PLATFORMS).map((platform) => ({ platform }));
}

/* ── Per-page metadata ─────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: platform } = await params;
  const p = PLATFORMS[platform];
  if (!p) {
    return { title: "Platform not found — Creata" };
  }
  return {
    title: `${p.label} Lead Generation — Find Buyers on ${p.label} | Creata`,
    description: p.description,
    alternates: { canonical: `/leads/platform/${platform}` },
    openGraph: {
      title: `Find leads on ${p.label} — Creata Lead & Customer Acquisition Platform`,
      description: p.description,
      url: `https://creata-enterprise.vercel.app/leads/platform/${platform}`,
    },
  };
}

/* ── Page component ────────────────────────────────────────── */

export default async function PlatformLeadsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: platform } = await params;
  const p = PLATFORMS[platform];

  if (!p) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Platform not found</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            Return home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">{p.label} leads</span>
        </nav>

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-blue-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Creata
        </Link>

        {/* Hero */}
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-6 text-foreground">
          Find leads on <span className="text-blue-600">{p.label}</span> who are ready to buy
        </h1>

        <p className="text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl">
          {p.longDesc}
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-start gap-3 mb-16">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-[10px] hover:bg-blue-700 transition-colors shadow-card"
          >
            <Sparkles className="w-4 h-4" />
            Start finding {p.label} leads
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center px-6 py-3.5 text-sm font-semibold rounded-[10px] text-[var(--color-ink)] hover:bg-[rgba(3,22,59,0.06)] transition-colors"
          >
            See pricing
          </Link>
        </div>

        {/* Value props */}
        <div className="grid sm:grid-cols-2 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-white border border-black/[0.04] hover:border-blue-100 hover:shadow-sm transition-all">
            <h2 className="text-base font-semibold mb-2 text-foreground">Search by intent, not keywords</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Describe the problem your customer has — Creata finds the exact post, comment, or caption where someone on {p.label} is asking for what you sell.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-black/[0.04] hover:border-blue-100 hover:shadow-sm transition-all">
            <h2 className="text-base font-semibold mb-2 text-foreground">See the trigger</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every lead comes with the exact text that gives them away — the comment, caption, or question that signals they need your product right now.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-black/[0.04] hover:border-blue-100 hover:shadow-sm transition-all">
            <h2 className="text-base font-semibold mb-2 text-foreground">Pain point analysis</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              AI analyzes each lead&apos;s profile to surface what&apos;s actually broken for them, assign severity, and suggest the opening line.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-black/[0.04] hover:border-blue-100 hover:shadow-sm transition-all">
            <h2 className="text-base font-semibold mb-2 text-foreground">Enrich &amp; organize</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              One click pulls email, bio links, and cross-platform handles. Save leads, categorize them, track outreach — all in one place.
            </p>
          </div>
        </div>

        {/* Related platforms */}
        <div className="border-t border-black/[0.06] pt-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            More platforms
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PLATFORMS)
              .filter(([key]) => key !== platform)
              .map(([key, val]) => (
                <Link
                  key={key}
                  href={`/leads/platform/${key}`}
                  className="px-4 py-2 text-sm font-medium bg-[var(--color-paper-tint)] rounded-[10px] text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] hover:bg-blue-50 transition-colors"
                >
                  Find {val.label} leads
                </Link>
              ))}
          </div>
        </div>
      </div>
    </main>
  );
}