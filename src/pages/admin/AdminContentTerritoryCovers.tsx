import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, Loader2, RefreshCw, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Status { total: number; done: number; remaining: number; next: { name: string; level: string; score: number }[] }
interface Processed { name: string; ok: boolean; error?: string }

export default function AdminContentTerritoryCovers() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<Processed[]>([]);
  const stop = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("generate-territory-cover", { body: { status: true } });
    if (error || data?.error) { toast.error(t("adminCovers.loadFailed")); return null; }
    setStatus(data as Status);
    return data as Status;
  }, [t]);

  useEffect(() => { load(); }, [load]);

  // Runs batches of 3 until nothing is left, the admin stops it, or the AI service refuses.
  const run = async (once: boolean) => {
    stop.current = false;
    setRunning(true);
    try {
      for (;;) {
        const { data, error } = await supabase.functions.invoke("generate-territory-cover", { body: { batch: true, limit: 3 } });
        if (error || data?.error) { toast.error(t("adminCovers.batchFailed")); break; }
        const done: Processed[] = data.processed ?? [];
        setLog((l) => [...done, ...l].slice(0, 60));
        await load();
        if (once || stop.current || (data.remaining ?? 0) === 0 || done.some((p) => !p.ok && /rate|credits/.test(p.error ?? "")) || done.every((p) => !p.ok)) break;
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <ImageIcon className="h-6 w-6 text-primary" /> {t("adminCovers.title")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("adminCovers.intro")}</p>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("adminCovers.progress")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {status ? (
            <>
              <p className="text-sm">{t("adminCovers.counts", { done: status.done, total: status.total })}</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${status.total ? (status.done / status.total) * 100 : 0}%` }} />
              </div>
              {status.next.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t("adminCovers.next")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {status.next.map((n) => <Badge key={n.name} variant="outline" className="text-xs">{n.name} · {n.score}</Badge>)}
                  </div>
                </div>
              )}
            </>
          ) : <Loader2 className="h-4 w-4 animate-spin" />}

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" disabled={running || !status?.remaining} onClick={() => run(true)}>
              {running ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />} {t("adminCovers.nextBatch")}
            </Button>
            <Button size="sm" variant="outline" disabled={running || !status?.remaining} onClick={() => run(false)}>{t("adminCovers.runAll")}</Button>
            {running && <Button size="sm" variant="ghost" onClick={() => { stop.current = true; }}><Square className="h-3.5 w-3.5 mr-1" /> {t("adminCovers.stop")}</Button>}
          </div>
          <p className="text-[11px] text-muted-foreground">{t("adminCovers.cost")}</p>
        </CardContent>
      </Card>

      {log.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-1 text-sm">
            {log.map((p, i) => (
              <p key={i} className={p.ok ? "" : "text-destructive"}>{p.ok ? "✓" : "✗"} {p.name}{p.error ? ` — ${p.error}` : ""}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
