import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { NaturalSystem, OpenTrustEdge } from "@/types/naturalSystems";

/** Fetch a single natural system by ID */
export function useNaturalSystem(id: string | undefined) {
  return useQuery<NaturalSystem | null>({
    queryKey: ["natural-system", id],
    enabled: !!id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("natural_systems" as any)
        .select("*")
        .eq("id", id!)
        .eq("is_deleted", false)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as NaturalSystem | null;
    },
  });
}

/** Links for a specific natural system */
export interface NsLink {
  id: string;
  linked_type: string;
  linked_id: string;
  linked_via: string;
  created_at: string;
}

export function useNaturalSystemLinks(naturalSystemId: string | undefined) {
  return useQuery<NsLink[]>({
    queryKey: ["ns-links", naturalSystemId],
    enabled: !!naturalSystemId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("natural_system_links" as any)
        .select("*")
        .eq("natural_system_id", naturalSystemId!);
      if (error) throw error;
      return (data ?? []) as unknown as NsLink[];
    },
  });
}

/** OTG steward_of edges pointing TO this natural system */
export function useNsStewardEdges(naturalSystemId: string | undefined) {
  return useQuery<OpenTrustEdge[]>({
    queryKey: ["ns-steward-edges", naturalSystemId],
    enabled: !!naturalSystemId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("open_trust_edges" as any)
        .select("*")
        .eq("to_id", naturalSystemId!)
        .eq("to_type", "natural_system")
        .eq("visibility", "public")
        .order("weight", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as OpenTrustEdge[];
    },
  });
}

/** Eco-quests targeting this natural system */
export interface NsQuest {
  id: string;
  title: string;
  status: string;
  quest_nature: string;
  created_at: string;
  completed_at: string | null;
  credit_budget: number | null;
  xp_reward: number | null;
}

export function useNsQuests(naturalSystemId: string | undefined) {
  return useQuery<NsQuest[]>({
    queryKey: ["ns-quests", naturalSystemId],
    enabled: !!naturalSystemId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quests" as any)
        .select("id, title, status, quest_nature, created_at, completed_at, credit_budget, xp_reward")
        .eq("natural_system_id", naturalSystemId!)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as NsQuest[];
    },
  });
}

/** Territory name lookup */
export function useTerritoryName(territoryId: string | null | undefined) {
  return useQuery<string | null>({
    queryKey: ["territory-name", territoryId],
    enabled: !!territoryId,
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territories")
        .select("name")
        .eq("id", territoryId!)
        .maybeSingle();
      if (error) throw error;
      return data?.name ?? null;
    },
  });
}

/** Profiles by IDs (for steward display names) */
export function useProfilesByIds(userIds: string[]) {
  return useQuery<{ user_id: string; name: string; avatar_url: string | null }[]>({
    queryKey: ["profiles-by-ids", userIds],
    enabled: userIds.length > 0,
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Guild names by IDs */
export function useGuildsByIds(guildIds: string[]) {
  return useQuery<{ id: string; name: string; logo_url: string | null }[]>({
    queryKey: ["guilds-by-ids", guildIds],
    enabled: guildIds.length > 0,
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guilds")
        .select("id, name, logo_url")
        .in("id", guildIds);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Distinct metrics available for a natural system */
export function useAvailableMetrics(naturalSystemId: string | undefined) {
  return useQuery<{ metric: string; source: string | null; unit: string | null; latest_at: string }[]>({
    queryKey: ["ns-available-metrics", naturalSystemId],
    enabled: !!naturalSystemId,
    staleTime: 60_000,
    queryFn: async () => {
      // Get distinct metrics with their latest data point
      const { data, error } = await supabase
        .from("natural_system_data_points" as any)
        .select("metric, source, unit, recorded_at")
        .eq("natural_system_id", naturalSystemId!)
        .order("recorded_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const byMetric = new Map<string, { metric: string; source: string | null; unit: string | null; latest_at: string }>();
      for (const r of rows) {
        if (!byMetric.has(r.metric)) {
          byMetric.set(r.metric, { metric: r.metric, source: r.source, unit: r.unit, latest_at: r.recorded_at });
        }
      }
      return Array.from(byMetric.values());
    },
  });
}
