import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, ListTodo, Compass, ChevronRight, ArrowUpRight,
  Trash2, Loader2, Rocket, ListChecks, Users, Building2, User, Undo2,
  ChevronLeft, ArrowDownUp, Hash, MapPin, Search, X,
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
import { PriorityPicker, PRIORITY_ORDER, type Priority } from "@/components/PriorityPicker";
import { GuildColorLabel } from "@/components/GuildColorLabel";

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-muted/60 text-muted-foreground/70",
  TODO: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  DONE: "bg-emerald-500/10 text-emerald-600",
};

type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";

type PersonalTask = {
  id: string;
  user_id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
  priority: Priority;
  converted_to_quest_id: string | null;
  converted_to_subtask_id: string | null;
};

type Quest = {
  id: string;
  title: string;
  status: "DRAFT" | "OPEN_FOR_PROPOSALS" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  created_by_user_id: string;
  is_deleted: boolean;
};

type QuestSubtask = {
  id: string;
  quest_id: string;
  title: string;
  status: TaskStatus;
  priority: Priority;
  assignee_user_id: string;
  order_index: number;
};

type UnifiedTask = {
  id: string;
  title: string;
  status: string;
  source: "personal" | "quest" | "subtask";
  sourceLabel?: string;
  sourceId?: string;
  questId?: string;
  priority?: Priority;
  createdAt?: string;
  convertedToQuestId?: string | null;
  convertedToSubtaskId?: string | null;
  guildId?: string | null;
  guildName?: string | null;
  guildLogo?: string | null;
  questTitle?: string | null;
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
  const [sortBy, setSortBy] = useState<"status" | "priority" | "recent">("status");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingSource, setEditingSource] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Pending done with undo
  const [pendingDone, setPendingDone] = useState<Map<string, { task: UnifiedTask; prevStatus: string }>>(new Map());
  const pendingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Unit picker state
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [pendingConvertTask, setPendingConvertTask] = useState<UnifiedTask | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertStep, setConvertStep] = useState<"unit" | "tags">("unit");
  const [convertSelectedUnit, setConvertSelectedUnit] = useState<UnitOption | null>(null);
  const [convertTopics, setConvertTopics] = useState<string[]>([]);
  const [convertTerritories, setConvertTerritories] = useState<string[]>([]);

  const { data: allTopics } = useTopics();
  const { data: allTerritories } = useTerritories();

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
        .select("id, title, status, guild_id, priority, guilds(name, logo_url)")
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

  // Fetch subtasks: assigned to user OR from quests user owns/participates in
  const { data: mySubtasks = [], isLoading: loadingSubtasks } = useQuery({
    queryKey: ["my-subtasks", userId],
    queryFn: async () => {
      // 1. Subtasks explicitly assigned to user
      const { data: assigned, error: e1 } = await supabase
        .from("quest_subtasks" as any)
        .select("id, title, status, quest_id, assignee_user_id")
        .eq("assignee_user_id", userId)
        .in("status", ["TODO", "IN_PROGRESS"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (e1) throw e1;

      // 2. Get quest IDs user owns
      const { data: ownedQuests } = await supabase
        .from("quests")
        .select("id")
        .eq("created_by_user_id", userId)
        .eq("is_deleted", false)
        .in("status", ["DRAFT", "OPEN_FOR_PROPOSALS", "ACTIVE"]);
      const ownedQuestIds = (ownedQuests || []).map((q: any) => q.id);

      // 3. Get quest IDs user participates in
      const { data: parts } = await supabase
        .from("quest_participants")
        .select("quest_id")
        .eq("user_id", userId)
        .eq("status", "APPROVED");
      const partQuestIds = (parts || []).map((p: any) => p.quest_id);

      // 4. Combine and fetch unassigned/user subtasks from those quests
      const allQuestIds = [...new Set([...ownedQuestIds, ...partQuestIds])];
      let fromQuests: any[] = [];
      if (allQuestIds.length > 0) {
        const { data: qSubtasks } = await supabase
          .from("quest_subtasks" as any)
          .select("id, title, status, quest_id, assignee_user_id")
          .in("quest_id", allQuestIds)
          .in("status", ["TODO", "IN_PROGRESS"])
          .order("created_at", { ascending: false })
          .limit(50);
        fromQuests = qSubtasks || [];
      }

      // 5. Merge & deduplicate
      const seen = new Set<string>();
      const merged: any[] = [];
      for (const s of [...(assigned || []), ...fromQuests]) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          merged.push(s);
        }
      }

      // 6. Resolve quest titles
      const questIds = [...new Set(merged.map((s: any) => s.quest_id))];
      let questMap = new Map<string, { title: string; guildId: string | null; guildName: string | null; guildLogo: string | null }>();
      if (questIds.length > 0) {
        const { data: quests } = await supabase
          .from("quests")
          .select("id, title, guild_id, guilds(name, logo_url)")
          .in("id", questIds);
        questMap = new Map((quests || []).map((q: any) => [q.id, {
          title: q.title,
          guildId: q.guild_id || null,
          guildName: q.guilds?.name || null,
          guildLogo: q.guilds?.logo_url || null,
        }]));
      }
      return merged.map((s: any) => ({
        ...s,
        questTitle: questMap.get(s.quest_id)?.title || "Quest",
        questGuildId: questMap.get(s.quest_id)?.guildId || null,
        questGuildName: questMap.get(s.quest_id)?.guildName || null,
        questGuildLogo: questMap.get(s.quest_id)?.guildLogo || null,
      }));
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
        .select("id, title, status, guild_id, priority, guilds(name, logo_url)")
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
    if (t.converted_to_quest_id || t.converted_to_subtask_id) continue;
    unified.push({
      id: t.id,
      title: t.title,
      status: t.status,
      source: "personal",
      priority: t.priority || "NONE",
      createdAt: t.created_at,
      convertedToQuestId: t.converted_to_quest_id,
      convertedToSubtaskId: t.converted_to_subtask_id,
    });
  }

  // Build a set of quest IDs that have active subtasks (TODO or IN_PROGRESS)
  const questIdsWithActiveSubtasks = new Set(
    mySubtasks.filter((s: any) => s.status === "TODO" || s.status === "IN_PROGRESS").map((s: any) => s.quest_id)
  );

  for (const q of myQuests) {
    if (questIdsWithActiveSubtasks.has(q.id)) continue;
    unified.push({
      id: q.id,
      title: q.title,
      status: q.status === "ACTIVE" ? "IN_PROGRESS" : q.status === "COMPLETED" ? "DONE" : "TODO",
      source: "quest",
      sourceLabel: "My Quest",
      sourceId: q.id,
      priority: (q as any).priority || "NONE",
      guildId: (q as any).guild_id || null,
      guildName: (q as any).guilds?.name || null,
      guildLogo: (q as any).guilds?.logo_url || null,
    });
  }

  for (const q of participantQuests) {
    if (myQuests.some((mq: any) => mq.id === q.id)) continue;
    if (questIdsWithActiveSubtasks.has(q.id)) continue;
    unified.push({
      id: q.id,
      title: q.title,
      status: q.status === "ACTIVE" ? "IN_PROGRESS" : "TODO",
      source: "quest",
      sourceLabel: "Collaborator",
      sourceId: q.id,
      priority: (q as any).priority || "NONE",
      guildId: (q as any).guild_id || null,
      guildName: (q as any).guilds?.name || null,
      guildLogo: (q as any).guilds?.logo_url || null,
    });
  }

  for (const s of mySubtasks) {
    unified.push({
      id: s.id,
      title: s.title,
      status: s.status,
      source: "subtask",
      sourceLabel: s.questTitle,
      questId: s.quest_id,
      priority: s.priority || "NONE",
      createdAt: s.created_at,
      questTitle: s.questTitle,
      guildId: s.questGuildId || null,
      guildName: s.questGuildName || null,
      guildLogo: s.questGuildLogo || null,
    });
  }

  let filtered = filter === "all" ? [...unified] : unified.filter((t) => t.source === filter);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));
  }

  // Sort
  const STATUS_ORDER: Record<string, number> = { IN_PROGRESS: 0, TODO: 1, BACKLOG: 2, DONE: 3 };
  if (sortBy === "status") {
    filtered.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  } else if (sortBy === "priority") {
    const PRIO_ORDER: Record<string, number> = { NONE: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    filtered.sort((a, b) => (PRIO_ORDER[a.priority || "NONE"] ?? 9) - (PRIO_ORDER[b.priority || "NONE"] ?? 9));
  }
  // "recent" keeps the default created_at desc order from queries

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeP = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safeP * PAGE_SIZE, (safeP + 1) * PAGE_SIZE);
  const isLoading = loadingPersonal || loadingQuests || loadingSubtasks;

  // ── Actions ──
  const addTask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("personal_tasks" as any).insert({
      user_id: userId,
      title: newTitle.trim(),
      status: "BACKLOG",
    } as any);
    if (error) { toast({ title: "Failed to add task", variant: "destructive" }); }
    else { setNewTitle(""); qc.invalidateQueries({ queryKey: ["personal-tasks", userId] }); }
    setAdding(false);
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("personal_tasks" as any).update({ status } as any).eq("id", taskId);
    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
  };

  const updateQuestStatus = async (questId: string, uiStatus: string) => {
    // Map unified UI statuses to quest-specific statuses
    const questStatus = uiStatus === "DONE" ? "COMPLETED" : uiStatus === "IN_PROGRESS" ? "ACTIVE" : "OPEN_FOR_PROPOSALS";
    await supabase.from("quests").update({ status: questStatus }).eq("id", questId);
    qc.invalidateQueries({ queryKey: ["my-active-quests", userId] });
    qc.invalidateQueries({ queryKey: ["my-participant-quests", userId] });
  };

  const updateSubtaskStatus = async (subtaskId: string, status: string) => {
    await supabase.from("quest_subtasks" as any).update({ status } as any).eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["my-subtasks", userId] });
  };

  const commitDone = useCallback((task: UnifiedTask) => {
    const key = `${task.source}-${task.id}`;
    if (task.source === "personal") {
      updateTaskStatus(task.id, "DONE");
      if (task.convertedToQuestId) {
        supabase.from("quests").update({ status: "COMPLETED" }).eq("id", task.convertedToQuestId).then(() => {
          qc.invalidateQueries({ queryKey: ["my-active-quests", userId] });
        });
      }
      if (task.convertedToSubtaskId) {
        supabase.from("quest_subtasks" as any).update({ status: "DONE" } as any).eq("id", task.convertedToSubtaskId).then(() => {
          qc.invalidateQueries({ queryKey: ["my-subtasks", userId] });
        });
      }
    } else if (task.source === "quest") {
      updateQuestStatus(task.id, "DONE");
    } else if (task.source === "subtask") {
      updateSubtaskStatus(task.id, "DONE");
    }
    setPendingDone((prev) => { const next = new Map(prev); next.delete(key); return next; });
    pendingTimers.current.delete(key);
  }, [userId]);

  const undoDone = useCallback((task: UnifiedTask) => {
    const key = `${task.source}-${task.id}`;
    const timer = pendingTimers.current.get(key);
    if (timer) clearTimeout(timer);
    pendingTimers.current.delete(key);
    setPendingDone((prev) => { const next = new Map(prev); next.delete(key); return next; });
  }, []);

  const handleStatusChange = (task: UnifiedTask, newStatus: string) => {
    const key = `${task.source}-${task.id}`;

    // If undoing from pending done
    const wasPending = pendingDone.has(key);
    if (wasPending) {
      const timer = pendingTimers.current.get(key);
      if (timer) clearTimeout(timer);
      pendingTimers.current.delete(key);
      setPendingDone((prev) => { const next = new Map(prev); next.delete(key); return next; });
    }

    if (newStatus === "DONE") {
      // Start 5s pending period
      const prevStatus = wasPending ? (pendingDone.get(key)?.prevStatus || task.status) : task.status;
      setPendingDone((prev) => new Map(prev).set(key, { task, prevStatus }));
      const timer = setTimeout(() => commitDone(task), 5000);
      pendingTimers.current.set(key, timer);
      return;
    }

    // Non-DONE status changes go through immediately
    if (task.source === "personal") {
      updateTaskStatus(task.id, newStatus);
      if (task.convertedToQuestId) {
        const questStatus = newStatus === "IN_PROGRESS" ? "ACTIVE" : "OPEN_FOR_PROPOSALS";
        supabase.from("quests").update({ status: questStatus }).eq("id", task.convertedToQuestId).then(() => {
          qc.invalidateQueries({ queryKey: ["my-active-quests", userId] });
        });
      }
      if (task.convertedToSubtaskId) {
        supabase.from("quest_subtasks" as any).update({ status: newStatus } as any).eq("id", task.convertedToSubtaskId).then(() => {
          qc.invalidateQueries({ queryKey: ["my-subtasks", userId] });
        });
      }
    } else if (task.source === "quest") {
      updateQuestStatus(task.id, newStatus);
    } else if (task.source === "subtask") {
      updateSubtaskStatus(task.id, newStatus);
    }
  };

  const handleCheckboxToggle = (task: UnifiedTask, checked: boolean) => {
    const newStatus = checked ? "DONE" : "TODO";
    handleStatusChange(task, newStatus);
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("personal_tasks" as any).delete().eq("id", taskId);
    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
  };

  const updatePriority = async (task: UnifiedTask, priority: Priority) => {
    if (task.source === "personal") {
      await supabase.from("personal_tasks" as any).update({ priority } as any).eq("id", task.id);
      qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
    } else if (task.source === "quest") {
      await supabase.from("quests").update({ priority } as any).eq("id", task.id);
      qc.invalidateQueries({ queryKey: ["my-active-quests", userId] });
      qc.invalidateQueries({ queryKey: ["my-participant-quests", userId] });
    } else if (task.source === "subtask") {
      await supabase.from("quest_subtasks" as any).update({ priority } as any).eq("id", task.id);
      qc.invalidateQueries({ queryKey: ["my-subtasks", userId] });
    }
  };

  const startEditing = (task: UnifiedTask) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
    setEditingSource(task.source);
  };

  const saveTitle = async () => {
    if (!editingId || !editingTitle.trim()) { setEditingId(null); return; }
    const trimmed = editingTitle.trim();
    if (editingSource === "personal") {
      await supabase.from("personal_tasks" as any).update({ title: trimmed } as any).eq("id", editingId);
      qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
    } else if (editingSource === "quest") {
      await supabase.from("quests").update({ title: trimmed }).eq("id", editingId);
      qc.invalidateQueries({ queryKey: ["my-active-quests", userId] });
      qc.invalidateQueries({ queryKey: ["my-participant-quests", userId] });
    } else if (editingSource === "subtask") {
      await supabase.from("quest_subtasks" as any).update({ title: trimmed } as any).eq("id", editingId);
      qc.invalidateQueries({ queryKey: ["my-subtasks", userId] });
    }
    setEditingId(null);
  };

  const openUnitPicker = (task: UnifiedTask) => {
    setPendingConvertTask(task);
    setConvertStep("unit");
    setConvertSelectedUnit(null);
    setConvertTopics([]);
    setConvertTerritories([]);
    setUnitPickerOpen(true);
  };

  const selectUnitForConvert = async (unit: UnitOption | null) => {
    setConvertSelectedUnit(unit);
    // Pre-populate topics/territories from the unit or user
    try {
      let topicIds: string[] = [];
      let territoryIds: string[] = [];
      if (unit && unit.type === "GUILD") {
        const [t, te] = await Promise.all([
          supabase.from("guild_topics").select("topic_id").eq("guild_id", unit.id),
          supabase.from("guild_territories").select("territory_id").eq("guild_id", unit.id),
        ]);
        topicIds = (t.data ?? []).map((r: any) => r.topic_id);
        territoryIds = (te.data ?? []).map((r: any) => r.territory_id);
      } else if (unit && unit.type === "COMPANY") {
        const [t, te] = await Promise.all([
          supabase.from("company_topics").select("topic_id").eq("company_id", unit.id),
          supabase.from("company_territories").select("territory_id").eq("company_id", unit.id),
        ]);
        topicIds = (t.data ?? []).map((r: any) => r.topic_id);
        territoryIds = (te.data ?? []).map((r: any) => r.territory_id);
      } else {
        const [t, te] = await Promise.all([
          supabase.from("user_topics").select("topic_id").eq("user_id", userId),
          supabase.from("user_territories").select("territory_id").eq("user_id", userId),
        ]);
        topicIds = (t.data ?? []).map((r: any) => r.topic_id);
        territoryIds = (te.data ?? []).map((r: any) => r.territory_id);
      }
      setConvertTopics(topicIds);
      setConvertTerritories(territoryIds);
    } catch { /* non-blocking */ }
    setConvertStep("tags");
  };

  const finalizeConvertToQuest = async () => {
    if (!pendingConvertTask) return;
    const unit = convertSelectedUnit;
    setConverting(true);

    const existingQuestId = pendingConvertTask.convertedToQuestId;

    if (existingQuestId) {
      // Re-attach: update the existing quest's guild/owner
      const updatePayload: any = {};
      if (unit && unit.type === "GUILD") {
        updatePayload.owner_type = "GUILD";
        updatePayload.owner_id = unit.id;
        updatePayload.guild_id = unit.id;
        updatePayload.company_id = null;
      } else if (unit && unit.type === "COMPANY") {
        updatePayload.owner_type = "COMPANY";
        updatePayload.owner_id = unit.id;
        updatePayload.company_id = unit.id;
        updatePayload.guild_id = null;
      } else {
        updatePayload.owner_type = "USER";
        updatePayload.owner_id = userId;
        updatePayload.guild_id = null;
        updatePayload.company_id = null;
      }

      const { error } = await supabase.from("quests").update(updatePayload).eq("id", existingQuestId);
      if (error) {
        toast({ title: "Failed to reattach quest", variant: "destructive" });
        setConverting(false);
        return;
      }

      // Replace topics & territories
      await supabase.from("quest_topics").delete().eq("quest_id", existingQuestId);
      await supabase.from("quest_territories" as any).delete().eq("quest_id", existingQuestId);
      if (convertTopics.length > 0) {
        await supabase.from("quest_topics").insert(
          convertTopics.map((topic_id) => ({ quest_id: existingQuestId, topic_id }))
        );
      }
      if (convertTerritories.length > 0) {
        await supabase.from("quest_territories" as any).insert(
          convertTerritories.map((territory_id) => ({ quest_id: existingQuestId, territory_id }))
        );
      }

      qc.invalidateQueries({ queryKey: ["my-active-quests", userId] });
      setConverting(false);
      setUnitPickerOpen(false);
      setPendingConvertTask(null);
      toast({ title: "Quest reattached!" });
      navigate(`/quests/${existingQuestId}`);
      return;
    }

    // New conversion: create quest
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

    const questId = (data as any).id;
    await supabase.from("quest_participants").insert({
      quest_id: questId,
      user_id: userId,
      role: "OWNER",
      status: "ACCEPTED",
    });

    if (convertTopics.length > 0) {
      await supabase.from("quest_topics").insert(
        convertTopics.map((topic_id) => ({ quest_id: questId, topic_id }))
      );
    }
    if (convertTerritories.length > 0) {
      await supabase.from("quest_territories" as any).insert(
        convertTerritories.map((territory_id) => ({ quest_id: questId, territory_id }))
      );
    }

    await supabase.from("personal_tasks" as any).update({
      converted_to_quest_id: questId,
    } as any).eq("id", pendingConvertTask.id);

    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
    qc.invalidateQueries({ queryKey: ["my-active-quests", userId] });
    setConverting(false);
    setUnitPickerOpen(false);
    setPendingConvertTask(null);
    toast({ title: "Task converted to quest!" });
    navigate(`/quests/${questId}`);
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
    ...myQuests.map((q: any) => ({ id: q.id, title: q.title, guildName: q.guilds?.name || null, guildLogo: q.guilds?.logo_url || null })),
    ...participantQuests.filter((q: any) => !myQuests.some((mq: any) => mq.id === q.id)).map((q: any) => ({ id: q.id, title: q.title, guildName: q.guilds?.name || null, guildLogo: q.guilds?.logo_url || null })),
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
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(""); }}
          >
            {searchOpen ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
          </Button>
          <Select value={filter} onValueChange={(v) => { setFilter(v as any); setPage(0); }}>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setSortBy(sortBy === "status" ? "priority" : sortBy === "priority" ? "recent" : "status")}
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            {sortBy === "status" ? "Status" : sortBy === "priority" ? "Priority" : "Recent"}
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm pl-8 pr-8"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      )}

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
                <th className="w-8 px-3 py-2"></th>
                <th className="text-left px-3 py-2 font-medium">Task</th>
                <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Source</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="w-10 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((task) => {
                const key = `${task.source}-${task.id}`;
                const isPendingDone = pendingDone.has(key);
                const displayStatus = isPendingDone ? "DONE" : task.status;

                if (isPendingDone) {
                  return (
                    <tr key={key} className="border-t border-border bg-emerald-500/5">
                      <td colSpan={6} className="px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground line-through">{task.title}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => undoDone(task)}
                          >
                            <Undo2 className="h-3 w-3" /> Undo
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                <tr key={key} className="border-t border-border group hover:bg-accent/30 transition-colors">
                  <td className="px-3 py-2.5">
                    <Checkbox
                      checked={displayStatus === "DONE"}
                      onCheckedChange={(checked) => handleCheckboxToggle(task, !!checked)}
                    />
                  </td>
                  <td className="px-1 py-2.5">
                    <PriorityPicker
                      value={task.priority || "NONE"}
                      onChange={(p) => updatePriority(task, p)}
                      
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {editingId === task.id ? (
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={saveTitle}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveTitle();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="h-7 text-sm"
                      />
                    ) : (
                      <>
                        <span
                          className={cn(
                            "text-sm cursor-pointer",
                            task.status === "DONE" && "line-through text-muted-foreground",
                          )}
                          onDoubleClick={() => startEditing(task)}
                        >
                          {task.title}
                        </span>
                        {task.convertedToQuestId && (
                          <Badge variant="outline" className="ml-2 text-[10px]">→ Quest</Badge>
                        )}
                        {task.convertedToSubtaskId && (
                          <Badge variant="outline" className="ml-2 text-[10px]">→ Subtask</Badge>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell max-w-[160px]">
                    <div className="flex flex-col gap-0.5">
                      {task.source === "personal" && (
                        <Badge variant="secondary" className="text-[10px] truncate max-w-full inline-block">Personal</Badge>
                      )}
                      {task.source === "quest" && (
                        <>
                          <Link to={`/quests/${task.sourceId || task.id}`} className="hover:underline">
                            <Badge variant="secondary" className="text-[10px] truncate max-w-full inline-block cursor-pointer">
                              {(task.sourceLabel || "Quest").slice(0, 16)}
                            </Badge>
                          </Link>
                          {task.guildName && task.guildId && (
                            <Link to={`/guilds/${task.guildId}`} className="hover:underline">
                              <GuildColorLabel name={task.guildName} logoUrl={task.guildLogo} className="text-[10px] cursor-pointer" />
                            </Link>
                          )}
                          {task.guildName && !task.guildId && (
                            <GuildColorLabel name={task.guildName} logoUrl={task.guildLogo} className="text-[10px]" />
                          )}
                        </>
                      )}
                      {task.source === "subtask" && (
                        <>
                          <Link to={`/quests/${task.questId}`} className="hover:underline" title={task.questTitle || undefined}>
                            <span className="text-[10px] text-muted-foreground truncate max-w-full cursor-pointer">
                              <Compass className="h-2.5 w-2.5 mr-0.5 inline" />
                              {(task.questTitle || task.sourceLabel || "Quest").slice(0, 18)}
                            </span>
                          </Link>
                          {task.guildName && task.guildId && (
                            <Link to={`/guilds/${task.guildId}`} className="hover:underline">
                              <GuildColorLabel name={task.guildName} logoUrl={task.guildLogo} className="text-[10px] cursor-pointer" />
                            </Link>
                          )}
                          {task.guildName && !task.guildId && (
                            <GuildColorLabel name={task.guildName} logoUrl={task.guildLogo} className="text-[10px]" />
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Select
                      value={task.status}
                      onValueChange={(v) => handleStatusChange(task, v)}
                    >
                      <SelectTrigger className={cn(
                        "h-6 w-[110px] text-[10px] font-medium px-2 py-0 border-none shadow-none rounded-full",
                        STATUS_COLORS[task.status] || STATUS_COLORS.TODO,
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BACKLOG">BACKLOG</SelectItem>
                        <SelectItem value="TODO">TO DO NEXT</SelectItem>
                        <SelectItem value="IN_PROGRESS">IN PROGRESS</SelectItem>
                        <SelectItem value="DONE">DONE</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-0.5">
                      {task.source === "personal" && (
                        <>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openUnitPicker(task)}>
                                <Rocket className="h-3.5 w-3.5 mr-2" /> {task.convertedToQuestId ? "Reattach Quest to Guild" : "Convert to Quest"}
                              </DropdownMenuItem>
                              {allQuestsForPicker.length > 0 && (
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <ListChecks className="h-3.5 w-3.5 mr-2" /> Attach to Quest…
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    {allQuestsForPicker.map((q) => (
                                      <DropdownMenuItem key={q.id} onClick={() => convertToSubtask(task, q.id)} className="flex flex-col items-start gap-0.5">
                                        <span className="text-sm">{q.title}</span>
                                        {q.guildName && (
                                          <GuildColorLabel name={q.guildName} logoUrl={q.guildLogo} className="text-muted-foreground" />
                                        )}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {(task.source === "quest" || task.source === "subtask") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => navigate(task.source === "quest" ? `/quests/${task.sourceId || task.id}` : `/quests/${task.questId}?tab=subtasks`)}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">
                {safeP * PAGE_SIZE + 1}–{Math.min((safeP + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={safeP === 0} onClick={() => setPage(safeP - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-1">{safeP + 1}/{totalPages}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={safeP >= totalPages - 1} onClick={() => setPage(safeP + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unit picker dialog */}
      <Dialog open={unitPickerOpen} onOpenChange={(open) => { if (!converting) { setUnitPickerOpen(open); if (!open) { setPendingConvertTask(null); setConvertStep("unit"); } } }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Convert to Quest
            </DialogTitle>
            <DialogDescription>
              {convertStep === "unit"
                ? "Choose which entity to attach this quest to, or create it as a personal quest."
                : "Select topics and territories for this quest."}
            </DialogDescription>
          </DialogHeader>

          {convertStep === "unit" && (
            <div className="space-y-2 py-2">
              <button
                onClick={() => selectUnitForConvert(null)}
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
                      onClick={() => selectUnitForConvert(unit)}
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
          )}

          {convertStep === "tags" && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <Hash className="h-3.5 w-3.5" /> Topics
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {(allTopics ?? []).map((t: any) => (
                    <Badge
                      key={t.id}
                      variant={convertTopics.includes(t.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => setConvertTopics(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                  <MapPin className="h-3.5 w-3.5" /> Territories
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {(allTerritories ?? []).map((t: any) => (
                    <Badge
                      key={t.id}
                      variant={convertTerritories.includes(t.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => setConvertTerritories(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setConvertStep("unit")} className="flex-1">
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                <Button size="sm" onClick={finalizeConvertToQuest} disabled={converting} className="flex-1">
                  {converting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Rocket className="h-3.5 w-3.5 mr-1" />}
                  Create Quest
                </Button>
              </div>
            </div>
          )}

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
