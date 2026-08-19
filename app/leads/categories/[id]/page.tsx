"use client";

import { useState, useEffect, use } from "react";
import {
  Mail,
  MessageCircle,
  ExternalLink,
  ArrowLeft,
  FolderOpen,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Edit3,
  Check,
  X,
  Search,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type SavedLead = {
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
  category_id: string | null;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

export default function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [category, setCategory] = useState<Category | null>(null);
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<"all" | "tiktok" | "instagram" | "x" | "linkedin" | "facebook">("all");
  const [filterEngage, setFilterEngage] = useState<"all" | "engaged" | "pending">("all");
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [deleteLeadDialogOpen, setDeleteLeadDialogOpen] = useState(false);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const router = useRouter();

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const session = await supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    if (resolvedParams?.id) {
      loadCategory();
    }
  }, [resolvedParams?.id]);

  const loadCategory = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/categories/${resolvedParams.id}`, { headers });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setCategory(data.category);
      setLeads(data.leads || []);
      setEditName(data.category?.name || "");
      setEditDesc(data.category?.description || "");
    } catch (e) {
      console.error("Error loading category:", e);
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async () => {
    if (!category || !editName.trim()) return;
    const headers = await getAuthHeaders();
    try {
      const res = await fetch("/api/categories", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          category_id: category.id,
          name: editName.trim(),
          description: editDesc.trim(),
        }),
      });
      if (res.ok) {
        setCategory({ ...category, name: editName.trim(), description: editDesc.trim() });
        setEditingName(false);
      }
    } catch (e) {
      console.error("Failed to update category", e);
    }
  };

  const removeLeadFromCategory = async (leadId: string) => {
    const headers = await getAuthHeaders();
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers,
        body: JSON.stringify({ lead_ids: [leadId], category_id: null }),
      });
      if (res.ok) {
        setLeads(leads.filter((l) => l.id !== leadId));
      }
    } catch (e) {
      console.error("Failed to remove lead", e);
    }
  };

  const deleteCategory = async () => {
    if (!category) return;
    const headers = await getAuthHeaders();
    try {
      await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
        headers,
      });
      router.push("/leads");
    } catch (e) {
      console.error("Failed to delete category", e);
    }
  };

  const toggleTracked = async (lead: SavedLead) => {
    const headers = await getAuthHeaders();
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ is_tracked: !lead.is_tracked }),
      });
      if (res.ok) {
        setLeads(leads.map((l) => (l.id === lead.id ? { ...l, is_tracked: !l.is_tracked } : l)));
      }
    } catch (e) {
      console.error("Error updating lead:", e);
    }
  };

  const confirmDeleteLead = (id: string) => {
    setDeleteLeadId(id);
    setDeleteLeadDialogOpen(true);
  };

  const deleteLead = async () => {
    if (!deleteLeadId) return;
    const headers = await getAuthHeaders();
    try {
      await fetch(`/api/leads/${deleteLeadId}`, { method: "DELETE", headers });
      setLeads(leads.filter((l) => l.id !== deleteLeadId));
    } catch (e) {
      console.error("Error deleting lead:", e);
    } finally {
      setDeleteLeadDialogOpen(false);
      setDeleteLeadId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-4">
          <h2 className="text-xl font-bold mb-4">Category not found</h2>
          <Link href="/leads" className="text-primary hover:underline font-medium">
            ← Back to My Leads
          </Link>
        </div>
      </div>
    );
  }

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.nickname?.toLowerCase().includes(q) ||
      lead.handle?.toLowerCase().includes(q) ||
      lead.bio?.toLowerCase().includes(q)
    );
  }).filter((lead) => {
    return filterPlatform === "all" || lead.platform === filterPlatform;
  }).filter((lead) => {
    if (filterEngage === "all") return true;
    return filterEngage === "engaged" ? lead.is_tracked : !lead.is_tracked;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Link
              href="/leads"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium text-sm">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingName(!editingName)}
                className="p-2 text-muted-foreground hover:text-foreground transition-all"
                title="Edit category"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteCategoryDialogOpen(true)}
                className="p-2 text-muted-foreground hover:text-destructive transition-all"
                title="Delete category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {editingName ? (
            <div className="space-y-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-2xl font-bold bg-background border rounded-lg px-3 py-2"
                autoFocus
              />
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description"
                className="w-full text-sm text-muted-foreground bg-background border rounded-lg px-3 py-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={updateCategory}
                  className="px-4 py-1.5 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90"
                >
                  <Check className="w-4 h-4 inline mr-1" />
                  Save
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="px-4 py-1.5 text-sm text-muted-foreground"
                >
                  <X className="w-4 h-4 inline mr-1" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <FolderOpen className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">{category.name}</h1>
              </div>
              {category.description && (
                <p className="text-muted-foreground text-sm mt-1 ml-9">{category.description}</p>
              )}
              <p className="text-muted-foreground text-sm mt-1 ml-9">
                {leads.length} lead{leads.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-card border rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or handle..."
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-background"
              />
            </div>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value as any)}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
            >
              <option value="all">All Platforms</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="x">X</option>
              <option value="linkedin">LinkedIn</option>
              <option value="facebook">Facebook</option>
            </select>
            <select
              value={filterEngage}
              onChange={(e) => setFilterEngage(e.target.value as any)}
              className="border rounded-lg px-3 py-2 text-sm bg-background"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="engaged">Engaged</option>
            </select>
          </div>
        </div>

        {/* Empty state */}
        {filteredLeads.length === 0 && (
          <div className="bg-card border rounded-2xl p-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {leads.length === 0 ? "No leads in this category yet" : "No matches"}
            </h3>
            {leads.length === 0 && (
              <Link
                href="/"
                className="inline-block px-6 py-2.5 bg-foreground text-background rounded-lg hover:opacity-90 transition-all text-sm font-medium"
              >
                Discover Leads
              </Link>
            )}
          </div>
        )}

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-card border rounded-xl p-4 w-full"
            >
              <Link href={`/leads/${lead.id}`} className="flex items-start gap-3 mb-3">
                <img
                  src={lead.avatar_url ?? undefined}
                  alt={lead.nickname || ""}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                  }}
                />
                <div className="hidden w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                  {lead.nickname?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <h4 className="font-semibold truncate text-sm max-w-[140px] sm:max-w-[200px]">{lead.nickname}</h4>
                    {lead.verified && <span className="text-blue-400 shrink-0 text-xs">✓</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      lead.platform === "tiktok" ? "bg-blue-900/30 text-blue-400" :
                      lead.platform === "x" ? "bg-gray-700 text-white" :
                      lead.platform === "instagram" ? "bg-pink-900/30 text-pink-400" :
                      lead.platform === "linkedin" ? "bg-blue-900/30 text-blue-400" :
                      lead.platform === "facebook" ? "bg-blue-900/30 text-blue-400" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {lead.platform === "tiktok" ? "TT" : lead.platform === "x" ? "X" : lead.platform === "instagram" ? "IG" : lead.platform === "linkedin" ? "LN" : lead.platform === "facebook" ? "FB" : lead.platform}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">@{lead.handle}</p>
                </div>
              </Link>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-muted rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground">Followers</p>
                  <p className="font-semibold text-sm">{(lead.followers || 0).toLocaleString()}</p>
                </div>
                <div className="bg-muted rounded-lg p-2.5">
                  <p className="text-[10px] text-muted-foreground">Engagement</p>
                  <p className="font-semibold text-sm text-green-400">{lead.engagement_rate}%</p>
                </div>
              </div>

              {lead.email && (
                <div className="flex items-center gap-1.5 text-xs bg-green-900/20 p-2 rounded-lg mb-3">
                  <Mail className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span className="truncate text-green-400">{lead.email}</span>
                </div>
              )}

              <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => toggleTracked(lead)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    lead.is_tracked ? "bg-green-900/30 text-green-400" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {lead.is_tracked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  {lead.is_tracked ? "Engaged" : "Engage"}
                </button>
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="p-2 bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50">
                    <Mail className="w-3.5 h-3.5" />
                  </a>
                )}
                <a href={lead.profile_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20">
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => removeLeadFromCategory(lead.id)}
                  className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                  title="Remove from category"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop table */}
        {filteredLeads.length > 0 && (
          <div className="hidden md:block bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Creator</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Followers</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Engagement</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Platform</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <Link href={`/leads/${lead.id}`} className="flex items-center gap-3">
                        <img
                          src={lead.avatar_url ?? undefined}
                          alt={lead.nickname ?? ""}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                          }}
                        />
                        <div className="hidden w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {lead.nickname?.charAt(0) || "?"}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-1.5">
                            <span>{lead.nickname}</span>
                            {lead.verified && <span className="text-blue-400 text-xs">✓</span>}
                          </div>
                          <div className="text-sm text-muted-foreground">@{lead.handle}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium">{lead.followers?.toLocaleString() || 0}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">
                        {lead.engagement_rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lead.platform === "linkedin" ? "bg-blue-900/30 text-blue-400" :
                        lead.platform === "tiktok" ? "bg-blue-900/30 text-blue-400" :
                        lead.platform === "x" ? "bg-gray-700 text-white" :
                        lead.platform === "instagram" ? "bg-pink-900/30 text-pink-400" :
                        lead.platform === "facebook" ? "bg-blue-900/30 text-blue-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {lead.platform === "linkedin" ? "LinkedIn" :
                         lead.platform === "tiktok" ? "TikTok" :
                         lead.platform === "x" ? "X" :
                         lead.platform === "instagram" ? "Instagram" :
                         lead.platform === "facebook" ? "Facebook" :
                         lead.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {lead.email ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Mail className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          <span className="text-muted-foreground truncate max-w-[180px]">{lead.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No email</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleTracked(lead)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          lead.is_tracked
                            ? "bg-green-900/30 text-green-400"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {lead.is_tracked ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                        {lead.is_tracked ? "Engaged" : "Engage"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="p-1.5 bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50">
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <a href={lead.profile_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20">
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => removeLeadFromCategory(lead.id)}
                          className="p-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                          title="Remove from category"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDeleteLead(lead.id)}
                          className="p-1.5 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50"
                          title="Delete lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Category Dialog */}
      <Dialog open={deleteCategoryDialogOpen} onOpenChange={setDeleteCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{category?.name}</strong>? Leads in this category will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteCategory}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Lead Dialog */}
      <Dialog open={deleteLeadDialogOpen} onOpenChange={setDeleteLeadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setDeleteLeadDialogOpen(false);
              setDeleteLeadId(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteLead}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
