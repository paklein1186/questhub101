import { useRef, useState } from "react";
import { Paperclip, X, FileText, Image, Film, Music, File, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Attachment } from "@/types";
import { AttachmentTargetType } from "@/types/enums";
import { attachments as allAttachments } from "@/data/mock";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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
  const [, rerender] = useState(0);

  const existing = allAttachments.filter(
    (a) => a.targetEntityType === targetType && a.targetEntityId === targetId
  );

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const attachment: Attachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        fileUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        size: file.size,
        targetEntityType: targetType,
        targetEntityId: targetId,
        uploadedByUserId: currentUser.id,
        createdAt: new Date().toISOString(),
      };
      allAttachments.push(attachment);
    });
    rerender((n) => n + 1);
    onAttachmentsChange?.();
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const removeAttachment = (id: string) => {
    const idx = allAttachments.findIndex((a) => a.id === id);
    if (idx >= 0) allAttachments.splice(idx, 1);
    rerender((n) => n + 1);
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

      <input
        ref={fileRef}
        type="file"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {existing.length > 0 && (
        <div className="space-y-1.5">
          {existing.map((att) => {
            const Icon = getFileIcon(att.fileType);
            return (
              <div
                key={att.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm group"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate flex-1 hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {att.fileName}
                </a>
                <span className="text-xs text-muted-foreground shrink-0">{formatSize(att.size)}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => removeAttachment(att.id)}
                >
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
  const items = allAttachments.filter(
    (a) => a.targetEntityType === targetType && a.targetEntityId === targetId
  );
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-display font-semibold text-sm flex items-center gap-2">
        <Paperclip className="h-4 w-4" /> Documents ({items.length})
      </h4>
      <div className="space-y-1.5">
        {items.map((att) => {
          const Icon = getFileIcon(att.fileType);
          return (
            <a
              key={att.id}
              href={att.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary/30 transition-all"
            >
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{att.fileName}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatSize(att.size)}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
