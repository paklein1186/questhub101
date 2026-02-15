import { Link } from "react-router-dom";
import { ArrowBigUp, MessageSquare } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { FeedPostWithAttachments } from "@/hooks/useFeedPosts";
import { useTogglePostUpvote } from "@/hooks/usePostUpvote";
import { renderMentions } from "@/components/MentionTextarea";
import { toast } from "sonner";
import { useState } from "react";
import { motion } from "framer-motion";
import { CommentThread } from "@/components/CommentThread";
import { CommentTargetType } from "@/types/enums";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { FeedDisplayMode } from "./FeedDisplayToggle";

interface PostTileProps {
  post: FeedPostWithAttachments;
  hasUpvoted?: boolean;
  size: Exclude<FeedDisplayMode, "list">;
}

export function PostTile({ post, hasUpvoted = false, size }: PostTileProps) {
  const toggleUpvote = useTogglePostUpvote();
  const upvoteCount = post.upvote_count ?? 0;
  const [showComments, setShowComments] = useState(false);

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
  const firstImage = images[0];

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleUpvote.mutate(
      { postId: post.id, hasUpvoted, postAuthorId: post.author_user_id },
      { onError: () => toast.error("Failed to update vote") }
    );
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments(true);
  };

  const contentLines = size === "small" ? 2 : size === "medium" ? 3 : 5;

  // Strip mention markup @[Name](type:id) → Name for preview
  const stripMentions = (text: string) => text.replace(/@\[([^\]]+)\]\([^)]+\)/g, "$1");

  return (
    <>
      <div className="group relative rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-card-hover hover:border-primary/20">
        {/* Thumbnail area */}
        <div className={`relative overflow-hidden bg-muted ${size === "small" ? "h-28" : size === "medium" ? "h-40" : "h-56"}`}>
          {firstImage ? (
            <>
              <img
                src={firstImage.thumbnail_url || firstImage.url}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              {images.length > 1 && (
                <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                  +{images.length - 1}
                </span>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/10 to-muted group-hover:scale-105 transition-transform duration-300 p-4">
              {post.content ? (
                <p className={`text-foreground/70 text-center leading-relaxed ${size === "small" ? "text-xs line-clamp-3" : size === "medium" ? "text-sm line-clamp-4" : "text-sm line-clamp-6"}`}>
                  {stripMentions(post.content.slice(0, 200))}
                </p>
              ) : (
                <span className="text-muted-foreground text-xs italic">No content</span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`p-3 ${size === "small" ? "space-y-1" : "space-y-2"}`}>
          {/* Author row */}
          <div className="flex items-center gap-2">
            <Link to={`/users/${post.author_user_id}`} onClick={(e) => e.stopPropagation()}>
              <Avatar className={size === "small" ? "h-5 w-5" : "h-6 w-6"}>
                <AvatarImage src={post.author?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px]">{post.author?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
            </Link>
            <Link
              to={`/users/${post.author_user_id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium hover:underline truncate"
            >
              {post.author?.name || "Unknown"}
            </Link>
            <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Post text */}
          {post.content && (
            <p className={`text-sm leading-relaxed text-foreground/90 line-clamp-${contentLines}`}>
              {stripMentions(post.content)}
            </p>
          )}
        </div>

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleUpvote}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors ${
              hasUpvoted
                ? "bg-primary/90 text-primary-foreground"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            <motion.div
              key={hasUpvoted ? "up" : "neutral"}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.25 }}
            >
              <ArrowBigUp className="h-3.5 w-3.5" fill={hasUpvoted ? "currentColor" : "none"} />
            </motion.div>
            {upvoteCount}
          </button>
          <button
            onClick={handleComment}
            className="flex items-center gap-1 rounded-full bg-white/20 text-white px-2.5 py-1.5 text-xs font-medium backdrop-blur-sm hover:bg-white/30 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {commentCount}
          </button>
        </div>
      </div>

      {/* Comment dialog */}
      <Dialog open={showComments} onOpenChange={setShowComments}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {/* Post preview in dialog */}
          <div className="space-y-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={post.author?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{post.author?.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{post.author?.name || "Unknown"}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            {post.content && (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderMentions(post.content)}</p>
            )}
          </div>
          <CommentThread targetType={CommentTargetType.FEED_POST} targetId={post.id} />
        </DialogContent>
      </Dialog>
    </>
  );
}
