import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * These are the browser-side controls that NDPC expects to see, and they are
 * also what keeps hosting providers and platform partners from flagging the
 * site. The CSP is deliberately written against what the app actually loads
 * (Next.js inline bootstrap, Supabase auth/API, external avatar images).
 *
 * If a feature breaks after a deploy, widen the specific directive below rather
 * than removing the header:
 *   - Supabase calls blocked      -> add the host to connect-src
 *   - avatar / og image blocked   -> it is covered by img-src https:, check the
 *                                    URL scheme is https
 *   - an embedded player blocked  -> add its origin to frame-src
 *   - a font blocked              -> add its origin to font-src
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = SUPABASE_URL ? new URL(SUPABASE_URL).origin : "";
const supabaseWs = supabaseOrigin.replace(/^https:/, "wss:");

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js ships an inline bootstrap, so 'unsafe-inline' is required here.
  "script-src 'self' 'unsafe-inline' https://js.paystack.co",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    supabaseOrigin,
    supabaseWs,
    "https://api.paystack.co",
    "https://ipapi.co",
  ]
    .filter(Boolean)
    .join(" "),
  "frame-src 'self' https://js.paystack.co https://checkout.paystack.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    // Nothing on this site needs a camera, microphone or precise location.
    value:
      "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Do not advertise the framework.
  poweredByHeader: false,
  // Never ship source maps to the browser.
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
