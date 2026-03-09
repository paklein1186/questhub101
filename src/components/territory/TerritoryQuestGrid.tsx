import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Compass, Plus, ArrowRight } from "lucide-react";

interface Props {
  territoryId: string;
  territoryName: string;
  canCreateQuest: boolean;
}

export function TerritoryQuestGrid({ territoryId, territoryName, canCreateQuest }: Props) {
  const { data: quests = [] } = useQuery({
    queryKey: ["territory-portal-quests", territoryId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, title, status, reward_xp, guild_id, guilds(name)")
        .eq("territory_id", territoryId)
        .in("status", ["ACTIVE", "OPEN_FOR_PROPOSALS"])
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  if (quests.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
          <Compass className="h-4 w-4 text-primary" /> Active quests in {territoryName}
        </h2>
        {canCreateQuest && (
          <Button size="sm" variant="outline" className="gap-1 text-xs h-7" asChild>
            <Link to={`/create/quest?prefill_territory_id=${territoryId}`}>
              <Plus className="h-3 w-3" /> New quest
            </Link>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quests.map((q: any) => (
          <Link
            key={q.id}
            to={`/quests/${q.id}`}
            className="group rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors"
          >
            <p className="text-sm font-medium text-foreground group-hover:text-primary line-clamp-2">
              {q.title}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[10px]">{q.status}</Badge>
              {(q as any).guilds?.name && (
                <span className="text-[10px] text-muted-foreground">{(q as any).guilds.name}</span>
              )}
              {q.reward_xp > 0 && (
                <span className="text-[10px] text-amber-600 ml-auto">⭐ {q.reward_xp} XP</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
