/* ── Keyword building + signal filling — one place, used by every route ──
 * Two jobs:
 *   1. Turn whatever the user typed into CORE PRODUCT TERMS (the nouns a
 *      buyer would actually say), so demand detection matches real comments
 *      instead of the whole search phrase.
 *   2. Generate DEMAND-QUESTION keywords (people asking), never solution
 *      keywords ("tips", "guide", "how to sell…").
 * ---------------------------------------------------------------------- */

const NOISE = new Set([
  "how","what","whats","when","where","who","why","which","is","are","was","were",
  "do","does","did","can","could","should","would","will","anyone","anybody",
  "help","me","i","we","you","my","our","your","the","a","an","to","for","of","in",
  "on","with","and","or","best","good","top","find","looking","searching","need",
  "want","get","buy","recommend","recommendations","recommendation","advice","tip",
  "tips","suggestion","suggestions","guide","problem","help","solution","near","me",
  "please","someone","somebody","any","some","that","this","it","about","from",
]);

const TIER_WORDS = new Set([
  "united","states","usa","us","uk","united","kingdom","canada","australia","nigeria",
  "lagos","abuja","india","germany","france","spain","italy","brazil","mexico","global",
  "america","american","british","africa","europe","asia","north","south","city","region",
]);

function cleanWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !NOISE.has(w) && !TIER_WORDS.has(w));
}

/**
 * Core product terms a buyer would say out loud.
 * "how do i grow my small business? United States" →
 *   ["grow small business", "small business", "business", "grow"]
 * Longest first (we match the full phrase before the loose words).
 */
export function buildProductTerms(inputs: (string | null | undefined)[], tier?: string | null): string[] {
  const all: string[] = [];
  for (const raw of inputs) {
    if (!raw) continue;
    let s = String(raw);
    if (tier && tier !== "Global") s = s.split(tier).join(" ");
    all.push(...cleanWords(s));
  }
  // de-dupe, keep order
  const words = Array.from(new Set(all));
  if (words.length === 0) return [];

  const terms: string[] = [];
  if (words.length >= 3) terms.push(words.slice(0, 3).join(" "));
  if (words.length >= 2) terms.push(words.slice(-2).join(" ")); // head noun phrase
  terms.push(words.join(" "));
  for (const w of words) if (w.length > 3) terms.push(w);
  return Array.from(new Set(terms.filter((t) => t.length > 2)));
}

/** The single best core phrase — for display / niche. */
export function corePhrase(inputs: (string | null | undefined)[], tier?: string | null): string {
  const t = buildProductTerms(inputs, tier);
  return t.find((x) => x.includes(" ")) || t[0] || "";
}

import { extractDemandSnippet } from "@/lib/intent";

const VERBAL_FORMS: ((c: string) => string)[] = [
  (c) => `how do i ${c}?`,
  (c) => `how can i ${c}?`,
  (c) => `what is the best way to ${c}?`,
  (c) => `where can i find help to ${c}?`,
  (c) => `anyone know a good way to ${c}?`,
  (c) => `who can help me ${c}?`,
  (c) => `is there a service that can ${c}?`,
  (c) => `${c} recommendations?`,
  (c) => `${c} advice?`,
  (c) => `i need help to ${c}`,
];

const NOUN_FORMS: ((c: string) => string)[] = [
  (c) => `how do i get ${c}?`,
  (c) => `how can i find ${c}?`,
  (c) => `what is the best ${c}?`,
  (c) => `where can i find ${c}?`,
  (c) => `anyone know a good ${c}?`,
  (c) => `who can help me with ${c}?`,
  (c) => `is there a service for ${c}?`,
  (c) => `${c} recommendations?`,
  (c) => `${c} advice?`,
  (c) => `i need help with ${c}`,
];

/**
 * DEMAND-question keywords for Tab B. Every keyword is a question or an
 * explicit ask, so the platform returns people ASKING — not people selling
 * a tip/guide. Includes the user's raw query when it is already a question.
 */
export function demandQuestionKeywords(query: string, tier?: string | null): string[] {
  const loc = tier && tier !== "Global" ? ` ${tier}` : "";
  const core = corePhrase([query], tier);
  const out: string[] = [];
  if (/\?/.test(query)) out.push(query.trim());
  if (core) {
    const verbal = /^(grow|get|find|start|build|scale|learn|improve|increase|fix|attract|convert|sell|rank|hire)\b/.test(core);
    for (const f of (verbal ? VERBAL_FORMS : NOUN_FORMS)) out.push(f(core));
  }
  const dedup = Array.from(new Set(out.map((s) => s.trim()).filter(Boolean)));
  return dedup.slice(0, 8).map((s) => s + loc);
}

/**
 * NEVER return an empty Matched column. Priority for matched_comment:
 *   1. a genuine demand pulled from the comments
 *   2. a genuine demand in the post caption
 *   3. the caption sentence that carries a product term
 *   4. the opening sentence of the caption
 * matched_caption always carries the caption (or the bio when there is none).
 */
export function signalFields(input: {
  comment?: string | null;
  caption?: string | null;
  bio?: string | null;
  productTerms: string[];
}): { matched_comment: string | null; matched_caption: string | null; matched_from: string } {
  const cap = (input.caption || "").trim();
  const bio = (input.bio || "").trim();
  const matched_caption = cap || bio || null;

  let comment = (input.comment || "").trim();
  let from = "comment";
  if (!comment) {
    const d = extractDemandSnippet(cap, input.productTerms) || extractDemandSnippet(bio, input.productTerms);
    if (d) comment = d;
  }
  if (!comment) {
    const src = cap || bio;
    if (src) {
      const sents = src.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
      const withTerm = sents.find((s) => input.productTerms.some((t) => s.toLowerCase().includes(t.split(" ")[0]))) ;
      comment = (withTerm || sents[0] || src).slice(0, 300);
      from = "caption";
    }
  }
  return { matched_comment: comment ? comment.slice(0, 300) : null, matched_caption, matched_from: from };
}
