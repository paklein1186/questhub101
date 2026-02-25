import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NsDataPoint {
  id: string;
  metric: string;
  value: number;
  unit: string | null;
  source: string | null;
  recorded_at: string;
}

export interface NsIndicator {
  indicator: string;
  value: number;
  computed_at: string;
}

export function useRecentDataPoints(
  naturalSystemId: string | undefined,
  metric?: string,
  sinceDays = 30
) {
  return useQuery<NsDataPoint[]>({
    queryKey: ["ns-data-points", naturalSystemId, metric, sinceDays],
    enabled: !!naturalSystemId,
    staleTime: 30_000,
    queryFn: async () => {
      const since = new Date(Date.now() - sinceDays * 86400_000).toISOString();
      const { data, error } = await supabase.rpc(
        "get_recent_data_points" as any,
        {
          p_natural_system_id: naturalSystemId!,
          p_metric: metric ?? null,
          p_since: since,
          p_limit: 500,
        }
      );
      if (error) throw error;
      return (data ?? []) as unknown as NsDataPoint[];
    },
  });
}

export function useLatestIndicators(
  naturalSystemId: string | undefined,
  indicator?: string
) {
  return useQuery<NsIndicator[]>({
    queryKey: ["ns-indicators", naturalSystemId, indicator],
    enabled: !!naturalSystemId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_latest_indicator" as any,
        {
          p_natural_system_id: naturalSystemId!,
          p_indicator: indicator ?? null,
        }
      );
      if (error) throw error;
      return (data ?? []) as unknown as NsIndicator[];
    },
  });
}
