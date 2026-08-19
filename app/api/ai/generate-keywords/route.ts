import { NextRequest, NextResponse } from "next/server";

// Fallback keyword generation when AI fails (no API cost)
const FALLBACK_KEYWORDS: Record<string, string[]> = {
  fitness: ["fitness", "gym", "workout", "fitfam", "exercise", "health", "bodybuilding", "personaltrainer"],
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
  // Try to match a known niche
  for (const [niche, words] of Object.entries(FALLBACK_KEYWORDS)) {
    if (q.includes(niche) || words.some(w => q.includes(w))) {
      return { niche, keywords: words.slice(0, 4) };
    }
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
    const { query, tier = "Global", platform, searchMode = "leads" } = await request.json();
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    let niche = query;
    let keywords: string[] = [];
    let aiUsed = false;

    try {
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
                content: `Generate 4 search keywords for ${platform}. Query: "${query}". Target: ${tier}.
Output ONLY a JSON object: {"niche":"detected_niche","keywords":["kw1","kw2","kw3","kw4"]}`,
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
          keywords = result.keywords.slice(0, 4);
          aiUsed = true;
          console.log(`✅ AI keywords: ${keywords.join(", ")}`);
        }
      }
    } catch (aiErr) {
      console.error("AI keyword gen failed, using fallback:", aiErr);
    }

    // Fallback if AI didn't produce valid keywords
    if (keywords.length === 0) {
      const fallback = generateFallbackKeywords(query);
      niche = fallback.niche;
      keywords = fallback.keywords;
      console.log(`⚡ Fallback keywords: ${keywords.join(", ")}`);
    }

    return NextResponse.json({
      success: true,
      niche,
      keywords,
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