"use client";

/* ── Bio enrichment: transforms raw bio into structured lead profile ── */

type StructuredBio = {
  /** Who this person is (role/title/identity) */
  role: string | null;
  /** What they do — activities, services, primary focus */
  focus: string | null;
  /** Their niche or industry */
  niche: string | null;
  /** What they talk about / create content about */
  content_focus: string | null;
  /** Who their audience is */
  audience: string | null;
  /** A short one-sentence professional summary */
  summary: string | null;
};

const ROLE_PATTERNS: [RegExp, string][] = [
  [/\b(founder|co-founder|ceo|owner)\b/i, "Founder / CEO"],
  [/\b(marketer|growth|sales|gtm)\b/i, "Growth & Marketing"],
  [/\b(coach|consultant|mentor|advisor)\b/i, "Coach / Consultant"],
  [/\b(creator|influencer|content\s*creator|tiktoker|youtuber)\b/i, "Content Creator"],
  [/\b(developer|engineer|programmer|coder|dev)\b/i, "Developer / Engineer"],
  [/\b(designer|artist|photographer|videographer)\b/i, "Creative Professional"],
  [/\b(agency|agencies|freelancer|freelance)\b/i, "Agency / Freelancer"],
  [/\b(investor|vc|venture|angel|trader)\b/i, "Investor / Trader"],
  [/\b(educator|teacher|professor|trainer)\b/i, "Educator"],
  [/\b(student|learner|undergrad)\b/i, "Student"],
  [/\b(doctor|nurse|health|fitness|trainer|therapist)\b/i, "Health & Wellness"],
];

const NICHE_PATTERNS: [RegExp, string][] = [
  [/\b(crypto|web3|blockchain|nft|defi)\b/i, "Crypto & Web3"],
  [/\b(fintech|finance|invest|bank|trading|forex)\b/i, "Finance & Fintech"],
  [/\b(saas|b2b|enterprise|software)\b/i, "B2B SaaS"],
  [/\b(ecommerc|shop|store|product|dropshipping)\b/i, "E-commerce"],
  [/\b(health|wellness|fitness|nutrition|mental)\b/i, "Health & Wellness"],
  [/\b(fashion|beauty|style|makeup|skincare)\b/i, "Fashion & Beauty"],
  [/\b(real\s*estate|property|housing)\b/i, "Real Estate"],
  [/\b(music|musician|band|producer|artist)\b/i, "Music & Entertainment"],
  [/\b(gaming|gamer|esports|streamer)\b/i, "Gaming"],
  [/\b(agency|digital\s*marketing|social\s*media\s*manager)\b/i, "Digital Marketing"],
  [/\b(tech|startup|innovation|ai|machine\s*learning)\b/i, "Tech & Startups"],
  [/\b(food|cooking|chef|recipe|restaurant)\b/i, "Food & Hospitality"],
  [/\b(travel|tourism|wanderlust|nomad)\b/i, "Travel & Lifestyle"],
  [/\b(law|legal|attorney|lawyer)\b/i, "Legal"],
  [/\b(consult\w*|advisory)\b/i, "Consulting"],
];

export function enrichBio(bio: string | null): StructuredBio {
  if (!bio || bio.trim().length < 3) {
    return {
      role: null,
      focus: null,
      niche: null,
      content_focus: null,
      audience: null,
      summary: null,
    };
  }

  const text = bio.trim();

  // Role detection
  let role: string | null = null;
  for (const [pattern, label] of ROLE_PATTERNS) {
    if (pattern.test(text)) {
      role = label;
      break;
    }
  }

  // Niche detection
  let niche: string | null = null;
  for (const [pattern, label] of NICHE_PATTERNS) {
    if (pattern.test(text)) {
      niche = label;
      break;
    }
  }

  // Focus: first sentence or two of the bio
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const focus = sentences.length > 0 ? sentences[0] : null;

  // Content focus: look for keywords about what they create
  const contentKeywords = [
    /\b(content|create|write|blog|video|podcast|post)\b/i,
    /\b(teach|educate|share|help|guide)\b/i,
    /\b(tips|advice|strateg|tactic|hack)\b/i,
    /\b(review|unbox|demo|tutorial)\b/i,
  ];
  let contentFocus = null;
  for (const sentence of sentences.slice(0, 3)) {
    if (contentKeywords.some(k => k.test(sentence))) {
      contentFocus = sentence.length > 60 ? sentence.slice(0, 60) + "..." : sentence;
      break;
    }
  }

  // Audience: look for who they help
  const audiencePatterns = [
    /\b(help|for|support|serve)\s+([^.]+?)(?:\.|!|$)/i,
    /\b(audience|follower|client|customer|subscriber)s?\b/i,
  ];
  let audience: string | null = null;
  for (const s of sentences) {
    for (const pat of audiencePatterns) {
      const m = pat.exec(s);
      if (m) {
        audience = m[0].trim();
        break;
      }
    }
    if (audience) break;
  }

  // Summary: condensed professional bio
  let summary = role || niche || "Professional";
  if (niche && role) {
    summary = `${role} in ${niche}`;
  } else if (role || niche) {
    summary = role || niche || "";
  }
  if (focus) {
    const shortFocus = focus.length > 80 ? focus.slice(0, 80) + "..." : focus;
    summary += `. ${shortFocus}`;
  }

  return {
    role,
    focus,
    niche,
    content_focus: contentFocus,
    audience,
    summary,
  };
}