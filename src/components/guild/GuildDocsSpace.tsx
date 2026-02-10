import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, FileText, Pin, PinOff, Trash2, Pencil, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

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
      // Fetch author profiles
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

  const createDoc = async () => {
    if (!docTitle.trim()) return;
    const { error } = await supabase.from("guild_docs" as any).insert({
      guild_id: guildId,
      title: docTitle.trim(),
      content: docContent,
      created_by_user_id: currentUser.id,
    } as any);
    if (error) { toast({ title: "Failed to create doc", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["guild-docs", guildId] });
    setDocTitle(""); setDocContent(""); setCreateOpen(false);
    toast({ title: "Document created" });
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
    toast({ title: "Document deleted" });
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) return;
    await supabase.from("guild_docs" as any).update({
      title: editTitle.trim(),
      content: editContent,
      updated_by_user_id: currentUser.id,
      updated_at: new Date().toISOString(),
    } as any).eq("id", viewingDoc.id);
    qc.invalidateQueries({ queryKey: ["guild-docs", guildId] });
    setViewingDoc({ ...viewingDoc, title: editTitle, content: editContent });
    setEditing(false);
    toast({ title: "Document updated" });
  };

  const openDoc = (doc: any) => {
    setViewingDoc(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content || "");
    setEditing(false);
  };

  if (!isMember) return <p className="text-sm text-muted-foreground">Join the guild to view documents.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading docs…</p>;

  // Doc detail view
  if (viewingDoc) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setViewingDoc(null)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to docs
        </Button>
        <div className="flex items-center justify-between">
          {editing ? (
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-lg font-bold" />
          ) : (
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              {viewingDoc.is_pinned && <Pin className="h-4 w-4 text-primary" />}
              {viewingDoc.title}
            </h2>
          )}
          <div className="flex gap-1.5">
            {isAdmin && (
              <Button size="sm" variant="ghost" onClick={() => togglePin(viewingDoc)}>
                {viewingDoc.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </Button>
            )}
            {isMember && !editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
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
        </p>
        {editing ? (
          <div className="space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm resize-y"
              placeholder="Write your document content in markdown…"
            />
            <div className="flex gap-2">
              <Button onClick={saveEdit}>Save</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border bg-card p-4 min-h-[200px] whitespace-pre-wrap">
            {viewingDoc.content || <span className="text-muted-foreground italic">No content yet.</span>}
          </div>
        )}
      </div>
    );
  }

  // Docs list view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold">Documents ({docs.length})</h3>
        {isMember && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Document
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
        {docs.length === 0 && <p className="text-muted-foreground text-sm">No documents yet. Create the first one!</p>}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Document</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Document title" maxLength={200} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Content (markdown)</label>
              <Textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="min-h-[200px] font-mono text-sm resize-y"
                placeholder="Start writing…"
              />
            </div>
            <Button onClick={createDoc} disabled={!docTitle.trim()} className="w-full">Create Document</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
