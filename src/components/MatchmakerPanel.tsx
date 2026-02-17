import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles, Compass, Shield, CircleDot, Users, Briefcase,
  Loader2, AlertCircle, RefreshCw, Lightbulb, Coins, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type MatchType = "user" | "guild" | "quest";

interface MatchmakerPanelProps {
  matchType: MatchType;
  userId?: string;
  guildId?: string;
  questId?: string;
  compact?: boolean;
}

interface MatchItem {
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  skill?: string;
  reason: string;
  suggestion?: string;
}

export function MatchmakerPanel({ matchType, userId, guildId, questId, compact }: MatchmakerPanelProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke("ai-match", {
        body: { matchType, userId, guildId, questId },
      });
      if (fnErr) throw fnErr;
      if (res?.error) {
        setError(res.error);
        toast({ title: "Matchmaker error", description: res.error, variant: "destructive" });
      } else {
        setData(res);
      }
    } catch (e: any) {
      const msg = e.message || "Something went wrong";
      setError(msg);
      toast({ title: "Matchmaker unavailable", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading && !error) {
    return (
      <div className={`rounded-xl border border-dashed border-primary/30 bg-primary/5 ${compact ? "p-3" : "p-5"} text-center`}>
        <Sparkles className="h-5 w-5 text-primary mx-auto mb-2" />
        <p className="text-sm font-medium mb-1">AI Matchmaker</p>
        <p className="text-xs text-muted-foreground mb-3">
          {matchType === "user" && "Discover quests, guilds, and collaborators tailored to you."}
          {matchType === "guild" && "Find ideal members and quests for this guild."}
          {matchType === "quest" && "Identify proposers, missing skills, and funding partners."}
        </p>
        <Button size="sm" onClick={run} disabled={loading}>
          <Sparkles className="h-4 w-4 mr-1" /> Get Recommendations
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Analyzing your profile...</p>
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

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-card p-5 space-y-4">
      {/* Summary */}
      {data.summary && (
        <p className="text-sm leading-relaxed">{data.summary}</p>
      )}

      {/* User matches */}
      {matchType === "user" && (
        <div className="space-y-3">
          <MatchSection icon={Compass} title="Recommended Quests" items={data.quests} labelKey="title" routePrefix="/quests" />
          <MatchSection icon={Shield} title="Recommended Guilds" items={data.guilds} labelKey="name" routePrefix="/guilds" />
          <MatchSection icon={CircleDot} title="Recommended Pods" items={data.pods} labelKey="name" routePrefix="/pods" />
          <MatchSection icon={Users} title="Collaborators to Seek" items={data.collaborators} labelKey="description" routePrefix="/profile" />
          <MatchSection icon={Briefcase} title="Services to Explore" items={data.services} labelKey="title" routePrefix="/services" />
        </div>
      )}

      {/* Guild matches */}
      {matchType === "guild" && (
        <div className="space-y-3">
          <MatchSection icon={Users} title="Recommended Members" items={data.recommendedUsers} labelKey="description" routePrefix="/profile" />
          <MatchSection icon={Compass} title="Recommended Quests" items={data.recommendedQuests} labelKey="title" routePrefix="/quests" />
        </div>
      )}

      {/* Quest matches */}
      {matchType === "quest" && (
        <div className="space-y-3">
          <MatchSection icon={Users} title="Potential Proposers" items={data.proposers} labelKey="description" routePrefix="/profile" />
          <MatchSection icon={Wrench} title="Missing Skills" items={data.missingSkills} labelKey="skill" extraKey="suggestion" />
          <MatchSection icon={Coins} title="Funding Partners" items={data.fundingPartners} labelKey="description" routePrefix="/companies" />
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

function MatchSection({ icon: Icon, title, items, labelKey, extraKey, routePrefix }: {
  icon: any; title: string; items?: MatchItem[]; labelKey: string; extraKey?: string; routePrefix?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <div className="space-y-1.5">
        {items.map((item, i) => {
          const href = routePrefix && item.id ? `${routePrefix}/${item.id}` : undefined;
          const Wrapper = href ? Link : "div";
          const wrapperProps = href ? { to: href } : {};
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}>
              <Wrapper {...(wrapperProps as any)}
                className={`flex items-start gap-2 rounded-lg border border-border bg-background p-2.5 transition-colors ${href ? "hover:bg-muted/60 cursor-pointer" : ""}`}>
                <Lightbulb className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{(item as any)[labelKey]}</p>
                  <p className="text-xs text-muted-foreground">{item.reason}</p>
                  {extraKey && (item as any)[extraKey] && (
                    <Badge variant="secondary" className="text-[10px] mt-1">{(item as any)[extraKey]}</Badge>
                  )}
                </div>
              </Wrapper>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
