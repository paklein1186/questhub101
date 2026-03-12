import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Share2, Check, Copy } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Link } from "react-router-dom";
import { useTrustSummary } from "@/hooks/useTrustSummary";
import { TrustSummaryBadge } from "@/components/trust/TrustSummaryBadge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

interface Props {
  userId: string;
}

export function MonOVNPanel({ userId }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: trustSummary } = useTrustSummary("profile", userId);

  const { data, isLoading } = useQuery({
    queryKey: ["mon-ovn", userId],
    enabled: !!userId,
    queryFn: async () => {
      // XP per guild
      const { data: xpRows } = await supabase
        .from("xp_ledger" as any)
        .select("amount, guild_id")
        .eq("user_id", userId);

      // Fetch guild names for xp entries
      const guildIds = [...new Set((xpRows || []).map((r: any) => r.guild_id).filter(Boolean))];
      let guildMap = new Map<string, string>();
      if (guildIds.length > 0) {
        const { data: guilds } = await supabase
          .from("guilds")
          .select("id, name")
          .in("id", guildIds);
        guildMap = new Map((guilds || []).map((g) => [g.id, g.name]));
      }

      // Group XP by guild
      const xpByGuild = new Map<string, { name: string; xp: number }>();
      (xpRows || []).forEach((r: any) => {
        const gId = r.guild_id || "_none";
        const existing = xpByGuild.get(gId) || { name: guildMap.get(r.guild_id) || "Sans guilde", xp: 0 };
        existing.xp += Number(r.amount) || 0;
        xpByGuild.set(gId, existing);
      });
      const totalXp = (xpRows || []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);

      // Total weighted units
      const { data: contribRows } = await supabase
        .from("contribution_logs" as any)
        .select("weighted_units, created_at, quest_id, contribution_type, title")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const totalWu = (contribRows || []).reduce((s: number, r: any) => s + (Number(r.weighted_units) || 0), 0);

      // Contributions last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCount = (contribRows || []).filter(
        (r: any) => new Date(r.created_at) >= thirtyDaysAgo
      ).length;

      // Total $CTG tokens received
      const { data: tokenRows } = await supabase
        .from("coin_transactions" as any)
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "quest_payout");

      const totalTokens = (tokenRows || []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);

      // Last 5 contributions with quest titles
      const last5 = (contribRows || []).slice(0, 5);
      const questIds = [...new Set(last5.map((c: any) => c.quest_id).filter(Boolean))];
      let questMap = new Map<string, string>();
      if (questIds.length > 0) {
        const { data: quests } = await supabase
          .from("quests" as any)
          .select("id, title")
          .in("id", questIds);
        questMap = new Map((quests || []).map((q: any) => [q.id, q.title]));
      }

      // XP bar chart data (top 5 + others)
      const sortedGuilds = Array.from(xpByGuild.values()).sort((a, b) => b.xp - a.xp);
      const top5 = sortedGuilds.slice(0, 5);
      const othersXp = sortedGuilds.slice(5).reduce((s, g) => s + g.xp, 0);
      const barData = [
        ...top5.map((g) => ({ name: g.name.length > 15 ? g.name.slice(0, 15) + "…" : g.name, xp: Math.round(g.xp) })),
        ...(othersXp > 0 ? [{ name: "Autres", xp: Math.round(othersXp) }] : []),
      ];

      return {
        totalXp,
        totalWu,
        totalTokens,
        recentCount,
        barData,
        last5: last5.map((c: any) => ({
          ...c,
          questTitle: questMap.get(c.quest_id) || "—",
        })),
      };
    },
  });

  const handleCopyPassport = async () => {
    const url = `${window.location.origin}/users/${userId}?tab=ovn`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied!", description: "Share your contribution passport." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground p-4">Loading your contributions…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <CurrencyIcon currency="weight" className="h-5 w-5" /> My Contributions
        </h3>
        <Button size="sm" variant="outline" onClick={handleCopyPassport}>
          {copied ? <Check className="h-4 w-4 mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
          Share my passport
        </Button>
      </div>

      {/* Trust badge */}
      {trustSummary && <TrustSummaryBadge summary={trustSummary} />}

      {/* Metrics + Chart grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: 4 metric cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{Math.round(data.totalXp)}</p>
              <p className="text-[10px] text-muted-foreground">XP Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Scale className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{data.totalWu.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">Weighted Units</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20">
            <CardContent className="p-4 text-center">
              <Coins className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-600">{data.totalTokens.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">🟩 Coins received</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CalendarCheck className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{data.recentCount}</p>
              <p className="text-[10px] text-muted-foreground">Contributions this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Right: XP per guild bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">XP by Guild</CardTitle>
          </CardHeader>
          <CardContent>
            {data.barData.length > 0 ? (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="xp" name="XP" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No XP recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline: last contributions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">My Recent Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.last5.length > 0 ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 text-[10px] text-muted-foreground font-medium border-b border-border pb-1">
                <span>Date</span>
                <span>Quest</span>
                <span>Type</span>
                <span className="text-right">Wu</span>
              </div>
              {data.last5.map((c: any, i: number) => (
                <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center text-xs">
                  <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: enUS })}
                  </span>
                  {c.quest_id ? (
                    <Link to={`/quests/${c.quest_id}`} className="truncate text-primary hover:underline">
                      {c.questTitle}
                    </Link>
                  ) : (
                    <span className="truncate text-muted-foreground">{c.title || "—"}</span>
                  )}
                  <Badge variant="secondary" className="text-[9px] capitalize">{c.contribution_type?.replace(/_/g, " ") || "—"}</Badge>
                  <span className="text-right font-medium">{Number(c.weighted_units || 0).toFixed(1)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No contributions recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
