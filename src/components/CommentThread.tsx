import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, MessageSquare, Send, Pencil, Trash2, X, Check } from "lucide-react";
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

interface CommentThreadProps {
  targetType: CommentTargetType;
  targetId: string;
}

export function CommentThread({ targetType, targetId }: CommentThreadProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { checkRateLimit } = useRateLimit();

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
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, email")
        .in("user_id", authorIds);
      return data ?? [];
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

  const getAuthor = (userId: string) => authorProfiles.find((p) => p.user_id === userId);
  const topLevel = comments.filter((c) => !c.parent_id && !c.is_deleted);
  const deletedTopLevel = comments.filter((c) => !c.parent_id && c.is_deleted);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const hasUpvoted = useCallback(
    (commentId: string) => upvotes.some((u) => u.comment_id === commentId && u.user_id === currentUser.id),
    [upvotes, currentUser.id]
  );

  const handleUpvote = async (commentId: string) => {
    if (hasUpvoted(commentId)) {
      toast({ title: "Already upvoted" });
      return;
    }
    await supabase.from("comment_upvotes").insert({ comment_id: commentId, user_id: currentUser.id });
    await supabase.from("comments").update({ upvote_count: (comments.find((c) => c.id === commentId)?.upvote_count ?? 0) + 1 }).eq("id", commentId);
    qc.invalidateQueries({ queryKey });
    qc.invalidateQueries({ queryKey: ["comment-upvotes", targetType, targetId] });
  };

  const addComment = async (parentId?: string) => {
    const content = parentId ? replyText.trim() : newComment.trim();
    if (!content || !currentUser.id) return;

    const allowed = await checkRateLimit("comment");
    if (!allowed) return;

    const { error } = await supabase.from("comments").insert({
      content,
      author_id: currentUser.id,
      parent_id: parentId || null,
      target_type: targetType,
      target_id: targetId,
    });
    if (error) { toast({ title: "Failed to post comment", variant: "destructive" }); return; }

    if (parentId) { setReplyText(""); setReplyingTo(null); } else { setNewComment(""); }
    toast({ title: "Comment added" });
    qc.invalidateQueries({ queryKey });
  };

  const saveEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    await supabase.from("comments").update({ content: editText.trim() }).eq("id", commentId);
    setEditingId(null);
    setEditText("");
    toast({ title: "Comment edited" });
    qc.invalidateQueries({ queryKey });
  };

  const deleteComment = async (commentId: string) => {
    await supabase.from("comments").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", commentId);
    toast({ title: "Comment deleted" });
    qc.invalidateQueries({ queryKey });
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
                <AdminBadge email={author?.email} />
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
                <p className="text-sm mt-1 text-foreground/90">{comment.content}</p>
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
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-destructive" onClick={() => deleteComment(comment.id)}>
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
                <div className="flex-1 flex gap-2">
                  <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply…" className="min-h-[60px] resize-none text-sm flex-1" maxLength={500} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(comment.id); } }} />
                  <Button size="sm" className="self-end" disabled={!replyText.trim()} onClick={() => addComment(comment.id)}><Send className="h-4 w-4" /></Button>
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
    <div className="space-y-4">
      {topLevel.length === 0 && deletedTopLevel.length === 0 && <p className="text-sm text-muted-foreground italic py-4">No comments yet. Start the conversation!</p>}
      {[...deletedTopLevel, ...topLevel].map((comment) => renderComment(comment))}
      <div className="pt-4 border-t border-border">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 mt-1"><AvatarImage src={currentUser.avatarUrl} /><AvatarFallback>{currentUser.name[0]}</AvatarFallback></Avatar>
          <div className="flex-1">
            <Textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment…" className="min-h-[80px] resize-none text-sm" maxLength={1000} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }} />
            <div className="flex justify-end mt-2">
              <Button size="sm" disabled={!newComment.trim()} onClick={() => addComment()}><Send className="h-4 w-4 mr-1" /> Comment</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
