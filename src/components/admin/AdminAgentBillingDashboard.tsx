import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/PageShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bot, Coins, TrendingUp, AlertTriangle } from "lucide-react";
import { useMonetizedActionTypes, useAgentPlans } from "@/hooks/useAgentBilling";
import { format } from "date-fns";

function useAllAgentBilling() {
  return useQuery({
    queryKey: ["admin-agent-billing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_billing_profiles" as any)
        .select("*, agents(name, category), agent_plans(label, monthly_price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

function useAllUsageAggregated() {
  return useQuery({
    queryKey: ["admin-usage-aggregated"],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("agent_usage_records" as any)
        .select("agent_id, final_price, billed_from_plan")
        .gte("created_at", monthStart.toISOString());
      if (error) throw error;

      const records = (data || []) as any[];
      const totalSpent = records.reduce((s: number, r: any) => s + Number(r.final_price), 0);
      const totalPaid = records.filter((r: any) => !r.billed_from_plan).reduce((s: number, r: any) => s + Number(r.final_price), 0);

      const byAgent: Record<string, number> = {};
      for (const r of records) {
        byAgent[r.agent_id] = (byAgent[r.agent_id] || 0) + Number(r.final_price);
      }

      return { totalSpent, totalPaid, totalActions: records.length, byAgent };
    },
  });
}

export default function AdminAgentBillingDashboard() {
  const { data: billings, isLoading: blLoading } = useAllAgentBilling();
  const { data: agg, isLoading: aggLoading } = useAllUsageAggregated();
  const { data: actionTypes } = useMonetizedActionTypes();
  const { data: plans } = useAgentPlans();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">Agent Billing Dashboard</h2>

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Total Spend (Month)</div>
          <p className="text-2xl font-bold">{aggLoading ? "…" : (agg?.totalSpent?.toFixed(1) ?? 0)} credits</p>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Paid Actions</div>
          <p className="text-2xl font-bold">{agg?.totalPaid?.toFixed(1) ?? 0} credits</p>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Total Actions</div>
          <p className="text-2xl font-bold">{agg?.totalActions ?? 0}</p>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Active Agents</div>
          <p className="text-2xl font-bold">{billings?.filter((b: any) => b.is_active).length ?? 0}</p>
        </Card>
      </div>

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="actions">Action Types</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4">
          {blLoading ? <Skeleton className="h-32" /> : (
            <Card className="p-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2">Agent</th>
                    <th className="text-left py-2">Plan</th>
                    <th className="text-right py-2">Limit</th>
                    <th className="text-right py-2">Month Spend</th>
                    <th className="text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(billings || []).map((b: any) => (
                    <tr key={b.id} className="border-b border-border/50">
                      <td className="py-1.5 font-medium">{b.agents?.name || b.agent_id?.slice(0, 8)}</td>
                      <td className="py-1.5">{b.agent_plans?.label || "—"}</td>
                      <td className="text-right py-1.5">{b.monthly_spend_limit ?? "∞"}</td>
                      <td className="text-right py-1.5 font-semibold">
                        {(agg?.byAgent?.[b.agent_id] ?? 0).toFixed(1)}
                      </td>
                      <td className="text-center py-1.5">
                        <Badge variant={b.is_active ? "default" : "destructive"} className="text-[10px]">
                          {b.is_active ? "Active" : "Paused"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <Card className="p-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2">Code</th>
                  <th className="text-left py-2">Label</th>
                  <th className="text-right py-2">Base Price</th>
                  <th className="text-left py-2">Sensitivity</th>
                </tr>
              </thead>
              <tbody>
                {(actionTypes || []).map((at: any) => (
                  <tr key={at.id} className="border-b border-border/50">
                    <td className="py-1.5 font-mono">{at.code}</td>
                    <td className="py-1.5">{at.label}</td>
                    <td className="text-right py-1.5 font-semibold">{at.base_price}</td>
                    <td className="py-1.5"><Badge variant="outline" className="text-[10px]">{at.default_sensitivity}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(plans || []).map((p: any) => (
              <Card key={p.id} className="p-4">
                <h4 className="font-semibold mb-1">{p.label}</h4>
                <p className="text-2xl font-bold text-primary">{p.monthly_price} <span className="text-sm font-normal text-muted-foreground">credits/mo</span></p>
                <div className="mt-3 space-y-1">
                  {Object.entries(p.quota_json || {}).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="font-mono text-muted-foreground">{k}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
