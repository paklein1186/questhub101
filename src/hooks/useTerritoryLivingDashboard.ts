import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TerritoryLivingDashboardData {
  natural_systems_count: number;
  natural_systems_by_type: Record<string, number>;
  avg_health_index: number;
  critical_systems_count: number;
  stressed_systems_count: number;
  stable_systems_count: number;
  thriving_systems_count: number;
  eco_quests_last_30d: number;
  eco_quests_completed_last_30d: number;
  unique_stewards_last_30d: number;
  active_guilds_last_30d: number;
  credits_budgeted_last_90d: number;
  credits_spent_last_90d: number;
  xp_from_eco_quests_last_90d: number;
  biopoints_distributed_last_90d: number;
  top_steward_users: {
    user_id: string;
    display_name: string;
    total_steward_weight: number;
    eco_quests_count: number;
  }[];
  top_steward_guilds: {
    guild_id: string;
    name: string;
    total_steward_weight: number;
    eco_quests_count: number;
  }[];
  mini_otg_graph: {
    nodes: { type: string; id: string }[];
    edges: {
      from_type: string;
      from_id: string;
      to_type: string;
      to_id: string;
      edge_type: string;
      weight: number;
    }[];
  };
}

export function useTerritoryLivingDashboard(territoryId: string | undefined) {
  return useQuery<TerritoryLivingDashboardData>({
    queryKey: ["territory-living-dashboard", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_territory_living_dashboard" as any,
        { p_territory_id: territoryId! }
      );
      if (error) throw error;
      return data as unknown as TerritoryLivingDashboardData;
    },
  });
}

export interface TerritoryNaturalSystem {
  id: string;
  name: string;
  kingdom: string;
  system_type: string;
  health_index: number;
  resilience_index: number;
  regenerative_potential: number;
  picture_url: string | null;
  description: string | null;
  tags: string[] | null;
  location_text: string | null;
  source_url: string | null;
  created_at: string;
}

export function useTerritoryNaturalSystems(territoryId: string | undefined) {
  return useQuery<TerritoryNaturalSystem[]>({
    queryKey: ["territory-natural-systems-rpc", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { getAllTerritoryIds } = await import("@/lib/territoryIds");
      const ids = await getAllTerritoryIds(territoryId!);

      // 1. Try RPC (only queries natural_system_territories for the single territory)
      const { data: rpcData } = await supabase.rpc(
        "get_territory_natural_systems" as any,
        { p_territory_id: territoryId! }
      );
      const rpcSystems = (rpcData ?? []) as unknown as TerritoryNaturalSystem[];

      // 2. Also fetch from natural_system_links (used by bioregion creation)
      const { data: linkData } = await (supabase
        .from("natural_system_links" as any)
        .select("natural_system_id, natural_systems(id, name, kingdom, system_type, health_index, resilience_index, regenerative_potential, picture_url, description, tags, location_text, source_url, created_at)") as any)
        .in("linked_id", ids)
        .eq("linked_type", "territory");

      const linkSystems: TerritoryNaturalSystem[] = ((linkData ?? []) as any[])
        .map((r: any) => r.natural_systems)
        .filter(Boolean)
        .map((ns: any) => ({
          id: ns.id,
          name: ns.name,
          kingdom: ns.kingdom ?? "",
          system_type: ns.system_type ?? "",
          health_index: ns.health_index ?? 0,
          resilience_index: ns.resilience_index ?? 0,
          regenerative_potential: ns.regenerative_potential ?? 0,
          picture_url: ns.picture_url,
          description: ns.description,
          tags: ns.tags,
          location_text: ns.location_text,
          source_url: ns.source_url,
          created_at: ns.created_at,
        }));

      // 3. Merge & deduplicate
      const seen = new Set<string>();
      const merged: TerritoryNaturalSystem[] = [];
      for (const ns of [...rpcSystems, ...linkSystems]) {
        if (!seen.has(ns.id)) {
          seen.add(ns.id);
          merged.push(ns);
        }
      }
      return merged;
    },
  });
}
