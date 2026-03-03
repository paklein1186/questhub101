import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { usePiPanel } from "@/hooks/usePiPanel";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Loader2 } from "lucide-react";

export function PiRecentQuests() {
  const { session } = useAuth();
  const { setChatActive } = usePiPanel();
  const userId = session?.user?.id;

  const { data: quests, isLoading } = useQuery({
    queryKey: ["pi-recent-quests", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_participants")
        .select("quest_id, quests(id, title, status, updated_at)")
        .eq("user_id", userId!)
        .in("status", ["ACTIVE", "ACCEPTED"])
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []).map((d: any) => d.quests).filter(Boolean);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quests?.length) {
    return (
      <p className="text-xs text-muted-foreground italic px-3 py-3">
        Aucune quête active pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-1 px-1">
      {quests.map((q: any) => (
        <button
          key={q.id}
          onClick={() => setChatActive(true)}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium text-foreground line-clamp-1 flex-1">
              {q.title}
            </span>
            <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
              {q.status?.toLowerCase()}
            </Badge>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(new Date(q.updated_at), { addSuffix: true })}
            </span>
            <span className="text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Continuer avec Pi <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
