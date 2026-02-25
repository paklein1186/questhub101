import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  NaturalSystem,
  TerritoryNaturalSystemsSummary,
  OpenTrustEdge,
} from "@/types/naturalSystems";

/* ── Natural Systems per territory ── */
export function useNaturalSystems(territoryId: string | undefined) {
  return useQuery<NaturalSystem[]>({
    queryKey: ["natural-systems", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("natural_systems" as any)
        .select("*")
        .eq("territory_id", territoryId!)
        .eq("is_deleted", false)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as NaturalSystem[];
    },
  });
}

/* ── Territory summary view ── */
export function useTerritoryNaturalSummary(territoryId: string | undefined) {
  return useQuery<TerritoryNaturalSystemsSummary | null>({
    queryKey: ["territory-natural-summary", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_natural_systems_summary" as any)
        .select("*")
        .eq("territory_id", territoryId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as TerritoryNaturalSystemsSummary) ?? null;
    },
  });
}

/* ── Open Trust Edges for a territory ── */
export function useOpenTrustEdges(territoryId: string | undefined) {
  return useQuery<OpenTrustEdge[]>({
    queryKey: ["open-trust-edges", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("open_trust_edges" as any)
        .select("*")
        .eq("context_territory_id", territoryId!)
        .eq("visibility", "public");
      if (error) throw error;
      return (data ?? []) as unknown as OpenTrustEdge[];
    },
  });
}

/* ── Territory stewards via RPC ── */
export function useTerritorystewards(territoryId: string | undefined) {
  return useQuery({
    queryKey: ["territory-stewards", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_territory_stewards" as any,
        { p_territory_id: territoryId!, p_limit: 10 }
      );
      if (error) throw error;
      return (data ?? []) as unknown as OpenTrustEdge[];
    },
  });
}

/* ── Create a natural system ── */
export function useCreateNaturalSystem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<NaturalSystem, "id" | "created_at" | "updated_at" | "is_deleted">
    ) => {
      const { data, error } = await supabase
        .from("natural_systems" as any)
        .insert(input as any)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["natural-systems", vars.territory_id] });
      qc.invalidateQueries({ queryKey: ["territory-natural-summary", vars.territory_id] });
    },
  });
}
