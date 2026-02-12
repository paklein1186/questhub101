import { Zap, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlanLimitBadgeProps {
  /** e.g. "1 free quest left this week" */
  freeRemaining?: number;
  /** e.g. "free quests" */
  itemLabel: string;
  /** XP cost if over limit */
  xpCost: number;
  /** Is the limit reached? */
  limitReached: boolean;
  /** compact mode for inline display */
  compact?: boolean;
  /** Is the user in the grace period? */
  inGracePeriod?: boolean;
  /** Days left in the grace period */
  gracePeriodDaysLeft?: number;
}

export function PlanLimitBadge({ freeRemaining = 0, itemLabel, xpCost, limitReached, compact, inGracePeriod, gracePeriodDaysLeft }: PlanLimitBadgeProps) {
  if (inGracePeriod) {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1 border-primary/30 text-primary">
        <Gift className="h-3 w-3" /> Free trial — {gracePeriodDaysLeft} day{gracePeriodDaysLeft !== 1 ? "s" : ""} left
      </Badge>
    );
  }

  if (!limitReached) {
    if (freeRemaining <= 2 && freeRemaining > 0) {
      return (
        <Badge variant="secondary" className="text-[10px] gap-1">
          {freeRemaining} free {itemLabel} left{compact ? "" : " this week"}
        </Badge>
      );
    }
    return null;
  }

  return (
    <Badge variant="outline" className="text-[10px] gap-1 border-warning/40 text-warning">
      <Zap className="h-3 w-3" /> Extra {itemLabel} cost {xpCost} XP
    </Badge>
  );
}
