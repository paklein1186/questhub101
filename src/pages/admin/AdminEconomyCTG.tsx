import { useState, useMemo } from "react";
import {
  Sprout, RefreshCw, Wallet, TrendingUp, Globe, Users,
  ArrowLeftRight, BarChart3, AlertTriangle, Check, Clock, User,
  ChevronLeft, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

/* ─── Sub-tab: Vue Globale ─── */
function CTGOverviewTab() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["admin-ctg-metrics"],
    queryFn: async () => {
      const [walletsRes, commonsRes, rateRes, exchangeVolRes] = await Promise.all([
        supabase.from("ctg_wallets").select("balance, lifetime_earned, lifetime_spent"),
        supabase.from("ctg_commons_wallet").select("balance").limit(1).single(),
        supabase
          .from("ctg_exchange_rates")
          .select("rate_ctg_to_credits")
          .eq("active", true)
          .order("valid_from", { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from("ctg_transactions")
          .select("amount")
          .eq("type", "EXCHANGE_TO_CREDITS")
          .gte("created_at", subDays(new Date(), 30).toISOString()),
      ]);

      const wallets = walletsRes.data ?? [];
      const totalCirculation = wallets.reduce((s, w) => s + (w.balance ?? 0), 0);
      const totalEmitted = wallets.reduce((s, w) => s + (w.lifetime_earned ?? 0), 0);
      const activeWallets = wallets.filter((w) => (w.balance ?? 0) > 0).length;
      const commonsBalance = commonsRes.data?.balance ?? 0;
      const exchangeRate = rateRes.data?.rate_ctg_to_credits ?? 0;
      const exchangeVolume = (exchangeVolRes.data ?? []).reduce(
        (s, t) => s + Math.abs(t.amount ?? 0),
        0
      );

      return { totalCirculation, totalEmitted, activeWallets, commonsBalance, exchangeRate, exchangeVolume };
    },
    staleTime: 30_000,
  });

  const { data: chartData } = useQuery({
    queryKey: ["admin-ctg-daily-emissions"],
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data } = await supabase
        .from("ctg_transactions")
        .select("amount, created_at")
        .gt("amount", 0)
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      const byDay: Record<string, number> = {};
      for (let i = 0; i < 30; i++) {
        const d = format(subDays(new Date(), 29 - i), "yyyy-MM-dd");
        byDay[d] = 0;
      }
      (data ?? []).forEach((t) => {
        const d = format(new Date(t.created_at), "yyyy-MM-dd");
        if (d in byDay) byDay[d] += t.amount;
      });

      return Object.entries(byDay).map(([date, amount]) => ({
        date: format(new Date(date), "dd/MM"),
        amount: Math.round(amount * 100) / 100,
      }));
    },
    staleTime: 30_000,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["admin-ctg-metrics"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-ctg-daily-emissions"] });
    setRefreshing(false);
  };

  const stats = [
    { label: "$CTG en circulation", value: metrics?.totalCirculation ?? 0, icon: Wallet, color: "text-emerald-600" },
    { label: "Total émis", value: metrics?.totalEmitted ?? 0, icon: TrendingUp, color: "text-blue-600" },
    { label: "Wallet Communs", value: metrics?.commonsBalance ?? 0, icon: Globe, color: "text-amber-600" },
    { label: "Wallets actifs", value: metrics?.activeWallets ?? 0, icon: Users, color: "text-violet-600", isCount: true },
    { label: "Taux de change", value: metrics?.exchangeRate ?? 0, icon: ArrowLeftRight, color: "text-cyan-600", suffix: " credits/$CTG" },
    { label: "Volume échanges 30j", value: metrics?.exchangeVolume ?? 0, icon: BarChart3, color: "text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Vue Globale</h3>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground truncate">{s.label}</span>
              </div>
              <p className="text-xl font-bold tabular-nums">
                {isLoading
                  ? "—"
                  : s.isCount
                  ? s.value
                  : `${s.value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${s.suffix ?? ""}`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Émissions quotidiennes $CTG — 30 derniers jours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                  formatter={(val: number) => [`${val} $CTG`, "Émis"]}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Sub-tab: Taux de Change ─── */
function CTGExchangeRatesTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newRate, setNewRate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  // Current active rate
  const { data: currentRate } = useQuery({
    queryKey: ["admin-ctg-current-rate"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ctg_exchange_rates")
        .select("rate_ctg_to_credits, created_at, valid_from, reason, set_by_user_id, active")
        .eq("active", true)
        .order("valid_from", { ascending: false })
        .limit(1)
        .single();
      if (!data) return null;
      // Fetch setter name
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", data.set_by_user_id)
        .single();
      return { ...data, setterName: profile?.name ?? data.set_by_user_id };
    },
    staleTime: 15_000,
  });

  // History
  const { data: history } = useQuery({
    queryKey: ["admin-ctg-rate-history", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count } = await supabase
        .from("ctg_exchange_rates")
        .select("id, rate_ctg_to_credits, created_at, valid_from, reason, set_by_user_id, active", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      // Batch fetch setter names
      const userIds = [...new Set((data ?? []).map((r) => r.set_by_user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, name").in("user_id", userIds)
        : { data: [] };
      const nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p.name]));
      return {
        rows: (data ?? []).map((r) => ({ ...r, setterName: nameMap[r.set_by_user_id] ?? r.set_by_user_id })),
        total: count ?? 0,
      };
    },
    staleTime: 15_000,
  });

  const daysSinceLastChange = useMemo(() => {
    if (!currentRate?.valid_from) return 0;
    return differenceInDays(new Date(), new Date(currentRate.valid_from));
  }, [currentRate]);

  const rateNum = parseInt(newRate, 10);
  const isValidRate = !isNaN(rateNum) && rateNum >= 1 && rateNum <= 1000;
  const canSubmit = isValidRate && reason.trim().length > 0 && reason.length <= 500;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("set_ctg_exchange_rate" as any, {
        admin_id: user.id,
        new_rate: rateNum,
        reason: reason.trim(),
      });
      if (error) throw error;
      toast.success(`Nouveau taux appliqué : 1 $CTG = ${rateNum} credits`);
      setNewRate("");
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-ctg-current-rate"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ctg-rate-history"] });
      queryClient.invalidateQueries({ queryKey: ["admin-ctg-metrics"] });
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de la mise à jour du taux");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil((history?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* 90-day warning */}
      {daysSinceLastChange >= 90 && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-50/50 dark:bg-yellow-900/10 p-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
              Aucun ajustement du taux depuis {daysSinceLastChange} jours
            </p>
            <p className="text-xs text-yellow-700/80 dark:text-yellow-500/80 mt-0.5">
              Pensez à vérifier la pertinence économique du taux de change actuel.
            </p>
          </div>
        </div>
      )}

      {/* Current rate card */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Taux actuel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-bold tabular-nums">
            1 $CTG = {currentRate?.rate_ctg_to_credits ?? "—"} credits
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {currentRate?.valid_from
                ? format(new Date(currentRate.valid_from), "dd MMM yyyy HH:mm", { locale: fr })
                : "—"}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {currentRate?.setterName ?? "—"}
            </span>
          </div>
          {currentRate?.reason && (
            <p className="text-sm text-muted-foreground italic">« {currentRate.reason} »</p>
          )}
        </CardContent>
      </Card>

      {/* New rate form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Définir un nouveau taux</CardTitle>
          <CardDescription>Le nouveau taux s'appliquera immédiatement à tous les échanges.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-rate">Nouveau taux (credits par $CTG)</Label>
              <Input
                id="new-rate"
                type="number"
                min={1}
                max={1000}
                step={1}
                placeholder="ex : 10"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
              />
              {newRate && !isValidRate && (
                <p className="text-xs text-destructive">Valeur entre 1 et 1000, sans décimales.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-reason">Raison du changement *</Label>
              <Textarea
                id="rate-reason"
                maxLength={500}
                placeholder="Justifiez le changement de taux..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="resize-none h-20"
              />
              <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
            </div>
          </div>

          {isValidRate && (
            <div className="rounded-md bg-muted/60 p-3 text-sm space-y-1">
              <p className="font-medium">Aperçu avec ce taux :</p>
              <p>100 $CTG = <strong>{(100 * rateNum).toLocaleString("fr-FR")}</strong> credits</p>
              <p>1 000 $CTG = <strong>{(1000 * rateNum).toLocaleString("fr-FR")}</strong> credits</p>
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!canSubmit || submitting}>
                {submitting ? "Application..." : "Appliquer le nouveau taux"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer le changement de taux</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr ? Le taux <strong>1 $CTG = {rateNum} credits</strong> s'applique immédiatement
                  à tous les échanges sur la plateforme.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>Confirmer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* History table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historique des taux</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Taux</TableHead>
                <TableHead>Défini par</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(history?.rows ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {r.rate_ctg_to_credits}
                  </TableCell>
                  <TableCell className="text-sm">{r.setterName}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{r.reason ?? "—"}</TableCell>
                  <TableCell>
                    {r.active ? (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" /> Actif
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Archivé</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(history?.rows ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucun historique de taux.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} / {totalPages}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import { CTGUserWalletsTab } from "@/components/admin/CTGUserWalletsTab";
import { CTGEmissionRulesTab } from "@/components/admin/CTGEmissionRulesTab";

/* ─── Main Page ─── */
export default function AdminEconomyCTG() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sprout className="h-6 w-6 text-emerald-600" />
        <h2 className="font-display text-2xl font-bold">$CTG Token</h2>
      </div>
      <p className="text-sm text-muted-foreground max-w-xl">
        Administration du token $CTG : métriques globales, taux de change, wallets utilisateurs et règles d'émission.
      </p>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vue Globale</TabsTrigger>
          <TabsTrigger value="rates">Taux de Change</TabsTrigger>
          <TabsTrigger value="wallets">Wallets Utilisateurs</TabsTrigger>
          <TabsTrigger value="rules">Règles d'Émission</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><CTGOverviewTab /></TabsContent>
        <TabsContent value="rates"><CTGExchangeRatesTab /></TabsContent>
        <TabsContent value="wallets"><CTGUserWalletsTab /></TabsContent>
        <TabsContent value="rules"><CTGEmissionRulesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
