import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History, Loader2, Package, Filter,
  ArrowDownRight, ArrowUpRight, Info, Send,
} from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CREDIT_BUNDLES } from "@/lib/xpCreditsConfig";
import { TransferCreditsDialog } from "@/components/TransferCreditsDialog";

const TX_TYPE_LABELS: Record<string, string> = {
  INITIAL_GRANT: "Welcome bonus",
  TOP_UP_PURCHASE: "Top-up purchase",
  QUEST_BUDGET_SPENT: "Quest budget reserved",
  QUEST_REWARD_EARNED: "Quest reward earned",
  ADMIN_ADJUSTMENT: "Admin adjustment",
  SUBSCRIPTION_MONTHLY_CREDIT: "Monthly plan credits",
  TRANSFER_IN: "Credits received",
  TRANSFER_OUT: "Credits sent",
};

interface UnitWalletTabProps {
  unitType: "GUILD" | "COMPANY";
  unitId: string;
  unitName: string;
  creditsBalance: number;
}

export function UnitWalletTab({ unitType, unitId, unitName, creditsBalance }: UnitWalletTabProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [buyLoading, setBuyLoading] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState("all");
  const [transferOpen, setTransferOpen] = useState(false);

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["unit-credit-transactions", unitType, unitId],
    enabled: !!unitId,
    queryFn: async () => {
      const { data } = await supabase
        .from("unit_credit_transactions" as any)
        .select("*")
        .eq("unit_type", unitType)
        .eq("unit_id", unitId)
        .order("created_at", { ascending: false })
        .limit(50) as any;
      return data ?? [];
    },
  });

  const filteredTx = (transactions as any[]).filter((tx) => {
    if (txFilter === "all") return true;
    if (txFilter === "earned") return tx.amount > 0;
    if (txFilter === "spent") return tx.amount < 0;
    return true;
  });

  const handleBuyCredits = async (code: string) => {
    setBuyLoading(code);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { mode: "credit_bundle", bundleCode: code, unitType, unitId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setBuyLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      {/* Balance */}
      <Section title="Unit Credits" icon={<Coins className="h-5 w-5" />}>
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <div className="inline-flex items-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 px-6 py-3">
            <Coins className="h-6 w-6 text-primary" />
            <div>
              <p className="text-2xl font-bold">{creditsBalance}</p>
              <p className="text-xs text-muted-foreground">Credits</p>
            </div>
          </div>
          {unitType === "GUILD" && (
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
              <Send className="h-4 w-4 mr-1" /> Send to Member
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          These credits belong to <strong>{unitName}</strong> and can be used for quests, events, or services hosted by this unit.
        </p>

        {unitType === "GUILD" && (
          <TransferCreditsDialog
            open={transferOpen}
            onOpenChange={setTransferOpen}
            sourceGuildId={unitId}
            sourceGuildName={unitName}
            currentBalance={creditsBalance}
          />
        )}
      </Section>

      <Separator />

      {/* Buy credits */}
      <Section title="Buy Credits for this Unit" icon={<Package className="h-5 w-5" />}>
        <div className="grid gap-3 md:grid-cols-3">
          {CREDIT_BUNDLES.map((b) => (
            <div key={b.code} className="rounded-lg border border-border bg-card p-4 text-center">
              <Package className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="font-bold">{b.credits} Credits</p>
              <p className="text-lg font-bold">€{b.priceEur}</p>
              <p className="text-xs text-muted-foreground mb-2">€{(b.priceEur / b.credits).toFixed(3)}/credit</p>
              <Button size="sm" className="w-full" onClick={() => handleBuyCredits(b.code)} disabled={!!buyLoading}>
                {buyLoading === b.code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4 mr-1" />}
                {buyLoading === b.code ? "Processing…" : "Buy"}
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      {/* Transaction history */}
      <Section title="Transaction History" icon={<History className="h-5 w-5" />}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={txFilter} onValueChange={setTxFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="earned">Earned</SelectItem>
              <SelectItem value="spent">Spent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {txLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filteredTx.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet.</p>
        ) : (
          <div className="space-y-1">
            {filteredTx.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  {tx.amount > 0 ? (
                    <ArrowDownRight className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{TX_TYPE_LABELS[tx.type] || tx.type}</p>
                    {tx.note && <p className="text-xs text-muted-foreground">{tx.note}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tx.amount > 0 ? "text-primary" : "text-destructive"}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" /> Unit credits can fund quests created by this unit. When a quest is completed, earned 🌱 $CTG tokens go to participants' wallets.
        </p>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">{icon} {title}</h3>
      {children}
    </div>
  );
}
