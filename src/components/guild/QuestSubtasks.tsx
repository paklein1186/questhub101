import { useState, useRef, useCallback } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useXpCredits } from "@/hooks/useXpCredits";
import { XP_EVENT_TYPES, CREDIT_TX_TYPES } from "@/lib/xpCreditsConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GripVertical, Trash2, CalendarDays, Undo2, Coins, Scale, Sprout } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PriorityPicker, type Priority } from "@/components/PriorityPicker";
import { AIWriterButton } from "@/components/AIWriterButton";

interface QuestSubtasksProps {
  questId: string;
  questOwnerId: string;
  guildId?: string | null;
  canManage: boolean;
  questCoinBudget?: number;
  valuePieCalculated?: boolean;
  coinBudget?: number;
}

const STATUS_OPTIONS = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"] as const;
const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-muted/60 text-muted-foreground/70",
  TODO: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  DONE: "bg-emerald-500/10 text-emerald-600",
};

export function QuestSubtasks({ questId, questOwnerId, guildId, canManage, questCoinBudget = 0, valuePieCalculated = false, coinBudget = 0 }: QuestSubtasksProps) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const { grantXp, grantCredits } = useXpCredits();
  const { notifyContributionLogged } = useNotifications();
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showDescField, setShowDescField] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingDone, setPendingDone] = useState<Map<string, string>>(new Map()); // id -> prevStatus
  const pendingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const { data: subtasks = [], isLoading } = useQuery({
    queryKey: ["quest-subtasks", questId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_subtasks" as any)
        .select("*, priority, contribution_weight")
        .eq("quest_id", questId)
        .order("order_index");
      if (error) throw error;
      // Fetch assignee profiles from assignee_user_ids array
      const allUserIds = (data || []).flatMap((s: any) => s.assignee_user_ids || (s.assignee_user_id ? [s.assignee_user_id] : []));
      const uniqueUserIds = [...new Set(allUserIds)].filter(Boolean);
      let profileMap = new Map();
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles_public").select("user_id, name, avatar_url").in("user_id", uniqueUserIds);
        profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      }
      return (data || []).map((s: any) => {
        const ids: string[] = s.assignee_user_ids?.length > 0 ? s.assignee_user_ids : (s.assignee_user_id ? [s.assignee_user_id] : []);
        return { ...s, assignee_user_ids: ids, assignees: ids.map((id: string) => profileMap.get(id)).filter(Boolean) };
      });
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
      description: newDescription.trim() || null,
      order_index: subtasks.length,
      assignee_user_id: currentUser.id || null,
    } as any);
    if (error) { toast({ title: "Failed to add subtask", variant: "destructive" }); }
    else { setNewTitle(""); setNewDescription(""); setShowDescField(false); qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] }); }
    setAdding(false);
  };

  const updateStatus = async (subtaskId: string, status: string) => {
    await supabase.from("quest_subtasks" as any).update({ status } as any).eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] });
  };

  const commitSubtaskDone = useCallback(async (subtaskId: string) => {
    // Optimistically update the cache so the checkbox shows DONE immediately
    qc.setQueryData(["quest-subtasks", questId], (old: any[] | undefined) =>
      (old || []).map((s: any) => s.id === subtaskId ? { ...s, status: "DONE" } : s)
    );
    setPendingDone((prev) => { const next = new Map(prev); next.delete(subtaskId); return next; });
    pendingTimers.current.delete(subtaskId);

    // Persist to DB
    await updateStatus(subtaskId, "DONE");

    // Grant XP and credits to the assignee
    const subtask = subtasks.find((s: any) => s.id === subtaskId);
    const assigneeId = subtask?.assignee_user_id || currentUser.id;
    if (assigneeId) {
      grantXp(assigneeId, {
        type: XP_EVENT_TYPES.SUBTASK_COMPLETED,
        relatedEntityType: "quest_subtask",
        relatedEntityId: subtaskId,
      }, true);

      const creditReward = subtask?.credit_reward ?? 0;
      if (creditReward > 0) {
        grantCredits(assigneeId, {
          type: CREDIT_TX_TYPES.QUEST_REWARD_EARNED,
          amount: creditReward,
          source: `Subtask: ${subtask?.title}`,
          relatedEntityType: "quest_subtask",
          relatedEntityId: subtaskId,
        }, true);
      }
    }

    // Auto-insert contribution log with deduplication
    (async () => {
      try {
        const logTitle = "✓ " + (subtask?.title || "");
        const weightFactor = subtask?.contribution_weight > 0 ? Number(subtask.contribution_weight) : 1.0;
        // Default to 1 half-day (editable later via Log Contribution modal)
        const halfDays = 1;
        const baseUnits = halfDays;
        const weightedUnits = baseUnits * weightFactor;

        // Deduplication guard
        const { data: existing } = await supabase
          .from("contribution_logs" as any)
          .select("id")
          .eq("quest_id", questId)
          .eq("user_id", assigneeId)
          .eq("subtask_id", subtaskId)
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabase.from("contribution_logs" as any).insert({
            user_id: assigneeId,
            quest_id: questId,
            guild_id: guildId || null,
            subtask_id: subtaskId,
            contribution_type: "TIME",
            title: logTitle,
            task_type: "general",
            half_days: halfDays,
            base_units: baseUnits,
            weight_factor: weightFactor,
            weighted_units: weightedUnits,
            ip_licence: "CC-BY-SA",
          } as any);
          qc.invalidateQueries({ queryKey: ["contribution-logs", questId] });

          // Notify the contributor if it's not the current user
          if (assigneeId !== currentUser.id) {
            notifyContributionLogged({
              contributorUserId: assigneeId,
              questTitle: subtask?.title || "a subtask",
              amount: weightedUnits,
              unit: "WU",
              entityName: guildId || questId,
            });
          }
        }

        // CTG emission is handled automatically by the DB trigger
        // trg_emit_ctg_on_contribution (fires on contribution_logs INSERT).

        // Log to activity_log
        const ctgAmount = subtask?.ctg_reward ?? 1.0;
        await supabase.from("activity_log").insert({
          actor_user_id: assigneeId,
          action_type: "ctg_earned_subtask",
          target_type: "quest_subtask",
          target_id: subtaskId,
          target_name: subtask?.title || "Subtask",
          metadata: { subtask_id: subtaskId, quest_id: questId, ctg_amount: ctgAmount },
        });
      } catch (e) {
        console.error("Failed to log contribution from subtask", e);
      }
    })();

    // Invalidate contribution logs
    qc.invalidateQueries({ queryKey: ["contribution-logs"] });

    // Check if ALL subtasks are now DONE → notify quest owner for Value Pie
    const allOtherDone = subtasks.every((s: any) => s.id === subtaskId || s.status === "DONE");
    if (allOtherDone && subtasks.length > 0 && questCoinBudget > 0 && !valuePieCalculated) {
      toast({ title: "All tasks complete — the Value Pie is ready!" });
      // Notify quest owner
      if (questOwnerId && questOwnerId !== currentUser.id) {
        supabase.from("notifications" as any).insert({
          user_id: questOwnerId,
          type: "value_pie_ready",
          title: "✅ Toutes les sous-tâches sont complètes",
          body: "Le Value Pie peut être calculé et distribué.",
          action_url: `/quests/${questId}?tab=contributions`,
          entity_type: "quest",
          entity_id: questId,
        } as any).then(() => {});
      }
    }
  }, [questId, subtasks, currentUser.id, grantXp, grantCredits, qc, questOwnerId, questCoinBudget, valuePieCalculated, toast]);

  const undoSubtaskDone = useCallback((subtaskId: string) => {
    const timer = pendingTimers.current.get(subtaskId);
    if (timer) clearTimeout(timer);
    pendingTimers.current.delete(subtaskId);
    setPendingDone((prev) => { const next = new Map(prev); next.delete(subtaskId); return next; });
  }, []);

  const handleSubtaskStatusChange = (subtaskId: string, newStatus: string, currentStatus: string) => {
    // Cancel any pending done
    if (pendingDone.has(subtaskId)) {
      const timer = pendingTimers.current.get(subtaskId);
      if (timer) clearTimeout(timer);
      pendingTimers.current.delete(subtaskId);
      setPendingDone((prev) => { const next = new Map(prev); next.delete(subtaskId); return next; });
    }

    if (newStatus === "DONE") {
      setPendingDone((prev) => new Map(prev).set(subtaskId, currentStatus));
      const timer = setTimeout(() => commitSubtaskDone(subtaskId), 5000);
      pendingTimers.current.set(subtaskId, timer);
      return;
    }

    updateStatus(subtaskId, newStatus);
  };

  const assignUser = async (subtaskId: string, userId: string | null) => {
    await supabase.from("quest_subtasks" as any).update({ assignee_user_id: userId } as any).eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] });
  };

  const updateSubtaskPriority = async (subtaskId: string, priority: Priority) => {
    await supabase.from("quest_subtasks" as any).update({ priority } as any).eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] });
  };

  const updateSubtaskCredits = async (subtaskId: string, credits: number) => {
    await supabase.from("quest_subtasks" as any).update({ credit_reward: credits } as any).eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] });
  };

  const updateSubtaskWeight = async (subtaskId: string, weight: number) => {
    await supabase.from("quest_subtasks" as any).update({ contribution_weight: weight } as any).eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] });
  };

  const deleteSubtask = async (subtaskId: string) => {
    await supabase.from("quest_subtasks" as any).delete().eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] });
  };

  const updateSubtaskTitle = async (subtaskId: string, title: string) => {
    if (!title.trim()) return;
    await supabase.from("quest_subtasks" as any).update({ title: title.trim() } as any).eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] });
    setEditingId(null);
  };

  const startEditing = (subtask: any) => {
    setEditingId(subtask.id);
    setEditingTitle(subtask.title);
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
        {subtasks.map((subtask: any) => {
          const isPending = pendingDone.has(subtask.id);

          if (isPending) {
            return (
              <div key={subtask.id} className="flex items-center gap-2 rounded-md border border-border bg-emerald-500/5 p-2">
                <div className="flex-1">
                  <span className="text-sm text-muted-foreground line-through">{subtask.title}</span>
                  <span className="block text-[10px] text-amber-600">Contribution automatically logged</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => undoSubtaskDone(subtask.id)}
                >
                  <Undo2 className="h-3 w-3" /> Undo
                </Button>
              </div>
            );
          }

          return (
          <div key={subtask.id} className="flex items-center gap-2 rounded-md border border-border bg-card p-2 group">
            <PriorityPicker
              value={subtask.priority || "NONE"}
              onChange={(p) => updateSubtaskPriority(subtask.id, p)}
              disabled={!canEditSubtask(subtask)}
            />
            <Checkbox
              checked={subtask.status === "DONE"}
              disabled={!canEditSubtask(subtask)}
              onCheckedChange={(checked) => handleSubtaskStatusChange(subtask.id, checked ? "DONE" : "TODO", subtask.status)}
            />
            {editingId === subtask.id && canEditSubtask(subtask) ? (
              <Input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => updateSubtaskTitle(subtask.id, editingTitle)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateSubtaskTitle(subtask.id, editingTitle);
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
                className="flex-1 h-7 text-sm"
              />
            ) : (
              <span
                className={`flex-1 text-sm cursor-pointer ${subtask.status === "DONE" ? "line-through text-muted-foreground" : ""}`}
                onDoubleClick={() => canEditSubtask(subtask) && startEditing(subtask)}
              >
                {subtask.title}
              </span>
            )}
            {canEditSubtask(subtask) && (
              <Select value={subtask.status} onValueChange={(v) => handleSubtaskStatusChange(subtask.id, v, subtask.status)}>
                <SelectTrigger className="w-[110px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s} className="text-xs">{s.replace(/_/g, " ")}</SelectItem>
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
            {/* Credit reward indicator */}
            {canManage ? (
              <div className="flex items-center gap-0.5" title="🟩 Coins — fiat-backed reward for completing this subtask">
                <Coins className="h-3 w-3 text-amber-500" />
                <Input
                  type="number"
                  min="0"
                  value={subtask.credit_reward ?? 0}
                  onChange={(e) => updateSubtaskCredits(subtask.id, parseInt(e.target.value) || 0)}
                  className="w-14 h-6 text-[10px] text-center p-0"
                  title="🟩 Coins — fiat-backed reward for completing this subtask"
                />
              </div>
            ) : (subtask.credit_reward ?? 0) > 0 ? (
              <Badge variant="outline" className="text-[10px] gap-0.5 text-amber-600">
                <Coins className="h-2.5 w-2.5" />{subtask.credit_reward} Cr
              </Badge>
            ) : null}
            {/* $CTG reward input */}
            {canManage ? (
              <div className="flex items-center gap-0.5" title="🌱 $CTG — contribution token reward on completion">
                <Sprout className="h-3 w-3 text-emerald-600" />
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={subtask.ctg_reward ?? 1.0}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 1.0;
                    supabase.from("quest_subtasks" as any).update({ ctg_reward: v } as any).eq("id", subtask.id)
                      .then(() => qc.invalidateQueries({ queryKey: ["quest-subtasks", questId] }));
                  }}
                  className="w-14 h-6 text-[10px] text-center p-0"
                  title="🌱 $CTG — contribution token reward on completion"
                />
              </div>
            ) : (
              <span className="text-[10px] text-emerald-600 font-medium whitespace-nowrap">
                🌱 {subtask.ctg_reward ?? 1.0} $CTG
              </span>
            )}
            {/* $CTG weight input */}
            {canManage && (
              <div className="flex items-center gap-0.5" title="⚖️ Contribution weight — multiplier in the Value Pie (0.5–5.0)">
                <Scale className="h-3 w-3 text-violet-500" />
                <Input
                  type="number"
                  min={0.5}
                  max={5.0}
                  step={0.5}
                  value={subtask.contribution_weight ?? 1.0}
                  onChange={(e) => updateSubtaskWeight(subtask.id, parseFloat(e.target.value) || 1.0)}
                  className="w-14 h-6 text-[10px] text-center p-0"
                  title="⚖️ Contribution weight — multiplier in the Value Pie (0.5–5.0)"
                />
              </div>
            )}
            {/* Estimated WU badge for assignee */}
            {coinBudget > 0 && subtask.assignee_user_id === currentUser.id && (() => {
              const estWu = (subtask.credit_reward || 1) * (subtask.contribution_weight || 1.0);
              return (
                <span className="text-[10px] text-emerald-600 font-medium whitespace-nowrap">
                  {estWu.toFixed(1)} wu estimés
                </span>
              );
            })()}
            {canManage && (
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteSubtask(subtask.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            )}
          </div>
          );
        })}
      </div>

      {canManage && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Add a subtask…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !showDescField && addSubtask()}
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={addSubtask} disabled={!newTitle.trim() || adding} className="h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <AIWriterButton
              type="rewrite_title"
              context={{ entityType: "subtask" }}
              currentText={newTitle}
              onAccept={(text) => setNewTitle(text)}
              label="AI title"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowDescField(!showDescField)}
            >
              {showDescField ? "Hide description" : "+ Description"}
            </Button>
          </div>
          {showDescField && (
            <div>
              <Textarea
                placeholder="Subtask description (optional)…"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="text-sm"
                rows={2}
              />
              <AIWriterButton
                type="rewrite_description"
                context={{ entityType: "subtask", title: newTitle }}
                currentText={newDescription}
                onAccept={(text) => setNewDescription(text)}
                label="AI description"
                className="mt-1"
              />
            </div>
          )}
        </div>
      )}

      {totalCount > 0 && doneCount === totalCount && (
        <p className="text-xs text-emerald-600 font-medium">✓ All subtasks completed! Consider marking this quest as completed.</p>
      )}
    </div>
  );
}
