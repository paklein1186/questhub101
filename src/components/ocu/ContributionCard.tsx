import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, Paperclip } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending Review", className: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  verified: { label: "Approved", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  disputed: { label: "Disputed", className: "bg-red-500/10 text-red-700 border-red-500/30" },
  compensated: { label: "Compensated", className: "bg-primary/10 text-primary border-primary/30" },
  logged: { label: "Logged", className: "bg-muted text-muted-foreground border-border" },
};

const CONTRIBUTION_TYPE_CFG: Record<string, { icon: string; label: string }> = {
  TIME: { icon: "⏱", label: "Time" },
  EXPENSES: { icon: "💸", label: "Expenses" },
  SUPPLIES: { icon: "🗂", label: "Supplies" },
  EQUIPMENT: { icon: "🚛", label: "Equipment" },
  FACILITIES: { icon: "🏢", label: "Facilities" },
  SALES: { icon: "💰", label: "Sales" },
  ROYALTY: { icon: "🎤", label: "Royalty" },
  FINDERS_FEE: { icon: "👁", label: "Finder's Fee" },
  OTHER: { icon: "🌂", label: "Other" },
};

function ContributionTypeBadge({ type }: { type: string }) {
  const cfg = CONTRIBUTION_TYPE_CFG[type];
  if (cfg) {
    return (
      <Badge variant="outline" className="text-[10px] gap-1">
        {cfg.icon} {cfg.label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px]">
      {type}
    </Badge>
  );
}

function ContributionSummaryLine({ log }: { log: any }) {
  const input = log.fmv_input as any;
  if (!input) {
    if (log.half_days > 0) return <span>{log.half_days} half-day{log.half_days !== 1 ? "s" : ""}</span>;
    return null;
  }
  switch (log.contribution_type) {
    case "TIME":
      return <span>{input.half_days} half-day{input.half_days !== 1 ? "s" : ""} · {input.difficulty ?? "STANDARD"}</span>;
    case "EXPENSES":
    case "SUPPLIES":
    case "ROYALTY":
    case "OTHER":
      return <span>€{Number(input.amount_eur || 0).toFixed(2)} · {input.description || "—"}</span>;
    case "EQUIPMENT":
    case "FACILITIES":
      return <span>€{Number(input.amount_eur || 0).toFixed(2)} · {input.period_days}d · {input.description || "—"}</span>;
    case "SALES":
      return <span>€{Number(input.deal_value_eur || 0).toFixed(2)} deal · {input.commission_pct}% commission</span>;
    case "FINDERS_FEE":
      return <span>€{Number(input.deal_value_eur || 0).toFixed(2)} deal · {input.finders_pct}% finder's fee</span>;
    default:
      return null;
  }
}

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
  const isOwnContribution = c.user_id === currentUserId;
  const evUrl = c.evidence_url;

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
            <ContributionTypeBadge type={c.contribution_type} />
            <Badge variant="outline" className={`text-[10px] ${status.className}`}>
              {status.label}
            </Badge>
          </div>

          <p className="text-sm font-medium mt-0.5">{c.title}</p>
          {c.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
          )}

          {/* Summary line + FMV */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-muted-foreground">
            <ContributionSummaryLine log={c} />
            {fmvValue > 0 && (
              <span className="font-medium text-primary">→ FMV: €{fmvValue.toFixed(2)}</span>
            )}
            {evUrl && (
              <a
                href={evUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-0.5 text-primary hover:underline"
              >
                <Paperclip className="h-3 w-3" /> Evidence
              </a>
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

          {/* Compensation badge */}
          {fmvValue > 0 && (
            <div className="flex items-center gap-2 mt-1 text-[10px]">
              {coinsCompensated >= fmvValue ? (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                  🟢 Compensated
                </Badge>
              ) : coinsCompensated > 0 ? (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                  🟡 Partial (€{coinsCompensated} / €{fmvValue})
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 border-red-500/30">
                  🔴 Uncompensated
                </Badge>
              )}
              {compensationStatus === "fiat_external" && (
                <span className="text-muted-foreground italic">€ paid externally</span>
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
