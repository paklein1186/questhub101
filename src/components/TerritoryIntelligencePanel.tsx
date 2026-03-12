import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Compass, Shield, AlertTriangle, TrendingUp,
  Users, Loader2, AlertCircle, RefreshCw, Lightbulb, MapPin,
} from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TerritoryIntelligencePanelProps {
  territoryId: string;
  territoryName?: string;
  compact?: boolean;
}

export function TerritoryIntelligencePanel({ territoryId, territoryName, compact }: TerritoryIntelligencePanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke("territory-intelligence", {
        body: { territoryId },
      });
      if (fnErr) throw fnErr;
      if (res?.error) {
        setError(res.error);
        toast({ title: "Intelligence error", description: res.error, variant: "destructive" });
      } else {
        setData(res);
      }
    } catch (e: any) {
      const msg = e.message || "Something went wrong";
      setError(msg);
      toast({ title: "Intelligence unavailable", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading && !error) {
    return (
      <div className={`rounded-xl border border-dashed border-primary/30 bg-primary/5 ${compact ? "p-3" : "p-5"} text-center`}>
        <Brain className="h-5 w-5 text-primary mx-auto mb-2" />
        <p className="text-sm font-medium mb-1">Territorial Intelligence</p>
        <p className="text-xs text-muted-foreground mb-3">
          AI analysis of quests, guilds, gaps, collaborations, and funding priorities
          {territoryName ? ` in ${territoryName}` : ""}.
        </p>
        <Button size="sm" onClick={run}>
          <Brain className="h-4 w-4 mr-1" /> Analyze Territory
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Analyzing territorial data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-center">
        <AlertCircle className="h-5 w-5 text-destructive mx-auto mb-2" />
        <p className="text-sm text-destructive mb-2">{error}</p>
        <Button size="sm" variant="outline" onClick={run}><RefreshCw className="h-4 w-4 mr-1" /> Retry</Button>
      </div>
    );
  }

  const severityColor = (s: string) => {
    if (s === "high") return "bg-destructive/10 text-destructive border-0";
    if (s === "medium") return "bg-warning/10 text-warning border-0";
    return "bg-muted text-muted-foreground border-0";
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-card p-5 space-y-5">
      {/* Summary */}
      {data.summary && (
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* Active Quests */}
      <IntelSection icon={Compass} title="Active Quests" items={data.activeQuests} renderItem={(q: any, i: number) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
          className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5">
          <Compass className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{q.title}</p>
            <p className="text-xs text-muted-foreground">{q.insight}</p>
            {q.status && <Badge variant="outline" className="text-[10px] mt-1 capitalize">{q.status.toLowerCase()}</Badge>}
          </div>
        </motion.div>
      )} />

      {/* Active Guilds */}
      <IntelSection icon={Shield} title="Active Guilds" items={data.activeGuilds} renderItem={(g: any, i: number) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
          className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5">
          <Shield className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{g.name}</p>
            <p className="text-xs text-muted-foreground">{g.insight}</p>
            {g.focus && <Badge variant="secondary" className="text-[10px] mt-1">{g.focus}</Badge>}
          </div>
        </motion.div>
      )} />

      {/* Gaps */}
      <IntelSection icon={AlertTriangle} title="Territory Gaps" items={data.gaps} renderItem={(gap: any, i: number) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
          className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5">
          <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{gap.area}</p>
              <Badge className={`text-[10px] ${severityColor(gap.severity)}`}>{gap.severity}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{gap.description}</p>
          </div>
        </motion.div>
      )} />

      {/* Collaborations */}
      <IntelSection icon={Users} title="Suggested Collaborations" items={data.collaborations} renderItem={(c: any, i: number) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
          className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5">
          <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{c.description}</p>
            <p className="text-xs text-muted-foreground">{c.reason}</p>
            <div className="flex gap-1 mt-1">
              <Badge variant="outline" className="text-[10px] capitalize">{c.type?.replace(/-/g, " ")}</Badge>
              {c.potential && <Badge variant="secondary" className="text-[10px]">{c.potential} potential</Badge>}
            </div>
          </div>
        </motion.div>
      )} />

      {/* Funding Priorities */}
      <IntelSection icon={getCurrencyConfig("coins").icon} title="Funding Priorities" items={data.fundingPriorities} renderItem={(f: any, i: number) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
          className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5">
          <CurrencyIcon currency="coins" className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{f.area}</p>
            <p className="text-xs text-muted-foreground">{f.reason}</p>
            {f.estimatedImpact && <Badge variant="secondary" className="text-[10px] mt-1">Impact: {f.estimatedImpact}</Badge>}
          </div>
        </motion.div>
      )} />

      {/* Trends & Risks */}
      {(data.trends?.length > 0 || data.risks?.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.trends?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
                <TrendingUp className="h-3.5 w-3.5" /> Emerging Trends
              </p>
              <ul className="space-y-1">
                {data.trends.map((t: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-1.5">
                    <TrendingUp className="h-3 w-3 text-primary mt-1 shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.risks?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
                <AlertTriangle className="h-3.5 w-3.5" /> Risks
              </p>
              <ul className="space-y-1">
                {data.risks.map((r: string, i: number) => (
                  <li key={i} className="text-sm flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-warning mt-1 shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={run}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
        </Button>
      </div>
    </motion.div>
  );
}

function IntelSection({ icon: Icon, title, items, renderItem }: {
  icon: any; title: string; items?: any[]; renderItem: (item: any, i: number) => React.ReactNode;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <div className="space-y-1.5">{items.map(renderItem)}</div>
    </div>
  );
}
