import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, MessageSquare, Send, Pencil, Trash2, X, Check, Loader2, ImagePlus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommentTargetType, ReportTargetType } from "@/types/enums";
import { ReportButton } from "@/components/ReportButton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AdminBadge } from "@/components/AdminBadge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRateLimit } from "@/hooks/useRateLimit";
import ImageLightbox from "@/components/ImageLightbox";
import { MentionTextarea, extractMentionIds, extractAllMentions, extractBulkMentions, renderMentions, type MentionedUser } from "@/components/MentionTextarea";
import { renderPostContent } from "@/lib/renderPostContent";
import { processMentions } from "@/lib/mentionNotifications";
import { useNotifications, stripMentionTokens } from "@/hooks/useNotifications";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CommentThreadProps {
  targetType: CommentTargetType;
  targetId: string;
}

export function CommentThread({ targetType, targetId }: CommentThreadProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { checkRateLimit } = useRateLimit();
  const { notifyComment, notifyUpvote, notifyBulkMention } = useNotifications();

  // Derive entity context for @members/@followers
  const entityContext = (() => {
    const entityTypes = ["GUILD", "QUEST", "COMPANY", "POD"];
    if (entityTypes.includes(targetType)) {
      return { entityType: targetType, entityId: targetId };
    }
    return undefined;
  })();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const queryKey = ["comments", targetType, targetId];

  const { data: comments = [] } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for all comment authors
  const authorIds = [...new Set(comments.map((c) => c.author_id))];
  const { data: authorProfiles = [] } = useQuery({
    queryKey: ["comment-authors", ...authorIds],
    enabled: authorIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", authorIds);
      return (data ?? []) as { user_id: string; name: string; avatar_url: string | null }[];
    },
  });

  const { data: upvotes = [] } = useQuery({
    queryKey: ["comment-upvotes", targetType, targetId],
    queryFn: async () => {
      const commentIds = comments.map((c) => c.id);
      if (commentIds.length === 0) return [];
      const { data } = await supabase
        .from("comment_upvotes")
        .select("*")
        .in("comment_id", commentIds);
      return data ?? [];
    },
    enabled: comments.length > 0,
  });

  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingMentions, setPendingMentions] = useState<MentionedUser[]>([]);
  const [replyMentions, setReplyMentions] = useState<MentionedUser[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Image upload state
  const [newCommentImage, setNewCommentImage] = useState<File | null>(null);
  const [newCommentImagePreview, setNewCommentImagePreview] = useState<string | null>(null);
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const mainImageRef = useRef<HTMLInputElement>(null);
  const replyImageRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (file: File | null, isReply: boolean) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Only image files are allowed", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Image must be under 10MB", variant: "destructive" });
      return;
    }
    const preview = URL.createObjectURL(file);
    if (isReply) { setReplyImage(file); setReplyImagePreview(preview); }
    else { setNewCommentImage(file); setNewCommentImagePreview(preview); }
  };

  const clearImage = (isReply: boolean) => {
    if (isReply) {
      if (replyImagePreview) URL.revokeObjectURL(replyImagePreview);
      setReplyImage(null); setReplyImagePreview(null);
      if (replyImageRef.current) replyImageRef.current.value = "";
    } else {
      if (newCommentImagePreview) URL.revokeObjectURL(newCommentImagePreview);
      setNewCommentImage(null); setNewCommentImagePreview(null);
      if (mainImageRef.current) mainImageRef.current.value = "";
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-");
    const path = `${currentUser.id}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("comment-images").upload(path, file, { contentType: file.type });
    if (error) { toast({ title: "Image upload failed", variant: "destructive" }); return null; }
    const { data: urlData } = supabase.storage.from("comment-images").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const getAuthor = (userId: string) => authorProfiles.find((p) => p.user_id === userId);
  const topLevel = comments.filter((c) => !c.parent_id && !c.is_deleted);
  const deletedTopLevel = comments.filter((c) => !c.parent_id && c.is_deleted);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const hasUpvoted = useCallback(
    (commentId: string) => upvotes.some((u) => u.comment_id === commentId && u.user_id === currentUser.id),
    [upvotes, currentUser.id]
  );

  const handleUpvote = async (commentId: string) => {
    const comment = comments.find((c) => c.id === commentId);
    if (hasUpvoted(commentId)) {
      await supabase.from("comment_upvotes").delete().eq("comment_id", commentId).eq("user_id", currentUser.id);
      await supabase.from("comments").update({ upvote_count: Math.max((comment?.upvote_count ?? 1) - 1, 0) }).eq("id", commentId);
    } else {
      await supabase.from("comment_upvotes").insert({ comment_id: commentId, user_id: currentUser.id });
      await supabase.from("comments").update({ upvote_count: (comment?.upvote_count ?? 0) + 1 }).eq("id", commentId);
      // Notify the comment author about the upvote
      if (comment && comment.author_id !== currentUser.id) {
        notifyUpvote({
          upvoterId: currentUser.id,
          commentAuthorId: comment.author_id,
          commentId,
          commentSnippet: comment.content,
        });
      }
    }
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["comment-upvotes", targetType, targetId] });
  };

  const addComment = async (parentId?: string) => {
    const content = parentId ? replyText.trim() : newComment.trim();
    const imageFile = parentId ? replyImage : newCommentImage;
    if ((!content && !imageFile) || !currentUser.id || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const allowed = await checkRateLimit("comment");
      if (!allowed) return;

      // Upload image if present
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl && !content) return; // image upload failed and no text
      }

      const { data: inserted, error } = await supabase.from("comments").insert({
        content: content || "",
        author_id: currentUser.id,
        parent_id: parentId || null,
        target_type: targetType,
        target_id: targetId,
        image_url: imageUrl,
      }).select("id").single();

      if (error) { toast({ title: "Failed to post comment", variant: "destructive" }); return; }

      // Emit $CTG for comment
      supabase.rpc('emit_ctg_for_contribution', {
        p_user_id: currentUser.id,
        p_contribution_type: 'comment_given',
        p_related_entity_id: targetId,
        p_related_entity_type: targetType,
      } as any).then(() => {});

      // Process @mentions (users + entities)
      const mentionIds = extractMentionIds(content);
      const allEntityMentions = extractAllMentions(content);
      const cleanSnippet = stripMentionTokens(content);

      if ((mentionIds.length > 0 || allEntityMentions.length > 0) && inserted) {
        await processMentions({
          commentId: inserted.id,
          authorUserId: currentUser.id,
          authorName: currentUser.name,
          mentionedUserIds: mentionIds,
          mentionedEntities: allEntityMentions,
          targetType,
          targetId,
          snippet: cleanSnippet,
        });
      }

      // Process @members / @followers bulk mentions
      const bulkMentions = extractBulkMentions(content);
      if (bulkMentions.length > 0 && inserted) {
        for (const bm of bulkMentions) {
          notifyBulkMention({
            mentionType: bm.mentionType,
            entityType: bm.entityType,
            entityId: bm.entityId,
            authorUserId: currentUser.id,
            authorName: currentUser.name,
            snippet: cleanSnippet,
            targetType,
            targetId,
          });
        }
      }

      // Notify the target entity owner about the comment
      if (inserted) {
        notifyComment({
          commentAuthorId: currentUser.id,
          targetType,
          targetId,
          commentId: inserted.id,
          commentSnippet: cleanSnippet,
        });
      }

      if (parentId) { setReplyText(""); setReplyingTo(null); setReplyMentions([]); clearImage(true); } else { setNewComment(""); setPendingMentions([]); clearImage(false); }
      toast({ title: "Comment added" });
      qc.invalidateQueries({ queryKey });
    } catch (err: any) {
      toast({ title: err.message || "Failed to post comment", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    await supabase.from("comments").update({ content: editText.trim() }).eq("id", commentId);
    setEditingId(null);
    setEditText("");
    toast({ title: "Comment edited" });
    qc.invalidateQueries({ queryKey });
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", deleteTarget)
        .eq("author_id", currentUser.id)
        .select("id");
      if (error) {
        toast({ title: "Failed to delete comment", variant: "destructive" });
      } else if (!data || data.length === 0) {
        toast({ title: "You don't have permission to delete this comment", variant: "destructive" });
      } else {
        toast({ title: "Comment deleted" });
        qc.invalidateQueries({ queryKey });
      }
    } catch {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const renderComment = (comment: typeof comments[0], isReply = false) => {
    const replies = isReply ? [] : getReplies(comment.id);

    if (comment.is_deleted) {
      return (
        <div key={comment.id} className={isReply ? "ml-8 pl-4 border-l-2 border-border" : ""}>
          <div className="rounded-lg border border-border bg-muted/30 p-4 italic text-sm text-muted-foreground">
            This comment has been removed.
          </div>
          {replies.length > 0 && (
            <div className="mt-2 space-y-2">{replies.map((reply) => renderComment(reply, true))}</div>
          )}
        </div>
      );
    }

    const author = getAuthor(comment.author_id);
    const voted = hasUpvoted(comment.id);
    const isOwn = comment.author_id === currentUser.id;
    const isEditing = editingId === comment.id;

    return (
      <motion.div key={comment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={isReply ? "ml-8 pl-4 border-l-2 border-border" : ""}>
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Avatar className={isReply ? "h-7 w-7" : "h-8 w-8"}>
              <AvatarImage src={author?.avatar_url ?? undefined} />
              <AvatarFallback>{author?.name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{author?.name ?? "Unknown"}</span>
                <AdminBadge userId={comment.author_id} />
                <span className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
              </div>
              {isEditing ? (
                <div className="mt-1 flex gap-2">
                  <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="min-h-[50px] resize-none text-sm flex-1" maxLength={1000} />
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(comment.id)}><Check className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm mt-1 text-foreground/90">{renderPostContent(comment.content)}</div>
                  {(comment as any).image_url && (
                    <div className="block mt-2 cursor-pointer" onClick={() => setLightboxSrc((comment as any).image_url)}>
                      <img src={(comment as any).image_url} alt="Comment attachment" className="rounded-md max-h-64 max-w-full object-cover border border-border hover:opacity-90 transition-opacity" />
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Button variant="ghost" size="sm" className={`h-7 px-2 ${voted ? "text-primary" : "text-muted-foreground hover:text-primary"}`} onClick={() => handleUpvote(comment.id)}>
                  <ThumbsUp className="h-3.5 w-3.5 mr-1" fill={voted ? "currentColor" : "none"} />{comment.upvote_count}
                </Button>
                {!isReply && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-primary" onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />Reply
                  </Button>
                )}
                {isOwn && !isEditing && (
                  <>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-primary" onClick={() => { setEditingId(comment.id); setEditText(comment.content); }}>
                      <Pencil className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(comment.id)}>
                      <Trash2 className="h-3 w-3 mr-1" />Delete
                    </Button>
                  </>
                )}
                {!isOwn && (
                  <ReportButton targetType={ReportTargetType.COMMENT} targetId={comment.id} variant="inline" />
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {replyingTo === comment.id && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="ml-8 mt-2">
              <div className="flex gap-2">
                <Avatar className="h-7 w-7 mt-1"><AvatarImage src={currentUser.avatarUrl} /><AvatarFallback>{currentUser.name[0]}</AvatarFallback></Avatar>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <MentionTextarea
                      value={replyText}
                      onChange={setReplyText}
                      onMentionsChange={setReplyMentions}
                      placeholder="Write a reply… (type @ to mention)"
                      className="min-h-[60px] flex-1"
                      maxLength={500}
                      entityContext={entityContext}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !isSubmitting) { e.preventDefault(); addComment(comment.id); } }}
                    />
                  </div>
                  {replyImagePreview && (
                    <div className="relative inline-block">
                      <img src={replyImagePreview} alt="Preview" className="rounded-md max-h-24 max-w-[160px] object-cover border border-border" />
                      <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full" onClick={() => clearImage(true)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <input ref={replyImageRef} type="file" accept="image/*" className="hidden" onChange={e => { handleImageSelect(e.target.files?.[0] || null, true); }} />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => replyImageRef.current?.click()}>
                        <ImagePlus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button size="sm" disabled={(!replyText.trim() && !replyImage) || isSubmitting} onClick={() => addComment(comment.id)}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {replies.length > 0 && (
          <div className="mt-2 space-y-2">{replies.map((reply) => renderComment(reply, true))}</div>
        )}
      </motion.div>
    );
  };

  return (
    <>
    <div className="space-y-4">
      {topLevel.length === 0 && deletedTopLevel.length === 0 && <p className="text-sm text-muted-foreground italic py-4">No comments yet. Start the conversation!</p>}
      {[...deletedTopLevel, ...topLevel].map((comment) => renderComment(comment))}
      <div className="pt-4 border-t border-border">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 mt-1"><AvatarImage src={currentUser.avatarUrl} /><AvatarFallback>{currentUser.name[0]}</AvatarFallback></Avatar>
          <div className="flex-1">
            <MentionTextarea
              value={newComment}
              onChange={setNewComment}
              onMentionsChange={setPendingMentions}
              placeholder="Add a comment… (type @ to mention someone)"
              className="min-h-[80px]"
              maxLength={1000}
              entityContext={entityContext}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !isSubmitting) { e.preventDefault(); addComment(); } }}
            />
            {newCommentImagePreview && (
              <div className="relative inline-block mt-2">
                <img src={newCommentImagePreview} alt="Preview" className="rounded-md max-h-32 max-w-[200px] object-cover border border-border" />
                <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full" onClick={() => clearImage(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <div>
                <input ref={mainImageRef} type="file" accept="image/*" className="hidden" onChange={e => { handleImageSelect(e.target.files?.[0] || null, false); }} />
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-primary" onClick={() => mainImageRef.current?.click()}>
                  <ImagePlus className="h-4 w-4 mr-1" /> Photo
                </Button>
              </div>
              <Button size="sm" disabled={(!newComment.trim() && !newCommentImage) || isSubmitting} onClick={() => addComment()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Comment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </>
  );
}
