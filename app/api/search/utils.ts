// ── Filtering: exclude gov/media/news, verify relevance, check pain-point signal ──

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