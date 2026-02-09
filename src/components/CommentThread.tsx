import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, MessageSquare, Send } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CommentTargetType } from "@/types/enums";
import { comments as allMockComments, commentUpvotes as allMockUpvotes, getUserById } from "@/data/mock";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import type { Comment, CommentUpvote } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface CommentThreadProps {
  targetType: CommentTargetType;
  targetId: string;
}

export function CommentThread({ targetType, targetId }: CommentThreadProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { notifyComment, notifyUpvote } = useNotifications();

  const [comments, setComments] = useState<Comment[]>(() =>
    allMockComments
      .filter((c) => c.targetType === targetType && c.targetId === targetId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  );
  const [upvotes, setUpvotes] = useState<CommentUpvote[]>(() =>
    allMockUpvotes.filter((u) => comments.some((c) => c.id === u.commentId))
  );
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const topLevel = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  const hasUpvoted = useCallback(
    (commentId: string) => upvotes.some((u) => u.commentId === commentId && u.userId === currentUser.id),
    [upvotes, currentUser.id]
  );

  const handleUpvote = (commentId: string) => {
    if (hasUpvoted(commentId)) {
      toast({ title: "Already upvoted", description: "You can only upvote once per comment." });
      return;
    }
    const comment = comments.find((c) => c.id === commentId);
    const newUpvoteRecord: CommentUpvote = {
      id: `cu-${Date.now()}`,
      commentId,
      userId: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    setUpvotes((prev) => [...prev, newUpvoteRecord]);
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, upvoteCount: c.upvoteCount + 1 } : c))
    );
    // Notify the comment author
    if (comment) {
      notifyUpvote({
        upvoterId: currentUser.id,
        commentAuthorId: comment.authorId,
        commentId,
        commentSnippet: comment.content,
      });
    }
  };

  const addComment = (parentId?: string) => {
    const content = parentId ? replyText.trim() : newComment.trim();
    if (!content) return;

    const commentId = `c-${Date.now()}`;
    const comment: Comment = {
      id: commentId,
      content,
      createdAt: new Date().toISOString(),
      authorId: currentUser.id,
      parentId,
      targetType,
      targetId,
      upvoteCount: 0,
    };
    setComments((prev) => [...prev, comment]);
    if (parentId) {
      setReplyText("");
      setReplyingTo(null);
    } else {
      setNewComment("");
    }
    toast({ title: "Comment added" });

    // Notify the target owner
    notifyComment({
      commentAuthorId: currentUser.id,
      targetType,
      targetId,
      commentId,
      commentSnippet: content,
    });
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const author = getUserById(comment.authorId);
    const replies = isReply ? [] : getReplies(comment.id);
    const voted = hasUpvoted(comment.id);

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={isReply ? "ml-8 pl-4 border-l-2 border-border" : ""}
      >
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Avatar className={isReply ? "h-7 w-7" : "h-8 w-8"}>
              <AvatarImage src={author?.avatarUrl} />
              <AvatarFallback>{author?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{author?.name}</span>
                <span className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm mt-1 text-foreground/90">{comment.content}</p>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 ${voted ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                  onClick={() => handleUpvote(comment.id)}
                >
                  <ThumbsUp className="h-3.5 w-3.5 mr-1" fill={voted ? "currentColor" : "none"} />
                  {comment.upvoteCount}
                </Button>
                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-primary"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    Reply
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {replyingTo === comment.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-8 mt-2"
            >
              <div className="flex gap-2">
                <Avatar className="h-7 w-7 mt-1">
                  <AvatarImage src={currentUser.avatarUrl} />
                  <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply…"
                    className="min-h-[60px] resize-none text-sm flex-1"
                    maxLength={500}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        addComment(comment.id);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="self-end"
                    disabled={!replyText.trim()}
                    onClick={() => addComment(comment.id)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {topLevel.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-4">No comments yet. Start the conversation!</p>
      )}
      {topLevel.map((comment) => renderComment(comment))}

      <div className="pt-4 border-t border-border">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 mt-1">
            <AvatarImage src={currentUser.avatarUrl} />
            <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment…"
              className="min-h-[80px] resize-none text-sm"
              maxLength={1000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addComment();
                }
              }}
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" disabled={!newComment.trim()} onClick={() => addComment()}>
                <Send className="h-4 w-4 mr-1" /> Comment
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
