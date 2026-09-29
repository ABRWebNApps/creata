export const CONSENT_POLICY_VERSION = "2026-09-29";
export const CONSENT_COOKIE_NAME = "creata_consent";

export type ConsentChoices = {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
};

export type ConsentRecord = {
  version: string;
  timestamp: string;
  choices: ConsentChoices;
};

export const necessaryOnly: ConsentChoices = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

export function allowsOptionalScript(record: ConsentRecord | null, category: "preferences" | "analytics" | "marketing"): boolean {
  return record?.version === CONSENT_POLICY_VERSION && record.choices[category] === true;
}

export function parseConsent(value: string | null): ConsentRecord | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ConsentRecord>;
    if (parsed.version !== CONSENT_POLICY_VERSION || typeof parsed.timestamp !== "string" || !Number.isFinite(Date.parse(parsed.timestamp)) || !parsed.choices) return null;
    const { preferences, analytics, marketing } = parsed.choices as ConsentChoices;
    if ([preferences, analytics, marketing].some((choice) => typeof choice !== "boolean")) return null;
    return {
      version: CONSENT_POLICY_VERSION,
      timestamp: parsed.timestamp,
      choices: { necessary: true, preferences, analytics, marketing },
    };
  } catch {
    return null;
  }
}
