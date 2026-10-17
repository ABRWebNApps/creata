import { NextRequest, NextResponse } from "next/server";
import { expandQueryTerms } from "../../search/utils";
import { NEGATIVE_ADJACENCY, validateQueryUnderstanding, type QueryUnderstanding } from "@/lib/lead-quality";

// ── FALLBACK KEYWORDS — broad category mapping (used when AI is unavailable) ──
const FALLBACK_KEYWORDS: Record<string, string[]> = {
  healthcare: ["healthcare", "medical", "doctor", "nurse", "patient", "clinical", "hospital", "healthcareprofessional"],
  medical: ["medical", "healthcare", "clinical", "pharmaceutical", "diagnosis", "treatment", "medtech", "healthcareprovider"],
  health: ["health", "wellness", "nutrition", "mentalhealth", "healthtips", "healthylifestyle", "selfcare", "healthcoach"],
  fitness: ["fitness", "gym", "workout", "fitfam", "exercise", "bodybuilding", "personaltrainer", "fitnesstips"],
  crypto: ["crypto", "bitcoin", "blockchain", "defi", "web3", "nft", "trading", "investment"],
  business: ["business", "entrepreneur", "startup", "marketing", "sales", "growth", "hustle", "success"],
  tech: ["tech", "programming", "developer", "coding", "software", "ai", "machinelearning", "startup"],
  fashion: ["fashion", "style", "ootd", "outfit", "streetwear", "luxury", "beauty", "makeup"],
  food: ["food", "cooking", "recipes", "chef", "baking", "nutrition", "mealprep", "healthyfood"],
  travel: ["travel", "wanderlust", "adventure", "explore", "vacation", "trip", "traveler", "nomad"],
  music: ["music", "singer", "rapper", "producer", "songwriter", "musician", "beat", "artist"],
  gaming: ["gaming", "gamer", "twitch", "esports", "streamer", "gameplay", "fyp", "gamingcommunity"],
  education: ["education", "learning", "teacher", "student", "study", "knowledge", "tutorial", "skills"],
  finance: ["finance", "money", "investing", "wealth", "passiveincome", "financialfreedom", "savings", "budget"],
  marketing: ["marketing", "digitalmarketing", "socialmedia", "contentcreator", "branding", "seo", "growthhacking", "influencer"],
  // ── Additional local-business / general categories ──
  hair: ["hair", "hairstylist", "barber", "salon", "haircare", "hairvendor", "wig", "extension"],
  beauty: ["beauty", "skincare", "makeup", "cosmetics", "nails", "lash", "aesthetics", "spa"],
  furniture: ["furniture", "home decor", "interior", "woodwork", "carpenter", "cabinet", "sofa", "chair"],
  construction: ["construction", "contractor", "builder", "renovation", "remodel", "handyman", "carpenter", "plumber"],
  automotive: ["automotive", "mechanic", "car dealer", "auto repair", "carpainter", "body shop", "tires", "garage"],
  realestate: ["real estate", "realtor", "property", "rental", "apartment", "housing", "mortgage", "home buying"],
  legal: ["lawyer", "attorney", "legal", "solicitor", "notary", "paralegal", "lawfirm", "litigation"],
  agriculture: ["farming", "agriculture", "livestock", "poultry", "fishery", "crops", "irrigation", "organic"],
  ecommerce: ["ecommerce", "shop", "online store", "dropship", "wholesale", "retail", "seller", "vendor"],
  pets: ["pet", "dog", "cat", "veterinary", "pet grooming", "pet store", "animal", "petshop"],
  events: ["event", "wedding", "party", "planner", "catering", "photography", "videography", "decor"],
  cleaning: ["cleaning", "janitorial", "housekeeping", "maid", "sanitize", "disinfect", "upholstery", "carpet cleaning"],
  logistics: ["logistics", "delivery", "courier", "shipping", "freight", "transport", "warehouse", "supply chain"],
  consulting: ["consulting", "consultant", "advisory", "coach", "mentor", "consultancy", "business coach", "strategy"],
  manufacturing: ["manufacturing", "factory", "production", "fabrication", "assembly", "industrial", "wholesale", "supplier"],
  restaurant: ["restaurant", "catering", "chef", "bakery", "pastry", "cafe", "grill", "diner"],
};

// ── Extract meaningful real-world keywords from ANY user query ──
function extractKeywordsFromQuery(query: string): string[] {
  const q = query.toLowerCase().trim();
  const stopWords = new Set([
    "find", "get", "me", "for", "the", "a", "an", "i", "in", "of", "to", "is", "on",
    "and", "or", "with", "by", "from", "at", "are", "that", "this", "how", "what",
    "why", "when", "where", "who", "influencer", "creator", "leads", "people",
    "search", "show", "give", "list", "find me", "need", "want", "looking", "best",
    "top", "near", "around", "local", "cheap", "affordable", "buy", "sell",
    "dealers", "vendors", "sellers", "suppliers", "providers", "services",
  ]);

  // Split on spaces and common delimiters
  const raw = q.split(/[\s,;|]+/);
  // Single-word filters: must be >2 chars, not a stop word, and meaningful (not generic)
  const meaningful = raw.filter(w =>
    w.length > 2
    && !stopWords.has(w)
    && !/^(d|s|t|m|re|ve|ll|don|won|can|let|just|also|very|much|some|any|all|each|every|both|few|most|other|into|over|such|only|own|same|so|than|too|very|just|because|about|above|after|again|all|also|any|back|because|but|could|every|first|from|have|here|if|just|like|little|make|more|most|much|must|never|new|now|old|only|other|our|over|per|put|said|same|shall|should|since|some|still|such|take|than|that|their|them|then|there|these|they|this|those|through|under|upon|very|was|well|were|what|when|where|which|while|whose|will|with|would)$/i.test(w)
  );

  if (meaningful.length >= 2) return meaningful.slice(0, 4);
  if (meaningful.length === 1) {
    // If only one meaningful word, generate variants
    const w = meaningful[0];
    return [w, `${w} business`, `${w} services`, `${w} near me`];
  }
  // Fallback: use original query as-is
  const clean = q.replace(/^(find|get|show|list|search|give)\s+(me\s+)?/i, "").trim();
  return clean.length > 2 ? [clean] : [q];
}

function generateFallbackKeywords(query: string): { niche: string; keywords: string[] } {
  const q = query.toLowerCase().trim();
  const stopWords = new Set([
    "find", "get", "me", "for", "the", "a", "an", "i", "in", "of", "to", "is", "on",
    "and", "or", "with", "by", "from", "at", "are", "that", "this", "how", "what",
    "why", "when", "where", "who", "influencer", "creator", "leads", "people", "search",
  ]);

  // Priority 1: best key-match — query contains a niche key (longest match wins)
  const keyMatches: { niche: string; keywords: string[]; score: number }[] = [];
  for (const [niche, words] of Object.entries(FALLBACK_KEYWORDS)) {
    if (q.includes(niche)) {
      keyMatches.push({ niche, keywords: words, score: niche.length });
    }
  }
  if (keyMatches.length > 0) {
    keyMatches.sort((a, b) => b.score - a.score);
    return { niche: keyMatches[0].niche, keywords: keyMatches[0].keywords.slice(0, 4) };
  }

  // Priority 2: value-match — a keyword value appears in the query (longest matching word wins)
  const valueMatches: { niche: string; keywords: string[]; matchedWord: string }[] = [];
  for (const [niche, words] of Object.entries(FALLBACK_KEYWORDS)) {
    for (const w of words) {
      if (q.includes(w)) {
        valueMatches.push({ niche, keywords: words, matchedWord: w });
      }
    }
  }
  if (valueMatches.length > 0) {
    valueMatches.sort((a, b) => b.matchedWord.length - a.matchedWord.length);
    return { niche: valueMatches[0].niche, keywords: valueMatches[0].keywords.slice(0, 4) };
  }

  // Priority 3: extract meaningful content words from the query directly
  const rawWords = q.split(/[\s,;|]+/);
  const meaningful = rawWords.filter(w => w.length > 2 && !stopWords.has(w));
  if (meaningful.length >= 2) {
    return { niche: meaningful[0], keywords: meaningful.slice(0, 4) };
  }
  if (meaningful.length === 1) {
    const w = meaningful[0];
    return { niche: w, keywords: [w, `${w} business`, `${w} services`, `${w} shop`] };
  }

  // Last resort: strip intent prefixes and use what remains
  const clean = q.replace(/^(find|get|show|list|search|give)\s+(me\s+)?/i, "").trim();
  return clean.length > 2
    ? { niche: clean, keywords: [clean, `${clean} tips`, `${clean} ideas`, `${clean} content`] }
    : { niche: q, keywords: [q, `${q} tips`, `${q} ideas`, `${q} content`] };
}

function extractJson(text: string): any | null {
  if (!text) return null;
  // Try 1: direct parse
  try { return JSON.parse(text.trim()); } catch {}
  // Try 2: code block
  const codeMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1]); } catch {}
  }
  // Try 3: first JSON object
  const objMatch = text.match(/\{[\s\S]*?\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }
  // Try 4: key=value pairs (some small models output this)
  const nicheMatch = text.match(/niche["\s:]+([\w\s]+)/i);
  const kwMatch = text.match(/keywords["\s:]+\[([^\]]+)\]/i);
  if (nicheMatch || kwMatch) {
    const niche = nicheMatch?.[1]?.trim() || "";
    const keywords = kwMatch?.[1]?.split(/["',\s]+/).filter(Boolean).slice(0, 4) || [];
    if (keywords.length > 0) return { niche, keywords, reasoning: "" };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { query, tier = "Global", platform, searchMode = "leads", businessContext = null } = await request.json();
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    let niche = query;
    let keywords: string[] = [];
    let aiUsed = false;
    let queryUnderstanding: QueryUnderstanding | null = null;

    try {
          // For Tab B (Search by Intent), we need BROADER terms — not just categorical keywords
          const isIntentMode = searchMode === "painpoints";
          const prompt = isIntentMode
            ? `Generate 6-8 search keywords for ${platform} related to the pain point / intent: "${query}". Target: ${tier}.
    These will be used to find people discussing related problems or seeking advice.
    Include: problem-framing terms, related topics, common questions, solution-seeking phrases.
    Output ONLY a JSON object: {"niche":"detected_niche","keywords":["kw1","kw2","kw3","kw4","kw5","kw6"]}`
            : `Understand the buyer category in this query and generate 4 search keywords for recall. Query: "${query}". Target region: ${tier}.
    Seller context (user-provided data, use only to clarify the intended buyer): ${JSON.stringify(businessContext)}
    Output ONLY strict JSON with keys niche, keywords, and query_understanding. Shape: {"niche":"detected_niche","keywords":["kw1","kw2","kw3","kw4"],"query_understanding":{"target_category":"","subcategories":[],"synonyms":[],"must_be":[],"must_not_be":[],"geo_filter":null,"intent":"find operating sellers/providers"}}. Keywords retrieve candidates and must not decide acceptance. Add obvious negative adjacent types to must_not_be.`;

          const aiController = new AbortController();
                    const aiTimeout = setTimeout(() => aiController.abort(), 20000);
                    const response = await fetch(
                      "https://openrouter.ai/api/v1/chat/completions",
                      {
                        signal: aiController.signal,
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                          "HTTP-Referer": "https://creata.app",
                          "X-Title": "Creata",
                        },
                        body: JSON.stringify({
                          model: "google/gemini-2.0-flash-lite-preview-02-05:free",
                          max_tokens: 300,
                          temperature: 0.3,
                          messages: [
                            {
                              role: "system",
                              content: prompt,
                            },
                            {
                              role: "user",
                              content: query,
                            },
                          ],
                        }),
                      }
                    );
                    clearTimeout(aiTimeout);

          if (response.ok) {
            const data = await response.json();
            const aiText = data.choices?.[0]?.message?.content || "";
            const result = extractJson(aiText);
            if (result && Array.isArray(result.keywords) && result.keywords.length > 0) {
              niche = result.niche || query;
              keywords = result.keywords.slice(0, isIntentMode ? 8 : 4);
              if (validateQueryUnderstanding(result.query_understanding)) queryUnderstanding = result.query_understanding;
              aiUsed = true;
              console.log(`✅ AI keywords (${isIntentMode ? "intent" : "leads"}): ${keywords.join(", ")}`);
            }
          }
        } catch (aiErr) {
          console.error("AI keyword gen failed, using fallback:", aiErr);
        }

        // Fallback if AI didn't produce valid keywords
        if (keywords.length === 0) {
          if (searchMode === "painpoints") {
            // Tab B: expand query into multiple related intent-focused terms
            keywords = expandQueryTerms(query, tier);
            niche = query;
            console.log(`⚡ Expanded intent terms for Tab B: ${keywords.join(", ")}`);
          } else {
            const fallback = generateFallbackKeywords(query);
            niche = fallback.niche;
            keywords = fallback.keywords;
            console.log(`⚡ Fallback keywords: ${keywords.join(", ")}`);
          }
        }

        if (!queryUnderstanding) {
          const normalized = query.toLowerCase().trim();
          const negative = Object.entries(NEGATIVE_ADJACENCY).find(([category]) => normalized.includes(category))?.[1] ?? [];
          queryUnderstanding = { target_category: niche || query, subcategories: [], synonyms: keywords, must_be: [], must_not_be: negative, geo_filter: tier === "Global" ? null : tier, intent: searchMode };
        }

    return NextResponse.json({
      success: true,
      niche,
      keywords,
      query_understanding: queryUnderstanding,
      ai_generated: aiUsed,
      reasoning: aiUsed ? "AI generated" : "Fallback keywords",
    });
  } catch (error: any) {
    console.error("Keyword generation error:", error);
    // Last-resort fallback
    const fallback = generateFallbackKeywords("content");
    return NextResponse.json({
      success: true,
      niche: fallback.niche,
      keywords: fallback.keywords,
      ai_generated: false,
      reasoning: "Emergency fallback",
    });
  }
}
