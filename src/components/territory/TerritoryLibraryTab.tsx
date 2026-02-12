import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BookOpen, ThumbsUp, ArrowUpDown, Loader2, Sparkles, User, Compass, Plus,
  Trash2, Flag, ChevronDown, ChevronUp, MessageSquare, Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  useTerritoryExcerpts,
  useExcerptUserUpvotes,
  useToggleExcerptUpvote,
  useCreateExcerpt,
  useDeleteExcerpt,
  useReportExcerpt,
  type TerritoryExcerpt,
} from "@/hooks/useTerritoryDetail";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";

interface Props {
  territoryId: string;
  territoryName: string;
  userId?: string;
}

const REPORT_REASONS = [
  "Spam or irrelevant",
  "Offensive or harmful",
  "Misinformation",
  "Copyright violation",
  "Other",
];

function ReportPopover({ excerptId, userId }: { excerptId: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [custom, setCustom] = useState("");
  const reportExcerpt = useReportExcerpt();

  const handleSubmit = () => {
    reportExcerpt.mutate({
      excerptId,
      userId,
      reason,
      customReason: reason === "Other" ? custom : undefined,
    });
    setOpen(false);
    setReason(REPORT_REASONS[0]);
    setCustom("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded" title="Report">
          <Flag className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3" align="end">
        <h4 className="font-semibold text-sm">Report this excerpt</h4>
        <RadioGroup value={reason} onValueChange={setReason} className="space-y-1.5">
          {REPORT_REASONS.map(r => (
            <div key={r} className="flex items-center gap-2">
              <RadioGroupItem value={r} id={`report-${r}`} />
              <Label htmlFor={`report-${r}`} className="text-xs cursor-pointer">{r}</Label>
            </div>
          ))}
        </RadioGroup>
        {reason === "Other" && (
          <Input
            placeholder="Describe the issue..."
            value={custom}
            onChange={e => setCustom(e.target.value)}
            className="h-8 text-xs"
          />
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleSubmit}
            disabled={reportExcerpt.isPending || (reason === "Other" && !custom.trim())}
          >
            {reportExcerpt.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Report
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ExcerptCard({
  excerpt,
  userId,
  isUpvoted,
  onUpvote,
  upvotePending,
}: {
  excerpt: TerritoryExcerpt;
  userId?: string;
  isUpvoted: boolean;
  onUpvote: () => void;
  upvotePending: boolean;
}) {
  const [showSource, setShowSource] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const deleteExcerpt = useDeleteExcerpt();
  const isOwner = userId && excerpt.created_by_user_id === userId;

  const hasSynthesis = !!excerpt.synthesis;
  const hasSource = !!excerpt.source_prompt;
  const displayText = hasSynthesis ? excerpt.synthesis : excerpt.text;

  // Truncate for card preview (4 sentences max)
  const getSentencePreview = (text: string | null | undefined, maxSentences: number = 4) => {
    if (!text) return text;
    const sentences = text.split(/(?<=[.!?])\s+/).slice(0, maxSentences).join(" ");
    const isTruncated = text.split(/(?<=[.!?])\s+/).length > maxSentences;
    return isTruncated ? sentences + "…" : sentences;
  };

  const isLong = (displayText?.split(/(?<=[.!?])\s+/).length ?? 0) > 4;
  const previewText = getSentencePreview(displayText, 4);

  const excerptHeader = (
    <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
      <div className="flex items-center gap-3 min-w-0">
        {excerpt.created_by_user_id && (
          <Link
            to={`/profile/${excerpt.created_by_user_id}`}
            className="flex items-center gap-2 hover:text-foreground transition-colors min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-7 w-7 ring-1 ring-border">
              <AvatarImage src={excerpt.contributor_avatar || undefined} />
              <AvatarFallback className="text-[9px] bg-primary/5 text-primary">
                {excerpt.contributor_name?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">{excerpt.contributor_name || "Unknown user"}</span>
          </Link>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
          {excerpt.source_quest_id && (
            <Link to={`/quests/${excerpt.source_quest_id}`} className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
              <Compass className="h-3 w-3" /> Quest
            </Link>
          )}
          <span>{formatDistanceToNow(new Date(excerpt.created_at), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {isLong && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
            className="text-muted-foreground hover:text-primary transition-colors p-1 rounded"
            title="Expand"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
        {userId && !isOwner && (
          <ReportPopover excerptId={excerpt.id} userId={userId} />
        )}
        {isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded" title="Delete" onClick={(e) => e.stopPropagation()}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this excerpt?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove the excerpt from the library. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteExcerpt.mutate({ excerptId: excerpt.id, territoryId: excerpt.territory_id })}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );

  const renderContent = (text: string | null | undefined, fullMode: boolean) => (
    <div className="px-5 pb-3">
      {hasSynthesis && (
        <div className="flex items-center gap-1.5 mb-2">
          <Badge variant="outline" className="text-[9px] gap-1 border-primary/20 text-primary/80 bg-primary/5">
            <Sparkles className="h-2.5 w-2.5" /> Synthesis
          </Badge>
        </div>
      )}
      <div className={cn(
        "prose prose-sm dark:prose-invert max-w-none leading-[1.8] prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:text-foreground/85 prose-p:mb-3 prose-li:text-foreground/85 prose-li:mb-1 prose-strong:text-foreground/90 prose-ul:my-2 prose-ol:my-2 prose-blockquote:border-primary/30 prose-blockquote:bg-primary/[0.03] prose-blockquote:rounded-lg prose-blockquote:py-1 prose-blockquote:px-3",
        fullMode ? "text-[0.9rem]" : "text-sm"
      )}>
        <ReactMarkdown>{text || ""}</ReactMarkdown>
      </div>
      {!fullMode && isLong && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          className="mt-2 text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
        >
          <Maximize2 className="h-3 w-3" /> Read full excerpt
        </button>
      )}
    </div>
  );

  const renderSourceToggle = () => (
    (hasSource || (hasSynthesis && excerpt.text && excerpt.text !== excerpt.synthesis)) ? (
      <div className="px-5 pb-3">
        <button
          onClick={(e) => { e.stopPropagation(); setShowSource(!showSource); }}
          className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary font-medium transition-colors py-1"
        >
          <MessageSquare className="h-3 w-3" />
          {showSource ? "Hide full source" : "Read full source"}
          {showSource ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <AnimatePresence>
          {showSource && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-1.5 rounded-lg bg-muted/40 border border-border/60 p-4">
                <div className="prose prose-xs dark:prose-invert max-w-none text-xs leading-relaxed prose-headings:text-xs prose-headings:font-semibold prose-p:text-muted-foreground prose-li:text-muted-foreground">
                  <ReactMarkdown>{excerpt.source_prompt || excerpt.text || ""}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ) : null
  );

  const upvoteButton = (
    <div className="flex items-center justify-end px-5 pb-4">
      <button
        onClick={(e) => { e.stopPropagation(); onUpvote(); }}
        disabled={upvotePending}
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
  );

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={cn(
          "rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors",
          isLong && "cursor-pointer"
        )}
        onClick={() => isLong && setExpanded(true)}
      >
        {excerptHeader}
        {renderContent(previewText, false)}
        {!isLong && renderSourceToggle()}
        {upvoteButton}
      </motion.div>

      {/* Expanded popup dialog */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4.5 w-4.5 text-primary" />
              Library Excerpt
            </DialogTitle>
          </DialogHeader>

          {/* Contributor info */}
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            {excerpt.created_by_user_id && (
              <Link
                to={`/profile/${excerpt.created_by_user_id}`}
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Avatar className="h-8 w-8 ring-1 ring-border">
                  <AvatarImage src={excerpt.contributor_avatar || undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/5 text-primary">
                    {excerpt.contributor_name?.[0]?.toUpperCase() || <User className="h-3 w-3" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-medium">{excerpt.contributor_name || "Unknown user"}</span>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(excerpt.created_at), { addSuffix: true })}
                  </p>
                </div>
              </Link>
            )}
            {excerpt.source_quest_id && (
              <Link to={`/quests/${excerpt.source_quest_id}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto">
                <Compass className="h-3 w-3" /> From Quest
              </Link>
            )}
          </div>

          {/* Full content */}
          <div className="py-2">
            {hasSynthesis && (
              <div className="flex items-center gap-1.5 mb-3">
                <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary/80 bg-primary/5">
                  <Sparkles className="h-2.5 w-2.5" /> Synthesis
                </Badge>
              </div>
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none text-[0.9rem] leading-[1.9] prose-headings:font-semibold prose-headings:mt-5 prose-headings:mb-2.5 prose-p:text-foreground/85 prose-p:mb-3.5 prose-li:text-foreground/85 prose-li:mb-1.5 prose-strong:text-foreground/90 prose-ul:my-3 prose-ol:my-3 prose-blockquote:border-primary/30 prose-blockquote:bg-primary/[0.03] prose-blockquote:rounded-lg prose-blockquote:py-2 prose-blockquote:px-4">
              <ReactMarkdown>{displayText || ""}</ReactMarkdown>
            </div>
          </div>

          {/* Source in dialog */}
          {(hasSource || (hasSynthesis && excerpt.text && excerpt.text !== excerpt.synthesis)) && (
            <div className="border-t border-border pt-3">
              <button
                onClick={() => setShowSource(!showSource)}
                className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary font-medium transition-colors py-1"
              >
                <MessageSquare className="h-3 w-3" />
                {showSource ? "Hide full source" : "Read full source"}
                {showSource ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              <AnimatePresence>
                {showSource && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 rounded-lg bg-muted/40 border border-border/60 p-4">
                      <div className="prose prose-xs dark:prose-invert max-w-none text-xs leading-relaxed prose-p:text-muted-foreground prose-li:text-muted-foreground">
                        <ReactMarkdown>{excerpt.source_prompt || excerpt.text || ""}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Upvote in dialog */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              onClick={onUpvote}
              disabled={upvotePending}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all",
                isUpvoted
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-accent border border-transparent"
              )}
            >
              <ThumbsUp className={cn("h-3.5 w-3.5", isUpvoted && "fill-primary")} />
              {excerpt.upvote_count} {excerpt.upvote_count === 1 ? "upvote" : "upvotes"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TerritoryLibraryTab({ territoryId, territoryName, userId }: Props) {
  const [sort, setSort] = useState<"top" | "recent">("top");
  const [showAdd, setShowAdd] = useState(false);
  const [newSynthesis, setNewSynthesis] = useState("");
  const [newSource, setNewSource] = useState("");
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
    if (!userId || !newSynthesis.trim()) return;
    createExcerpt.mutate({
      territory_id: territoryId,
      text: newSynthesis.trim(),
      synthesis: newSynthesis.trim(),
      source_prompt: newSource.trim() || undefined,
      created_by_user_id: userId,
    });
    setNewSynthesis("");
    setNewSource("");
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
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Synthesis / Key insight
              </Label>
              <Textarea
                value={newSynthesis}
                onChange={(e) => setNewSynthesis(e.target.value)}
                placeholder="Write the key insight or synthesis about this territory…"
                className="min-h-[80px] resize-none text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Source / Full prompt (optional)
              </Label>
              <Textarea
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="Paste the original prompt, conversation, or source material…"
                className="min-h-[60px] resize-none text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={!newSynthesis.trim() || createExcerpt.isPending}>
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
          {excerpts.map((excerpt) => (
            <ExcerptCard
              key={excerpt.id}
              excerpt={excerpt}
              userId={userId}
              isUpvoted={userUpvotes.has(excerpt.id)}
              onUpvote={() => handleUpvote(excerpt.id, excerpt.created_by_user_id)}
              upvotePending={toggleUpvote.isPending}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
