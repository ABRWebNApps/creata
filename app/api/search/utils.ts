// Shared utility functions for lead scraping

export function suggestPainPoints(bio: string | null): string[] {
  if (!bio) return [
    "Needs scalable systems for audience growth and engagement",
    "Looking for strategic partnerships and monetization opportunities",
    "Time management — busy with content creation and operations",
  ];
  const text = bio.toLowerCase();
  const points: string[] = [];

  if (text.includes("market") || text.includes("brand") || text.includes("growth") || text.includes("scale"))
    points.push("Struggling to scale reach or engagement in a crowded market");
  if (text.includes("financ") || text.includes("invest") || text.includes("wealth") || text.includes("money"))
    points.push("Uncertain about investment strategies in the current economy");
  if (text.includes("tech") || text.includes("startup") || text.includes("founder") || text.includes("saas"))
    points.push("Customer acquisition and retention challenges");
  if (text.includes("health") || text.includes("wellness") || text.includes("fitness") || text.includes("nutrition"))
    points.push("Overwhelmed by conflicting health advice — needs trusted guidance");
  if (text.includes("career") || text.includes("job") || text.includes("hire") || text.includes("recruit"))
    points.push("Frustrated with traditional career growth or hiring processes");
  if (text.includes("content") || text.includes("social") || text.includes("influencer"))
    points.push("Content fatigue — difficulty standing out in their niche");
  if (text.includes("coach") || text.includes("consult") || text.includes("mentor"))
    points.push("Difficulty converting followers into paying clients");
  if (text.includes("b2b") || text.includes("enterprise") || text.includes("business") || text.includes("ceo"))
    points.push("Struggling to generate qualified B2B leads and close deals");
  if (text.includes("product") || text.includes("ecommerc") || text.includes("shop") || text.includes("store"))
    points.push("Need help with customer acquisition and conversion optimization");
  if (text.includes("real esta") || text.includes("property") || text.includes("rental"))
    points.push("Finding and qualifying leads in a competitive real estate market");
  if (text.includes("artist") || text.includes("creative") || text.includes("musician") || text.includes("design"))
    points.push("Difficulty monetizing creative work and building sustainable income");
  if (text.includes("marketing") || text.includes("advert") || text.includes("seo"))
    points.push("Need more effective marketing strategies with better ROI tracking");
  if (text.includes("agency") || text.includes("client") || text.includes("freelanc"))
    points.push("Client acquisition is inconsistent — need repeatable pipeline");

  if (points.length < 2) points.push("Needs scalable systems for audience growth and engagement");
  if (points.length < 3) points.push("Looking for strategic partnerships and monetization opportunities");
  return points.slice(0, 3);
}