"use client";

const CHANNELS = ["TikTok", "Instagram", "X", "LinkedIn", "Facebook"];

export default function ChannelMarquee() {
  return (
    <section className="py-10 sm:py-14">
      <div className="marquee-track">
        <div className="marquee-content">
          {/* First set */}
          {CHANNELS.map((name) => (
            <span
              key={name}
              className="mx-10 text-2xl sm:text-3xl italic font-display text-[var(--color-ink-soft)] opacity-60 hover:opacity-100 transition-opacity"
            >
              {name}
            </span>
          ))}
          {/* Duplicate for seamless loop */}
          {CHANNELS.map((name) => (
            <span
              key={`dup-${name}`}
              className="mx-10 text-2xl sm:text-3xl italic font-display text-[var(--color-ink-soft)] opacity-60 hover:opacity-100 transition-opacity"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}