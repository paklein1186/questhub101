import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus, ListTodo, Compass, ChevronRight, ArrowUpRight,
  Trash2, Loader2, Rocket, ListChecks, Users, Building2, User, Undo2,
  Calendar, ExternalLink, Search, X, Hash, MapPin, ChevronLeft,
  LayoutList, Columns3, Filter, ArrowDownUp,
  Circle, CircleDot, Timer, CheckCircle2,
} from "lucide-react";
import { WorkTasksKanban } from "@/components/work/WorkTasksKanban";
import { PriorityPicker, PRIORITY_ORDER, type Priority } from "@/components/PriorityPicker";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { GuildColorLabel } from "@/components/GuildColorLabel";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserSearchInput } from "@/components/UserSearchInput";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { motion } from "framer-motion";
import { ConfettiSpark } from "@/components/home/ConfettiSpark";

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-muted/60 text-muted-foreground/70",
  TODO: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  DONE: "bg-emerald-500/10 text-emerald-600",
};

type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE";

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
  createdAt?: string;
  priority?: Priority;
  assignees?: { user_id: string; display_name: string | null; avatar_url: string | null }[];
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

export function WorkTasksTab() {
  const currentUser = useCurrentUser();
  const userId = currentUser.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "personal" | "quest" | "subtask">("all");
  const [entityFilter, setEntityFilter] = useState<string>("all"); // "all" or entity id
  const [statusFilter, setStatusFilter] = useState<"all" | "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE">("all");
  const [hideDone, setHideDone] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"status" | "priority" | "recent">("status");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingSource, setEditingSource] = useState<string>("");

  // Track just-added task IDs so they bypass filters until next navigation/refresh
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<Set<string>>(new Set());

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

  // Fetch quests where user is owner (all statuses, filter client-side)
  const { data: myQuests = [], isLoading: loadingQuests } = useQuery({
    queryKey: ["my-active-quests", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("id, title, status, created_at, reward_xp, guild_id, priority, guilds(name, logo_url)")
        .eq("created_by_user_id", userId)
        .eq("is_deleted", false)
        .in("status", ["DRAFT", "OPEN_FOR_PROPOSALS", "ACTIVE"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch subtasks
  const { data: mySubtasks = [], isLoading: loadingSubtasks } = useQuery({
    queryKey: ["my-subtasks", userId],
    queryFn: async () => {
      const { data: assigned, error: e1 } = await supabase
        .from("quest_subtasks" as any)
        .select("id, title, status, quest_id, assignee_user_id, created_at, priority")
        .eq("assignee_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (e1) throw e1;

      const { data: ownedQuests } = await supabase
        .from("quests")
        .select("id")
        .eq("created_by_user_id", userId)
        .eq("is_deleted", false);
      const ownedQuestIds = (ownedQuests || []).map((q: any) => q.id);

      const { data: parts } = await supabase
        .from("quest_participants")
        .select("quest_id")
        .eq("user_id", userId)
        .eq("status", "APPROVED");
      const partQuestIds = (parts || []).map((p: any) => p.quest_id);

      const allQuestIds = [...new Set([...ownedQuestIds, ...partQuestIds])];
      let fromQuests: any[] = [];
      if (allQuestIds.length > 0) {
        const { data: qSubtasks } = await supabase
          .from("quest_subtasks" as any)
          .select("id, title, status, quest_id, assignee_user_id, created_at, priority")
          .in("quest_id", allQuestIds)
          .order("created_at", { ascending: false })
          .limit(100);
        fromQuests = qSubtasks || [];
      }

      const seen = new Set<string>();
      const merged: any[] = [];
      for (const s of [...(assigned || []), ...fromQuests]) {
        if (!seen.has(s.id)) { seen.add(s.id); merged.push(s); }
      }

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

  // Participant quests
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
        .select("id, title, status, created_at, guild_id, priority, guilds(name, logo_url)")
        .in("id", questIds)
        .eq("is_deleted", false);
      return quests || [];
    },
    enabled: !!userId,
  });

  // User units for quest conversion
  const { data: userUnits = [] } = useQuery<UnitOption[]>({
    queryKey: ["my-units-for-quest", userId],
    queryFn: async () => {
      const units: UnitOption[] = [];
      const { data: guildMemberships } = await supabase
        .from("guild_members").select("guild_id, role").eq("user_id", userId);
      if (guildMemberships && guildMemberships.length > 0) {
        const guildIds = guildMemberships.map((gm) => gm.guild_id);
        const { data: guilds } = await supabase
          .from("guilds").select("id, name, logo_url").in("id", guildIds).eq("is_deleted", false);
        for (const g of guilds || []) units.push({ id: g.id, name: g.name, type: "GUILD", logo_url: g.logo_url });
      }
      const { data: companyMemberships } = await supabase
        .from("company_members").select("company_id").eq("user_id", userId);
      if (companyMemberships && companyMemberships.length > 0) {
        const companyIds = companyMemberships.map((cm) => cm.company_id);
        const { data: companies } = await supabase
          .from("companies").select("id, name, logo_url").in("id", companyIds).eq("is_deleted", false);
        for (const c of companies || []) units.push({ id: c.id, name: c.name, type: "COMPANY", logo_url: c.logo_url });
      }
      return units;
    },
    enabled: !!userId,
  });

  // Fetch task assignees with profile info
  const { data: taskAssignees = [] } = useQuery({
    queryKey: ["task-assignees", userId],
    queryFn: async () => {
      const { data: assignees, error } = await supabase
        .from("task_assignees" as any)
        .select("task_id, user_id")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!assignees?.length) return [];
      const userIds = [...new Set((assignees as any[]).map((a: any) => a.user_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      return (assignees as any[]).map((a: any) => ({
        task_id: a.task_id,
        user_id: a.user_id,
        display_name: profileMap.get(a.user_id)?.name || null,
        avatar_url: profileMap.get(a.user_id)?.avatar_url || null,
      }));
    },
    enabled: !!userId,
  });

  // Build assignee map
  const assigneeMap = new Map<string, { user_id: string; display_name: string | null; avatar_url: string | null }[]>();
  for (const a of taskAssignees) {
    const list = assigneeMap.get(a.task_id) || [];
    list.push({ user_id: a.user_id, display_name: a.display_name, avatar_url: a.avatar_url });
    assigneeMap.set(a.task_id, list);
  }

  // Build unified list with Option B suppression (same as homepage)
  const unified: UnifiedTask[] = [];

  for (const t of personalTasks) {
    if (t.converted_to_quest_id || t.converted_to_subtask_id) continue;
    unified.push({
      id: t.id, title: t.title, status: t.status, source: "personal",
      convertedToQuestId: t.converted_to_quest_id, convertedToSubtaskId: t.converted_to_subtask_id,
      createdAt: t.created_at, priority: t.priority || "NONE",
      assignees: assigneeMap.get(t.id) || [],
    });
  }

  // Determine which quests have non-DONE subtasks (for Option B suppression)
  const questSubtaskMap = new Map<string, { hasActiveSubtasks: boolean }>();
  for (const s of mySubtasks) {
    if (s.status !== "DONE") {
      questSubtaskMap.set(s.quest_id, { hasActiveSubtasks: true });
    }
  }

  for (const q of myQuests) {
    const hasActive = questSubtaskMap.get(q.id)?.hasActiveSubtasks || false;
    if (hasActive) continue; // Option B: hide parent quest when subtasks are active
    unified.push({
      id: q.id, title: q.title,
      status: q.status === "ACTIVE" ? "IN_PROGRESS" : q.status === "COMPLETED" ? "DONE" : "TODO",
      source: "quest", sourceLabel: "My Quest", sourceId: q.id, createdAt: q.created_at,
      priority: ((q as any).priority as Priority) || "NONE",
      guildId: (q as any).guild_id || null,
      guildName: (q as any).guilds?.name || null,
      guildLogo: (q as any).guilds?.logo_url || null,
    });
  }

  for (const q of participantQuests) {
    if (myQuests.some((mq: any) => mq.id === q.id)) continue;
    if (["COMPLETED", "CANCELLED", "DONE"].includes(q.status)) continue;
    const hasActive = questSubtaskMap.get(q.id)?.hasActiveSubtasks || false;
    if (hasActive) continue;
    unified.push({
      id: q.id, title: q.title,
      status: q.status === "ACTIVE" ? "IN_PROGRESS" : "TODO",
      source: "quest", sourceLabel: "Collaborator", sourceId: q.id, createdAt: q.created_at,
      priority: ((q as any).priority as Priority) || "NONE",
      guildId: (q as any).guild_id || null,
      guildName: (q as any).guilds?.name || null,
      guildLogo: (q as any).guilds?.logo_url || null,
    });
  }

  for (const s of mySubtasks) {
    unified.push({
      id: s.id, title: s.title, status: s.status, source: "subtask",
      sourceLabel: s.questTitle, questId: s.quest_id, createdAt: s.created_at,
      priority: s.priority || "NONE",
      questTitle: s.questTitle,
      guildId: s.questGuildId || null,
      guildName: s.questGuildName || null,
      guildLogo: s.questGuildLogo || null,
    });
  }

  // Collect unique entities for filter
  const entityOptions = new Map<string, { id: string; name: string; type: "guild" | "company"; logo?: string | null }>();
  for (const t of unified) {
    if (t.guildId && t.guildName) entityOptions.set(t.guildId, { id: t.guildId, name: t.guildName, type: "guild", logo: t.guildLogo });
  }
  const sortedEntities = [...entityOptions.values()].sort((a, b) => a.name.localeCompare(b.name));

  // Apply filters — recently added tasks always bypass filters
  const isRecentlyAdded = (t: UnifiedTask) => t.source === "personal" && recentlyAddedIds.has(t.id);
  let filtered = filter === "all" ? unified : unified.filter((t) => isRecentlyAdded(t) || t.source === filter);
  if (statusFilter !== "all") filtered = filtered.filter((t) => isRecentlyAdded(t) || t.status === statusFilter);
  if (hideDone) filtered = filtered.filter((t) => isRecentlyAdded(t) || t.status !== "DONE");
  if (entityFilter !== "all") filtered = filtered.filter((t) => isRecentlyAdded(t) || t.guildId === entityFilter);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((t) => isRecentlyAdded(t) || t.title.toLowerCase().includes(q));
  }

  // Sort
  const STATUS_ORDER: Record<string, number> = { IN_PROGRESS: 0, TODO: 1, BACKLOG: 2, DONE: 3 };
  if (sortBy === "status") {
    filtered.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  } else if (sortBy === "priority") {
    const PRIO_ORDER: Record<string, number> = { NONE: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    filtered.sort((a, b) => (PRIO_ORDER[a.priority || "NONE"] ?? 9) - (PRIO_ORDER[b.priority || "NONE"] ?? 9));
  } else if (sortBy === "recent") {
    filtered.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
  }

  const isLoading = loadingPersonal || loadingQuests || loadingSubtasks;

  // ── Actions (same logic as MyTaskBoard) ──
  const addTask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    const { data: inserted, error } = await supabase.from("personal_tasks" as any).insert({
      user_id: userId, title: newTitle.trim(), status: "BACKLOG",
    } as any).select("id").single();
    if (error) toast({ title: "Failed to add task", variant: "destructive" });
    else {
      setNewTitle("");
      if (inserted) {
        setRecentlyAddedIds((prev) => new Set(prev).add((inserted as any).id));
      }
      qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
    }
    setAdding(false);
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from("personal_tasks" as any).update({ status } as any).eq("id", taskId);
    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
  };

  const updateQuestStatus = async (questId: string, uiStatus: string) => {
    const questStatus = uiStatus === "DONE" ? "COMPLETED" : uiStatus === "IN_PROGRESS" ? "ACTIVE" : "OPEN_FOR_PROPOSALS";
    await supabase.from("quests").update({ status: questStatus }).eq("id", questId);
    // Emit $CTG when quest is completed
    if (questStatus === "COMPLETED") {
      supabase.rpc('emit_ctg_for_contribution', {
        p_user_id: userId,
        p_contribution_type: 'quest_completed',
        p_related_entity_id: questId,
        p_related_entity_type: 'quest',
      } as any).then(() => {});
    }
    qc.invalidateQueries({ queryKey: ["my-active-quests", userId] });
    qc.invalidateQueries({ queryKey: ["my-participant-quests", userId] });
  };

  const updateSubtaskStatus = async (subtaskId: string, status: string) => {
    await supabase.from("quest_subtasks" as any).update({ status } as any).eq("id", subtaskId);
    qc.invalidateQueries({ queryKey: ["my-subtasks", userId] });
  };

  const commitDone = useCallback((task: UnifiedTask) => {
    const key = `${task.source}-${task.id}`;
    if (task.source === "personal") updateTaskStatus(task.id, "DONE");
    else if (task.source === "quest") updateQuestStatus(task.id, "DONE");
    else if (task.source === "subtask") updateSubtaskStatus(task.id, "DONE");
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
    const wasPending = pendingDone.has(key);
    if (wasPending) {
      const timer = pendingTimers.current.get(key);
      if (timer) clearTimeout(timer);
      pendingTimers.current.delete(key);
      setPendingDone((prev) => { const next = new Map(prev); next.delete(key); return next; });
    }
    if (newStatus === "DONE") {
      setShowConfetti(true);
      const prevStatus = wasPending ? (pendingDone.get(key)?.prevStatus || task.status) : task.status;
      setPendingDone((prev) => new Map(prev).set(key, { task, prevStatus }));
      const timer = setTimeout(() => commitDone(task), 5000);
      pendingTimers.current.set(key, timer);
      return;
    }
    if (task.source === "personal") updateTaskStatus(task.id, newStatus);
    else if (task.source === "quest") updateQuestStatus(task.id, newStatus);
    else if (task.source === "subtask") updateSubtaskStatus(task.id, newStatus);
  };

  const handleCheckboxToggle = (task: UnifiedTask, checked: boolean) => {
    handleStatusChange(task, checked ? "DONE" : "TODO");
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
      qc.invalidateQueries({ queryKey: ["my-active-quests-home", userId] });
      qc.invalidateQueries({ queryKey: ["my-participant-quests-home", userId] });
    } else if (task.source === "subtask") {
      await supabase.from("quest_subtasks" as any).update({ priority } as any).eq("id", task.id);
      qc.invalidateQueries({ queryKey: ["my-subtasks", userId] });
      qc.invalidateQueries({ queryKey: ["my-subtasks-home", userId] });
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
    const insertPayload: any = {
      title: pendingConvertTask.title,
      created_by_user_id: userId,
      is_draft: false,
      status: "OPEN_FOR_PROPOSALS",
    };
    if (unit && unit.type === "GUILD") {
      insertPayload.owner_type = "GUILD"; insertPayload.owner_id = unit.id; insertPayload.guild_id = unit.id;
    } else if (unit && unit.type === "COMPANY") {
      insertPayload.owner_type = "COMPANY"; insertPayload.owner_id = unit.id; insertPayload.company_id = unit.id;
    } else {
      insertPayload.owner_type = "USER"; insertPayload.owner_id = userId;
    }
    const { data, error } = await supabase.from("quests").insert(insertPayload).select("id").single();
    if (error) { toast({ title: "Failed to create quest", variant: "destructive" }); setConverting(false); return; }
    const questId = (data as any).id;
    await supabase.from("quest_participants").insert({ quest_id: questId, user_id: userId, role: "OWNER", status: "ACCEPTED" });
    // Emit $CTG for quest creation
    supabase.rpc('emit_ctg_for_contribution', {
      p_user_id: userId,
      p_contribution_type: 'quest_created',
      p_related_entity_id: questId,
      p_related_entity_type: 'quest',
    } as any).then(() => {});

    if (convertTopics.length > 0) {
      await supabase.from("quest_topics").insert(convertTopics.map((topic_id) => ({ quest_id: questId, topic_id })));
    }
    if (convertTerritories.length > 0) {
      await supabase.from("quest_territories" as any).insert(convertTerritories.map((territory_id) => ({ quest_id: questId, territory_id })));
    }

    await supabase.from("personal_tasks" as any).update({ converted_to_quest_id: questId } as any).eq("id", pendingConvertTask.id);
    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
    qc.invalidateQueries({ queryKey: ["my-active-quests", userId] });
    setConverting(false); setUnitPickerOpen(false); setPendingConvertTask(null);
    toast({ title: "Task converted to quest!" });
    navigate(`/quests/${questId}`);
  };

  const convertToSubtask = async (task: UnifiedTask, questId: string) => {
    const { data, error } = await supabase.from("quest_subtasks" as any).insert({
      quest_id: questId, title: task.title, assignee_user_id: userId, status: "TODO", order_index: 0,
    } as any).select("id").single();
    if (error) { toast({ title: "Failed to create subtask", variant: "destructive" }); return; }
    await supabase.from("personal_tasks" as any).update({ converted_to_subtask_id: (data as any).id } as any).eq("id", task.id);
    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
    qc.invalidateQueries({ queryKey: ["my-subtasks", userId] });
    toast({ title: "Task attached as subtask!" });
  };

  const addAssignee = async (taskId: string, assigneeUserId: string) => {
    await supabase.from("task_assignees" as any).insert({ task_id: taskId, user_id: assigneeUserId } as any);
    qc.invalidateQueries({ queryKey: ["task-assignees", userId] });
  };

  const removeAssignee = async (taskId: string, assigneeUserId: string) => {
    await supabase.from("task_assignees" as any).delete().eq("task_id", taskId).eq("user_id", assigneeUserId);
    qc.invalidateQueries({ queryKey: ["task-assignees", userId] });
  };

  const allQuestsForPicker = [
    ...myQuests.map((q: any) => ({ id: q.id, title: q.title, guildName: q.guilds?.name || null, guildLogo: q.guilds?.logo_url || null })),
    ...participantQuests.filter((q: any) => !myQuests.some((mq: any) => mq.id === q.id)).map((q: any) => ({ id: q.id, title: q.title, guildName: q.guilds?.name || null, guildLogo: q.guilds?.logo_url || null })),
  ];

  // Quest picker dialog state
  const [questPickerOpen, setQuestPickerOpen] = useState(false);
  const [questPickerTask, setQuestPickerTask] = useState<UnifiedTask | null>(null);
  const [questPickerSearch, setQuestPickerSearch] = useState("");

  const backlogCount = unified.filter((t) => t.status === "BACKLOG").length;
  const todoCount = unified.filter((t) => t.status === "TODO").length;
  const inProgressCount = unified.filter((t) => t.status === "IN_PROGRESS").length;
  const doneCount = unified.filter((t) => t.status === "DONE").length;

  const unitIcon = (type: string) => {
    if (type === "GUILD") return <Users className="h-4 w-4 text-primary" />;
    if (type === "COMPANY") return <Building2 className="h-4 w-4 text-primary" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-5">
      {/* Status filter buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setStatusFilter("all")}
        >
          All
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">{unified.length}</Badge>
        </Button>
        <Button
          variant={statusFilter === "BACKLOG" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setStatusFilter("BACKLOG")}
        >
          Backlog
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">{backlogCount}</Badge>
        </Button>
        <Button
          variant={statusFilter === "TODO" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setStatusFilter("TODO")}
        >
          To do next
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">{todoCount}</Badge>
        </Button>
        <Button
          variant={statusFilter === "IN_PROGRESS" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setStatusFilter("IN_PROGRESS")}
        >
          In Progress
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">{inProgressCount}</Badge>
        </Button>
        <Button
          variant={statusFilter === "DONE" ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setStatusFilter("DONE")}
        >
          Done
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">{doneCount}</Badge>
        </Button>
      </div>

      {/* Filters + search + view toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-sm pl-8"
          />
        </div>

        {/* Source type quick-filter buttons */}
        <div className="flex border border-border rounded-md overflow-hidden">
          {([
            { key: "all", label: "All", icon: null as React.ReactNode },
            { key: "personal", label: "Task", icon: <ListTodo className="h-3 w-3" /> },
            { key: "quest", label: "Quest", icon: <Compass className="h-3 w-3" /> },
            { key: "subtask", label: "Subtask", icon: <ListChecks className="h-3 w-3" /> },
          ] as const).map(({ key, label, icon }) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "ghost"}
              size="sm"
              className="h-9 rounded-none px-2.5 text-xs gap-1"
              onClick={() => setFilter(key)}
            >
              {icon}
              {label}
            </Button>
          ))}
        </div>

        {/* Entity filter */}
        {sortedEntities.length > 0 && (
          <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v)}>
            <SelectTrigger className="w-[160px] h-9 text-xs gap-1">
              <Filter className="h-3 w-3 shrink-0" />
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {sortedEntities.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  <span className="flex items-center gap-1.5">
                    {e.type === "guild" ? <Users className="h-3 w-3 text-primary shrink-0" /> : <Building2 className="h-3 w-3 text-primary shrink-0" />}
                    <span className="truncate">{e.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Hide done toggle */}
        <Button
          variant={hideDone ? "default" : "outline"}
          size="sm"
          className="h-9 text-xs gap-1.5"
          onClick={() => setHideDone((v) => !v)}
        >
          <ListChecks className="h-3.5 w-3.5" />
          {hideDone ? "Done hidden" : "Hide done"}
        </Button>

        {/* Sort toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-xs"
          onClick={() => setSortBy(sortBy === "status" ? "priority" : sortBy === "priority" ? "recent" : "status")}
        >
          <ArrowDownUp className="h-3.5 w-3.5" />
          {sortBy === "status" ? "Status" : sortBy === "priority" ? "Priority" : "Recent"}
        </Button>

        {/* View mode toggle */}
        <div className="flex border border-border rounded-md overflow-hidden">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            className="h-9 rounded-none px-2.5"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            className="h-9 rounded-none px-2.5"
            onClick={() => setViewMode("kanban")}
          >
            <Columns3 className="h-4 w-4" />
          </Button>
        </div>
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

      {/* Task view */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed border-border">
          <ListTodo className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">No tasks match your filters</p>
          <Button size="sm" variant="outline" onClick={() => { setFilter("all"); setStatusFilter("all"); setEntityFilter("all"); setSearchQuery(""); }}>
            Clear filters
          </Button>
        </div>
      ) : viewMode === "kanban" ? (
        <WorkTasksKanban
          tasks={filtered}
          onStatusChange={handleStatusChange}
          pendingDone={pendingDone}
          undoDone={undoDone}
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-xs sm:text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-7 sm:w-10 px-1.5 sm:px-3 py-1.5 sm:py-2.5"></th>
                  <th className="w-7 sm:w-8 px-1 py-1.5 sm:py-2.5"></th>
                  <th className="text-left px-1.5 sm:px-3 py-1.5 sm:py-2.5 font-medium">Task</th>
                  <th className="text-left px-2 sm:px-3 py-1.5 sm:py-2.5 font-medium hidden md:table-cell">Source</th>
                  <th className="text-left px-1.5 md:px-3 py-1.5 sm:py-2.5 font-medium w-[40px] md:w-[140px]"><span className="hidden md:inline">Status</span></th>
                  <th className="text-left px-3 py-1.5 sm:py-2.5 font-medium hidden lg:table-cell">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Created</span>
                  </th>
                  <th className="text-left px-3 py-1.5 sm:py-2.5 font-medium hidden xl:table-cell">Link</th>
                  <th className="text-left px-3 py-1.5 sm:py-2.5 font-medium hidden md:table-cell">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Assigned to</span>
                  </th>
                  <th className="w-8 sm:w-12 px-1.5 sm:px-3 py-1.5 sm:py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task, i) => {
                  const key = `${task.source}-${task.id}`;
                  const isPendingDone = pendingDone.has(key);

                  if (isPendingDone) {
                    return (
                      <motion.tr key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-border bg-emerald-500/5">
                        <td colSpan={9} className="px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground line-through">{task.title}</span>
                            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => undoDone(task)}>
                              <Undo2 className="h-3 w-3" /> Undo
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  }

                  const questLink = task.source === "quest" ? `/quests/${task.sourceId || task.id}` :
                    task.source === "subtask" ? `/quests/${task.questId}` : null;

                  return (
                    <motion.tr
                      key={key}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-t border-border group hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-1.5 sm:px-3 py-1.5 sm:py-2.5">
                        <Checkbox
                          checked={task.status === "DONE"}
                          onCheckedChange={(checked) => handleCheckboxToggle(task, !!checked)}
                          className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                        />
                      </td>
                      <td className="px-1 py-1.5 sm:py-2.5">
                        <PriorityPicker
                          value={task.priority || "NONE"}
                          onChange={(p) => updatePriority(task, p)}
                          disabled={false}
                        />
                      </td>
                      <td className="px-1.5 sm:px-3 py-1.5 sm:py-2.5 max-w-0 w-full">
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
                          <div>
                            <span
                              className={cn(
                                "text-xs sm:text-sm cursor-pointer hover:text-primary transition-colors line-clamp-2 break-words",
                                task.status === "DONE" && "line-through text-muted-foreground",
                              )}
                              onDoubleClick={() => startEditing(task)}
                            >
                              {task.title}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              {task.convertedToQuestId && <Badge variant="outline" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4">→ Quest</Badge>}
                              {task.convertedToSubtaskId && <Badge variant="outline" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4">→ Subtask</Badge>}
                              <span className="md:hidden" title={task.source === "personal" ? "Personal" : (task.sourceLabel || task.source)}>
                                <Badge variant="secondary" className="text-[8px] sm:text-[9px] h-3.5 sm:h-4 px-1">
                                  {task.source === "personal" ? <User className="h-2.5 w-2.5" /> : task.source === "quest" ? <Compass className="h-2.5 w-2.5" /> : <ListChecks className="h-2.5 w-2.5" />}
                                </Badge>
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell max-w-[160px]">
                        <div className="flex flex-col gap-0.5">
                          {task.source === "personal" && (
                            <Badge variant="secondary" className="text-[10px] truncate max-w-full inline-block">Personal</Badge>
                          )}
                          {task.source === "quest" && (
                            <>
                              <Link to={`/quests/${task.sourceId || task.id}`} className="hover:underline">
                                <Badge variant="secondary" className="text-[10px] truncate max-w-full inline-block cursor-pointer">
                                  {(task.sourceLabel || "Quest").slice(0, 18)}
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
                       <td className="px-1.5 md:px-3 py-1.5 md:py-2.5">
                        <Select value={task.status} onValueChange={(v) => handleStatusChange(task, v)}>
                          <SelectTrigger className={cn(
                            "h-7 w-8 md:w-[120px] text-[10px] font-medium px-1.5 md:px-2.5 py-0 border-none shadow-none rounded-full gap-1 [&>svg:last-child]:h-3 [&>svg:last-child]:w-3 [&>svg:last-child]:hidden md:[&>svg:last-child]:block [&>svg:last-child]:shrink-0",
                            STATUS_COLORS[task.status] || STATUS_COLORS.TODO,
                          )}>
                            <span className="flex items-center justify-center md:hidden">
                              {task.status === "BACKLOG" && <Circle className="h-3.5 w-3.5" />}
                              {task.status === "TODO" && <CircleDot className="h-3.5 w-3.5" />}
                              {task.status === "IN_PROGRESS" && <Timer className="h-3.5 w-3.5" />}
                              {task.status === "DONE" && <CheckCircle2 className="h-3.5 w-3.5" />}
                            </span>
                            <span className="hidden md:inline truncate">
                              {task.status === "BACKLOG" ? "Backlog" : task.status === "TODO" ? "To do next" : task.status === "IN_PROGRESS" ? "In progress" : "Done"}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BACKLOG"><span className="flex items-center gap-1.5"><Circle className="h-3 w-3" /> Backlog</span></SelectItem>
                            <SelectItem value="TODO"><span className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> To do next</span></SelectItem>
                            <SelectItem value="IN_PROGRESS"><span className="flex items-center gap-1.5"><Timer className="h-3 w-3" /> In progress</span></SelectItem>
                            <SelectItem value="DONE"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Done</span></SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        {task.createdAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden xl:table-cell">
                        {questLink && (
                          <Link to={questLink} className="text-xs text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> View quest
                          </Link>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        {task.source === "personal" ? (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-1 min-w-[60px] group/assign">
                                {(task.assignees?.length ?? 0) > 0 ? (
                                  <div className="flex -space-x-1.5">
                                    {task.assignees!.slice(0, 3).map((a) => (
                                      <Avatar key={a.user_id} className="h-5 w-5 border border-background">
                                        <AvatarImage src={a.avatar_url ?? undefined} />
                                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                          {a.display_name?.[0]?.toUpperCase() || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                    ))}
                                    {task.assignees!.length > 3 && (
                                      <span className="text-[9px] text-muted-foreground ml-1">+{task.assignees!.length - 3}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 group-hover/assign:opacity-100 transition-opacity">
                                    <Plus className="h-3 w-3 inline" /> Assign
                                  </span>
                                )}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="start">
                              <p className="text-xs font-medium mb-2">Assigned users</p>
                              {(task.assignees?.length ?? 0) > 0 && (
                                <div className="space-y-1.5 mb-2">
                                  {task.assignees!.map((a) => (
                                    <div key={a.user_id} className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={a.avatar_url ?? undefined} />
                                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                          {a.display_name?.[0]?.toUpperCase() || "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs flex-1 truncate">{a.display_name || "Unnamed"}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeAssignee(task.id, a.user_id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <UserSearchInput
                                placeholder="Add user…"
                                excludeUserIds={task.assignees?.map((a) => a.user_id) || []}
                                onSelect={(user) => addAssignee(task.id, user.user_id)}
                              />
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
                                    <Rocket className="h-3.5 w-3.5 mr-2" /> Convert to Quest
                                  </DropdownMenuItem>
                                  {allQuestsForPicker.length > 0 && (
                                    <DropdownMenuItem onClick={() => { setQuestPickerTask(task); setQuestPickerOpen(true); setQuestPickerSearch(""); }}>
                                      <ListChecks className="h-3.5 w-3.5 mr-2" /> Attach to Quest…
                                    </DropdownMenuItem>
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
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unit picker dialog */}
      <Dialog open={unitPickerOpen} onOpenChange={(open) => { if (!converting) { setUnitPickerOpen(open); if (!open) { setPendingConvertTask(null); setConvertStep("unit"); } } }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" /> Convert to Quest
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
                        ) : unitIcon(unit.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{unit.name}</p>
                        <p className="text-xs text-muted-foreground">{unit.type === "GUILD" ? "Guild" : "Organisation"}</p>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" /> Topics
                  </label>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground" onClick={() => setConvertTopics((allTopics ?? []).map((t: any) => t.id))}>Select all</Button>
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground" onClick={() => setConvertTopics([])}>Clear</Button>
                  </div>
                </div>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Territories
                  </label>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground" onClick={() => setConvertTerritories((allTerritories ?? []).map((t: any) => t.id))}>Select all</Button>
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground" onClick={() => setConvertTerritories([])}>Clear</Button>
                  </div>
                </div>
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
      {/* Quest picker dialog for attaching tasks */}
      <Dialog open={questPickerOpen} onOpenChange={(open) => { setQuestPickerOpen(open); if (!open) { setQuestPickerTask(null); setQuestPickerSearch(""); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Attach to Quest
            </DialogTitle>
            <DialogDescription>
              Choose a quest to attach "{questPickerTask?.title}" as a subtask.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search quests…"
              value={questPickerSearch}
              onChange={(e) => setQuestPickerSearch(e.target.value)}
              className="h-8 text-sm pl-8"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 max-h-[50vh]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allQuestsForPicker
                .filter((q) => !questPickerSearch.trim() || q.title.toLowerCase().includes(questPickerSearch.toLowerCase()) || (q.guildName && q.guildName.toLowerCase().includes(questPickerSearch.toLowerCase())))
                .map((q) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      if (questPickerTask) convertToSubtask(questPickerTask, q.id);
                      setQuestPickerOpen(false);
                      setQuestPickerTask(null);
                    }}
                    className="text-left rounded-lg border border-border p-3 hover:bg-accent/50 hover:border-primary/30 transition-all"
                  >
                    <p className="text-sm font-medium line-clamp-2">{q.title}</p>
                    {q.guildName && (
                      <GuildColorLabel name={q.guildName} logoUrl={q.guildLogo} className="text-[10px] mt-1" />
                    )}
                  </button>
                ))}
            </div>
            {allQuestsForPicker.filter((q) => !questPickerSearch.trim() || q.title.toLowerCase().includes(questPickerSearch.toLowerCase())).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No quests match your search.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {showConfetti && <ConfettiSpark onDone={() => setShowConfetti(false)} />}
    </div>
  );
}
