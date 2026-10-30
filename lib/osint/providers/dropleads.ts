/* ── Dropleads provider — Tier-2b (opt-in, off by default) ───────────────
 * Docs: https://dropleads.readme.io  (base https://prime.dropleads.io)
 * Header: X-API-Key. The /enrich route reveals an email (charged).
 *
 * STATUS: OFF unless DROPLEADS_ENABLE=1. The request payload for /enrich
 * must be confirmed against the live OpenAPI before enabling — the search
 * and count routes are known to hang (curl exit 000), so we only ever call
 * /enrich, and only with an identity we already hold (never a /search).
 *
 * Non-fatal: any error returns empty and never throws.
 * ---------------------------------------------------------------------- */

const DROPLEADS_BASE = "https://prime.dropleads.io";

export interface DropleadsProviderResult {
  email: string | null;
  business: {
    organization: string | null;
    domain: string | null;
    industry: string | null;
    employeeRange: string | null;
    city: string | null;
    country: string | null;
    title: string | null;
    linkedinUrl: string | null;
  } | null;
  errors: string[];
}

export interface DropleadsInput {
  firstName: string | null;
  lastName: string | null;
  knownDomain: string | null;
}

const EMAIL_KEYS = ["email", "work_email", "emailAddress", "email_address"];

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export async function runDropleads(input: DropleadsInput): Promise<DropleadsProviderResult> {
  const errors: string[] = [];
  const key = process.env.DROPLEADS_API_KEY;
  if (!key) return { email: null, business: null, errors: ["dropleads-not-configured"] };
  if (!input.knownDomain && !(input.firstName && input.lastName)) {
    return { email: null, business: null, errors: ["dropleads-needs-identity"] };
  }

  // NOTE: payload shape to be verified against the live OpenAPI before enabling.
  const body = {
    filters: {
      first_name: input.firstName ?? undefined,
      last_name: input.lastName ?? undefined,
      domain: input.knownDomain ?? undefined,
    },
  };

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    const res = await fetch(`${DROPLEADS_BASE}/api/v2/prime-db/leads/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": key },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      errors.push(`dropleads-http-${res.status}`);
      return { email: null, business: null, errors };
    }

    const json = await res.json();
    const row: Record<string, unknown> | null =
      Array.isArray(json) ? json[0] :
      Array.isArray((json as { data?: unknown })?.data) ? (json as { data: Record<string, unknown>[] }).data[0] :
      (json && typeof json === "object" ? (json as Record<string, unknown>) : null);

    if (!row) return { email: null, business: null, errors };

    const email = pick(row, EMAIL_KEYS);
    const business = {
      organization: pick(row, ["company_name", "organizationName", "company"]),
      domain: input.knownDomain,
      industry: pick(row, ["industry", "organizationIndustry"]),
      employeeRange: pick(row, ["employee_count", "employeeRange", "companySize"]),
      city: pick(row, ["city", "location"]),
      country: pick(row, ["country"]),
      title: pick(row, ["job_title", "title", "position"]),
      linkedinUrl: pick(row, ["linkedin_url", "linkedinUrl"]),
    };

    return { email, business, errors };
  } catch (e: unknown) {
    errors.push((e as { name?: string })?.name === "AbortError" ? "dropleads-timeout" : "dropleads-error");
    return { email: null, business: null, errors };
  }
}
