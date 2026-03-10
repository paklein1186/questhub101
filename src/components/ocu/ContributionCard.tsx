import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending Review", className: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  verified: { label: "Approved", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  disputed: { label: "Disputed", className: "bg-red-500/10 text-red-700 border-red-500/30" },
  compensated: { label: "Compensated", className: "bg-primary/10 text-primary border-primary/30" },
  logged: { label: "Logged", className: "bg-muted text-muted-foreground border-border" },
};

const DIFFICULTY_LABELS: Record<string, string> = {
  standard: "Standard ×1",
  enhanced: "Enhanced ×1.5",
  complex: "Complex ×2",
  critical: "Critical ×3",
};

interface Props {
  contribution: any;
  currentUserId: string;
  onReview?: () => void;
  showReviewButton?: boolean;
}

export function ContributionCard({ contribution, currentUserId, onReview, showReviewButton }: Props) {
  const c = contribution;
  const profile = c.profile || { name: "Unknown", avatar_url: null };
  const status = STATUS_STYLES[c.status] ?? STATUS_STYLES.logged;
  const fmvValue = c.fmv_value ?? 0;
  const halfDays = c.half_days ?? 0;
  const difficulty = c.difficulty ?? "standard";
  const isOwnContribution = c.user_id === currentUserId;

  // Compensation info
  const coinsCompensated = c.coins_compensated ?? 0;
  const compensationStatus = c.compensation_status ?? "none";

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2 group">
      <div className="flex items-start gap-2.5">
        <Avatar className="h-8 w-8 mt-0.5">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs">{profile.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium">{profile.name}</span>
            <Badge variant="outline" className={`text-[10px] ${status.className}`}>
              {status.label}
            </Badge>
            {difficulty !== "standard" && (
              <Badge variant="secondary" className="text-[10px]">
                {DIFFICULTY_LABELS[difficulty] ?? difficulty}
              </Badge>
            )}
          </div>

          <p className="text-sm font-medium mt-0.5">{c.title}</p>
          {c.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
          )}

          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-muted-foreground">
            {halfDays > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {halfDays} half-day{halfDays !== 1 ? "s" : ""}
              </span>
            )}
            {fmvValue > 0 && (
              <span className="font-medium text-primary">🟡 {fmvValue} Coins</span>
            )}
            {c.deliverable_url && (
              <a
                href={c.deliverable_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Deliverable
              </a>
            )}
            <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
          </div>

          {/* Compensation indicator */}
          {(compensationStatus !== "none" || coinsCompensated > 0) && (
            <div className="flex items-center gap-2 mt-1 text-[10px]">
              {coinsCompensated > 0 && (
                <span className="text-emerald-600 font-medium">
                  🟡 {coinsCompensated} paid
                </span>
              )}
              {compensationStatus === "pending_compensation" && fmvValue > coinsCompensated && (
                <span className="text-amber-600">
                  🟡 {fmvValue - coinsCompensated} pending
                </span>
              )}
            </div>
          )}
        </div>

        {/* Review button */}
        {showReviewButton && !isOwnContribution && c.status === "pending" && onReview && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={onReview}
          >
            Review
          </Button>
        )}
      </div>
    </div>
  );
}
