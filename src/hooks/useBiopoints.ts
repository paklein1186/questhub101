import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BiopointsTransaction, BiopointsBudget, EcoRewardConfig } from "@/types/biopoints";

/* ── User biopoints balance (from profile) ── */
export function useBiopointsBalance(userId: string | undefined) {
  return useQuery<number>({
    queryKey: ["biopoints-balance", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("biopoints_balance")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return (data as any)?.biopoints_balance ?? 0;
    },
  });
}

/* ── Biopoints transactions for current user ── */
export function useBiopointsTransactions(userId: string | undefined) {
  return useQuery<BiopointsTransaction[]>({
    queryKey: ["biopoints-transactions", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biopoints_transactions" as any)
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as BiopointsTransaction[];
    },
  });
}

/* ── Biopoints budgets for a natural system ── */
export function useBiopointsBudgets(naturalSystemId: string | undefined) {
  return useQuery<BiopointsBudget[]>({
    queryKey: ["biopoints-budgets", naturalSystemId],
    enabled: !!naturalSystemId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biopoints_budgets" as any)
        .select("*")
        .eq("natural_system_id", naturalSystemId!)
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as unknown as BiopointsBudget[];
    },
  });
}

/* ── Allocate a biopoints budget ── */
export function useAllocateBiopointsBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      natural_system_id: string;
      territory_id?: string;
      total_budget: number;
      health_threshold?: number;
      evaluation_months?: number;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.from("biopoints_budgets" as any).insert({
        natural_system_id: input.natural_system_id,
        territory_id: input.territory_id || null,
        allocated_by_user_id: userId,
        total_budget: input.total_budget,
        remaining_budget: input.total_budget,
        health_threshold: input.health_threshold ?? 5,
        evaluation_months: input.evaluation_months ?? 6,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["biopoints-budgets", vars.natural_system_id] });
    },
  });
}

/* ── Eco reward config (admin-tunable) ── */
export function useEcoRewardConfig() {
  return useQuery<EcoRewardConfig>({
    queryKey: ["eco-reward-config"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cooperative_settings")
        .select("value")
        .eq("key", "eco_quest_rewards")
        .single();
      if (error) throw error;
      return data.value as unknown as EcoRewardConfig;
    },
  });
}

/* ── Update eco reward config (admin only) ── */
export function useUpdateEcoRewardConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: EcoRewardConfig) => {
      const { error } = await supabase
        .from("cooperative_settings")
        .update({ value: config as any, updated_at: new Date().toISOString() })
        .eq("key", "eco_quest_rewards");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eco-reward-config"] });
    },
  });
}
