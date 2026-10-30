import Link from "next/link";
import type { Metadata } from "next";
import PolicyShell, { PolicyHeading, PolicyList } from "@/components/PolicyShell";
import { COMPANY_NAME, EFFECTIVE_DATE, PRIVACY_EMAIL, SUPPORT_EMAIL } from "@/lib/legal";
import { CONSENT_COOKIE_NAME, CONSENT_POLICY_VERSION } from "@/lib/consent";

export const metadata: Metadata = {
  title: `Cookie Policy | ${COMPANY_NAME}`,
  description: `The cookies and browser storage ${COMPANY_NAME} uses, what each category does, and how to change your choices.`,
};

export default function CookiePolicyPage() {
  return (
    <PolicyShell title="Cookie Policy">
      <p className="text-sm text-slate-500">Effective date: {EFFECTIVE_DATE}</p>

      <p>
        {COMPANY_NAME} uses browser storage to keep the service working and to remember
        your optional cookie choices. This policy explains what we set, why, and how you
        change it. It should be read together with our{" "}
        <Link className="underline" href="/privacy-policy">Privacy Policy</Link>.
      </p>

      <PolicyHeading>What cookies are</PolicyHeading>
      <p>
        Cookies are small text files placed on your device when you visit a website. They
        are widely used to make websites work, to keep you signed in, and to remember the
        choices you have made. Some also help a site owner understand how the site is
        used. We also use local browser storage for the same purposes; where we say
        "cookies" below, we mean cookies and equivalent browser storage.
      </p>

      <PolicyHeading>Categories we use</PolicyHeading>
      <PolicyList
        items={[
          <>
            <strong>Strictly necessary</strong> — authentication and session storage, plus
            the record of your cookie choice itself. The service cannot function without
            these, so they are set on the basis of our contract with you and do not
            require consent.
          </>,
          <>
            <strong>Preferences</strong> — remember choices such as your selected country
            and currency so you do not have to set them again. Off until you choose them.
          </>,
          <>
            <strong>Analytics</strong> — would let us measure how the service is used so we
            can improve it. Off until you choose them.
          </>,
          <>
            <strong>Advertising and session replay</strong> — we do not use advertising
            cookies, cross-site tracking, session replay, or keystroke recording. We do not
            run these even if you press "Accept all".
          </>,
        ]}
      />

      <PolicyHeading>What is set in practice</PolicyHeading>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-2 pr-4 font-semibold">Name</th>
              <th className="py-2 pr-4 font-semibold">Category</th>
              <th className="py-2 pr-4 font-semibold">Purpose</th>
              <th className="py-2 font-semibold">Lifetime</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 align-top">
              <td className="py-2 pr-4">Supabase authentication tokens</td>
              <td className="py-2 pr-4">Strictly necessary</td>
              <td className="py-2 pr-4">
                Keeps you signed in and secures requests to your account
              </td>
              <td className="py-2">Session / refreshed by Supabase</td>
            </tr>
            <tr className="border-b border-slate-100 align-top">
              <td className="py-2 pr-4">
                <code>{CONSENT_COOKIE_NAME}</code>
              </td>
              <td className="py-2 pr-4">Strictly necessary</td>
              <td className="py-2 pr-4">
                Stores your cookie choices, the policy version and the time you made them
              </td>
              <td className="py-2">6 months</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3">
        Optional categories default to off. No optional cookie is set until you select it
        and save. Your consent record stores the policy version ({CONSENT_POLICY_VERSION}),
        a timestamp, and your category choices; when you are signed in, the same record is
        stored against your account so we can demonstrate what you agreed to.
      </p>

      <PolicyHeading>Third-party cookies</PolicyHeading>
      <p>
        Embedded content and links to other sites (for example a video, a payment page, or
        a social platform) may set their own cookies once you interact with them. Those
        cookies are controlled by the third party and are governed by their policy, not
        ours. Where we embed third-party content, we use privacy-enhanced modes where the
        provider offers one.
      </p>

      <PolicyHeading>Manage your choices</PolicyHeading>
      <p>
        Use the <strong>Cookie Settings</strong> link in the site footer at any time to
        reopen your choices and change or withdraw them. Withdrawal does not affect
        processing that already took place lawfully before you withdrew.
      </p>
      <p>
        You can also control cookies through your browser settings, including blocking or
        deleting them. Blocking strictly necessary storage may prevent sign-in or other
        parts of the service from working.
      </p>

      <PolicyHeading>Changes to this policy</PolicyHeading>
      <p>
        We review this policy regularly and update it when our practices change. The date
        at the top shows when it was last updated. If we add a new optional category, we
        will ask for your consent before setting anything in it.
      </p>

      <PolicyHeading>Contact</PolicyHeading>
      <p>
        Questions about cookies or this policy:{" "}
        <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
        General support:{" "}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </PolicyShell>
  );
}
