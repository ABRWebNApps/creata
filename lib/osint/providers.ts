/* ── OSINT Tier-2 provider orchestrator ──────────────────────────────────
 * Tier 1 (free, existing): bio regex → own-profile crawl → DDG/Bing →
 *   Firecrawl. Runs first, always, in lib/osint/engine.ts.
 * Tier 2 (paid, this file): fired ONLY when Tier 1 found no email.
 *   a) Apify   — corroborated, verified email + firmographics
 *   b) Dropleads — opt-in fallback (DROPLEADS_ENABLE=1)
 *
 * Both providers are non-fatal and env-gated. With no keys set this is a
 * no-op, so the product behaves exactly as it does today.
 * ---------------------------------------------------------------------- */

import { runApifyLeadActor, sourceProfilesByFilters, type MappedBusiness } from "./providers/apify";
import { runDropleads } from "./providers/dropleads";

/**
 * TWO roles, one actor token — Creata's engine can use both:
 *  - SOURCE  (sourceProfilesByFilters): find PROFILES by ICP filters. The
 *    people whose own content Creata then reads for signal + pain. Stage one.
 *  - ENRICH  (enrichWithProviders): get the contact for the author of a
 *    signal we already hold, after corroboration. Downstream.
 * Re-exported so callers import from one place.
 */
export { sourceProfilesByFilters };
export type { SourceFilters, SourcedProfile } from "./providers/apify";

export interface ProviderEmail {
  email: string;
  source_url: string | null;
  confidence: number;
  verified: boolean;
  source: "apify" | "dropleads";
}

export interface ProviderEnrichResult {
  emails: ProviderEmail[];
  business: MappedBusiness | null;
  provider: "apify" | "dropleads" | null;
  errors: string[];
}

export interface ProviderInput {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  country: string | null;
  knownDomain: string | null;
}

/** Provider-verified emails carry high confidence (corroborated identity). */
const PROVIDER_EMAIL_CONFIDENCE = 88;

export async function enrichWithProviders(input: ProviderInput): Promise<ProviderEnrichResult> {
  const errors: string[] = [];

  // Tier 2a — Apify (primary)
  const apify = await runApifyLeadActor({
    fullName: input.fullName,
    firstName: input.firstName,
    lastName: input.lastName,
    title: input.title,
    country: input.country,
    knownDomain: input.knownDomain,
  });
  errors.push(...apify.errors);

  if (apify.email) {
    return {
      emails: [{ email: apify.email, source_url: apify.sourceUrl, confidence: PROVIDER_EMAIL_CONFIDENCE, verified: true, source: "apify" }],
      business: apify.business,
      provider: "apify",
      errors,
    };
  }

  // Tier 2b — Dropleads (opt-in only)
  if (process.env.DROPLEADS_ENABLE === "1") {
    const dp = await runDropleads({
      firstName: input.firstName,
      lastName: input.lastName,
      knownDomain: input.knownDomain,
    });
    errors.push(...dp.errors);
    if (dp.email) {
      return {
        emails: [{ email: dp.email, source_url: null, confidence: 85, verified: true, source: "dropleads" }],
        business: dp.business,
        provider: "dropleads",
        errors,
      };
    }
  }

  // No provider email — still return any business details Apify surfaced.
  return { emails: [], business: apify.business, provider: null, errors };
}
