"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { value: 5, suffix: "", label: "Platforms searched from one query" },
  { value: 3, suffix: "s", label: "to first live match" },
  { value: 0, suffix: "", label: "Leads handed over with no reason attached" },
];

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCount(target);
      return;
    }

    const frames = 30;
    const step = target / frames;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      setCount(Math.min(Math.round(step * frame), target));
      if (frame >= frames) clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [visible, target]);

  const display = target === 0 ? "0" : `${count}${suffix}`;

  return (
    <div ref={ref} className="text-center sm:text-left">
      <p className="text-4xl sm:text-5xl font-display font-bold text-blue-600 mb-1 tracking-tight">
        {visible ? display : target === 0 ? "0" : `0${suffix}`}
      </p>
      <p className="text-sm text-[var(--color-ink-soft)] leading-snug max-w-[200px]">
        {label}
      </p>
    </div>
  );
}

export default function StatBar() {
  return (
    <section className="py-14 sm:py-20">
      <div className="max-w-[1180px] mx-auto px-[20px] sm:px-8">
        <div className="flex flex-col sm:flex-row gap-10 sm:gap-16 sm:items-start">
          {STATS.map((stat, i) => (
            <StatCounter key={i} target={stat.value} suffix={stat.suffix} label={stat.label} />
          ))}
        </div>
      </div>
    </section>
  );
}