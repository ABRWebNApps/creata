import { createHash } from "node:crypto";
import { isIP } from "node:net";

/** Returns only a syntactically valid public client IP from proxy headers. */
export function getPublicClientIp(headers: Headers): string | null {
  // Prefer the single-client header set by common hosting ingress. If unavailable,
  // use the conventional leftmost client entry from XFF; an optional exact-IP
  // proxy list enables walking the chain from right to left safely.
  const trustedProxies = new Set((process.env.TRUSTED_PROXY_IPS || "").split(",").map((value) => value.trim()).filter(Boolean));
  const rawForwarded = headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()) ?? [];
  const forwarded = trustedProxies.size ? rawForwarded.reverse() : rawForwarded;
  const candidates = [headers.get("x-real-ip") ?? "", ...forwarded];
  for (const candidate of candidates) {
    if (!candidate || candidate.length > 64 || candidate.includes("%")) continue;
    const normalized = candidate.replace(/^\[|\]$/g, "");
    const family = isIP(normalized);
    if (!family) continue;
    if (trustedProxies.has(normalized)) continue;
    const lower = normalized.toLowerCase();
    const privateV4 = family === 4 && (normalized.startsWith("10.") || normalized.startsWith("127.") || normalized.startsWith("0.") || normalized.startsWith("169.254.") || normalized.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) || normalized.startsWith("100.64.") || normalized === "255.255.255.255");
    const privateV6 = family === 6 && (lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:") || lower.startsWith("ff") || lower.startsWith("::ffff:127.") || lower.startsWith("::ffff:10."));
    if (privateV4 || privateV6) continue;
    return normalized;
  }
  return null;
}

/** Hashes an IP for minimal-retention signup audit metadata. */
export function hashSignupIp(ip: string): string {
  const salt = process.env.SIGNUP_IP_HASH_SALT;
  if (!salt) return "";
  return createHash("sha256").update(salt).update(":").update(ip).digest("hex");
}

/** Resolves country with a 1.5-second ceiling and safe USD fallback. */
export async function lookupSignupGeo(ip: string | null): Promise<{ countryCode: string | null; source: string; currency: "NGN" | "USD" }> {
  if (!ip) return { countryCode: null, source: "unknown", currency: "USD" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch("https://ipapi.co/" + encodeURIComponent(ip) + "/country/", { signal: controller.signal, cache: "no-store" });
    const countryCode = response.ok ? (await response.text()).trim().toUpperCase() : "";
    if (!/^[A-Z]{2}$/.test(countryCode)) return { countryCode: null, source: "unknown", currency: "USD" };
    return { countryCode, source: "ipapi.co", currency: countryCode === "NG" ? "NGN" : "USD" };
  } catch {
    return { countryCode: null, source: "unknown", currency: "USD" };
  } finally {
    clearTimeout(timeout);
  }
}
