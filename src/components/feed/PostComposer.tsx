import { useState, useRef } from "react";
import { MentionTextarea, extractMentionIds, extractAllMentions, type MentionedUser } from "@/components/MentionTextarea";
import { processMentions } from "@/lib/mentionNotifications";
import { ImagePlus, Paperclip, Link2, Send, X, Loader2, Film, Globe, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuth } from "@/hooks/useAuth";
import { useCreatePost, type PostAttachment } from "@/hooks/useFeedPosts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNotifications } from "@/hooks/useNotifications";
import {
  parseVideoUrl,
  isImageFile,
  formatFileSize,
  MAX_FILE_SIZE,
  MAX_ATTACHMENTS_PER_POST,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_DOC_TYPES,
} from "@/lib/postHelpers";
import { OntologyPicker } from "@/components/feed/OntologyPicker";

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
  showVisibilityPicker?: boolean;
  /** Pre-populate territory chips from parent entity */
  initialTerritoryIds?: string[];
  /** Pre-populate topic chips from parent entity */
  initialTopicIds?: string[];
  /** Discussion room ID */
  roomId?: string;
}

export function PostComposer({ contextType, contextId, showVisibilityPicker = false, initialTerritoryIds, initialTopicIds, roomId }: PostComposerProps) {
  const currentUser = useCurrentUser();

  // Derive entity context for @members/@followers in the mention dropdown
  const entityContext = (() => {
    const entityTypes = ["GUILD", "GUILD_DISCUSSION", "QUEST", "COMPANY", "POD"];
    if (entityTypes.includes(contextType) && contextId) {
      return { entityType: contextType.replace("_DISCUSSION", ""), entityId: contextId };
    }
    return undefined;
  })();
  const { user: authUser } = useAuth();
  const createPost = useCreatePost();
  const { notifyFollowedEntityNewPost } = useNotifications();

  const [content, setContent] = useState("");
  const [pendingMentions, setPendingMentions] = useState<MentionedUser[]>([]);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [link, setLink] = useState<PendingLink | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedTerritoryIds, setSelectedTerritoryIds] = useState<string[]>(initialTerritoryIds ?? []);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(initialTopicIds ?? []);
  const [visibility, setVisibility] = useState<string>("public");

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
    if (!canSubmit || !currentUser.id || uploading || createPost.isPending) return;
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
        territoryIds: selectedTerritoryIds,
        topicIds: selectedTopicIds,
        visibility: showVisibilityPicker ? visibility : "public",
        roomId,
      });

      // Emit $CTG for post published
      supabase.rpc('emit_ctg_for_contribution', {
        p_user_id: currentUser.id,
        p_contribution_type: 'post_published',
        p_related_entity_id: contextId || currentUser.id,
        p_related_entity_type: contextType || 'user',
      } as any).then(() => {});

      // Notify entity members + followers for guild/company/discussion posts
      const effectiveEntityType = contextType.replace("_DISCUSSION", "");
      if ((effectiveEntityType === "GUILD" || effectiveEntityType === "COMPANY") && contextId) {
        try {
          // Fetch room audience_type if posting to a discussion room
          let roomAudience: string | null = null;
          let roomName: string | null = null;
          if (roomId) {
            const { data: roomData } = await supabase
              .from("discussion_rooms" as any)
              .select("name, audience_type")
              .eq("id", roomId)
              .maybeSingle();
            roomAudience = (roomData as any)?.audience_type ?? null;
            roomName = (roomData as any)?.name ?? null;
          }

          // Only notify for rooms that are broadly accessible
          // Skip restricted rooms (ADMIN, SELECTED_ROLES, OPERATIONS, ACTIVE_ROLES)
          const safeAudiences = ["PUBLIC", "FOLLOWERS", "MEMBERS", null]; // null = no room (feed post)
          if (!safeAudiences.includes(roomAudience)) {
            // Restricted room — skip mass notification
          } else {
            const tbl = effectiveEntityType === "GUILD" ? "guilds" : "companies";
            const { data: entity } = await supabase.from(tbl).select("name").eq("id", contextId).maybeSingle();
            const entityName = (entity as any)?.name || "your community";
            const authorName = currentUser.name || "Someone";

            // Get the created post ID
            const { data: latestPost } = await supabase
              .from("feed_posts")
              .select("id")
              .eq("author_user_id", currentUser.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            if (latestPost?.id) {
              const deepLinkUrl = roomId
                ? `/${effectiveEntityType === "GUILD" ? "guilds" : "companies"}/${contextId}?tab=discussion&room=${roomId}`
                : `/${effectiveEntityType === "GUILD" ? "guilds" : "companies"}/${contextId}`;
              const body = roomId
                ? `${authorName} posted in #${roomName || "General"} — ${entityName}`
                : `${authorName} posted in ${entityName}`;

              notifyFollowedEntityNewPost({
                entityType: effectiveEntityType,
                entityId: contextId,
                entityName,
                postId: latestPost.id,
                authorUserId: currentUser.id,
                authorName,
                roomId: roomId || undefined,
                roomName: roomName || undefined,
                deepLinkUrl,
                body,
              });
            }

            // Notify author's own followers
            const { data: myFollowers } = await supabase
              .from("follows")
              .select("follower_id")
              .eq("target_type", "USER")
              .eq("target_id", currentUser.id)
              .limit(200);
            for (const f of myFollowers ?? []) {
              await supabase.from("notifications").insert({
                user_id: f.follower_id,
                type: "FOLLOWED_USER_NEW_POST",
                title: "New post from someone you follow",
                body: `${authorName} published a new post`,
                deep_link_url: roomId
                  ? `/${effectiveEntityType === "GUILD" ? "guilds" : "companies"}/${contextId}?tab=discussion&room=${roomId}`
                  : "/",
              });
            }
          }
        } catch (e) {
          console.warn("[post-notif] Failed to notify", e);
        }
      }

      // Reset
      setContent("");
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setFiles([]);
      setLink(null);
      setSelectedTerritoryIds([]);
      setSelectedTopicIds([]);
      setVisibility("public");
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
          <MentionTextarea
            value={content}
            onChange={setContent}
            onMentionsChange={setPendingMentions}
            placeholder="Share an update, idea, or creation… (type @ to mention)"
            className="min-h-[80px] resize-none text-sm border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
            maxLength={5000}
            entityContext={entityContext}
          />
          <div className="flex justify-end">
            <span className={`text-xs ${content.length > 4500 ? 'text-destructive' : 'text-muted-foreground'}`}>
              {content.length} / 5,000
            </span>
          </div>

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

          {/* Ontology picker */}
          <OntologyPicker
            selectedTerritoryIds={selectedTerritoryIds}
            selectedTopicIds={selectedTopicIds}
            onTerritoriesChange={setSelectedTerritoryIds}
            onTopicsChange={setSelectedTopicIds}
          />

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
        <div className="flex items-center gap-2">
          {showVisibilityPicker && (
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public"><span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Public</span></SelectItem>
                <SelectItem value="members"><span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Members</span></SelectItem>
                <SelectItem value="admins"><span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Admins</span></SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            disabled={!canSubmit || uploading || createPost.isPending}
            onClick={handleSubmit}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Post
          </Button>
        </div>
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
