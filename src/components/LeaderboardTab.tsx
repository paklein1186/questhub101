import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy, MapPin, Star, Handshake, Loader2, RefreshCw, Clock,
  Calendar, CalendarDays, Shield, Coins, TrendingUp, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useRefreshLeaderboard } from "@/hooks/useLeaderboard";
import { toast } from "sonner";

/* ── Types ── */

interface RankedUser {
  user_id: string;
  name: string;
  avatar_url: string | null;
  headline: string | null;
  value: number;
  secondary?: string;
}

interface RankedTerritory {
  id: string;
  name: string;
  level: string | null;
  value: number;
  secondary?: string;
}

/* ── Hooks ── */

function useCtgLeaders(limit = 10) {
  return useQuery<RankedUser[]>({
    queryKey: ["leaderboard-ctg", limit],
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, headline, ctg_balance")
        .gt("ctg_balance", 0)
        .order("ctg_balance", { ascending: false })
        .limit(limit);
      return (data ?? []).map((p) => ({
        user_id: p.user_id,
        name: p.name,
        avatar_url: p.avatar_url,
        headline: p.headline,
        value: p.ctg_balance,
      }));
    },
  });
}

function useXpLeaders(limit = 10) {
  return useQuery<RankedUser[]>({
    queryKey: ["leaderboard-xp", limit],
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, headline, xp, xp_level")
        .gt("xp", 0)
        .order("xp", { ascending: false })
        .limit(limit);
      return (data ?? []).map((p) => ({
        user_id: p.user_id,
        name: p.name,
        avatar_url: p.avatar_url,
        headline: p.headline,
        value: p.xp,
        secondary: `Level ${p.xp_level}`,
      }));
    },
  });
}

function useTrustLeaders(limit = 10) {
  return useQuery<RankedUser[]>({
    queryKey: ["leaderboard-trust", limit],
    staleTime: 120_000,
    queryFn: async () => {
      // Count active trust edges received per user
      const { data: edges } = await supabase
        .from("trust_edges")
        .select("to_node_id, score")
        .eq("to_node_type", "user" as any)
        .eq("status", "active" as any)
        .eq("edge_type", "trust" as any);

      if (!edges?.length) return [];

      const scores = new Map<string, { total: number; count: number }>();
      for (const e of edges as any[]) {
        const cur = scores.get(e.to_node_id) ?? { total: 0, count: 0 };
        cur.total += (e.score ?? 1);
        cur.count += 1;
        scores.set(e.to_node_id, cur);
      }

      const sorted = [...scores.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, limit);

      const userIds = sorted.map(([id]) => id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, headline")
        .in("user_id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return sorted.map(([userId, s]) => {
        const p = profileMap.get(userId);
        return {
          user_id: userId,
          name: p?.name ?? "Unknown",
          avatar_url: p?.avatar_url ?? null,
          headline: p?.headline ?? null,
          value: s.total,
          secondary: `${s.count} attestation${s.count > 1 ? "s" : ""}`,
        };
      });
    },
  });
}

function useActiveTerritories(limit = 10) {
  return useQuery<RankedTerritory[]>({
    queryKey: ["leaderboard-active-territories", limit],
    staleTime: 120_000,
    queryFn: async () => {
      const { data: territories } = await supabase
        .from("territories")
        .select("id, name, level")
        .eq("is_deleted", false);

      if (!territories?.length) return [];

      const tIds = territories.map((t) => t.id);

      const [userTerr, questTerr, stewards] = await Promise.all([
        supabase.from("user_territories" as any).select("territory_id").in("territory_id", tIds),
        supabase.from("quest_territories").select("territory_id").in("territory_id", tIds),
        supabase.from("trust_edges")
          .select("to_node_id")
          .eq("edge_type", "stewardship" as any)
          .eq("status", "active" as any)
          .in("to_node_id", tIds),
      ]);

      const count = (rows: any[] | null, field: string, id: string) =>
        (rows ?? []).filter((r: any) => r[field] === id).length;

      return territories
        .map((t) => {
          const humans = count(userTerr.data, "territory_id", t.id);
          const quests = count(questTerr.data, "territory_id", t.id);
          const stew = count(stewards.data, "to_node_id", t.id);
          const score = humans * 2 + quests * 5 + stew * 8;
          return {
            id: t.id,
            name: t.name,
            level: t.level,
            value: score,
            secondary: `${humans} humans · ${quests} quests · ${stew} steward${stew !== 1 ? "s" : ""}`,
          };
        })
        .filter((t) => t.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
    },
  });
}

/* ── Rank medal color ── */
function rankColor(i: number) {
  if (i === 0) return "text-yellow-500";
  if (i === 1) return "text-slate-400";
  if (i === 2) return "text-amber-600";
  return "text-muted-foreground";
}

/* ── Section Components ── */

interface SectionProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentClass: string;
  isLoading: boolean;
}

function UserSection({
  title, subtitle, icon, accentClass, isLoading,
  entries, unitLabel, linkPrefix = "/users/",
}: SectionProps & { entries: RankedUser[]; unitLabel: string; linkPrefix?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card overflow-hidden">
      <div className={`p-4 border-b border-border ${accentClass}`}>
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <h3 className="font-display font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No data yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((entry, i) => (
            <Link
              key={entry.user_id}
              to={`${linkPrefix}${entry.user_id}`}
              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors ${i < 3 ? "bg-primary/[0.03]" : ""}`}
            >
              <span className={`w-6 text-center font-bold text-sm shrink-0 ${rankColor(i)}`}>
                {i + 1}
              </span>
              <Avatar className={i < 3 ? "h-9 w-9" : "h-7 w-7"}>
                <AvatarImage src={entry.avatar_url ?? undefined} />
                <AvatarFallback>{entry.name?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${i < 3 ? "text-sm" : "text-xs"}`}>
                  {entry.name}
                </p>
                {i < 3 && entry.headline && (
                  <p className="text-[11px] text-muted-foreground truncate">{entry.headline}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <Badge variant="secondary" className="text-[10px]">
                  {entry.value.toLocaleString()} {unitLabel}
                </Badge>
                {entry.secondary && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{entry.secondary}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function TerritorySection({
  title, subtitle, icon, accentClass, isLoading,
  entries,
}: SectionProps & { entries: RankedTerritory[] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card overflow-hidden">
      <div className={`p-4 border-b border-border ${accentClass}`}>
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <h3 className="font-display font-semibold text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No territory data yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((t, i) => (
            <Link
              key={t.id}
              to={`/territories/${t.id}`}
              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors ${i < 3 ? "bg-primary/[0.03]" : ""}`}
            >
              <span className={`w-6 text-center font-bold text-sm shrink-0 ${rankColor(i)}`}>
                {i + 1}
              </span>
              <div className={`${i < 3 ? "h-9 w-9" : "h-7 w-7"} rounded-lg bg-primary/10 flex items-center justify-center shrink-0`}>
                <MapPin className={`${i < 3 ? "h-4 w-4" : "h-3.5 w-3.5"} text-primary`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${i < 3 ? "text-sm" : "text-xs"}`}>{t.name}</p>
                {t.secondary && (
                  <p className="text-[11px] text-muted-foreground truncate">{t.secondary}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {t.level && (
                  <Badge variant="outline" className="text-[9px] capitalize">{t.level.toLowerCase()}</Badge>
                )}
                <Badge variant="secondary" className="text-[10px]">{t.value} pts</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ── Main Component ── */

export default function LeaderboardTab() {
  const refreshLeaderboard = useRefreshLeaderboard();
  const [refreshing, setRefreshing] = useState(false);

  const { data: ctgLeaders = [], isLoading: ctgLoading } = useCtgLeaders();
  const { data: xpLeaders = [], isLoading: xpLoading } = useXpLeaders();
  const { data: trustLeaders = [], isLoading: trustLoading } = useTrustLeaders();
  const { data: territories = [], isLoading: terrLoading } = useActiveTerritories();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLeaderboard();
      toast.success("Leaderboard refreshed");
    } catch {
      toast.error("Failed to refresh leaderboard");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Leaderboard
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Recognizing value across the ecosystem.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* 4-section grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        <UserSection
          title="🟡 $CTG Champions"
          subtitle="Top contributors by $CTG token balance."
          icon={<Coins className="h-5 w-5 text-amber-500" />}
          accentClass="bg-amber-500/5"
          isLoading={ctgLoading}
          entries={ctgLeaders}
          unitLabel="$CTG"
        />

        <TerritorySection
          title="🌍 Territory Pulse"
          subtitle="Most active territories by humans, quests & stewards."
          icon={<MapPin className="h-5 w-5 text-emerald-500" />}
          accentClass="bg-emerald-500/5"
          isLoading={terrLoading}
          entries={territories}
        />

        <UserSection
          title="⭐ XP Leaders"
          subtitle="Highest reputation by experience points."
          icon={<Star className="h-5 w-5 text-primary" />}
          accentClass="bg-primary/5"
          isLoading={xpLoading}
          entries={xpLeaders}
          unitLabel="XP"
        />

        <UserSection
          title="🤝 Trust Network"
          subtitle="Most trusted humans by peer attestations."
          icon={<Handshake className="h-5 w-5 text-blue-500" />}
          accentClass="bg-blue-500/5"
          isLoading={trustLoading}
          entries={trustLeaders}
          unitLabel="trust"
        />
      </div>
    </div>
  );
}
