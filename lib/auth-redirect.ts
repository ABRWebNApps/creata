/** Resolve an auth redirect to a safe same-origin path. */
export function safeAuthRedirectPath(value: string | null, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
