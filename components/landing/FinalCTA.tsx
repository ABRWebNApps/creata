import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-[1180px] mx-auto px-[20px] sm:px-8">
        <div className="rounded-[28px] bg-[var(--color-paper-tint)] p-10 sm:p-16 text-center card-shadow">
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-[var(--color-ink)] mb-4 max-w-lg mx-auto">
            Ready to find people who actually want what you sell?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/auth/signup"
              className="inline-flex items-center px-6 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-[10px] hover:bg-blue-700 transition-colors shadow-card"
            >
              Start finding buyers
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center px-6 py-3.5 text-sm font-semibold rounded-[10px] text-[var(--color-ink)] hover:bg-[rgba(3,22,59,0.06)] transition-colors"
            >
              See how it works
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}