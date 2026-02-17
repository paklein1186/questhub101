import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet, Coins, Zap, CreditCard, ShieldCheck, Package, Crown,
  ArrowRight, ExternalLink, Loader2, TrendingDown, History,
  Info, ArrowUpRight, ArrowDownRight, Filter, Send, Recycle, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useToast } from "@/hooks/use-toast";
import { CREDIT_BUNDLES, ECONOMY_LABELS } from "@/lib/xpCreditsConfig";
import { DEMURRAGE_RATE_PERCENT, estimateFade } from "@/lib/demurrageConfig";
import { TransferCreditsDialog } from "@/components/TransferCreditsDialog";

const TX_TYPE_LABELS: Record<string, string> = {
  INITIAL_GRANT: "Welcome bonus",
  EARNED_ACTION: "Earned (action)",
  PURCHASED: "Purchased",
  SPENT_FEATURE: "Spent (feature)",
  QUEST_BUDGET_SPENT: "Quest budget reserved",
  QUEST_REWARD_EARNED: "Quest reward earned",
  TOP_UP_PURCHASE: "Top-up purchase",
  SUBSCRIPTION_MONTHLY_CREDIT: "Monthly plan credits",
  ADJUSTMENT: "Admin adjustment",
  GIFT_RECEIVED: "Credits received (transfer)",
  GIFT_SENT: "Credits sent (transfer)",
  MONTHLY_INCLUDED: "Monthly included",
  DEMURRAGE_FADE: "Ecosystem redistribution",
  TREASURY_DEMURRAGE_RECEIVED: "Treasury received",
};

export function WalletTab() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const limits = usePlanLimits();
  const { toast } = useToast();
  const [buyLoading, setBuyLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [txFilter, setTxFilter] = useState("all");
  const [transferOpen, setTransferOpen] = useState(false);

  // Fetch transaction history
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["credit-transactions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const filteredTx = transactions.filter((tx: any) => {
    if (txFilter === "all") return true;
    if (txFilter === "earned") return tx.amount > 0;
    if (txFilter === "spent") return tx.amount < 0;
    return true;
  });

  const handleBuyCredits = async (code: string) => {
    setBuyLoading(code);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { mode: "credit_bundle", bundleCode: code } });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setBuyLoading(null); }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setPortalLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* A) Balance Overview */}
      <Section title="Balance Overview" icon={<Wallet className="h-5 w-5" />}>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="inline-flex items-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 px-6 py-3">
            <Coins className="h-6 w-6 text-primary" />
            <div>
              <p className="text-2xl font-bold">{limits.userCredits}</p>
              <p className="text-xs text-muted-foreground">Credits</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-5 py-3">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold">{limits.userXp}</p>
              <p className="text-xs text-muted-foreground">XP (reputation)</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)}>
            <Send className="h-4 w-4 mr-1" /> Transfer Credits
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">How Credits work</p>
            <p className="text-xs">Credits are internal coordination units. They circulate between members and gradually redistribute if inactive ({DEMURRAGE_RATE_PERCENT}/month).</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">How XP works</p>
            <p className="text-xs">XP reflects your long-term reputation. XP is non-transferable, does not fade, and cannot be edited directly.</p>
          </div>
        </div>
      </Section>

      {/* Demurrage Info Panel */}
      <div className="rounded-xl border-2 border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Recycle className="h-5 w-5 text-amber-500" />
          <h4 className="font-display text-sm font-semibold">Credits Circulation Status</h4>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Next monthly adjustment</p>
            <p className="text-lg font-bold text-amber-600">−{estimateFade(limits.userCredits)}</p>
            <p className="text-[10px] text-muted-foreground">{DEMURRAGE_RATE_PERCENT} of {limits.userCredits}</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">After redistribution</p>
            <p className="text-lg font-bold text-primary">{Math.max(0, limits.userCredits - estimateFade(limits.userCredits))}</p>
            <p className="text-[10px] text-muted-foreground">Projected balance</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Circulation health</span>
            <span className="font-medium">Keep credits active</span>
          </div>
          <Progress value={Math.min(100, Math.max(10, 100 - (limits.userCredits > 0 ? 15 : 0)))} className="h-2" />
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="flex items-center gap-1"><Timer className="h-3 w-3" /> Inactive credits are gradually redistributed to the ecosystem treasury.</p>
          <p>Active contributors naturally neutralize fade through earning.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/credit-economy">How it works <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </div>
      </div>

      <TransferCreditsDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        currentBalance={limits.userCredits}
      />

      <Separator />

      {/* B) Payment Methods */}
      <Section title="Payment Methods" icon={<CreditCard className="h-5 w-5" />}>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium mb-1">Stripe Payments</p>
          <p className="text-xs text-muted-foreground mb-3">Manage your saved payment methods and billing details through Stripe.</p>
          <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
            {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ExternalLink className="h-4 w-4 mr-1" />}
            Manage payment methods
          </Button>
        </div>
      </Section>

      <Separator />

      {/* C) ID / Verification */}
      <Section title="ID & Verification" icon={<ShieldCheck className="h-5 w-5" />}>
        <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Identity Verification</p>
            <p className="text-xs text-muted-foreground">Verify your identity to unlock higher trust levels and premium features.</p>
          </div>
          <Badge variant="outline" className="text-muted-foreground">Not verified</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">KYC verification will be available soon.</p>
      </Section>

      <Separator />

      {/* D) Credits Management */}
      <Section title="Credits Management" icon={<Package className="h-5 w-5" />}>
        {/* Current plan */}
        <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <h4 className="font-display text-lg font-bold">{limits.plan.planName}</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{limits.plan.monthlyIncludedCredits} credits/month included</p>
            </div>
            <Badge className="bg-primary text-primary-foreground">Active</Badge>
          </div>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/plans">Change plan <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
            {limits.plan.planCode !== "FREE" && (
              <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ExternalLink className="h-4 w-4 mr-1" />}
                Manage subscription
              </Button>
            )}
          </div>
        </div>

        {/* Top-up bundles */}
        <h4 className="text-sm font-medium mb-3">Top Up Credits</h4>
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
        <p className="text-xs text-muted-foreground mt-3">{ECONOMY_LABELS.creditsDisclaimer}</p>
      </Section>

      <Separator />

      {/* E) XP Info */}
      <Section title="XP & Reputation" icon={<Zap className="h-5 w-5" />}>
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted px-4 py-2">
              <span className="text-2xl font-bold">{limits.userXp}</span>
              <span className="text-sm text-muted-foreground ml-1">XP</span>
            </div>
            <Badge variant="outline">Level {limits.userLevel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            XP measures your long-term contributions and reputation in the ecosystem — quests completed, knowledge shared, events hosted, etc.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> XP cannot be edited by users and is managed by the platform (automated rules & admin).
          </p>
        </div>
      </Section>

      <Separator />

      {/* F) Transaction History */}
      <Section title="Transaction History" icon={<History className="h-5 w-5" />}>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={txFilter} onValueChange={setTxFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="earned">Earned</SelectItem>
              <SelectItem value="spent">Spent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {txLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
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
                    {tx.source && <p className="text-xs text-muted-foreground">{tx.source}</p>}
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

      {/* Quest constraints info */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" /> Quest Economy
        </h4>
        <p className="text-xs text-muted-foreground">When you create a quest with a Credits budget, the budget is reserved from your Wallet. You cannot create quests that exceed your available Credits.</p>
        <p className="text-xs text-muted-foreground">Quest participants earn Credits when quests are completed. Credits flow from quest creators to participants.</p>
      </div>

      {/* Commission benefits */}
      <Section title="Commission Benefits" icon={<TrendingDown className="h-5 w-5" />}>
        <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Base platform commission</span>
            <span className="font-medium">3–10%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Your plan discount ({limits.plan.planName})</span>
            <span className="font-bold text-primary">{limits.plan.commissionDiscountPercent}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Minimum final rate</span>
            <span className="font-medium">1%</span>
          </div>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            You can further reduce commission using credits when accepting a proposal.
          </p>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}
