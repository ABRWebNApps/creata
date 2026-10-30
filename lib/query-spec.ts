/* ── Query engine — brief → spec → ASK queries ───────────────────────────
 * The old Tab B appended "problem / tips / solution" to the user's words,
 * which is a SOLUTION-query generator. This decodes the brief into a spec and
 * emits only ASKING queries, in many forms of the same niche.
 * Pure functions: no network, no LLM, unit-testable.
 * ---------------------------------------------------------------------- */

export interface QuerySpec {
  audience: "individual" | "business";
  regions: string[];
  verticals: string[];
  intent: "purchase" | "problem";
  exclude: string[];
}

export const TRADE_EXCLUDE = [
  "wholesaler", "wholesale", "retailer", "supplier", "distributor", "dealer",
  "reseller", "bulk", "moq", "b2b", "agency", "manufacturer", "importer",
  "vendor", "shop owner", "store owner",
];

const REGIONS: Record<string, string> = {
  "united states": "United States", "usa": "United States", "u.s.": "United States",
  "united kingdom": "United Kingdom", "uk": "United Kingdom", "u.k.": "United Kingdom",
  canada: "Canada", australia: "Australia", nigeria: "Nigeria", ghana: "Ghana",
  india: "India", germany: "Germany", france: "France", spain: "Spain",
  italy: "Italy", brazil: "Brazil", mexico: "Mexico", "south africa": "South Africa",
  netherlands: "Netherlands", ireland: "Ireland", kenya: "Kenya",
};

/** Problem verbs per niche — the "split the same niche into many questions" map. */
const PROBLEM_VERBS: Record<string, string[]> = {
  "digital marketing": ["grow my business", "get more followers", "get more clients", "get leads", "scale my business", "run ads that work", "build a funnel", "get more traffic"],
  marketing: ["grow my business", "get more customers", "get leads", "scale", "run ads", "get more traffic"],
  "small business": ["grow my small business", "get more customers", "get more sales", "scale", "manage cash flow", "find customers"],
  business: ["grow my business", "get more customers", "get more sales", "scale", "find clients"],
  fitness: ["lose weight", "stay consistent", "get toned", "build muscle", "stop overeating", "get back in shape"],
  health: ["lose weight", "sleep better", "reduce stress", "eat healthier", "stay consistent"],
  crypto: ["start trading", "understand crypto", "make my first trade", "avoid losses", "pick coins"],
  finance: ["save money", "start investing", "build credit", "pay off debt", "grow my savings"],
  realestate: ["buy my first home", "find a good agent", "invest in property", "get approved for a mortgage"],
  ecommerce: ["start selling online", "get more sales", "find products", "run ads for my store"],
  coaching: ["get more clients", "fill my program", "price my offer", "get consistent bookings"],
  software: ["find developers", "build an app", "hire a team", "ship faster", "reduce costs"],
  tech: ["learn to code", "break into tech", "get my first dev job", "keep up with AI"],
};

const PURCHASE_HINT = /\b(buy|purchase|affordable|cheap|recommendations?|worth it|price|deal|shop|order)\b/i;
const PROBLEM_HINT = /\b(struggl|stuck|help|how do i|how can i|problem|grow|scale|fix|improve|learn|start|need)\b/i;

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Split a vertical list out of a brief: "buy X, Y and Z online" → [X, Y, Z]. */
function extractVerticals(input: string): string[] {
  const m = input.match(/\b(?:buy|purchas\w*|for|shopping for|looking for|need)\b([^.]{0,220})/i);
  const chunk = (m?.[1] || "").replace(/\bonline\b|\bin stores?\b|\bproducts?\b/gi, " ");
  const parts = chunk
    // comma/or/& separate a list; "and" is kept INSIDE an item so
    // "home and kitchen products" stays one vertical instead of "home".
    .split(/,| or |&|\/|\+/i)
    .map((s) => s.trim().replace(/^(and|or|&)\s+/i, "").replace(/^the\s+|^a\s+|^an\s+/i, "").replace(/[.!?]+$/, ""))
    .filter((s) => s.length > 2 && s.split(/\s+/).length <= 4);
  return Array.from(new Set(parts)).slice(0, 8);
}

/**
 * Decode ANY input — a short niche ("digital marketing") or a long brief
 * (the electronics paragraph) — into the same spec shape. Verbosity, audience
 * framing and region sentences are DISCARDED; they never reach a platform.
 */
export function decodeBrief(input: string, tier?: string | null): QuerySpec {
  const raw = (input || "").trim();
  const q = raw.toLowerCase();

  const regions = Array.from(new Set(
    Object.entries(REGIONS).filter(([k]) => q.includes(k)).map(([, v]) => v)
  ));
  if (regions.length === 0 && tier && tier !== "Global") regions.push(tier);

  const audience: QuerySpec["audience"] =
    /\b(wholesaler|retailer|business|b2b|company|agency)\b/i.test(raw) &&
    !/\bindividual|consumer|customer|people\b/i.test(raw) ? "business" : "individual";

  const intent: QuerySpec["intent"] =
    PURCHASE_HINT.test(raw) && !PROBLEM_HINT.test(raw) ? "purchase" : "problem";

  let verticals = extractVerticals(raw);
  if (verticals.length === 0) {
    // short niche: strip the asking/framing words and keep the noun phrase
    const cleaned = q
      .replace(/\b(i|we|you|how|do|can|to|the|a|an|for|of|in|on|with|my|our|get|me|find|need|want|looking|help|start|struggling|about|and|or)\b/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/).filter((w) => w.length > 2);
    verticals = [cleaned.join(" ").trim() || q];
  }
  return { audience, regions, verticals: verticals.filter(Boolean), intent, exclude: TRADE_EXCLUDE };
}

const PROBLEM_FORMS: ((x: string) => string)[] = [
  (x) => `how do i ${x}?`,
  (x) => `how can i ${x}?`,
  (x) => `anyone know how to ${x}?`,
  (x) => `struggling to ${x}`,
  (x) => `need help to ${x}`,
  (x) => `i am trying to ${x}`,
];

const PROBLEM_NICHE_FORMS: ((v: string) => string)[] = [
  (v) => `struggling with ${v}`,
  (v) => `need help with ${v}`,
  (v) => `how do i get started with ${v}?`,
  (v) => `anyone else struggling with ${v}?`,
  (v) => `${v} advice?`,
  (v) => `i need help with ${v}`,
];

const PURCHASE_FORMS: ((v: string) => string)[] = [
  (v) => `where can i buy ${v}?`,
  (v) => `is ${v} worth it?`,
  (v) => `${v} recommendations?`,
  (v) => `what is the best ${v}?`,
  (v) => `anyone know a cheap ${v}?`,
  (v) => `looking for affordable ${v}`,
  (v) => `which ${v} should i get?`,
  (v) => `i need help choosing a ${v}`,
];

/** ASK queries only. Never tips/guide/how-to-sell — the user wants askers. */
export function buildAskQueries(spec: QuerySpec, cap = 8): string[] {
  const out: string[] = [];
  const niches = spec.verticals;
  const verbs: string[] = [];
  for (const n of niches) {
    const key = Object.keys(PROBLEM_VERBS).find((k) => n.includes(k) || k.includes(n));
    if (key) verbs.push(...PROBLEM_VERBS[key]);
  }

  if (spec.intent === "purchase") {
    for (const v of niches) for (const f of PURCHASE_FORMS) out.push(f(v));
  } else {
    for (const x of verbs) for (const f of PROBLEM_FORMS) out.push(f(x));
    for (const v of niches) for (const f of PROBLEM_NICHE_FORMS) out.push(f(v));
  }

  // Interleave so one niche never monopolises the first queries.
  const seen = new Set<string>();
  const interleaved: string[] = [];
  for (let i = 0; i < out.length; i++) {
    const pick = out[i];
    if (seen.has(pick)) continue;
    seen.add(pick);
    interleaved.push(pick);
    if (interleaved.length >= cap * 3) break;
  }
  const shuffled: string[] = [];
  for (let i = 0; i < cap && i < interleaved.length; i++) {
    shuffled.push(interleaved[i * 3] ?? interleaved[i]);
  }
  const final = (shuffled.length ? shuffled : interleaved).slice(0, cap);

  const loc = spec.regions[0];
  return final.map((s) => (loc && !s.toLowerCase().includes(loc.toLowerCase()) ? `${s} ${loc}` : s));
}

/** The nouns the demand gate matches on — verticals + verbs, never the question words. */
export function specProductTerms(spec: QuerySpec): string[] {
  const words: string[] = [];
  for (const v of spec.verticals) {
    words.push(v);
    const parts = v.split(/\s+/).filter((w) => w.length > 3);
    if (parts.length > 1) words.push(parts.slice(-2).join(" "));
  }
  for (const x of Object.keys(PROBLEM_VERBS)) if (spec.verticals.some((v) => v.includes(x))) words.push(...PROBLEM_VERBS[x]);
  return Array.from(new Set(words.map((w) => w.toLowerCase().trim()))).filter(Boolean).slice(0, 12);
}
