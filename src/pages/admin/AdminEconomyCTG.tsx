import { useState } from "react";
import { Sprout, RefreshCw, Wallet, TrendingUp, Globe, Users, ArrowLeftRight, BarChart3 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

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

/* ─── Placeholder tabs for #11, #12, #13 ─── */
function CTGExchangeRatesTab() {
  return <p className="text-muted-foreground text-sm py-8 text-center">Section Taux de Change — à venir.</p>;
}
function CTGUserWalletsTab() {
  return <p className="text-muted-foreground text-sm py-8 text-center">Section Wallets Utilisateurs — à venir.</p>;
}
function CTGEmissionRulesTab() {
  return <p className="text-muted-foreground text-sm py-8 text-center">Section Règles d'Émission — à venir.</p>;
}

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
