import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GuildLeaderboardEntry {
  id: string;
  name: string;
  logo_url: string | null;
  member_count: number;
  quest_count: number;
  event_count: number;
  total_score: number;
}

export interface TerritoryLeaderboardEntry {
  id: string;
  name: string;
  quest_count: number;
  guild_count: number;
  pod_count: number;
  company_count: number;
  total_score: number;
}

export function useGuildLeaderboard() {
  return useQuery<GuildLeaderboardEntry[]>({
    queryKey: ["guild-leaderboard"],
    staleTime: 120_000,
    queryFn: async () => {
      const { data: guilds } = await supabase
        .from("guilds")
        .select("id, name, logo_url")
        .eq("is_deleted", false)
        .eq("is_draft", false);

      if (!guilds?.length) return [];

      const guildIds = guilds.map((g) => g.id);

      const [members, quests, events] = await Promise.all([
        supabase.from("guild_members").select("guild_id").in("guild_id", guildIds),
        supabase.from("quests").select("guild_id").in("guild_id", guildIds),
        supabase.from("guild_events").select("guild_id").in("guild_id", guildIds).eq("is_cancelled", false),
      ]);

      const count = (rows: any[] | null, field: string, id: string) =>
        (rows ?? []).filter((r) => r[field] === id).length;

      return guilds
        .map((g) => {
          const mc = count(members.data, "guild_id", g.id);
          const qc = count(quests.data, "guild_id", g.id);
          const ec = count(events.data, "guild_id", g.id);
          return {
            ...g,
            member_count: mc,
            quest_count: qc,
            event_count: ec,
            total_score: mc * 3 + qc * 5 + ec * 2,
          };
        })
        .filter((g) => g.total_score > 0)
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, 10);
    },
  });
}

export function useTerritoryLeaderboard() {
  return useQuery<TerritoryLeaderboardEntry[]>({
    queryKey: ["territory-leaderboard"],
    staleTime: 120_000,
    queryFn: async () => {
      const { data: territories } = await supabase
        .from("territories")
        .select("id, name");

      if (!territories?.length) return [];

      const tIds = territories.map((t) => t.id);

      const [quests, guilds, pods, companies] = await Promise.all([
        supabase.from("quest_territories").select("territory_id").in("territory_id", tIds),
        supabase.from("guild_territories").select("territory_id").in("territory_id", tIds),
        supabase.from("pod_territories").select("territory_id").in("territory_id", tIds),
        supabase.from("company_territories").select("territory_id").in("territory_id", tIds),
      ]);

      const count = (rows: any[] | null, id: string) =>
        (rows ?? []).filter((r) => r.territory_id === id).length;

      return territories
        .map((t) => {
          const qc = count(quests.data, t.id);
          const gc = count(guilds.data, t.id);
          const pc = count(pods.data, t.id);
          const cc = count(companies.data, t.id);
          return {
            ...t,
            quest_count: qc,
            guild_count: gc,
            pod_count: pc,
            company_count: cc,
            total_score: qc * 5 + gc * 4 + pc * 3 + cc * 2,
          };
        })
        .filter((t) => t.total_score > 0)
        .sort((a, b) => b.total_score - a.total_score)
        .slice(0, 10);
    },
  });
}
