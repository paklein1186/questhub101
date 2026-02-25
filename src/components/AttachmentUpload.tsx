import { useRef, useState } from "react";
import { Paperclip, X, FileText, Image, Film, Music, File, Upload, Heart, Trash2, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AttachmentTargetType } from "@/types/enums";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface AttachmentUploadProps {
  targetType: AttachmentTargetType;
  targetId: string;
  onAttachmentsChange?: () => void;
  className?: string;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return Music;
  if (type.includes("pdf") || type.includes("document") || type.includes("text")) return FileText;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentUpload({ targetType, targetId, onAttachmentsChange, className }: AttachmentUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const currentUser = useCurrentUser();
  const qc = useQueryClient();
  const queryKey = ["attachments", targetType, targetId];

  const { data: existing = [] } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from("attachments")
        .select("*")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || !currentUser.id) return;
    for (const file of Array.from(files)) {
      const safeName = file.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${currentUser.id}/${targetId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("quest-attachments")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (uploadError) {
        console.error("Upload failed:", uploadError.message);
        continue;
      }
      const { data: urlData } = supabase.storage
        .from("quest-attachments")
        .getPublicUrl(path);
      await supabase.from("attachments").insert({
        file_url: urlData.publicUrl,
        file_name: file.name,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
        target_type: targetType,
        target_id: targetId,
        uploaded_by_user_id: currentUser.id,
      });
    }
    qc.invalidateQueries({ queryKey });
    onAttachmentsChange?.();
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removeAttachment = async (id: string) => {
    await supabase.from("attachments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey });
    onAttachmentsChange?.();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label className="text-sm font-medium block">Attachments</label>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 hover:border-primary/40 hover:bg-muted/50 transition-all cursor-pointer"
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Drop files or click to upload</span>
      </div>
      <input ref={fileRef} type="file" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
    </div>
  );
}

/** Read-only list of attachments for detail pages */
export function AttachmentList({ targetType, targetId }: { targetType: AttachmentTargetType; targetId: string }) {
  const currentUser = useCurrentUser();
  const qc = useQueryClient();
  const listKey = ["attachments-list", targetType, targetId];

  const { data: items = [] } = useQuery({
    queryKey: listKey,
    queryFn: async () => {
      const { data } = await supabase
        .from("attachments")
        .select("*")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: myUpvotes = [] } = useQuery({
    queryKey: ["attachment-upvotes-mine", targetType, targetId],
    queryFn: async () => {
      if (!currentUser.id) return [];
      const ids = items.map((i) => i.id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("attachment_upvotes")
        .select("attachment_id")
        .eq("user_id", currentUser.id)
        .in("attachment_id", ids);
      return (data ?? []).map((r) => r.attachment_id);
    },
    enabled: items.length > 0 && !!currentUser.id,
  });

  const toggleLike = useMutation({
    mutationFn: async (attachmentId: string) => {
      if (!currentUser.id) return;
      const liked = myUpvotes.includes(attachmentId);
      if (liked) {
        await supabase.from("attachment_upvotes").delete().eq("attachment_id", attachmentId).eq("user_id", currentUser.id);
      } else {
        await supabase.from("attachment_upvotes").insert({ attachment_id: attachmentId, user_id: currentUser.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      qc.invalidateQueries({ queryKey: ["attachment-upvotes-mine", targetType, targetId] });
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async (att: { id: string; file_url: string }) => {
      // Try to remove from storage
      try {
        const url = new URL(att.file_url);
        const pathMatch = url.pathname.match(/\/object\/public\/quest-attachments\/(.+)/);
        if (pathMatch) {
          await supabase.storage.from("quest-attachments").remove([decodeURIComponent(pathMatch[1])]);
        }
      } catch { /* ignore storage errors */ }
      const { error } = await supabase.from("attachments").delete().eq("id", att.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const updateTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("attachments").update({ title } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      setEditingId(null);
    },
  });

  const startEdit = (att: any) => {
    setEditingId(att.id);
    setEditTitle(att.title || att.file_name || "");
  };

  const submitEdit = (id: string) => {
    if (editTitle.trim()) {
      updateTitle.mutate({ id, title: editTitle.trim() });
    } else {
      setEditingId(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-display font-semibold text-sm flex items-center gap-2">
        <Paperclip className="h-4 w-4" /> Documents ({items.length})
      </h4>
      <div className="space-y-1.5">
        {items.map((att) => {
          const Icon = getFileIcon(att.mime_type ?? "");
          const isOwner = currentUser.id === att.uploaded_by_user_id;
          const liked = myUpvotes.includes(att.id);
          const isEditing = editingId === att.id;
          const displayTitle = (att as any).title || att.file_name || "Untitled";
          return (
            <div key={att.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm group">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                {isEditing ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitEdit(att.id)}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => submitEdit(att.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <a
                    href={`/documents/${att.id}`}
                    className="truncate flex-1 font-medium hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const popup = window.open(`/documents/${att.id}`, "_blank", "noopener,noreferrer");
                      if (!popup) window.location.assign(`/documents/${att.id}`);
                    }}
                  >
                    {displayTitle}
                  </a>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0"
                  onClick={() => toggleLike.mutate(att.id)}
                  disabled={!currentUser.id}
                >
                  <Heart className={cn("h-3.5 w-3.5 transition-colors", liked ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
                </Button>
                {(att.upvote_count ?? 0) > 0 && (
                  <span className="text-xs text-muted-foreground -ml-1">{att.upvote_count}</span>
                )}
                {isOwner && !isEditing && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => startEdit(att)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isOwner && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive hover:text-destructive"
                    onClick={() => deleteAttachment.mutate({ id: att.id, file_url: att.file_url })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-muted-foreground">
                <span>{formatSize(att.file_size ?? 0)}</span>
                <span>Uploaded {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
