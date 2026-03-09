import { useQuery } from "@tanstack/react-query";
import { SectionBanner, HINTS } from "@/components/onboarding/ContextualHint";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Coins, Users, Scale, TrendingUp, TrendingDown, Leaf, PieChart as PieIcon, BarChart3, Gauge } from "lucide-react";
import { useState, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { useGuildWeights, DEFAULT_TASK_TYPES } from "@/hooks/useValuePie";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

const PIE_COLORS = [
  "hsl(142, 70%, 45%)", "hsl(200, 70%, 50%)", "hsl(262, 60%, 55%)",
  "hsl(25, 80%, 50%)", "hsl(340, 65%, 50%)", "hsl(45, 80%, 50%)",
  "hsl(170, 60%, 40%)", "hsl(300, 50%, 50%)", "hsl(220, 60%, 55%)",
  "hsl(80, 60%, 45%)",
];

interface Props {
  guildId: string;
  guildName: string;
  isMember?: boolean;
  currentUserId?: string;
}

interface ContributorAgg {
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_weighted_units: number;
  total_coins: number;
  total_xp: number;
  contribution_count: number;
}

interface QuestAgg {
  quest_id: string;
  quest_title: string;
  territory_name: string | null;
  budget_coins: number;
  contributor_count: number;
  guild_share: number;
  value_pie_calculated: boolean;
  verification_ratio: number | null;
}

interface TaskTypeAgg {
  task_type: string;
  total_weighted_units: number;
  count: number;
}

interface TerritoryAgg {
  territory_name: string;
  total_tokens: number;
}

const TASK_TYPE_EMOJI: Record<string, string> = {
  research: "🔬", facilitation: "🤝", coordination: "📅", creative: "🎨",
  admin: "📋", risk: "⚡", development: "💻", design: "✏️",
  testing: "🧪", documentation: "📄",
};

const TASK_TYPE_EXAMPLES: Record<string, string> = {
  research: "Document analysis", facilitation: "Workshop facilitation", coordination: "Sprint planning",
  creative: "Visual creation", admin: "Administrative management", risk: "Risk assessment",
  development: "Code & integration", design: "UI/UX mockups", testing: "Testing & QA", documentation: "Documentation writing",
};

export function GuildOVNTab({ guildId, guildName, isMember, currentUserId }: Props) {
  const [includeExternal, setIncludeExternal] = useState(false);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [proposalTaskType, setProposalTaskType] = useState("");
  const [proposalWeight, setProposalWeight] = useState("1.0");
  const [proposalJustification, setProposalJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const { data: guildWeights = [] } = useGuildWeights(guildId);

  // ── Barème helpers ──────────────────────────────────────────
  const weightMap = useMemo(() => {
    const m = new Map<string, number>();
    guildWeights.forEach((w) => m.set(w.task_type, w.weight_factor));
    return m;
  }, [guildWeights]);

  const currentWeightForProposal = proposalTaskType ? (weightMap.get(proposalTaskType) ?? 1.0) : 1.0;

  const handleSubmitProposal = async () => {
    if (!currentUserId || !proposalTaskType || proposalJustification.length < 20) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("guild_decisions" as any).insert({
        guild_id: guildId,
        proposed_by: currentUserId,
        type: "weight_change",
        title: `Change weight of ${proposalTaskType} from ${currentWeightForProposal} to ${proposalWeight}`,
        description: proposalJustification,
        status: "open",
      });
      if (error) throw error;
      toast({ title: "Proposal submitted to guild members" });
      setShowProposalDialog(false);
      setProposalTaskType("");
      setProposalWeight("1.0");
      setProposalJustification("");
    } catch (e) {
      toast({ title: "Error", description: "Unable to submit the proposal", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Fetch all quest IDs affiliated with this guild
  const { data: questIds = [] } = useQuery({
    queryKey: ["guild-ovn-quests", guildId, includeExternal],
    queryFn: async () => {
      // Primary: quest_hosts where entity_id = guildId
      const { data: hosts } = await supabase
        .from("quest_hosts" as any)
        .select("quest_id")
        .eq("entity_id", guildId);

      const ids = new Set<string>((hosts || []).map((h: any) => h.quest_id));

      // Also quest_affiliations
      const { data: affiliations } = await supabase
        .from("quest_affiliations" as any)
        .select("quest_id")
        .eq("entity_id", guildId)
        .eq("status", "APPROVED");
      (affiliations || []).forEach((a: any) => ids.add(a.quest_id));

      // Contribution logs with guild_id (external contributors from this guild)
      if (includeExternal) {
        const { data: guildContribs } = await supabase
          .from("contribution_logs" as any)
          .select("quest_id")
          .eq("guild_id", guildId)
          .not("quest_id", "is", null);
        (guildContribs || []).forEach((c: any) => ids.add(c.quest_id));
      }

      return Array.from(ids);
    },
  });

  const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 0;

  // 2. Fetch contribution_logs for these quests
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["guild-ovn-data", guildId, questIds, period],
    enabled: questIds.length > 0,
    queryFn: async () => {
      // Contribution logs (with period filter)
      let contribQuery = supabase
        .from("contribution_logs" as any)
        .select("user_id, quest_id, weighted_units, xp_earned, task_type, hours_logged, created_at, status")
        .in("quest_id", questIds);

      if (period !== "all") {
        const since = new Date();
        since.setDate(since.getDate() - periodDays);
        contribQuery = contribQuery.gte("created_at", since.toISOString());
      }
      const { data: contribs } = await contribQuery;

      // Previous period contribs (for velocity comparison)
      let prevContribs: any[] = [];
      if (period !== "all" && periodDays > 0) {
        const prevEnd = new Date();
        prevEnd.setDate(prevEnd.getDate() - periodDays);
        const prevStart = new Date();
        prevStart.setDate(prevStart.getDate() - periodDays * 2);
        const { data: prev } = await supabase
          .from("contribution_logs" as any)
          .select("weighted_units")
          .in("quest_id", questIds)
          .gte("created_at", prevStart.toISOString())
          .lt("created_at", prevEnd.toISOString());
        prevContribs = prev || [];
      }

      // Value pie logs
      const { data: pieLogs } = await supabase
        .from("quest_value_pie_log" as any)
        .select("contributor_id, quest_id, coins_awarded, weighted_units, share_percent")
        .in("quest_id", questIds);

      // Quests metadata
      const { data: quests } = await supabase
        .from("quests" as any)
        .select("id, title, coin_budget, guild_percent, value_pie_calculated, territory_id")
        .in("id", questIds);

      // Profiles
      const userIds = [...new Set([
        ...((contribs || []).map((c: any) => c.user_id)),
        ...((pieLogs || []).map((p: any) => p.contributor_id)),
      ])];
      let profileMap = new Map<string, { name: string; avatar_url: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);
        profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      }

      // Territories
      const territoryIds = [...new Set((quests || []).map((q: any) => q.territory_id).filter(Boolean))];
      let territoryMap = new Map<string, string>();
      if (territoryIds.length > 0) {
        const { data: territories } = await supabase
          .from("territories")
          .select("id, name")
          .in("id", territoryIds);
        territoryMap = new Map((territories || []).map((t) => [t.id, t.name]));
      }

      return { contribs: contribs || [], pieLogs: pieLogs || [], quests: quests || [], profileMap, territoryMap, prevContribs };
    },
  });

  if (isLoading || !rawData) {
    return <p className="text-sm text-muted-foreground p-4">Loading contribution ledger…</p>;
  }

  const { contribs, pieLogs, quests, profileMap, territoryMap, prevContribs } = rawData;

  // ── Aggregate Contributors ────────────────────────────────
  const contributorMap = new Map<string, ContributorAgg>();
  contribs.forEach((c: any) => {
    const existing = contributorMap.get(c.user_id) || {
      user_id: c.user_id,
      name: profileMap.get(c.user_id)?.name || "Unknown",
      avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
      total_weighted_units: 0,
      total_coins: 0,
      total_xp: 0,
      contribution_count: 0,
    };
    existing.total_weighted_units += Number(c.weighted_units) || 0;
    existing.total_xp += Number(c.xp_earned) || 0;
    existing.contribution_count += 1;
    contributorMap.set(c.user_id, existing);
  });

  // Merge $CTG tokens from pie logs
  pieLogs.forEach((p: any) => {
    const existing = contributorMap.get(p.contributor_id);
    if (existing) {
      existing.total_coins += Number(p.coins_awarded) || 0;
    }
  });

  const contributors = Array.from(contributorMap.values()).sort((a, b) => b.total_weighted_units - a.total_weighted_units);

  // ── Headline Metrics ──────────────────────────────────────
  const totalWeightedUnits = contributors.reduce((s, c) => s + c.total_weighted_units, 0);
  const totalCoins = contributors.reduce((s, c) => s + c.total_coins, 0);
  const totalContributors = contributors.length;
  const avgSharePerContributor = totalContributors > 0 ? totalCoins / totalContributors : 0;

  // ── Active contributors (last 30 days regardless of period) ──
  const now = Date.now();
  const recentIds = new Set(
    contribs
      .filter((c: any) => (now - new Date(c.created_at).getTime()) / 86400000 <= 30)
      .map((c: any) => c.user_id)
  );

  // ── Velocity ──────────────────────────────────────────────
  const effectiveDays = periodDays > 0 ? periodDays : Math.max(1, contribs.length > 0
    ? (now - new Date((contribs as any[])[contribs.length - 1].created_at).getTime()) / 86400000
    : 1);
  const currentVelocity = effectiveDays > 0 ? totalWeightedUnits / (effectiveDays / 7) : 0;
  const prevWu = prevContribs.reduce((s: number, c: any) => s + (Number(c.weighted_units) || 0), 0);
  const prevVelocity = periodDays > 0 ? prevWu / (periodDays / 7) : 0;
  const velocityTrend = periodDays === 0 ? "neutral" : currentVelocity > prevVelocity ? "up" : currentVelocity < prevVelocity ? "down" : "neutral";

  // ── Quest Breakdown ───────────────────────────────────────
  const questAggs: QuestAgg[] = quests.map((q: any) => {
    const qContribs = contribs.filter((c: any) => c.quest_id === q.id);
    const uniqueContributors = new Set(qContribs.map((c: any) => c.user_id)).size;
    const budget = Number(q.coin_budget) || 0;
    const guildPct = q.guild_percent != null ? Number(q.guild_percent) : 15;
    const guildShare = Math.round(budget * (guildPct / 100) * 100) / 100;
    const totalCount = qContribs.length;
    const verifiedCount = qContribs.filter((c: any) => c.status === "verified").length;
    const verificationRatio = totalCount > 0 ? Math.round(verifiedCount / totalCount * 100) : null;
    return {
      quest_id: q.id,
      quest_title: q.title,
      territory_name: q.territory_id ? territoryMap.get(q.territory_id) || null : null,
      budget_coins: budget,
      contributor_count: uniqueContributors,
      guild_share: guildShare,
      value_pie_calculated: q.value_pie_calculated || false,
      verification_ratio: verificationRatio,
    };
  });

  const totalGuildShare = questAggs.reduce((s, q) => s + q.guild_share, 0);

  // ── Task Type Breakdown ───────────────────────────────────
  const taskTypeMap = new Map<string, TaskTypeAgg>();
  contribs.forEach((c: any) => {
    const tt = c.task_type || "unclassified";
    const existing = taskTypeMap.get(tt) || { task_type: tt, total_weighted_units: 0, count: 0 };
    existing.total_weighted_units += Number(c.weighted_units) || 0;
    existing.count += 1;
    taskTypeMap.set(tt, existing);
  });
  const taskTypes = Array.from(taskTypeMap.values()).sort((a, b) => b.total_weighted_units - a.total_weighted_units);

  // ── Territory Breakdown ───────────────────────────────────
  const territoryAggMap = new Map<string, number>();
  quests.forEach((q: any) => {
    if (!q.territory_id) return;
    const tName = territoryMap.get(q.territory_id) || "Unknown";
    const qPie = pieLogs.filter((p: any) => p.quest_id === q.id);
    const tokens = qPie.reduce((s: number, p: any) => s + (Number(p.coins_awarded) || 0), 0);
    territoryAggMap.set(tName, (territoryAggMap.get(tName) || 0) + tokens);
  });
  const territoryAggs: TerritoryAgg[] = Array.from(territoryAggMap.entries())
    .map(([territory_name, total_tokens]) => ({ territory_name, total_tokens }))
    .sort((a, b) => b.total_tokens - a.total_tokens);

  // ── Pie Chart Data (top 10 + others) ──────────────────────
  const top10 = contributors.slice(0, 10);
  const othersWu = contributors.slice(10).reduce((s, c) => s + c.total_weighted_units, 0);
  const pieData = [
    ...top10.map((c) => ({ name: c.name, value: c.total_weighted_units })),
    ...(othersWu > 0 ? [{ name: "Others", value: othersWu }] : []),
  ];

  // ── Bar chart data: tokens per quest ──────────────────────
  const barData = questAggs.map((q) => ({
    name: q.quest_title.length > 20 ? q.quest_title.slice(0, 20) + "…" : q.quest_title,
    tokens: q.budget_coins,
    contributors: q.contributor_count,
  }));

  if (questIds.length === 0) {
    return (
      <div className="text-center py-12">
        <Scale className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No quests linked to this guild yet.</p>
        <p className="text-xs text-muted-foreground mt-1">When quests are hosted by or affiliated with this guild, their contribution metrics will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionBanner {...HINTS.banners.ovnFirst} />
      {/* Toggle + Period selector */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Switch id="external-toggle" checked={includeExternal} onCheckedChange={setIncludeExternal} />
          <Label htmlFor="external-toggle" className="text-xs text-muted-foreground cursor-pointer">
            Include external quests with contributors from this guild
          </Label>
        </div>
        <div className="flex items-center gap-1">
          {(["7d", "30d", "90d", "all"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setPeriod(p)}
            >
              {p === "7d" ? "7d" : p === "30d" ? "30d" : p === "90d" ? "90d" : "All"}
            </Button>
          ))}
        </div>
      </div>

      {/* Headline Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <Coins className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-600">{totalCoins.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">🌱 $CTG Distributed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary">{totalContributors}</p>
            <p className="text-[10px] text-muted-foreground">Contributors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Scale className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary">{totalWeightedUnits.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">Total Weighted Units</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-primary">{avgSharePerContributor.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">Avg 🌱 $CTG / Contributor</p>
          </CardContent>
        </Card>
        <Card className="border-violet-500/20">
          <CardContent className="p-4 text-center">
            <span className="text-lg mx-auto mb-1 block">🏛️</span>
            <p className="text-2xl font-bold text-violet-600">{totalGuildShare.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">🌱 $CTG (guild share)</p>
          </CardContent>
        </Card>
      </div>

      {/* Velocity indicator */}
      <div className="flex items-center gap-2 text-xs">
        <Gauge className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Velocity:</span>
        <span className={`font-semibold ${velocityTrend === "up" ? "text-emerald-600" : velocityTrend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
          {currentVelocity.toFixed(1)} wu/week
        </span>
        {velocityTrend === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
        {velocityTrend === "down" && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
      </div>

      {/* Contributor Value Pie + Ranking */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        {pieData.length > 0 && (
          <Card className="border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-emerald-500" /> Contributor Shares
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`${v.toFixed(1)} weighted units`, ""]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contributor Ranking Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Contributor Ranking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[10px] text-muted-foreground font-medium border-b border-border pb-1 sticky top-0 bg-card">
                <span>Contributor</span>
                <span className="text-right">Wu</span>
                <span className="text-right">🌱 $CTG</span>
                <span className="text-right">XP</span>
              </div>
              {contributors.map((c, i) => (
                <Link
                  key={c.user_id}
                  to={`/users/${c.user_id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center text-xs hover:bg-muted/50 rounded p-1 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={c.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">{c.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{c.name}</span>
                    <Badge variant="secondary" className="text-[9px]">{c.contribution_count}</Badge>
                    {recentIds.has(c.user_id) && (
                      <Badge variant="default" className="text-[9px] bg-emerald-500">Active</Badge>
                    )}
                  </div>
                  <span className="text-right font-medium">{c.total_weighted_units.toFixed(1)}</span>
                  <span className="text-right font-medium text-emerald-600">{c.total_coins.toFixed(0)}</span>
                  <span className="text-right text-muted-foreground">{c.total_xp}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quest Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Quest Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {barData.length > 0 && (
            <div className="h-[200px] mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="tokens" name="🌱 $CTG Budget" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-2 text-[10px] text-muted-foreground font-medium border-b border-border pb-1">
              <span>Quest</span>
              <span className="text-right">Budget</span>
              <span className="text-right">Guild Share</span>
              <span className="text-right">Verif.</span>
              <span className="text-right">Contributors</span>
              <span className="text-right">Territory</span>
              <span className="text-right">Status</span>
            </div>
            {questAggs.map((q) => {
              const ratioColor = q.verification_ratio === null ? "text-muted-foreground"
                : q.verification_ratio >= 80 ? "text-emerald-600"
                : q.verification_ratio >= 50 ? "text-amber-600"
                : "text-red-500";
              return (
                <Link
                  key={q.quest_id}
                  to={`/quests/${q.quest_id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-2 items-center text-xs hover:bg-muted/50 rounded p-1 transition-colors"
                >
                  <span className="truncate">{q.quest_title}</span>
                  <span className="text-right font-medium text-emerald-600">{q.budget_coins}</span>
                  <span className="text-right font-medium text-violet-600">{q.guild_share > 0 ? q.guild_share.toFixed(0) : "—"}</span>
                  <span className={`text-right font-medium ${ratioColor}`}>{q.verification_ratio !== null ? `${q.verification_ratio}%` : "—"}</span>
                  <span className="text-right">{q.contributor_count}</span>
                  <span className="text-right text-muted-foreground">{q.territory_name || "—"}</span>
                  <Badge variant={q.value_pie_calculated ? "default" : "secondary"} className="text-[9px] justify-self-end">
                    {q.value_pie_calculated ? "Distributed" : "Pending"}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Task Type Breakdown + Territory Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Task Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By Task Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {taskTypes.map((tt) => {
                const pct = totalWeightedUnits > 0 ? (tt.total_weighted_units / totalWeightedUnits * 100) : 0;
                return (
                  <div key={tt.task_type} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="capitalize">{tt.task_type}</span>
                      <span className="text-muted-foreground">{tt.total_weighted_units.toFixed(1)} wu ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {taskTypes.length === 0 && <p className="text-xs text-muted-foreground">No task types recorded.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Territory */}
        {territoryAggs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Leaf className="h-4 w-4" /> By Territory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {territoryAggs.map((ta) => {
                  const pct = totalCoins > 0 ? (ta.total_tokens / totalCoins * 100) : 0;
                  return (
                    <div key={ta.territory_name} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span>{ta.territory_name}</span>
                        <span className="text-amber-600">{ta.total_tokens.toFixed(0)} 🟡 $CTG ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Barème de valeur ─────────────────────────────────── */}
      {(() => {
        const hasCustomWeights = guildWeights.length > 0;
        const allTypes = DEFAULT_TASK_TYPES.map((t) => ({
          task_type: t,
          emoji: TASK_TYPE_EMOJI[t] || "📦",
          weight: weightMap.get(t) ?? 1.0,
        }));

        const lastUpdated = guildWeights.length > 0
          ? guildWeights.reduce((latest, w) => {
              const wDate = (w as any).updated_at;
              return wDate && new Date(wDate) > new Date(latest) ? wDate : latest;
            }, (guildWeights[0] as any).updated_at || "")
          : null;

        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                ⚖️ Guild Value Scale
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasCustomWeights && (
                <p className="text-xs text-muted-foreground mb-3 italic">
                  Default scale — all tasks are worth 1.0
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                       <th className="text-left py-1.5 font-medium">Task Type</th>
                      <th className="text-center py-1.5 font-medium w-10">Icon</th>
                      <th className="text-right py-1.5 font-medium">Multiplier</th>
                      <th className="text-right py-1.5 font-medium">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTypes.map((t) => (
                      <tr key={t.task_type} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-1.5 capitalize">{t.task_type}</td>
                        <td className="py-1.5 text-center">{t.emoji}</td>
                        <td className="py-1.5 text-right font-bold text-primary">{t.weight.toFixed(1)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">1h = {t.weight.toFixed(1)} wu</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {isMember && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs mt-2 p-0 h-auto"
                  onClick={() => setShowProposalDialog(true)}
                >
                  Propose a change
                </Button>
              )}

              {lastUpdated && lastUpdated !== "" && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Last modified: {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true, locale: enUS })}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })()}



      {/* Proposal Dialog */}
      <Dialog open={showProposalDialog} onOpenChange={setShowProposalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose a scale change</DialogTitle>
            <DialogDescription>Submit a multiplier change for a task type.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-1 block">Task type</Label>
              <Select value={proposalTaskType} onValueChange={setProposalTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a type…" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_TASK_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TASK_TYPE_EMOJI[t] || "📦"} {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">New multiplier (0.5 – 5.0)</Label>
              <Input
                type="number"
                min={0.5}
                max={5.0}
                step={0.5}
                value={proposalWeight}
                onChange={(e) => setProposalWeight(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Justification (min 20 characters)</Label>
              <Textarea
                value={proposalJustification}
                onChange={(e) => setProposalJustification(e.target.value)}
                placeholder="Explain why this change is relevant…"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProposalDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitProposal}
              disabled={submitting || !proposalTaskType || proposalJustification.length < 20}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
