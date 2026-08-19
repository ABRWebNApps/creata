"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  MessageCircle,
  Trash2,
  Bookmark,
  BookmarkCheck,
  ArrowLeft,
  FolderOpen,
  X,
  Search,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

type SavedLead = {
  id: string;
  handle: string;
  nickname: string;
  platform: string;
  profile_url: string;
  avatar_url: string | null;
  verified: boolean;
  followers: number;
  engagement_rate: number;
  email: string | null;
  is_tracked: boolean;
  category_id: string | null;
  created_at: string;
};

export default function UncategorizedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<"all" | "tiktok" | "instagram" | "x" | "linkedin" | "facebook">("all");
  const [filterEngage, setFilterEngage] = useState<"all" | "engaged" | "pending">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return headers;
    };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin");
    } else if (user) {
      loadLeads();
    }
  }, [user, authLoading]);

  const loadLeads = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/categories", { headers });
      if (res.ok) {
        // We need a dedicated endpoint for uncategorized leads
        // For now, fetch all leads and filter client-side
        const leadsRes = await fetch("/api/leads", { headers });
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setLeads((data.leads || []).filter((l: SavedLead) => !l.category_id));
        }
      }
    } catch (e) {
      console.error("Error loading uncategorized leads:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTracked = async (lead: SavedLead) => {
    const headers = await getAuthHeaders();
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ is_tracked: !lead.is_tracked }),
      });
      if (res.ok) setLeads(leads.map((l) => (l.id === lead.id ? { ...l, is_tracked: !l.is_tracked } : l)));
    } catch (e) {
      console.error("Error:", e);
    }
  };

  const deleteLead = async (id: string) => {
    setLeadToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!leadToDelete) return;
    const headers = await getAuthHeaders();
    try {
      await fetch(`/api/leads/${leadToDelete}`, { method: "DELETE", headers });
      setLeads(leads.filter((l) => l.id !== leadToDelete));
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setDeleteDialogOpen(false);
      setLeadToDelete(null);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.nickname?.toLowerCase().includes(q) || l.handle?.toLowerCase().includes(q);
  }).filter((l) => {
    return filterPlatform === "all" || l.platform === filterPlatform;
  }).filter((l) => {
    if (filterEngage === "all") return true;
    return filterEngage === "engaged" ? l.is_tracked : !l.is_tracked;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-border border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Link href="/leads" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium text-sm">Back</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Bookmark className="w-6 h-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold">Uncategorized</h1>
              <p className="text-muted-foreground text-sm">{leads.length} lead{leads.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
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

        {filteredLeads.length === 0 && (
          <div className="bg-card border rounded-2xl p-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No uncategorized leads</h3>
          </div>
        )}

        {/* Mobile */}
        <div className="md:hidden space-y-3">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="bg-card border rounded-xl p-4 w-full">
              <Link href={`/leads/${lead.id}`} className="flex items-start gap-3 mb-3">
                <img
                  src={lead.avatar_url ?? undefined}
                  alt={lead.nickname || ""}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                  onError={(e) => { e.currentTarget.style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden"); }}
                />
                <div className="hidden w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                  {lead.nickname?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate text-sm">{lead.nickname}</h4>
                  <p className="text-xs text-muted-foreground truncate">@{lead.handle}</p>
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
              <div className="flex gap-2">
                <button onClick={() => toggleTracked(lead)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium ${lead.is_tracked ? "bg-green-900/30 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {lead.is_tracked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  {lead.is_tracked ? "Engaged" : "Engage"}
                </button>
                {lead.email && <a href={`mailto:${lead.email}`} className="p-2 bg-green-900/30 text-green-400 rounded-lg shrink-0"><Mail className="w-3.5 h-3.5" /></a>}
                <a href={lead.profile_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-primary/10 text-primary rounded-lg shrink-0"><MessageCircle className="w-3.5 h-3.5" /></a>
                <button onClick={() => deleteLead(lead.id)} className="p-2 bg-red-900/30 text-red-400 rounded-lg shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop */}
        {filteredLeads.length > 0 && (
          <div className="hidden md:block bg-card border rounded-2xl overflow-hidden">
            <table className="w-full">
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
                  <tr key={lead.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <Link href={`/leads/${lead.id}`} className="flex items-center gap-3">
                        <img src={lead.avatar_url ?? undefined} alt={lead.nickname ?? ""} className="w-10 h-10 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove("hidden"); }} />
                        <div className="hidden w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold text-sm">{lead.nickname?.charAt(0) || "?"}</div>
                        <div>
                          <div className="font-medium">{lead.nickname}</div>
                          <div className="text-sm text-muted-foreground">@{lead.handle}</div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium">{lead.followers?.toLocaleString() || 0}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400">{lead.engagement_rate}%</span>
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
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleTracked(lead)} className={`p-1.5 rounded-lg ${lead.is_tracked ? "bg-green-900/30 text-green-400" : "bg-muted text-muted-foreground"}`}>
                          {lead.is_tracked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                        </button>
                        {lead.email && <a href={`mailto:${lead.email}`} className="p-1.5 bg-green-900/30 text-green-400 rounded-lg"><Mail className="w-3.5 h-3.5" /></a>}
                        <a href={lead.profile_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-primary/10 text-primary rounded-lg"><MessageCircle className="w-3.5 h-3.5" /></a>
                        <button onClick={() => deleteLead(lead.id)} className="p-1.5 bg-red-900/30 text-red-400 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border bg-background hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}