import { useState, useMemo, useCallback } from "react";
import {
  Search, Download, Eye, SlidersHorizontal, ChevronLeft, ChevronRight,
  AlertTriangle, User, Mail, Calendar, X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow, subDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 15;
const TX_PAGE_SIZE = 15;

type WalletFilter = "all" | "positive" | "active_month" | "negative";

interface WalletRow {
  id: string;
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  created_at: string;
  name: string;
  email: string;
  avatar_url: string | null;
  last_tx_date: string | null;
  zeroSince30: boolean;
}

/* ─── CSV export helper ─── */
function downloadCsv(rows: WalletRow[]) {
  const header = "Nom,Email,Solde,Lifetime Earned,Lifetime Spent,Dernière transaction\n";
  const lines = rows.map((r) =>
    [
      `"${r.name}"`,
      r.email,
      r.balance,
      r.lifetime_earned,
      r.lifetime_spent,
      r.last_tx_date ?? "",
    ].join(",")
  );
  const blob = new Blob([header + lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ctg-wallets-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Main component ─── */
export function CTGUserWalletsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<WalletFilter>("all");
  const [page, setPage] = useState(0);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [adjustUserId, setAdjustUserId] = useState<string | null>(null);

  // Fetch wallets + profiles
  const { data: walletsData, isLoading } = useQuery({
    queryKey: ["admin-ctg-wallets"],
    queryFn: async () => {
      const { data: wallets } = await supabase
        .from("ctg_wallets")
        .select("id, user_id, balance, lifetime_earned, lifetime_spent, created_at, updated_at")
        .order("balance", { ascending: false });

      if (!wallets?.length) return [];

      const userIds = wallets.map((w) => w.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url, created_at")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      // Get last transaction dates in bulk
      const { data: lastTxs } = await supabase
        .from("ctg_transactions")
        .select("user_id, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      const lastTxMap: Record<string, string> = {};
      (lastTxs ?? []).forEach((t) => {
        if (!lastTxMap[t.user_id]) lastTxMap[t.user_id] = t.created_at;
      });

      const thirtyDaysAgo = subDays(new Date(), 30);

      return wallets.map((w): WalletRow => {
        const p = profileMap[w.user_id];
        const zeroSince30 =
          w.balance === 0 &&
          !!w.updated_at &&
          new Date(w.updated_at) < thirtyDaysAgo;
        return {
          id: w.id,
          user_id: w.user_id,
          balance: w.balance,
          lifetime_earned: w.lifetime_earned,
          lifetime_spent: w.lifetime_spent,
          created_at: w.created_at,
          name: p?.name ?? "Unknown",
          email: p?.email ?? "",
          avatar_url: p?.avatar_url ?? null,
          last_tx_date: lastTxMap[w.user_id] ?? null,
          zeroSince30,
        };
      });
    },
    staleTime: 20_000,
  });

  const filtered = useMemo(() => {
    let rows = walletsData ?? [];
    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      );
    }
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    switch (filter) {
      case "positive":
        rows = rows.filter((r) => r.balance > 0);
        break;
      case "active_month":
        rows = rows.filter((r) => r.last_tx_date && r.last_tx_date >= monthStart);
        break;
      case "negative":
        rows = rows.filter((r) => r.balance < 0);
        break;
    }
    return rows;
  }, [walletsData, search, filter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page on filter/search change
  const handleSearch = (v: string) => { setSearch(v); setPage(0); };
  const handleFilter = (v: string) => { setFilter(v as WalletFilter); setPage(0); };

  const detailWallet = useMemo(
    () => (walletsData ?? []).find((w) => w.user_id === detailUserId),
    [walletsData, detailUserId]
  );
  const adjustWallet = useMemo(
    () => (walletsData ?? []).find((w) => w.user_id === adjustUserId),
    [walletsData, adjustUserId]
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={handleFilter}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All wallets</SelectItem>
              <SelectItem value="positive">Balance &gt; 0</SelectItem>
              <SelectItem value="active_month">Active this month</SelectItem>
              <SelectItem value="negative">Negative balance ⚠️</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(filtered)}
            disabled={!filtered.length}
          >
            <Download className="h-4 w-4 mr-1.5" />
            CSV
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} wallet(s)</p>

      {/* Main table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Earned</TableHead>
                <TableHead className="text-right hidden lg:table-cell">Spent</TableHead>
                <TableHead className="hidden sm:table-cell">Last tx</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No wallets found.
                  </TableCell>
                </TableRow>
              )}
              {pageRows.map((w) => (
                <TableRow
                  key={w.id}
                  className={
                    w.balance < 0
                      ? "bg-destructive/5"
                      : w.zeroSince30
                      ? "bg-destructive/5"
                      : undefined
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={w.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {w.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate max-w-[140px]">{w.name}</span>
                      {w.balance < 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Negative</Badge>
                      )}
                      {w.zeroSince30 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/40">
                          0 &gt;30j
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[180px]">
                    {w.email}
                  </TableCell>
                  <TableCell className={`text-right font-mono tabular-nums text-sm font-semibold ${w.balance < 0 ? "text-destructive" : ""}`}>
                    {w.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell text-sm tabular-nums text-muted-foreground">
                    {w.lifetime_earned.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right hidden lg:table-cell text-sm tabular-nums text-muted-foreground">
                    {w.lifetime_spent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                    {w.last_tx_date
                      ? formatDistanceToNow(new Date(w.last_tx_date), { addSuffix: true, locale: fr })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailUserId(w.user_id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAdjustUserId(w.user_id)}>
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page + 1} / {totalPages}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <WalletDetailDialog
        wallet={detailWallet ?? null}
        open={!!detailUserId}
        onClose={() => setDetailUserId(null)}
      />

      {/* Adjust dialog */}
      <WalletAdjustDialog
        wallet={adjustWallet ?? null}
        open={!!adjustUserId}
        onClose={() => setAdjustUserId(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-ctg-wallets"] });
          queryClient.invalidateQueries({ queryKey: ["admin-ctg-metrics"] });
        }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════
   Detail Dialog
   ════════════════════════════════════════════════ */
function WalletDetailDialog({
  wallet,
  open,
  onClose,
}: {
  wallet: WalletRow | null;
  open: boolean;
  onClose: () => void;
}) {
  const [txPage, setTxPage] = useState(0);

  const { data: txData } = useQuery({
    queryKey: ["admin-ctg-user-txs", wallet?.user_id, txPage],
    enabled: open && !!wallet,
    queryFn: async () => {
      const from = txPage * TX_PAGE_SIZE;
      const to = from + TX_PAGE_SIZE - 1;
      const { data, count } = await supabase
        .from("ctg_transactions")
        .select("id, type, amount, balance_after, note, created_at", { count: "exact" })
        .eq("user_id", wallet!.user_id)
        .order("created_at", { ascending: false })
        .range(from, to);
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const txTotalPages = Math.ceil((txData?.total ?? 0) / TX_PAGE_SIZE);

  // Reset page when switching users
  const handleClose = () => { setTxPage(0); onClose(); };

  if (!wallet) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={wallet.avatar_url ?? undefined} />
              <AvatarFallback>{wallet.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p>{wallet.name}</p>
              <p className="text-xs text-muted-foreground font-normal">{wallet.email}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1 text-xs">
            <Calendar className="h-3 w-3" />
            Membre depuis {format(new Date(wallet.created_at), "dd MMM yyyy", { locale: fr })}
          </DialogDescription>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          {[
            { label: "Solde", value: wallet.balance },
            { label: "Lifetime earned", value: wallet.lifetime_earned },
            { label: "Lifetime spent", value: wallet.lifetime_spent },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold tabular-nums">
                {s.value.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>

        {/* Transaction history */}
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Historique des transactions</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="hidden sm:table-cell">Note</TableHead>
                <TableHead className="text-right">Solde après</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(txData?.rows ?? []).map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(tx.created_at), "dd/MM/yy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{tx.type}</Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono tabular-nums text-sm ${tx.amount >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[150px] truncate">
                    {tx.note ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-sm">
                    {tx.balance_after.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
              {(txData?.rows ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Aucune transaction.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {txTotalPages > 1 && (
            <div className="flex items-center justify-between pt-3">
              <p className="text-xs text-muted-foreground">Page {txPage + 1} / {txTotalPages}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={txPage === 0} onClick={() => setTxPage(txPage - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" disabled={txPage >= txTotalPages - 1} onClick={() => setTxPage(txPage + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ════════════════════════════════════════════════
   Adjust Dialog
   ════════════════════════════════════════════════ */
function WalletAdjustDialog({
  wallet,
  open,
  onClose,
  onSuccess,
}: {
  wallet: WalletRow | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [action, setAction] = useState<"grant" | "deduct">("grant");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const amtNum = parseFloat(amount);
  const isValidAmt = !isNaN(amtNum) && amtNum >= 0.01;
  const isValidReason = reason.trim().length >= 10 && reason.trim().length <= 500;
  const canSubmit = isValidAmt && isValidReason && !!wallet && !!user;

  const effectiveDeduction = wallet && action === "deduct" && isValidAmt
    ? Math.min(amtNum, wallet.balance)
    : amtNum;
  const isPartial = action === "deduct" && isValidAmt && wallet && amtNum > wallet.balance;
  const newBalance = wallet
    ? action === "grant"
      ? wallet.balance + (isValidAmt ? amtNum : 0)
      : Math.max(0, wallet.balance - (isValidAmt ? amtNum : 0))
    : 0;

  const handleSubmit = async () => {
    if (!canSubmit || !wallet) return;
    setSubmitting(true);
    try {
      const rpcName = action === "grant" ? "admin_grant_ctg" : "admin_deduct_ctg";
      const { error } = await supabase.rpc(rpcName as any, {
        target_user_id: wallet.user_id,
        admin_user_id: user!.id,
        amount: action === "deduct" ? effectiveDeduction : amtNum,
        reason: reason.trim(),
      });
      if (error) throw error;
      toast.success(
        action === "grant"
          ? `✓ ${amtNum} $CTG octroyés à ${wallet.name}. Nouveau solde : ${newBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} $CTG`
          : `✓ ${effectiveDeduction} $CTG déduits de ${wallet.name}. Nouveau solde : ${newBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} $CTG`
      );
      onSuccess();
      handleClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'ajustement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setAction("grant");
    setAmount("");
    setReason("");
    onClose();
  };

  if (!wallet) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Ajuster le solde de {wallet.name}
          </DialogTitle>
          <DialogDescription>
            Solde actuel : <strong>{wallet.balance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} $CTG</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Action type */}
          <RadioGroup value={action} onValueChange={(v) => setAction(v as "grant" | "deduct")} className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="grant" id="grant" />
              <Label htmlFor="grant" className="cursor-pointer">Octroyer $CTG</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="deduct" id="deduct" />
              <Label htmlFor="deduct" className="cursor-pointer">Déduire $CTG</Label>
            </div>
          </RadioGroup>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Montant</Label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>Raison (10–500 caractères) *</Label>
            <Textarea
              maxLength={500}
              placeholder="Justification de l'ajustement..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none h-20"
            />
            <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
          </div>

          {/* Partial deduction warning */}
          {isPartial && (
            <div className="flex items-start gap-2 rounded-md bg-yellow-50/60 dark:bg-yellow-900/10 border border-yellow-500/30 p-3">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800 dark:text-yellow-400">
                Le solde sera ramené à 0 $CTG (déduction partielle de{" "}
                <strong>{effectiveDeduction.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</strong> $CTG
                au lieu de {amtNum.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}).
              </p>
            </div>
          )}

          {/* Preview */}
          {isValidAmt && (
            <div className="rounded-md bg-muted/50 p-3">
              <p className="text-sm">
                Nouveau solde après opération :{" "}
                <strong>{newBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} $CTG</strong>
              </p>
            </div>
          )}

          {/* Submit with confirmation */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="w-full" disabled={!canSubmit || submitting}>
                {submitting ? "Traitement..." : "Confirmer l'ajustement"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer l'ajustement</AlertDialogTitle>
                <AlertDialogDescription>
                  {action === "grant"
                    ? `Octroyer ${amtNum} $CTG à ${wallet.name}. Nouveau solde : ${newBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} $CTG.`
                    : `Déduire ${effectiveDeduction} $CTG de ${wallet.name}. Nouveau solde : ${newBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} $CTG.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>Confirmer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
