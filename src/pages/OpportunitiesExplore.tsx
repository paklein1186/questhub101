import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Swords } from "lucide-react";

interface Props {
  bare?: boolean;
}

export default function OpportunitiesExplore({ bare }: Props) {
  const { data: needs, isLoading } = useQuery({
    queryKey: ["explore-opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_needs")
        .select("id, title, description, category, status, quest_id, created_at, quests!quest_needs_quest_id_fkey(title, status)")
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Loading opportunities…</div>;
  }

  if (!needs || needs.length === 0) {
    return (
      <div className="py-12 text-center">
        <Lightbulb className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No open opportunities right now.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {needs.map((need) => {
        const quest = need.quests as any;
        return (
          <Link
            key={need.id}
            to={`/quests/${need.quest_id}?tab=explore`}
            className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-all"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{need.title}</p>
                {need.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{need.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {need.category && (
                    <Badge variant="secondary" className="text-[10px]">{need.category}</Badge>
                  )}
                  <Badge variant={need.status === "open" ? "default" : "outline"} className="text-[10px] capitalize">
                    {need.status}
                  </Badge>
                </div>
                {quest?.title && (
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
                    <Swords className="h-3 w-3" />
                    <span className="truncate">{quest.title}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
