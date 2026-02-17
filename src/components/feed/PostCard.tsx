import { Link } from "react-router-dom";
import { Trash2, ExternalLink, FileText, Download, Film, ArrowBigUp, Loader2, Globe, Compass, MessageSquare, Pencil, Check, X as XIcon, Languages, Repeat2, Send, Shield } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDeletePost, useEditPost, useCreatePost, type FeedPostWithAttachments, type PostAttachment } from "@/hooks/useFeedPosts";
import { renderMentions } from "@/components/MentionTextarea";
import { useTogglePostUpvote } from "@/hooks/usePostUpvote";
import { formatFileSize } from "@/lib/postHelpers";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAutoTranslatePost } from "@/hooks/useAutoTranslatePost";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType } from "@/types/enums";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { OntologyPicker } from "@/components/feed/OntologyPicker";

const CONTENT_CHAR_LIMIT = 1000;

function TruncatedContent({ content, maxChars = CONTENT_CHAR_LIMIT }: { content: string; maxChars?: number }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = content.length > maxChars;
  const displayed = needsTruncation && !expanded ? content.slice(0, maxChars) : content;

  return (
    <div className="space-y-1">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">
        {renderMentions(displayed)}
        {needsTruncation && !expanded && "…"}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "See more"}
        </button>
      )}
    </div>
  );
}

function ImageGrid({ images }: { images: PostAttachment[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const gridClass =
    images.length === 1 ? "grid-cols-1" : "grid-cols-2";

  return (
    <>
      <div className={`grid ${gridClass} gap-1.5 rounded-lg overflow-hidden max-w-2xl`}>
        {images.slice(0, 4).map((img, i) => (
          <button
            key={img.id}
            onClick={() => setLightbox(img.url)}
            className={`relative aspect-video bg-muted overflow-hidden max-h-96 ${
              images.length === 3 && i === 0 ? "row-span-2 aspect-square" : ""
            }`}
          >
            <img
              src={img.thumbnail_url || img.url}
              alt={img.file_name || ""}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
              loading="lazy"
            />
            {i === 3 && images.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-xl font-bold">+{images.length - 4}</span>
              </div>
            )}
          </button>
        ))}
      </div>
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/90 border-0">
          {lightbox && <img src={lightbox} alt="" className="w-full max-h-[85vh] object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function VideoEmbed({ attachment }: { attachment: PostAttachment }) {
  const meta = attachment.embed_meta as Record<string, any> | null;
  const embedUrl = meta?.embedUrl;
  if (!embedUrl) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
        <Film className="h-4 w-4" /> {attachment.url}
      </a>
    );
  }
  return (
    <div className="rounded-lg overflow-hidden">
      <div className="aspect-video">
        <iframe src={embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen sandbox="allow-scripts allow-same-origin allow-popups" loading="lazy" title={meta?.provider ? `${meta.provider} video` : "Embedded video"} />
      </div>
      {meta?.provider && <p className="text-xs text-muted-foreground px-1 py-1">{meta.provider} video</p>}
    </div>
  );
}

function LinkPreview({ attachment }: { attachment: PostAttachment }) {
  const meta = attachment.embed_meta as Record<string, any> | null;
  let hostname = "";
  try { hostname = new URL(attachment.url).hostname; } catch {}
  return (
    <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-border bg-muted/30 overflow-hidden hover:border-primary/30 transition-all">
      <div className="flex gap-3">
        {(attachment.thumbnail_url || meta?.image) && (
          <img src={attachment.thumbnail_url || meta?.image} alt="" className="w-28 h-24 object-cover shrink-0" loading="lazy" />
        )}
        <div className="flex-1 min-w-0 p-3">
          {meta?.title && <p className="text-sm font-medium line-clamp-1">{meta.title}</p>}
          {meta?.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{meta.description}</p>}
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" /><span>{hostname}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

function DocumentChip({ attachment }: { attachment: PostAttachment }) {
  return (
    <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary/30 transition-all">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="truncate flex-1">{attachment.file_name || "Document"}</span>
      {attachment.file_size_bytes && <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(attachment.file_size_bytes)}</span>}
      <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </a>
  );
}

/** Compact embedded view of a reshared/quoted original post */
function EmbeddedPost({ post }: { post: FeedPostWithAttachments }) {
  const images = (post.post_attachments || []).filter((a) => a.type === "IMAGE");

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Link to={`/users/${post.author_user_id}`}>
          <Avatar className="h-6 w-6">
            <AvatarImage src={post.author?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px]">{post.author?.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
        </Link>
        <Link to={`/users/${post.author_user_id}`} className="text-xs font-medium hover:underline">
          {post.author?.name || "Unknown"}
        </Link>
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </span>
      </div>
      {post.content && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">
          {renderMentions(post.content)}
        </p>
      )}
      {images.length > 0 && (
        <div className="flex gap-1.5 overflow-hidden rounded-md">
          {images.slice(0, 3).map((img) => (
            <img key={img.id} src={img.thumbnail_url || img.url} alt="" className="h-20 w-20 object-cover rounded" loading="lazy" />
          ))}
          {images.length > 3 && (
            <div className="h-20 w-20 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">+{images.length - 3}</div>
          )}
        </div>
      )}
      {post.is_deleted && (
        <p className="text-xs text-muted-foreground italic">This post has been deleted</p>
      )}
    </div>
  );
}

interface PostCardProps {
  post: FeedPostWithAttachments;
  hasUpvoted?: boolean;
  /** Whether comments are allowed on this post's context wall */
  allowComments?: boolean;
  /** If provided, guild admins can repost any post into this guild's discussion */
  guildContext?: { guildId: string; guildName: string; isAdmin: boolean };
}

export function PostCard({ post, hasUpvoted = false, allowComments = true, guildContext }: PostCardProps) {
  const currentUser = useCurrentUser();
  const { session } = useAuth();
  const deletePost = useDeletePost();
  const editPost = useEditPost();
  const createPost = useCreatePost();
  const toggleUpvote = useTogglePostUpvote();
  const isOwn = post.author_user_id === currentUser.id;
  const isLoggedIn = !!session;
  const upvoteCount = post.upvote_count ?? 0;
  const isDeleting = deletePost.isPending;
  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [editTerritoryIds, setEditTerritoryIds] = useState<string[]>([]);
  const [editTopicIds, setEditTopicIds] = useState<string[]>([]);
  const [showOriginal, setShowOriginal] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteContent, setQuoteContent] = useState("");
  const [isResharing, setIsResharing] = useState(false);
  const { translatedText, isTranslating, isTranslated, needsTranslation } = useAutoTranslatePost(post.id, post.content);

  // Comment count
  const { data: commentCount = 0 } = useQuery({
    queryKey: ["post-comment-count", post.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("target_type", "FEED_POST")
        .eq("target_id", post.id)
        .eq("is_deleted", false);
      return count ?? 0;
    },
  });

  const images = (post.post_attachments || []).filter((a) => a.type === "IMAGE");
  const videos = (post.post_attachments || []).filter((a) => a.type === "VIDEO_LINK");
  const links = (post.post_attachments || []).filter((a) => a.type === "LINK");
  const docs = (post.post_attachments || []).filter((a) => a.type === "DOCUMENT");

  const handleDelete = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => toast.success("Post deleted"),
      onError: () => toast.error("Failed to delete post"),
    });
  };

  const handleUpvote = () => {
    toggleUpvote.mutate(
      { postId: post.id, hasUpvoted, postAuthorId: post.author_user_id },
      { onError: () => toast.error("Failed to update vote") }
    );
  };

  const handleSaveEdit = () => {
    editPost.mutate(
      {
        postId: post.id,
        content: editContent.trim(),
        territoryIds: editTerritoryIds,
        topicIds: editTopicIds,
      },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success("Post updated");
        },
        onError: () => toast.error("Failed to update post"),
      }
    );
  };

  const handleCancelEdit = () => {
    setEditContent(post.content || "");
    setEditing(false);
  };

  // The original post to reshare — skip resharing a reshare, go to the root
  const reshareTargetId = post.reshared_post_id ? post.reshared_post_id : post.id;

  // Reshare count
  const { data: reshareCount = 0 } = useQuery({
    queryKey: ["post-reshare-count", post.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("feed_posts")
        .select("id", { count: "exact", head: true })
        .eq("reshared_post_id", post.id)
        .eq("is_deleted", false);
      return count ?? 0;
    },
  });

  const handleInstantReshare = async () => {
    if (!currentUser.id || isResharing) return;
    setIsResharing(true);
    try {
      await createPost.mutateAsync({
        authorUserId: currentUser.id,
        contextType: "GLOBAL",
        content: "",
        attachments: [],
        resharedPostId: reshareTargetId,
      });
      toast.success("Reshared!");
    } catch {
      toast.error("Failed to reshare");
    } finally {
      setIsResharing(false);
    }
  };

  const handleQuotePost = async () => {
    if (!currentUser.id || isResharing) return;
    setIsResharing(true);
    try {
      await createPost.mutateAsync({
        authorUserId: currentUser.id,
        contextType: "GLOBAL",
        content: quoteContent.trim(),
        attachments: [],
        resharedPostId: reshareTargetId,
      });
      setQuoteContent("");
      setQuoteDialogOpen(false);
      toast.success("Quote posted!");
    } catch {
      toast.error("Failed to post quote");
    } finally {
      setIsResharing(false);
    }
  };

  const handleRepostToGuild = async () => {
    if (!currentUser.id || !guildContext || isResharing) return;
    setIsResharing(true);
    try {
      await createPost.mutateAsync({
        authorUserId: currentUser.id,
        contextType: "GUILD_DISCUSSION",
        contextId: guildContext.guildId,
        content: "",
        attachments: [],
        resharedPostId: reshareTargetId,
      });
      toast.success(`Reposted to ${guildContext.guildName}`);
    } catch {
      toast.error("Failed to repost");
    } finally {
      setIsResharing(false);
    }
  };

  // Display logic: show translation by default, allow toggle to original
  const displayContent = needsTranslation && isTranslated && !showOriginal
    ? translatedText
    : post.content;

  return (
    <div id={`post-${post.id}`} className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Reshare indicator */}
      {post.reshared_post_id && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-1 mb-1">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>{isOwn ? "You" : post.author?.name || "Someone"} reshared</span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to={`/users/${post.author_user_id}`}>
          <Avatar className="h-9 w-9">
            <AvatarImage src={post.author?.avatar_url ?? undefined} />
            <AvatarFallback>{post.author?.name?.[0] || "?"}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link to={`/users/${post.author_user_id}`} className="text-sm font-medium hover:underline">
              {post.author?.name || "Unknown"}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            {post.updated_at !== post.created_at && !editing && (
              <span className="text-[10px] text-muted-foreground italic">(edited)</span>
            )}
          </div>
          {(post as any).contextName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              in{" "}
              {(post as any).contextLink ? (
                <Link to={(post as any).contextLink} className="font-medium text-foreground/70 hover:underline">
                  {(post as any).contextName}
                </Link>
              ) : (
                <span className="font-medium text-foreground/70">{(post as any).contextName}</span>
              )}
            </p>
          )}
        </div>
        {isOwn && !editing && (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setEditContent(post.content || ""); setEditTerritoryIds((post.post_territories ?? []).map(pt => pt.territory_id)); setEditTopicIds((post.post_topics ?? []).map(pt => pt.topic_id)); setEditing(true); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {editing ? (
        <div className="space-y-3">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[80px] text-sm"
            maxLength={2000}
          />
          <OntologyPicker
            selectedTerritoryIds={editTerritoryIds}
            selectedTopicIds={editTopicIds}
            onTerritoriesChange={setEditTerritoryIds}
            onTopicsChange={setEditTopicIds}
          />
          <div className="flex items-center gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={editPost.isPending}>
              <XIcon className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={editPost.isPending || !editContent.trim()}>
              {editPost.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      ) : post.content ? (
        <TruncatedContent
          content={displayContent || post.content}
          maxChars={1000}
        />
      ) : null}
      {/* Translation controls */}
      {post.content && !editing && (
        <div className="space-y-0.5">
          {isTranslating && (
            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
              <Loader2 className="h-2.5 w-2.5 animate-spin" /> Translating…
            </p>
          )}
          {needsTranslation && isTranslated && !showOriginal && (
            <button onClick={() => setShowOriginal(true)} className="text-[10px] text-muted-foreground italic hover:text-foreground transition-colors">
              Translated automatically · Show original
            </button>
          )}
          {needsTranslation && showOriginal && isTranslated && (
            <button onClick={() => setShowOriginal(false)} className="text-[10px] text-muted-foreground italic hover:text-foreground transition-colors">
              Showing original · Show translation
            </button>
          )}
        </div>
      )}

      {/* Attachments */}
      {images.length > 0 && <ImageGrid images={images} />}
      {videos.map((v) => <VideoEmbed key={v.id} attachment={v} />)}
      {links.map((l) => <LinkPreview key={l.id} attachment={l} />)}
      {docs.length > 0 && <div className="space-y-1">{docs.map((d) => <DocumentChip key={d.id} attachment={d} />)}</div>}

      {/* Embedded reshared post */}
      {post.reshared_post && <EmbeddedPost post={post.reshared_post} />}

      {((post.post_territories && post.post_territories.length > 0) || (post.post_topics && post.post_topics.length > 0)) && (
        <div className="flex flex-wrap gap-1.5">
          {(post.post_territories ?? []).map((pt) => (
            <Link key={pt.territory_id} to={`/territories/${pt.territories?.slug || pt.territory_id}`}>
              <Badge variant="outline" className="text-[10px] h-5 gap-1 hover:bg-accent transition-colors cursor-pointer">
                <Globe className="h-2.5 w-2.5" />
                {pt.territories?.name || "Territory"}
              </Badge>
            </Link>
          ))}
          {(post.post_topics ?? []).map((pt) => (
            <Link key={pt.topic_id} to={`/topics/${pt.topics?.slug || pt.topic_id}`}>
              <Badge variant="outline" className="text-[10px] h-5 gap-1 hover:bg-accent transition-colors cursor-pointer">
                <Compass className="h-2.5 w-2.5" />
                {pt.topics?.name || "Topic"}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center gap-1 pt-1">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2.5 gap-1.5 ${hasUpvoted ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                onClick={handleUpvote}
                disabled={toggleUpvote.isPending}
              >
                <motion.div
                  key={hasUpvoted ? "up" : "neutral"}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.25 }}
                >
                  <ArrowBigUp className="h-4 w-4" fill={hasUpvoted ? "currentColor" : "none"} />
                </motion.div>
                <span className="text-xs font-medium">{upvoteCount}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {hasUpvoted ? "Remove upvote" : "Upvote"}
            </TooltipContent>
          </Tooltip>
          {needsTranslation && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2.5 gap-1.5 ${isTranslated && !showOriginal ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                  onClick={() => setShowOriginal(!showOriginal)}
                  disabled={isTranslating || !isTranslated}
                >
                  {isTranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {showOriginal ? "Show translation" : "Show original"}
              </TooltipContent>
            </Tooltip>
          )}
          {allowComments && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2.5 gap-1.5 ${showComments ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs font-medium">{commentCount}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {showComments ? "Hide comments" : "Comments"}
              </TooltipContent>
            </Tooltip>
          )}
          {isLoggedIn && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-primary"
                      disabled={isResharing}
                    >
                      {isResharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat2 className="h-4 w-4" />}
                      {reshareCount > 0 && <span className="text-xs font-medium">{reshareCount}</span>}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Reshare</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleInstantReshare}>
                  <Repeat2 className="h-4 w-4 mr-2" /> Reshare now
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setQuoteDialogOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" /> Quote post
                </DropdownMenuItem>
                {guildContext?.isAdmin && post.context_type !== "GUILD_DISCUSSION" && (
                  <DropdownMenuItem onClick={handleRepostToGuild}>
                    <Shield className="h-4 w-4 mr-2" /> Repost to {guildContext.guildName}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TooltipProvider>
      </div>

      {/* Quote post dialog */}
      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quote Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={quoteContent}
              onChange={(e) => setQuoteContent(e.target.value)}
              placeholder="Add your thoughts…"
              className="min-h-[80px] text-sm"
              maxLength={2000}
            />
            <EmbeddedPost post={post.reshared_post || post} />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleQuotePost}
                disabled={isResharing || !quoteContent.trim()}
              >
                {isResharing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Post Quote
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments */}
      {allowComments && showComments && (
        <div className="pt-2 border-t border-border">
          <CommentThread targetType={CommentTargetType.FEED_POST} targetId={post.id} />
        </div>
      )}
    </div>
  );
}
