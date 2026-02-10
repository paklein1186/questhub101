import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GripVertical, Trash2, CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface QuestSubtasksProps {
  questId: string;
  questOwnerId: string;
  guildId?: string | null;
  canManage: boolean;
}

const STATUS_OPTIONS = ["TODO", "IN_PROGRESS", "DONE"] as const;
const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  DONE: "bg-emerald-500/10 text-emerald-600",
};

export function QuestSubtasks({ questId, questOwnerId, guildId, canManage }: QuestSubtasksProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: subtasks = [], isLoading } = useQuery({
    queryKey: ["quest-subtasks", questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_subtasks" as any)
        .select("*")
        .eq("quest_id", questId)
        .order("order_index");
      if (error) throw error;
      // Fetch assignee profiles
      const userIds = (data || []).map((s: any) => s.assignee_user_id).filter(Boolean);
      let profileMap = new Map();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles_public").select("user_id, name, avatar_url").in("user_id", userIds);
        profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      }
      return (data || []).map((s: any) => ({ ...s, assignee: profileMap.get(s.assignee_user_id) }));
    },
  });

  // Fetch guild members for assignee picker
  const { data: guildMembers = [] } = useQuery({
    queryKey: ["guild-members-for-subtasks", guildId],
    queryFn: async () => {
      const { data, error } = await supabase.from("guild_members").select("user_id").eq("guild_id", guildId!);
      if (error) throw error;
      const userIds = (data || []).map(m => m.user_id);
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles_public").select("user_id, name, avatar_url").in("user_id", userIds);
      return profiles || [];
    },
    enabled: !!guildId,
  });

  const addSubtask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("quest_subtasks" as any).insert({
      quest_id: questId,
      title: newTitle.trim(),
      order_index: subtasks.length,
    } as any);
    if (error) { toast({ title: "Failed to add subtask", variant: "destructive" }); }
    else { setNewTitle(""); qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] }); }
    setAdding(false);
  };

  const updateStatus = async (subtaskId: string, status: string) => {
    await supabase.from("quest_subtasks" as any).update({ status } as any).eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] });
  };

  const assignUser = async (subtaskId: string, userId: string | null) => {
    await supabase.from("quest_subtasks" as any).update({ assignee_user_id: userId } as any).eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] });
  };

  const deleteSubtask = async (subtaskId: string) => {
    await supabase.from("quest_subtasks" as any).delete().eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] });
  };

  const doneCount = subtasks.filter((s: any) => s.status === "DONE").length;
  const totalCount = subtasks.length;

  const canEditSubtask = (subtask: any) =>
    canManage || subtask.assignee_user_id === currentUser.id;

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading subtasks…</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-sm flex items-center gap-2">
          Subtasks
          {totalCount > 0 && (
            <Badge variant="secondary" className="text-xs">{doneCount}/{totalCount} done</Badge>
          )}
        </h3>
      </div>

      <div className="space-y-1.5">
        {subtasks.map((subtask: any) => (
          <div key={subtask.id} className="flex items-center gap-2 rounded-md border border-border bg-card p-2 group">
            <Checkbox
              checked={subtask.status === "DONE"}
              disabled={!canEditSubtask(subtask)}
              onCheckedChange={(checked) => updateStatus(subtask.id, checked ? "DONE" : "TODO")}
            />
            <span className={`flex-1 text-sm ${subtask.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>
              {subtask.title}
            </span>
            {canEditSubtask(subtask) && (
              <Select value={subtask.status} onValueChange={(v) => updateStatus(subtask.id, v)}>
                <SelectTrigger className="w-[110px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {guildId && canManage && (
              <Select
                value={subtask.assignee_user_id || "unassigned"}
                onValueChange={(v) => assignUser(subtask.id, v === "unassigned" ? null : v)}
              >
                <SelectTrigger className="w-[120px] h-7 text-xs">
                  <SelectValue placeholder="Assign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                  {guildMembers.map((m: any) => (
                    <SelectItem key={m.user_id} value={m.user_id} className="text-xs">{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {subtask.assignee && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={subtask.assignee.avatar_url} />
                <AvatarFallback className="text-[10px]">{subtask.assignee.name?.[0]}</AvatarFallback>
              </Avatar>
            )}
            {canManage && (
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteSubtask(subtask.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <div className="flex gap-2">
          <Input
            placeholder="Add a subtask…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSubtask()}
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={addSubtask} disabled={!newTitle.trim() || adding} className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </div>
      )}

      {totalCount > 0 && doneCount === totalCount && (
        <p className="text-xs text-emerald-600 font-medium">✓ All subtasks completed! Consider marking this quest as completed.</p>
      )}
    </div>
  );
}
