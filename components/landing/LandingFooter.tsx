import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="border-t border-[rgba(3,22,59,0.06)] py-10">
      <div className="max-w-[1180px] mx-auto px-[20px] sm:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="text-base font-semibold text-[var(--color-ink)]">Creata</span>
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-4 text-sm flex-wrap justify-center">
            <Link href="/pricing" className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
              Pricing
            </Link>
            <Link href="/leads/platform/tiktok" className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
              TikTok leads
            </Link>
            <Link href="/leads/platform/instagram" className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
              Instagram leads
            </Link>
            <Link href="/leads/platform/linkedin" className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
              LinkedIn leads
            </Link>
            <a href="mailto:support@creata.tech" className="text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] transition-colors">
              Contact
            </a>
          </nav>
        </div>
        <p className="text-sm text-[var(--color-ink-soft)] text-center sm:text-left mt-8 sm:mt-6">
          &copy; {new Date().getFullYear()} Creata. All rights reserved.
        </p>
      </div>
    </footer>
  );
}