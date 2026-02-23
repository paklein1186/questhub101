import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TrustSummary } from "@/hooks/useTrustSummary";

interface TrustSummaryBadgeProps {
  summary: TrustSummary | undefined;
  /** compact = mini-card style (score + top 2 tags); full = search result style */
  variant?: "compact" | "full";
}

export function TrustSummaryBadge({ summary, variant = "compact" }: TrustSummaryBadgeProps) {
  if (!summary || summary.publicAttestationCount === 0) return null;

  const maxTags = variant === "compact" ? 2 : 3;
  const tags = summary.topTags.slice(0, maxTags);

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
        <Shield className="h-3 w-3" />
        {summary.trustScoreGlobal}
      </span>
      {variant === "full" && (
        <span className="text-[10px] text-muted-foreground">
          · Trusted by {summary.publicAttestationCount}
        </span>
      )}
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className="text-[9px] px-1 py-0 h-4 bg-amber-500/5 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}
