import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Clock, ExternalLink, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribution: any;
  questId: string;
  reviewQuorum?: number;
}

export function PeerReviewDialog({ open, onOpenChange, contribution, questId, reviewQuorum = 1 }: Props) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const c = contribution;
  if (!c) return null;

  const profile = c.profile || { name: t("peerReview.unknown") };

  // Step 6: Evidence guard
  const evidenceRequired = c.evidence_required === true;
  const hasEvidence = !!c.evidence_url;
  const blockApproval = evidenceRequired && !hasEvidence;

  const submitVote = async (vote: "approve" | "reject" | "dispute") => {
    setSubmitting(true);

    const { error: voteErr } = await supabase
      .from("contribution_review_votes" as any)
      .insert({
        contribution_id: c.id,
        reviewer_user_id: currentUser.id,
        vote,
        comment: comment.trim() || null,
      } as any);

    if (voteErr) {
      toast({ title: t("peerReview.toast.failed"), variant: "destructive" });
      setSubmitting(false);
      return;
    }

    if (vote === "dispute") {
      await supabase
        .from("contribution_logs" as any)
        .update({ status: "disputed" } as any)
        .eq("id", c.id);

      await supabase.from("posts" as any).insert({
        title: `Contribution dispute: ${c.title}`,
        content: `A contribution by ${profile.name} has been disputed.\n\nReason: ${comment.trim() || "No reason provided."}\n\nPlease review and resolve.`,
        author_id: currentUser.id,
        target_type: "quest",
        target_id: questId,
        post_type: "discussion",
      } as any);

      toast({ title: t("peerReview.toast.disputed") });
    } else if (vote === "approve") {
      const { count } = await supabase
        .from("contribution_review_votes" as any)
        .select("id", { count: "exact", head: true })
        .eq("contribution_id", c.id)
        .eq("vote", "approve");

      const approveCount = (count ?? 0);
      if (approveCount >= reviewQuorum) {
        await supabase
          .from("contribution_logs" as any)
          .update({
            status: "verified",
            verified_at: new Date().toISOString(),
            verified_by_user_id: currentUser.id,
          } as any)
          .eq("id", c.id);

        await supabase
          .from("contribution_logs" as any)
          .update({ review_votes_count: approveCount } as any)
          .eq("id", c.id);

        toast({ title: t("peerReview.toast.approved") });
      } else {
        toast({ title: t("peerReview.toast.voteRecorded", { count: approveCount, quorum: reviewQuorum }) });
      }
    } else {
      toast({ title: t("peerReview.toast.rejectionRecorded") });
    }

    qc.invalidateQueries({ queryKey: ["contribution-logs"] });
    setComment("");
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{t("peerReview.dialogTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Contribution details */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-sm font-medium">{c.title}</p>
            <p className="text-xs text-muted-foreground">{t("peerReview.byLabel", { name: profile.name })}</p>
            {c.description && (
              <p className="text-xs text-muted-foreground">{c.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {c.half_days > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {t("peerReview.halfDaysLabel", { count: c.half_days })}
                </span>
              )}
              {c.difficulty && (
                <Badge variant="secondary" className="text-[10px]">
                  {t(`peerReview.difficultyLabels.${c.difficulty}`, { defaultValue: c.difficulty })}
                </Badge>
              )}
              {c.fmv_value > 0 && (
                <span className="font-medium text-primary">{t("peerReview.fmvLabel", { value: c.fmv_value.toFixed(2) })}</span>
              )}
              {c.deliverable_url && (
                <a
                  href={c.deliverable_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> {t("peerReview.viewDeliverable")}
                </a>
              )}
            </div>
          </div>

          {/* Step 6: Evidence section */}
          {hasEvidence && (
            <a
              href={c.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Paperclip className="h-4 w-4" /> {t("peerReview.viewEvidence")}
            </a>
          )}

          {blockApproval && (
            <div className="rounded-lg border border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {t("peerReview.evidenceRequired")}
              </span>
            </div>
          )}

          {/* Comment */}
          <div>
            <label className="text-sm font-medium mb-1 block">{t("peerReview.commentLabel")}</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("peerReview.commentPlaceholder")}
              rows={2}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {t("peerReview.quorumLabel", { count: reviewQuorum })}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 flex-1"
            onClick={() => submitVote("approve")}
            disabled={submitting || blockApproval}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            {t("peerReview.approve")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-500/30 hover:bg-red-500/10 flex-1"
            onClick={() => submitVote("reject")}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
            {t("peerReview.reject")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10 flex-1"
            onClick={() => submitVote("dispute")}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-1" />}
            {t("peerReview.dispute")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
