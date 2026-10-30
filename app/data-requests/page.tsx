import Link from "next/link";
import type { Metadata } from "next";
import PolicyShell, { PolicyHeading, PolicyList } from "@/components/PolicyShell";
import { COMPANY_NAME, DPO_EMAIL, MINIMUM_AGE, PRIVACY_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Your Data Rights | ${COMPANY_NAME}`,
  description: `How to access, correct, export or erase your personal data, and how to ask ${COMPANY_NAME} to remove your information from search results.`,
};

export default function DataRequestsPage() {
  return (
    <PolicyShell title="Your Data Rights and Removal Requests">
      <p>
        This page explains how to exercise your rights over your personal data, whether you
        are a {COMPANY_NAME} customer or someone who has appeared in a customer's search
        results.
      </p>

      <PolicyHeading>If you are a customer</PolicyHeading>
      <p>
        If you have an account, most requests can be handled by you immediately from your
        account settings: correct your details, delete saved leads, and export the data in
        your account. For anything else, email us.
      </p>

      <PolicyHeading>If you appeared in someone's search results</PolicyHeading>
      <p>
        Our search features surface content that is already publicly available on
        third-party platforms. If you want that information gone from the source, the
        fastest route is a request to the platform itself — removing it there removes it
        from what we can retrieve.
      </p>
      <p>
        You can also ask us directly and we will act within the law. Write to{" "}
        <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> with
        the subject line <strong>"Data request"</strong>, and include:
      </p>
      <PolicyList
        items={[
          "your name and the email address we should reply to",
          "the profile or handle concerned, and the platform (for example a TikTok handle)",
          "a link to the specific content if you have one",
          "what you want us to do — remove it, stop showing it, correct it, or tell you what we hold",
          "the right you are relying on, if you know it",
        ]}
      />
      <p>
        We may ask you to verify that the profile is yours, for example by showing control
        of the linked account, so that we do not remove someone else's data on a stranger's
        instruction. Once verified we will erase, suppress, or explain, and we will tell you
        what we did.
      </p>

      <PolicyHeading>What we will do</PolicyHeading>
      <PolicyList
        items={[
          "Acknowledge your request and explain what we need from you",
          "Respond substantively within one month, or within two months for complex requests, telling you if we need the extra time",
          "Delete or suppress the data from the service, and delete it from our records, unless the law requires us to keep it",
          "Where the data is held by a customer rather than by us, forward your request to them and tell you that we have done so — we do not control what a customer has already exported or saved, and we cannot delete a copy that we do not hold",
        ]}
      />
      <p>
        We do not charge a fee for a request, unless a request is manifestly unfounded or
        excessive, in which case we may refuse it or charge a reasonable fee and explain why.
      </p>

      <PolicyHeading>Children</PolicyHeading>
      <p>
        {COMPANY_NAME} is a business tool and accounts are restricted to people aged{" "}
        {MINIMUM_AGE} or over. We do not knowingly process a child's data. If you believe a
        child's data has been collected, contact us and we will remove it without undue
        delay, along with the account associated with it.
      </p>

      <PolicyHeading>Complaining about us</PolicyHeading>
      <p>
        If you are unhappy with how we have handled your request, tell{" "}
        <a className="underline" href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a> and we will
        review it. You also have the right to complain to the Nigeria Data Protection
        Commission, or to the data protection authority in your own country, at any time.
      </p>

      <PolicyHeading>Your other rights</PolicyHeading>
      <p>
        Full detail of the rights available to you — access, rectification, erasure,
        restriction, objection, portability, and withdrawal of consent — is set out in our{" "}
        <Link className="underline" href="/privacy-policy">Privacy Policy</Link>.
      </p>
    </PolicyShell>
  );
}
