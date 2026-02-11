import { useState, useRef } from "react";
import { ImagePlus, Paperclip, Link2, Send, X, Loader2, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/hooks/useAuth";
import { useCreatePost, type PostAttachment } from "@/hooks/useFeedPosts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  parseVideoUrl,
  isImageFile,
  formatFileSize,
  MAX_FILE_SIZE,
  MAX_ATTACHMENTS_PER_POST,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_DOC_TYPES,
} from "@/lib/postHelpers";

interface PendingFile {
  file: File;
  previewUrl: string;
  type: "IMAGE" | "DOCUMENT";
}

interface PendingLink {
  url: string;
  type: "LINK" | "VIDEO_LINK";
  meta?: {
    title?: string | null;
    description?: string | null;
    image?: string | null;
    siteName?: string | null;
    videoId?: string;
    embedUrl?: string;
    provider?: string;
    thumbnailUrl?: string;
  };
  loading?: boolean;
}

interface PostComposerProps {
  contextType: string;
  contextId?: string;
}

export function PostComposer({ contextType, contextId }: PostComposerProps) {
  const currentUser = useCurrentUser();
  const { user: authUser } = useAuth();
  const createPost = useCreatePost();

  const [content, setContent] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [link, setLink] = useState<PendingLink | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const imgRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const canSubmit = content.trim() || files.length > 0 || link;

  const addFiles = (fileList: FileList | null, forceType?: "IMAGE" | "DOCUMENT") => {
    if (!fileList) return;
    const newFiles: PendingFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 50 MB limit`);
        continue;
      }
      if (files.length + newFiles.length >= MAX_ATTACHMENTS_PER_POST) {
        toast.error(`Max ${MAX_ATTACHMENTS_PER_POST} files per post`);
        break;
      }
      const type = forceType || (isImageFile(file.type) ? "IMAGE" : "DOCUMENT");
      newFiles.push({ file, previewUrl: URL.createObjectURL(file), type });
    }
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const fetchLinkPreview = async (url: string) => {
    // Check for video first
    const video = parseVideoUrl(url);
    if (video) {
      setLink({
        url,
        type: "VIDEO_LINK",
        meta: {
          provider: video.provider,
          videoId: video.videoId,
          embedUrl: video.embedUrl,
          thumbnailUrl: video.thumbnailUrl,
        },
      });
      setShowLinkInput(false);
      setLinkUrl("");
      return;
    }

    setLink({ url, type: "LINK", loading: true });
    setShowLinkInput(false);
    setLinkUrl("");

    try {
      const { data } = await supabase.functions.invoke("link-preview", {
        body: { url },
      });
      setLink({
        url,
        type: "LINK",
        meta: data ?? {},
      });
    } catch {
      setLink({ url, type: "LINK", meta: {} });
    }
  };

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    try {
      new URL(linkUrl.trim());
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    fetchLinkPreview(linkUrl.trim());
  };

  const uploadFile = async (file: File): Promise<string> => {
    // Sanitize filename: remove non-ASCII chars, spaces → dashes
    const ext = file.name.split(".").pop() ?? "bin";
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
    const path = `${currentUser.id}/${Date.now()}-${safeName}.${ext}`;
    const { error } = await supabase.storage
      .from("post-uploads")
      .upload(path, file, { contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("post-uploads").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!canSubmit || !currentUser.id) return;
    setUploading(true);

    try {
      // Upload files to storage
      const attachments: Omit<PostAttachment, "id" | "post_id" | "created_at">[] = [];

      for (const pf of files) {
        const url = await uploadFile(pf.file);
        attachments.push({
          type: pf.type,
          url,
          thumbnail_url: pf.type === "IMAGE" ? url : null,
          file_name: pf.file.name,
          file_size_bytes: pf.file.size,
          mime_type: pf.file.type,
          embed_provider: null,
          embed_meta: null,
          sort_order: attachments.length,
        });
      }

      // Add link attachment
      if (link) {
        attachments.push({
          type: link.type,
          url: link.url,
          thumbnail_url: link.meta?.image || link.meta?.thumbnailUrl || null,
          file_name: null,
          file_size_bytes: null,
          mime_type: null,
          embed_provider: link.type === "VIDEO_LINK" ? (link.meta?.provider ?? null) : null,
          embed_meta: link.meta ? (link.meta as any) : null,
          sort_order: attachments.length,
        });
      }

      await createPost.mutateAsync({
        authorUserId: currentUser.id,
        contextType,
        contextId,
        content: content.trim(),
        attachments,
      });

      // Reset
      setContent("");
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setFiles([]);
      setLink(null);
      toast.success("Post published!");
    } catch (err: any) {
      toast.error(err.message || "Failed to publish post");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-9 w-9 mt-0.5">
          <AvatarImage src={authUser?.avatarUrl} />
          <AvatarFallback>{authUser?.name?.[0] || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share an update, idea, or creation…"
            className="min-h-[80px] resize-none text-sm border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
            maxLength={2000}
          />

          {/* Image previews */}
          {files.filter((f) => f.type === "IMAGE").length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {files
                .map((f, i) => ({ ...f, idx: i }))
                .filter((f) => f.type === "IMAGE")
                .map((f) => (
                  <div key={f.idx} className="relative group rounded-lg overflow-hidden aspect-video bg-muted">
                    <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeFile(f.idx)}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Document chips */}
          {files.filter((f) => f.type === "DOCUMENT").length > 0 && (
            <div className="space-y-1">
              {files
                .map((f, i) => ({ ...f, idx: i }))
                .filter((f) => f.type === "DOCUMENT")
                .map((f) => (
                  <div key={f.idx} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{f.file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(f.file.size)}</span>
                    <button onClick={() => removeFile(f.idx)}>
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Link preview */}
          {link && (
            <div className="relative rounded-lg border border-border bg-muted/30 overflow-hidden">
              {link.loading ? (
                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Fetching preview…
                </div>
              ) : link.type === "VIDEO_LINK" ? (
                <div className="space-y-1">
                  {link.meta?.thumbnailUrl && (
                    <div className="aspect-video bg-muted flex items-center justify-center relative">
                      <img src={link.meta.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Film className="h-10 w-10 text-white drop-shadow-lg" />
                      </div>
                    </div>
                  )}
                  <div className="px-3 py-2">
                    <p className="text-xs text-muted-foreground">{link.meta?.provider} video</p>
                    <p className="text-sm truncate">{link.url}</p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3 p-3">
                  {link.meta?.image && (
                    <img src={link.meta.image} alt="" className="w-20 h-20 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {link.meta?.title && <p className="text-sm font-medium line-clamp-1">{link.meta.title}</p>}
                    {link.meta?.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{link.meta.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new URL(link.url).hostname}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setLink(null)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Link URL input */}
          {showLinkInput && (
            <div className="flex gap-2">
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
              />
              <Button size="sm" onClick={handleAddLink}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowLinkInput(false); setLinkUrl(""); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => imgRef.current?.click()}
            disabled={files.length >= MAX_ATTACHMENTS_PER_POST}
          >
            <ImagePlus className="h-4 w-4 mr-1" /> Image
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => docRef.current?.click()}
            disabled={files.length >= MAX_ATTACHMENTS_PER_POST}
          >
            <Paperclip className="h-4 w-4 mr-1" /> Document
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowLinkInput(true)}
            disabled={!!link}
          >
            <Link2 className="h-4 w-4 mr-1" /> Link
          </Button>
        </div>
        <Button
          size="sm"
          disabled={!canSubmit || uploading}
          onClick={handleSubmit}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
          Post
        </Button>
      </div>

      <input
        ref={imgRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files, "IMAGE"); e.target.value = ""; }}
      />
      <input
        ref={docRef}
        type="file"
        accept={ACCEPTED_DOC_TYPES}
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files, "DOCUMENT"); e.target.value = ""; }}
      />
    </div>
  );
}
