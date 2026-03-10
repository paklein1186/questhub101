import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 71%, 45%)",
  "hsl(217, 91%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 67%, 55%)",
  "hsl(0, 84%, 60%)",
  "hsl(190, 90%, 50%)",
  "hsl(330, 80%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(50, 100%, 50%)",
];

interface Props {
  guildId: string;
}

interface ContributorRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalFmv: number;
  guildPct: number;
  questCount: number;
  questBreakdown: { questId: string; questTitle: string; fmv: number }[];
}

export function GuildContributionMap({ guildId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["guild-contribution-map", guildId],
    queryFn: async () => {
      // 1. Get OCU quests for this guild
      const { data: quests } = await supabase
        .from("quests")
        .select("id, title, ocu_enabled")
        .eq("guild_id", guildId)
        .eq("ocu_enabled", true as any)
        .eq("is_deleted", false as any);

      if (!quests || quests.length === 0) return { contributors: [], questCount: 0 };

      const questIds = quests.map((q: any) => q.id);
      const questMap = new Map(quests.map((q: any) => [q.id, q.title]));

      // 2. Get verified contributions
      const { data: contribs } = await supabase
        .from("contribution_logs" as any)
        .select("user_id, quest_id, fmv_value")
        .in("quest_id", questIds)
        .eq("status", "verified");

      if (!contribs || contribs.length === 0) return { contributors: [], questCount: questIds.length };

      // 3. Group by user, with per-quest breakdown
      const byUser = new Map<string, { totalFmv: number; quests: Map<string, number> }>();
      (contribs as any[]).forEach((row) => {
        const fmv = Number(row.fmv_value) || 0;
        const existing = byUser.get(row.user_id);
        if (existing) {
          existing.totalFmv += fmv;
          existing.quests.set(row.quest_id, (existing.quests.get(row.quest_id) || 0) + fmv);
        } else {
          const qMap = new Map<string, number>();
          qMap.set(row.quest_id, fmv);
          byUser.set(row.user_id, { totalFmv: fmv, quests: qMap });
        }
      });

      // 4. Profiles
      const userIds = [...byUser.keys()];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const grandTotal = [...byUser.values()].reduce((s, v) => s + v.totalFmv, 0);

      const contributors: ContributorRow[] = [...byUser.entries()]
        .map(([userId, data]) => ({
          userId,
          name: profileMap.get(userId)?.name || "Unknown",
          avatarUrl: profileMap.get(userId)?.avatar_url || null,
          totalFmv: data.totalFmv,
          guildPct: grandTotal > 0 ? (data.totalFmv / grandTotal) * 100 : 0,
          questCount: data.quests.size,
          questBreakdown: [...data.quests.entries()].map(([qId, fmv]) => ({
            questId: qId,
            questTitle: questMap.get(qId) || "Unknown Quest",
            fmv,
          })),
        }))
        .sort((a, b) => b.totalFmv - a.totalFmv);

      return { contributors, questCount: questIds.length };
    },
  });

  const contributors = data?.contributors ?? [];
  const questCount = data?.questCount ?? 0;
  const grandTotal = contributors.reduce((s, c) => s + c.totalFmv, 0);

  const chartData = contributors.map((c, i) => ({
    name: c.name,
    value: c.totalFmv,
    color: COLORS[i % COLORS.length],
  }));

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-semibold text-lg">Open Contributive Units — Guild View</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Cross-quest aggregation of verified contributions across {questCount} OCU quest{questCount !== 1 ? "s" : ""}.
        </p>
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground">
          Guild % is weighted by quest envelope size. A 30% share in a €1,000 quest counts more than a 30% share in a €100 quest.
        </p>
      </div>

      {contributors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No verified OCU contributions yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Enable OCU on quests and approve contributions to see the guild map.
          </p>
        </div>
      ) : (
        <>
          {/* Donut */}
          <div className="flex justify-center">
            <ResponsiveContainer width={280} height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`🟡 ${value}`, "FMV"]}
                  contentStyle={{ fontSize: "12px", borderRadius: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Ranked table */}
          <TooltipProvider>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">#</th>
                    <th className="text-left px-3 py-2 font-medium">Contributor</th>
                    <th className="text-right px-3 py-2 font-medium">Total FMV 🟡</th>
                    <th className="text-right px-3 py-2 font-medium">Guild %</th>
                    <th className="text-right px-3 py-2 font-medium">Quests</th>
                  </tr>
                </thead>
                <tbody>
                  {contributors.map((c, i) => (
                    <UITooltip key={c.userId}>
                      <TooltipTrigger asChild>
                        <tr className="border-t border-border cursor-default hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={c.avatarUrl ?? undefined} />
                                <AvatarFallback className="text-[10px]">{c.name?.[0]}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium truncate max-w-[120px]">{c.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-primary">{c.totalFmv}</td>
                          <td className="px-3 py-2 text-right font-bold">{c.guildPct.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right">
                            <Badge variant="secondary" className="text-[10px]">{c.questCount}</Badge>
                          </td>
                        </tr>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium text-xs">{c.name} — FMV per quest</p>
                          {c.questBreakdown.map((qb) => (
                            <div key={qb.questId} className="flex justify-between gap-4 text-xs">
                              <span className="truncate">{qb.questTitle}</span>
                              <span className="font-medium shrink-0">🟡 {qb.fmv}</span>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </UITooltip>
                  ))}
                  <tr className="border-t border-border bg-muted/30 font-semibold">
                    <td className="px-3 py-2" colSpan={2}>Total</td>
                    <td className="px-3 py-2 text-right text-primary">{grandTotal}</td>
                    <td className="px-3 py-2 text-right">100%</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        </>
      )}
    </div>
  );
}
