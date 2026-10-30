/**
 * Single source of truth for every legal / policy surface.
 * Change a value here and it updates the Privacy Policy, Cookie Policy,
 * Terms, Acceptable Use, Data Rights pages and the signup consent record.
 */

export const COMPANY_NAME = "Creata";
export const WEBSITE_URL = "https://creata.tech";

/** Role addresses — these mailboxes must exist and be monitored. */
export const PRIVACY_EMAIL = "privacy@creata.tech";
export const DPO_EMAIL = "dpo@creata.tech";
export const LEGAL_EMAIL = "legal@creata.tech";
export const SUPPORT_EMAIL = "support@creata.tech";

/**
 * Postal / registered address of the data controller.
 * Set this if you have a registered entity (CAC). Leave the string empty and
 * the policy simply omits the address block rather than printing a placeholder.
 */
export const POSTAL_ADDRESS = "";

/** Bump this whenever the policies change. It is written into each new
 *  account's consent record so you can prove which version was accepted.
 *  Kept in step with the cookie-consent version so there is one number to
 *  reason about — bump BOTH when a policy materially changes. */
export { CONSENT_POLICY_VERSION as POLICY_VERSION } from "@/lib/consent";
export const EFFECTIVE_DATE = "30th October, 2026";
export const LAST_UPDATED = "30th October, 2026";

/** Minimum age. Creata is a business tool: 18+, so we never knowingly process
 *  a child's data (NDPA s.31 — a child is under 18). */
export const MINIMUM_AGE = 18;

export const GOVERNING_LAW = "the Federal Republic of Nigeria";

/** Sub-processors actually in use. Keep this list honest — it is a legal
 *  representation. Remove an entry when you stop using the vendor. */
export const SUBPROCESSORS: { name: string; purpose: string; location: string; url: string }[] = [
  {
    name: "Supabase",
    purpose: "Account authentication, database and file storage",
    location: "EU / US (region-dependent)",
    url: "https://supabase.com/privacy",
  },
  {
    name: "Vercel",
    purpose: "Application hosting and content delivery",
    location: "United States / global edge",
    url: "https://vercel.com/legal/privacy-policy",
  },
  {
    name: "Paystack",
    purpose: "Payment processing and subscription billing",
    location: "Nigeria",
    url: "https://paystack.com/privacy",
  },
  {
    name: "OpenRouter",
    purpose: "AI model inference for search interpretation and analysis",
    location: "United States",
    url: "https://openrouter.ai/privacy",
  },
  {
    name: "Scrape Creators",
    purpose: "Retrieval of publicly available social platform content",
    location: "United States",
    url: "https://scrapecreators.com/privacy",
  },
  {
    name: "ipapi.co",
    purpose: "Approximate country lookup at signup for currency and region defaults",
    location: "United States",
    url: "https://ipapi.co/privacy/",
  },
];
