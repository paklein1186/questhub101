import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Hash, CalendarDays, Users } from "lucide-react";

interface GuildKanbanBoardProps {
  guildId: string;
  isAdmin: boolean;
  isMember: boolean;
}

const COLUMNS = [
  { key: "OPEN", label: "Open", color: "border-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20" },
  { key: "COMPLETED", label: "Completed", color: "border-emerald-400/50 bg-emerald-50/30 dark:bg-emerald-950/20" },
];

export function GuildKanbanBoard({ guildId, isAdmin, isMember }: GuildKanbanBoardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const { data: quests = [], isLoading } = useQuery({
    queryKey: ["guild-kanban-quests", guildId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("*, quest_topics(topic_id, topics(id, name))")
        .eq("guild_id", guildId)
        .eq("is_deleted", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      // Fetch subtask counts per quest
      const questIds = (data || []).map(q => q.id);
      let subtaskCounts: Record<string, { total: number; done: number }> = {};
      if (questIds.length > 0) {
        const { data: subtasks } = await supabase
          .from("quest_subtasks" as any)
          .select("quest_id, status")
          .in("quest_id", questIds);
        for (const st of (subtasks || []) as any[]) {
          if (!subtaskCounts[st.quest_id]) subtaskCounts[st.quest_id] = { total: 0, done: 0 };
          subtaskCounts[st.quest_id].total++;
          if (st.status === "DONE") subtaskCounts[st.quest_id].done++;
        }
      }
      return (data || []).map(q => ({ ...q, subtaskCount: subtaskCounts[q.id] }));
    },
  });

  const moveQuest = async (questId: string, newStatus: string) => {
    const { error } = await supabase.from("quests").update({ status: newStatus as any }).eq("id", questId);
    if (error) { toast({ title: "Failed to move quest", variant: "destructive" }); return; }
    qc.invalidateQueries({ queryKey: ["guild-kanban-quests", guildId] });
    qc.invalidateQueries({ queryKey: ["quests-for-guild", guildId] });
  };

  const handleDragStart = (e: React.DragEvent, questId: string) => {
    setDraggingId(questId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggingId && (isAdmin)) {
      moveQuest(draggingId, status);
    }
    setDraggingId(null);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading board…</p>;
  if (!isMember) return <p className="text-sm text-muted-foreground">Join the guild to see the board.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map(col => {
        const colQuests = quests.filter(q => q.status === col.key);
        return (
          <div
            key={col.key}
            className={`rounded-xl border-2 ${col.color} p-3 min-h-[200px] transition-all ${draggingId ? "border-dashed" : ""}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display font-semibold text-sm">{col.label}</h4>
              <Badge variant="secondary" className="text-xs">{colQuests.length}</Badge>
            </div>
            <div className="space-y-2">
              {colQuests.map(quest => {
                const topics = (quest.quest_topics || []).map((qt: any) => qt.topics).filter(Boolean);
                return (
                  <div
                    key={quest.id}
                    draggable={isAdmin}
                    onDragStart={(e) => handleDragStart(e, quest.id)}
                    className={`rounded-lg border border-border bg-card p-3 cursor-pointer hover:border-primary/30 transition-all ${
                      draggingId === quest.id ? "opacity-50" : ""
                    } ${isAdmin ? "cursor-grab active:cursor-grabbing" : ""}`}
                  >
                    <Link to={`/quests/${quest.id}`} className="block">
                      <h5 className="font-medium text-sm mb-1.5 line-clamp-2">{quest.title}</h5>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {topics.slice(0, 2).map((t: any) => (
                          <Badge key={t.id} variant="secondary" className="text-[10px]">
                            <Hash className="h-2.5 w-2.5 mr-0.5" />{t.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {quest.reward_xp} XP</span>
                        {quest.subtaskCount && (
                          <span>{quest.subtaskCount.done}/{quest.subtaskCount.total} tasks</span>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
              {colQuests.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No quests</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
