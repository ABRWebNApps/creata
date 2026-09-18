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
import { enrichBio } from "@/lib/bio-enrichment";
import { useSubscription } from "@/lib/subscription-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
    matched_comment?: string | null;
    matched_caption?: string | null;
    category_id: string | null;
  created_at: string;
  // Enrichment JSONB fields (saved on lead row)
    enriched_emails?: Array<{ email: string; confidence: number; source_url: string | null }>;
    enriched_phones?: Array<{ phone: string; confidence: number }>;
    enriched_aliases?: Array<{ platform: string; profile_url: string }>;
    enriched_at?: string | null;
    // CRM-style notes
    lead_notes?: Array<{ id: string; subject: string; description: string; created_at: string; updated_at?: string }>;
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
  const signal = (match: string) => {
    const idx = text.indexOf(match);
    if (idx < 0) return '';
    const start = Math.max(0, idx - 10);
    const end = Math.min(bio.length, idx + match.length + 40);
    return bio.slice(start, end).trim();
  };

  if (text.includes("market") || text.includes("brand") || text.includes("growth")) {
    const excerpt = extractPhrase(bio, ["market", "brand", "growth"]);
    points.push({
      text: `Bio signals a focus on ${excerpt.length > 20 ? excerpt.toLowerCase().slice(0, 30) + '...' : 'brand/market growth'} — may need help differentiating in a crowded space`,
      severity: "high",
      category: "Growth",
      evidence: excerpt.length > 10 ? `Bio reads: "${excerpt}"` : "Bio signals brand/growth focus",
      solution: "Position as a growth partner — offer audience expansion strategy, cross-platform repurposing, or viral campaign concepts"
    });
  }
  if (text.includes("financ") || text.includes("invest") || text.includes("wealth") || text.includes("money")) {
    const excerpt = extractPhrase(bio, ["financ", "invest", "wealth", "money"]);
    points.push({
      text: `Lead's content revolves around ${excerpt.length > 20 ? excerpt.toLowerCase().slice(0, 30) + '...' : 'finance/investing'} — likely needs trust-building partnerships`,
      severity: "high",
      category: "Finance",
      evidence: excerpt.length > 10 ? `Bio reads: "${excerpt}"` : "Bio signals finance/investing focus",
      solution: "Approach with educational content partnerships — offer to create branded finance explainers or sponsored market analysis"
    });
  }
  if (text.includes("tech") || text.includes("startup") || text.includes("founder") || text.includes("saas")) {
    const excerpt = extractPhrase(bio, ["tech", "startup", "founder", "saas"]);
    points.push({
      text: `Identified as ${excerpt.length > 10 ? excerpt.toLowerCase().slice(0, 25) + '...' : 'tech/startup'} — likely navigating customer acquisition and retention`,
      severity: "high",
      category: "SaaS",
      evidence: excerpt.length > 10 ? `Bio reads: "${excerpt}"` : "Bio signals tech/startup focus",
      solution: "Offer B2B lead gen or case study collabs — founders value proven ROI and tangible results over vanity metrics"
    });
  }
  if (text.includes("health") || text.includes("wellness") || text.includes("fitness") || text.includes("nutrition")) {
    const excerpt = extractPhrase(bio, ["health", "wellness", "fitness", "nutrition"]);
    points.push({
      text: `Content centers on ${excerpt.length > 15 ? excerpt.toLowerCase().slice(0, 25) + '...' : 'health/wellness'} — audience craves authority and trusted guidance`,
      severity: "medium",
      category: "Health",
      evidence: excerpt.length > 10 ? `Bio reads: "${excerpt}"` : "Bio signals health/wellness focus",
      solution: "Propose co-branded wellness challenges or science-backed content series — this audience craves authority and trust"
    });
  }
  if (text.includes("career") || text.includes("job") || text.includes("hire") || text.includes("recruit")) {
    const excerpt = extractPhrase(bio, ["career", "job", "hire", "recruit"]);
    points.push({
      text: `Bio suggests ${excerpt.length > 15 ? excerpt.toLowerCase().slice(0, 25) + '...' : 'career/hiring'} focus — may need better talent or career growth solutions`,
      severity: "medium",
      category: "Career",
      evidence: excerpt.length > 10 ? `Bio reads: "${excerpt}"` : "Bio signals career/hiring focus",
      solution: "Pitch as a career development resource — resume tools, interview prep sponsorships, or hiring platform integrations"
    });
  }
  if (text.includes("content") || text.includes("social") || text.includes("influencer")) {
    const excerpt = extractPhrase(bio, ["content", "social", "influencer"]);
    points.push({
      text: `Bio positions them as ${excerpt.length > 20 ? excerpt.toLowerCase().slice(0, 25) + '...' : 'content creator/influencer'} — may face content fatigue and standing out challenges`,
      severity: "medium",
      category: "Content",
      evidence: excerpt.length > 10 ? `Bio reads: "${excerpt}"` : "Bio signals content/influencer focus",
      solution: "Offer fresh content formats or series concepts — provide production value, unique angles, or data-driven storytelling"
    });
  }
  if (text.includes("coach") || text.includes("consult") || text.includes("mentor")) {
    const excerpt = extractPhrase(bio, ["coach", "consult", "mentor"]);
    points.push({
      text: `Bio identifies as ${excerpt.length > 15 ? excerpt.toLowerCase().slice(0, 25) + '...' : 'coach/consultant'} — likely struggles converting audience into paying clients`,
      severity: "high",
      category: "Monetization",
      evidence: excerpt.length > 10 ? `Bio reads: "${excerpt}"` : "Bio signals coach/consultant focus",
      solution: "Propose funnel-building partnerships — lead magnets, paid webinar collabs, or affiliate-driven course launches"
    });
  }
  if (text.includes("b2b") || text.includes("enterprise") || text.includes("ceo")) {
    const excerpt = extractPhrase(bio, ["b2b", "enterprise", "ceo"]);
    points.push({
      text: `Bio indicates ${excerpt.length > 15 ? excerpt.toLowerCase().slice(0, 25) + '...' : 'B2B/enterprise'} — lead generation and deal closure is likely the pain point`,
      severity: "high",
      category: "B2B",
      evidence: excerpt.length > 10 ? `Bio reads: "${excerpt}"` : "Bio signals B2B/enterprise focus",
      solution: "Offer account-based marketing support or LinkedIn thought leadership ghosting — B2B plays value trust over reach"
    });
  }
  if (text.includes("product") || text.includes("ecommerc") || text.includes("shop") || text.includes("store")) {
    const excerpt = extractPhrase(bio, ["product", "ecommerc", "shop", "store"]);
    points.push({
      text: `Bio centers on ${excerpt.length > 15 ? excerpt.toLowerCase().slice(0, 25) + '...' : 'products/e-commerce'} — customer acquisition and conversion optimization is key`,
      severity: "medium",
      category: "E-commerce",
      evidence: excerpt.length > 10 ? `Bio reads: "${excerpt}"` : "Bio signals e-commerce/product focus",
      solution: "Propose UGC campaigns or affiliate partnerships — product-based creators need reliable traffic and conversion lift"
    });
  }
  if (text.includes("art") || text.includes("creator") || text.includes("musician") || text.includes("design")) {
    const excerpt = extractPhrase(bio, ["art", "creator", "musician", "design"]);
    points.push({
      text: `Bio presents them as ${excerpt.length > 20 ? excerpt.toLowerCase().slice(0, 25) + '...' : 'creative/artist'} — monetizing creative work sustainably is the challenge`,
      severity: "high",
      category: "Creative",
      evidence: excerpt.length > 10 ? `Bio reads: "${excerpt}"` : "Bio signals creative/artistic focus",
      solution: "Offer platform partnerships or sponsored commissions — creatives value brand deals that respect their artistic integrity"
    });
  }
  if (text.includes("agency") || text.includes("client") || text.includes("freelanc")) {
    const excerpt = extractPhrase(bio, ["agency", "client", "freelanc"]);
    points.push({
      text: `Bio describes ${excerpt.length > 15 ? excerpt.toLowerCase().slice(0, 25) + '...' : 'agency/freelance'} — inconsistent client pipeline is the recurring pain`,
      severity: "medium",
      category: "Agency",
      evidence: excerpt.length > 10 ? `Bio reads: "${excerpt}"` : "Bio signals agency/freelance focus",
      solution: "Propose referral partnerships or co-marketing — agencies need predictable lead flow and value cross-referrals"
    });
  }

  // If no specific pain points detected, add generic ones grounded in their actual bio
  if (points.length === 0) {
    const firstPhrase = bio.split(/[.!\n]/).map(s => s.trim()).filter(Boolean)[0] || '';
    points.push({
      text: firstPhrase
        ? `Bio opens with "${firstPhrase.slice(0, 50)}" — audience growth strategy may need refreshing`
        : "Audience growth has plateaued — needs fresh strategies",
      severity: "medium",
      category: "Growth",
      evidence: firstPhrase ? `Primary bio statement: "${firstPhrase.slice(0, 60)}"` : "Inferred from profile context",
      solution: "Offer audience analysis with actionable growth tactics — provide data-backed recommendations tailored to their niche"
    });
    points.push({
      text: firstPhrase
        ? `Based on bio focus "${firstPhrase.slice(0, 35)}...", likely time-poor for partnership development`
        : "Time management — too busy creating content to focus on partnerships",
      severity: "low",
      category: "Operations",
      evidence: firstPhrase ? `Inferred from bio opening: "${firstPhrase.slice(0, 50)}"` : "Inferred from profile context",
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
  const [notes, setNotes] = useState<string>("");
    const [savingNotes, setSavingNotes] = useState(false);
    const [crmNotes, setCrmNotes] = useState<Array<{ id: string; subject: string; description: string; created_at: string; updated_at?: string }>>([]);
  const [noteSubject, setNoteSubject] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    // ── Enrichment state ──
    const [enriching, setEnriching] = useState(false);
    const [enrichResults, setEnrichResults] = useState<{
          emails: { email: string; source_url: string | null; confidence: number }[];
          phones: { phone: string; source_url: string | null; confidence: number }[];
          aliases: { platform: string; profile_url: string }[];
      errors: string[];
    } | null>(null);
  const [enrichSaved, setEnrichSaved] = useState(false);
  const [enrichCollapsed, setEnrichCollapsed] = useState(true);
  const [savingEnrich, setSavingEnrich] = useState(false);
  const router = useRouter();
  const { subscription } = useSubscription();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

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
                        setCrmNotes(result.lead.lead_notes || []);
      
                  // Load saved enrichments from JSONB fields if available
                  if (result.lead.enriched_emails?.length > 0 || result.lead.enriched_phones?.length > 0 || result.lead.enriched_aliases?.length > 0) {
                    setEnrichResults({
                                          emails: (result.lead.enriched_emails || []).map((e: any) => ({ email: e.email, source_url: e.source_url, confidence: e.confidence })),
                                          phones: result.lead.enriched_phones || [],
                                          aliases: result.lead.enriched_aliases || [],
                                          errors: [],
                    });
                    setEnrichSaved(true);
                    setEnrichCollapsed(true);
                  }
      
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

    // ── CRM Notes CRUD ──
    const persistCrmNotes = async (updatedNotes: typeof crmNotes) => {
      if (!lead) return;
      const headers = await getAuthHeaders();
      await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ lead_notes: updatedNotes }),
      });
      setCrmNotes(updatedNotes);
    };

    const addNote = async () => {
      if (!lead || !noteSubject.trim()) return;
      const now = new Date().toISOString();
      const newNote = {
        id: crypto.randomUUID(),
        subject: noteSubject.trim(),
        description: noteDescription.trim(),
        created_at: now,
      };
      const updated = [...crmNotes, newNote];
      await persistCrmNotes(updated);
      setNoteSubject("");
      setNoteDescription("");
      setShowNoteForm(false);
    };

    const startEditNote = (note: typeof crmNotes[0]) => {
      setEditingNoteId(note.id);
      setNoteSubject(note.subject);
      setNoteDescription(note.description || "");
      setShowNoteForm(true);
    };

    const saveEditNote = async () => {
      if (!lead || !editingNoteId || !noteSubject.trim()) return;
      const updated = crmNotes.map((n) =>
        n.id === editingNoteId
          ? { ...n, subject: noteSubject.trim(), description: noteDescription.trim(), updated_at: new Date().toISOString() }
          : n
      );
      await persistCrmNotes(updated);
      setNoteSubject("");
      setNoteDescription("");
      setEditingNoteId(null);
      setShowNoteForm(false);
    };

    const deleteNote = async (noteId: string) => {
      if (!confirm("Delete this note?")) return;
      const updated = crmNotes.filter((n) => n.id !== noteId);
      await persistCrmNotes(updated);
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

  // ── Enrichment handler ──
  const runEnrich = async () => {
    if (!lead || enriching) return;
    setEnriching(true);
    setEnrichResults(null);
    setEnrichSaved(false);
    setEnrichCollapsed(false);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/osint/enrich", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json();
      if (data.success) {
        setEnrichResults(data.data);
        // Update email from enrichment if a better one was found
        if (data.data.emails?.length > 0) {
          const best = data.data.emails.sort((a: any, b: any) => b.confidence - a.confidence)[0];
          if (best.email !== lead.email) {
            setLead({ ...lead, email: best.email });
          }
        }
      } else {
        console.error("Enrichment failed:", data.error);
      }
    } catch (err) {
      console.error("Enrich error:", err);
    } finally {
      setEnriching(false);
    }
  };

  const saveEnrichResults = async () => {
    if (!lead || !enrichResults || savingEnrich) return;
    setSavingEnrich(true);
    try {
      const headers = await getAuthHeaders();
      const emails = enrichResults.emails.map((e) => ({ email: e.email, confidence: e.confidence, source_url: e.source_url }));
      const phones = enrichResults.phones.map((p) => ({ phone: p.phone }));
      const aliases = enrichResults.aliases.map((a) => ({ platform: a.platform, profile_url: a.profile_url }));
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          enriched_emails: emails,
          enriched_phones: phones,
          enriched_aliases: aliases,
          enriched_at: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setEnrichSaved(true);
        setEnrichCollapsed(true);
      }
    } catch (err) {
      console.error("Save enrich error:", err);
    } finally {
      setSavingEnrich(false);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center transition-colors duration-300">
        <div className="text-center px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Lead not found
          </h2>
          <Link
            href="/leads"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to My Leads
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
                          href="/leads"
                          onClick={(e) => {
                            e.preventDefault();
                            // Navigate back in history if available, fallback to /leads
                            if (window.history.length > 1) {
                              router.back();
                            } else {
                              router.push("/leads");
                            }
                          }}
                          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <ArrowLeft className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium hidden xs:inline">
                            Back
                          </span>
            </Link>
            <button
              onClick={deleteLead}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
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
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 mb-6 overflow-x-hidden transition-colors duration-300">
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
                className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-2xl sm:rounded-3xl border-4 border-gray-200 shadow-xl object-cover mx-auto sm:mx-0"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove(
                    "hidden"
                  );
                }}
              />
              <div className="hidden w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40 rounded-2xl sm:rounded-3xl border-4 border-gray-200 shadow-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl sm:text-4xl lg:text-5xl mx-auto sm:mx-0">
                {lead.nickname.charAt(0)}
              </div>

              {/* Name & Handle */}
              <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0 sm:mb-4 relative z-20">
                <div className="bg-white rounded-xl sm:rounded-2xl px-4 py-3 shadow-sm border border-gray-200 mb-3 sm:px-5 sm:py-4 transition-colors duration-300">
                  <div className="flex items-center justify-center sm:justify-start space-x-2 mb-2 flex-wrap gap-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 drop-shadow-md">
                      {lead.nickname}
                    </h1>
                    {lead.verified && (
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-blue-500 fill-current drop-shadow-md flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-base sm:text-lg text-gray-700 mb-0 drop-shadow-sm font-medium">
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
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {lead.is_tracked ? (
                      <BookmarkCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                    <span>{lead.is_tracked ? "Engaged" : "Engage"}</span>
                  </button>

                  {/* Enrich Button — gated behind pro/premium */}
                                    <button
                                      onClick={() => {
                                        if (!subscription?.canEnrich) {
                                          setShowUpgradeDialog(true);
                                          return;
                                        }
                                        runEnrich();
                                      }}
                    disabled={enriching}
                    className={`flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all shadow-lg text-sm sm:text-base ${
                      enriching
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-xl"
                    }`}
                  >
                                      <div className={`w-4 h-4 sm:w-5 sm:h-5 ${enriching ? "animate-spin" : ""}`}>
                                        <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                          <circle cx="12" cy="12" r="10" strokeWidth={3} strokeDasharray="31.4 31.4" strokeLinecap="round" className={enriching ? "opacity-100" : "opacity-0"} />
                                          {!enriching && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />}
                                        </svg>
                                      </div>
                                      <span className="hidden sm:inline">{enriching ? "Enriching..." : "Enrich"}</span>
                    <span className="sm:hidden">{enriching ? "..." : "Find"}</span>
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
                      className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-white text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-lg text-sm sm:text-base"
                    >
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Visit Website</span>
                      <span className="sm:hidden">Website</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Bio — enriched with structured analysis */}
                        {lead.bio && (() => {
                          const enriched = enrichBio(lead.bio);
                          return (
                            <div className="mt-4 sm:mt-6">
                              {/* Professional Summary */}
                              {enriched.summary && (
                                <div className="mb-3 p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl border border-blue-100">
                                  <p className="text-sm sm:text-base text-gray-800 font-medium leading-relaxed">
                                    {enriched.summary}
                                  </p>
                                </div>
                              )}

                              {/* Structured Bio Tags */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                {enriched.role && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-medium">
                                    {enriched.role}
                                  </span>
                                )}
                                {enriched.niche && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
                                    {enriched.niche}
                                  </span>
                                )}
                                {enriched.content_focus && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
                                    📝 {enriched.content_focus.slice(0, 35)}...
                                  </span>
                                )}
                              </div>

                              {/* Original Bio (collapsed) */}
                              <details className="group">
                                <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 transition-colors select-none mb-1">
                                  Full bio <span className="group-open:hidden">▼</span><span className="hidden group-open:inline">▲</span>
                                </summary>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                  <p className="text-gray-700 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                                    {lead.bio}
                                  </p>
                                </div>
                              </details>
                            </div>
                          );
                        })()}
                                  </div>
                                </div>

                                {/* ── Enrichment Results ── */}
                                                                {enriching && (
                                                                  <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 mb-6 p-8 sm:p-10 text-center">
                                                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent mb-4" />
                                                                    <p className="text-base font-semibold text-gray-800">
                                                                      Searching & Tracing Across the Internet
                                                                    </p>
                                                                    <div className="mt-2 space-y-1">
                                                                      <p className="text-sm text-gray-500">
                                                                        Scanning social profiles, search engines & public sources
                                                                      </p>
                                                                      <p className="text-xs text-gray-400 animate-pulse">
                                                                        This may take a moment — scraping for authentic contact information...
                                                                      </p>
                                                                    </div>
                                                                  </div>
                                                                )}

                                                                {enrichResults && (
                                                                                                                                  <>
                                                                                                                                  <div
                                                                                                                                    onClick={() => setEnrichCollapsed(!enrichCollapsed)}
                                                                                                                                    className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200 mb-2 overflow-hidden cursor-pointer hover:shadow-md transition-all"
                                                                                                                                  >
                                                                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                                                                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                                        <svg className={`w-5 h-5 transition-transform ${enrichCollapsed ? "" : "rotate-90"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                        Contact Info
                                                                      </h3>
                                                                      <div className="flex items-center gap-3">
                                                                        <span className="text-xs text-white/70 bg-white/20 px-2 py-1 rounded-full">
                                                                          {enrichResults.emails.length} emails · {enrichResults.phones.length} phones
                                                                        </span>
                                                                        <svg className={`w-4 h-4 text-white/70 transition-transform ${enrichCollapsed ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                                      </div>
                                                                    </div>

                                                                    {!enrichCollapsed && (
                                                                      <div className="p-4 sm:p-6 space-y-5">
                                                                        {/* Emails */}
                                                                        {enrichResults.emails.length > 0 && (
                                                                          <div>
                                                                            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                                              <Mail className="w-4 h-4 text-blue-500" /> Emails Found
                                                                            </p>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                              {enrichResults.emails.map((e, i) => (
                                                                                <a
                                                                                  key={i}
                                                                                  href={`mailto:${e.email}`}
                                                                                  target="_blank"
                                                                                  rel="noopener noreferrer"
                                                                                  className="flex items-center justify-between bg-blue-50 hover:bg-blue-100 rounded-lg px-3.5 py-2.5 text-sm transition-all group border border-blue-100 hover:border-blue-300"
                                                                                >
                                                                                  <div className="flex items-center gap-2 min-w-0">
                                                                                    <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                                                                    <span className="text-blue-800 font-mono text-xs sm:text-sm truncate group-hover:text-blue-900">
                                                                                      {e.email}
                                                                                    </span>
                                                                                  </div>
                                                                                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                                                                                                                                                        {e.source_url && (
                                                                                                                                                                          <span className="text-[9px] sm:text-[10px] font-mono text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">
                                                                                                                                                                            found
                                                                                                                                                                          </span>
                                                                                                                                                                        )}
                                                                                                                                                                      <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                                                                                                                                        e.confidence >= 80 ? "bg-green-100 text-green-700" :
                                                                                                                                                                        e.confidence >= 50 ? "bg-amber-100 text-amber-700" :
                                                                                                                                                                        "bg-gray-100 text-gray-500"
                                                                                                                                                                      }`}>
                                                                                                                                                                        {e.confidence}%
                                                                                                                                                                      </span>
                                                                                                                                                                      <ExternalLink className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                  </div>
                                                                                </a>
                                                                              ))}
                                                                            </div>
                                                                          </div>
                                                                        )}

                                                                        {/* Phones */}
                                                                        {enrichResults.phones.length > 0 && (
                                                                          <div>
                                                                            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                                              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                                              Phone Numbers
                                                                            </p>
                                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                              {enrichResults.phones.map((p, i) => (
                                                                                <a
                                                                                  key={i}
                                                                                  href={`tel:${p.phone.replace(/\s/g, "")}`}
                                                                                  className="flex items-center gap-2 bg-green-50 hover:bg-green-100 rounded-lg px-3.5 py-2.5 text-sm transition-all border border-green-100 hover:border-green-300 group"
                                                                                >
                                                                                  <svg className="w-3.5 h-3.5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                                                  <span className="text-green-800 font-mono text-xs sm:text-sm group-hover:text-green-900">{p.phone}</span>
                                                                                </a>
                                                                              ))}
                                                                            </div>
                                                                          </div>
                                                                        )}

                                                                        {/* Aliases */}
                                                                        {enrichResults.aliases.length > 0 && (
                                                                          <div>
                                                                            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                                              <Globe className="w-4 h-4 text-purple-500" /> Cross-Platform Profiles
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-2">
                                                                              {enrichResults.aliases.map((a, i) => (
                                                                                <a
                                                                                  key={i}
                                                                                  href={a.profile_url}
                                                                                  target="_blank"
                                                                                  rel="noopener noreferrer"
                                                                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors"
                                                                                >
                                                                                  <span className="capitalize">{a.platform}</span>
                                                                                  <ExternalLink className="w-3 h-3" />
                                                                                </a>
                                                                              ))}
                                                                            </div>
                                                                          </div>
                                                                        )}

                                                                        {/* No results */}
                                                                        {enrichResults.emails.length === 0 && enrichResults.phones.length === 0 && enrichResults.aliases.length === 0 && (
                                                                          <div className="text-center py-6">
                                                                            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                                                                              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                            </div>
                                                                            <p className="text-gray-500 text-sm font-medium">No additional contact info found for this lead.</p>
                                                                            <p className="text-xs text-gray-400 mt-1">Try checking their bio or profile for existing contact links.</p>
                                                                          </div>
                                                                        )}

                                                                        {/* Errors */}
                                                                        {enrichResults.errors.length > 0 && (
                                                                          <div className="mt-2 pt-3 border-t border-gray-100">
                                                                            <details className="group">
                                                                              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                                                                                {enrichResults.errors.length} search operation{enrichResults.errors.length > 1 ? "s" : ""} encountered issues <span className="group-open:hidden">▼</span><span className="hidden group-open:inline">▲</span>
                                                                              </summary>
                                                                              <div className="mt-2 space-y-1">
                                                                                {enrichResults.errors.map((e, i) => (
                                                                                  <p key={i} className="text-xs text-gray-400">{e}</p>
                                                                                ))}
                                                                              </div>
                                                                            </details>
                                                                          </div>
                                                                        )}
                                                                      </div>
                                                                    )}
                                                                  </div>

                                                                  {/* Save / Saved */}
                                                                  {!enrichSaved ? (
                                                                    <button
                                                                      onClick={saveEnrichResults}
                                                                      disabled={savingEnrich}
                                                                      className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                                    >
                                                                      {savingEnrich ? (
                                                                        <>
                                                                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                                                          Saving...
                                                                        </>
                                                                      ) : (
                                                                        <>
                                                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                          Save {enrichResults.emails.length + enrichResults.phones.length} Contact{enrichResults.emails.length + enrichResults.phones.length !== 1 ? "s" : ""}
                                                                        </>
                                                                      )}
                                                                    </button>
                                                                  ) : (
                                                                    <div className="text-center py-2 text-sm text-green-600 font-medium flex items-center justify-center gap-1.5">
                                                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                      Contacts saved. Click the header above to expand and review.
                                                                    </div>
                                                                                                                                      )}
                                                                                                                                      </>
                                                                                                                                    )}

                                                                                                                                                                    {/* ── Matched Comment ── */}
                                                                                                                                                                    {(lead.matched_comment || lead.matched_caption) && (
                                                                                                                                                                      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-blue-100 mb-6 overflow-hidden">
                                                                                                                                                                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4">
                                                                                                                                                                          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                                                                                                                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                                                                                                                                                            Why This Lead Matched
                                                                                                                                                                          </h3>
                                                                                                                                                                        </div>
                                                                                                                                                                        <div className="p-4 sm:p-6 space-y-3">
                                                                                                                                                                          {lead.matched_comment && (
                                                                                                                                                                            <div>
                                                                                                                                                                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Matching Comment</p>
                                                                                                                                                                              <div className="bg-blue-50/50 rounded-lg p-3.5 border border-blue-100">
                                                                                                                                                                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{lead.matched_comment}</p>
                                                                                                                                                                              </div>
                                                                                                                                                                            </div>
                                                                                                                                                                          )}
                                                                                                                                                                          {lead.matched_caption && lead.matched_caption !== lead.matched_comment && (
                                                                                                                                                                            <div>
                                                                                                                                                                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Caption</p>
                                                                                                                                                                              <div className="bg-indigo-50/50 rounded-lg p-3.5 border border-indigo-100">
                                                                                                                                                                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{lead.matched_caption}</p>
                                                                                                                                                                              </div>
                                                                                                                                                                            </div>
                                                                                                                                                                          )}
                                                                                                                                                                        </div>
                                                                                                                                                                      </div>
                                                                                                                                                                    )}

                                                                                                                                                                    {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Followers */}
          <div className="bg-white backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="p-2 sm:p-3 bg-blue-50 rounded-lg sm:rounded-xl">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  Followers
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  {lead.followers.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Engagement Rate */}
          <div className="bg-white backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="p-2 sm:p-3 bg-emerald-50 rounded-lg sm:rounded-xl">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  Engagement
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                  {lead.engagement_rate}%
                </p>
              </div>
            </div>
          </div>

          {/* Platform */}
          <div className="bg-white backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="p-2 sm:p-3 bg-purple-50 rounded-lg sm:rounded-xl">
                <Video className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  Platform
                </p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 capitalize truncate">
                  {lead.platform}
                </p>
              </div>
            </div>
          </div>

          {/* Saved Date */}
          <div className="bg-white backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
              <div className="p-2 sm:p-3 bg-indigo-50 rounded-lg sm:rounded-xl">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  Saved
                </p>
                <p className="text-sm sm:text-base lg:text-lg font-bold text-gray-900">
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
                                  <div className="bg-white/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg mb-4 sm:mb-6 transition-colors duration-300">
                                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center space-x-2">
                                      <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                                      <span>Pain Point Analysis</span>
                                    </h2>
                                    <div className="space-y-3">
                                      {(lead.pain_points != null && lead.pain_points.length > 0
                                        ? lead.pain_points.map(p => typeof p === 'string' ? { text: p, severity: 'medium' as const, category: 'General', evidence: 'From database', solution: 'Custom outreach based on identified pain point' } : p)
                                        : analyzePainPoints(lead.bio)
                                      ).map((point: any, i: number) => (
                                        <div key={i} className="bg-white/60 rounded-lg sm:rounded-xl overflow-hidden border border-amber-100">
                                          {/* Header with severity badge */}
                                          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-amber-50/50 border-b border-amber-100/50">
                                            <div className="flex items-center space-x-2">
                                              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                                                {i + 1}
                                              </span>
                                              <span className="text-xs sm:text-sm font-semibold text-gray-800">
                                                {point.text}
                                              </span>
                                            </div>
                                            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                                                                          point.severity === 'high'
                                                                                            ? 'bg-red-100 text-red-600'
                                                                                            : point.severity === 'medium'
                                                                                            ? 'bg-amber-100 text-amber-700'
                                                                                            : 'bg-emerald-50 text-emerald-600'
                                            }`}>
                                              {point.severity === 'high' ? 'HIGH' : point.severity === 'medium' ? 'MEDIUM' : 'LOW'}
                                            </span>
                                          </div>

                                          {/* Details */}
                                          <div className="px-3 sm:px-4 py-3 space-y-2">
                                            {/* Category tag */}
                                            {point.category && (
                                              <div className="flex items-center space-x-1.5">
                                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Category:</span>
                                                <span className="text-xs font-medium bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                                                  {point.category}
                                                </span>
                                              </div>
                                            )}

                                            {/* Evidence */}
                                            {point.evidence && (
                                              <div className="flex items-start space-x-1.5">
                                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider shrink-0 mt-0.5">Evidence:</span>
                                                <p className="text-xs text-gray-500 italic leading-relaxed">
                                                  "{point.evidence}"
                                                </p>
                                              </div>
                                            )}

                                            {/* Solution Angle */}
                                            {point.solution && (
                                              <div className="flex items-start space-x-1.5">
                                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider shrink-0 mt-0.5">Angle:</span>
                                                <p className="text-xs text-emerald-600 leading-relaxed">
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
        <div className="bg-white/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg mb-4 sm:mb-6 transition-colors duration-300">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center space-x-2">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <span>Contact Information</span>
          </h2>

          <div className="space-y-3 sm:space-y-4">
            {/* Email */}
            <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-white/60 rounded-lg sm:rounded-xl transition-colors duration-300">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                  Email
                </p>
                {lead.email ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-1 sm:gap-0">
                    <p className="text-sm sm:text-base text-gray-900 break-all">
                      {lead.email}
                    </p>
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap text-xs sm:text-sm"
                    >
                      Send →
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No email available
                  </p>
                )}
              </div>
            </div>

            {/* Instagram */}
            <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-white/60 rounded-lg sm:rounded-xl transition-colors duration-300">
              <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                  Instagram
                </p>
                {lead.instagram_handle ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-1 sm:gap-0">
                    <p className="text-sm sm:text-base text-gray-900">
                      @{lead.instagram_handle}
                    </p>
                    <a
                      href={`https://instagram.com/${lead.instagram_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap text-xs sm:text-sm"
                    >
                      Open →
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No Instagram linked
                  </p>
                )}
              </div>
            </div>

            {/* Bio Link */}
            <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-white/60 rounded-lg sm:rounded-xl transition-colors duration-300">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                  Website
                </p>
                {lead.bio_link ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-1 sm:gap-0">
                    <p className="text-sm sm:text-base text-gray-900 truncate">
                      {lead.bio_link}
                    </p>
                    <a
                      href={lead.bio_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap text-xs sm:text-sm"
                    >
                      Visit →
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    No website linked
                  </p>
                )}
              </div>
            </div>

            {/* Profile Link */}
                        <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-white/60 rounded-lg sm:rounded-xl transition-colors duration-300">
                          <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                              {lead.platform === "instagram" ? "Instagram" : lead.platform === "x" ? "X" : lead.platform === "facebook" ? "Facebook" : lead.platform === "linkedin" ? "LinkedIn" : "TikTok"} Profile
                            </p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-1 sm:gap-0">
                  <p className="text-sm sm:text-base text-gray-900 truncate">
                    {lead.profile_url}
                  </p>
                  <a
                    href={lead.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap text-xs sm:text-sm"
                  >
                    Open →
                  </a>
                </div>
              </div>
                        </div>

                        {/* Category */}
                        <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-white/60 rounded-lg sm:rounded-xl transition-colors duration-300">
                          <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">
                              Category
                            </p>
                            <div className="relative">
                              <button
                                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                                className="flex items-center justify-between w-full text-left text-sm text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-400 transition-colors"
                              >
                                <span>
                                  {lead.category_id
                                    ? categories.find((c) => c.id === lead.category_id)?.name || "Unknown"
                                    : "Uncategorized"}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              {showCategoryPicker && (
                                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                                  <button
                                    onClick={() => changeCategory(null)}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                      !lead.category_id ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"
                                    }`}
                                  >
                                    No category
                                  </button>
                                  {categories.map((cat) => (
                                    <button
                                      key={cat.id}
                                      onClick={() => changeCategory(cat.id)}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                                        lead.category_id === cat.id ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-700"
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
        {/* Notes Section — CRM-style */}
        <div className="bg-white/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20 shadow-lg transition-colors duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Notes & Outreach
                    </h2>
                    <button
                      onClick={() => { setShowNoteForm(true); setEditingNoteId(null); setNoteSubject(""); setNoteDescription(""); }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Note
                    </button>
                  </div>

                  {/* Note Form */}
                  {showNoteForm && (
                    <div className="mb-4 p-4 bg-white rounded-xl border border-blue-200 shadow-sm">
                      <input
                        type="text"
                        value={noteSubject}
                        onChange={(e) => setNoteSubject(e.target.value)}
                        placeholder="Note subject..."
                        className="w-full mb-2 p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black placeholder-gray-400 text-sm"
                      />
                      <textarea
                        value={noteDescription}
                        onChange={(e) => setNoteDescription(e.target.value)}
                        placeholder="Description (optional)..."
                        rows={3}
                        className="w-full mb-3 p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black placeholder-gray-400 text-sm resize-y"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setShowNoteForm(false); setEditingNoteId(null); setNoteSubject(""); setNoteDescription(""); }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={editingNoteId ? saveEditNote : addNote}
                          disabled={!noteSubject.trim()}
                          className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                        >
                          {editingNoteId ? "Save Changes" : "Add Note"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notes List */}
                  {crmNotes.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <p className="text-sm">No notes yet</p>
                      <p className="text-xs mt-1">Click "Add Note" to track outreach, ideas, or follow-ups</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {crmNotes.toReversed().map((n) => (
                        <div key={n.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                          <div className="p-3.5 sm:p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{n.subject}</h3>
                                {n.description && (
                                  <p className="text-sm text-gray-600 mt-1.5 whitespace-pre-wrap leading-relaxed">{n.description}</p>
                                )}
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => startEditNote(n)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => deleteNote(n.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              {n.updated_at ? " (edited)" : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                      {/* Upgrade Dialog — shown when free/basic users attempt a gated feature */}
                      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>🚀 Upgrade Required</DialogTitle>
                            <DialogDescription>
                              This feature is only available on Pro and Premium plans. Upgrade to unlock lead enrichment, email finding, and more.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <button
                              onClick={() => setShowUpgradeDialog(false)}
                              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-all"
                            >
                              Cancel
                            </button>
                            <Link
                              href="/pricing"
                              onClick={() => setShowUpgradeDialog(false)}
                              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                            >
                              See Plans
                            </Link>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      </div>
                    </div>
                  );
                }
