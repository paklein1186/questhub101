import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersona } from "@/hooks/usePersona";

interface XpLevelBadgeProps {
  level: number;
  xp?: number;
  compact?: boolean;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Newcomer",
  2: "Contributor",
  3: "Builder",
  4: "Champion",
  5: "Legend",
};

export function XpLevelBadge({ level, xp, compact }: XpLevelBadgeProps) {
  const levelLabel = LEVEL_LABELS[level] || `Level ${level}`;
  const { label: pLabel } = usePersona();
  const xpWord = pLabel("xp.label");

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0 h-5">
            <Zap className="h-2.5 w-2.5 text-primary" /> Lv{level}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{levelLabel}{xp != null ? ` · ${xp} ${xpWord}` : ""}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Badge variant="outline" className="text-xs gap-1">
      <Zap className="h-3 w-3 text-primary" /> Lv{level} {levelLabel}
      {xp != null && <span className="text-muted-foreground ml-1">({xp} {xpWord})</span>}
    </Badge>
  );
}
