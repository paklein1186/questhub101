import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, ListTodo, Compass, ChevronRight, ArrowUpRight,
  Trash2, Loader2, Rocket, ListChecks, Users, Building2, User,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  DONE: "bg-emerald-500/10 text-emerald-600",
};

type UnifiedTask = {
  id: string;
  title: string;
  status: string;
  source: "personal" | "quest" | "subtask";
  sourceLabel?: string;
  sourceId?: string;
  questId?: string;
  convertedToQuestId?: string | null;
  convertedToSubtaskId?: string | null;
};

type UnitOption = {
  id: string;
  name: string;
  type: "USER" | "GUILD" | "COMPANY";
  logo_url?: string | null;
};

export function MyTaskBoard({ userId }: { userId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "personal" | "quest" | "subtask">("all");

  // Unit picker state
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [pendingConvertTask, setPendingConvertTask] = useState<UnifiedTask | null>(null);
  const [converting, setConverting] = useState(false);

  // Fetch personal tasks
  const { data: personalTasks = [], isLoading: loadingPersonal } = useQuery({
    queryKey: ["personal-tasks", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_tasks" as any)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!userId,
  });

  // Fetch quests where user is owner (active/open)
  const { data: myQuests = [], isLoading: loadingQuests } = useQuery({
    queryKey: ["my-active-quests", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("id, title, status")
        .eq("created_by_user_id", userId)
        .eq("is_deleted", false)
        .in("status", ["DRAFT", "OPEN_FOR_PROPOSALS", "ACTIVE"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch subtasks assigned to user
  const { data: mySubtasks = [], isLoading: loadingSubtasks } = useQuery({
    queryKey: ["my-subtasks", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_subtasks" as any)
        .select("id, title, status, quest_id")
        .eq("assignee_user_id", userId)
        .in("status", ["TODO", "IN_PROGRESS"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const questIds = [...new Set((data || []).map((s: any) => s.quest_id))];
      let questMap = new Map<string, string>();
      if (questIds.length > 0) {
        const { data: quests } = await supabase
          .from("quests")
          .select("id, title")
          .in("id", questIds);
        questMap = new Map((quests || []).map((q: any) => [q.id, q.title]));
      }
      return (data || []).map((s: any) => ({ ...s, questTitle: questMap.get(s.quest_id) || "Quest" }));
    },
    enabled: !!userId,
  });

  // Also fetch quests where user is a participant
  const { data: participantQuests = [] } = useQuery({
    queryKey: ["my-participant-quests", userId],
    queryFn: async () => {
      const { data: parts, error } = await supabase
        .from("quest_participants")
        .select("quest_id")
        .eq("user_id", userId)
        .eq("status", "APPROVED");
      if (error) throw error;
      if (!parts?.length) return [];
      const questIds = parts.map((p: any) => p.quest_id);
      const { data: quests } = await supabase
        .from("quests")
        .select("id, title, status")
        .in("id", questIds)
        .eq("is_deleted", false)
        .in("status", ["ACTIVE", "OPEN_FOR_PROPOSALS"]);
      return quests || [];
    },
    enabled: !!userId,
  });

  // Fetch user's units (guilds + companies where they're admin/member)
  const { data: userUnits = [] } = useQuery<UnitOption[]>({
    queryKey: ["my-units-for-quest", userId],
    queryFn: async () => {
      const units: UnitOption[] = [];

      // Guilds where user is admin or member
      const { data: guildMemberships } = await supabase
        .from("guild_members")
        .select("guild_id, role")
        .eq("user_id", userId);
      if (guildMemberships && guildMemberships.length > 0) {
        const guildIds = guildMemberships.map((gm) => gm.guild_id);
        const { data: guilds } = await supabase
          .from("guilds")
          .select("id, name, logo_url")
          .in("id", guildIds)
          .eq("is_deleted", false);
        for (const g of guilds || []) {
          units.push({ id: g.id, name: g.name, type: "GUILD", logo_url: g.logo_url });
        }
      }

      // Companies where user is member
      const { data: companyMemberships } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", userId);
      if (companyMemberships && companyMemberships.length > 0) {
        const companyIds = companyMemberships.map((cm) => cm.company_id);
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name, logo_url")
          .in("id", companyIds)
          .eq("is_deleted", false);
        for (const c of companies || []) {
          units.push({ id: c.id, name: c.name, type: "COMPANY", logo_url: c.logo_url });
        }
      }

      return units;
    },
    enabled: !!userId,
  });

  // Build unified list
  const unified: UnifiedTask[] = [];

  for (const t of personalTasks) {
    unified.push({
      id: t.id,
      title: t.title,
      status: t.status,
      source: "personal",
      convertedToQuestId: t.converted_to_quest_id,
      convertedToSubtaskId: t.converted_to_subtask_id,
    });
  }

  for (const q of myQuests) {
    unified.push({
      id: q.id,
      title: q.title,
      status: q.status === "ACTIVE" ? "IN_PROGRESS" : q.status === "DRAFT" ? "TODO" : "TODO",
      source: "quest",
      sourceLabel: "My Quest",
      sourceId: q.id,
    });
  }

  for (const q of participantQuests) {
    if (!myQuests.some((mq: any) => mq.id === q.id)) {
      unified.push({
        id: q.id,
        title: q.title,
        status: q.status === "ACTIVE" ? "IN_PROGRESS" : "TODO",
        source: "quest",
        sourceLabel: "Collaborator",
        sourceId: q.id,
      });
    }
  }

  for (const s of mySubtasks) {
    unified.push({
      id: s.id,
      title: s.title,
      status: s.status,
      source: "subtask",
      sourceLabel: s.questTitle,
      questId: s.quest_id,
    });
  }

  const filtered = filter === "all" ? unified : unified.filter((t) => t.source === filter);
  const isLoading = loadingPersonal || loadingQuests || loadingSubtasks;

  // ── Actions ──
  const addTask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("personal_tasks" as any).insert({
      user_id: userId,
      title: newTitle.trim(),
      status: "TODO",
    } as any);
    if (error) { toast({ title: "Failed to add task", variant: "destructive" }); }
    else { setNewTitle(""); qc.invalidateQueries({ queryKey: ["personal-tasks", userId] }); }
    setAdding(false);
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("personal_tasks" as any).update({ status } as any).eq("id", taskId);
    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("personal_tasks" as any).delete().eq("id", taskId);
    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
  };

  const openUnitPicker = (task: UnifiedTask) => {
    setPendingConvertTask(task);
    setUnitPickerOpen(true);
  };

  const convertToQuest = async (unit: UnitOption | null) => {
    if (!pendingConvertTask) return;
    setConverting(true);

    const insertPayload: any = {
      title: pendingConvertTask.title,
      created_by_user_id: userId,
      is_draft: false,
      status: "OPEN_FOR_PROPOSALS",
    };

    if (unit && unit.type === "GUILD") {
      insertPayload.owner_type = "GUILD";
      insertPayload.owner_id = unit.id;
      insertPayload.guild_id = unit.id;
    } else if (unit && unit.type === "COMPANY") {
      insertPayload.owner_type = "COMPANY";
      insertPayload.owner_id = unit.id;
      insertPayload.company_id = unit.id;
    } else {
      insertPayload.owner_type = "USER";
      insertPayload.owner_id = userId;
    }

    const { data, error } = await supabase
      .from("quests")
      .insert(insertPayload)
      .select("id")
      .single();
    if (error) {
      toast({ title: "Failed to create quest", variant: "destructive" });
      setConverting(false);
      return;
    }

    // Add creator as OWNER participant with ACCEPTED status
    await supabase.from("quest_participants").insert({
      quest_id: (data as any).id,
      user_id: userId,
      role: "OWNER",
      status: "ACCEPTED",
    });

    await supabase.from("personal_tasks" as any).update({
      converted_to_quest_id: (data as any).id,
    } as any).eq("id", pendingConvertTask.id);

    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
    qc.invalidateQueries({ queryKey: ["my-active-quests", userId] });
    setConverting(false);
    setUnitPickerOpen(false);
    setPendingConvertTask(null);
    toast({ title: "Task converted to quest!" });
    navigate(`/quests/${(data as any).id}`);
  };

  const convertToSubtask = async (task: UnifiedTask, questId: string) => {
    const { data, error } = await supabase.from("quest_subtasks" as any).insert({
      quest_id: questId,
      title: task.title,
      assignee_user_id: userId,
      status: "TODO",
      order_index: 0,
    } as any).select("id").single();
    if (error) { toast({ title: "Failed to create subtask", variant: "destructive" }); return; }
    await supabase.from("personal_tasks" as any).update({
      converted_to_subtask_id: (data as any).id,
    } as any).eq("id", task.id);
    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
    qc.invalidateQueries({ queryKey: ["my-subtasks", userId] });
    toast({ title: "Task attached as subtask!" });
  };

  // All quests (owned + participating) for the subtask picker
  const allQuestsForPicker = [
    ...myQuests.map((q: any) => ({ id: q.id, title: q.title })),
    ...participantQuests.filter((q: any) => !myQuests.some((mq: any) => mq.id === q.id)).map((q: any) => ({ id: q.id, title: q.title })),
  ];

  const todoCount = unified.filter((t) => t.status === "TODO").length;
  const inProgressCount = unified.filter((t) => t.status === "IN_PROGRESS").length;

  const unitIcon = (type: string) => {
    if (type === "GUILD") return <Users className="h-4 w-4 text-primary" />;
    if (type === "COMPANY") return <Building2 className="h-4 w-4 text-primary" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          My Tasks
          {(todoCount > 0 || inProgressCount > 0) && (
            <Badge variant="secondary" className="text-xs ml-1">
              {todoCount + inProgressCount} active
            </Badge>
          )}
        </h2>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="quest">Quests</SelectItem>
            <SelectItem value="subtask">Subtasks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick add */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a task…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          className="h-9 text-sm"
        />
        <Button size="sm" onClick={addTask} disabled={!newTitle.trim() || adding} className="h-9 gap-1">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No active tasks. Add one above or create a quest!
        </p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-8 px-3 py-2"></th>
                <th className="text-left px-3 py-2 font-medium">Task</th>
                <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Source</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => (
                <tr key={`${task.source}-${task.id}`} className="border-t border-border group hover:bg-accent/30 transition-colors">
                  <td className="px-3 py-2.5">
                    {task.source === "personal" && !task.convertedToQuestId && !task.convertedToSubtaskId && (
                      <Checkbox
                        checked={task.status === "DONE"}
                        onCheckedChange={(checked) => updateTaskStatus(task.id, checked ? "DONE" : "TODO")}
                      />
                    )}
                    {task.source === "personal" && (task.convertedToQuestId || task.convertedToSubtaskId) && (
                      <Checkbox
                        checked={task.status === "DONE"}
                        onCheckedChange={(checked) => updateTaskStatus(task.id, checked ? "DONE" : "IN_PROGRESS")}
                      />
                    )}
                    {task.source === "subtask" && (
                      <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {task.source === "quest" && (
                      <Compass className="h-3.5 w-3.5 text-primary" />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn(
                      "text-sm",
                      task.status === "DONE" && "line-through text-muted-foreground",
                    )}>
                      {task.title}
                    </span>
                    {task.convertedToQuestId && (
                      <Badge variant="outline" className="ml-2 text-[10px]">→ Quest</Badge>
                    )}
                    {task.convertedToSubtaskId && (
                      <Badge variant="outline" className="ml-2 text-[10px]">→ Subtask</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {task.source === "personal" ? "Personal" : task.sourceLabel || task.source}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    {task.source === "personal" && (task.convertedToQuestId || task.convertedToSubtaskId) ? (
                      <Select
                        value={task.status}
                        onValueChange={(v) => updateTaskStatus(task.id, v)}
                      >
                        <SelectTrigger className="h-6 w-[110px] text-[10px] px-2 py-0">
                          <Badge className={cn("text-[10px]", STATUS_COLORS[task.status] || STATUS_COLORS.TODO)}>
                            {task.status?.replace("_", " ")}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODO">TODO</SelectItem>
                          <SelectItem value="IN_PROGRESS">IN PROGRESS</SelectItem>
                          <SelectItem value="DONE">DONE</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={cn("text-[10px]", STATUS_COLORS[task.status] || STATUS_COLORS.TODO)}>
                        {task.status?.replace("_", " ")}
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {task.source === "personal" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openUnitPicker(task)}>
                            <Rocket className="h-3.5 w-3.5 mr-2" /> Convert to Quest
                          </DropdownMenuItem>
                          {allQuestsForPicker.length > 0 && (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <ListChecks className="h-3.5 w-3.5 mr-2" /> Attach to Quest…
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {allQuestsForPicker.map((q) => (
                                  <DropdownMenuItem key={q.id} onClick={() => convertToSubtask(task, q.id)}>
                                    {q.title}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteTask(task.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {(task.source === "quest" || task.source === "subtask") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={() => navigate(task.source === "quest" ? `/quests/${task.sourceId || task.id}` : `/quests/${task.questId}`)}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Unit picker dialog */}
      <Dialog open={unitPickerOpen} onOpenChange={(open) => { if (!converting) { setUnitPickerOpen(open); if (!open) setPendingConvertTask(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Convert to Quest
            </DialogTitle>
            <DialogDescription>
              Choose which entity to attach this quest to, or create it as a personal quest.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {/* Personal option */}
            <button
              onClick={() => convertToQuest(null)}
              disabled={converting}
              className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50 transition-colors disabled:opacity-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Personal Quest</p>
                <p className="text-xs text-muted-foreground">Not attached to any entity</p>
              </div>
            </button>

            {userUnits.length > 0 && (
              <div className="pt-1">
                <p className="text-xs font-medium text-muted-foreground px-1 pb-1.5">Your entities</p>
                {userUnits.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => convertToQuest(unit)}
                    disabled={converting}
                    className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent/50 transition-colors disabled:opacity-50 mb-1.5"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                      {unit.logo_url ? (
                        <img src={unit.logo_url} alt="" className="h-9 w-9 object-cover rounded-full" />
                      ) : (
                        unitIcon(unit.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{unit.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {unit.type === "GUILD" ? "Guild" : "Organisation"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {converting && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Creating quest…</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
