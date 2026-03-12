import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Link } from "react-router-dom";
import { ContributorExitCards } from "./ContributorExitCards";

interface QuestSummary {
  quest_id: string;
  quest_title: string;
  ocu_enabled: boolean;
  total_fmv: number;
  total_coins: number;
  total_ctg: number;
  total_xp: number;
  total_weighted_units: number;
  contribution_count: number;
  outstanding: number;
}

export function MyContributionsSummary() {
  const currentUser = useCurrentUser();

  const { data: summaries = [], isLoading } = useQuery<QuestSummary[]>({
    queryKey: ["my-contributions-summary", currentUser?.id],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const { data: logs } = await supabase
        .from("contribution_logs" as any)
        .select("quest_id, fmv_value, coins_compensated, ctg_emitted, xp_earned, weighted_units, status")
        .eq("user_id", currentUser.id)
        .eq("status", "verified");

      if (!logs || logs.length === 0) return [];

      const byQuest = new Map<string, {
        total_fmv: number; total_coins: number; total_ctg: number;
        total_xp: number; total_wu: number; count: number;
      }>();

      for (const l of logs as any[]) {
        if (!l.quest_id) continue;
        const prev = byQuest.get(l.quest_id) ?? { total_fmv: 0, total_coins: 0, total_ctg: 0, total_xp: 0, total_wu: 0, count: 0 };
        prev.total_fmv += l.fmv_value ?? 0;
        prev.total_coins += l.coins_compensated ?? 0;
        prev.total_ctg += l.ctg_emitted ?? 0;
        prev.total_xp += l.xp_earned ?? 0;
        prev.total_wu += l.weighted_units ?? 0;
        prev.count += 1;
        byQuest.set(l.quest_id, prev);
      }

      const questIds = Array.from(byQuest.keys());
      const { data: quests } = await supabase
        .from("quests")
        .select("id, title, ocu_enabled")
        .in("id", questIds);

      const questMap = new Map((quests ?? []).map((q: any) => [q.id, { title: q.title, ocu: q.ocu_enabled }]));

      return questIds.map((qid) => {
        const v = byQuest.get(qid)!;
        const quest = questMap.get(qid);
        return {
          quest_id: qid,
          quest_title: quest?.title ?? "Unknown Quest",
          ocu_enabled: quest?.ocu ?? false,
          total_fmv: v.total_fmv,
          total_coins: v.total_coins,
          total_ctg: v.total_ctg,
          total_xp: v.total_xp,
          total_weighted_units: v.total_wu,
          contribution_count: v.count,
          outstanding: Math.max(0, v.total_fmv - v.total_coins),
        };
      }).sort((a, b) => b.outstanding - a.outstanding);
    },
  });

  if (!currentUser?.id) return null;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading contributions…</p>;
  }

  const totalFmv = summaries.reduce((s, q) => s + q.total_fmv, 0);
  const totalCoins = summaries.reduce((s, q) => s + q.total_coins, 0);
  const totalCtg = summaries.reduce((s, q) => s + q.total_ctg, 0);
  const totalXp = summaries.reduce((s, q) => s + q.total_xp, 0);
  const totalOutstanding = summaries.reduce((s, q) => s + q.outstanding, 0);
  const totalContributions = summaries.reduce((s, q) => s + q.contribution_count, 0);
  const questCount = summaries.length;

  if (summaries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <CurrencyIcon currency="coins" className="h-8 w-8 mx-auto text-muted-foreground mb-2" colorClassName="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No verified contributions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Stats banner ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={<CurrencyIcon currency="xp" className="h-4 w-4" />} label="Quests" value={questCount} />
        <StatCard icon={<CurrencyIcon currency="coins" className="h-4 w-4" />} label="Contributions" value={totalContributions} />
        <StatCard icon={<CurrencyIcon currency="xp" className="h-4 w-4" />} label="⭐ XP Earned" value={totalXp} />
        <StatCard icon={<span className="text-sm">🟩</span>} label="Coins Received" value={totalCoins} accent="teal" />
        <StatCard icon={<CurrencyIcon currency="ctg" className="h-4 w-4" />} label="🌱 $CTG Earned" value={totalCtg} accent="emerald" />
        <StatCard icon={<span className="text-sm">🟡</span>} label="Outstanding FMV" value={totalOutstanding} accent="amber" />
      </div>

      {/* ─── Quest table ─── */}
      <div>
        <h3 className="font-display font-semibold text-sm flex items-center gap-1.5 mb-2">
          <Coins className="h-4 w-4" /> Contribution Ledger
        </h3>

        <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-2 font-medium">Quest</th>
                <th className="text-center p-2 font-medium w-12">#</th>
                <th className="text-right p-2 font-medium">⭐ XP</th>
                <th className="text-right p-2 font-medium">FMV 🟡</th>
                <th className="text-right p-2 font-medium">🟩 Coins</th>
                <th className="text-right p-2 font-medium">🌱 $CTG</th>
                <th className="text-right p-2 font-medium">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((q) => (
                <tr key={q.quest_id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-2 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/quests/${q.quest_id}?tab=proposals`}
                        className="hover:text-primary hover:underline transition-colors"
                      >
                        {q.quest_title}
                      </Link>
                      {q.ocu_enabled && (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 border text-[10px] shrink-0">
                          🧮 OCU
                        </Badge>
                      )}
                      <Link
                        to={`/quests/${q.quest_id}?tab=proposals`}
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                        title="View quest contributions"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </td>
                  <td className="p-2 text-center text-muted-foreground">{q.contribution_count}</td>
                  <td className="p-2 text-right text-yellow-600 dark:text-yellow-400">{q.total_xp > 0 ? q.total_xp.toFixed(0) : "–"}</td>
                  <td className="p-2 text-right text-primary">{q.total_fmv > 0 ? q.total_fmv.toFixed(0) : "–"}</td>
                  <td className="p-2 text-right text-teal-600 dark:text-teal-400">{q.total_coins > 0 ? q.total_coins.toFixed(0) : "–"}</td>
                  <td className="p-2 text-right text-emerald-600 dark:text-emerald-400">{q.total_ctg > 0 ? q.total_ctg.toFixed(0) : "–"}</td>
                  <td className="p-2 text-right">
                    {q.outstanding > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">{q.outstanding.toFixed(0)}</span>
                    ) : (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                        Paid
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/30 font-medium">
                <td className="p-2">Total</td>
                <td className="p-2 text-center">{totalContributions}</td>
                <td className="p-2 text-right text-yellow-600 dark:text-yellow-400">⭐ {totalXp.toFixed(0)}</td>
                <td className="p-2 text-right text-primary">🟡 {totalFmv.toFixed(0)}</td>
                <td className="p-2 text-right text-teal-600 dark:text-teal-400">🟩 {totalCoins.toFixed(0)}</td>
                <td className="p-2 text-right text-emerald-600 dark:text-emerald-400">🌱 {totalCtg.toFixed(0)}</td>
                <td className="p-2 text-right text-amber-600 dark:text-amber-400">
                  🟡 {totalOutstanding.toFixed(0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ─── Exit records ─── */}
      <ContributorExitCards />
    </div>
  );
}

function StatCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: number; accent?: string;
}) {
  const colorMap: Record<string, string> = {
    teal: "text-teal-600 dark:text-teal-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
  };
  const valueColor = accent ? colorMap[accent] ?? "text-foreground" : "text-foreground";

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-lg font-bold font-display ${valueColor}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
