import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, TrendingUp, Users, Heart, Coins, BarChart3, Recycle, Zap, Globe, Loader2 } from "lucide-react";
import { TREASURY_ALLOCATION } from "@/lib/xpCreditsConfig";
import { PlatformGiveBackAdmin } from "@/components/giveback/GiveBackHistory";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function TreasuryDashboard() {
  const { data: settings = {}, isLoading: loadingSettings } = useQuery({
    queryKey: ["cooperative-settings-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("cooperative_settings").select("key, value");
      const s: Record<string, any> = {};
      (data ?? []).forEach((r: any) => { s[r.key] = r.value; });
      return s;
    },
  });

  const { data: allocations = [], isLoading: loadingAlloc } = useQuery({
    queryKey: ["treasury-allocations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ecosystem_treasury_allocations" as any)
        .select("*")
        .order("period_start", { ascending: false })
        .limit(12);
      return (data ?? []) as any[];
    },
  });

  // Economy stats
  const { data: econStats, isLoading: loadingEcon } = useQuery({
    queryKey: ["admin-economy-stats"],
    queryFn: async () => {
      const [
        { count: activeUsers },
        { data: creditTx },
        { data: bookings },
        { data: demurrageLog },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }).gt("credits_balance", 0),
        supabase.from("credit_transactions").select("amount, type").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("bookings").select("amount, payment_status").eq("payment_status", "PAID").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
        supabase.from("demurrage_log").select("fade_amount").gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);

      const gmv = (bookings ?? []).reduce((s, b) => s + (Number(b.amount) || 0), 0);
      const commissionRevenue = gmv * 0.10; // approximate
      const creditsMinted = (creditTx ?? []).filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const creditsSpent = (creditTx ?? []).filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      const monthlyFaded = (demurrageLog ?? []).reduce((s, d) => s + (d.fade_amount || 0), 0);
      const velocity = creditsMinted > 0 ? (creditsSpent / creditsMinted * 100).toFixed(1) : "0";

      return {
        gmv,
        commissionRevenue: Math.round(commissionRevenue * 100) / 100,
        activeHolders: activeUsers ?? 0,
        creditsMinted,
        creditsSpent,
        monthlyFaded,
        velocity,
      };
    },
    staleTime: 60_000,
  });

  const treasuryBalance = Number(settings?.treasury_balance) || 0;

  const allocationItems = [
    { ...TREASURY_ALLOCATION.REINVESTMENT, icon: TrendingUp, color: "text-blue-500" },
    { ...TREASURY_ALLOCATION.SHAREHOLDERS, icon: Users, color: "text-amber-500" },
    { ...TREASURY_ALLOCATION.ECOSYSTEM, icon: Building2, color: "text-emerald-500" },
    { ...TREASURY_ALLOCATION.SOLIDARITY, icon: Heart, color: "text-rose-500" },
  ];

  const isLoading = loadingSettings || loadingEcon;

  return (
    <div className="space-y-6">
      {/* GMV & Revenue */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-primary" /> Marketplace & Revenue (30d)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          ) : (
            <>
              <StatCard icon={Coins} label="GMV (30d)" value={`€${(econStats?.gmv ?? 0).toLocaleString()}`} color="text-primary" />
              <StatCard icon={TrendingUp} label="Commission Rev." value={`€${(econStats?.commissionRevenue ?? 0).toLocaleString()}`} color="text-emerald-500" />
              <StatCard icon={Users} label="Active Holders" value={String(econStats?.activeHolders ?? 0)} color="text-blue-500" />
              <StatCard icon={Zap} label="Platform Credit Velocity" value={`${econStats?.velocity ?? 0}%`} color="text-amber-500" />
            </>
          )}
        </div>
      </div>

      {/* Credit Circulation */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
          <Recycle className="h-5 w-5 text-blue-500" /> 🔷 Platform Credit Circulation (30d)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
          ) : (
            <>
              <StatCard icon={Coins} label="Platform Credits Minted" value={String(econStats?.creditsMinted ?? 0)} color="text-emerald-500" />
              <StatCard icon={Coins} label="Platform Credits Spent" value={String(econStats?.creditsSpent ?? 0)} color="text-orange-500" />
              <StatCard icon={Recycle} label="Platform Credits Faded" value={String(econStats?.monthlyFaded ?? 0)} color="text-rose-500" />
            </>
          )}
        </div>
      </div>

      {/* Treasury & Allocation */}
      <div>
        <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">
          <Building2 className="h-5 w-5 text-primary" /> Ecosystem Treasury
        </h3>
        <Card className="border-primary/20 bg-primary/5 mb-4">
          <CardContent className="p-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Treasury Balance</p>
            <p className="text-3xl font-bold">{loadingSettings ? "…" : treasuryBalance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">Platform Credits (from demurrage redistribution)</p>
          </CardContent>
        </Card>

        <h4 className="text-sm font-semibold mb-2">Allocation Model (applied to surplus)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {allocationItems.map((item) => (
            <Card key={item.label} className="border-border/50">
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <p className="text-xl font-bold">{item.percent}%</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Allocation History */}
      {allocations.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Allocation History</h4>
          <div className="rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Period</th>
                  <th className="text-right p-3 font-medium">Surplus</th>
                  <th className="text-right p-3 font-medium">Reinvest</th>
                  <th className="text-right p-3 font-medium">Shareholders</th>
                  <th className="text-right p-3 font-medium">Treasury</th>
                  <th className="text-right p-3 font-medium">Solidarity</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a: any) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{a.period_label}</td>
                    <td className="p-3 text-right">€{Number(a.total_surplus).toLocaleString()}</td>
                    <td className="p-3 text-right">€{Number(a.reinvestment_amount).toLocaleString()}</td>
                    <td className="p-3 text-right">€{Number(a.shareholder_amount).toLocaleString()}</td>
                    <td className="p-3 text-right">€{Number(a.treasury_amount).toLocaleString()}</td>
                    <td className="p-3 text-right">€{Number(a.solidarity_amount).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Platform Give-back */}
      <PlatformGiveBackAdmin />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <Card className="border-border/50 bg-muted/30">
      <CardContent className="p-4 flex flex-col items-center text-center gap-1">
        <Icon className={`h-5 w-5 ${color}`} />
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}
