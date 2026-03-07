import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Coins, Users, Scale, TrendingUp, Leaf, PieChart as PieIcon, BarChart3 } from "lucide-react";
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
import { fr } from "date-fns/locale";

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
  total_gameb_tokens: number;
  total_xp: number;
  contribution_count: number;
}

interface QuestAgg {
  quest_id: string;
  quest_title: string;
  territory_name: string | null;
  budget_gameb: number;
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
  research: "Analyse documentaire", facilitation: "Animation d'atelier", coordination: "Planification sprint",
  creative: "Création visuelle", admin: "Gestion administrative", risk: "Évaluation des risques",
  development: "Code & intégration", design: "Maquettes UI/UX", testing: "Tests & QA", documentation: "Rédaction docs",
};

export function GuildOVNTab({ guildId, guildName, isMember, currentUserId }: Props) {
  const [includeExternal, setIncludeExternal] = useState(false);
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
        title: `Modifier le poids de ${proposalTaskType} de ${currentWeightForProposal} à ${proposalWeight}`,
        description: proposalJustification,
        status: "open",
      });
      if (error) throw error;
      toast({ title: "Proposition soumise aux membres de la guilde" });
      setShowProposalDialog(false);
      setProposalTaskType("");
      setProposalWeight("1.0");
      setProposalJustification("");
    } catch (e) {
      toast({ title: "Erreur", description: "Impossible de soumettre la proposition", variant: "destructive" });
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

  // 2. Fetch contribution_logs for these quests
  const { data: rawData, isLoading } = useQuery({
    queryKey: ["guild-ovn-data", guildId, questIds],
    enabled: questIds.length > 0,
    queryFn: async () => {
      // Contribution logs
      const { data: contribs } = await supabase
        .from("contribution_logs" as any)
        .select("user_id, quest_id, weighted_units, xp_earned, task_type, hours_logged, created_at, status")
        .in("quest_id", questIds);

      // Value pie logs
      const { data: pieLogs } = await supabase
        .from("quest_value_pie_log" as any)
        .select("contributor_id, quest_id, gameb_tokens_awarded, weighted_units, share_percent")
        .in("quest_id", questIds);

      // Quests metadata
      const { data: quests } = await supabase
        .from("quests" as any)
        .select("id, title, gameb_token_budget, guild_percent, value_pie_calculated, territory_id")
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

      return { contribs: contribs || [], pieLogs: pieLogs || [], quests: quests || [], profileMap, territoryMap };
    },
  });

  if (isLoading || !rawData) {
    return <p className="text-sm text-muted-foreground p-4">Loading OVN data…</p>;
  }

  const { contribs, pieLogs, quests, profileMap, territoryMap } = rawData;

  // ── Aggregate Contributors ────────────────────────────────
  const contributorMap = new Map<string, ContributorAgg>();
  contribs.forEach((c: any) => {
    const existing = contributorMap.get(c.user_id) || {
      user_id: c.user_id,
      name: profileMap.get(c.user_id)?.name || "Unknown",
      avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
      total_weighted_units: 0,
      total_gameb_tokens: 0,
      total_xp: 0,
      contribution_count: 0,
    };
    existing.total_weighted_units += Number(c.weighted_units) || 0;
    existing.total_xp += Number(c.xp_earned) || 0;
    existing.contribution_count += 1;
    contributorMap.set(c.user_id, existing);
  });

  // Merge GameB tokens from pie logs
  pieLogs.forEach((p: any) => {
    const existing = contributorMap.get(p.contributor_id);
    if (existing) {
      existing.total_gameb_tokens += Number(p.gameb_tokens_awarded) || 0;
    }
  });

  const contributors = Array.from(contributorMap.values()).sort((a, b) => b.total_weighted_units - a.total_weighted_units);

  // ── Headline Metrics ──────────────────────────────────────
  const totalWeightedUnits = contributors.reduce((s, c) => s + c.total_weighted_units, 0);
  const totalGamebTokens = contributors.reduce((s, c) => s + c.total_gameb_tokens, 0);
  const totalContributors = contributors.length;
  const avgSharePerContributor = totalContributors > 0 ? totalGamebTokens / totalContributors : 0;

  // ── Quest Breakdown ───────────────────────────────────────
  const questAggs: QuestAgg[] = quests.map((q: any) => {
    const qContribs = contribs.filter((c: any) => c.quest_id === q.id);
    const uniqueContributors = new Set(qContribs.map((c: any) => c.user_id)).size;
    const budget = Number(q.gameb_token_budget) || 0;
    const guildPct = q.guild_percent != null ? Number(q.guild_percent) : 15;
    const guildShare = Math.round(budget * (guildPct / 100) * 100) / 100;
    const totalCount = qContribs.length;
    const verifiedCount = qContribs.filter((c: any) => c.status === "verified").length;
    const verificationRatio = totalCount > 0 ? Math.round(verifiedCount / totalCount * 100) : null;
    return {
      quest_id: q.id,
      quest_title: q.title,
      territory_name: q.territory_id ? territoryMap.get(q.territory_id) || null : null,
      budget_gameb: budget,
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
    const tokens = qPie.reduce((s: number, p: any) => s + (Number(p.gameb_tokens_awarded) || 0), 0);
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
    tokens: q.budget_gameb,
    contributors: q.contributor_count,
  }));

  if (questIds.length === 0) {
    return (
      <div className="text-center py-12">
        <Scale className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No quests linked to this guild yet.</p>
        <p className="text-xs text-muted-foreground mt-1">When quests are hosted by or affiliated with this guild, their OVN metrics will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle */}
      <div className="flex items-center gap-2">
        <Switch id="external-toggle" checked={includeExternal} onCheckedChange={setIncludeExternal} />
        <Label htmlFor="external-toggle" className="text-xs text-muted-foreground cursor-pointer">
          Include external quests with contributors from this guild
        </Label>
      </div>

      {/* Headline Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <Coins className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-600">{totalGamebTokens.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">🟩 GameB Tokens Distributed</p>
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
            <p className="text-[10px] text-muted-foreground">Avg 🟩 Tokens / Contributor</p>
          </CardContent>
        </Card>
        <Card className="border-violet-500/20">
          <CardContent className="p-4 text-center">
            <span className="text-lg mx-auto mb-1 block">🏛️</span>
            <p className="text-2xl font-bold text-violet-600">{totalGuildShare.toFixed(0)}</p>
            <p className="text-[10px] text-muted-foreground">🟩 Tokens (part guilde)</p>
          </CardContent>
        </Card>
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
                <span className="text-right">🟩 Tokens</span>
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
                  </div>
                  <span className="text-right font-medium">{c.total_weighted_units.toFixed(1)}</span>
                  <span className="text-right font-medium text-emerald-600">{c.total_gameb_tokens.toFixed(0)}</span>
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
                  <Bar dataKey="tokens" name="🟩 Budget" fill="hsl(142, 70%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-2 text-[10px] text-muted-foreground font-medium border-b border-border pb-1">
              <span>Quest</span>
              <span className="text-right">Budget</span>
              <span className="text-right">Part Guilde</span>
              <span className="text-right">Vérif.</span>
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
                  <span className="text-right font-medium text-emerald-600">{q.budget_gameb}</span>
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
                  const pct = totalGamebTokens > 0 ? (ta.total_tokens / totalGamebTokens * 100) : 0;
                  return (
                    <div key={ta.territory_name} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span>{ta.territory_name}</span>
                        <span className="text-emerald-600">{ta.total_tokens.toFixed(0)} 🟩 ({pct.toFixed(0)}%)</span>
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
                ⚖️ Barème de valeur de la guilde
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasCustomWeights && (
                <p className="text-xs text-muted-foreground mb-3 italic">
                  Barème par défaut — toutes les tâches valent 1.0
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-1.5 font-medium">Type de tâche</th>
                      <th className="text-center py-1.5 font-medium w-10">Icône</th>
                      <th className="text-right py-1.5 font-medium">Multiplicateur</th>
                      <th className="text-right py-1.5 font-medium">Exemple</th>
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
                  Proposer un changement
                </Button>
              )}

              {lastUpdated && lastUpdated !== "" && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Dernière modification : {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true, locale: fr })}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })()}
          if (!currentUserId || !proposalTaskType || proposalJustification.length < 20) return;
          setSubmitting(true);
          try {
            const { error } = await supabase.from("guild_decisions" as any).insert({
              guild_id: guildId,
              proposed_by: currentUserId,
              type: "weight_change",
              title: `Modifier le poids de ${proposalTaskType} de ${currentWeightForProposal} à ${proposalWeight}`,
              description: proposalJustification,
              status: "open",
            });
            if (error) throw error;
            toast({ title: "Proposition soumise aux membres de la guilde" });
            setShowProposalDialog(false);
            setProposalTaskType("");
            setProposalWeight("1.0");
            setProposalJustification("");
          } catch (e) {
            toast({ title: "Erreur", description: "Impossible de soumettre la proposition", variant: "destructive" });
          } finally {
            setSubmitting(false);
          }
        };

        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                ⚖️ Barème de valeur de la guilde
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasCustomWeights && (
                <p className="text-xs text-muted-foreground mb-3 italic">
                  Barème par défaut — toutes les tâches valent 1.0
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-1.5 font-medium">Type de tâche</th>
                      <th className="text-center py-1.5 font-medium w-10">Icône</th>
                      <th className="text-right py-1.5 font-medium">Multiplicateur</th>
                      <th className="text-right py-1.5 font-medium">Exemple</th>
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
                  Proposer un changement
                </Button>
              )}

              {lastUpdated && lastUpdated !== "" && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Dernière modification : {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true, locale: fr })}
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
            <DialogTitle>Proposer un changement de barème</DialogTitle>
            <DialogDescription>Soumettez une modification du multiplicateur pour un type de tâche.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-1 block">Type de tâche</Label>
              <Select value={proposalTaskType} onValueChange={setProposalTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un type…" />
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
              <Label className="text-xs mb-1 block">Nouveau multiplicateur (0.5 – 5.0)</Label>
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
              <Label className="text-xs mb-1 block">Justification (min 20 caractères)</Label>
              <Textarea
                value={proposalJustification}
                onChange={(e) => setProposalJustification(e.target.value)}
                placeholder="Expliquez pourquoi ce changement est pertinent…"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProposalDialog(false)}>Annuler</Button>
            <Button
              onClick={handleSubmitProposal}
              disabled={submitting || !proposalTaskType || proposalJustification.length < 20}
            >
              Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
