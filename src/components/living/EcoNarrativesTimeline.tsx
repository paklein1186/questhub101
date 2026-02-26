import { Clock, TrendingUp, TrendingDown, Leaf, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEcoNarratives } from "@/hooks/useEcoImpact";
import { formatDistanceToNow } from "date-fns";

interface Props {
  naturalSystemId: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Leaf; color: string }> = {
  IMPACT: { icon: TrendingUp, color: "bg-success/20 text-success" },
  DEGRADATION: { icon: TrendingDown, color: "bg-warning/20 text-warning" },
  NARRATIVE: { icon: Sparkles, color: "bg-primary/20 text-primary" },
};

export function EcoNarrativesTimeline({ naturalSystemId }: Props) {
  const { data: narratives, isLoading } = useEcoNarratives(naturalSystemId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl border border-border bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!narratives || narratives.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center">
        <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No ecosystem events recorded yet.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Events will appear here when eco-impact rules are triggered by linked quests.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-base flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-600" /> Ecosystem Timeline
        <span className="text-muted-foreground font-normal text-sm">({narratives.length})</span>
      </h3>

      <div className="relative pl-6 space-y-3">
        <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />
        {narratives.map((n) => {
          const cfg = TYPE_CONFIG[n.narrative_type] || TYPE_CONFIG.NARRATIVE;
          const IconComp = cfg.icon;
          return (
            <div key={n.id} className="relative">
              <div className={cn("absolute left-[-18px] top-1 h-5 w-5 rounded-full flex items-center justify-center", cfg.color)}>
                <IconComp className="h-3 w-3" />
              </div>
              <Card className="overflow-hidden">
                <CardContent className="p-3 space-y-1">
                  <p className="text-xs text-foreground leading-relaxed">{n.narrative_text}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                    {n.indicator_key && (
                      <Badge variant="outline" className="text-[9px] py-0">
                        {n.indicator_key.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {n.indicator_before != null && n.indicator_after != null && (
                      <span>
                        {String(n.indicator_before)} → {String(n.indicator_after)}
                      </span>
                    )}
                    <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
