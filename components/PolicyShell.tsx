import Link from "next/link";
import { COMPANY_NAME, LAST_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export function PolicyHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 text-lg font-semibold uppercase tracking-wide text-slate-900">
      {children}
    </h2>
  );
}

export function PolicyList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-6">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function PolicyShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-800">
      <h1 className="mb-2 text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h1>
      <p className="mb-8 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

      <div className="space-y-4 leading-relaxed">{children}</div>

      <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-600">
        <p>
          Questions about this document, or want to exercise a data protection right?
          Email <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
        <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Policies">
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/cookie-policy">Cookie Policy</Link>
          <Link href="/terms">Terms and Conditions</Link>
          <Link href="/acceptable-use">Acceptable Use</Link>
          <Link href="/data-requests">Your Data Rights</Link>
        </nav>
        <p className="mt-4 text-slate-500">
          {COMPANY_NAME} — {" "}
          <Link className="underline" href="/">
            creata.tech
          </Link>
        </p>
      </div>
    </main>
  );
}
