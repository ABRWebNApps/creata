"use client";

export default function GlobalBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background" suppressHydrationWarning>
      {/* Subtle dot grid pattern - only on landing */}
      <div className="fixed inset-0 bg-dot-grid opacity-[0.4] pointer-events-none" style={{ zIndex: 0 }} suppressHydrationWarning />
      <div className="relative" style={{ zIndex: 1 }} suppressHydrationWarning>
        {children}
      </div>
    </div>
  );
}