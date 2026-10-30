import Link from "next/link";
import CookieSettingsButton from "@/components/CookieSettingsButton";
import { SUPPORT_EMAIL } from "@/lib/legal";

/* ── The single site footer ───────────────────────────────────────────────
 * Rendered once, globally, from app/layout.tsx. Do not add a second footer
 * to a page — that is how the legal links ended up duplicated. Add any new
 * link to the relevant group below instead.
 * ---------------------------------------------------------------------- */

const linkClass =
  "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors";

const PLATFORM_LINKS = [
  { href: "/leads/platform/tiktok", label: "TikTok leads" },
  { href: "/leads/platform/instagram", label: "Instagram leads" },
  { href: "/leads/platform/x", label: "X leads" },
  { href: "/leads/platform/linkedin", label: "LinkedIn leads" },
  { href: "/leads/platform/facebook", label: "Facebook leads" },
];

const PRODUCT_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/auth/signup", label: "Create account" },
  { href: "/auth/signin", label: "Sign in" },
];

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms and Conditions" },
  { href: "/cookie-policy", label: "Cookie Policy" },
  { href: "/acceptable-use", label: "Acceptable Use" },
  { href: "/data-requests", label: "Your Data Rights" },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)]">
        {title}
      </h2>
      <ul className="mt-3 space-y-2 text-sm">{children}</ul>
    </nav>
  );
}

export default function SiteLegalFooter() {
  return (
    <footer className="border-t border-black/[0.06] mt-16">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </span>
              <span className="text-base font-semibold text-[var(--color-ink)]">Creata</span>
            </Link>
            <p className="mt-3 text-sm text-[var(--color-ink-soft)] max-w-xs">
              AI-native lead generation. Find the people who already said they need what you
              sell.
            </p>
          </div>

          <Group title="Product">
            {PRODUCT_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </Group>

          <Group title="Leads by platform">
            {PLATFORM_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
          </Group>

          <Group title="Legal">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <CookieSettingsButton />
            </li>
            <li>
              <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
                Contact
              </a>
            </li>
          </Group>
        </div>

        <div className="mt-10 border-t border-black/[0.06] pt-6">
          <p className="text-sm text-[var(--color-ink-soft)]">
            &copy; {new Date().getFullYear()} Creata. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
