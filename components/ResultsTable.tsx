"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  MessageCircle,
  ExternalLink,
  Download,
  Bookmark,
  BookmarkCheck,
  FolderPlus,
  X,
  Plus,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Lead {
  handle: string;
  nickname: string;
  profile_url: string;
  avatar?: string;
  followers: number;
  engagement_rate: number;
  email: string | null;
  bioLink: string | null;
  verified: boolean;
  bio?: string;
  total_likes?: number;
  video_count?: number;
  instagram_handle?: string;
}

interface ResultsTableProps {
  data: {
    creators?: Lead[];
    total_found?: number;
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
}

export default function ResultsTable({ data }: ResultsTableProps) {
  const creators = data?.creators || [];
      const total_found = data?.total_found || creators.length;
  const [savedLeads, setSavedLeads] = useState<Set<string>>(new Set());
  const [savingLeads, setSavingLeads] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);
  const [savedAllCount, setSavedAllCount] = useState(0);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  // Category picker dialog
    const [showCategoryDialog, setShowCategoryDialog] = useState(false);
      const [pendingCreator, setPendingCreator] = useState<Lead | null>(null);
      const [saveAllMode, setSaveAllMode] = useState(false);
      const [categories, setCategories] = useState<Category[]>([]);
      const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
      const [newCategoryName, setNewCategoryName] = useState("");
      const [newCategoryDesc, setNewCategoryDesc] = useState("");
      const [showNewCategory, setShowNewCategory] = useState(false);
      const [loadingCategories, setLoadingCategories] = useState(false);

  // Load categories when dialog opens
  useEffect(() => {
    if (showCategoryDialog) {
      loadCategories();
    }
  }, [showCategoryDialog]);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const res = await fetch("/api/categories", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const result = await res.json();
        setCategories(result.categories || []);
      }
    } catch (e) {
      console.error("Failed to load categories", e);
    } finally {
      setLoadingCategories(false);
    }
  };

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 3000);
  };

  if (creators.length === 0) {
    return (
      <div className="bg-background rounded-2xl border shadow-sm p-12 text-center">
        <p className="text-muted-foreground">
          No leads found. Try a different search query.
        </p>
      </div>
    );
  }

  const openSaveDialog = (creator: Lead, saveAll = false) => {
      setPendingCreator(creator);
      setSelectedCategoryId("");
      setShowNewCategory(false);
      setNewCategoryName("");
      setNewCategoryDesc("");
      setSaveAllMode(saveAll);
      setShowCategoryDialog(true);
    };

  const createAndSaveCategory = async () => {
    if (!newCategoryName.trim() || !pendingCreator) return;
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDesc.trim(),
        }),
      });
      if (res.ok) {
        const result = await res.json();
        // Save lead with the new category
        await saveLeadWithCategory(pendingCreator, result.category.id);
        setShowCategoryDialog(false);
        setPendingCreator(null);
      }
    } catch (e) {
      console.error("Failed to create category", e);
    }
  };

  const saveLeadWithCategory = async (creator: Lead, categoryId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please sign in to save leads");
      return;
    }

    try {
      setSavingLeads((prev) => new Set(prev).add(creator.handle));
      const session = await supabase.auth.getSession();
            const token = session?.data?.session?.access_token;
            const headers: Record<string, string> = {
              "Content-Type": "application/json",
            };
            if (token) headers["Authorization"] = `Bearer ${token}`;
            setSavingLeads((prev) => new Set(prev).add(creator.handle));
            const res = await fetch("/api/leads/save", {
              method: "POST",
              headers,
        body: JSON.stringify({ ...creator, category_id: categoryId || null }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Save failed");
      }

      setSavedLeads((prev) => new Set(prev).add(creator.handle));
      showToast("Lead saved successfully! 🎉");
    } catch (error) {
      console.error("Error saving lead:", error);
      alert("Failed to save lead");
    } finally {
      setSavingLeads((prev: Set<string>) => {
        const newSet = new Set(prev);
        newSet.delete(creator.handle);
        return newSet;
      });
    }
  };

  const saveLead = async (creator: Lead) => {
    openSaveDialog(creator);
  };

  const handleSaveWithCategory = async () => {
    if (saveAllMode) {
      if (showNewCategory && newCategoryName.trim()) {
        const session = await supabase.auth.getSession();
        const token = session?.data?.session?.access_token;
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: newCategoryName.trim(),
            description: newCategoryDesc.trim(),
          }),
        });
        if (res.ok) {
          const result = await res.json();
          await saveAllLeadsWithCategory(result.category.id);
        }
      } else {
        await saveAllLeadsWithCategory(selectedCategoryId);
      }
      return;
    }

    if (!pendingCreator) return;

    if (showNewCategory && newCategoryName.trim()) {
      await createAndSaveCategory();
    } else {
      await saveLeadWithCategory(pendingCreator, selectedCategoryId);
      setShowCategoryDialog(false);
      setPendingCreator(null);
    }
  };

  const exportCSV = () => {
    const csv = [
      ["Handle", "Name", "Followers", "Engagement", "Email", "Profile URL"],
      ...creators.map((c) => [
        c.handle,
        c.nickname,
        c.followers,
        c.engagement_rate + "%",
        c.email || "N/A",
        c.profile_url,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creata-leads-${Date.now()}.csv`;
    a.click();
  };

  const saveAllLeads = async () => {
    if (!creators || creators.length === 0) return;
    openSaveDialog(creators[0], true);
  };

  const saveAllLeadsWithCategory = async (categoryId: string) => {
    setSavingAll(true);
    setSavedAllCount(0);

    const toSave = creators.filter((c) => !savedLeads.has(c.handle));
    const concurrency = 5;
    let index = 0;
    let savedCount = 0;

    const runNext = async () => {
      if (index >= toSave.length) return;
      const creator = toSave[index++];
      try {
        const session = await supabase.auth.getSession();
                const token = session?.data?.session?.access_token;
                setSavingLeads((prev) => new Set(prev).add(creator.handle));
                const headers: Record<string, string> = {
                  "Content-Type": "application/json",
                };
                if (token) headers["Authorization"] = `Bearer ${token}`;
                const res = await fetch("/api/leads/save", {
                  method: "POST",
                  headers,
          body: JSON.stringify({ ...creator, category_id: categoryId || null }),
        });
        if (res.ok) {
          setSavedLeads((prev) => new Set(prev).add(creator.handle));
          savedCount += 1;
          setSavedAllCount((n) => n + 1);
        }
      } catch (e) {
        console.error("Failed to save", creator.handle, e);
      } finally {
        setSavingLeads((prev) => {
          const next = new Set(prev);
          next.delete(creator.handle);
          return next;
        });
        await runNext();
      }
    };

    await Promise.all(
      new Array(Math.min(concurrency, toSave.length))
        .fill(0)
        .map(() => runNext())
    );
    setSavingAll(false);
    setShowCategoryDialog(false);
    setPendingCreator(null);
    setSaveAllMode(false);
    showToast(`Saved ${savedCount} of ${toSave.length} leads`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white">
            🎯 Found {total_found} Leads
          </h3>
          <p className="text-blue-100">Click save to pick a category</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveAllLeads}
            disabled={savingAll || creators.length === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              savingAll
                ? "bg-white/80 text-blue-600 cursor-not-allowed"
                : "bg-white text-blue-600 hover:shadow-lg"
            }`}
            title="Save all leads to My Leads"
          >
            {savingAll ? (
              <span className="text-sm">
                Saving {savedAllCount}/{creators.length}
              </span>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>Save All</span>
              </>
            )}
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center space-x-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {creators.map((creator, index) => {
          const isSaved = savedLeads.has(creator.handle);
          const isSaving = savingLeads.has(creator.handle);

          return (
            <div
              key={creator.handle || index}
              className="bg-card text-card-foreground rounded-xl shadow-sm border p-3.5 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start space-x-3 mb-3">
                {creator.avatar ? (
                  <img
                    src={creator.avatar}
                    alt={creator.nickname}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        creator.nickname
                      )}&background=4F46E5&color=fff`;
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                    {creator.nickname?.charAt(0) || "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-0.5">
                    <h4 className="font-semibold truncate text-sm">
                      {creator.nickname || "Unknown"}
                    </h4>
                    {creator.verified && (
                      <span className="text-blue-500 shrink-0 text-xs">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    @{creator.handle}
                  </p>
                </div>

                <button
                  onClick={() => saveLead(creator)}
                  disabled={isSaved || isSaving}
                  className={`p-2 rounded-lg shrink-0 transition-all ${
                    isSaved
                      ? "bg-green-100 text-green-700"
                      : "bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                >
                  {isSaving ? (
                    <span className="block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isSaved ? (
                    <BookmarkCheck className="w-4 h-4" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-muted rounded-lg py-2 px-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Followers</p>
                  <p className="font-semibold text-sm">
                    {(creator.followers || 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex-1 bg-muted rounded-lg py-2 px-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Engagement</p>
                  <p className="font-semibold text-green-600 text-sm">
                    {creator.engagement_rate || 0}%
                  </p>
                </div>
                <div className="flex-1 bg-muted rounded-lg py-2 px-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Email</p>
                  <p className="text-sm truncate font-medium">
                    {creator.email ? (
                      <span className="text-green-700">{creator.email}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <a
                  href={creator.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 active:scale-[0.97] transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  View Profile
                </a>
                {creator.email && (
                  <a
                    href={`mailto:${creator.email}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 active:scale-[0.97] transition-all"
                  >
                    <Mail className="w-4 h-4" />
                    Send Email
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-card text-card-foreground rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Lead</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Followers</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Engagement</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Contact</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {creators.map((creator, index) => {
                const isSaved = savedLeads.has(creator.handle);
                const isSaving = savingLeads.has(creator.handle);

                return (
                  <tr
                    key={creator.handle || index}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {creator.avatar ? (
                          <img
                            src={creator.avatar}
                            alt={creator.nickname}
                            className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                creator.nickname
                              )}&background=4F46E5&color=fff`;
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold">
                            {creator.nickname?.charAt(0) || "?"}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold flex items-center space-x-2">
                            <span>{creator.nickname || "Unknown"}</span>
                            {creator.verified && (
                              <span className="text-blue-500">✓</span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            @{creator.handle || "unknown"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {(creator.followers || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {creator.engagement_rate || 0}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {creator.email ? (
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="w-4 h-4 text-green-600" />
                          <span>{creator.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Email not found
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => saveLead(creator)}
                          disabled={isSaved || isSaving}
                          className={`p-2 rounded-lg transition-all ${
                            isSaved
                              ? "bg-green-100 text-green-700"
                              : "bg-primary/10 text-primary hover:bg-primary/20"
                          }`}
                          title={isSaved ? "Saved" : "Save Lead"}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>
                        {creator.email && (
                          <a
                            href={`mailto:${creator.email}`}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all"
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                        <a
                          href={creator.profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                          title="Open Profile"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                        {creator.bioLink && (
                          <a
                            href={creator.bioLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all"
                            title="Visit Website"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Picker Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                          <FolderPlus className="w-5 h-5" />
                          {saveAllMode ? "Save All Leads" : `Save @${pendingCreator?.handle}`}
                        </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {saveAllMode ? "Pick a category for all leads:" : "Pick a category for this lead:"}
            </p>

            {loadingCategories ? (
              <div className="text-sm text-muted-foreground animate-pulse">Loading categories...</div>
            ) : showNewCategory ? (
              <div className="space-y-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name (e.g. Fitness)"
                  autoFocus
                />
                <Input
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Description (optional)"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNewCategory(false)}
                    className="flex-1"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Pick existing
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  <button
                    onClick={() => setSelectedCategoryId("")}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategoryId === ""
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span className="text-muted-foreground">No category</span>
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategoryId === cat.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                      {cat.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          — {cat.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowNewCategory(true);
                    setSelectedCategoryId("");
                  }}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New category
                </button>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                              setShowCategoryDialog(false);
                              setPendingCreator(null);
                              setSaveAllMode(false);
                            }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveWithCategory}
              disabled={
                showNewCategory ? !newCategoryName.trim() : false
              }
            >
              <Check className="w-4 h-4 mr-1" />
                            {saveAllMode ? "Save All" : "Save Lead"}
                          </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast.visible && (
        <div
          className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <BookmarkCheck className="w-4 h-4 text-green-400" />
          <span className="text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
}