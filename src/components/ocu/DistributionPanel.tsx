import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCoinsRate } from "@/hooks/useCoinsRate";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Banknote, Send, Loader2, AlertTriangle, Flag } from "lucide-react";
import { OCUFeatureGate } from "./OCUFeatureGate";
import { ReportConcernDialog } from "./ReportConcernDialog";

interface ContributorRow {
  user_id: string;
  name: string;
  avatar_url: string | null;
  pie_pct: number;
  coins_amount: number;
  ctg_amount: number;
}

type DistMode = "ocu_pie" | "equal" | "manual";
type CurrencyMode = "coins" | "ctg" | "both";

interface Props {
  quest: any;
  isAdmin: boolean;
  isParticipant: boolean;
  onEnableOCU?: () => void;
}

export function DistributionPanel({ quest, isAdmin, isParticipant, onEnableOCU }: Props) {
  const currentUser = useCurrentUser();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { rate: coinsRate } = useCoinsRate();

  const [distMode, setDistMode] = useState<DistMode>("manual");
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>("coins");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualAmounts, setManualAmounts] = useState<Record<string, { coins: string; ctg: string }>>({});

  const coinsEscrow = Number((quest as any).coins_escrow ?? 0);
  const ctgEscrow = Number((quest as any).ctg_escrow ?? 0);
  const isFrozen = !!(quest as any).pie_frozen_at;
  const pieSnapshot = (quest as any).pie_snapshot as any;
  const ocuEnabled = !!(quest as any).ocu_enabled;

  // Fetch contributors (from pie snapshot or live logs)
  const { data: contributors = [] } = useQuery<ContributorRow[]>({
    queryKey: ["distribution-contributors", quest.id],
    queryFn: async () => {
      if (isFrozen && pieSnapshot?.contributors) {
        return (pieSnapshot.contributors as any[]).map((c: any) => ({
          user_id: c.user_id,
          name: c.name ?? "Unknown",
          avatar_url: c.avatar_url ?? null,
          pie_pct: c.pct_share ?? 0,
          coins_amount: 0,
          ctg_amount: 0,
        }));
      }
      // Live contributors from verified logs
      const { data: logs } = await supabase
        .from("contribution_logs" as any)
        .select("user_id, fmv_value")
        .eq("quest_id", quest.id)
        .eq("status", "verified");
      if (!logs || logs.length === 0) return [];

      const byUser = new Map<string, number>();
      for (const l of logs as any[]) {
        byUser.set(l.user_id, (byUser.get(l.user_id) ?? 0) + (l.fmv_value ?? 0));
      }
      const totalFmv = Array.from(byUser.values()).reduce((s, v) => s + v, 0);
      const userIds = Array.from(byUser.keys());

      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      const pMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return userIds.map((uid) => {
        const fmv = byUser.get(uid) ?? 0;
        const p = pMap.get(uid);
        return {
          user_id: uid,
          name: p?.name ?? "Unknown",
          avatar_url: p?.avatar_url ?? null,
          pie_pct: totalFmv > 0 ? (fmv / totalFmv) * 100 : 0,
          coins_amount: 0,
          ctg_amount: 0,
        };
      });
    },
  });

  // Fetch past distributions
  const { data: distributions = [] } = useQuery({
    queryKey: ["quest-distributions", quest.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_distributions" as any)
        .select("*")
        .eq("quest_id", quest.id)
        .order("distributed_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // Compute preview
  const computePreview = (): ContributorRow[] => {
    if (contributors.length === 0) return [];

    if (distMode === "ocu_pie") {
      return contributors.map((c) => ({
        ...c,
        coins_amount: (currencyMode === "coins" || currencyMode === "both")
          ? Math.round((c.pie_pct / 100) * coinsEscrow * 100) / 100
          : 0,
        ctg_amount: (currencyMode === "ctg" || currencyMode === "both")
          ? Math.round((c.pie_pct / 100) * ctgEscrow * 100) / 100
          : 0,
      }));
    }

    if (distMode === "equal") {
      const n = contributors.length;
      return contributors.map((c) => ({
        ...c,
        pie_pct: 100 / n,
        coins_amount: (currencyMode === "coins" || currencyMode === "both")
          ? Math.floor((coinsEscrow / n) * 100) / 100
          : 0,
        ctg_amount: (currencyMode === "ctg" || currencyMode === "both")
          ? Math.floor((ctgEscrow / n) * 100) / 100
          : 0,
      }));
    }

    // Manual
    return contributors.map((c) => ({
      ...c,
      coins_amount: parseFloat(manualAmounts[c.user_id]?.coins || "0") || 0,
      ctg_amount: parseFloat(manualAmounts[c.user_id]?.ctg || "0") || 0,
    }));
  };

  const preview = computePreview();
  const totalCoins = preview.reduce((s, c) => s + c.coins_amount, 0);
  const totalCtg = preview.reduce((s, c) => s + c.ctg_amount, 0);
  const overCoins = totalCoins > coinsEscrow;
  const overCtg = totalCtg > ctgEscrow;

  const handleConfirm = async () => {
    if (preview.length === 0) return;
    setSubmitting(true);
    try {
      const recipientSnapshot = {
        recipients: preview.filter((c) => c.coins_amount > 0 || c.ctg_amount > 0).map((c) => ({
          user_id: c.user_id,
          name: c.name,
          amount_coins: c.coins_amount,
          amount_ctg: c.ctg_amount,
          pct: c.pie_pct,
          basis: distMode,
        })),
      };

      // 1. Insert quest_distributions
      const distInsertResult = await supabase.from("quest_distributions" as any).insert({
        quest_id: quest.id,
        distribution_mode: distMode,
        currency: currencyMode,
        total_amount: totalCoins + totalCtg,
        distributed_by: currentUser.id,
        recipient_snapshot: recipientSnapshot,
      }).select("id").single();
      const distId = (distInsertResult.data as any)?.id;

      // 2. For each recipient, credit wallets
      for (const r of recipientSnapshot.recipients) {
        if (r.amount_coins > 0) {
          await supabase.from("coin_transactions" as any).insert({
            user_id: r.user_id,
            amount: r.amount_coins,
            type: "QUEST_DISTRIBUTION",
            quest_id: quest.id,
            source: `quest_distribution:${distId}`,
          });
          // Update balance
          const { data: prof } = await supabase
            .from("profiles")
            .select("coins_balance")
            .eq("user_id", r.user_id)
            .single();
          if (prof) {
            await supabase.from("profiles").update({
              coins_balance: Number((prof as any).coins_balance ?? 0) + r.amount_coins,
            } as any).eq("user_id", r.user_id);
          }
        }

        if (r.amount_ctg > 0) {
          await supabase.from("ctg_transactions" as any).insert({
            user_id: r.user_id,
            amount: r.amount_ctg,
            type: "QUEST_DISTRIBUTION",
            related_entity_id: quest.id,
            related_entity_type: "quest",
          });
          const { data: prof } = await supabase
            .from("profiles")
            .select("ctg_balance")
            .eq("user_id", r.user_id)
            .single();
          if (prof) {
            await supabase.from("profiles").update({
              ctg_balance: Number((prof as any).ctg_balance ?? 0) + r.amount_ctg,
            } as any).eq("user_id", r.user_id);
          }
        }

        // 4. Insert contribution_compensation
        await supabase.from("contribution_compensations" as any).insert({
          contribution_id: quest.id,
          quest_id: quest.id,
          user_id: r.user_id,
          amount_coins: r.amount_coins,
          amount_fiat: r.amount_coins > 0 ? r.amount_coins * coinsRate : null,
          compensation_mode: currencyMode === "both" ? "mixed" : currencyMode === "coins" ? "coins" : "ctg",
          currency: "EUR",
          note: `Distribution (${distMode}): ${r.amount_coins} Coins + ${r.amount_ctg} $CTG`,
          compensated_by: currentUser.id,
        });

        // 5. Notify recipient
        await supabase.from("notifications" as any).insert({
          user_id: r.user_id,
          type: "quest_distribution",
          title: `💰 You received ${r.amount_coins > 0 ? `🟩 ${r.amount_coins} Coins` : ""}${r.amount_coins > 0 && r.amount_ctg > 0 ? " + " : ""}${r.amount_ctg > 0 ? `🌱 ${r.amount_ctg} $CTG` : ""} from quest "${quest.title}"`,
          link: `/quests/${quest.id}`,
          entity_type: "quest",
          entity_id: quest.id,
        });
      }

      // 3. Update quest escrow
      const questUpdate: any = {};
      if (totalCoins > 0) {
        questUpdate.coins_escrow = Math.max(0, coinsEscrow - totalCoins);
        if (coinsEscrow - totalCoins <= 0) questUpdate.coins_escrow_status = "released";
      }
      if (totalCtg > 0) {
        questUpdate.ctg_escrow = Math.max(0, ctgEscrow - totalCtg);
        if (ctgEscrow - totalCtg <= 0) questUpdate.ctg_escrow_status = "released";
      }
      if (Object.keys(questUpdate).length > 0) {
        await supabase.from("quests").update(questUpdate as any).eq("id", quest.id);
      }

      // 6. Activity log
      await supabase.from("activity_log").insert({
        actor_user_id: currentUser.id,
        action_type: "quest_distribution",
        target_type: "quest",
        target_id: quest.id,
        target_name: quest.title,
        metadata: {
          distribution_id: distId,
          mode: distMode,
          total_coins: totalCoins,
          total_ctg: totalCtg,
        },
      });

      toast({ title: "Distribution confirmed", description: `${recipientSnapshot.recipients.length} recipient(s) credited.` });
      qc.invalidateQueries({ queryKey: ["quest-distributions", quest.id] });
      qc.invalidateQueries({ queryKey: ["quest", quest.id] });
      qc.invalidateQueries({ queryKey: ["distribution-contributors", quest.id] });
      qc.invalidateQueries({ queryKey: ["compensation-summary", quest.id] });
      setConfirmOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const setManual = (userId: string, field: "coins" | "ctg", val: string) => {
    setManualAmounts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: val },
    }));
  };

  const showCoins = currencyMode === "coins" || currencyMode === "both";
  const showCtg = currencyMode === "ctg" || currencyMode === "both";

  return (
    <OCUFeatureGate quest={quest} isAdmin={isAdmin} onEnable={onEnableOCU}>
      <div className="space-y-5">
        {/* Header summary */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
            <Banknote className="h-4 w-4" /> Distribution Panel
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">🟩 Coins available</p>
              <p className="text-lg font-bold">{coinsEscrow.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">≈ €{(coinsEscrow * coinsRate).toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">🌱 $CTG available</p>
              <p className="text-lg font-bold">{ctgEscrow.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">❄️ In escrow</p>
            </div>
          </div>
        </div>

        {/* Admin distribution controls */}
        {isAdmin && contributors.length > 0 && (coinsEscrow > 0 || ctgEscrow > 0) && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h4 className="text-sm font-semibold">New Distribution</h4>

            {/* Mode selector */}
            <div className="space-y-2">
              <Label className="text-xs">Distribution mode</Label>
              <div className="flex flex-wrap gap-2">
                {ocuEnabled && isFrozen && (
                  <Button
                    size="sm" variant={distMode === "ocu_pie" ? "default" : "outline"}
                    className="text-xs h-8"
                    onClick={() => setDistMode("ocu_pie")}
                  >
                    🧮 OCU Pie
                  </Button>
                )}
                <Button
                  size="sm" variant={distMode === "equal" ? "default" : "outline"}
                  className="text-xs h-8"
                  onClick={() => setDistMode("equal")}
                >
                  👥 Equal Split
                </Button>
                <Button
                  size="sm" variant={distMode === "manual" ? "default" : "outline"}
                  className="text-xs h-8"
                  onClick={() => setDistMode("manual")}
                >
                  ✍️ Manual
                </Button>
              </div>
            </div>

            {/* Currency selector */}
            <div className="space-y-2">
              <Label className="text-xs">Currency</Label>
              <div className="flex flex-wrap gap-2">
                {coinsEscrow > 0 && (
                  <Button size="sm" variant={currencyMode === "coins" ? "default" : "outline"} className="text-xs h-8" onClick={() => setCurrencyMode("coins")}>
                    🟩 Coins
                  </Button>
                )}
                {ctgEscrow > 0 && (
                  <Button size="sm" variant={currencyMode === "ctg" ? "default" : "outline"} className="text-xs h-8" onClick={() => setCurrencyMode("ctg")}>
                    🌱 $CTG
                  </Button>
                )}
                {coinsEscrow > 0 && ctgEscrow > 0 && (
                  <Button size="sm" variant={currencyMode === "both" ? "default" : "outline"} className="text-xs h-8" onClick={() => setCurrencyMode("both")}>
                    Both
                  </Button>
                )}
              </div>
            </div>

            {/* Preview table */}
            <div className="rounded-lg border border-border overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left p-2 font-medium">Contributor</th>
                    {distMode !== "manual" && <th className="text-right p-2 font-medium">% Share</th>}
                    {showCoins && <th className="text-right p-2 font-medium">🟩 Coins</th>}
                    {showCtg && <th className="text-right p-2 font-medium">🌱 $CTG</th>}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((c) => (
                    <tr key={c.user_id} className="border-b border-border last:border-0">
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={c.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[8px]">{c.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      {distMode !== "manual" && (
                        <td className="p-2 text-right">{c.pie_pct.toFixed(1)}%</td>
                      )}
                      {showCoins && (
                        <td className="p-2 text-right">
                          {distMode === "manual" ? (
                            <Input
                              type="number" min={0} className="h-7 w-24 text-xs ml-auto"
                              value={manualAmounts[c.user_id]?.coins ?? ""}
                              onChange={(e) => setManual(c.user_id, "coins", e.target.value)}
                            />
                          ) : (
                            <span className="font-medium">{c.coins_amount.toLocaleString()}</span>
                          )}
                        </td>
                      )}
                      {showCtg && (
                        <td className="p-2 text-right">
                          {distMode === "manual" ? (
                            <Input
                              type="number" min={0} className="h-7 w-24 text-xs ml-auto"
                              value={manualAmounts[c.user_id]?.ctg ?? ""}
                              onChange={(e) => setManual(c.user_id, "ctg", e.target.value)}
                            />
                          ) : (
                            <span className="font-medium">{c.ctg_amount.toLocaleString()}</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-4">
                {showCoins && (
                  <span className={overCoins ? "text-destructive font-medium" : ""}>
                    Total 🟩: {totalCoins.toLocaleString()} / {coinsEscrow.toLocaleString()}
                  </span>
                )}
                {showCtg && (
                  <span className={overCtg ? "text-destructive font-medium" : ""}>
                    Total 🌱: {totalCtg.toLocaleString()} / {ctgEscrow.toLocaleString()}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                disabled={
                  (totalCoins === 0 && totalCtg === 0) ||
                  overCoins || overCtg
                }
                onClick={() => setConfirmOpen(true)}
              >
                <Send className="h-3.5 w-3.5 mr-1" /> Preview & Confirm
              </Button>
            </div>
          </div>
        )}

        {/* Past distributions (visible to all participants) */}
        {distributions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Distribution History</h4>
            {distributions.map((d: any) => (
              <DistributionCard
                key={d.id}
                distribution={d}
                quest={quest}
                currentUserId={currentUser.id}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}

        {/* Confirm dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Confirm Distribution</DialogTitle>
              <DialogDescription>
                This will credit the following amounts to contributor wallets and deduct from quest escrow.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-border overflow-x-auto max-h-60">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left p-2 font-medium">Contributor</th>
                    {showCoins && <th className="text-right p-2 font-medium">🟩 Coins</th>}
                    {showCtg && <th className="text-right p-2 font-medium">🌱 $CTG</th>}
                  </tr>
                </thead>
                <tbody>
                  {preview.filter((c) => c.coins_amount > 0 || c.ctg_amount > 0).map((c) => (
                    <tr key={c.user_id} className="border-b border-border last:border-0">
                      <td className="p-2 font-medium">{c.name}</td>
                      {showCoins && <td className="p-2 text-right">{c.coins_amount.toLocaleString()}</td>}
                      {showCtg && <td className="p-2 text-right">{c.ctg_amount.toLocaleString()}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              {showCoins && <p>Total Coins: <strong>{totalCoins.toLocaleString()}</strong> (≈ €{(totalCoins * coinsRate).toFixed(2)})</p>}
              {showCtg && <p>Total $CTG: <strong>{totalCtg.toLocaleString()}</strong> — demurrage resumes in wallets</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Confirm Distribution
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </OCUFeatureGate>
  );
}

/* ─── Distribution History Card ─── */
function DistributionCard({ distribution, quest, currentUserId, isAdmin }: {
  distribution: any; quest: any; currentUserId: string; isAdmin: boolean;
}) {
  const snap = distribution.recipient_snapshot as any;
  const recipients = snap?.recipients ?? [];
  const myAlloc = recipients.find((r: any) => r.user_id === currentUserId);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] capitalize">{distribution.distribution_mode}</Badge>
          <span className="text-muted-foreground">
            {new Date(distribution.distributed_at).toLocaleDateString()}
          </span>
          {distribution.flagged && isAdmin && (
            <span className="text-muted-foreground flex items-center gap-1" title="A concern was raised on this distribution">
              <Flag className="h-3 w-3" /> ⚑ Concern raised
            </span>
          )}
        </div>
        <span className="text-muted-foreground">
          {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex gap-4 text-xs">
        {distribution.currency !== "ctg" && (
          <span>🟩 {recipients.reduce((s: number, r: any) => s + (r.amount_coins ?? 0), 0).toLocaleString()} Coins</span>
        )}
        {distribution.currency !== "coins" && (
          <span>🌱 {recipients.reduce((s: number, r: any) => s + (r.amount_ctg ?? 0), 0).toLocaleString()} $CTG</span>
        )}
      </div>

      {myAlloc && (
        <div className="rounded-md bg-primary/5 border border-primary/20 p-2 text-xs">
          <span>You received: </span>
          {myAlloc.amount_coins > 0 && <span>🟩 {myAlloc.amount_coins.toLocaleString()} Coins </span>}
          {myAlloc.amount_ctg > 0 && <span>🌱 {myAlloc.amount_ctg.toLocaleString()} $CTG</span>}
        </div>
      )}

      {myAlloc && !isAdmin && (
        <button
          onClick={() => setReportOpen(true)}
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <AlertTriangle className="h-3 w-3" /> Report a concern
        </button>
      )}

      <ReportConcernDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        distributionId={distribution.id}
        questId={quest.id}
        questTitle={quest.title}
        distributionDate={distribution.distributed_at}
      />
    </div>
  );
}
