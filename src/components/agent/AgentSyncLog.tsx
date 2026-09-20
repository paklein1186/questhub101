import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Run {
  id: string;
  created_at: string;
  trigger: "manual" | "cron";
  dry_run: boolean;
  ok: boolean;
  duration_ms: number | null;
  summary: Record<string, any>;
}

const fetchRuns = async (agentId: string, limit: number, realOnly = false): Promise<Run[]> => {
  let q = (supabase as any).from("agent_sync_runs").select("*").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(limit);
  if (realOnly) q = q.eq("dry_run", false);
  const { data } = await q;
  return (data ?? []) as Run[];
};

const errorCount = (r: Run) => (Array.isArray(r.summary?.errors) ? r.summary.errors.length : 0) + (r.summary?.error ? 1 : 0);

/** One line on the agent card: when it last synced and whether it needs attention, plus the journal. */
export function AgentSyncStatus({ agentId }: { agentId: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: last } = useQuery({
    queryKey: ["agent-sync-last", agentId],
    queryFn: async () => (await fetchRuns(agentId, 1, true))[0] ?? null,
  });
  const errors = last ? errorCount(last) : 0;

  return (
    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
      {last ? (
        <>
          {errors > 0
            ? <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
          <span>{t("syncLog.last", { date: new Date(last.created_at).toLocaleString(i18n.language) })}</span>
          {errors > 0 && <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">{t("syncLog.needsAttention", { count: errors })}</Badge>}
        </>
      ) : (
        <span>{t("syncLog.never")}</span>
      )}
      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setOpen(true)}>
        <ScrollText className="h-3 w-3 mr-1" /> {t("syncLog.open")}
      </Button>
      {open && <AgentSyncLogDialog agentId={agentId} onClose={() => setOpen(false)} />}
    </div>
  );
}

function AgentSyncLogDialog({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { data: runs, isLoading } = useQuery({
    queryKey: ["agent-sync-runs", agentId],
    queryFn: () => fetchRuns(agentId, 30),
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t("syncLog.title")}</DialogTitle></DialogHeader>
        {isLoading ? null : !runs?.length ? (
          <p className="text-sm text-muted-foreground">{t("syncLog.empty")}</p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => {
              const s = r.summary ?? {};
              const errs: string[] = Array.isArray(s.errors) ? s.errors : [];
              if (s.error) errs.unshift(String(s.error));
              const lists: [string, string[]][] = [
                [t("syncLog.newTerritories"), s.new_territories ?? []],
                [t("syncLog.unmatchedPlaces"), s.unmatched_places ?? []],
              ];
              const remaining = (s.skipped_over_limit ?? 0) + (s.geocode_remaining ?? 0);
              return (
                <details key={r.id} className="rounded-lg border border-border px-3 py-2 text-sm" open={!r.ok && !r.dry_run && runs[0]?.id === r.id}>
                  <summary className="cursor-pointer flex items-center gap-2 flex-wrap">
                    {r.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
                    <span className="font-medium">{new Date(r.created_at).toLocaleString(i18n.language)}</span>
                    <Badge variant="secondary" className="text-[10px]">{r.dry_run ? t("syncLog.simulation") : t("syncLog.real")}</Badge>
                    <Badge variant="outline" className="text-[10px]">{t(r.trigger === "cron" ? "syncLog.auto" : "syncLog.manual")}</Badge>
                    {!r.ok && <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">{t("syncLog.needsAttention", { count: errs.length })}</Badge>}
                    {r.duration_ms != null && <span className="text-xs text-muted-foreground ml-auto">{(r.duration_ms / 1000).toFixed(1)} s</span>}
                  </summary>
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {t("agentsUi.syncSummary", { fetched: s.fetched ?? 0, created: s.created ?? 0, updated: s.updated ?? 0, events: s.events_sent ?? 0, errors: errs.length })}
                      {s.photos ? ` · ${t("syncLog.photos", { count: s.photos })}` : ""}
                      {remaining ? ` · ${t("agentsUi.syncRemaining", { count: remaining })}` : ""}
                    </p>
                    {lists.filter(([, l]) => l.length).map(([label, l]) => (
                      <p key={label} className="text-xs"><span className="font-medium">{label} :</span> {l.join(", ")}</p>
                    ))}
                    {errs.length > 0 && (
                      <ul className="text-xs list-disc pl-5 space-y-0.5 text-amber-800 dark:text-amber-300">
                        {errs.map((e, i) => <li key={i} className="break-words">{e}</li>)}
                      </ul>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
