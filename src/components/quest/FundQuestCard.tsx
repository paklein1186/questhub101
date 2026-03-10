import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Coins as CoinsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useCoinsRate } from "@/hooks/useCoinsRate";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  questId: string;
  className?: string;
}

export function FundQuestCard({ questId, className }: Props) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { rate: coinsRate } = useCoinsRate();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["quest-campaigns-public", questId],
    queryFn: async () => {
      const { data } = await supabase
        .from("quest_campaigns" as any)
        .select("*")
        .eq("quest_id", questId)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ["profile-balances", currentUser?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("coins_balance, ctg_balance")
        .eq("user_id", currentUser.id)
        .single();
      return data;
    },
    enabled: !!currentUser?.id,
  });

  const [contributeOpen, setContributeOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [contributing, setContributing] = useState(false);

  if (isLoading || campaigns.length === 0) return null;

  const openContribute = (campaign: any) => {
    setSelectedCampaign(campaign);
    setAmount("");
    setContributeOpen(true);
  };

  // Auto-dispatch when campaign threshold reached
  const handleAutoDispatch = async (campaign: any, cur: "coins" | "ctg", raisedAmount: number) => {
    const mode = campaign.dispatch_mode; // "auto_pie" or "auto_equal"

    // For auto_pie, check if pie is frozen
    if (mode === "auto_pie") {
      const { data: questCheck } = await supabase
        .from("quests")
        .select("pie_frozen_at, pie_snapshot")
        .eq("id", questId)
        .single();
      if (!(questCheck as any)?.pie_frozen_at) {
        // Fall back to manual, notify admin
        await supabase.from("quest_campaigns" as any).update({ dispatch_mode: "manual" }).eq("id", campaign.id);
        // Notify quest creator
        const { data: quest } = await supabase.from("quests").select("created_by_user_id, title").eq("id", questId).single();
        if (quest) {
          await supabase.from("notifications" as any).insert({
            user_id: quest.created_by_user_id,
            type: "campaign_threshold",
            title: `Threshold reached but pie is not frozen — please distribute manually for campaign "${campaign.title}"`,
            link: `/quests/${questId}/settings`,
            entity_type: "quest",
            entity_id: questId,
          });
        }
        return;
      }
    }

    // Get contributors
    const { data: logs } = await supabase
      .from("contribution_logs" as any)
      .select("user_id, fmv_value")
      .eq("quest_id", questId)
      .eq("status", "verified");
    if (!logs || (logs as any[]).length === 0) return;

    const byUser = new Map<string, number>();
    for (const l of logs as any[]) {
      byUser.set(l.user_id, (byUser.get(l.user_id) ?? 0) + (l.fmv_value ?? 0));
    }
    const totalFmv = Array.from(byUser.values()).reduce((s, v) => s + v, 0);
    const userIds = Array.from(byUser.keys());
    const n = userIds.length;
    if (n === 0) return;

    const recipients = userIds.map((uid) => {
      const pct = mode === "auto_pie" ? ((byUser.get(uid) ?? 0) / totalFmv) * 100 : 100 / n;
      const amount = mode === "auto_pie"
        ? Math.round((pct / 100) * raisedAmount * 100) / 100
        : Math.floor((raisedAmount / n) * 100) / 100;
      return { user_id: uid, amount, pct };
    });

    // Insert distribution
    await supabase.from("quest_distributions" as any).insert({
      quest_id: questId,
      distribution_mode: mode === "auto_pie" ? "ocu_pie" : "equal",
      currency: cur,
      total_amount: raisedAmount,
      distributed_by: null,
      recipient_snapshot: { recipients: recipients.map((r) => ({ ...r, [`amount_${cur}`]: r.amount, basis: mode })) },
    });

    // Credit each recipient
    const balField = cur === "coins" ? "coins_balance" : "ctg_balance";
    const txTable = cur === "coins" ? "coin_transactions" : "ctg_transactions";
    for (const r of recipients) {
      if (r.amount <= 0) continue;
      await supabase.from(txTable as any).insert({
        user_id: r.user_id,
        amount: r.amount,
        type: "QUEST_DISTRIBUTION",
        ...(cur === "coins" ? { quest_id: questId } : { related_entity_id: questId, related_entity_type: "quest" }),
      });
      const { data: prof } = await supabase.from("profiles").select(balField).eq("user_id", r.user_id).single();
      if (prof) {
        await supabase.from("profiles").update({ [balField]: Number((prof as any)[balField] ?? 0) + r.amount } as any).eq("user_id", r.user_id);
      }
      await supabase.from("notifications" as any).insert({
        user_id: r.user_id,
        type: "quest_distribution",
        title: `💰 You received ${cur === "coins" ? `🟩 ${r.amount} Coins` : `🌱 ${r.amount} $CTG`} from campaign "${campaign.title}"`,
        link: `/quests/${questId}`,
        entity_type: "quest",
        entity_id: questId,
      });
    }

    // Mark campaign dispatched
    await supabase.from("quest_campaigns" as any).update({
      dispatched_at: new Date().toISOString(),
      status: "COMPLETED",
    }).eq("id", campaign.id);

    // Notify quest admin
    const { data: quest } = await supabase.from("quests").select("created_by_user_id, title").eq("id", questId).single();
    if (quest) {
      await supabase.from("notifications" as any).insert({
        user_id: quest.created_by_user_id,
        type: "campaign_auto_dispatch",
        title: `Campaign "${campaign.title}" auto-dispatched ${raisedAmount} ${cur === "coins" ? "Coins" : "$CTG"} to ${n} contributors`,
        link: `/quests/${questId}`,
        entity_type: "quest",
        entity_id: questId,
      });
    }
  };

  const currency: "coins" | "ctg" = selectedCampaign?.campaign_currency === "ctg" ? "ctg" : "coins";
  const balanceField = currency === "coins" ? "coins_balance" : "ctg_balance";
  const userBalance = (userProfile as any)?.[balanceField] ?? 0;

  const handleContribute = async () => {
    if (!selectedCampaign || !amount) return;
    const numAmount = Number(amount);
    if (numAmount <= 0) return;
    if (numAmount > userBalance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    setContributing(true);

    // 1. Deduct from wallet
    await supabase.from("profiles").update({
      [balanceField]: userBalance - numAmount,
    } as any).eq("user_id", currentUser.id);

    // 2. Log transaction
    const txTable = currency === "coins" ? "coin_transactions" : "ctg_transactions";
    await supabase.from(txTable as any).insert({
      user_id: currentUser.id,
      amount: -numAmount,
      type: "CAMPAIGN_CONTRIBUTION",
      quest_id: questId,
      ...(currency === "ctg" ? { related_entity_id: questId, related_entity_type: "quest" } : {}),
    });

    // 3. Insert funding contribution
    await supabase.from("quest_funding_contributions" as any).insert({
      quest_id: questId,
      campaign_id: selectedCampaign.id,
      funder_user_id: currentUser.id,
      currency,
      amount: numAmount,
    });

    // 4. Update campaign raised_amount
    const newRaised = (Number(selectedCampaign.raised_amount) || 0) + numAmount;
    const thresholdAmount = Number(selectedCampaign.threshold_amount) || Number(selectedCampaign.goal_amount) || 0;
    const campaignUpdate: any = { raised_amount: newRaised };
    const thresholdJustReached = thresholdAmount > 0 && newRaised >= thresholdAmount && !selectedCampaign.threshold_reached_at;
    if (thresholdJustReached) {
      campaignUpdate.threshold_reached_at = new Date().toISOString();
    }
    await supabase.from("quest_campaigns" as any).update(campaignUpdate).eq("id", selectedCampaign.id);

    // Auto-dispatch logic
    if (thresholdJustReached && selectedCampaign.dispatch_mode && selectedCampaign.dispatch_mode !== "manual") {
      await handleAutoDispatch(selectedCampaign, currency, newRaised);
    }

    // 5. Update quest escrow
    const escrowField = currency === "coins" ? "coins_escrow" : "ctg_escrow";
    const budgetField = currency === "coins" ? "coins_budget" : "ctg_budget";
    const { data: questData } = await supabase
      .from("quests")
      .select("coins_escrow, ctg_escrow, coins_budget, ctg_budget, ctg_escrow_status")
      .eq("id", questId)
      .single();

    if (questData) {
      const questUpdate: any = {
        [escrowField]: Number((questData as any)[escrowField] ?? 0) + numAmount,
        [budgetField]: Number((questData as any)[budgetField] ?? 0) + numAmount,
      };
      if (currency === "ctg" && (questData as any).ctg_escrow_status === "idle") {
        questUpdate.ctg_escrow_status = "active";
        questUpdate.ctg_escrow_frozen_at = new Date().toISOString();
      }
      await supabase.from("quests").update(questUpdate as any).eq("id", questId);
    }

    qc.invalidateQueries({ queryKey: ["quest-campaigns-public", questId] });
    qc.invalidateQueries({ queryKey: ["quest-campaigns", questId] });
    qc.invalidateQueries({ queryKey: ["quest", questId] });
    qc.invalidateQueries({ queryKey: ["profile-balances"] });
    toast({ title: `Contributed ${numAmount} ${currency === "coins" ? "Coins" : "$CTG"}!` });
    setContributing(false);
    setContributeOpen(false);
  };

  const coinsCampaigns = campaigns.filter((c: any) => (c.campaign_currency || "coins") === "coins");
  const ctgCampaigns = campaigns.filter((c: any) => c.campaign_currency === "ctg");

  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-display font-semibold flex items-center gap-2">
          <CoinsIcon className="h-4 w-4 text-primary" /> Fund this Quest
        </h3>

        <div className="space-y-2">
          {coinsCampaigns.map((c: any) => {
            const threshold = Number(c.threshold_amount) || Number(c.goal_amount) || 0;
            const raised = Number(c.raised_amount) || 0;
            const pct = threshold > 0 ? Math.min(100, Math.round((raised / threshold) * 100)) : 0;
            return (
              <CampaignRow
                key={c.id}
                emoji="🟩"
                title={c.title || "Coins Campaign"}
                raised={raised}
                threshold={threshold}
                pct={pct}
                currencyLabel="Coins"
                onContribute={() => openContribute(c)}
              />
            );
          })}
          {ctgCampaigns.map((c: any) => {
            const threshold = Number(c.threshold_amount) || Number(c.goal_amount) || 0;
            const raised = Number(c.raised_amount) || 0;
            const pct = threshold > 0 ? Math.min(100, Math.round((raised / threshold) * 100)) : 0;
            return (
              <CampaignRow
                key={c.id}
                emoji="🌱"
                title={c.title || "$CTG Campaign"}
                raised={raised}
                threshold={threshold}
                pct={pct}
                currencyLabel="$CTG"
                onContribute={() => openContribute(c)}
              />
            );
          })}
        </div>
      </div>

      {/* Contribute Dialog */}
      <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Contribute {currency === "coins" ? "🟩 Coins" : "🌱 $CTG"}
            </DialogTitle>
            <DialogDescription>
              {selectedCampaign?.title || "Campaign"}
              {selectedCampaign?.threshold_amount && (
                <> — {Number(selectedCampaign.raised_amount || 0).toLocaleString()} / {Number(selectedCampaign.threshold_amount).toLocaleString()} {currency === "coins" ? "Coins" : "$CTG"}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your balance: <strong>{userBalance.toLocaleString()}</strong> {currency === "coins" ? "🟩 Coins" : "🌱 $CTG"}
            </p>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount to contribute"
            />
            {Number(amount) > userBalance && (
              <p className="text-xs text-destructive">Insufficient balance.</p>
            )}
            {currency === "coins" && amount && (
              <p className="text-xs text-muted-foreground">≈ €{(Number(amount) * coinsRate).toFixed(2)}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributeOpen(false)}>Cancel</Button>
            <Button
              onClick={handleContribute}
              disabled={contributing || !amount || Number(amount) <= 0 || Number(amount) > userBalance}
            >
              {contributing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Contribute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CampaignRow({
  emoji, title, raised, threshold, pct, currencyLabel, onContribute,
}: {
  emoji: string; title: string; raised: number; threshold: number; pct: number;
  currencyLabel: string; onContribute: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{emoji} {title}</span>
          <p className="text-xs text-muted-foreground">
            {raised.toLocaleString()} / {threshold.toLocaleString()} {currencyLabel} — {pct}%
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onContribute}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Contribute
        </Button>
      </div>
      {threshold > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
