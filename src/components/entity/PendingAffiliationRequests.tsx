import { useState } from "react";
import { Link2, CheckCircle2, XCircle, Loader2, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

interface Props {
  entityType: "GUILD" | "COMPANY";
  entityId: string;
  isAdmin: boolean;
}

interface PendingRequest {
  id: string;
  quest_id: string;
  quest_title: string;
  created_by_name: string;
  created_at: string;
}

export function PendingAffiliationRequests({ entityType, entityId, isAdmin }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["pending-affiliations", entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quest_affiliations" as any)
        .select("id, quest_id, created_by_user_id, created_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("status", "PENDING");
      if (error) throw error;
      const rows = (data ?? []) as any[];
      
      const results: PendingRequest[] = [];
      for (const row of rows) {
        const { data: quest } = await supabase.from("quests").select("title").eq("id", row.quest_id).maybeSingle();
        const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", row.created_by_user_id).maybeSingle();
        results.push({
          id: row.id,
          quest_id: row.quest_id,
          quest_title: quest?.title ?? "Untitled quest",
          created_by_name: profile?.name ?? "Unknown",
          created_at: row.created_at,
        });
      }
      return results;
    },
    enabled: isAdmin,
  });

  const handleApprove = async (id: string) => {
    setProcessing(id);
    const { error } = await supabase.rpc("approve_quest_affiliation", { _affiliation_id: id } as any);
    if (error) {
      toast({ title: "Error approving", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Affiliation approved", description: "The quest is now linked to this entity." });
      qc.invalidateQueries({ queryKey: ["pending-affiliations", entityType, entityId] });
      qc.invalidateQueries({ queryKey: ["quests-for-guild", entityId] });
      qc.invalidateQueries({ queryKey: ["quests-for-company", entityId] });
      qc.invalidateQueries({ queryKey: ["quest-hosts"] });
    }
    setProcessing(null);
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    const { error } = await supabase.rpc("reject_quest_affiliation", { _affiliation_id: id } as any);
    if (error) {
      toast({ title: "Error declining", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Affiliation declined" });
      qc.invalidateQueries({ queryKey: ["pending-affiliations", entityType, entityId] });
    }
    setProcessing(null);
  };

  if (!isAdmin || isLoading || requests.length === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardContent className="p-4 space-y-3">
        <h4 className="font-display font-semibold text-sm flex items-center gap-2">
          <Link2 className="h-4 w-4 text-amber-600" />
          Pending Quest Affiliations
          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">{requests.length}</Badge>
        </h4>
        <div className="space-y-2">
          {requests.map((req) => (
            <div key={req.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => navigate(`/quests/${req.quest_id}`)}
                  className="text-sm font-medium hover:text-primary transition-colors truncate block text-left"
                >
                  <Compass className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />
                  {req.quest_title}
                </button>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Requested by {req.created_by_name}
                </p>
              </div>
              <div className="flex items-center gap-1.5 ml-3 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => handleApprove(req.id)}
                  disabled={processing === req.id}
                >
                  {processing === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => handleReject(req.id)}
                  disabled={processing === req.id}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
