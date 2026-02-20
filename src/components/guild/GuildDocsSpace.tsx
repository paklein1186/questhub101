import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useCollaborativeDoc } from "@/hooks/useCollaborativeDoc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, FileText, Pin, PinOff, Trash2, Pencil, ArrowLeft, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { NotionEditor } from "./NotionEditor";
import { ExternalLinksPanel, type ExternalLinkItem } from "./ExternalLinksPanel";

interface GuildDocsSpaceProps {
  guildId: string;
  isMember: boolean;
  isAdmin: boolean;
}

export function GuildDocsSpace({ guildId, isMember, isAdmin }: GuildDocsSpaceProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");

  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  // Collaborative Yjs doc
  const { ydoc, activeUsers } = useCollaborativeDoc(viewingDoc?.id ?? null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedHtml = useRef<string>("");

  // External links stored in features_config
  const { data: externalLinks = [] } = useQuery<ExternalLinkItem[]>({
    queryKey: ["guild-external-links", guildId],
    queryFn: async () => {
      const { data } = await supabase
        .from("guilds")
        .select("features_config")
        .eq("id", guildId)
        .single();
      const cfg = (data?.features_config as any) || {};
      return (cfg.external_links as ExternalLinkItem[]) || [];
    },
    enabled: isMember,
  });

  const updateExternalLinks = async (links: ExternalLinkItem[]) => {
    const { data: guild } = await supabase
      .from("guilds")
      .select("features_config")
      .eq("id", guildId)
      .single();
    const cfg = ((guild?.features_config as any) || {});
    await supabase
      .from("guilds")
      .update({ features_config: { ...cfg, external_links: links } } as any)
      .eq("id", guildId);
    qc.invalidateQueries({ queryKey: ["guild-external-links", guildId] });
  };

  // Docs list
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["guild-docs", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guild_docs" as any)
        .select("*")
        .eq("guild_id", guildId)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data || []).map((d: any) => d.created_by_user_id))];
      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles_public").select("user_id, name, avatar_url").in("user_id", userIds as string[]);
        profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      }
      return (data || []).map((d: any) => ({ ...d, author: profileMap.get(d.created_by_user_id) }));
    },
    enabled: isMember,
  });

  // Auto-save every 5 seconds when viewing a doc
  const editorHtmlRef = useRef("");
  const handleEditorChange = useCallback((html: string) => {
    editorHtmlRef.current = html;
  }, []);

  const saveDoc = useCallback(async () => {
    if (!viewingDoc) return;
    const html = editorHtmlRef.current;
    if (html === lastSavedHtml.current) return; // No changes

    setIsSaving(true);
    await supabase.from("guild_docs" as any).update({
      content: html,
      updated_by_user_id: currentUser.id,
      updated_at: new Date().toISOString(),
    } as any).eq("id", viewingDoc.id);
    lastSavedHtml.current = html;
    setIsSaving(false);
  }, [viewingDoc, currentUser.id]);

  useEffect(() => {
    if (!viewingDoc) return;
    autoSaveRef.current = setInterval(saveDoc, 5000);
    return () => {
      // Save on close
      saveDoc();
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [viewingDoc, saveDoc]);

  const createDoc = async () => {
    if (!docTitle.trim()) return;
    const { error } = await supabase.from("guild_docs" as any).insert({
      guild_id: guildId,
      title: docTitle.trim(),
      content: docContent,
      created_by_user_id: currentUser.id,
    } as any);
    if (error) { toast({ title: "Failed to create page", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["guild-docs", guildId] });
    setDocTitle(""); setDocContent(""); setCreateOpen(false);
    toast({ title: "Page created" });
  };

  const togglePin = async (doc: any) => {
    await supabase.from("guild_docs" as any).update({ is_pinned: !doc.is_pinned } as any).eq("id", doc.id);
    qc.invalidateQueries({ queryKey: ["guild-docs", guildId] });
    if (viewingDoc?.id === doc.id) setViewingDoc({ ...viewingDoc, is_pinned: !doc.is_pinned });
  };

  const deleteDoc = async (docId: string) => {
    await supabase.from("guild_docs" as any).delete().eq("id", docId);
    qc.invalidateQueries({ queryKey: ["guild-docs", guildId] });
    setViewingDoc(null);
    toast({ title: "Page deleted" });
  };

  const saveTitle = async () => {
    if (!editTitle.trim() || !viewingDoc) return;
    await supabase.from("guild_docs" as any).update({
      title: editTitle.trim(),
      updated_by_user_id: currentUser.id,
      updated_at: new Date().toISOString(),
    } as any).eq("id", viewingDoc.id);
    qc.invalidateQueries({ queryKey: ["guild-docs", guildId] });
    setViewingDoc({ ...viewingDoc, title: editTitle.trim() });
    setEditingTitle(false);
  };

  const openDoc = (doc: any) => {
    // Save current doc before switching
    if (viewingDoc) saveDoc();
    setViewingDoc(doc);
    setEditTitle(doc.title);
    editorHtmlRef.current = doc.content || "";
    lastSavedHtml.current = doc.content || "";
    setEditingTitle(false);
  };

  if (!isMember) return <p className="text-sm text-muted-foreground">Join the guild to view documents.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading docs…</p>;

  // ── Doc detail view (always-editable collaborative pad) ──
  if (viewingDoc) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { saveDoc(); setViewingDoc(null); qc.invalidateQueries({ queryKey: ["guild-docs", guildId] }); }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex-1" />
          {/* Active collaborators */}
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex -space-x-1.5">
                {activeUsers.slice(0, 4).map((u, i) => (
                  <Avatar key={i} className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-[9px] font-bold text-white" style={{ backgroundColor: u.color }}>
                      {u.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{activeUsers.length} editing</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="flex items-center gap-2">
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-xl font-bold font-display" onKeyDown={(e) => e.key === "Enter" && saveTitle()} />
              <Button size="sm" onClick={saveTitle}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>Cancel</Button>
            </div>
          ) : (
            <h2 className="font-display text-xl font-bold flex items-center gap-2 cursor-pointer group flex-1" onClick={() => isMember && setEditingTitle(true)}>
              {viewingDoc.is_pinned && <Pin className="h-4 w-4 text-primary" />}
              {viewingDoc.title}
              <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
          )}
          <div className="flex gap-1.5 shrink-0">
            {isAdmin && (
              <Button size="sm" variant="ghost" onClick={() => togglePin(viewingDoc)}>
                {viewingDoc.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </Button>
            )}
            {(isAdmin || viewingDoc.created_by_user_id === currentUser.id) && (
              <Button size="sm" variant="ghost" onClick={() => deleteDoc(viewingDoc.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          By {viewingDoc.author?.name} · Updated {formatDistanceToNow(new Date(viewingDoc.updated_at), { addSuffix: true })}
          {isSaving && <span className="ml-2 text-primary">• Saving…</span>}
        </p>

        {/* Always-editable collaborative editor */}
        <NotionEditor
          content={viewingDoc.content || ""}
          onChange={handleEditorChange}
          onSave={saveDoc}
          editable={isMember}
          placeholder="Start writing together…"
          ydoc={ydoc}
          activeUsers={activeUsers}
          isSaving={isSaving}
        />
      </div>
    );
  }

  // ── Docs list view ──
  return (
    <div className="space-y-6">
      <ExternalLinksPanel links={externalLinks} onLinksChange={updateExternalLinks} canEdit={isAdmin} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold">Wiki ({docs.length})</h3>
          {isMember && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Page
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {docs.map((doc: any) => (
            <div
              key={doc.id}
              onClick={() => openDoc(doc)}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-all cursor-pointer"
            >
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {doc.is_pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  By {doc.author?.name} · {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          {docs.length === 0 && <p className="text-muted-foreground text-sm">No pages yet. Create the first one!</p>}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Page</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Page title" maxLength={200} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content</label>
              <NotionEditor content={docContent} onChange={setDocContent} editable placeholder="Start writing…" />
            </div>
            <Button onClick={createDoc} disabled={!docTitle.trim()} className="w-full">Create Page</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
