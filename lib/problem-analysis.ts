/* ── Brand problem analysis — concrete, grounded in the lead's own data ──
 * Not "difficulty converting followers into paying clients". Instead: quote
 * what they wrote and state what is actually broken about the brand.
 * ---------------------------------------------------------------------- */

export interface BrandInput {
  bio?: string | null;
  matched_comment?: string | null;
  matched_caption?: string | null;
  platform?: string | null;
  followers?: number | null;
  engagement_rate?: number | null;
  email?: string | null;
  bioLink?: string | null;
}

function firstSentence(s: string | null | undefined): string {
  if (!s) return "";
  return (s.split(/[.!?\n]+/).map((x) => x.trim()).filter(Boolean)[0] || "").slice(0, 90);
}

/** 3-5 concrete problems found in this lead's brand, each quoting their data. */
export function analyzeBrandProblems(input: BrandInput): string[] {
  const bio = (input.bio || "").trim();
  const comment = (input.matched_comment || "").trim();
  const caption = (input.matched_caption || "").trim();
  const text = [bio, comment, caption].filter(Boolean).join(" ").toLowerCase();
  const problems: string[] = [];

  // 1. What they ASKED — the strongest, most concrete signal.
  if (comment && comment !== caption) {
    problems.push(`Asked in public: "${comment.slice(0, 110)}" — the need is already stated, they are shopping.`);
  }

  // 2. Contact route.
  if (!input.email && !input.bioLink) {
    problems.push(`No email and no website on the ${input.platform || "profile"} profile — outreach only reaches them through DMs.`);
  } else if (!input.email) {
    problems.push("Bio link exists but no email — contact route depends on a form or a DM.");
  }

  // 3. Bio sells a role, not an offer.
  const hasOfferWord = /(shop|store|buy|order|book|hire|services|agency|course|coaching|consult|pricing|offer|available)/i.test(bio);
  if (bio && !hasOfferWord) {
    problems.push(`Bio only states a role/identity ("${firstSentence(bio)}") with nothing for sale — the brand has no offer to buy.`);
  }

  // 4. Audience vs engagement.
  const f = input.followers || 0;
  const e = input.engagement_rate || 0;
  if (f > 0 && e > 0 && e < 1.5) {
    problems.push(`${e}% engagement on ${f.toLocaleString()} followers — the audience is not converting into real demand.`);
  }
  if (f > 0 && f < 1000) {
    problems.push(`Only ${f.toLocaleString()} followers — no audience to sell into yet; needs reach before offers.`);
  }
  if (f > 200000) {
    problems.push(`${f.toLocaleString()} followers — reach is high but DMs are buried; a direct channel is missing.`);
  }

  // 5. Voice: teaching vs asking.
  if (/(here are|here's|\d+ (ways|tips|steps|reasons)|link in bio|follow me|dm me|sign up)/i.test(text) && !comment) {
    problems.push(`Post reads as a solution/tip post ("${firstSentence(caption) || "see post"}") — they are on the SELLING side, not asking.`);
  }

  // 6. Bio signals a specific blocker, in their words.
  const blocker = (bio.match(/[^.!?\n]*(struggl|stuck|no time|overwhelm|hard|difficult|can't|cannot|confus|drop|fell|slow|dead)[^.!?\n]*/i) || [])[0];
  if (blocker) {
    problems.push(`Own words show the blocker: "${blocker.trim().slice(0, 110)}".`);
  }

  if (problems.length === 0) {
    problems.push(`No stated problem in the bio or post — lead matches the topic but shows no visible need yet ("${firstSentence(bio) || "no bio"}").`);
  }
  if (problems.length < 3 && bio) {
    problems.push(`Positioning gap: bio says "${firstSentence(bio)}" with no specific customer named.`);
  }
  if (problems.length < 3) {
    problems.push(`No inbound funnel visible — nothing on the profile catches a ready buyer.`);
  }
  return problems.slice(0, 5);
}
