import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ThumbsUp, ArrowUpDown, Loader2, Sparkles, User, Compass, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  useTerritoryExcerpts,
  useExcerptUserUpvotes,
  useToggleExcerptUpvote,
  useCreateExcerpt,
} from "@/hooks/useTerritoryDetail";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Props {
  territoryId: string;
  territoryName: string;
  userId?: string;
}

export function TerritoryLibraryTab({ territoryId, territoryName, userId }: Props) {
  const [sort, setSort] = useState<"top" | "recent">("top");
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState("");
  const { data: excerpts = [], isLoading } = useTerritoryExcerpts(territoryId, sort);
  const { data: userUpvotes = new Set() } = useExcerptUserUpvotes(territoryId, userId);
  const toggleUpvote = useToggleExcerptUpvote();
  const createExcerpt = useCreateExcerpt();

  const handleUpvote = (excerptId: string, authorUserId: string | null) => {
    if (!userId) {
      toast.error("Sign in to upvote");
      return;
    }
    const isUpvoted = userUpvotes.has(excerptId);
    toggleUpvote.mutate({ excerptId, userId, isUpvoted, authorUserId });
  };

  const handleCreate = () => {
    if (!userId || !newText.trim()) return;
    createExcerpt.mutate({
      territory_id: territoryId,
      text: newText.trim(),
      created_by_user_id: userId,
    });
    setNewText("");
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-display font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Library of Excerpts
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Meaningful insights, quotes, patterns, and ideas about {territoryName}. Upvote what you find valuable to reward contributors.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setSort(sort === "top" ? "recent" : "top")}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sort === "top" ? "Most valued" : "Most recent"}
            </Button>
            {userId && (
              <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(!showAdd)}>
                <Plus className="h-3.5 w-3.5" /> Add excerpt
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Add new excerpt */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <Textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Write a meaningful excerpt about this territory…"
              className="min-h-[80px] resize-none text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={!newText.trim() || createExcerpt.isPending}>
                {createExcerpt.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                Save to Library
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && excerpts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">No excerpts yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Be the first to contribute meaningful knowledge to this territory's library.
          </p>
        </div>
      )}

      {/* Excerpt cards */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {excerpts.map((excerpt) => {
            const isUpvoted = userUpvotes.has(excerpt.id);
            return (
              <motion.div
                key={excerpt.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-primary/20 transition-colors"
              >
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  "{excerpt.text}"
                </p>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {excerpt.created_by_user_id && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> Contributor
                      </span>
                    )}
                    {excerpt.source_quest_id && (
                      <span className="flex items-center gap-1">
                        <Compass className="h-3 w-3" /> From Quest
                      </span>
                    )}
                    <span>{formatDistanceToNow(new Date(excerpt.created_at), { addSuffix: true })}</span>
                  </div>
                  <button
                    onClick={() => handleUpvote(excerpt.id, excerpt.created_by_user_id)}
                    disabled={toggleUpvote.isPending}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                      isUpvoted
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "bg-muted text-muted-foreground hover:bg-accent border border-transparent"
                    )}
                  >
                    <ThumbsUp className={cn("h-3.5 w-3.5", isUpvoted && "fill-primary")} />
                    {excerpt.upvote_count}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
