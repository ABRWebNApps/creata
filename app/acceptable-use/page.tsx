import Link from "next/link";
import type { Metadata } from "next";
import PolicyShell, { PolicyHeading, PolicyList } from "@/components/PolicyShell";
import { COMPANY_NAME, EFFECTIVE_DATE, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Acceptable Use Policy | ${COMPANY_NAME}`,
  description: `How ${COMPANY_NAME} may and may not be used, and the platform and privacy rules that apply to the data it surfaces.`,
};

export default function AcceptableUsePage() {
  return (
    <PolicyShell title="Acceptable Use Policy">
      <p className="text-sm text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

      <p>
        {COMPANY_NAME} surfaces publicly available information about people so that
        businesses can find genuine commercial opportunities. That is a legitimate and
        lawful use — but only when it is done responsibly. This policy sets out what is
        acceptable. It forms part of our{" "}
        <Link className="underline" href="/terms">Terms and Conditions</Link>, and breaching
        it can result in immediate suspension.
      </p>

      <PolicyHeading>What {COMPANY_NAME} is for</PolicyHeading>
      <PolicyList
        items={[
          "Finding people who have publicly expressed a need that your product or service genuinely addresses",
          "Understanding the problem a prospect has described, so that your first message is relevant and welcome",
          "Organising and keeping notes on prospects inside your own account",
          "Reaching out through the platform where the signal was posted, or by email, in line with that platform's rules and with applicable marketing law",
        ]}
      />

      <PolicyHeading>What you must not do</PolicyHeading>
      <PolicyList
        items={[
          <>
            <strong>No mass unsolicited messaging.</strong> Do not use {COMPANY_NAME} to run
            bulk, indiscriminate or automated outreach. Every message you send must be
            lawful under the rules that apply to you and to your recipient, must identify
            you honestly, and must offer a working way to opt out. In Nigeria this means
            complying with the NDPA and NCC rules on unsolicited communications; if you
            message people in the EU or UK, GDPR and PECR apply.
          </>,
          <>
            <strong>No harassment, stalking or profiling of individuals.</strong> Do not
            compile dossiers on private individuals, do not contact someone after they ask
            you to stop, and do not use the service to target people on the basis of
            protected characteristics.
          </>,
          <>
            <strong>No special category or children's data.</strong> Do not use{" "}
            {COMPANY_NAME} to process data revealing health, sexuality, religion, political
            opinion, trade union membership, genetics or biometrics, and do not target
            anyone you know or believe to be a child.
          </>,
          <>
            <strong>No bypassing access controls.</strong> Do not use the service, in
            combination with anything else, to defeat a login, a paywall, a rate limit, a
            robots directive, or any technical restriction. We do not authorise that, and we
            will not support it.
          </>,
          <>
            <strong>No reselling or re-exposing the data.</strong> Do not publish, resell,
            or publish-as-a-dataset the personal data you retrieve. Keep it inside your
            account for your own direct business development.
          </>,
          <>
            <strong>No unlawful or deceptive use.</strong> Do not impersonate anyone, do not
            misrepresent who you are or why you are contacting someone, and do not use the
            service for fraud, scams, or any purpose unlawful in your jurisdiction or in
            your recipient's.
          </>,
          <>
            <strong>No competing product.</strong> Do not scrape, reverse engineer, or use
            the output of the service to train a model or to build a competing service.
          </>,
        ]}
      />

      <PolicyHeading>Public information, and the limits of "public"</PolicyHeading>
      <p>
        Our search features retrieve content that people have published publicly. Publicly
        available does not mean "no rules apply". When you act on a result you are
        responsible for:
      </p>
      <PolicyList
        items={[
          "the terms of the platform the content came from, which may restrict automated collection or off-platform contact",
          "the privacy rights of the person whose content it is",
          "the marketing and communications law of your country and of theirs",
          "any confidentiality or professional obligation that applies to you",
        ]}
      />
      <p>
        {COMPANY_NAME} does not grant you any licence to a third party's data, and using
        our service is not a defence to a claim that your outreach was unlawful.
      </p>

      <PolicyHeading>Reporting a problem</PolicyHeading>
      <p>
        If you see content on {COMPANY_NAME} that you believe is unlawful, or that was
        obtained improperly, tell us at{" "}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we
        will look into it. If you are the person whose data appears in a customer's
        results, use our{" "}
        <Link className="underline" href="/data-requests">data request page</Link>.
      </p>

      <PolicyHeading>Enforcement</PolicyHeading>
      <p>
        Where we reasonably believe this policy has been breached we may warn you, remove
        content, restrict features, suspend or terminate your account, and where the law
        requires it, report the matter to the relevant authority. Serious breaches may end
        your access without notice and without refund.
      </p>
    </PolicyShell>
  );
}
