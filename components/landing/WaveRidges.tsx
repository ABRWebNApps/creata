"use client";

import { useEffect, useRef } from "react";

/* ── Wave Ridges ─────────────────────────────────────────────────────────
 * Hidden-line ridgelines (the "Unknown Pleasures" plot) with swells rolling
 * forward. Loops every 12s. Ported from the Scenario "03 Wave Ridges" tile
 * and adapted to fill its container (full-bleed, DPR-aware, resize-aware)
 * and to respect prefers-reduced-motion.
 *
 * Used as the hero background only. Purely decorative — aria-hidden, no
 * pointer events, no layout impact.
 * ─────────────────────────────────────────────────────────────────────── */

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const withAlpha = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

type WaveRidgesProps = {
  className?: string;
  /** Ridge colour (hex). Defaults to Creata ink. */
  color?: string;
  /** Fill behind the ridges — must match the section behind it so nearer
   *  rows occlude the ones behind. */
  background?: string;
  /** Overall stroke-opacity multiplier (0–1). Tune how loud the effect is. */
  opacity?: number;
};

export default function WaveRidges({
  className = "",
  color = "#0b1b33",
  background = "#ffffff",
  opacity = 0.45,
}: WaveRidgesProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let time = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;

    const draw = (t: number) => {
      const u = h / 100;
      const rows = 30;
      const cols = 140;
      // Start the ridge stack at the very top of the hero so the effect
      // fills the band under the nav instead of leaving it blank.
      const top = h * 0.035;
      const bottom = h * 1.04;
      ctx.lineJoin = "round";

      for (let j = 0; j < rows; j++) {
        const k = j / (rows - 1); // 0 = far, 1 = near
        const yb = lerp(top, bottom, Math.pow(k, 1.35));
        const amp = lerp(4, 13, k) * u;
        const pts: [number, number][] = [];

        for (let i = 0; i <= cols; i++) {
          const x = (i / cols) * w;
          const xn = x / h; // aspect-independent coordinate
          const env = Math.exp(-Math.pow((x - w / 2) / (w * 0.26), 2));
          const v =
            0.55 * Math.sin(xn * 6.1 + j * 0.55 - TAU * (t / 3)) +
            0.3 * Math.sin(xn * 11.3 - j * 0.31 - TAU * (t / 2) + 1.7) +
            0.15 * Math.sin(xn * 19.7 + j * 0.9 - TAU * (t / 1.5) + 0.4);
          pts.push([
            x,
            yb - amp * (0.12 + env * (0.65 + 0.35 * v)) - amp * 0.25 * env * v,
          ]);
        }

        // Occlude the rows behind, then stroke.
        ctx.beginPath();
        ctx.moveTo(0, h + 2);
        for (const [x, y] of pts) ctx.lineTo(x, y);
        ctx.lineTo(w, h + 2);
        ctx.closePath();
        ctx.fillStyle = background;
        ctx.fill();

        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.strokeStyle = withAlpha(color, lerp(0.55, 1, k) * opacity);
        ctx.lineWidth = lerp(0.22, 0.42, k) * u;
        ctx.stroke();
      }
    };

    const render = (t: number) => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
      draw(((t % 12) + 12) % 12);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
    };

    resize();

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            resize();
            render(time);
          })
        : null;
    ro?.observe(canvas);

    if (reduced) {
      render(0);
    } else {
      const frame = (now: number) => {
        time += (now - last) / 1000;
        last = now;
        render(time);
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [color, background, opacity]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
    />
  );
}
