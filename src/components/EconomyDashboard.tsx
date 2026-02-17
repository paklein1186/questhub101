import { useQuery } from "@tanstack/react-query";
import { Coins, Building2, Recycle, TrendingUp, Users, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface EconomyStats {
  total_credits_in_circulation: number;
  treasury_balance: number;
  total_lifetime_faded: number;
  monthly_faded: number;
  monthly_minted: number;
  active_holders: number;
}

export function EconomyDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["economy-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("economy_stats" as any)
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as EconomyStats;
    },
    staleTime: 60_000,
  });

  const items = [
    { icon: Coins, label: "Credits in Circulation", value: stats?.total_credits_in_circulation ?? 0, color: "text-primary" },
    { icon: Building2, label: "Treasury Balance", value: stats?.treasury_balance ?? 0, color: "text-amber-500" },
    { icon: Recycle, label: "Redistributed This Month", value: stats?.monthly_faded ?? 0, color: "text-emerald-500" },
    { icon: TrendingUp, label: "Minted This Month", value: stats?.monthly_minted ?? 0, color: "text-blue-500" },
    { icon: Zap, label: "Total Lifetime Redistributed", value: stats?.total_lifetime_faded ?? 0, color: "text-orange-500" },
    { icon: Users, label: "Active Credit Holders", value: stats?.active_holders ?? 0, color: "text-violet-500" },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="border-border/50 bg-muted/30">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <item.icon className={`h-5 w-5 ${item.color}`} />
            <p className="text-xl font-bold">{item.value.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{item.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
