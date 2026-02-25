import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  NaturalSystem,
  LinkedNaturalSystem,
  TerritoryNaturalSystemsSummary,
  OpenTrustEdge,
  NsLinkType,
  NaturalSystemKingdom,
  NaturalSystemTypeV2,
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

/* ── Linked natural systems via RPC ── */
export function useLinkedNaturalSystems(
  linkedType: NsLinkType | undefined,
  linkedId: string | undefined
) {
  return useQuery<LinkedNaturalSystem[]>({
    queryKey: ["linked-natural-systems", linkedType, linkedId],
    enabled: !!linkedType && !!linkedId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_linked_natural_systems" as any,
        { p_linked_type: linkedType!, p_linked_id: linkedId! }
      );
      if (error) throw error;
      return (data ?? []) as unknown as LinkedNaturalSystem[];
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

/* ── Create a natural system (legacy direct insert) ── */
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

/* ── Create & link natural system via RPC ── */
export function useCreateAndLinkNaturalSystem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      kingdom: NaturalSystemKingdom;
      system_type: NaturalSystemTypeV2;
      description?: string;
      territory_id?: string;
      location_text?: string;
      picture_url?: string;
      source_url?: string;
      tags?: string[];
      linked_type?: NsLinkType;
      linked_id?: string;
    }) => {
      const { data, error } = await supabase.rpc(
        "create_and_link_natural_system" as any,
        {
          p_name: input.name,
          p_kingdom: input.kingdom,
          p_system_type: input.system_type,
          p_description: input.description ?? "",
          p_territory_id: input.territory_id ?? null,
          p_location_text: input.location_text ?? null,
          p_picture_url: input.picture_url ?? null,
          p_source_url: input.source_url ?? null,
          p_tags: input.tags ?? [],
          p_linked_type: input.linked_type ?? null,
          p_linked_id: input.linked_id ?? null,
        }
      );
      if (error) throw error;
      return data as unknown as string; // uuid
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["linked-natural-systems"] });
      qc.invalidateQueries({ queryKey: ["natural-systems"] });
    },
  });
}

/* ── Link existing natural system to a unit ── */
export function useLinkNaturalSystem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      natural_system_id: string;
      linked_type: NsLinkType;
      linked_id: string;
    }) => {
      const { error } = await supabase.rpc("link_natural_system" as any, {
        p_natural_system_id: input.natural_system_id,
        p_linked_type: input.linked_type,
        p_linked_id: input.linked_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["linked-natural-systems"] });
    },
  });
}

/* ── Search all natural systems (for link picker) ── */
export function useSearchNaturalSystems(search: string) {
  return useQuery<NaturalSystem[]>({
    queryKey: ["natural-systems-search", search],
    enabled: search.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("natural_systems" as any)
        .select("*")
        .eq("is_deleted", false)
        .ilike("name", `%${search}%`)
        .limit(20)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as NaturalSystem[];
    },
  });
}
