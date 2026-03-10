import { useState, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, ListTodo, Compass, ChevronRight, ArrowUpRight,
  Trash2, Loader2, Rocket, ListChecks, Users, Building2, User,
  ChevronLeft, ArrowDownUp, Hash, MapPin, Search, X, Sun,
  Circle, CircleDot, Timer, CheckCircle2, Scale, Pencil,
} from "lucide-react";
import { ConfettiSpark } from "./ConfettiSpark";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { PriorityPicker, PRIORITY_ORDER, type Priority } from "@/components/PriorityPicker";
import { GuildColorLabel } from "@/components/GuildColorLabel";

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-muted/60 text-muted-foreground/70",
  TODO: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  DONE: "bg-emerald-500/10 text-emerald-600",
};

// ── Today's Goals (resets daily at 9am) ──
function getTodayWindowStart(): Date {
  const now = new Date();
  const ref = new Date(now);
  if (ref.getHours() < 9) ref.setDate(ref.getDate() - 1);
  ref.setHours(9, 0, 0, 0);
  return ref;
}

function isGoalActive(goalAt: string | null): boolean {
  if (!goalAt) return false;
  return new Date(goalAt) >= getTodayWindowStart();
}

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
  status: string;
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

type WorkItem = {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  work_state: TaskStatus;
  today_goal_at: string | null;
};

type UnifiedTask = {
  id: string;
  title: string;
  workState: TaskStatus; // Task Perspective state (from user_work_items or fallback)
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

/**
 * Resolve work state for an entity:
 * - If user_work_items record exists, use work_state
 * - Otherwise fallback to entity's own status (personal_tasks, quest_subtasks)
 * - For quests, default to BACKLOG if no work item
 */
function resolveWorkState(
  workItems: Map<string, TaskStatus>,
  entityType: string,
  entityId: string,
  fallbackStatus?: string
): TaskStatus {
  const key = `${entityType}:${entityId}`;
  if (workItems.has(key)) return workItems.get(key)!;
  // For quests, default to BACKLOG when no work item exists
  if (entityType === "quest") return "BACKLOG";
  // For personal_tasks and quest_subtasks, fallback to their own status
  const validStates: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "DONE"];
  if (fallbackStatus && validStates.includes(fallbackStatus as TaskStatus)) {
    return fallbackStatus as TaskStatus;
  }
  return "BACKLOG";
}

export function MyTaskBoard({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "personal" | "quest" | "subtask">("all");
  const [sortBy, setSortBy] = useState<"status" | "priority" | "recent">("status");
  const [hideBacklog, setHideBacklog] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingSource, setEditingSource] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [entityFilter, setEntityFilterRaw] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`taskboard-entity-filter-${userId}`);
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch {}
    return new Set<string>();
  });
  const setEntityFilter = (valOrFn: Set<string> | ((prev: Set<string>) => Set<string>)) => {
    setEntityFilterRaw((prev) => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      try { localStorage.setItem(`taskboard-entity-filter-${userId}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const [showConfetti, setShowConfetti] = useState(false);

  // Track items marked as done this session (shown crossed-out until refresh)
  const [sessionDone, setSessionDone] = useState<Set<string>>(new Set());

  // Delete confirmation state
  const [taskToDelete, setTaskToDelete] = useState<UnifiedTask | null>(null);

  // Unit picker state
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [pendingConvertTask, setPendingConvertTask] = useState<UnifiedTask | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertStep, setConvertStep] = useState<"unit" | "tags" | "budget">("unit");
  const [convertSelectedUnit, setConvertSelectedUnit] = useState<UnitOption | null>(null);
  const [convertTopics, setConvertTopics] = useState<string[]>([]);
  const [convertTerritories, setConvertTerritories] = useState<string[]>([]);
  const [convertBudget, setConvertBudget] = useState("");
  const [convertGuildPercent, setConvertGuildPercent] = useState(15);
  const [convertTerritoryPercent, setConvertTerritoryPercent] = useState(10);
  const [convertCtgPercent, setConvertCtgPercent] = useState(5);

  const { data: allTopics } = useTopics();
  const { data: allTerritories } = useTerritories();

  // Fetch user_work_items for this user
  const { data: workItemsRaw = [] } = useQuery({
    queryKey: ["user-work-items", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_work_items" as any)
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return (data || []) as unknown as WorkItem[];
    },
    enabled: !!userId,
  });

  // Build work items lookup map: "entity_type:entity_id" -> work_state
  const workItemsMap = new Map<string, TaskStatus>();
  for (const wi of workItemsRaw) {
    workItemsMap.set(`${wi.entity_type}:${wi.entity_id}`, wi.work_state as TaskStatus);
  }

  // Today's goals — derived from work items' today_goal_at column
  const todayGoals = useMemo(() => {
    const set = new Set<string>();
    for (const wi of workItemsRaw) {
      if (isGoalActive(wi.today_goal_at)) {
        const src = wi.entity_type === "personal_task" ? "personal" : wi.entity_type === "quest" ? "quest" : "subtask";
        set.add(`${src}-${wi.entity_id}`);
      }
    }
    return set;
  }, [workItemsRaw]);

  const toggleTodayGoal = async (taskKey: string, entityType: string, entityId: string) => {
    const isCurrentlyGoal = todayGoals.has(taskKey);
    const newValue = isCurrentlyGoal ? null : new Date().toISOString();
    await supabase.from("user_work_items" as any).upsert({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      today_goal_at: newValue,
    } as any, { onConflict: "user_id,entity_type,entity_id" });
    qc.invalidateQueries({ queryKey: ["user-work-items", userId] });
  };

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

  // Fetch quests where user is owner (ALL non-deleted, not just by lifecycle status)
  const { data: myQuests = [], isLoading: loadingQuests } = useQuery({
    queryKey: ["my-active-quests-home", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests")
        .select("id, title, status, guild_id, priority, guilds(name, logo_url)")
        .eq("created_by_user_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Fetch subtasks: assigned to user OR from quests user owns/participates in
  // Now fetch ALL statuses (including BACKLOG) since we use work_state
  const { data: mySubtasks = [], isLoading: loadingSubtasks } = useQuery({
    queryKey: ["my-subtasks-home", userId],
    queryFn: async () => {
      // 1. Subtasks explicitly assigned to user
      const { data: assigned, error: e1 } = await supabase
        .from("quest_subtasks" as any)
        .select("id, title, status, quest_id, assignee_user_id, priority")
        .eq("assignee_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (e1) throw e1;

      // 2. Get quest IDs user owns
      const { data: ownedQuests } = await supabase
        .from("quests")
        .select("id")
        .eq("created_by_user_id", userId)
        .eq("is_deleted", false);
      const ownedQuestIds = (ownedQuests || []).map((q: any) => q.id);

      // 3. Get quest IDs user participates in
      const { data: parts } = await supabase
        .from("quest_participants")
        .select("quest_id")
        .eq("user_id", userId)
        .eq("status", "APPROVED");
      const partQuestIds = (parts || []).map((p: any) => p.quest_id);

      // 4. Combine and fetch subtasks from those quests
      const allQuestIds = [...new Set([...ownedQuestIds, ...partQuestIds])];
      let fromQuests: any[] = [];
      if (allQuestIds.length > 0) {
        const { data: qSubtasks } = await supabase
          .from("quest_subtasks" as any)
          .select("id, title, status, quest_id, assignee_user_id, priority")
          .in("quest_id", allQuestIds)
          .order("created_at", { ascending: false })
          .limit(100);
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
    queryKey: ["my-participant-quests-home", userId],
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
        .eq("is_deleted", false);
      return quests || [];
    },
    enabled: !!userId,
  });

  // Fetch user's units (guilds + companies where they're admin/member)
  const { data: userUnits = [] } = useQuery<UnitOption[]>({
    queryKey: ["my-units-for-quest", userId],
    queryFn: async () => {
      const units: UnitOption[] = [];
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

  // ── Build unified list with Option B suppression ──
  const unified: UnifiedTask[] = [];

  // Personal tasks
  for (const t of personalTasks) {
    if (t.converted_to_quest_id || t.converted_to_subtask_id) continue;
    const ws = resolveWorkState(workItemsMap, "personal_task", t.id, t.status);
    if (ws === "DONE") continue; // Don't show DONE on homepage
    unified.push({
      id: t.id,
      title: t.title,
      workState: ws,
      source: "personal",
      priority: t.priority || "NONE",
      createdAt: t.created_at,
      convertedToQuestId: t.converted_to_quest_id,
      convertedToSubtaskId: t.converted_to_subtask_id,
    });
  }

  // Determine which quests have non-DONE subtasks (for Option B suppression)
  // A quest is hidden if ANY of its subtasks have work_state in {BACKLOG, TODO, IN_PROGRESS}
  const questSubtaskMap = new Map<string, { hasActiveSubtasks: boolean }>();
  for (const s of mySubtasks) {
    const ws = resolveWorkState(workItemsMap, "quest_subtask", s.id, s.status);
    if (ws !== "DONE") {
      questSubtaskMap.set(s.quest_id, { hasActiveSubtasks: true });
    }
  }

  // All quests (owned + participating, deduplicated)
  const allQuestsList = [
    ...myQuests.map((q: any) => ({ ...q, sourceLabel: "My Quest" })),
    ...participantQuests
      .filter((q: any) => !myQuests.some((mq: any) => mq.id === q.id))
      .map((q: any) => ({ ...q, sourceLabel: "Collaborator" })),
  ];

  for (const q of allQuestsList) {
    // Skip quests that are done, completed or cancelled
    const questStatus = (q as any).status;
    if (["COMPLETED", "CANCELLED", "DONE"].includes(questStatus)) continue;

    const hasActive = questSubtaskMap.get(q.id)?.hasActiveSubtasks || false;
    if (hasActive) continue; // Option B: hide parent quest, show subtasks instead

    const ws = resolveWorkState(workItemsMap, "quest", q.id);
    if (ws === "DONE") continue; // Don't show DONE on homepage

    unified.push({
      id: q.id,
      title: q.title,
      workState: ws,
      source: "quest",
      sourceLabel: q.sourceLabel,
      sourceId: q.id,
      priority: (q as any).priority || "NONE",
      guildId: (q as any).guild_id || null,
      guildName: (q as any).guilds?.name || null,
      guildLogo: (q as any).guilds?.logo_url || null,
    });
  }

  // Quest subtasks
  for (const s of mySubtasks) {
    const ws = resolveWorkState(workItemsMap, "quest_subtask", s.id, s.status);
    if (ws === "DONE") continue; // Don't show DONE on homepage
    unified.push({
      id: s.id,
      title: s.title,
      workState: ws,
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

  // Collect unique entities for entity filter chips
  const entityOptions = (() => {
    const map = new Map<string, { id: string; name: string; logo?: string | null }>();
    let hasPersonal = false;
    for (const t of unified) {
      if (t.guildId && t.guildName) {
        if (!map.has(t.guildId)) map.set(t.guildId, { id: t.guildId, name: t.guildName, logo: t.guildLogo });
      } else if (t.source === "personal") {
        hasPersonal = true;
      }
    }
    const opts: { id: string; name: string; logo?: string | null }[] = [];
    if (hasPersonal) opts.push({ id: "__personal__", name: "Personal" });
    for (const v of map.values()) opts.push(v);
    return opts;
  })();

  const toggleEntityFilter = (id: string) => {
    setEntityFilter((prev) => {
      // If currently showing all (empty set), switching means "select all except this one"
      if (prev.size === 0) {
        const allIds = entityOptions.map((e) => e.id);
        const next = new Set(allIds.filter((eid) => eid !== id));
        return next;
      }
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // If all are selected again, reset to empty (show all)
      if (next.size === entityOptions.length) return new Set<string>();
      return next;
    });
    setPage(0);
  };

  let filtered = filter === "all" ? [...unified] : unified.filter((t) => t.source === filter);
  // Hide backlog tasks by default
  if (hideBacklog) {
    filtered = filtered.filter((t) => t.workState !== "BACKLOG");
  }
  // Apply entity filter (multi-select, empty = show all)
  if (entityFilter.size > 0) {
    filtered = filtered.filter((t) => {
      if (t.guildId && entityFilter.has(t.guildId)) return true;
      if (!t.guildId && t.source === "personal" && entityFilter.has("__personal__")) return true;
      // For quests/subtasks without guild that aren't personal
      if (!t.guildId && t.source !== "personal" && entityFilter.has("__personal__")) return true;
      return false;
    });
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));
  }

  // Sort by Task Perspective columns: IN_PROGRESS → TODO → BACKLOG
  const STATUS_ORDER: Record<string, number> = { IN_PROGRESS: 0, TODO: 1, BACKLOG: 2, DONE: 3 };
  if (sortBy === "status") {
    filtered.sort((a, b) => (STATUS_ORDER[a.workState] ?? 9) - (STATUS_ORDER[b.workState] ?? 9));
  } else if (sortBy === "priority") {
    const PRIO_ORDER: Record<string, number> = { NONE: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    filtered.sort((a, b) => (PRIO_ORDER[a.priority || "NONE"] ?? 9) - (PRIO_ORDER[b.priority || "NONE"] ?? 9));
  }

  // Always float recently-added tasks to the top so user can configure them
  if (recentlyAddedIds.size > 0) {
    filtered.sort((a, b) => {
      const aRecent = recentlyAddedIds.has(a.id) ? 0 : 1;
      const bRecent = recentlyAddedIds.has(b.id) ? 0 : 1;
      return aRecent - bRecent;
    });
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeP = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safeP * PAGE_SIZE, (safeP + 1) * PAGE_SIZE);
  const isLoading = loadingPersonal || loadingQuests || loadingSubtasks;

  // ── Upsert work state ──
  const upsertWorkState = async (entityType: string, entityId: string, workState: TaskStatus) => {
    // Also update the underlying entity status for personal_tasks and quest_subtasks
    if (entityType === "personal_task") {
      const { error: ptErr } = await supabase.from("personal_tasks" as any).update({ status: workState } as any).eq("id", entityId);
      if (ptErr) console.error("[upsertWorkState] personal_tasks update failed:", ptErr);
      else console.log("[upsertWorkState] personal_tasks updated to", workState, "for", entityId);
    } else if (entityType === "quest_subtask") {
      const { error: stErr } = await supabase.from("quest_subtasks" as any).update({ status: workState } as any).eq("id", entityId);
      if (stErr) console.error("[upsertWorkState] quest_subtasks update failed:", stErr);
      else console.log("[upsertWorkState] quest_subtasks updated to", workState, "for", entityId);
    }
    // Do NOT update quests.status — quest lifecycle is decoupled

    // Upsert the user_work_items record
    const { error } = await supabase.from("user_work_items" as any).upsert({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      work_state: workState,
    } as any, { onConflict: "user_id,entity_type,entity_id" });
    if (error) console.error("[upsertWorkState] user_work_items upsert failed:", error);
    else console.log("[upsertWorkState] user_work_items upserted to", workState, "for", entityId);
  };

  // ── Actions ──
  const addTask = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    const { data, error } = await supabase.from("personal_tasks" as any).insert({
      user_id: userId,
      title: newTitle.trim(),
      status: "BACKLOG",
    } as any).select("id").single();
    if (error) { toast({ title: "Failed to add task", variant: "destructive" }); }
    else {
      setNewTitle("");
      // Track newly added task so it appears first
      if (data) {
        const newId = (data as any).id;
        setRecentlyAddedIds((prev) => new Set(prev).add(newId));
        // Clear "recently added" flag after 30s so normal sort resumes
        setTimeout(() => setRecentlyAddedIds((prev) => { const next = new Set(prev); next.delete(newId); return next; }), 30000);
        await supabase.from("user_work_items" as any).insert({
          user_id: userId,
          entity_type: "personal_task",
          entity_id: newId,
          work_state: "BACKLOG",
        } as any);
      }
      qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
      qc.invalidateQueries({ queryKey: ["user-work-items", userId] });
    }
    setAdding(false);
  };

  const handleStatusChange = async (task: UnifiedTask, newWorkState: string) => {
    if (newWorkState === "DONE") {
      // Immediately commit DONE and mark in session for crossed-out display
      const key = `${task.source}-${task.id}`;
      setSessionDone((prev) => new Set(prev).add(key));
      const entityType = task.source === "personal" ? "personal_task" : task.source === "quest" ? "quest" : "quest_subtask";
      await upsertWorkState(entityType, task.id, "DONE");

      // Auto-log contribution for subtask completion
      if (task.source === "subtask" && userId) {
        try {
          const { data: subtask } = await supabase
            .from("quest_subtasks" as any)
            .select("id, title, quest_id, credit_reward, assignee_user_id")
            .eq("id", task.id)
            .single();

          if (subtask) {
            const { data: quest } = await supabase
              .from("quests" as any)
              .select("guild_id")
              .eq("id", (subtask as any).quest_id)
              .single();

            const wu = Number((subtask as any).credit_reward) || 1;
            const logTitle = "✓ " + (subtask as any).title;

            // Deduplication guard
            const { data: existing } = await supabase
              .from("contribution_logs" as any)
              .select("id")
              .eq("quest_id", (subtask as any).quest_id)
              .eq("user_id", userId)
              .eq("contribution_type", "subtask_completed")
              .eq("title", logTitle)
              .limit(1);

            if (!existing || existing.length === 0) {
              await supabase.from("contribution_logs" as any).insert({
                user_id: userId,
                quest_id: (subtask as any).quest_id,
                guild_id: (quest as any)?.guild_id ?? null,
                contribution_type: "subtask_completed",
                title: logTitle,
                task_type: "general",
                base_units: wu,
                weight_factor: 1.0,
                weighted_units: wu,
                ip_licence: "CC-BY-SA",
              } as any);
            }

            qc.invalidateQueries({ queryKey: ["contribution-logs"] });
          }
        } catch (e) {
          console.warn("[auto-log] contribution log failed", e);
        }
      }

      // Invalidate Work hub queries so status is reflected there too
      qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
      qc.invalidateQueries({ queryKey: ["my-subtasks", userId] });
      qc.invalidateQueries({ queryKey: ["my-subtasks-home", userId] });
      qc.invalidateQueries({ queryKey: ["user-work-items", userId] });
      return;
    }

    // Update work state (does NOT change quest lifecycle)
    const entityType = task.source === "personal" ? "personal_task" : task.source === "quest" ? "quest" : "quest_subtask";
    await upsertWorkState(entityType, task.id, newWorkState as TaskStatus);
    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
    qc.invalidateQueries({ queryKey: ["my-subtasks-home", userId] });
    qc.invalidateQueries({ queryKey: ["user-work-items", userId] });
  };

  const handleCheckboxToggle = (task: UnifiedTask, checked: boolean) => {
    if (checked) {
      setShowConfetti(true);
      const key = `${task.source}-${task.id}`;
      toast({
        title: "Task completed ✓",
        description: task.source === "subtask"
          ? ((task as any).guildName ? `Contribution logged in ${(task as any).guildName}` : "Contribution logged to quest")
          : task.title,
        action: (
          <ToastAction
            altText="Undo"
            onClick={() => {
              setSessionDone((prev) => {
                const next = new Set(prev);
                next.delete(key);
                return next;
              });
              const entityType = task.source === "personal" ? "personal_task" : task.source === "quest" ? "quest" : "quest_subtask";
              upsertWorkState(entityType, task.id, task.workState || "TODO");
              qc.invalidateQueries({ queryKey: ["user-work-items", userId] });
              qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
              qc.invalidateQueries({ queryKey: ["my-subtasks-home", userId] });
            }}
          >
            Undo
          </ToastAction>
        ),
      });
    }
    handleStatusChange(task, checked ? "DONE" : "TODO");
  };

  const deleteTask = async (task: UnifiedTask) => {
    try {
      if (task.source === "personal") {
        const { error } = await supabase.from("personal_tasks" as any).delete().eq("id", task.id);
        if (error) throw error;
        await supabase.from("user_work_items" as any).delete()
          .eq("user_id", userId)
          .eq("entity_type", "personal_task")
          .eq("entity_id", task.id);
        qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
      } else if (task.source === "subtask") {
        const { error } = await supabase.from("quest_subtasks" as any).delete().eq("id", task.id);
        if (error) throw error;
        await supabase.from("user_work_items" as any).delete()
          .eq("user_id", userId)
          .eq("entity_type", "quest_subtask")
          .eq("entity_id", task.id);
        qc.invalidateQueries({ queryKey: ["my-subtasks-home", userId] });
      } else if (task.source === "quest") {
        const { error } = await supabase.from("quests").update({ is_deleted: true } as any).eq("id", task.id);
        if (error) throw error;
        await supabase.from("user_work_items" as any).delete()
          .eq("user_id", userId)
          .eq("entity_type", "quest")
          .eq("entity_id", task.id);
        qc.invalidateQueries({ queryKey: ["my-active-quests-home", userId] });
        qc.invalidateQueries({ queryKey: ["my-participant-quests-home", userId] });
      }
      qc.invalidateQueries({ queryKey: ["user-work-items", userId] });
      toast({ title: "Task deleted" });
    } catch (err: any) {
      console.error("Delete task error:", err);
      toast({ title: "Failed to delete task", description: err?.message || "Unknown error", variant: "destructive" });
    }
  };

  const updatePriority = async (task: UnifiedTask, priority: Priority) => {
    if (task.source === "personal") {
      await supabase.from("personal_tasks" as any).update({ priority } as any).eq("id", task.id);
      qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
    } else if (task.source === "quest") {
      await supabase.from("quests").update({ priority } as any).eq("id", task.id);
      qc.invalidateQueries({ queryKey: ["my-active-quests-home", userId] });
      qc.invalidateQueries({ queryKey: ["my-participant-quests-home", userId] });
      qc.invalidateQueries({ queryKey: ["my-active-quests", userId] });
    } else if (task.source === "subtask") {
      await supabase.from("quest_subtasks" as any).update({ priority } as any).eq("id", task.id);
      qc.invalidateQueries({ queryKey: ["my-subtasks-home", userId] });
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
      qc.invalidateQueries({ queryKey: ["my-active-quests-home", userId] });
      qc.invalidateQueries({ queryKey: ["my-participant-quests-home", userId] });
    } else if (editingSource === "subtask") {
      await supabase.from("quest_subtasks" as any).update({ title: trimmed } as any).eq("id", editingId);
      qc.invalidateQueries({ queryKey: ["my-subtasks-home", userId] });
    }
    setEditingId(null);
  };

  const openUnitPicker = (task: UnifiedTask) => {
    setPendingConvertTask(task);
    setConvertStep("unit");
    setConvertSelectedUnit(null);
    setConvertTopics([]);
    setConvertTerritories([]);
    setConvertBudget("");
    setConvertGuildPercent(15);
    setConvertTerritoryPercent(10);
    setConvertCtgPercent(5);
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

    const existingQuestId = pendingConvertTask.convertedToQuestId;

    if (existingQuestId) {
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

      qc.invalidateQueries({ queryKey: ["my-active-quests-home", userId] });
      setConverting(false);
      setUnitPickerOpen(false);
      setPendingConvertTask(null);
      toast({ title: "Quest reattached!" });
      navigate(`/quests/${existingQuestId}`);
      return;
    }

    // New conversion: create quest with lifecycle status OPEN_FOR_PROPOSALS
    const insertPayload: any = {
      title: pendingConvertTask.title,
      created_by_user_id: userId,
      is_draft: false,
      status: "OPEN_FOR_PROPOSALS",
      coin_budget: parseFloat(convertBudget) || 0,
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

    // Create work item for new quest with BACKLOG
    await supabase.from("user_work_items" as any).insert({
      user_id: userId,
      entity_type: "quest",
      entity_id: questId,
      work_state: "BACKLOG",
    } as any);

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
    qc.invalidateQueries({ queryKey: ["my-active-quests-home", userId] });
    qc.invalidateQueries({ queryKey: ["user-work-items", userId] });

    // Auto contribution log for quest creation
    try {
      await supabase.from("contribution_logs" as any).insert({
        user_id: userId,
        quest_id: questId,
        contribution_type: "other",
        title: "Quest created from personal task",
        task_type: "coordination",
        base_units: 1,
        weight_factor: 1.0,
        weighted_units: 1.0,
        ip_licence: "CC-BY-SA",
      } as any);
      qc.invalidateQueries({ queryKey: ["contribution-logs"] });
    } catch (e) {
      console.error("Auto contribution log failed:", e);
    }

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
      status: "BACKLOG",
      order_index: 0,
    } as any).select("id").single();
    if (error) { toast({ title: "Failed to create subtask", variant: "destructive" }); return; }
    // Create work item for new subtask
    if (data) {
      await supabase.from("user_work_items" as any).insert({
        user_id: userId,
        entity_type: "quest_subtask",
        entity_id: (data as any).id,
        work_state: "BACKLOG",
      } as any);
    }
    await supabase.from("personal_tasks" as any).update({
      converted_to_subtask_id: (data as any).id,
    } as any).eq("id", task.id);
    qc.invalidateQueries({ queryKey: ["personal-tasks", userId] });
    qc.invalidateQueries({ queryKey: ["my-subtasks-home", userId] });
    qc.invalidateQueries({ queryKey: ["user-work-items", userId] });
    toast({ title: "Task attached as subtask!" });
  };

  // All quests for subtask picker
  const allQuestsForPicker = [
    ...myQuests.map((q: any) => ({ id: q.id, title: q.title, guildName: q.guilds?.name || null, guildLogo: q.guilds?.logo_url || null })),
    ...participantQuests.filter((q: any) => !myQuests.some((mq: any) => mq.id === q.id)).map((q: any) => ({ id: q.id, title: q.title, guildName: q.guilds?.name || null, guildLogo: q.guilds?.logo_url || null })),
  ];

  // Quest picker dialog state
  const [questPickerOpen, setQuestPickerOpen] = useState(false);
  const [questPickerTask, setQuestPickerTask] = useState<UnifiedTask | null>(null);
  const [questPickerSearch, setQuestPickerSearch] = useState("");

  const todoCount = unified.filter((t) => t.workState === "TODO").length;
  const inProgressCount = unified.filter((t) => t.workState === "IN_PROGRESS").length;

  const unitIcon = (type: string) => {
    if (type === "GUILD") return <Users className="h-4 w-4 text-primary" />;
    if (type === "COMPANY") return <Building2 className="h-4 w-4 text-primary" />;
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="font-display text-base sm:text-lg font-semibold flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          {t("home.myTasks")}
          {(todoCount > 0 || inProgressCount > 0) && (
            <Badge variant="secondary" className="text-xs ml-1">
              {todoCount + inProgressCount} active
            </Badge>
          )}
          {todayGoals.size > 0 && (
            <Badge variant="outline" className="text-xs ml-1 border-amber-400/50 text-amber-600">
              ☀ {todayGoals.size} today
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
            <SelectTrigger className="w-[100px] sm:w-[130px] h-8 text-xs">
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
            <span className="hidden xs:inline">{sortBy === "status" ? "Status" : sortBy === "priority" ? "Priority" : "Recent"}</span>
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

      {/* Entity filter chips */}
      {entityOptions.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {entityOptions.map((ent) => {
            const active = entityFilter.size === 0 || entityFilter.has(ent.id);
            return (
              <button
                key={ent.id}
                onClick={() => toggleEntityFilter(ent.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {ent.id === "__personal__" ? (
                  <User className="h-3 w-3" />
                ) : ent.logo ? (
                  <img src={ent.logo} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                ) : (
                  <Users className="h-3 w-3" />
                )}
                {ent.name}
              </button>
            );
          })}
          {entityFilter.size > 0 && (
            <button
              onClick={() => setEntityFilter(new Set())}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" /> Clear
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
        <>
        {/* Desktop table */}
        <div className="hidden sm:block rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-0">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-7 sm:w-8 px-1.5 sm:px-3 py-1.5 sm:py-2"></th>
                <th className="w-7 sm:w-8 px-1 py-1.5 sm:py-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex flex-col items-center gap-0.5 cursor-help">
                        <Sun className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-amber-500" />
                        <span className="text-[9px] text-amber-500 font-medium leading-none">Today</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Mark as today's focus — resets at 9am
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="w-7 sm:w-8 px-1 py-1.5 sm:py-2"></th>
                <th className="text-left px-1.5 sm:px-3 py-1.5 sm:py-2 font-medium">Task</th>
                <th className="text-left px-2 sm:px-3 py-1.5 sm:py-2 font-medium hidden sm:table-cell">Source</th>
                <th className="text-left px-1.5 md:px-3 py-1.5 sm:py-2 font-medium w-[36px] md:w-[130px]"><span className="hidden md:inline">Status</span></th>
                <th className="w-7 sm:w-10 px-1 sm:px-3 py-1.5 sm:py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let lastGroup = "";
                const STATUS_GROUP_LABELS: Record<string, { icon: string; label: string }> = {
                  IN_PROGRESS: { icon: "●", label: "In Progress" },
                  TODO: { icon: "○", label: "To Do" },
                  BACKLOG: { icon: "·", label: "Backlog" },
                  DONE: { icon: "✓", label: "Done" },
                };
                return paginated.flatMap((task) => {
                const key = `${task.source}-${task.id}`;
                const isDoneThisSession = sessionDone.has(key);
                const rows: React.ReactNode[] = [];

                // Group separator row
                if (sortBy === "status" && task.workState !== lastGroup) {
                  lastGroup = task.workState;
                  const group = STATUS_GROUP_LABELS[task.workState] || { icon: "·", label: task.workState };
                  rows.push(
                    <tr key={`group-${task.workState}`} className="border-t border-border">
                      <td colSpan={7} className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-3 py-1 bg-muted/20">
                        {group.icon} {group.label}
                      </td>
                    </tr>
                  );
                }

                if (isDoneThisSession) {
                  rows.push(
                    <tr key={key} className="border-t border-border bg-muted/30">
                      <td colSpan={7} className="px-3 py-2.5">
                        <span className="text-sm text-muted-foreground line-through">{task.title}</span>
                      </td>
                    </tr>
                  );
                  return rows;
                }

                rows.push(
                <tr key={key} className={cn("border-t border-border group hover:bg-accent/30 transition-colors", todayGoals.has(key) && "bg-amber-500/5")}>
                  <td className="px-1.5 sm:px-3 py-1.5 sm:py-2.5">
                    <Checkbox
                      checked={task.workState === "DONE"}
                      onCheckedChange={(checked) => handleCheckboxToggle(task, !!checked)}
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                    />
                  </td>
                  <td className="px-1 py-1.5 sm:py-2.5 text-center">
                    <Checkbox
                      checked={todayGoals.has(key)}
                      onCheckedChange={() => toggleTodayGoal(key, task.source === "personal" ? "personal_task" : task.source === "quest" ? "quest" : "quest_subtask", task.id)}
                      className={cn(
                        "h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-sm border-amber-400/60 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500",
                      )}
                    />
                  </td>
                  <td className="px-1 py-1.5 sm:py-2.5">
                    <PriorityPicker
                      value={task.priority || "NONE"}
                      onChange={(p) => updatePriority(task, p)}
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
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            "text-xs sm:text-sm cursor-pointer line-clamp-2 break-words",
                            task.workState === "DONE" && "line-through text-muted-foreground",
                          )}
                          onDoubleClick={() => startEditing(task)}
                        >
                          {task.title}
                        </span>
                        <button
                          onClick={() => startEditing(task)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity shrink-0"
                          title="Edit title"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        {task.convertedToQuestId && (
                          <Badge variant="outline" className="ml-1 sm:ml-2 text-[9px] sm:text-[10px]">→ Quest</Badge>
                        )}
                        {task.convertedToSubtaskId && (
                          <Badge variant="outline" className="ml-1 sm:ml-2 text-[9px] sm:text-[10px]">→ Subtask</Badge>
                        )}
                      </div>
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
                  <td className="px-1.5 md:px-3 py-1.5 md:py-2.5">
                    <Select
                      value={task.workState}
                      onValueChange={(v) => handleStatusChange(task, v)}
                    >
                      <SelectTrigger className={cn(
                        "h-7 w-8 md:w-[120px] text-[10px] font-medium px-1.5 md:px-2.5 py-0 border-none shadow-none rounded-full gap-1 [&>svg:last-child]:h-3 [&>svg:last-child]:w-3 [&>svg:last-child]:hidden md:[&>svg:last-child]:block [&>svg:last-child]:shrink-0",
                        STATUS_COLORS[task.workState] || STATUS_COLORS.TODO,
                      )}>
                        <span className="flex items-center justify-center md:hidden">
                          {task.workState === "BACKLOG" && <Circle className="h-3.5 w-3.5" />}
                          {task.workState === "TODO" && <CircleDot className="h-3.5 w-3.5" />}
                          {task.workState === "IN_PROGRESS" && <Timer className="h-3.5 w-3.5" />}
                          {task.workState === "DONE" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </span>
                        <span className="hidden md:inline truncate">
                          {task.workState === "BACKLOG" ? "Backlog" : task.workState === "TODO" ? "To do next" : task.workState === "IN_PROGRESS" ? "In progress" : "Done"}
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
                  <td className="px-0.5 sm:px-3 py-1.5 sm:py-2.5">
                    <div className="flex items-center gap-0.5">
                      {task.source === "personal" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Convert to Quest"
                            onClick={() => openUnitPicker(task)}
                          >
                            <Rocket className="h-3.5 w-3.5 text-primary/60" />
                          </Button>
                          {allQuestsForPicker.length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100"
                              title="Attach to Quest"
                              onClick={() => { setQuestPickerTask(task); setQuestPickerOpen(true); setQuestPickerSearch(""); }}
                            >
                              <ListChecks className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                      {(task.source === "quest" || task.source === "subtask") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100"
                          onClick={() => navigate(task.source === "quest" ? `/quests/${task.sourceId || task.id}` : `/quests/${task.questId}?tab=subtasks`)}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => setTaskToDelete(task)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
                return rows;
              });
              })()}
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

        {/* Mobile card view */}
        <div className="sm:hidden space-y-2">
          {paginated.map((task) => {
            const key = `${task.source}-${task.id}`;
            const isDoneThisSession = sessionDone.has(key);
            if (isDoneThisSession) {
              return (
                <div key={key} className="rounded-lg border border-border p-3 bg-muted/30">
                  <span className="text-sm text-muted-foreground line-through">{task.title}</span>
                </div>
              );
            }
            return (
              <div key={key} className={cn("rounded-lg border border-border p-3 flex items-start gap-2 group", todayGoals.has(key) && "bg-amber-500/5")}>
                <Checkbox
                  checked={task.workState === "DONE"}
                  onCheckedChange={(checked) => handleCheckboxToggle(task, !!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium line-clamp-2">{task.title}</span>
                  {task.sourceLabel && <span className="text-[10px] text-muted-foreground block mt-0.5">{task.sourceLabel}</span>}
                </div>
                <Select value={task.workState} onValueChange={(v) => handleStatusChange(task, v)}>
                  <SelectTrigger className={cn(
                    "h-7 w-8 text-[10px] font-medium px-1.5 py-0 border-none shadow-none rounded-full [&>svg:last-child]:hidden",
                    STATUS_COLORS[task.workState] || STATUS_COLORS.TODO,
                  )}>
                    <span className="flex items-center justify-center">
                      {task.workState === "BACKLOG" && <Circle className="h-3.5 w-3.5" />}
                      {task.workState === "TODO" && <CircleDot className="h-3.5 w-3.5" />}
                      {task.workState === "IN_PROGRESS" && <Timer className="h-3.5 w-3.5" />}
                      {task.workState === "DONE" && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BACKLOG"><span className="flex items-center gap-1.5"><Circle className="h-3 w-3" /> Backlog</span></SelectItem>
                    <SelectItem value="TODO"><span className="flex items-center gap-1.5"><CircleDot className="h-3 w-3" /> To do next</span></SelectItem>
                    <SelectItem value="IN_PROGRESS"><span className="flex items-center gap-1.5"><Timer className="h-3 w-3" /> In progress</span></SelectItem>
                    <SelectItem value="DONE"><span className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Done</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
          {/* Mobile pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1 py-2">
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
        </>
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
                : convertStep === "tags"
                ? "Select topics and territories for this quest."
                : "Configure the budget and value distribution for this quest."}
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
                <Button size="sm" onClick={() => setConvertStep("budget")} className="flex-1">
                  Next →
                </Button>
              </div>
            </div>
          )}

          {convertStep === "budget" && (
            <div className="space-y-4 py-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Budget & Value Split
              </h3>

              <div className="space-y-1.5">
                <Label className="text-xs">Budget 🌱 $CTG</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={convertBudget}
                  onChange={(e) => setConvertBudget(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Guild share</Label>
                    <span className="text-xs font-medium text-muted-foreground">{convertGuildPercent}%</span>
                  </div>
                  <Slider min={0} max={30} step={1} value={[convertGuildPercent]} onValueChange={([v]) => setConvertGuildPercent(v)} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Territory share</Label>
                    <span className="text-xs font-medium text-muted-foreground">{convertTerritoryPercent}%</span>
                  </div>
                  <Slider min={0} max={20} step={1} value={[convertTerritoryPercent]} onValueChange={([v]) => setConvertTerritoryPercent(v)} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Commons share</Label>
                    <span className="text-xs font-medium text-muted-foreground">{convertCtgPercent}%</span>
                  </div>
                  <Slider min={0} max={15} step={1} value={[convertCtgPercent]} onValueChange={([v]) => setConvertCtgPercent(v)} />
                </div>
                <p className="text-sm font-bold text-emerald-600">
                  Contributor share: {100 - convertGuildPercent - convertTerritoryPercent - convertCtgPercent}%
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setConvertStep("tags")} className="flex-1">
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConvertBudget("0");
                    setConvertGuildPercent(15);
                    setConvertTerritoryPercent(10);
                    setConvertCtgPercent(5);
                    finalizeConvertToQuest();
                  }}
                  disabled={converting}
                  className="text-xs text-muted-foreground"
                >
                  Skip
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
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. "{taskToDelete?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (taskToDelete) {
                  deleteTask(taskToDelete);
                  setTaskToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confetti on task completion */}
      {showConfetti && <ConfettiSpark onDone={() => setShowConfetti(false)} />}
    </div>
  );
}
