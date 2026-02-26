import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, TrendingUp, Zap, Shield, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useAgentBillingProfile,
  useAgentUsageRecords,
  useAgentPlans,
  useAgentMonthlySpend,
} from "@/hooks/useAgentBilling";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface Props {
  agentId: string;
  agentCreatorId: string;
}

export default function AgentBillingTab({ agentId, agentCreatorId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: billing, isLoading: billingLoading } = useAgentBillingProfile(agentId);
  const { data: usage, isLoading: usageLoading } = useAgentUsageRecords(agentId);
  const { data: plans } = useAgentPlans();
  const { data: monthlyData } = useAgentMonthlySpend(agentId);

  const isOwner = user?.id === agentCreatorId;

  const [spendLimit, setSpendLimit] = useState<string>("");
  const [autoPause, setAutoPause] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const upsertBilling = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const payload: any = {
        agent_id: agentId,
        payer_type: "user",
        payer_id: user.id,
        monthly_spend_limit: spendLimit ? Number(spendLimit) : null,
        auto_pause_over_limit: autoPause,
        current_plan_id: selectedPlan || null,
      };
      if (billing?.id) {
        const { error } = await supabase
          .from("agent_billing_profiles" as any)
          .update(payload)
          .eq("id", billing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("agent_billing_profiles" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Billing profile updated");
      qc.invalidateQueries({ queryKey: ["agent-billing-profile", agentId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (billingLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" /> Month Spend
          </div>
          <p className="text-2xl font-bold">{monthlyData?.totalSpent?.toFixed(1) ?? 0} <span className="text-sm font-normal text-muted-foreground">credits</span></p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Zap className="h-4 w-4" /> Actions This Month
          </div>
          <p className="text-2xl font-bold">{monthlyData?.totalActions ?? 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Shield className="h-4 w-4" /> Plan
          </div>
          <p className="text-lg font-semibold">{billing?.agent_plans?.label || "No plan"}</p>
        </Card>
      </div>

      {/* Action breakdown */}
      {monthlyData?.byAction && Object.keys(monthlyData.byAction).length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Usage Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(monthlyData.byAction).map(([code, data]: [string, any]) => (
              <div key={code} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs">{code}</span>
                <div className="flex gap-4">
                  <span className="text-muted-foreground">{data.count} actions</span>
                  <span className="font-medium">{data.credits.toFixed(1)} credits</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Billing Settings (owner only) */}
      {isOwner && (
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Billing Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Subscription Plan</label>
              <Select value={selectedPlan || billing?.current_plan_id || ""} onValueChange={setSelectedPlan}>
                <SelectTrigger><SelectValue placeholder="No plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No plan</SelectItem>
                  {(plans || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label} — {p.monthly_price} credits/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Monthly Spend Limit (credits)</label>
              <Input
                type="number"
                value={spendLimit || billing?.monthly_spend_limit || ""}
                onChange={e => setSpendLimit(e.target.value)}
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={autoPause}
              onCheckedChange={setAutoPause}
            />
            <span className="text-sm">Auto-pause when over limit</span>
          </div>

          <Button onClick={() => upsertBilling.mutate()} disabled={upsertBilling.isPending} size="sm">
            Save Billing Settings
          </Button>
        </Card>
      )}

      {/* Recent Usage Log */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Recent Usage</h3>
        {usageLoading ? (
          <Skeleton className="h-32" />
        ) : !usage?.length ? (
          <p className="text-sm text-muted-foreground">No usage records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-2">Action</th>
                  <th className="text-right py-2 px-2">Base</th>
                  <th className="text-right py-2 px-2">Trust×</th>
                  <th className="text-right py-2 px-2">Sens×</th>
                  <th className="text-right py-2 px-2">Val×</th>
                  <th className="text-right py-2 px-2">Final</th>
                  <th className="text-right py-2 pl-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-1.5 pr-2">
                      <Badge variant="outline" className="text-[10px]">
                        {r.monetized_action_types?.code || "—"}
                      </Badge>
                      {r.billed_from_plan && (
                        <Badge variant="secondary" className="text-[10px] ml-1">plan</Badge>
                      )}
                    </td>
                    <td className="text-right py-1.5 px-2">{Number(r.base_price).toFixed(1)}</td>
                    <td className="text-right py-1.5 px-2">{Number(r.trust_multiplier).toFixed(2)}</td>
                    <td className="text-right py-1.5 px-2">{Number(r.sensitivity_multiplier).toFixed(1)}</td>
                    <td className="text-right py-1.5 px-2">{Number(r.value_multiplier).toFixed(1)}</td>
                    <td className="text-right py-1.5 px-2 font-semibold">{Number(r.final_price).toFixed(1)}</td>
                    <td className="text-right py-1.5 pl-2 text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
