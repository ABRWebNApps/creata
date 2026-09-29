import { createHash } from "node:crypto";

/** Returns only a syntactically valid public client IP from proxy headers. */
export function getPublicClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((value) => value.trim()) ?? [];
  const candidates = [...forwarded, headers.get("x-real-ip") ?? ""];
  for (const candidate of candidates) {
    if (!candidate || candidate.length > 64 || candidate.includes("%")) continue;
    const normalized = candidate.replace(/^\[|\]$/g, "");
    const isV4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(normalized);
    const isV6 = normalized.includes(":") && /^[0-9a-f:]+$/i.test(normalized);
    if (!isV4 && !isV6) continue;
    if (isV4 && normalized.split(".").some((part) => Number(part) > 255)) continue;
    if (normalized === "::1" || normalized.startsWith("127.") || normalized.startsWith("10.") || normalized.startsWith("192.168.") || normalized.startsWith("169.254.") || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized) || normalized.toLowerCase().startsWith("fc") || normalized.toLowerCase().startsWith("fd") || normalized.toLowerCase().startsWith("fe80:")) continue;
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