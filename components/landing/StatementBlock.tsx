"use client";

import { useEffect, useRef } from "react";

export default function StatementBlock() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="reveal-on-scroll bg-statement text-white py-20 sm:py-36 px-[20px] sm:px-8"
    >
      <div className="max-w-[1180px] mx-auto">
        <div className="max-w-3xl">
          <p className="text-2xl sm:text-4xl lg:text-5xl font-display font-bold italic leading-[1.15] mb-5 sm:mb-6">
            We don&apos;t sell you a list of profiles.
            <br />
            We sell you the second somebody said, out loud, that they needed this.
          </p>
          <p className="text-sm sm:text-lg text-white/60 leading-relaxed mb-6 sm:mb-8 max-w-2xl">
            Most lead tools sort by follower count and hope. Creata surfaces the actual pain behind every post — then tells you exactly how to start the conversation. Intent data plus pain point analysis. That&apos;s the difference between a lead and a customer.
          </p>
          <p className="text-xs sm:text-sm text-white/40 font-display italic">
            — Creata, Lead &amp; Customer Acquisition Platform
          </p>
        </div>
      </div>
    </section>
  );
}