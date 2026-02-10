import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  category: string;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ["feature-flags"];

/** Fetch all feature flags */
export function useFeatureFlags() {
  return useQuery<FeatureFlag[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_flags" as any)
        .select("*")
        .order("category")
        .order("label");
      if (error) throw error;
      return (data ?? []) as unknown as FeatureFlag[];
    },
    staleTime: 60_000,
  });
}

/** Check if a single feature is enabled */
export function useIsFeatureEnabled(key: string): boolean {
  const { data: flags = [] } = useFeatureFlags();
  const flag = flags.find((f) => f.key === key);
  return flag?.enabled ?? true; // default to enabled if flag not found
}

/** Toggle a feature flag (superadmin only) */
export function useToggleFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("feature_flags" as any)
        .update({ enabled } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

/** Standalone helper for imperative checks (pass flags array) */
export function isFeatureEnabled(flags: FeatureFlag[], key: string): boolean {
  const flag = flags.find((f) => f.key === key);
  return flag?.enabled ?? true;
}
