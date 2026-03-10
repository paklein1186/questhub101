import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, X, Eye, Loader2 } from "lucide-react";

export default function AdminDistributionConcerns() {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-distribution-concerns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("distribution_unfairness_reports" as any)
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // Fetch quest names
  const questIds = [...new Set(reports.map((r: any) => r.quest_id))];
  const { data: quests = [] } = useQuery({
    queryKey: ["admin-concern-quests", questIds.join(",")],
    queryFn: async () => {
      if (questIds.length === 0) return [];
      const { data } = await supabase.from("quests").select("id, title").in("id", questIds);
      return (data ?? []) as any[];
    },
    enabled: questIds.length > 0,
  });
  const questMap = new Map(quests.map((q: any) => [q.id, q.title]));

  // Fetch reporter names
  const reporterIds = [...new Set(reports.map((r: any) => r.reporter_user_id))];
  const { data: reporters = [] } = useQuery({
    queryKey: ["admin-concern-reporters", reporterIds.join(",")],
    queryFn: async () => {
      if (reporterIds.length === 0) return [];
      const { data } = await supabase.from("profiles_public").select("user_id, name").in("user_id", reporterIds);
      return (data ?? []) as any[];
    },
    enabled: reporterIds.length > 0,
  });
  const reporterMap = new Map(reporters.map((r: any) => [r.user_id, r.name]));

  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const updateStatus = async (id: string, status: string) => {
    setProcessing(true);
    const update: any = { status };
    if (status === "resolved") {
      update.resolved_by = currentUser.id;
      update.resolved_at = new Date().toISOString();
      update.superadmin_note = resolveNote || null;
    }
    await supabase.from("distribution_unfairness_reports" as any).update(update).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-distribution-concerns"] });
    toast({ title: `Report ${status}` });
    setProcessing(false);
    setResolveOpen(false);
    setResolveNote("");
  };

  const sevColor = (s: string) => {
    if (s === "high") return "bg-destructive/10 text-destructive border-destructive/30";
    if (s === "medium") return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
    return "bg-muted text-muted-foreground";
  };

  const statusColor = (s: string) => {
    if (s === "resolved") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    if (s === "reviewing") return "bg-primary/10 text-primary";
    if (s === "dismissed") return "bg-muted text-muted-foreground";
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" /> Distribution Concerns
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Confidential reports from contributors about distribution fairness.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No distribution concerns reported.</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left p-3 font-medium">Quest</th>
                <th className="text-left p-3 font-medium">Reporter</th>
                <th className="text-left p-3 font-medium">Severity</th>
                <th className="text-left p-3 font-medium">Currency</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r: any) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium max-w-[200px] truncate">
                    {questMap.get(r.quest_id) ?? r.quest_id.slice(0, 8)}
                  </td>
                  <td className="p-3">{reporterMap.get(r.reporter_user_id) ?? "Unknown"}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={`text-[10px] capitalize ${sevColor(r.severity)}`}>
                      {r.severity}
                    </Badge>
                  </td>
                  <td className="p-3 capitalize text-xs">{r.currency}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={`text-[10px] capitalize ${statusColor(r.status)}`}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === "open" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(r.id, "reviewing")}>
                          <Eye className="h-3 w-3 mr-1" /> Review
                        </Button>
                      )}
                      {(r.status === "open" || r.status === "reviewing") && (
                        <>
                          <Button
                            size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => { setResolveId(r.id); setResolveNote(""); setResolveOpen(true); }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
                            onClick={() => updateStatus(r.id, "dismissed")}
                          >
                            <X className="h-3 w-3 mr-1" /> Dismiss
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Expandable detail row when clicked */}
          {reports.map((r: any) => (
            <details key={`detail-${r.id}`} className="border-t border-border">
              <summary className="px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-muted/30">
                View reason — {r.id.slice(0, 8)}
              </summary>
              <div className="px-3 pb-3 text-sm">
                <p className="whitespace-pre-line">{r.reason}</p>
                {r.superadmin_note && (
                  <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
                    <strong>Admin note:</strong> {r.superadmin_note}
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Resolve dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Concern</DialogTitle>
            <DialogDescription>Add an internal note (not visible to the reporter).</DialogDescription>
          </DialogHeader>
          <Textarea
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            placeholder="Internal resolution note..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
            <Button onClick={() => resolveId && updateStatus(resolveId, "resolved")} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
