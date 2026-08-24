"use client";

import { useState, useEffect, use } from "react";
import {
  Mail,
  MessageCircle,
  ExternalLink,
  Trash2,
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
  TrendingUp,
  Users,
  Heart,
  Video,
  Instagram,
  Calendar,
  Globe,
  CheckCircle,
  FolderOpen,
  ChevronDown,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type LeadProfile = {
  id: string;
  handle: string;
  nickname: string;
  platform: string;
  profile_url: string;
  avatar_url: string | null;
  bio: string | null;
  bio_link: string | null;
  verified: boolean;
  followers: number;
  engagement_rate: number;
  email: string | null;
  instagram_handle: string | null;
  is_tracked: boolean;
  notes: string | null;
  tags: string[] | null;
  pain_points: string[] | null;
  category_id: string | null;
  created_at: string;
};

type PainPoint = {
  text: string;
  severity: "high" | "medium" | "low";
  category: string;
  evidence: string;
  solution: string;
};

// Generate structured pain point analysis from bio text
function analyzePainPoints(bio: string | null): PainPoint[] {
  if (!bio) return [];
  const text = bio.toLowerCase();
  const points: PainPoint[] = [];

  if (text.includes("market") || text.includes("brand") || text.includes("growth")) {
    points.push({
      text: "Struggling to scale reach or engagement in a crowded market",
      severity: "high",
      category: "Growth",
      evidence: bio.length > 60 ? 'Bio mentions "' + extractPhrase(bio, ["market", "brand", "growth"]) + '"' : "Indicated by bio context",
      solution: "Position as a growth partner — offer audience expansion strategy, cross-platform repurposing, or viral campaign concepts"
    });
  }
  if (text.includes("financ") || text.includes("invest") || text.includes("wealth") || text.includes("money")) {
    points.push({
      text: "Uncertain about investment strategies in the current economy",
      severity: "high",
      category: "Finance",
      evidence: bio.length > 60 ? 'Bio mentions "' + extractPhrase(bio, ["financ", "invest", "wealth", "money"]) + '"' : "Indicated by bio context",
      solution: "Approach with educational content partnerships — offer to create branded finance explainers or sponsored market analysis"
    });
  }
  if (text.includes("tech") || text.includes("startup") || text.includes("founder") || text.includes("saas")) {
    points.push({
      text: "Customer acquisition and retention challenges",
      severity: "high",
      category: "SaaS",
      evidence: bio.length > 60 ? 'Bio mentions "' + extractPhrase(bio, ["tech", "startup", "founder", "saas"]) + '"' : "Indicated by bio context",
      solution: "Offer B2B lead gen or case study collabs — founders value proven ROI and tangible results over vanity metrics"
    });
  }
  if (text.includes("health") || text.includes("wellness") || text.includes("fitness") || text.includes("nutrition")) {
    points.push({
      text: "Overwhelmed by conflicting health advice — needs trusted guidance",
      severity: "medium",
      category: "Health",
      evidence: bio.length > 60 ? 'Bio mentions "' + extractPhrase(bio, ["health", "wellness", "fitness", "nutrition"]) + '"' : "Indicated by bio context",
      solution: "Propose co-branded wellness challenges or science-backed content series — this audience craves authority and trust"
    });
  }
  if (text.includes("career") || text.includes("job") || text.includes("hire") || text.includes("recruit")) {
    points.push({
      text: "Frustrated with traditional career growth or hiring processes",
      severity: "medium",
      category: "Career",
      evidence: bio.length > 60 ? 'Bio mentions "' + extractPhrase(bio, ["career", "job", "hire", "recruit"]) + '"' : "Indicated by bio context",
      solution: "Pitch as a career development resource — resume tools, interview prep sponsorships, or hiring platform integrations"
    });
  }
  if (text.includes("content") || text.includes("social") || text.includes("influencer")) {
    points.push({
      text: "Content fatigue — difficulty standing out in their niche",
      severity: "medium",
      category: "Content",
      evidence: bio.length > 60 ? 'Bio mentions "' + extractPhrase(bio, ["content", "social", "influencer"]) + '"' : "Indicated by bio context",
      solution: "Offer fresh content formats or series concepts — provide production value, unique angles, or data-driven storytelling"
    });
  }
  if (text.includes("coach") || text.includes("consult") || text.includes("mentor")) {
    points.push({
      text: "Difficulty converting followers into paying clients",
      severity: "high",
      category: "Monetization",
      evidence: bio.length > 60 ? 'Bio mentions "' + extractPhrase(bio, ["coach", "consult", "mentor"]) + '"' : "Indicated by bio context",
      solution: "Propose funnel-building partnerships — lead magnets, paid webinar collabs, or affiliate-driven course launches"
    });
  }
  if (text.includes("b2b") || text.includes("enterprise") || text.includes("ceo")) {
    points.push({
      text: "Struggling to generate qualified B2B leads and close deals",
      severity: "high",
      category: "B2B",
      evidence: bio.length > 60 ? 'Bio mentions "' + extractPhrase(bio, ["b2b", "enterprise", "ceo"]) + '"' : "Indicated by bio context",
      solution: "Offer account-based marketing support or LinkedIn thought leadership ghosting — B2B plays value trust over reach"
    });
  }
  if (text.includes("product") || text.includes("ecommerc") || text.includes("shop") || text.includes("store")) {
    points.push({
      text: "Need help with customer acquisition and conversion optimization",
      severity: "medium",
      category: "E-commerce",
      evidence: bio.length > 60 ? 'Bio mentions "' + extractPhrase(bio, ["product", "ecommerc", "shop", "store"]) + '"' : "Indicated by bio context",
      solution: "Propose UGC campaigns or affiliate partnerships — product-based sellers need reliable traffic and conversion lift"
    });
  }
  if (text.includes("art") || text.includes("creative") || text.includes("musician") || text.includes("design")) {
    points.push({
      text: "Difficulty monetizing creative work and building sustainable income",
      severity: "high",
      category: "Creative",
      evidence: bio.length > 60 ? 'Bio mentions "' + extractPhrase(bio, ["art", "creative", "musician", "design"]) + '"' : "Indicated by bio context",
      solution: "Offer platform partnerships or sponsored commissions — creatives value brand deals that respect their artistic integrity"
    });
  }
  if (text.includes("agency") || text.includes("client") || text.includes("freelanc")) {
    points.push({
      text: "Client acquisition is inconsistent — need repeatable pipeline",
      severity: "medium",
      category: "Agency",
      evidence: bio.length > 60 ? 'Bio mentions "' + extractPhrase(bio, ["agency", "client", "freelanc"]) + '"' : "Indicated by bio context",
      solution: "Propose referral partnerships or co-marketing — agencies need predictable lead flow and value cross-referrals"
    });
  }

  // If no specific pain points detected, add generic ones
  if (points.length === 0) {
    points.push({
      text: "Audience growth has plateaued — needs fresh strategies",
      severity: "medium",
      category: "Growth",
      evidence: "Inferred from profile context",
      solution: "Offer audience analysis with actionable growth tactics — provide data-backed recommendations tailored to their niche"
    });
    points.push({
      text: "Time management — too busy creating content to focus on partnerships",
      severity: "low",
      category: "Operations",
      evidence: "Inferred from profile context",
      solution: "Present as a done-for-you partnership solution — handle the collab logistics so they can focus on content"
    });
  }

  return points.slice(0, 3);
}

function extractPhrase(bio: string, keywords: string[]): string {
  const sentences = bio.split(/[.!\n]/);
  for (const s of sentences) {
    const lower = s.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw)) return s.trim().slice(0, 80);
    }
  }
  return "..." + keywords[0] + "...";
}

export default function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [lead, setLead] = useState<LeadProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const router = useRouter();

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    };

  useEffect(() => {
    if (resolvedParams?.id) {
      fetchLead();
    }
  }, [resolvedParams?.id]);

  const fetchLead = async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/leads/${resolvedParams.id}`, { headers });
      if (!response.ok) throw new Error("Failed to fetch lead");
      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setLead(result.lead);
            setNotes(result.lead.notes || "");
      
            // Load categories
            const catHeaders = await getAuthHeaders();
            const catRes = await fetch("/api/categories", { headers: catHeaders });
            if (catRes.ok) {
              const catData = await catRes.json();
              setCategories(catData.categories || []);
            }
    } catch (error) {
      console.error("Error fetching lead:", {
        message: error instanceof Error ? error.message : String(error),
        error: error,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTracked = async () => {
      if (!lead) return;
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ is_tracked: !lead.is_tracked }),
        });

      if (response.ok) {
        setLead({ ...lead, is_tracked: !lead.is_tracked });
      }
    } catch (error) {
      console.error("Error updating lead:", error);
    }
  };

  const saveNotes = async () => {
      if (!lead) return;
      setSavingNotes(true);
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/leads/${lead.id}`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        });

      if (response.ok) {
        alert("Notes saved!");
      }
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const deleteLead = async () => {
      if (!lead) return;
      if (!confirm("Are you sure you want to delete this lead?")) return;

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/leads/${lead.id}`, {
          method: "DELETE",
          headers,
        });

      if (response.ok) {
        router.push("/leads");
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Failed to delete lead");
    }
  };

  const changeCategory = async (categoryId: string | null) => {
      if (!lead) return;
      try {
        const headers = await getAuthHeaders();
        await fetch("/api/categories", {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ lead_ids: [lead.id], category_id: categoryId }),
        });
        setLead({ ...lead, category_id: categoryId });
        setShowCategoryPicker(false);
      } catch (error) {
        console.error("Error changing category:", error);
      }
    };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center transition-colors duration-300">
        <div className="text-center px-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Lead not found
          </h2>
          <Link
            href="/leads"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            ← Back to My Leads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-sm border-b border-white/20 dark:border-gray-700/50 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/leads"
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium hidden xs:inline">
                Back to Leads
              </span>
            </Link>
            <button
              onClick={deleteLead}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Profile Card - Glassmorphism */}
        <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 mb-6 overflow-x-hidden transition-colors duration-300">
          {/* Cover Background */}
          <div className="h-32 sm:h-48 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 relative overflow-hidden rounded-t-2xl sm:rounded-t-3xl">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          {/* Profile Info */}
          <div className="px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 pt-0 relative">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-12 sm:-mt-16 relative z-10">
              <img
                src={lead.avatar_url ?? undefined}
                alt={lead.nickname}
                className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-2xl sm:rounded-3xl border-4 border-white dark:border-gray-800 shadow-xl object-cover mx-auto sm:mx-0"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove(
                    "hidden"
                  );
                }}
              />
              <div className="hidden w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-2xl sm:rounded-3xl border-4 border-white dark:border-gray-800 shadow-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl sm:text-4xl lg:text-5xl mx-auto sm:mx-0">
                {lead.nickname.charAt(0)}
              </div>

              {/* Name & Handle */}
              <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0 sm:mb-4 relative z-20">
                <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 py-3 shadow-lg border border-white/50 dark:border-gray-700/50 mb-3 sm:bg-white/90 dark:sm:bg-gray-800/90 sm:backdrop-blur-md sm:rounded-xl sm:px-5 sm:py-4 sm:shadow-xl transition-colors duration-300">
                  <div className="flex items-center justify-center sm:justify-start space-x-2 mb-2 flex-wrap gap-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white drop-shadow-md">
                      {lead.nickname}
                    </h1>
                    {lead.verified && (
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-blue-500 dark:text-blue-400 fill-current drop-shadow-md flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 mb-0 drop-shadow-sm font-medium">
                    @{lead.handle}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center sm:justify-start">
                  <button
                    onClick={toggleTracked}
                    className={`flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all shadow-lg text-sm sm:text-base ${
                      lead.is_tracked
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                    }`}
                  >
                    {lead.is_tracked ? (
                      <BookmarkCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                    <span>{lead.is_tracked ? "Engaged" : "Engage"}</span>
                  </button>

                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-xl transition-all text-sm sm:text-base"
                    >
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Send Email</span>
                      <span className="sm:hidden">Email</span>
                    </a>
                  )}

                  <a
                    href={lead.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-xl transition-all text-sm sm:text-base ${
                                          lead.platform === "instagram"
                                            ? "bg-gradient-to-r from-purple-500 to-pink-600"
                                            : lead.platform === "x"
                                            ? "bg-gradient-to-r from-gray-700 to-gray-900"
                                            : lead.platform === "facebook"
                                            ? "bg-gradient-to-r from-blue-600 to-blue-800"
                                            : lead.platform === "linkedin"
                                            ? "bg-gradient-to-r from-blue-700 to-blue-900"
                                            : "bg-gradient-to-r from-blue-500 to-indigo-600"
                                        }`}
                                      >
                                        <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                        <span className="hidden lg:inline">
                                          Message on{" "}
                                          {lead.platform === "instagram" ? "Instagram" : lead.platform === "x" ? "X" : lead.platform === "facebook" ? "Facebook" : lead.platform === "linkedin" ? "LinkedIn" : "TikTok"}
                                        </span>
                                        <span className="lg:hidden">Message</span>
                                      </a>

                  {lead.bio_link && (
                    <a
                      href={lead.bio_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-all shadow-lg text-sm sm:text-base"
                    >
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Visit Website</span>
                      <span className="sm:hidden">Website</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {lead.bio && (
              <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-xl sm:rounded-2xl transition-colors duration-300">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm sm:text-base">
                  {lead.bio}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Followers */}
          <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Followers
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {lead.followers.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Engagement Rate */}
          <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="p-2 sm:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg sm:rounded-xl">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Engagement
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">
                  {lead.engagement_rate}%
                </p>
              </div>
            </div>
          </div>

          {/* Platform */}
          <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="p-2 sm:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg sm:rounded-xl">
                <Video className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Platform
                </p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white capitalize truncate">
                  {lead.platform}
                </p>
              </div>
            </div>
          </div>

          {/* Saved Date */}
          <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="p-2 sm:p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg sm:rounded-xl">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Saved
                </p>
                <p className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white">
                  {new Date(lead.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

                {/* Pain Points — structured analysis of this lead's needs */}
                                {(lead.pain_points != null && lead.pain_points.length > 0 || lead.bio) && (
                                  <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-lg mb-4 sm:mb-6 transition-colors duration-300">
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center space-x-2">
                                      <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                                      <span>Pain Point Analysis</span>
                                    </h2>
                                    <div className="space-y-3">
                                      {(lead.pain_points != null && lead.pain_points.length > 0
                                        ? lead.pain_points.map(p => typeof p === 'string' ? { text: p, severity: 'medium' as const, category: 'General', evidence: 'From database', solution: 'Custom outreach based on identified pain point' } : p)
                                        : analyzePainPoints(lead.bio)
                                      ).map((point: any, i: number) => (
                                        <div key={i} className="bg-white/60 dark:bg-gray-700/60 rounded-lg sm:rounded-xl overflow-hidden border border-amber-100 dark:border-amber-900/20">
                                          {/* Header with severity badge */}
                                          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-100/50 dark:border-amber-900/20">
                                            <div className="flex items-center space-x-2">
                                              <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-bold">
                                                {i + 1}
                                              </span>
                                              <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                {point.text}
                                              </span>
                                            </div>
                                            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                              point.severity === 'high'
                                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                : point.severity === 'medium'
                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                            }`}>
                                              {point.severity === 'high' ? 'HIGH' : point.severity === 'medium' ? 'MEDIUM' : 'LOW'}
                                            </span>
                                          </div>

                                          {/* Details */}
                                          <div className="px-3 sm:px-4 py-3 space-y-2">
                                            {/* Category tag */}
                                            {point.category && (
                                              <div className="flex items-center space-x-1.5">
                                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category:</span>
                                                <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                                                  {point.category}
                                                </span>
                                              </div>
                                            )}

                                            {/* Evidence */}
                                            {point.evidence && (
                                              <div className="flex items-start space-x-1.5">
                                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0 mt-0.5">Evidence:</span>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 italic leading-relaxed">
                                                  "{point.evidence}"
                                                </p>
                                              </div>
                                            )}

                                            {/* Solution Angle */}
                                            {point.solution && (
                                              <div className="flex items-start space-x-1.5">
                                                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0 mt-0.5">Angle:</span>
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                                                  {point.solution}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                {/* Contact Information */}
        <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-lg mb-4 sm:mb-6 transition-colors duration-300">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center space-x-2">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
            <span>Contact Information</span>
          </h2>

          <div className="space-y-3 sm:space-y-4">
            {/* Email */}
            <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-white/60 dark:bg-gray-700/60 rounded-lg sm:rounded-xl transition-colors duration-300">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Email
                </p>
                {lead.email ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-1 sm:gap-0">
                    <p className="text-sm sm:text-base text-gray-900 dark:text-white break-all">
                      {lead.email}
                    </p>
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium whitespace-nowrap text-xs sm:text-sm"
                    >
                      Send →
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No email available
                  </p>
                )}
              </div>
            </div>

            {/* Instagram */}
            <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-white/60 dark:bg-gray-700/60 rounded-lg sm:rounded-xl transition-colors duration-300">
              <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Instagram
                </p>
                {lead.instagram_handle ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-1 sm:gap-0">
                    <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                      @{lead.instagram_handle}
                    </p>
                    <a
                      href={`https://instagram.com/${lead.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium whitespace-nowrap text-xs sm:text-sm"
                    >
                      Open →
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No Instagram linked
                  </p>
                )}
              </div>
            </div>

            {/* Bio Link */}
            <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-white/60 dark:bg-gray-700/60 rounded-lg sm:rounded-xl transition-colors duration-300">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Website
                </p>
                {lead.bio_link ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-1 sm:gap-0">
                    <p className="text-sm sm:text-base text-gray-900 dark:text-white truncate">
                      {lead.bio_link}
                    </p>
                    <a
                      href={lead.bio_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium whitespace-nowrap text-xs sm:text-sm"
                    >
                      Visit →
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No website linked
                  </p>
                )}
              </div>
            </div>

            {/* Profile Link */}
                        <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-white/60 dark:bg-gray-700/60 rounded-lg sm:rounded-xl transition-colors duration-300">
                          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                              {lead.platform === "instagram" ? "Instagram" : lead.platform === "x" ? "X" : lead.platform === "facebook" ? "Facebook" : lead.platform === "linkedin" ? "LinkedIn" : "TikTok"} Profile
                            </p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-1 sm:gap-0">
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white truncate">
                    {lead.profile_url}
                  </p>
                  <a
                    href={lead.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium whitespace-nowrap text-xs sm:text-sm"
                  >
                    Open →
                  </a>
                </div>
              </div>
                        </div>

                        {/* Category */}
                        <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-white/60 dark:bg-gray-700/60 rounded-lg sm:rounded-xl transition-colors duration-300">
                          <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Category
                            </p>
                            <div className="relative">
                              <button
                                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                                className="flex items-center justify-between w-full text-left text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 hover:border-blue-400 transition-colors"
                              >
                                <span>
                                  {lead.category_id
                                    ? categories.find((c) => c.id === lead.category_id)?.name || "Unknown"
                                    : "Uncategorized"}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              {showCategoryPicker && (
                                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden">
                                  <button
                                    onClick={() => changeCategory(null)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                      !lead.category_id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium" : "text-gray-700 dark:text-gray-300"
                                    }`}
                                  >
                                    No category
                                  </button>
                                  {categories.map((cat) => (
                                    <button
                                      key={cat.id}
                                      onClick={() => changeCategory(cat.id)}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                        lead.category_id === cat.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-medium" : "text-gray-700 dark:text-gray-300"
                                      }`}
                                    >
                                      {cat.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
        <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 dark:border-gray-700/50 shadow-lg transition-colors duration-300">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Notes & Outreach
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this lead (e.g., outreach status, campaign ideas, follow-up dates...)"
            className="w-full p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 min-h-[120px] sm:min-h-[150px] resize-y bg-white dark:bg-gray-700 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-300 text-sm sm:text-base"
          />
          <button
            onClick={saveNotes}
            disabled={savingNotes}
            className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-xl transition-all disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
          >
            {savingNotes ? "Saving..." : "Save Notes"}
          </button>
        </div>
      </div>
    </div>
  );
}
