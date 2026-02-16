import { type LucideIcon, Circle, Droplet, Sprout, Anchor, Leaf, GitBranch, Flower2, TreePine, Wheat, Sparkles, Waypoints, TreeDeciduous, Shield, ShieldCheck, Trees } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersona } from "@/hooks/usePersona";
import { LEVEL_LABELS } from "@/lib/xpCreditsConfig";
import { useState } from "react";
import { XpLadderModal } from "@/components/XpLadderModal";

interface XpLevelBadgeProps {
  level: number;
  xp?: number;
  compact?: boolean;
}

/** Lucide icon + color tone per level */
const LEVEL_VISUALS: Record<number, { icon: LucideIcon; color: string }> = {
  1:  { icon: Circle,        color: "text-[hsl(120,20%,70%)]" },   // light sage
  2:  { icon: Droplet,       color: "text-[hsl(120,22%,65%)]" },
  3:  { icon: Sprout,        color: "text-[hsl(120,25%,60%)]" },
  4:  { icon: Anchor,        color: "text-[hsl(130,30%,45%)]" },   // moss green
  5:  { icon: Leaf,          color: "text-[hsl(130,32%,42%)]" },
  6:  { icon: GitBranch,     color: "text-[hsl(135,35%,38%)]" },
  7:  { icon: Flower2,       color: "text-[hsl(145,40%,32%)]" },   // deep green
  8:  { icon: TreePine,      color: "text-[hsl(148,42%,30%)]" },
  9:  { icon: Wheat,         color: "text-[hsl(150,45%,28%)]" },
  10: { icon: Sparkles,      color: "text-[hsl(170,45%,35%)]" },   // teal-green
  11: { icon: Waypoints,     color: "text-[hsl(172,48%,32%)]" },
  12: { icon: TreeDeciduous, color: "text-[hsl(175,50%,30%)]" },
  13: { icon: Shield,        color: "text-[hsl(155,55%,30%)]" },   // emerald + gold
  14: { icon: ShieldCheck,   color: "text-[hsl(155,55%,28%)]" },
  15: { icon: Trees,         color: "text-[hsl(45,70%,45%)]" },    // gold accent
};

export function XpLevelBadge({ level, xp, compact }: XpLevelBadgeProps) {
  const levelLabel = LEVEL_LABELS[level] || `Level ${level}`;
  const { label: pLabel } = usePersona();
  const xpWord = pLabel("xp.label");
  const visual = LEVEL_VISUALS[level] || LEVEL_VISUALS[1];
  const Icon = visual.icon;
  const [modalOpen, setModalOpen] = useState(false);

  if (compact) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-[10px] gap-0.5 px-1.5 py-0 h-5 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setModalOpen(true)}
            >
              <Icon className={`h-2.5 w-2.5 ${visual.color}`} /> Lv{level}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{levelLabel}{xp != null ? ` · ${xp} ${xpWord}` : ""}</p>
            <p className="text-[10px] text-muted-foreground">Click to learn about levels</p>
          </TooltipContent>
        </Tooltip>
        <XpLadderModal open={modalOpen} onOpenChange={setModalOpen} currentLevel={level} currentXp={xp} />
      </>
    );
  }

  return (
    <>
      <Badge
        variant="outline"
        className="text-xs gap-1 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setModalOpen(true)}
      >
        <Icon className={`h-3 w-3 ${visual.color}`} /> Lv{level} {levelLabel}
        {xp != null && <span className="text-muted-foreground ml-1">({xp} {xpWord})</span>}
      </Badge>
      <XpLadderModal open={modalOpen} onOpenChange={setModalOpen} currentLevel={level} currentXp={xp} />
    </>
  );
}
