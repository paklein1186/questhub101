import { motion } from "framer-motion";
import { ThumbsUp, MessageSquare, CornerDownRight } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommentTargetType } from "@/types/enums";
import { getCommentsForTarget, getUserById } from "@/data/mock";
import { formatDistanceToNow } from "date-fns";

interface CommentSectionProps {
  targetType: CommentTargetType;
  targetId: string;
}

export function CommentSection({ targetType, targetId }: CommentSectionProps) {
  const allComments = getCommentsForTarget(targetType, targetId);
  const topLevel = allComments.filter((c) => !c.parentId);
  const replies = allComments.filter((c) => c.parentId);

  return (
    <div className="space-y-4">
      {topLevel.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No comments yet. Be the first to contribute!</p>
      )}
      {topLevel.map((comment, i) => {
        const author = getUserById(comment.authorId);
        const commentReplies = replies.filter((r) => r.parentId === comment.id);
        return (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={author?.avatarUrl} />
                <AvatarFallback>{author?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">{author?.name}</span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1 text-foreground/90">{comment.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-primary">
                    <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                    {comment.upvoteCount}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-primary">
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    Reply
                  </Button>
                </div>
              </div>
            </div>

            {commentReplies.map((reply) => {
              const replyAuthor = getUserById(reply.authorId);
              return (
                <div key={reply.id} className="ml-8 pl-4 border-l-2 border-border flex items-start gap-3">
                  <CornerDownRight className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={replyAuthor?.avatarUrl} />
                    <AvatarFallback>{replyAuthor?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">{replyAuthor?.name}</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm mt-0.5 text-foreground/90">{reply.content}</p>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-primary mt-1">
                      <ThumbsUp className="h-3.5 w-3.5 mr-1" />
                      {reply.upvoteCount}
                    </Button>
                  </div>
                </div>
              );
            })}
          </motion.div>
        );
      })}
    </div>
  );
}
