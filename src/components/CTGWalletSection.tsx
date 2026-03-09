import { useState, useEffect, useRef, useCallback } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpRight, ArrowDownRight, Filter, Send, RefreshCw, Loader2, Info, AlertTriangle, Check, ArrowLeft, Sprout, Leaf,
} from "lucide-react";
import { getStewardTier, getNextStewardTier, STEWARD_TIERS } from "@/lib/xpCreditsConfig";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
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

// ── Transfer Modal (2-step wizard) ──
function TransferModal({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ user_id: string; name: string; avatar_url: string | null } | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User search (min 3 chars)
  const { data: searchResults = [] } = useQuery({
    queryKey: ["ctg-user-search", search],
    enabled: search.length >= 3,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url")
        .ilike("name", `%${search}%`)
        .neq("user_id", session?.user?.id ?? "")
        .limit(5);
      return (data ?? []) as { user_id: string; name: string; avatar_url: string | null }[];
    },
  });

  // Own balance
  const { data: ownBalance = 0 } = useQuery({
    queryKey: ["ctg-own-balance-modal", session?.user?.id],
    enabled: !!session?.user?.id && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("ctg_balance")
        .eq("user_id", session!.user.id)
        .maybeSingle();
      return Number((data as any)?.ctg_balance ?? 0);
    },
  });

  const amt = parseFloat(amount) || 0;
  const newBalance = ownBalance - amt;

  const reset = () => {
    setStep(1); setSearch(""); setSelectedUser(null);
    setAmount(""); setNote(""); setError(null);
  };

  const handleConfirm = async () => {
    if (!selectedUser || amt <= 0) return;
    setLoading(true); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("ctg-transfer", {
        body: { to_user_id: selectedUser.user_id, amount: amt, note: note || undefined },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      toast({ title: `✓ ${amt} $CTG sent to ${data.transferred_to}` });
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (err: any) {
      setError(err.message || "Transfer failed");
    } finally { setLoading(false); }
  };

  // Reset on close
  useEffect(() => { if (!open) reset(); }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Send $CTG</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Choose a recipient and amount." : "Review and confirm your transfer."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            {/* User search */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Recipient</label>
              {selectedUser ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 mt-1">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedUser.avatar_url || undefined} />
                    <AvatarFallback>{selectedUser.name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{selectedUser.name}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(null); setSearch(""); }}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name (min 3 chars)..."
                    className="mt-1"
                  />
                  {searchResults.length > 0 && (
                    <div className="border border-border rounded-lg mt-1 max-h-40 overflow-y-auto">
                      {searchResults.map((u) => (
                        <button
                          key={u.user_id}
                          type="button"
                          className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/50 transition-colors text-left"
                          onClick={() => { setSelectedUser(u); setSearch(""); }}
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback>{u.name?.[0] || "?"}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{u.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount ($CTG)</label>
              <Input
                type="number" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0" min="0.01" step="0.01" max={ownBalance}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: {ownBalance.toLocaleString()} $CTG
                {amt > 0 && <span className="ml-2">→ New balance: <strong>{Math.max(0, newBalance).toLocaleString()}</strong></span>}
              </p>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Note (optional, max 200 chars)</label>
              <Textarea
                value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))}
                rows={2} placeholder="What's this for?"
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground text-right">{note.length}/200</p>
            </div>
          </div>
        )}

        {step === 2 && selectedUser && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback>{selectedUser.name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Sending to</p>
                  <p className="font-semibold">{selectedUser.name}</p>
                </div>
              </div>
              <Separator />
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{amt} $CTG</p>
                {note && <p className="text-xs text-muted-foreground mt-2 italic">"{note}"</p>}
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground text-center">
                Your balance after: <strong>{Math.max(0, newBalance).toLocaleString()} $CTG</strong>
              </p>
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 2 && (
            <Button variant="ghost" onClick={() => { setStep(1); setError(null); }} className="gap-1.5 mr-auto">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step === 1 ? (
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedUser || amt <= 0 || amt > ownBalance}
              className="gap-1.5"
            >
              Preview <ArrowUpRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Confirm Transfer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Exchange Modal (with slider, debounced preview, 50% warning) ──
function ExchangeModal({
  open, onOpenChange, balance, rate, onSuccess,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; balance: number; rate: number | null; onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewCredits, setPreviewCredits] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const amt = parseFloat(amount) || 0;
  const isOver50 = balance > 0 && amt > balance * 0.5;
  const localPreview = rate ? Math.floor(amt * rate) : 0;

  // Debounced server preview
  const fetchPreview = useCallback((ctgAmount: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (ctgAmount <= 0) { setPreviewCredits(null); return; }
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const { data } = await supabase.functions.invoke("ctg-exchange", {
          body: { ctg_amount: ctgAmount, preview: true },
        });
        if (data?.credits_you_will_receive != null) {
          setPreviewCredits(data.credits_you_will_receive);
        }
      } catch { /* use local preview */ }
      finally { setPreviewLoading(false); }
    }, 500);
  }, []);

  useEffect(() => { fetchPreview(amt); }, [amt, fetchPreview]);
  useEffect(() => { if (!open) { setAmount(""); setPreviewCredits(null); } }, [open]);

  const handleExchange = async () => {
    if (amt <= 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ctg-exchange", {
        body: { ctg_amount: amt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `✓ Exchange: ${data.ctg_spent} $CTG → ${data.credits_received} credits` });
      onSuccess();
      onOpenChange(false);
      setAmount("");
    } catch (err: any) {
      toast({ title: "Exchange failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const displayCredits = previewCredits ?? localPreview;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Exchange $CTG → Credits</DialogTitle>
          <DialogDescription>
            {rate ? `Current rate: 1 $CTG = ${rate} credits` : "Exchange temporarily unavailable."}
          </DialogDescription>
        </DialogHeader>
        {rate ? (
          <div className="space-y-5">
            {/* Slider */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Amount ($CTG)</label>
              <Slider
                value={[amt]}
                onValueChange={([v]) => setAmount(String(v))}
                min={0} max={Math.max(balance, 1)} step={0.5}
                className="w-full"
              />
              <Input
                type="number" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0" min="0.01" step="0.01" max={balance}
              />
              <p className="text-xs text-muted-foreground">
                Balance: {balance.toLocaleString()} $CTG
              </p>
            </div>

            {/* Preview */}
            {amt > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center space-y-1">
                <p className="text-xs text-muted-foreground">You will receive</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold text-primary">{displayCredits.toLocaleString()} credits</p>
                  {previewLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
            )}

            {/* 50% warning */}
            {isOver50 && (
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                This represents over 50% of your $CTG balance. Are you sure?
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4">No active exchange rate is configured.</p>
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
