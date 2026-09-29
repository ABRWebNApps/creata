import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | Creata",
  description: "Draft Terms and Conditions for Creata, pending legal review.",
};

export default function TermsPage() {
  return <main className="mx-auto max-w-3xl px-6 py-16 text-slate-800"><p className="mb-4 inline-block rounded bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">Draft for legal review</p><h1 className="mb-2 text-4xl font-bold">Terms and Conditions</h1><p className="mb-8 text-sm text-slate-500">Effective date: [EFFECTIVE DATE]</p>
    <p>These draft terms describe proposed rules for using Creata. They are not final and should not be treated as an accepted contract until reviewed and approved by the service owner and counsel. Replace [PLACEHOLDERS] before publication.</p>
    <h2 className="mt-8 text-xl font-semibold">The service</h2><p className="mt-3">Creata provides account-based search, lead organization, enrichment, and AI-assisted suggestions. Search results, public profile data, and generated analysis can be incomplete, delayed, or incorrect. You must verify information independently before relying on it.</p>
    <h2 className="mt-8 text-xl font-semibold">Your responsibilities</h2><p className="mt-3">Use Creata lawfully and respect third-party platform terms, privacy rights, and applicable marketing rules. Do not use the service to bypass access controls, collect data unlawfully, harass people, or send unwanted communications. You are responsible for the queries you submit and how you use results.</p>
    <h2 className="mt-8 text-xl font-semibold">Accounts, plans, and payments</h2><p className="mt-3">Keep your credentials secure and provide accurate account information. Paid plan features, billing frequency, renewal, cancellation, taxes, refunds, and currency must be stated in the final pricing and payment terms: [CONFIRM BILLING AND REFUND TERMS]. Payment processing is provided through Paystack where available.</p>
    <h2 className="mt-8 text-xl font-semibold">AI output and third-party services</h2><p className="mt-3">AI-generated text is informational assistance, not a guarantee of accuracy or a substitute for your judgment. Creata depends on third-party platforms and processors that may change or become unavailable.</p>
    <h2 className="mt-8 text-xl font-semibold">Changes and contact</h2><p className="mt-3">[ADD OWNER ENTITY, GOVERNING LAW, LIABILITY TERMS, DISPUTE PROCESS, TERMINATION, AND NOTICE METHOD AFTER LEGAL REVIEW.] Contact: [LEGAL CONTACT EMAIL].</p><Link className="mt-6 inline-block underline" href="/privacy-policy">Privacy Policy</Link></main>;
}
