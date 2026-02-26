import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Zap, Clock } from "lucide-react";
import { format } from "date-fns";

interface Props {
  agentId: string;
}

export default function AgentActivityTab({ agentId }: Props) {
  const { data: usage, isLoading } = useQuery({
    queryKey: ["agent-activity-feed", agentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_usage_records" as any)
        .select("*, monetized_action_types(code, label)")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" /> Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!usage?.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No activity recorded yet.</p>
        ) : (
          <div className="space-y-0">
            {usage.map((record: any, i: number) => (
              <div key={record.id} className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
                <div className="mt-0.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(record.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                    <span className="text-xs">—</span>
                    <Badge variant="outline" className="text-[10px]">
                      {record.monetized_action_types?.label || record.monetized_action_types?.code || "Action"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    {record.resource_type && (
                      <span className="text-muted-foreground">
                        Resource: <span className="text-foreground">{record.resource_type}</span>
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      Sensitivity: <Badge variant="secondary" className="text-[9px]">{record.sensitivity}</Badge>
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <Zap className="h-3 w-3" />
                    {Number(record.final_price).toFixed(1)}
                  </div>
                  {record.billed_from_plan && (
                    <Badge variant="secondary" className="text-[9px] mt-0.5">plan</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
