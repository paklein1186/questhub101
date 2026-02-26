import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EnvironmentalDataset {
  id: string;
  title: string;
  source: string;
  granularity: string;
  fetch_method: string;
  metadata_schema: Record<string, unknown>;
  update_frequency: string;
  is_active: boolean;
  description: string | null;
  api_endpoint: string | null;
  created_at: string;
}

export interface TerritoryDatasetMatch {
  id: string;
  territory_id: string;
  dataset_id: string;
  match_level: string;
  matched_granularity: string;
  last_fetched_at: string | null;
  fetched_summary: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export function useEnvironmentalDatasets() {
  return useQuery<EnvironmentalDataset[]>({
    queryKey: ["environmental-datasets"],
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("environmental_datasets" as any)
        .select("*")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return (data ?? []) as unknown as EnvironmentalDataset[];
    },
  });
}

export function useTerritoryDatasetMatches(territoryId: string | undefined) {
  return useQuery<TerritoryDatasetMatch[]>({
    queryKey: ["territory-dataset-matches", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territory_dataset_matches" as any)
        .select("*")
        .eq("territory_id", territoryId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as unknown as TerritoryDatasetMatch[];
    },
  });
}

export function useMatchTerritoryDatasets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (territoryId: string) => {
      const { data, error } = await supabase.rpc(
        "match_territory_with_datasets" as any,
        { p_territory_id: territoryId }
      );
      if (error) throw error;
      return data as unknown as Array<{
        dataset_id: string;
        dataset_title: string;
        dataset_source: string;
        dataset_granularity: string;
        match_level: string;
        matched_at_granularity: string;
      }>;
    },
    onSuccess: (_, territoryId) => {
      qc.invalidateQueries({ queryKey: ["territory-dataset-matches", territoryId] });
    },
  });
}

export function useTerritoryPrecisionSettings(territoryId: string | undefined) {
  return useQuery({
    queryKey: ["territory-precision", territoryId],
    enabled: !!territoryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territories" as any)
        .select("precision_level, granularity, auto_expand_perimeter, custom_perimeter_name")
        .eq("id", territoryId!)
        .single();
      if (error) throw error;
      return data as unknown as {
        precision_level: string;
        granularity: string | null;
        auto_expand_perimeter: boolean;
        custom_perimeter_name: string | null;
      };
    },
  });
}

export function useUpdateTerritoryPrecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      territoryId,
      precision_level,
      granularity,
      auto_expand_perimeter,
      custom_perimeter_name,
    }: {
      territoryId: string;
      precision_level?: string;
      granularity?: string | null;
      auto_expand_perimeter?: boolean;
      custom_perimeter_name?: string | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (precision_level !== undefined) updates.precision_level = precision_level;
      if (granularity !== undefined) updates.granularity = granularity;
      if (auto_expand_perimeter !== undefined) updates.auto_expand_perimeter = auto_expand_perimeter;
      if (custom_perimeter_name !== undefined) updates.custom_perimeter_name = custom_perimeter_name;

      const { error } = await supabase
        .from("territories" as any)
        .update(updates as any)
        .eq("id", territoryId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["territory-precision", vars.territoryId] });
      qc.invalidateQueries({ queryKey: ["territory-dataset-matches", vars.territoryId] });
    },
  });
}
