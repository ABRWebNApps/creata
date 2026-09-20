// ── Filtering: exclude gov/media/news, verify relevance, check pain-point signal ──
// ── Query expansion for Tab B (Search by Intent) ──

/**
 * expandQueryTerms — expands a raw user query into multiple related search terms
 * for Tab B (pain-point/intent search). Uses pattern-based expansion, not LLM calls.
 * Tab A (leads) should NOT use this — it stays literal/categorical.
 *
 * Strategy: expand by generating variant forms of the query:
 * - Problem variants: "[topic] problem", "[topic] help", etc.
 * - Related/intent terms based on common patterns
 * - Gravity: rankings-based synonym expansion for well-known topics
 */
const GRAVITY_TERMS: Record<string, string[]> = {
  menopause: ["menopause symptoms", "hot flashes", "perimenopause", "menopause relief", "menopause treatment", "menopause weight gain", "menopause anxiety", "hormone therapy menopause"],
  "forex trading": ["forex for beginners", "forex tips", "forex strategy", "how to trade forex", "forex signals", "forex broker", "forex education", "currency trading"],
  "digital marketing": ["digital marketing strategy", "social media marketing", "content marketing", "SEO tips", "marketing automation", "lead generation", "email marketing", "Facebook ads"],
  fitness: ["weight loss tips", "workout routine", "fitness motivation", "muscle building", "fat loss", "home workout", "fitness coach", "nutrition plan"],
  crypto: ["cryptocurrency investment", "Bitcoin trading", "DeFi projects", "NFT tips", "Web3", "crypto wallet", "blockchain technology", "altcoin"],
  startup: ["startup funding", "growth hacking", "product market fit", "startup tips", "VC funding", "bootstrapping", "SaaS growth", "entrepreneur advice"],
  realestate: ["real estate investing", "property investment", "house flipping", "real estate agent", "rental property", "mortgage tips", "real estate market", "home buying"],
  health: ["health tips", "mental health", "wellness routine", "healthy lifestyle", "nutrition advice", "immune support", "health coaching", "natural remedies"],
  healthcare: ["healthcare jobs", "medical career", "nursing tips", "patient care", "clinical research", "medical advice", "healthcare professional", "doctor recommendations"],
  medical: ["medical advice", "treatment options", "symptoms help", "diagnosis help", "medical research", "healthcare tips", "patient support", "clinical trials"],
};

export function expandQueryTerms(query: string, tier: string): string[] {
  const q = query.toLowerCase().trim();

  // Step 1: Check gravity table for well-known topics
  for (const [topic, expansions] of Object.entries(GRAVITY_TERMS)) {
    if (q.includes(topic)) {
      const locationTail = tier && tier !== "Global" ? ` ${tier}` : "";
      return Array.from(new Set(expansions.map(t => t + locationTail))).slice(0, 8);
    }
  }

  // Step 2: Clean the query — strip intent prefixes for cleaner expansion
  const intentPrefixes = /^(how (do |can |to )|what (is |are |does )|where (can |do )|when (should |can )|why (is |do ))(i |you |one |we |they )?/i;
  const cleanQuery = q.replace(intentPrefixes, '').trim() || q;

  const expanded: string[] = [q]; // always include raw query
  const coreTerm = cleanQuery.length > 2 ? cleanQuery : q;

  if (coreTerm.length > 3) {
    // Problem-framing variants
    expanded.push(`${coreTerm} problem`, `${coreTerm} help`, `${coreTerm} advice`, `${coreTerm} tips`, `${coreTerm} solution`);
    // Intent-seeking variants
    expanded.push(`how to ${coreTerm}`, `learn ${coreTerm}`, `${coreTerm} guide`);
    // Community/discussion variants
    expanded.push(`${coreTerm} review`, `${coreTerm} recommendation`, `${coreTerm} experience`);
  }

  // Step 3: Extract significant words from the core term and add shortened variants
  const stopWords = new Set(["how", "to", "do", "i", "a", "an", "the", "in", "of", "for", "and", "with", "my", "get", "me", "start", "find", "make", "need", "want", "what", "is", "are", "was", "can", "does", "have", "has", "its", "it", "on", "be", "or", "but", "not"]);
  const words = coreTerm.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  if (words.length >= 2) {
    expanded.push(words.join(" "));                       // "digital marketing" → "digital marketing"
    if (words.length >= 3) {
      expanded.push(words.slice(0, 2).join(" "));         // "how to start trading" → "start trading"
    }
  }

  // Step 4: Pain-point signal suffix variants
  if (!expanded.some(t => t.includes("struggl") || t.includes("help"))) {
    expanded.push(`${coreTerm} struggling`, `${coreTerm} stuck`, `${coreTerm} need help`);
  }

  // Dedupe and limit
  const unique = Array.from(new Set(expanded.map(t => t.toLowerCase().trim())));
  const locationTail = tier && tier !== "Global" ? ` ${tier}` : "";
  return unique.slice(0, 10).map(t => t + locationTail);
}

// Keywords that signal a non-person/business account irrelevant for lead gen
const EXCLUDED_PROFILE_INDICATORS = [
  /government|govt|official/i,
  /news|breaking|headlines|newsletter|journalism/i,
  /media|tv|radio|broadcast|channel|network/i,
  /ministry|department|agency|administration|authority/i,
  /nonprofit|foundation|\.org/i,
];

const PAIN_POINT_KEYWORDS = [
  "need", "struggl", "pain", "problem", "challeng", "difficult", "hard", "can't",
  "help", "grow", "scale", "grow", "improve", "fix", "solve", "issue",
  "searching for", "looking for", "finding", "stuck", "confus",
  "want to", "trying to", "how do i", "how to", "anyone know",
  "recommend", "advice", "tip", "suggest", "hack",
  "budget", "afford", "expensive", "cost", "pricing",
  "traffic", "engagement", "followers", "reach", "conversion", "sales",
  "lead", "client", "customer", "revenue", "monetize", "income",
];

// Single-pass filter: checks profile type → relevance → pain-point signal
// Returns true if the lead should be INCLUDE, false if it should be EXCLUDED
export function isHighValueLead(
  bio: string | null,
  matchedContent: string | null,
  keywords: string[],
): boolean {
  const textToCheck = [bio || "", matchedContent || ""].filter(Boolean).join(" ");

  // Stage 1: Exclude government/media/news profiles by bio
  if (bio) {
    for (const pattern of EXCLUDED_PROFILE_INDICATORS) {
      if (pattern.test(bio)) return false;
    }
  }

  // Stage 2: Keyword relevance — matched content must contain at least one keyword
  if (matchedContent) {
    const hasKeyword = keywords.some((kw) => {
      const fragments = kw.toLowerCase().split(/\s+/);
      return fragments.some((frag) => matchedContent!.toLowerCase().includes(frag));
    });
    if (!hasKeyword) return false;
  }

  // Stage 3: Pain-point signal — bio or matched content shows genuine need/struggle
  if (textToCheck) {
    const hasPainSignal = PAIN_POINT_KEYWORDS.some((kw) =>
      textToCheck.toLowerCase().includes(kw.toLowerCase())
    );
    if (!hasPainSignal) return false;
  }

  return true;
}

export function suggestPainPoints(bio: string | null): string[] {
  if (!bio) return [
    "Needs scalable systems for audience growth and engagement",
    "Looking for strategic partnerships and monetization opportunities",
    "Time management — busy with content creation and operations",
  ];
  const text = bio.toLowerCase();
  const points: string[] = [];
  const phrase = (keywords: string[], label: string): string => {
    const sents = bio.split(/[.!\n]/).map(s => s.trim()).filter(Boolean);
    for (const s of sents) {
      const lower = s.toLowerCase();
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          const snippet = s.slice(0, 50).trim();
          return `Bio flags as ${label}: "${snippet}"`;
        }
      }
    }
    return `Bio signals ${label} focus`;
  };

  if (text.includes("market") || text.includes("brand") || text.includes("growth") || text.includes("scale"))
    points.push(phrase(["market", "brand", "growth"], "growth/marketing"));
  if (text.includes("financ") || text.includes("invest") || text.includes("wealth") || text.includes("money"))
    points.push(phrase(["financ", "invest", "wealth"], "finance/investing"));
  if (text.includes("tech") || text.includes("startup") || text.includes("founder") || text.includes("saas"))
    points.push(phrase(["tech", "startup", "founder"], "tech/startup"));
  if (text.includes("health") || text.includes("wellness") || text.includes("fitness") || text.includes("nutrition"))
    points.push(phrase(["health", "wellness", "fitness"], "health/wellness"));
  if (text.includes("career") || text.includes("job") || text.includes("hire") || text.includes("recruit"))
    points.push(phrase(["career", "job", "hire"], "career/hiring"));
  if (text.includes("content") || text.includes("social") || text.includes("influencer"))
    points.push(phrase(["content", "social", "influencer"], "content creation"));
  if (text.includes("coach") || text.includes("consult") || text.includes("mentor"))
    points.push(phrase(["coach", "consult", "mentor"], "coaching/consulting"));
  if (text.includes("b2b") || text.includes("enterprise") || text.includes("ceo"))
    points.push(phrase(["b2b", "enterprise"], "B2B/enterprise"));
  if (text.includes("product") || text.includes("ecommerc") || text.includes("shop") || text.includes("store"))
    points.push(phrase(["product", "ecommerc", "shop"], "e-commerce/products"));
  if (text.includes("art") || text.includes("creator") || text.includes("musician") || text.includes("design"))
    points.push(phrase(["art", "creator", "musician"], "creative/artistic"));

  if (points.length < 2) {
    const firstLine = bio.split(/[.!]/).map(s => s.trim()).filter(Boolean)[0] || '';
    if (firstLine) points.push(`Bio opens with: "${firstLine.slice(0, 40)}" — may need growth strategy`);
  }
  if (points.length < 3) points.push("Looking for strategic partnerships and monetization opportunities");
  return points.slice(0, 3);
}