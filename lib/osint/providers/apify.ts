/* ── Apify provider — Tier-2 paid enrichment ─────────────────────────────
 * Runs a lead actor configured via APIFY_LEAD_ACTOR and maps its dataset
 * output DEFENSIVELY (any key that looks like an email / firmographic field),
 * so the actor can be swapped without a code change.
 *
 * SAFETY: a provider email is only ACCEPTED when the returned person can be
 * corroborated against the lead we hold — matching full name, or matching
 * known domain. A search-type actor that returns unrelated people is
 * therefore rejected rather than attaching a stranger's email to a lead.
 *
 * Non-fatal by design: any error returns empty. It never throws and never
 * blocks the free Tier-1 result the route already produced.
 * ---------------------------------------------------------------------- */

const ACTOR_RUN_URL = "https://api.apify.com/v2/acts";
const RUN_SYNC_TIMEOUT_S = 45;

const EMAIL_KEYS = ["email", "workEmail", "work_email", "emailAddress", "email_address", "personalEmail", "contactEmail", "corporateEmail"];
const FIRST_KEYS = ["firstName", "first_name", "firstname"];
const LAST_KEYS = ["lastName", "last_name", "lastname", "surname"];
const TITLE_KEYS = ["title", "jobTitle", "job_title", "position", "headline"];
const ORG_KEYS = ["organizationName", "organization_name", "company", "companyName", "employer"];
const DOMAIN_KEYS = ["organizationWebsite", "website", "domain", "companyWebsite", "company_domain"];
const INDUSTRY_KEYS = ["organizationIndustry", "industry", "companyIndustry"];
const SIZE_KEYS = ["organizationEmployeeRange", "employeeRange", "employeeCount", "companySize", "organization_num_employees"];
const CITY_KEYS = ["city", "town", "locality"];
const COUNTRY_KEYS = ["country", "personCountry"];
const LINKEDIN_KEYS = ["linkedinUrl", "linkedin_url", "linkedin"];

export interface MappedBusiness {
  organization: string | null;
  domain: string | null;
  industry: string | null;
  employeeRange: string | null;
  city: string | null;
  country: string | null;
  title: string | null;
  linkedinUrl: string | null;
}

export interface ApifyProviderResult {
  email: string | null;
  sourceUrl: string | null;
  business: MappedBusiness | null;
  matched: boolean;
  errors: string[];
}

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function domainRoot(value: string | null): string | null {
  if (!value) return null;
  let v = value.trim().toLowerCase();
  v = v.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split("@").pop() || "";
  return v || null;
}

function mapBusiness(obj: Record<string, unknown>): MappedBusiness {
  return {
    organization: pick(obj, ORG_KEYS),
    domain: domainRoot(pick(obj, DOMAIN_KEYS)),
    industry: pick(obj, INDUSTRY_KEYS),
    employeeRange: pick(obj, SIZE_KEYS),
    city: pick(obj, CITY_KEYS),
    country: pick(obj, COUNTRY_KEYS),
    title: pick(obj, TITLE_KEYS),
    linkedinUrl: pick(obj, LINKEDIN_KEYS),
  };
}

export interface ApifyInput {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  country: string | null;
  /** Known website/handle domain for corroboration, when available. */
  knownDomain: string | null;
}

export async function runApifyLeadActor(input: ApifyInput): Promise<ApifyProviderResult> {
  const errors: string[] = [];
  const token = process.env.APIFY_TOKEN;
  const actor = process.env.APIFY_LEAD_ACTOR;
  if (!token || !actor) {
    return { email: null, sourceUrl: null, business: null, matched: false, errors: ["apify-not-configured"] };
  }

  // Names + light filters — tolerated/ignored by actors that don't use them.
  const body: Record<string, unknown> = { maxResults: 5 };
  if (input.fullName) body.personName = input.fullName;
  if (input.firstName) body.firstName = input.firstName;
  if (input.lastName) body.lastName = input.lastName;
  if (input.title) body.personTitle = [input.title];
  if (input.country) body.personCountry = [input.country];

  const url =
    `${ACTOR_RUN_URL}/${actor}/run-sync-get-dataset-items` +
    `?token=${encodeURIComponent(token)}&timeout=${RUN_SYNC_TIMEOUT_S}&clean=true`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), (RUN_SYNC_TIMEOUT_S + 10) * 1000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      errors.push(`apify-http-${res.status}`);
      return { email: null, sourceUrl: null, business: null, matched: false, errors };
    }

    const items = await res.json();
    if (!Array.isArray(items)) {
      errors.push("apify-nonarray");
      return { email: null, sourceUrl: null, business: null, matched: false, errors };
    }

    const rows = items.filter((it: unknown): it is Record<string, unknown> => !!it && typeof it === "object");
    const wantName = (input.fullName || `${input.firstName ?? ""} ${input.lastName ?? ""}`).trim().toLowerCase();
    const wantDomain = domainRoot(input.knownDomain);

    // Corroborate: accept a row only if its name matches ours, or its email
    // domain matches our known domain. Never attach a stranger's email.
    for (const row of rows) {
      const rowName =
        pick(row, FIRST_KEYS) && pick(row, LAST_KEYS)
          ? `${pick(row, FIRST_KEYS)} ${pick(row, LAST_KEYS)}`.toLowerCase()
          : (pick(row, ORG_KEYS) ?? "").toLowerCase();
      const email = pick(row, EMAIL_KEYS);
      const rowDomain = domainRoot(pick(row, DOMAIN_KEYS)) || domainRoot(email);

      const nameMatch = !!wantName && !!rowName && (rowName === wantName || rowName.includes(wantName) || wantName.includes(rowName));
      const domainMatch = !!wantDomain && !!rowDomain && (rowDomain === wantDomain || rowDomain.endsWith(`.${wantDomain}`) || wantDomain.endsWith(`.${rowDomain}`));

      if ((nameMatch || domainMatch) && email) {
        return { email, sourceUrl: pick(row, LINKEDIN_KEYS), business: mapBusiness(row), matched: true, errors };
      }
    }

    // No corroborated email — still surface business details for the closest row if any.
    const business = rows.length ? mapBusiness(rows[0]) : null;
    return { email: null, sourceUrl: null, business, matched: false, errors };
  } catch (e: unknown) {
    const name = (e as { name?: string })?.name;
    errors.push(name === "AbortError" ? "apify-timeout" : "apify-error");
    return { email: null, sourceUrl: null, business: null, matched: false, errors };
  }
}

/* ── Filter-search actor — SOURCE PROFILES (the "who", discovered by ICP) ──
 * Creata's front door finds the SIGNAL (what someone said). This is the
 * complementary engine that surfaces PROFILES matching a buyer's ICP filters
 * (title / seniority / country / company size) — the people whose own content
 * Creata then reads for signal + pain. It mirrors the exact filter schema we
 * proved in the 100-lead run, so the input shape is known, not guessed.
 *
 * It does NOT attach emails: sourcing is not enriching. An author's email is
 * only ever attached by runApifyLeadActor, after corroboration.
 * ---------------------------------------------------------------------- */

export interface SourceFilters {
  titles?: string[];
  seniority?: string[];
  countries?: string[];
  /** "1 - 10", "11 - 50" — spaces around the dash. */
  employeeRanges?: string[];
  maxResults?: number;
}

export interface SourcedProfile {
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  linkedinUrl: string | null;
  business: MappedBusiness | null;
}

export async function sourceProfilesByFilters(
  filters: SourceFilters
): Promise<{ profiles: SourcedProfile[]; errors: string[] }> {
  const errors: string[] = [];
  const token = process.env.APIFY_TOKEN;
  const actor = process.env.APIFY_LEAD_ACTOR;
  if (!token || !actor) return { profiles: [], errors: ["apify-not-configured"] };

  const body: Record<string, unknown> = { maxResults: filters.maxResults ?? 20 };
  if (filters.titles?.length) body.personTitle = filters.titles;
  if (filters.seniority?.length) body.seniority = filters.seniority;
  if (filters.countries?.length) body.personCountry = filters.countries;
  if (filters.employeeRanges?.length) body.companyEmployeeSize = filters.employeeRanges;

  const url =
    `${ACTOR_RUN_URL}/${actor}/run-sync-get-dataset-items` +
    `?token=${encodeURIComponent(token)}&timeout=${RUN_SYNC_TIMEOUT_S}&clean=true`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), (RUN_SYNC_TIMEOUT_S + 10) * 1000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { profiles: [], errors: [`apify-http-${res.status}`] };

    const items = await res.json();
    if (!Array.isArray(items)) return { profiles: [], errors: ["apify-nonarray"] };

    const profiles: SourcedProfile[] = items
      .filter((it: unknown): it is Record<string, unknown> => !!it && typeof it === "object")
      .filter((row) => pick(row, FIRST_KEYS) || pick(row, LAST_KEYS) || pick(row, ORG_KEYS))
      .map((row) => {
        const first = pick(row, FIRST_KEYS);
        const last = pick(row, LAST_KEYS);
        return {
          fullName: first && last ? `${first} ${last}` : first ?? last ?? null,
          firstName: first,
          lastName: last,
          title: pick(row, TITLE_KEYS),
          linkedinUrl: pick(row, LINKEDIN_KEYS),
          business: mapBusiness(row),
        };
      });

    return { profiles, errors };
  } catch (e: unknown) {
    errors.push((e as { name?: string })?.name === "AbortError" ? "apify-timeout" : "apify-error");
    return { profiles: [], errors };
  }
}
