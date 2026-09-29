import { NextRequest, NextResponse } from "next/server";
import { expandQueryTerms } from "../../search/utils";
import { NEGATIVE_ADJACENCY, validateQueryUnderstanding, type QueryUnderstanding } from "@/lib/lead-quality";

// Fallback keyword generation when AI fails (no API cost)
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
};

function generateFallbackKeywords(query: string): { niche: string; keywords: string[] } {
  const q = query.toLowerCase().trim();

  // Priority 1: best key-match — query contains a niche key. Pick longest match for specificity.
  const keyMatches: { niche: string; keywords: string[]; score: number }[] = [];
  for (const [niche, words] of Object.entries(FALLBACK_KEYWORDS)) {
    if (q.includes(niche)) {
      keyMatches.push({ niche, keywords: words, score: niche.length });
    }
  }
  if (keyMatches.length > 0) {
    keyMatches.sort((a, b) => b.score - a.score); // longest key match wins
    return { niche: keyMatches[0].niche, keywords: keyMatches[0].keywords.slice(0, 4) };
  }

  // Priority 2: value-match — a keyword value appears in the query. Pick the most specific (longest matching word).
  const valueMatches: { niche: string; keywords: string[]; matchedWord: string }[] = [];
  for (const [niche, words] of Object.entries(FALLBACK_KEYWORDS)) {
    for (const w of words) {
      if (q.includes(w)) {
        valueMatches.push({ niche, keywords: words, matchedWord: w });
      }
    }
  }
  if (valueMatches.length > 0) {
    valueMatches.sort((a, b) => b.matchedWord.length - a.matchedWord.length); // longest matched value wins
    return { niche: valueMatches[0].niche, keywords: valueMatches[0].keywords.slice(0, 4) };
  }

  // Generic fallback: extract meaningful words from query
  const stopWords = new Set(["find", "get", "me", "for", "the", "a", "an", "i", "in", "of", "to", "is", "on", "and", "or", "with", "by", "from", "at", "are", "that", "this", "how", "what", "why", "when", "where", "who", "influencer", "creator", "leads", "people", "search"]);
  const words = q.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  if (words.length >= 2) return { niche: words[0], keywords: words.slice(0, 4) };
  return { niche: q, keywords: [q, `${q} tips`, `${q} ideas`, `${q} content`] };
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

          const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://creata.app",
                "X-Title": "Creata",
              },
              body: JSON.stringify({
                model: "poolside/laguna-xs-2.1:free",
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
