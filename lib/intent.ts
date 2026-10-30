/* ── Intent / demand detection — the heart of the SIGNAL ─────────────────
 * Creata's core is not "who matched a keyword" but "who, out loud, ASKED for
 * what you sell." The hard part is separating the two kinds of text:
 *
 *   DEMAND  (a person asking)   "how can i burn fat?", "anyone know a good X?"
 *   SOLUTION (someone selling)  "Remove belly fat with this 1 simple move"
 *                               "Want to burn fat while you sleep? Here are 3
 *                                proven ways to optimize your…"
 *
 * Both contain the keyword. Only the first is a buying signal. So a text
 * qualifies as a demand only when it has an ASKING marker AND the product
 * term AND no SELLING marker. It also returns the EXACT sentence.
 * ---------------------------------------------------------------------- */

/** ASKING markers — a person asking for the thing (not offering it). */
const DEMAND_MARKERS: RegExp[] = [
  /\bhow\s+(do|can|should|would|might)\s+(i|we|you)\b/i,
  /\bwhere\s+(can|do|should)\s+(i|we|you)\b/i,
  /\bwhat('s| is| are)\s+the\s+best\b/i,
  /\bwhich\s+(is|are)\s+(the\s+)?best\b/i,
  /\bwhat\s+should\s+(i|we)\b/i,
  /\b(is|are)\s+there\s+(a|an|any|some)\b/i,
  /\bdoes\s+any(one|body)\b/i,
  /\bcan\s+(anyone|someone|somebody)\b/i,
  /\bany(one|body)\s+(know|knows|recommend|recommends|got|have|tried)\b/i,
  /\b(any|some)\s+(good\s+|solid\s+|decent\s+)?(recommendations?|suggestions?|advice|recs?|tips?)\b/i,
  /\brecommend(ations?)?\b/i,
  /\bi\s*(am|'m)\s+(looking|searching|hunting)\s+for\b/i,
  /\blooking\s+for\s+(advice|recommendations?|help|suggestions?|something|a\s+good)\b/i,
  /\bin\s+search\s+of\b/i,
  /\bi\s+need\s+(help|advice|a\s+recommendation|recommendations|some\s+help|to\s+(know|find|learn|understand|buy|get|order))\b/i,
  /\bi\s+want\s+to\s+(know|learn|find|start|get\s+into|understand|buy|get|order|try)\b/i,
  /\bhelp\s+me\s+(find|get|choose|decide|pick|understand|figure)\b/i,
  /\bwhere\s+do\s+(i|we|you)\b/i,
  /\bneed\s+(advice|help|recommendations?|suggestions?)\b/i,
];

/** SELLING markers — someone offering/teaching/promoting, i.e. NOT a buyer. */
const SOLUTION_MARKERS: RegExp[] = [
  /\bhere('s| is| are)\b/i,
  /\b\d+\s+(ways|tips|steps|reasons|things|moves|exercises|hacks|secrets|rules|mistakes|foods|drinks|days|minutes|seconds|signs)\b/i,
  /\b(try|do)\s+(this|these|it)\b/i,
  /\bfollow\s+(me|for|this|us)\b/i,
  /\bwith\s+this\s+(one|simple|proven|easy|quick|secret|single)\b/i,
  /\bproven\s+(ways?|methods?|tips?|results?)\b/i,
  /\blink\s+in\s+bio\b/i,
  /\bdm\s+(me|us)\b/i,
  /\bsign\s+up\b/i,
  /\bcomment\s+.{0,20}(below|to\s+get)\b/i,
  /\bclick\s+(here|the\s+link)\b/i,
  /\b(shop|buy|order)\s+now\b/i,
  /\bstart\s+(today|now|your)\b/i,
  /\bwe\s+(help|teach|show|coach|train)\b/i,
  /\bi\s+(help|teach|coach|show|train)\s+(women|men|people|you|beginners|clients|anyone)\b/i,
  /\b(download|get)\s+(my|our|the)\s+(free\s+)?(guide|ebook|course|program|plan)\b/i,
];

/** Words that add in-market weight (used only for RANKING, never alone). */
const INTENT_WORDS: RegExp[] = [
  /\blooking\b/i, /\bneed\b/i, /\bwant\b/i, /\bseeking\b/i, /\badvice\b/i,
  /\brecommend/i, /\bsuggestion/i, /\bbuy\b/i, /\border\b/i, /\bpurchase\b/i,
  /\bhelp\b/i, /\bkinda\b/i, /\bmaybe\b/i,
];

function splitSentences(text: string): string[] {
  return text.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
}

function mentionedTerms(text: string, productTerms: string[]): string[] {
  const t = text.toLowerCase();
  return productTerms
    .map((p) => p.toLowerCase().trim())
    .filter(Boolean)
    .filter((p) => t.includes(p) || p.split(/\s+/).some((w) => w.length > 2 && t.includes(w)));
}

export function hasDemandMarker(text: string): boolean {
  return DEMAND_MARKERS.some((re) => re.test(text));
}

export function hasSolutionMarker(text: string): boolean {
  return SOLUTION_MARKERS.some((re) => re.test(text));
}

export function hasProductTerm(text: string, productTerms: string[]): boolean {
  return mentionedTerms(text, productTerms).length > 0;
}

/**
 * A genuine demand: an ASKING marker AND the product term AND no SELLING
 * marker. "how can i burn fat?" passes; "burn fat with this 1 move" does not.
 */
export function isDemand(text: string | null | undefined, productTerms: string[]): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;
  if (hasSolutionMarker(t)) return false;
  return hasDemandMarker(t) && hasProductTerm(t, productTerms);
}

/** Intent strength 0-3. 0 if it reads as a seller (not a buyer). */
export function intentScore(text: string | null | undefined, productTerms: string[]): number {
  if (!text) return 0;
  const t = text.trim();
  if (!t) return 0;
  if (hasSolutionMarker(t)) return 0;
  let score = 0;
  if (hasDemandMarker(t)) score += 2;
  if (hasProductTerm(t, productTerms)) score += 1;
  if (INTENT_WORDS.some((re) => re.test(t))) score += 1;
  return Math.min(score, 3);
}

/**
 * Return the EXACT sentence that carries the demand (the comment to show),
 * else null. Falls back to the whole text only when marker + term are split
 * across sentences.
 */
export function extractDemandSnippet(
  text: string | null | undefined,
  productTerms: string[]
): string | null {
  if (!text) return null;
  const t = text.trim();
  if (!t) return null;
  if (hasSolutionMarker(t)) return null;
  for (const s of splitSentences(t)) {
    if (hasDemandMarker(s) && hasProductTerm(s, productTerms) && !hasSolutionMarker(s)) {
      return s.slice(0, 300);
    }
  }
  if (isDemand(t, productTerms)) return t.slice(0, 300);
  return null;
}