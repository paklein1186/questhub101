import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";

interface QuestSummary {
  quest_id: string;
  quest_title: string;
  total_fmv: number;
  total_compensated: number;
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
        .select("quest_id, fmv_value, coins_compensated, status")
        .eq("user_id", currentUser.id)
        .eq("status", "verified");

      if (!logs || logs.length === 0) return [];

      const byQuest = new Map<string, { total_fmv: number; total_compensated: number }>();
      for (const l of logs as any[]) {
        if (!l.quest_id) continue;
        const prev = byQuest.get(l.quest_id) ?? { total_fmv: 0, total_compensated: 0 };
        prev.total_fmv += l.fmv_value ?? 0;
        prev.total_compensated += l.coins_compensated ?? 0;
        byQuest.set(l.quest_id, prev);
      }

      const questIds = Array.from(byQuest.keys());
      const { data: quests } = await supabase
        .from("quests")
        .select("id, title")
        .in("id", questIds);

      const questMap = new Map((quests ?? []).map((q) => [q.id, q.title]));

      return questIds.map((qid) => {
        const v = byQuest.get(qid)!;
        return {
          quest_id: qid,
          quest_title: questMap.get(qid) ?? "Unknown Quest",
          total_fmv: v.total_fmv,
          total_compensated: v.total_compensated,
          outstanding: Math.max(0, v.total_fmv - v.total_compensated),
        };
      }).sort((a, b) => b.outstanding - a.outstanding);
    },
  });

  if (!currentUser?.id) return null;

  const totalFmv = summaries.reduce((s, q) => s + q.total_fmv, 0);
  const totalCompensated = summaries.reduce((s, q) => s + q.total_compensated, 0);
  const totalOutstanding = summaries.reduce((s, q) => s + q.outstanding, 0);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading contributions…</p>;
  }

  if (summaries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center">
        <Coins className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No verified contributions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
        <Coins className="h-4 w-4" /> My Contributions
      </h3>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left p-2 font-medium">Quest</th>
              <th className="text-right p-2 font-medium">FMV 🟡</th>
              <th className="text-right p-2 font-medium">Compensated</th>
              <th className="text-right p-2 font-medium">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((q) => (
              <tr key={q.quest_id} className="border-b border-border last:border-0">
                <td className="p-2 font-medium">{q.quest_title}</td>
                <td className="p-2 text-right text-primary">{q.total_fmv.toFixed(0)}</td>
                <td className="p-2 text-right text-emerald-600">{q.total_compensated.toFixed(0)}</td>
                <td className="p-2 text-right">
                  {q.outstanding > 0 ? (
                    <span className="text-amber-600 font-medium">{q.outstanding.toFixed(0)}</span>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
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
              <td className="p-2 text-right text-primary">🟡 {totalFmv.toFixed(0)}</td>
              <td className="p-2 text-right text-emerald-600">{totalCompensated.toFixed(0)}</td>
              <td className="p-2 text-right text-amber-600">
                🟡 {totalOutstanding.toFixed(0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
