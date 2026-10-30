import Link from "next/link";
import type { Metadata } from "next";
import PolicyShell, { PolicyHeading, PolicyList } from "@/components/PolicyShell";
import {
  COMPANY_NAME,
  DPO_EMAIL,
  EFFECTIVE_DATE,
  MINIMUM_AGE,
  POSTAL_ADDRESS,
  PRIVACY_EMAIL,
  SUBPROCESSORS,
  WEBSITE_URL,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy | ${COMPANY_NAME}`,
  description: `How ${COMPANY_NAME} collects, uses, stores and protects personal data, and the rights you have under the Nigeria Data Protection Act.`,
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyShell title="Privacy Statement">
      <p className="text-sm text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

      <PolicyHeading>Who we are</PolicyHeading>
      <p>
        We are {COMPANY_NAME}. Our website address is:{" "}
        <Link className="underline" href="/">{WEBSITE_URL}</Link>. {COMPANY_NAME} is the
        data controller for the personal data described in this statement, and we process
        that data in line with the Nigeria Data Protection Act 2023 (NDPA) and, where it
        applies to you, the UK GDPR and EU GDPR.
      </p>
      <p>
        You can reach our data protection contact at{" "}
        <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.{" "}
        <a className="underline" href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a> is monitored
        for formal data protection requests and complaints.
      </p>

      <PolicyHeading>What personal data do we collect?</PolicyHeading>
      <p>We collect the following data:</p>
      <PolicyList
        items={[
          "Personal identification information (name, email address, phone number etc.)",
          "Account credentials and authentication identifiers",
          "Subscription, plan and payment reference information",
          "Search queries you submit, the leads you save, and any notes you add",
          "Country and currency preferences",
          "Records of the consents you give us, including the version and date",
        ]}
      />
      <p>
        You directly provide {COMPANY_NAME} with most of the data that we collect. We
        collect data and process data when you:
      </p>
      <PolicyList
        items={[
          "Create an account or sign in",
          "Voluntarily complete our contact form or email us",
          "Register online or place an order for any of our products or services",
          "Submit a search, save a lead, or use an AI-assisted feature",
          "Add or view our website via your browser's cookies",
        ]}
      />
      <p>We collect your data so that we can:</p>
      <PolicyList
        items={[
          "Create and manage your account",
          "Process your order, administer your plan and handle payment",
          "Provide the search, enrichment and AI-assisted analysis features you request",
          "Email you about your account, and — only where you have opted in — about products or services we think you might like",
          "Detect, prevent and investigate fraud, abuse and security incidents",
          "Meet our legal, accounting and regulatory obligations",
        ]}
      />
      <p>
        We do not sell your personal data. We do not share your data with partner
        companies so that they may market their own products or services to you.
      </p>
      <p>
        If you have agreed to receive marketing, you may always opt out at a later date.
        You have the right at any time to stop {COMPANY_NAME} from contacting you for
        marketing purposes. Every marketing email we send contains a working one-click
        unsubscribe link together with our identity and contact details. Opting out of
        marketing does not stop us sending you messages that are strictly necessary to
        operate your account.
      </p>
      <p>
        When {COMPANY_NAME} processes your order, it may send your data to, and use the
        resulting information from, payment processors and fraud-prevention services to
        prevent fraudulent purchases. We never receive or store your full card details.
      </p>

      <PolicyHeading>Children</PolicyHeading>
      <p>
        {COMPANY_NAME} is a business tool and is not directed at children. You must be at
        least {MINIMUM_AGE} years old to create an account, and we ask you to confirm this
        when you sign up. Under the NDPA a person under 18 is a child, and we do not
        knowingly process a child's personal data without verifiable parental consent. If
        we learn that we have collected data from a child, we will delete the account and
        the associated data without undue delay. If you believe a child has given us
        personal data, contact{" "}
        <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
      </p>

      <PolicyHeading>Contact forms</PolicyHeading>
      <p>
        When you contact us through a form on this site, we collect the details you
        provide so that we can respond, and we keep a record of the correspondence. We use
        that information only to handle your enquiry and any follow-up, and we retain it
        for as long as is needed for that purpose and for our legitimate record-keeping.
      </p>

      <PolicyHeading>Cookies</PolicyHeading>
      <p>
        Cookies are text files placed on your computer to collect standard internet log
        information and visitor behaviour information. When you visit our website, we may
        collect information from you automatically through cookies or similar technology.
      </p>
      <p>
        {COMPANY_NAME} uses cookies in a range of ways to improve your experience on our
        website, including keeping you signed in and understanding how you use our
        website.
      </p>
      <p>
        We use strictly necessary cookies to operate the service, and we ask for your
        consent before any optional cookie is set. We do not use advertising cookies and
        we do not run session-replay or keystroke-recording technology.
      </p>
      <p>
        You can set your browser to not accept cookies, however, in a few cases, some of
        our website features may not function as a result. You can change or withdraw your
        cookie choices at any time using the Cookie Settings link in our footer.
      </p>
      <p>
        For our Cookie Policy, please see{" "}
        <Link className="underline" href="/cookie-policy">here</Link>.
      </p>

      <PolicyHeading>Public information and search features</PolicyHeading>
      <p>
        Our search features retrieve information that people and businesses have made
        publicly available on third-party platforms and websites. We process that public
        information to help our customers identify commercial opportunities.
      </p>
      <p>
        Availability of information does not establish its accuracy, permission for every
        use, or an endorsement by {COMPANY_NAME}. We do not authorise or assist anyone in
        bypassing access controls, and using our service does not grant you permission to
        use a platform's data outside that platform's terms. If your personal data appears
        in a customer's search results and you want it removed, see{" "}
        <Link className="underline" href="/data-requests">Your Data Rights</Link>.
      </p>

      <PolicyHeading>Embedded content from other websites</PolicyHeading>
      <p>
        Articles and pages on this site may include embedded content (e.g. videos, images,
        articles, etc.). Embedded content from other websites behaves in the exact same
        way as if the visitor has visited the other website.
      </p>
      <p>
        These websites may collect data about you, use cookies, embed additional
        third-party tracking, and monitor your interaction with that embedded content,
        including tracking your interaction with the embedded content if you have an
        account and are logged in to that website. Our Privacy Policy applies only to our
        website, so if you click on a link to another website, you should read their
        Privacy Policy.
      </p>

      <PolicyHeading>AI-assisted features</PolicyHeading>
      <p>
        When you use an AI-assisted feature, we send the text needed for that feature —
        your query, the relevant onboarding context, and the public profile evidence being
        evaluated — to our AI inference provider so that it can return a result. We do not
        send your password or your payment details. We do not permit our providers to use
        your content to train their general models, and we do not use your content to
        train ours.
      </p>

      <PolicyHeading>Analytics</PolicyHeading>
      <p>
        We use privacy-respecting measurement to understand how the service is used. We do
        not use advertising trackers, cross-site behaviour profiling, or session replay.
        Any optional analytics cookies stay disabled until you consent, and you can
        withdraw that consent at any time through Cookie Settings.
      </p>

      <PolicyHeading>How long we retain your data</PolicyHeading>
      <p>
        We keep personal data only as long as we need it for the purposes described in
        this statement:
      </p>
      <PolicyList
        items={[
          "Account data — for as long as your account is open, then deleted or anonymised within 30 days of account closure",
          "Search history, saved leads and notes — for as long as your account is open, or until you delete them",
          "Consent records — for as long as we need to demonstrate we had a lawful basis, and for the limitation period for claims",
          "Payment, invoice and tax records — for the period required by Nigerian accounting and tax law (currently 6 years)",
          "Security and access logs — up to 12 months",
          "Backups — rotated on a rolling cycle of no more than 35 days",
        ]}
      />
      <p>
        If you leave a comment, the comment and its metadata are retained indefinitely.
        This is so we can recognise and approve any follow-up comments automatically
        instead of holding them in a moderation queue.
      </p>

      <PolicyHeading>What rights you have over your data</PolicyHeading>
      <p>
        For users that register on our website, we store the personal information they
        provide in their user profile. All users can see, edit, or delete their personal
        information at any time from their account settings (except they cannot change
        their username). Website administrators can also see and edit that information.
      </p>
      <p>
        If you have an account on this site, or have left comments, you can request to
        receive an exported file of the personal data we hold about you, including any
        data you have provided to us. You can also request that we erase any personal data
        we hold about you. This does not include any data we are obliged to keep for
        administrative, legal, or security purposes.
      </p>

      <PolicyHeading>Where we send your data</PolicyHeading>
      <p>
        We use the service providers below to run {COMPANY_NAME}. They act on our
        instructions as processors, and each is bound by a written agreement covering
        confidentiality, security and international transfers.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-2 pr-4 font-semibold">Provider</th>
              <th className="py-2 pr-4 font-semibold">Purpose</th>
              <th className="py-2 pr-4 font-semibold">Processing location</th>
              <th className="py-2 font-semibold">Privacy notice</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((p) => (
              <tr key={p.name} className="border-b border-slate-100 align-top">
                <td className="py-2 pr-4">{p.name}</td>
                <td className="py-2 pr-4">{p.purpose}</td>
                <td className="py-2 pr-4">{p.location}</td>
                <td className="py-2">
                  <a className="underline" href={p.url} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3">
        Some of these providers process data outside Nigeria, including in the United
        States and the European Union. Where we transfer personal data out of Nigeria we
        rely on an adequacy decision or on appropriate safeguards permitted by the NDPA,
        including the Nigeria Data Protection Commission's Standard Contractual Clauses,
        and we require the recipient to protect the data to a standard consistent with
        Nigerian law. Visitor comments may be checked through an automated spam detection
        service.
      </p>

      <PolicyHeading>How we protect your data</PolicyHeading>
      <p>
        We protect your data with encryption in transit, access controls on our production
        systems, least-privilege access for staff, and logging of administrative activity.
        No system is perfectly secure, but we act on any incident promptly. If a breach
        affects your rights, we will notify you and the Nigeria Data Protection Commission
        as required by the NDPA.
      </p>

      <PolicyHeading>Additional information — what are your data protection rights?</PolicyHeading>
      <p>
        {COMPANY_NAME} would like to make sure you are fully aware of all your data
        protection rights. Every user is entitled to the following:
      </p>
      <PolicyList
        items={[
          <>
            <strong>The right to access</strong> — You have the right to request from{" "}
            {COMPANY_NAME} copies of your personal data. You can download most of it
            yourself from your account.
          </>,
          <>
            <strong>The right to rectification</strong> — You have the right to request
            that {COMPANY_NAME} correct any information you believe is incorrect. You also
            have the right to request {COMPANY_NAME} complete information you believe is
            incomplete.
          </>,
          <>
            <strong>The right to erasure</strong> — You have the right to request that{" "}
            {COMPANY_NAME} erase your personal data, under certain conditions.
          </>,
          <>
            <strong>The right to restrict processing</strong> — You have the right to
            request that {COMPANY_NAME} restrict the processing of your personal data,
            under certain conditions.
          </>,
          <>
            <strong>The right to object to processing</strong> — You have the right to
            object to {COMPANY_NAME} processing your personal data, under certain
            conditions.
          </>,
          <>
            <strong>The right to data portability</strong> — You have the right to request
            that {COMPANY_NAME} transfer the data that we have collected to another
            organisation, or directly to you, under certain conditions.
          </>,
          <>
            <strong>The right to withdraw consent</strong> — Where we rely on your consent,
            you can withdraw it at any time. This does not affect processing carried out
            before you withdrew it.
          </>,
        ]}
      />
      <p>
        If you make a request, we have one month to respond to you. If you would like to
        exercise any of these rights, please contact us at{" "}
        <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> or use
        our <Link className="underline" href="/data-requests">data request form</Link>. We
        may need to verify your identity, and where the data belongs to someone else we
        will forward your request to the controller responsible rather than disclose it to
        you.
      </p>
      <p>
        If you are not satisfied with our response, you have the right to lodge a
        complaint with the Nigeria Data Protection Commission (NDPC), or with the
        supervisory authority in your country of residence. We would appreciate the chance
        to resolve your concern first.
      </p>

      <PolicyHeading>Lawful basis for processing</PolicyHeading>
      <PolicyList
        items={[
          "Performance of a contract — creating your account, delivering the service you asked for, and billing you for it",
          "Consent — optional cookies, analytics, and marketing emails. You can withdraw it at any time",
          "Legitimate interests — securing the service, preventing abuse and fraud, and improving our product, balanced against your rights",
          "Legal obligation — keeping the tax, accounting and other records we are required to keep",
        ]}
      />

      <PolicyHeading>Changes to our Privacy Policy</PolicyHeading>
      <p>
        {COMPANY_NAME} keeps its privacy policy under regular review and places any
        updates on this page. This Privacy Policy was last updated on {EFFECTIVE_DATE}. If
        we make a material change we will tell account holders by email or in-product
        notice before it takes effect.
      </p>

      <PolicyHeading>Contact us</PolicyHeading>
      <p>
        If you have any questions about our Privacy Policy, the data we hold on you, or
        you would like to exercise one of your data protection rights, please do not
        hesitate to contact us.
      </p>
      <p className="mt-3">
        Email us at:{" "}
        <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
      </p>
      <p className="mt-3">
        Write us at: {COMPANY_NAME}
        {POSTAL_ADDRESS ? `, ${POSTAL_ADDRESS}` : ` (${WEBSITE_URL})`}
      </p>
    </PolicyShell>
  );
}
