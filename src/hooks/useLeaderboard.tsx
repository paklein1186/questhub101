import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TimeScope = "WEEKLY" | "MONTHLY" | "ALL_TIME";

export interface LeaderboardEntry {
  user_id: string;
  helpful_score: number;
  creator_score: number;
  collaborator_score: number;
  territory_score: number;
  mentor_score: number;
  guild_score: number;
  rising_score: number;
  ai_score: number;
  profile?: { name: string; avatar_url: string | null; headline: string | null; persona_type: string };
}

export type DimensionKey =
  | "helpful"
  | "creator"
  | "collaborator"
  | "territory"
  | "mentor"
  | "guild"
  | "rising"
  | "ai";

export function useLeaderboard(timeScope: TimeScope) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", timeScope],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leaderboard_scores" as any)
        .select("*")
        .eq("time_scope", timeScope);
      if (error) throw error;

      const entries = (data ?? []) as unknown as LeaderboardEntry[];
      if (entries.length === 0) return [];

      // Fetch profiles
      const userIds = [...new Set(entries.map((e) => e.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, headline, persona_type")
        .in("user_id", userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      for (const entry of entries) {
        entry.profile = profileMap.get(entry.user_id) as any;
      }

      return entries;
    },
  });
}

export function useRefreshLeaderboard() {
  return async () => {
    const { error } = await supabase.functions.invoke("compute-leaderboard");
    if (error) throw error;
  };
}

export function getTopForDimension(
  entries: LeaderboardEntry[],
  dimension: DimensionKey,
  limit = 10
): (LeaderboardEntry & { score: number })[] {
  const scoreKey = `${dimension}_score` as keyof LeaderboardEntry;
  return [...entries]
    .map((e) => ({ ...e, score: (e[scoreKey] as number) || 0 }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
