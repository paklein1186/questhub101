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

type TimePeriod = "7d" | "quarter" | "year" | "all";

const TIME_PERIODS: { key: TimePeriod; label: string; icon: React.ReactNode }[] = [
  { key: "7d", label: "7 days", icon: <Clock className="h-3.5 w-3.5" /> },
  { key: "quarter", label: "Quarter", icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { key: "year", label: "Year", icon: <Calendar className="h-3.5 w-3.5" /> },
  { key: "all", label: "All time", icon: <Trophy className="h-3.5 w-3.5" /> },
];

function getDateFrom(period: TimePeriod): string | null {
  if (period === "all") return null;
  const now = new Date();
  if (period === "7d") now.setDate(now.getDate() - 7);
  else if (period === "quarter") now.setMonth(now.getMonth() - 3);
  else if (period === "year") now.setFullYear(now.getFullYear() - 1);
  return now.toISOString();
}

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

function useCtgLeaders(period: TimePeriod, limit = 10) {
  const dateFrom = getDateFrom(period);
  return useQuery<RankedUser[]>({
    queryKey: ["leaderboard-ctg", period, limit],
    staleTime: 120_000,
    queryFn: async () => {
      if (!dateFrom) {
        // All time: use balance
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
      }

      // Time-scoped: sum positive ctg_transactions
      const { data: txns } = await supabase
        .from("ctg_transactions")
        .select("user_id, amount")
        .gt("amount", 0)
        .gte("created_at", dateFrom);

      if (!txns?.length) return [];

      const sums = new Map<string, number>();
      for (const tx of txns) {
        sums.set(tx.user_id, (sums.get(tx.user_id) ?? 0) + tx.amount);
      }

      const sorted = [...sums.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

      const userIds = sorted.map(([id]) => id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, headline")
        .in("user_id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return sorted.map(([userId, total]) => {
        const p = profileMap.get(userId);
        return {
          user_id: userId,
          name: p?.name ?? "Unknown",
          avatar_url: p?.avatar_url ?? null,
          headline: p?.headline ?? null,
          value: Math.round(total),
        };
      });
    },
  });
}

function useXpLeaders(period: TimePeriod, limit = 10) {
  const dateFrom = getDateFrom(period);
  return useQuery<RankedUser[]>({
    queryKey: ["leaderboard-xp", period, limit],
    staleTime: 120_000,
    queryFn: async () => {
      if (!dateFrom) {
        // All time: use cumulative xp
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
      }

      // Time-scoped: sum xp_events
      const { data: events } = await supabase
        .from("xp_events")
        .select("user_id, amount")
        .gt("amount", 0)
        .gte("created_at", dateFrom);

      if (!events?.length) return [];

      const sums = new Map<string, number>();
      for (const e of events as any[]) {
        sums.set(e.user_id, (sums.get(e.user_id) ?? 0) + e.amount);
      }

      const sorted = [...sums.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

      const userIds = sorted.map(([id]) => id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, headline, xp_level")
        .in("user_id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

      return sorted.map(([userId, total]) => {
        const p = profileMap.get(userId);
        return {
          user_id: userId,
          name: p?.name ?? "Unknown",
          avatar_url: p?.avatar_url ?? null,
          headline: p?.headline ?? null,
          value: Math.round(total),
          secondary: `Level ${(p as any)?.xp_level ?? 1}`,
        };
      });
    },
  });
}

function useTrustLeaders(period: TimePeriod, limit = 10) {
  const dateFrom = getDateFrom(period);
  return useQuery<RankedUser[]>({
    queryKey: ["leaderboard-trust", period, limit],
    staleTime: 120_000,
    queryFn: async () => {
      let query = supabase
        .from("trust_edges")
        .select("to_node_id, score, created_at")
        .in("to_node_type", ["user", "profile"] as any)
        .eq("status", "active" as any);

      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }

      const { data: edges } = await query;
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

function useActiveTerritories(period: TimePeriod, limit = 10) {
  const dateFrom = getDateFrom(period);
  return useQuery<RankedTerritory[]>({
    queryKey: ["leaderboard-active-territories", period, limit],
    staleTime: 120_000,
    queryFn: async () => {
      const { data: territories } = await supabase
        .from("territories")
        .select("id, name, level")
        .eq("is_deleted", false);

      if (!territories?.length) return [];

      const tIds = territories.map((t) => t.id);

      // Build queries — optionally filter by created_at
      let userTerrQ = supabase.from("user_territories" as any).select("territory_id, created_at").in("territory_id", tIds);
      let questTerrQ = supabase.from("quest_territories").select("territory_id, quests!inner(created_at)").in("territory_id", tIds);
      let stewardQ = supabase.from("trust_edges")
        .select("to_node_id, created_at")
        .eq("edge_type", "stewardship" as any)
        .eq("status", "active" as any)
        .in("to_node_id", tIds);

      if (dateFrom) {
        userTerrQ = userTerrQ.gte("created_at", dateFrom);
        stewardQ = stewardQ.gte("created_at", dateFrom);
      }

      const [userTerr, questTerr, stewards] = await Promise.all([userTerrQ, questTerrQ, stewardQ]);

      // For quests, filter by quest created_at if time-scoped
      let questData = questTerr.data ?? [];
      if (dateFrom) {
        questData = questData.filter((r: any) => {
          const questDate = r.quests?.created_at;
          return questDate && questDate >= dateFrom;
        });
      }

      const count = (rows: any[] | null, field: string, id: string) =>
        (rows ?? []).filter((r: any) => r[field] === id).length;

      return territories
        .map((t) => {
          const humans = count(userTerr.data, "territory_id", t.id);
          const quests = count(questData, "territory_id", t.id);
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

interface RankedEntity {
  id: string;
  name: string;
  logo_url: string | null;
  type: "GUILD" | "COMPANY";
  value: number;
  secondary?: string;
}

function usePartnershipLeaders(period: TimePeriod, limit = 10) {
  const dateFrom = getDateFrom(period);
  return useQuery<RankedEntity[]>({
    queryKey: ["leaderboard-partnerships", period, limit],
    staleTime: 120_000,
    queryFn: async () => {
      let query = supabase
        .from("partnerships")
        .select("from_entity_type, from_entity_id, to_entity_type, to_entity_id, created_at")
        .eq("status", "ACCEPTED");

      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }

      const { data: rows } = await query;
      if (!rows?.length) return [];

      // Count partnerships per entity
      const counts: Record<string, { type: "GUILD" | "COMPANY"; count: number }> = {};
      for (const r of rows) {
        const fromKey = `${r.from_entity_type}:${r.from_entity_id}`;
        const toKey = `${r.to_entity_type}:${r.to_entity_id}`;
        if (!counts[fromKey]) counts[fromKey] = { type: r.from_entity_type as "GUILD" | "COMPANY", count: 0 };
        if (!counts[toKey]) counts[toKey] = { type: r.to_entity_type as "GUILD" | "COMPANY", count: 0 };
        counts[fromKey].count++;
        counts[toKey].count++;
      }

      const sorted = Object.entries(counts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, limit);

      // Fetch entity names
      const guildIds = sorted.filter(([k]) => k.startsWith("GUILD:")).map(([k]) => k.split(":")[1]);
      const companyIds = sorted.filter(([k]) => k.startsWith("COMPANY:")).map(([k]) => k.split(":")[1]);

      const nameMap: Record<string, { name: string; logo_url: string | null }> = {};

      const [guilds, companies] = await Promise.all([
        guildIds.length ? supabase.from("guilds").select("id, name, logo_url").in("id", guildIds) : { data: [] },
        companyIds.length ? supabase.from("companies").select("id, name, logo_url").in("id", companyIds) : { data: [] },
      ]);

      (guilds.data ?? []).forEach((g) => { nameMap[`GUILD:${g.id}`] = { name: g.name, logo_url: g.logo_url }; });
      (companies.data ?? []).forEach((c) => { nameMap[`COMPANY:${c.id}`] = { name: c.name, logo_url: c.logo_url }; });

      return sorted.map(([key, { type, count }]) => ({
        id: key.split(":")[1],
        name: nameMap[key]?.name ?? "Unknown",
        logo_url: nameMap[key]?.logo_url ?? null,
        type,
        value: count,
        secondary: type === "GUILD" ? "Guild" : "Company",
      }));
    },
  });
}

function EntitySection({
  title, subtitle, icon, accentClass, isLoading,
  entries, unitLabel,
}: SectionProps & { entries: RankedEntity[]; unitLabel: string }) {
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
        <p className="text-sm text-muted-foreground text-center py-8">No partnerships yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((entry, i) => (
            <Link
              key={entry.id}
              to={entry.type === "GUILD" ? `/guilds/${entry.id}` : `/companies/${entry.id}`}
              className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors ${i < 3 ? "bg-primary/[0.03]" : ""}`}
            >
              <span className={`w-6 text-center font-bold text-sm shrink-0 ${rankColor(i)}`}>
                {i + 1}
              </span>
              <Avatar className={`${i < 3 ? "h-9 w-9" : "h-7 w-7"} ${entry.type === "GUILD" ? "rounded-lg" : "rounded-full"}`}>
                <AvatarImage src={entry.logo_url ?? undefined} />
                <AvatarFallback className={entry.type === "GUILD" ? "rounded-lg" : ""}>
                  {entry.name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${i < 3 ? "text-sm" : "text-xs"}`}>{entry.name}</p>
                {entry.secondary && (
                  <p className="text-[11px] text-muted-foreground truncate">{entry.secondary}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {entry.value} {unitLabel}
              </Badge>
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
  const [period, setPeriod] = useState<TimePeriod>("all");

  const { data: ctgLeaders = [], isLoading: ctgLoading } = useCtgLeaders(period);
  const { data: xpLeaders = [], isLoading: xpLoading } = useXpLeaders(period);
  const { data: trustLeaders = [], isLoading: trustLoading } = useTrustLeaders(period);
  const { data: territories = [], isLoading: terrLoading } = useActiveTerritories(period);
  const { data: partnershipLeaders = [], isLoading: partLoading } = usePartnershipLeaders(period);

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

  const periodLabel = TIME_PERIODS.find((t) => t.key === period)?.label ?? "All time";
  const subtitleSuffix = period === "all" ? "" : ` (${periodLabel.toLowerCase()})`;

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
        <div className="flex items-center gap-2">
          {/* Time period selector */}
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
            {TIME_PERIODS.map((tp) => (
              <Button
                key={tp.key}
                variant={period === tp.key ? "default" : "ghost"}
                size="sm"
                className={`h-7 px-2.5 text-xs gap-1 ${period === tp.key ? "" : "text-muted-foreground"}`}
                onClick={() => setPeriod(tp.key)}
              >
                {tp.icon}
                <span className="hidden sm:inline">{tp.label}</span>
              </Button>
            ))}
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
      </div>

      {/* 4-section grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        <UserSection
          title="🟡 $CTG Champions"
          subtitle={period === "all" ? "Top contributors by $CTG token balance." : `Top $CTG earned${subtitleSuffix}.`}
          icon={<Coins className="h-5 w-5 text-amber-500" />}
          accentClass="bg-amber-500/5"
          isLoading={ctgLoading}
          entries={ctgLeaders}
          unitLabel="$CTG"
        />

        <TerritorySection
          title="🌍 Territory Pulse"
          subtitle={period === "all" ? "Most active territories by humans, quests & stewards." : `Territory activity${subtitleSuffix}.`}
          icon={<MapPin className="h-5 w-5 text-emerald-500" />}
          accentClass="bg-emerald-500/5"
          isLoading={terrLoading}
          entries={territories}
        />

        <UserSection
          title="⭐ XP Leaders"
          subtitle={period === "all" ? "Highest reputation by experience points." : `Most XP earned${subtitleSuffix}.`}
          icon={<Star className="h-5 w-5 text-primary" />}
          accentClass="bg-primary/5"
          isLoading={xpLoading}
          entries={xpLeaders}
          unitLabel="XP"
        />

        <UserSection
          title="🤝 Trust Network"
          subtitle={period === "all" ? "Most trusted humans by peer attestations." : `New attestations${subtitleSuffix}.`}
          icon={<Handshake className="h-5 w-5 text-blue-500" />}
          accentClass="bg-blue-500/5"
          isLoading={trustLoading}
          entries={trustLeaders}
          unitLabel="trust"
        />

        <EntitySection
          title="🏛️ Partnership Champions"
          subtitle={period === "all" ? "Entities with the most accepted partnerships." : `Partnerships formed${subtitleSuffix}.`}
          icon={<Shield className="h-5 w-5 text-violet-500" />}
          accentClass="bg-violet-500/5"
          isLoading={partLoading}
          entries={partnershipLeaders}
          unitLabel="alliances"
        />
      </div>
    </div>
  );
}
