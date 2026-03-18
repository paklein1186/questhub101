import { Link } from "react-router-dom";
import { Loader2, Swords, Users, GraduationCap, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── My Quests (created + joined) ──
export function MyQuestsTab({ userId }: { userId: string }) {
  const { data: created = [], isLoading: l1 } = useQuery({
    queryKey: ["my-quests-created", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quests")
        .select("id, title, status, reward_xp, created_at, is_draft, coin_budget, credit_budget")
        .eq("created_by_user_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
  });

  const { data: joined = [], isLoading: l2 } = useQuery({
    queryKey: ["my-quests-joined", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_participants")
        .select("quest_id, role, status, quests(id, title, status, reward_xp)")
        .eq("user_id", userId);
      return (data ?? []).map((r: any) => ({ ...r.quests, participantRole: r.role, participantStatus: r.status })).filter(Boolean);
    },
    enabled: !!userId,
  });

  const loading = l1 || l2;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2"><Swords className="h-5 w-5" /> Quests I Created</h3>
        <Button size="sm" asChild><Link to="/quests/new"><Plus className="h-4 w-4 mr-1" /> New quest</Link></Button>
      </div>
      {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {!loading && created.length === 0 && <p className="text-sm text-muted-foreground">No quests created yet.</p>}
      <div className="space-y-2">
        {created.map((q: any) => (
          <Link key={q.id} to={`/quests/${q.id}`} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
            <div>
              <p className="text-sm font-medium">{q.title}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">{q.reward_xp} XP reward</p>
                {q.coin_budget > 0 && <Badge variant="outline" className="text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800 text-[10px]">🟩 {q.coin_budget.toLocaleString()} Coins</Badge>}
                {q.credit_budget > 0 && <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">🌱 {q.credit_budget} $CTG</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {q.is_draft && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
              <Badge variant="outline" className="text-[10px] capitalize">{q.status?.toLowerCase()}</Badge>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><Swords className="h-5 w-5" /> Quests I Joined</h3>
        {!loading && joined.length === 0 && <p className="text-sm text-muted-foreground">You haven't joined any quests yet.</p>}
        <div className="space-y-2">
          {joined.map((q: any) => (
            <Link key={q.id} to={`/quests/${q.id}`} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">{q.title}</p>
                <p className="text-xs text-muted-foreground">Role: {q.participantRole} · {q.participantStatus}</p>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize">{q.status?.toLowerCase()}</Badge>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── My Guilds ──
export function MyGuildsTab({ userId }: { userId: string }) {
  const { data: guilds = [], isLoading } = useQuery({
    queryKey: ["my-guilds", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("guild_members")
        .select("role, guilds(id, name, logo_url, type)")
        .eq("user_id", userId);
      return (data ?? []).map((r: any) => ({ ...r.guilds, memberRole: r.role })).filter(Boolean);
    },
    enabled: !!userId,
  });

  return (
    <div>
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><Users className="h-5 w-5" /> My Guilds</h3>
      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {!isLoading && guilds.length === 0 && <p className="text-sm text-muted-foreground">You're not a member of any guilds yet. <Link to="/explore" className="text-primary hover:underline">Explore guilds</Link></p>}
      <div className="space-y-2">
        {guilds.map((g: any) => (
          <Link key={g.id} to={`/guilds/${g.id}`} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
            <div>
              <p className="text-sm font-medium">{g.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{g.type?.toLowerCase()}</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{g.memberRole}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── My Pods ──
export function MyPodsTab({ userId }: { userId: string }) {
  const { data: pods = [], isLoading } = useQuery({
    queryKey: ["my-pods", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pod_members")
        .select("role, pods(id, name, type, start_date, end_date)")
        .eq("user_id", userId);
      return (data ?? []).map((r: any) => ({ ...r.pods, memberRole: r.role })).filter(Boolean);
    },
    enabled: !!userId,
  });

  return (
    <div>
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-4"><Users className="h-5 w-5" /> My Pods</h3>
      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {!isLoading && pods.length === 0 && <p className="text-sm text-muted-foreground">You're not in any pods yet. <Link to="/explore" className="text-primary hover:underline">Explore pods</Link></p>}
      <div className="space-y-2">
        {pods.map((p: any) => (
          <Link key={p.id} to={`/pods/${p.id}`} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
            <div>
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{p.type?.toLowerCase().replace(/_/g, " ")}</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{p.memberRole}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── My Courses (enrolled + teaching) ──
export function MyCoursesTab({ userId }: { userId: string }) {
  const { data: enrolled = [], isLoading: l1 } = useQuery({
    queryKey: ["my-courses-enrolled", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_enrollments")
        .select("progress_percent, completed_at, courses(id, title, level)")
        .eq("user_id", userId);
      return (data ?? []).map((r: any) => ({ ...r.courses, progress: r.progress_percent, completed: !!r.completed_at })).filter(Boolean);
    },
    enabled: !!userId,
  });

  const { data: teaching = [], isLoading: l2 } = useQuery({
    queryKey: ["my-courses-teaching", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, level, is_published, is_free")
        .eq("owner_user_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
  });

  const loading = l1 || l2;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Courses I Teach</h3>
        <Button size="sm" asChild><Link to="/courses/new"><Plus className="h-4 w-4 mr-1" /> New course</Link></Button>
      </div>
      {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {!loading && teaching.length === 0 && <p className="text-sm text-muted-foreground">No courses created yet.</p>}
      <div className="space-y-2">
        {teaching.map((c: any) => (
          <Link key={c.id} to={`/courses/${c.id}`} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
            <div>
              <p className="text-sm font-medium">{c.title}</p>
              <p className="text-xs text-muted-foreground capitalize">{c.level?.toLowerCase()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={c.is_published ? "default" : "secondary"} className="text-[10px]">{c.is_published ? "Published" : "Draft"}</Badge>
              <Badge variant="outline" className="text-[10px]">{c.is_free ? "Free" : "Paid"}</Badge>
            </div>
          </Link>
        ))}
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3"><GraduationCap className="h-5 w-5" /> Courses I'm Taking</h3>
        {!loading && enrolled.length === 0 && <p className="text-sm text-muted-foreground">You haven't enrolled in any courses. <Link to="/explore" className="text-primary hover:underline">Browse courses</Link></p>}
        <div className="space-y-2">
          {enrolled.map((c: any) => (
            <Link key={c.id} to={`/courses/${c.id}`} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">{c.progress}% complete</p>
              </div>
              <Badge variant={c.completed ? "default" : "secondary"} className="text-[10px]">{c.completed ? "Completed" : "In progress"}</Badge>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
