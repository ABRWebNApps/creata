import Link from "next/link";
import type { Metadata } from "next";
import PolicyShell, { PolicyHeading, PolicyList } from "@/components/PolicyShell";
import {
  COMPANY_NAME,
  EFFECTIVE_DATE,
  GOVERNING_LAW,
  LEGAL_EMAIL,
  MINIMUM_AGE,
  SUPPORT_EMAIL,
  WEBSITE_URL,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms and Conditions | ${COMPANY_NAME}`,
  description: `The terms on which ${COMPANY_NAME} provides account-based search, lead organisation and AI-assisted analysis.`,
};

export default function TermsPage() {
  return (
    <PolicyShell title="Terms and Conditions">
      <p className="text-sm text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

      <p>
        These terms govern your access to and use of {COMPANY_NAME} at {WEBSITE_URL}. By
        creating an account, or by using the service, you agree to them. If you are
        agreeing on behalf of a company or other organisation, you confirm that you have
        authority to bind that organisation.
      </p>

      <PolicyHeading>The service</PolicyHeading>
      <p>
        {COMPANY_NAME} provides account-based search, lead organisation, enrichment, and
        AI-assisted suggestions. Search results, public profile data, and generated
        analysis can be incomplete, delayed, or incorrect. You must verify information
        independently before relying on it, and before making contact with any person.
      </p>

      <PolicyHeading>Eligibility</PolicyHeading>
      <p>
        You must be at least {MINIMUM_AGE} years old and legally able to enter into a
        contract to use {COMPANY_NAME}. The service is a business tool and is not intended
        for personal, family or household use, and not for children.
      </p>

      <PolicyHeading>Your account</PolicyHeading>
      <p>
        Keep your credentials secure and provide accurate account information. You are
        responsible for activity that takes place under your account. Tell us promptly at{" "}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you
        believe your account has been compromised. We may suspend an account that presents
        a security, legal or abuse risk.
      </p>

      <PolicyHeading>Your responsibilities</PolicyHeading>
      <p>
        Use {COMPANY_NAME} lawfully and respect third-party platform terms, privacy
        rights, and applicable marketing rules. You must not use the service to:
      </p>
      <PolicyList
        items={[
          "bypass access controls, paywalls, rate limits or authentication on any platform",
          "collect data unlawfully, or in breach of the terms of the platform it came from",
          "harass, stalk, defame, or discriminate against any person",
          "send unsolicited or unlawful communications — every marketing message you send must comply with the law that applies to you and your recipient, including a working opt-out",
          "resell, sublicense, or make the service available to third parties unless we agree in writing",
          "reverse engineer, scrape, or overload the service, or use it to build a competing product",
          "process special category data or children's data with the service",
        ]}
      />
      <p>
        You are responsible for the queries you submit, for the legal basis on which you
        contact anyone you find, and for how you use the results. See our{" "}
        <Link className="underline" href="/acceptable-use">Acceptable Use Policy</Link> for
        the detail.
      </p>

      <PolicyHeading>Accounts, plans, and payments</PolicyHeading>
      <p>
        Prices, plan features, billing frequency, currencies and any applicable taxes are
        shown on our pricing page at the point of purchase, and form part of these terms.
        Subscriptions renew automatically for the same period at the then-current price
        unless cancelled before the renewal date. You can cancel at any time from your
        account settings or by contacting us; cancellation stops future renewals and takes
        effect at the end of the period you have already paid for.
      </p>
      <p>
        Payment processing is provided through Paystack. We never receive or store your
        full card details. If a payment fails, we may suspend paid features until the
        balance is settled.
      </p>
      <p>
        Refunds: if the service is materially not as described and we cannot fix it, you
        may ask for a refund of the unused portion of your current period within 14 days of
        the problem arising. We do not refund a period you have already used, and we do not
        refund solely because results did not produce a sale — search results are
        probabilistic by nature.
      </p>

      <PolicyHeading>AI output and third-party services</PolicyHeading>
      <p>
        AI-generated text is informational assistance, not a guarantee of accuracy, and not
        a substitute for your own judgement or for legal advice. {COMPANY_NAME} depends on
        third-party platforms and processors that may change, restrict access, or become
        unavailable, and on public data that may be removed by its owner at any time. We do
        not warrant that any particular platform, feature, or data source will remain
        available.
      </p>

      <PolicyHeading>Our intellectual property</PolicyHeading>
      <p>
        We own the service, our software, and our branding. We grant you a non-exclusive,
        non-transferable right to use the service while your account is in good standing.
        You own the data you put in and the leads you save. You grant us the limited
        licence we need to host and process that data in order to run the service for you.
      </p>

      <PolicyHeading>Availability and changes</PolicyHeading>
      <p>
        We aim to keep the service available but we do not promise uninterrupted operation.
        We may modify, add, or remove features, and we may suspend the service for
        maintenance or for legal or security reasons. If we make a material change to
        these terms we will notify account holders by email or in-product notice before it
        takes effect. Continuing to use the service after a change means you accept it.
      </p>

      <PolicyHeading>Termination</PolicyHeading>
      <p>
        You may close your account at any time. We may suspend or terminate your access if
        you materially breach these terms, if we are required to by law, or if your use
        creates a legal or security risk for us or for others. On termination your right to
        use the service ends, and we will delete or anonymise your personal data as
        described in our{" "}
        <Link className="underline" href="/privacy-policy">Privacy Policy</Link>.
      </p>

      <PolicyHeading>Liability</PolicyHeading>
      <p>
        Nothing in these terms limits liability that cannot lawfully be limited, including
        for fraud, or for death or personal injury caused by negligence.
      </p>
      <p>
        Subject to that: the service is provided "as is" and we exclude all implied
        warranties to the extent the law allows. We are not liable for indirect,
        incidental or consequential loss, loss of profit, loss of business, or loss of
        data. Our total liability arising out of or in connection with these terms is
        limited to the amount you paid us in the twelve months before the event giving rise
        to the claim. You agree to indemnify us against third-party claims arising from your
        unlawful use of the service, or from communications you send to people you found
        using it.
      </p>

      <PolicyHeading>Governing law and disputes</PolicyHeading>
      <p>
        These terms are governed by the laws of {GOVERNING_LAW}. Before starting formal
        proceedings, you and we agree to try to resolve any dispute informally by writing
        to the other party and allowing 30 days for a response. If that fails, the courts
        of {GOVERNING_LAW} have exclusive jurisdiction, without affecting any right you have
        to bring a claim in your local courts where the law gives you that right.
      </p>

      <PolicyHeading>Contact</PolicyHeading>
      <p>
        Legal notices:{" "}
        <a className="underline" href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. Support:{" "}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </PolicyShell>
  );
}
