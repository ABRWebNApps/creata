import test from "node:test";
import assert from "node:assert/strict";
import { getPublicClientIp, lookupSignupGeo } from "../lib/geo.ts";
import { CONSENT_POLICY_VERSION, allowsOptionalScript, parseConsent } from "../lib/consent.ts";
import { NEGATIVE_ADJACENCY, filterRelevantLeads, isHardRejected, parseJudgementJson, scoreJudgement, validateProblemAnalysis, validateQueryUnderstanding } from "../lib/lead-quality.ts";
import { safeAuthRedirectPath } from "../lib/auth-redirect.ts";

test("auth callback redirects stay on the app origin", () => {
  assert.equal(safeAuthRedirectPath("/onboarding"), "/onboarding");
  assert.equal(safeAuthRedirectPath(null), "/");
  assert.equal(safeAuthRedirectPath("//evil.example"), "/");
  assert.equal(safeAuthRedirectPath("https://evil.example"), "/");
  assert.equal(safeAuthRedirectPath("/\\evil.example"), "/");
});

test("geo uses the default client IP headers and rejects private addresses", () => {
  const original = process.env.TRUSTED_PROXY_IPS;
  delete process.env.TRUSTED_PROXY_IPS;
  try {
    assert.equal(getPublicClientIp(new Headers({ "x-forwarded-for": "203.0.113.12, 8.8.8.8" })), "203.0.113.12");
    assert.equal(getPublicClientIp(new Headers({ "x-forwarded-for": "10.0.0.2, 127.0.0.1", "x-real-ip": "192.168.1.9" })), null);
    assert.equal(getPublicClientIp(new Headers({ "x-forwarded-for": "2001:4860:4860::8888, 2001:4860:4860::1" })), "2001:4860:4860::8888");
    assert.equal(getPublicClientIp(new Headers({ "x-real-ip": "203.0.113.12", "x-forwarded-for": "8.8.8.8" })), "203.0.113.12");
    process.env.TRUSTED_PROXY_IPS = "8.8.8.8";
    assert.equal(getPublicClientIp(new Headers({ "x-forwarded-for": "203.0.113.12, 8.8.8.8" })), "203.0.113.12");
  } finally { if (original === undefined) delete process.env.TRUSTED_PROXY_IPS; else process.env.TRUSTED_PROXY_IPS = original; }
});

test("geo currency rule maps Nigeria to NGN and other/unknown countries to USD", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response("NG", { status: 200 });
    assert.equal((await lookupSignupGeo("8.8.8.8")).currency, "NGN");
    for (const country of ["US", "GB"]) {
      globalThis.fetch = async () => new Response(country, { status: 200 });
      assert.equal((await lookupSignupGeo("8.8.8.8")).currency, "USD");
    }
    globalThis.fetch = async () => new Response("unknown", { status: 200 });
    assert.deepEqual(await lookupSignupGeo("8.8.8.8"), { countryCode: null, source: "unknown", currency: "USD" });
    assert.deepEqual(await lookupSignupGeo(null), { countryCode: null, source: "unknown", currency: "USD" });
  } finally { globalThis.fetch = originalFetch; }
});

test("optional scripts are gated by a valid current-version consent record", () => {
  assert.equal(allowsOptionalScript(null, "analytics"), false);
  const oldPolicy = parseConsent(JSON.stringify({ version: "old", timestamp: new Date().toISOString(), choices: { preferences: true, analytics: true, marketing: true } }));
  assert.equal(allowsOptionalScript(oldPolicy, "analytics"), false);
  const current = parseConsent(JSON.stringify({ version: CONSENT_POLICY_VERSION, timestamp: new Date().toISOString(), choices: { necessary: true, preferences: false, analytics: true, marketing: false } }));
  assert.equal(allowsOptionalScript(current, "analytics"), true);
  assert.equal(allowsOptionalScript(current, "marketing"), false);
});

test("lead scoring uses configured weights and strict JSON schemas fail closed", () => {
  const judgement = { category_match: 1, caption_intent: 1, profile_match: 1, geo_match: 1, account_type: "business", reasons: [], red_flags: [] };
  assert.equal(scoreJudgement(judgement), 1);
  assert.equal(parseJudgementJson(JSON.stringify(judgement)).account_type, "business");
  assert.equal(parseJudgementJson('{"category_match":2}'), null);
  assert.equal(validateQueryUnderstanding({ target_category: "furniture", subcategories: [], synonyms: [], must_be: ["retailer"], must_not_be: ["real estate"], geo_filter: null, intent: "find sellers" }), true);
  assert.equal(validateProblemAnalysis({ what_is_broken: [{ claim: "unclear CTA", evidence: "Profile says 'DM for details'" }], severity: "low", likely_pain_points: [], missed_opportunities: [], how_we_can_help: "Offer a catalogue", suggested_opener: "Question", confidence: 0.5 }), true);
  assert.equal(validateProblemAnalysis({ what_is_broken: [{ claim: "unsupported", evidence: "" }], severity: "low", confidence: 4 }), false);
});

test("furniture adjacency excludes real estate and media accounts before scoring", () => {
  assert.ok(NEGATIVE_ADJACENCY.furniture.includes("real estate"));
  for (let i = 0; i < 20; i++) {
    const candidate = i % 10 === 0 ? { bio: "Real estate realtor" } : i % 10 === 1 ? { bio: "Furniture News channel" } : { bio: "Furniture maker and showroom. Shop our products." };
    const isRelevantLabel = i % 10 !== 0 && i % 10 !== 1;
    if (!isRelevantLabel) assert.equal(isHardRejected("furniture", candidate), true);
  }
});

test("relevance pipeline rejects adjacency before the model and fails closed on invalid output", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "unit-test-key";
  try {
    let calls = 0;
    globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ results: [{ category_match: 0.9, caption_intent: 0.8, profile_match: 0.9, geo_match: 0.8, account_type: "business", reasons: ["Furniture showroom"], red_flags: [] }] }) } }] }), { status: 200 }); };
    const relevant = await filterRelevantLeads("furniture", [{ handle: "maker", nickname: "Oak Furniture", bio: "Furniture maker and showroom. Shop our products.", category: "Furniture", matched_caption: "I need a custom table" }]);
    assert.equal(relevant.length, 1);
    assert.ok(relevant[0].relevance_score >= 0.7);
    assert.equal(relevant[0].problem_analysis.what_is_broken[0].evidence, "I need a custom table");
    const before = calls;
    const rejected = await filterRelevantLeads("furniture", [{ handle: "realtor", nickname: "Property agent", bio: "Real estate realtor" }]);
    assert.equal(rejected.length, 0);
    assert.equal(calls, before, "negative adjacency hard-rejects before LLM scoring");
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: "not JSON" } }] }), { status: 200 });
    assert.deepEqual(await filterRelevantLeads("solar installers", [{ handle: "installer", nickname: "Solar installer", bio: "Solar installer business" }]), []);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY; else process.env.OPENROUTER_API_KEY = originalKey;
  }
});
