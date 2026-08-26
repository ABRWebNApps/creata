"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  MessageCircle,
  ExternalLink,
  Trash2,
  Bookmark,
  Search,
  BookmarkCheck,
  FolderOpen,
  FolderPlus,
  Plus,
  ChevronRight,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  is_tracked: boolean;
  category_id: string | null;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  lead_count: number;
};

export default function MyLeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [filterPlatform, setFilterPlatform] = useState<"all" | "tiktok" | "instagram" | "x" | "linkedin" | "facebook">("all");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"categories" | "all">("categories");
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    } else if (user) {
      loadData();
    }
  }, [user, authLoading]);

  const loadData = async () => {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      // Load categories + uncategorized count
      const catRes = await fetch("/api/categories", { headers });
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData.categories || []);
        setUncategorizedCount(catData.uncategorized_count || 0);
      }
    } catch (e) {
      console.error("Error loading categories:", e);
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async () => {
      if (!newCatName.trim()) return;
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      try {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers,
        body: JSON.stringify({ name: newCatName.trim(), description: newCatDesc.trim() }),
      });
      if (res.ok) {
        setNewCatName("");
        setNewCatDesc("");
        setShowCreateCategory(false);
        loadData();
      }
    } catch (e) {
      console.error("Failed to create category", e);
    }
  };

  const deleteCategory = (catId: string) => {
    setDeleteConfirmCategory(catId);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteConfirmCategory) return;
    const session = await supabase.auth.getSession();
    const token = session?.data?.session?.access_token;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      await fetch(`/api/categories/${deleteConfirmCategory}`, {
        method: "DELETE",
        headers,
      });
      setDeleteConfirmCategory(null);
      loadData();
    } catch (e) {
      console.error("Failed to delete category", e);
    }
  };

  // Filter leads
  const filteredLeads = leads
    .filter((lead) => {
      const matchesSearch =
        lead.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.handle?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlatform =
        filterPlatform === "all" || lead.platform === filterPlatform;
      return matchesSearch && matchesPlatform;
    })
    .sort((a, b) => (b.followers || 0) - (a.followers || 0));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">My Leads</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                {categories.length} categor{ categories.length === 1 ? "y" : "ies" }
                {uncategorizedCount > 0 && ` · ${uncategorizedCount} uncategorized`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateCategory(true)}
                className="px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-all text-sm font-medium flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Category</span>
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all text-sm font-medium"
              >
                Discover
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* View toggle + filter */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setView("categories")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              view === "categories"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <FolderOpen className="w-4 h-4 inline mr-1" />
            Categories
          </button>
          <button
            onClick={() => setView("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              view === "all"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bookmark className="w-4 h-4 inline mr-1" />
            All Leads
          </button>
        </div>

        {/* CATEGORIES VIEW */}
        {view === "categories" && (
          <>
            {/* Create category inline */}
            {showCreateCategory && (
              <div className="bg-card border rounded-xl p-4 mb-4 space-y-2">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name (e.g. Fitness)"
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
                  autoFocus
                />
                <input
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createCategory}
                    disabled={!newCatName.trim()}
                    className="px-4 py-1.5 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateCategory(false)}
                    className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Category Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/leads/categories/${cat.id}`}
                  className="bg-card border rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-primary" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteCategory(cat.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-base mb-1 truncate text-foreground">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {cat.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {cat.lead_count} lead{cat.lead_count !== 1 ? "s" : ""}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              ))}

              {/* Uncategorized card */}
              <Link
                href="/leads/uncategorized"
                className="bg-card border border-dashed rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                    <Bookmark className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                <h3 className="font-semibold text-base mb-1 text-foreground">Uncategorized</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Leads without a category
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {uncategorizedCount} lead{uncategorizedCount !== 1 ? "s" : ""}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Link>

              {/* Create new card */}
              <button
                onClick={() => setShowCreateCategory(true)}
                className="bg-card border border-dashed rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all flex flex-col items-center justify-center min-h-[140px] gap-2"
              >
                <Plus className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground font-medium">
                  New Category
                </span>
              </button>
            </div>
          </>
        )}

        {/* ALL LEADS VIEW */}
        {view === "all" && (
          <>
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
              </div>
            </div>

            {filteredLeads.length === 0 && (
              <div className="bg-card border rounded-2xl p-12 text-center">
                <Bookmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No leads saved yet</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Start finding leads and save them
                </p>
                <Link
                  href="/"
                  className="inline-block px-6 py-2.5 bg-foreground text-background rounded-lg hover:opacity-90 transition-all text-sm font-medium"
                >
                  Discover Creators
                </Link>
              </div>
            )}

            {filteredLeads.length > 0 && (
              <div className="bg-card border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Creator</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Followers</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Engagement</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Platform</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredLeads.map((lead) => (
                                              <tr
                                                key={lead.id}
                                                className="hover:bg-muted/50 transition-colors cursor-pointer"
                                              >
                                                <td className="px-6 py-4">
                                                  <a
                                                    href={`/leads/${lead.id}`}
                                                    onClick={(e) => {
                                                      e.preventDefault();
                                                      router.push(`/leads/${lead.id}`);
                                                    }}
                                                    className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                                                  >
                                                    <img
                                src={lead.avatar_url ?? undefined}
                                alt={lead.nickname ?? ""}
                                className="w-10 h-10 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden");
                                }}
                              />
                              <div className="hidden w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {lead.nickname?.charAt(0) || "?"}
                              </div>
                              <div>
                                <div className="font-medium flex items-center gap-1.5">
                                  <span>{lead.nickname}</span>
                                  {lead.verified && (
                                    <span className="text-blue-600 text-xs">✓</span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  @{lead.handle}
                                  {lead.category_id && (
                                    <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                      {categories.find(c => c.id === lead.category_id)?.name || "Categorized"}
                                    </span>
                                  )}
                                </div>
                              </div>
                                                          </a>
                                                        </td>
                          <td className="px-6 py-4 font-medium">
                            {lead.followers?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                          {lead.engagement_rate}%
                                                        </span>
                          </td>
                          <td className="px-6 py-4 text-sm capitalize">{lead.platform}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              {lead.email && (
                                <a
                                  href={`mailto:${lead.email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                                  title="Send Email"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <a
                                href={lead.profile_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                                title="Open Profile"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmCategory !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmCategory(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Delete this category? Leads will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteConfirmCategory(null)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteCategory}
              className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-all"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
