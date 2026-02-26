import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Coins, Bot, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEntityRevenueRecords } from "@/hooks/useAgentBilling";
import { format } from "date-fns";

interface Props {
  entityType: "guild" | "entity" | "territory";
  entityId: string;
  tableName: string; // guilds, companies, territories
  currentValueFactor?: number;
  allowCrawling?: boolean;
  allowSubscription?: boolean;
  canEdit: boolean;
}

const VALUE_FACTORS = [
  { value: "0.5", label: "Open (0.5×)" },
  { value: "1", label: "Normal (1×)" },
  { value: "2", label: "High value (2×)" },
  { value: "3", label: "Premium (3×)" },
];

export default function EntityMonetizationTab({
  entityType,
  entityId,
  tableName,
  currentValueFactor = 1,
  allowCrawling = false,
  allowSubscription = false,
  canEdit,
}: Props) {
  const qc = useQueryClient();
  const { data: revenue, isLoading } = useEntityRevenueRecords(entityType, entityId);

  const [vf, setVf] = useState(String(currentValueFactor));
  const [crawling, setCrawling] = useState(allowCrawling);
  const [subscription, setSubscription] = useState(allowSubscription);

  const totalEarned = (revenue || []).reduce((s: number, r: any) => s + Number(r.amount), 0);

  const saveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from(tableName as any)
        .update({
          value_factor: Number(vf),
          allow_agent_crawling: crawling,
          allow_agent_subscription: subscription,
        })
        .eq("id", entityId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Monetization settings updated");
      qc.invalidateQueries({ queryKey: [tableName] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Coins className="h-4 w-4" /> Revenue This Month
          </div>
          <p className="text-2xl font-bold">{totalEarned.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">credits</span></p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Bot className="h-4 w-4" /> Agent Actions
          </div>
          <p className="text-2xl font-bold">{revenue?.length || 0}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" /> Value Factor
          </div>
          <p className="text-2xl font-bold">{currentValueFactor}×</p>
        </Card>
      </div>

      {/* Settings */}
      {canEdit && (
        <Card className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">Monetization Settings</h3>

          <div>
            <label className="text-xs text-muted-foreground">Data Value Factor</label>
            <Select value={vf} onValueChange={setVf}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VALUE_FACTORS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={crawling} onCheckedChange={setCrawling} />
            <span className="text-sm">Allow agent crawling</span>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={subscription} onCheckedChange={setSubscription} />
            <span className="text-sm">Allow subscription access by agents</span>
          </div>

          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            Save Settings
          </Button>
        </Card>
      )}

      {/* Revenue Log */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Revenue from Agents</h3>
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : !revenue?.length ? (
          <p className="text-sm text-muted-foreground">No revenue records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2">Agent</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {revenue.map((r: any) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="py-1.5 text-muted-foreground">{r.agent_usage_records?.agent_id?.slice(0, 8) || "—"}</td>
                    <td className="text-right py-1.5 font-semibold">{Number(r.amount).toFixed(1)}</td>
                    <td className="text-right py-1.5 text-muted-foreground">
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
