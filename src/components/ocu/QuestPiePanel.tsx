import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Lock, Plus, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { OCUFeatureGate } from "./OCUFeatureGate";

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
  quest: any;
  isAdmin: boolean;
  onEnableOCU?: () => void;
}

export function QuestPiePanel({ quest, isAdmin, onEnableOCU }: Props) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [spendingOpen, setSpendingOpen] = useState(false);
  const [spendDesc, setSpendDesc] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [addingSpend, setAddingSpend] = useState(false);

  const isFrozen = !!(quest as any).pie_frozen_at;
  const envelopeTotal = Number((quest as any).envelope_total) || 0;
  const externalSpending = Number((quest as any).external_spending) || 0;
  const distributable = Math.max(0, envelopeTotal - externalSpending);

  // Query verified contributions aggregated by user
  const { data: pieData = [], isLoading } = useQuery({
    queryKey: ["quest-pie", quest.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_logs" as any)
        .select("user_id, fmv_value, half_days, compensation_status, coins_compensated")
        .eq("quest_id", quest.id)
        .eq("status", "verified");
      if (error) throw error;

      // Group by user
      const byUser = new Map<string, { fmv: number; halfDays: number; compensated: number; status: string }>();
      (data || []).forEach((row: any) => {
        const existing = byUser.get(row.user_id);
        if (existing) {
          existing.fmv += Number(row.fmv_value) || 0;
          existing.halfDays += Number(row.half_days) || 0;
          existing.compensated += Number(row.coins_compensated) || 0;
        } else {
          byUser.set(row.user_id, {
            fmv: Number(row.fmv_value) || 0,
            halfDays: Number(row.half_days) || 0,
            compensated: Number(row.coins_compensated) || 0,
            status: row.compensation_status || "none",
          });
        }
      });

      // Fetch profiles
      const userIds = [...byUser.keys()];
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const totalFmv = [...byUser.values()].reduce((s, v) => s + v.fmv, 0);

      return [...byUser.entries()].map(([userId, data]) => ({
        userId,
        name: profileMap.get(userId)?.name || "Unknown",
        avatarUrl: profileMap.get(userId)?.avatar_url,
        fmv: data.fmv,
        halfDays: data.halfDays,
        pct: totalFmv > 0 ? (data.fmv / totalFmv) * 100 : 0,
        compensated: data.compensated,
        compensationStatus: data.status,
      })).sort((a, b) => b.fmv - a.fmv);
    },
  });

  const totalFmv = pieData.reduce((s, d) => s + d.fmv, 0);

  const chartData = pieData.map((d, i) => ({
    name: d.name,
    value: d.fmv,
    color: COLORS[i % COLORS.length],
  }));

  const handleFreeze = async () => {
    setFreezing(true);
    const snapshot = {
      frozen_at: new Date().toISOString(),
      contributors: pieData.map((d) => ({
        user_id: d.userId,
        fmv: d.fmv,
        pct: Math.round(d.pct * 100) / 100,
      })),
    };
    await supabase.from("quests").update({
      pie_frozen_at: new Date().toISOString(),
      pie_frozen_by: currentUser.id,
      pie_snapshot: snapshot,
    } as any).eq("id", quest.id);
    qc.invalidateQueries({ queryKey: ["quest", quest.id] });
    qc.invalidateQueries({ queryKey: ["quest-pie", quest.id] });
    toast({ title: "Pie frozen — final split locked" });
    setFreezing(false);
    setFreezeOpen(false);
  };

  const handleAddSpending = async () => {
    if (!spendDesc.trim() || !spendAmount) return;
    setAddingSpend(true);
    const amount = Number(spendAmount) || 0;

    await supabase.from("quest_external_spendings" as any).insert({
      quest_id: quest.id,
      description: spendDesc.trim(),
      amount,
      created_by: currentUser.id,
    } as any);

    await supabase.from("quests").update({
      external_spending: externalSpending + amount,
    } as any).eq("id", quest.id);

    qc.invalidateQueries({ queryKey: ["quest", quest.id] });
    toast({ title: "External spending added" });
    setSpendDesc("");
    setSpendAmount("");
    setAddingSpend(false);
    setSpendingOpen(false);
  };

  return (
    <OCUFeatureGate quest={quest} isAdmin={isAdmin} onEnable={onEnableOCU}>
      <div className="space-y-4">
        {/* Header */}
        {isFrozen ? (
          <div className="rounded-lg bg-muted border border-border p-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm">
              Pie frozen on {new Date((quest as any).pie_frozen_at).toLocaleDateString()} — final split locked.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm text-foreground">
              Pie is live and updates with each approved contribution.
            </p>
          </div>
        )}

        {/* Envelope summary */}
        {envelopeTotal > 0 && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div>
                <span className="text-muted-foreground">Total Envelope:</span>{" "}
                <span className="font-medium">🟡 {envelopeTotal}</span>
              </div>
              <div>
                <span className="text-muted-foreground">External:</span>{" "}
                <span className="font-medium text-destructive">-{externalSpending}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Distributable:</span>{" "}
                <span className="font-bold text-primary">🟡 {distributable}</span>
                <span className="text-xs text-muted-foreground ml-1">(= 100% of pie)</span>
              </div>
            </div>
            {isAdmin && !isFrozen && (
              <Button variant="outline" size="sm" className="h-7 text-xs mt-2" onClick={() => setSpendingOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add external spending
              </Button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pieData.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No verified contributions yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Approved contributions will appear here as pie slices.</p>
          </div>
        ) : (
          <>
            {/* Donut Chart */}
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
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">#</th>
                    <th className="text-left px-3 py-2 font-medium">Contributor</th>
                    <th className="text-right px-3 py-2 font-medium">Half-days</th>
                    <th className="text-right px-3 py-2 font-medium">FMV 🟡</th>
                    <th className="text-right px-3 py-2 font-medium">% Share</th>
                    <th className="text-right px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pieData.map((d, i) => (
                    <tr key={d.userId} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={d.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-[10px]">{d.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate max-w-[120px]">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">{d.halfDays}</td>
                      <td className="px-3 py-2 text-right font-medium text-primary">{d.fmv}</td>
                      <td className="px-3 py-2 text-right font-bold">{d.pct.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right">
                        {d.compensated > 0 ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                            Paid {d.compensated}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Pending</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-muted/30 font-semibold">
                    <td className="px-3 py-2" colSpan={3}>Total</td>
                    <td className="px-3 py-2 text-right text-primary">{totalFmv}</td>
                    <td className="px-3 py-2 text-right">100%</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Freeze button */}
            {isAdmin && !isFrozen && (
              <Button
                variant="outline"
                size="sm"
                className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                onClick={() => setFreezeOpen(true)}
              >
                <Lock className="h-4 w-4 mr-1" /> Freeze Pie
              </Button>
            )}
          </>
        )}

        {/* Freeze confirmation dialog */}
        <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Freeze Contribution Pie?</DialogTitle>
              <DialogDescription>
                This permanently locks the contribution split. No further contributions will change the distribution percentages.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setFreezeOpen(false)}>Cancel</Button>
              <Button onClick={handleFreeze} disabled={freezing} className="bg-amber-600 hover:bg-amber-700">
                {freezing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Freeze Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* External spending dialog */}
        <Dialog open={spendingOpen} onOpenChange={setSpendingOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add External Spending</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea
                  value={spendDesc}
                  onChange={(e) => setSpendDesc(e.target.value)}
                  placeholder="e.g. Hosting costs, tool subscriptions…"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Amount (🟡 Coins)</label>
                <Input
                  type="number"
                  value={spendAmount}
                  onChange={(e) => setSpendAmount(e.target.value)}
                  min={0}
                  step={0.01}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSpendingOpen(false)}>Cancel</Button>
              <Button onClick={handleAddSpending} disabled={addingSpend || !spendDesc.trim() || !spendAmount}>
                {addingSpend && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Add Spending
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </OCUFeatureGate>
  );
}
