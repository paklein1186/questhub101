import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { CTGBalanceBadge } from "@/components/CTGBalanceBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpRight, ArrowDownRight, Filter, Send, RefreshCw, Loader2, Info,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

// ── Type icons & labels ──
const TX_META: Record<string, { icon: string; label: string }> = {
  EARNED_QUEST: { icon: "🌱", label: "Earned (Quest)" },
  EARNED_SUBTASK: { icon: "🌱", label: "Earned (Subtask)" },
  EARNED_SERVICE: { icon: "🌱", label: "Earned (Service)" },
  EARNED_RITUAL: { icon: "🌱", label: "Earned (Ritual)" },
  EARNED_GOVERNANCE: { icon: "🌱", label: "Earned (Governance)" },
  EARNED_MENTORSHIP: { icon: "🌱", label: "Earned (Mentorship)" },
  TRANSFER_IN: { icon: "↓", label: "Received" },
  TRANSFER_OUT: { icon: "↑", label: "Sent" },
  EXCHANGE_TO_CREDITS: { icon: "↔", label: "Exchanged to Credits" },
  DEMURRAGE: { icon: "⏳", label: "Demurrage" },
  COMMONS_EMISSION: { icon: "🌍", label: "Commons share" },
  ADMIN_GRANT: { icon: "🔧", label: "Admin grant" },
  ADMIN_DEDUCT: { icon: "🔧", label: "Admin deduction" },
};

const CONTRIBUTION_TYPE_LABELS: Record<string, string> = {
  subtask_completed: "Subtask completed",
  quest_completed: "Quest completed",
  proposal_accepted: "Proposal accepted",
  review_given: "Review given",
  ritual_participation: "Ritual participation",
  documentation: "Documentation",
  mentorship: "Mentorship",
  governance_vote: "Governance vote",
  ecological_annotation: "Ecological annotation",
};

const PAGE_SIZE = 20;

export function CTGWalletSection() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [txFilter, setTxFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [transferOpen, setTransferOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);

  // ── Summary via RPC ──
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["ctg-summary", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_ctg_summary", { p_user_id: userId! });
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 30_000,
  });

  // ── Exchange rate ──
  const { data: exchangeRate } = useQuery({
    queryKey: ["ctg-exchange-rate"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ctg_exchange_rates")
        .select("rate_ctg_to_credits")
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      return (data as any)?.rate_ctg_to_credits ?? null;
    },
  });

  // ── Transactions ──
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["ctg-transactions", userId, page],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("ctg_transactions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      return (data ?? []) as any[];
    },
  });

  // ── Emission rules ──
  const { data: emissionRules = [] } = useQuery({
    queryKey: ["ctg-emission-rules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ctg_emission_rules")
        .select("*")
        .eq("is_active", true)
        .order("ctg_amount", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const filteredTx = transactions.filter((tx: any) => {
    if (txFilter === "all") return true;
    if (txFilter === "earned") return tx.type.startsWith("EARNED");
    if (txFilter === "sent") return tx.type === "TRANSFER_OUT";
    if (txFilter === "received") return tx.type === "TRANSFER_IN";
    if (txFilter === "exchanged") return tx.type === "EXCHANGE_TO_CREDITS";
    return true;
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["ctg-summary"] });
    qc.invalidateQueries({ queryKey: ["ctg-transactions"] });
    qc.invalidateQueries({ queryKey: ["nav-balances"] });
  };

  if (summaryLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const balance = summary?.ctg_balance ?? 0;

  return (
    <div className="space-y-6">
      {/* ═══ SECTION 1: Overview ═══ */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Your $CTG Balance</p>
            <CTGBalanceBadge balance={balance} size="lg" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Send $CTG
            </Button>
            <Button size="sm" variant="outline" onClick={() => setExchangeOpen(true)} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Exchange to Credits
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Lifetime Earned" value={summary?.lifetime_earned ?? 0} color="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Lifetime Spent" value={summary?.lifetime_spent ?? 0} color="text-destructive" />
          {exchangeRate && (
            <StatCard label="Exchange Rate" value={`1 $CTG = ${exchangeRate} credits`} />
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          <Link to="/me?tab=wallet" className="text-primary hover:underline">← View Platform Credits</Link>
        </p>
      </div>

      {/* ═══ SECTION 2: Transaction history ═══ */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h3 className="font-semibold text-sm">Transaction History</h3>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={txFilter} onValueChange={setTxFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="earned">Earned</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="exchanged">Exchanged</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {txLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filteredTx.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No transactions yet. Contribute to earn $CTG!</p>
        ) : (
          <div className="space-y-1">
            {filteredTx.map((tx: any) => {
              const meta = TX_META[tx.type] || { icon: "•", label: tx.type };
              const isPositive = tx.amount > 0;
              return (
                <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-base w-6 text-center shrink-0">{meta.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{meta.label}</p>
                      {tx.note && <p className="text-xs text-muted-foreground line-clamp-1">{tx.note}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      {isPositive ? "+" : ""}{Number(tx.amount).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center pt-2">
          <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            ← Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page + 1}</span>
          <Button size="sm" variant="ghost" disabled={transactions.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
            Next →
          </Button>
        </div>
      </div>

      {/* ═══ SECTION 3: How to earn ═══ */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" /> How to earn $CTG
        </h3>
        <p className="text-xs text-muted-foreground">
          $CTG tokens are emitted automatically when you make verified contributions. They cannot be purchased.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Contribution Type</th>
                <th className="py-2 pr-4 text-right">$CTG Earned</th>
                <th className="py-2 text-right">Commons Share</th>
              </tr>
            </thead>
            <tbody>
              {emissionRules.map((rule: any) => (
                <tr key={rule.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 pr-4 font-medium">
                    {CONTRIBUTION_TYPE_LABELS[rule.contribution_type] || rule.contribution_type}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <Badge variant="secondary" className="text-xs">🌱 {rule.ctg_amount}</Badge>
                  </td>
                  <td className="py-2 text-right text-muted-foreground">{rule.commons_share_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ Modals ═══ */}
      <TransferModal open={transferOpen} onOpenChange={setTransferOpen} onSuccess={invalidateAll} />
      <ExchangeModal
        open={exchangeOpen}
        onOpenChange={setExchangeOpen}
        balance={balance}
        rate={exchangeRate}
        onSuccess={invalidateAll}
      />
    </div>
  );
}

// ── Stat card ──
function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color || ""}`}>
        {typeof value === "number" ? value.toLocaleString("en-US", { maximumFractionDigits: 2 }) : value}
      </p>
    </div>
  );
}

// ── Transfer Modal ──
function TransferModal({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
  const { toast } = useToast();
  const [toUserId, setToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [recipientName, setRecipientName] = useState<string | null>(null);

  // Lookup recipient
  const lookupUser = async (id: string) => {
    if (!id || id.length < 10) { setRecipientName(null); return; }
    const { data } = await supabase.from("profiles_public").select("name").eq("user_id", id).maybeSingle();
    setRecipientName(data?.name || null);
  };

  const handleTransfer = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ctg-transfer", {
        body: { to_user_id: toUserId, amount: amt, note: note || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `Sent ${amt} $CTG to ${data.transferred_to}` });
      onSuccess();
      onOpenChange(false);
      setToUserId(""); setAmount(""); setNote("");
    } catch (err: any) {
      toast({ title: "Transfer failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Send $CTG</DialogTitle>
          <DialogDescription>Transfer $CTG tokens to another member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Recipient User ID</label>
            <Input
              value={toUserId}
              onChange={(e) => { setToUserId(e.target.value); lookupUser(e.target.value); }}
              placeholder="Paste user ID"
            />
            {recipientName && <p className="text-xs text-emerald-600 mt-1">→ {recipientName}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount ($CTG)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="0.01" step="0.01" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What's this for?" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleTransfer} disabled={loading || !toUserId || !amount} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Exchange Modal ──
function ExchangeModal({
  open, onOpenChange, balance, rate, onSuccess,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; balance: number; rate: number | null; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const amt = parseFloat(amount) || 0;
  const creditsPreview = rate ? Math.floor(amt * rate) : 0;

  const handleExchange = async () => {
    if (amt <= 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ctg-exchange", {
        body: { ctg_amount: amt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `Exchanged ${data.ctg_spent} $CTG → ${data.credits_received} credits` });
      onSuccess();
      onOpenChange(false);
      setAmount("");
    } catch (err: any) {
      toast({ title: "Exchange failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Exchange $CTG → Credits</DialogTitle>
          <DialogDescription>
            {rate ? `Current rate: 1 $CTG = ${rate} credits` : "Exchange is temporarily unavailable."}
          </DialogDescription>
        </DialogHeader>
        {rate ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount ($CTG)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="0.01" step="0.01" max={balance} />
              <p className="text-xs text-muted-foreground mt-1">Balance: {balance.toLocaleString()} $CTG</p>
            </div>
            {amt > 0 && (
              <div className="rounded-lg border border-border bg-muted/50 p-3 text-center">
                <p className="text-xs text-muted-foreground">You will receive</p>
                <p className="text-2xl font-bold text-primary">{creditsPreview.toLocaleString()} credits</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No active exchange rate is configured. Please try again later.</p>
        )}
        <DialogFooter>
          <Button onClick={handleExchange} disabled={loading || !rate || amt <= 0 || amt > balance} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Exchange
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
