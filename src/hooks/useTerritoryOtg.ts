import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ── */
export interface OtgSteward {
  node_type: string;
  node_id: string;
  node_name: string | null;
  node_avatar: string | null;
  total_weight: number;
  edge_count: number;
  tags: string[] | null;
}

export interface OtgGraphNode {
  id: string;
  type: string;
  name: string;
  is_center?: boolean;
  sys_type?: string;
  health?: number;
  avatar?: string | null;
}

export interface OtgGraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

export interface OtgGraphData {
  nodes: OtgGraphNode[];
  edges: OtgGraphEdge[];
}

/* ── Top stewards for a territory (enriched with names + avatars) ── */
export function useTerritoryOtgStewards(territoryId: string | undefined, limit = 10) {
  return useQuery<OtgSteward[]>({
    queryKey: ["territory-otg-stewards", territoryId, limit],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_territory_otg_stewards" as any,
        { p_territory_id: territoryId!, p_limit: limit }
      );
      if (error) throw error;
      return (data ?? []) as unknown as OtgSteward[];
    },
  });
}

/* ── Mini graph data for territory OTG visualization ── */
export function useTerritoryOtgGraph(territoryId: string | undefined, maxNodes = 20) {
  return useQuery<OtgGraphData>({
    queryKey: ["territory-otg-graph", territoryId, maxNodes],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_territory_otg_graph" as any,
        { p_territory_id: territoryId!, p_max_nodes: maxNodes }
      );
      if (error) throw error;
      return (data ?? { nodes: [], edges: [] }) as unknown as OtgGraphData;
    },
  });
}
