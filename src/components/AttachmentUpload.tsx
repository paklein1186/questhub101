import { useRef } from "react";
import { Paperclip, X, FileText, Image, Film, Music, File, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AttachmentTargetType } from "@/types/enums";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
      // For now, create object URL (real storage upload would go here)
      const fileUrl = URL.createObjectURL(file);
      await supabase.from("attachments").insert({
        file_url: fileUrl,
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
      {existing.length > 0 && (
        <div className="space-y-1.5">
          {existing.map((att) => {
            const Icon = getFileIcon(att.mime_type ?? "");
            return (
              <div key={att.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm group">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="truncate flex-1 hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                  {att.file_name}
                </a>
                <span className="text-xs text-muted-foreground shrink-0">{formatSize(att.file_size ?? 0)}</span>
                <Button type="button" size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={() => removeAttachment(att.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Read-only list of attachments for detail pages */
export function AttachmentList({ targetType, targetId }: { targetType: AttachmentTargetType; targetId: string }) {
  const { data: items = [] } = useQuery({
    queryKey: ["attachments-list", targetType, targetId],
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

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-display font-semibold text-sm flex items-center gap-2">
        <Paperclip className="h-4 w-4" /> Documents ({items.length})
      </h4>
      <div className="space-y-1.5">
        {items.map((att) => {
          const Icon = getFileIcon(att.mime_type ?? "");
          return (
            <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary/30 transition-all">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{att.file_name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatSize(att.file_size ?? 0)}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
