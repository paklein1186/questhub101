import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ─── Types ─── */
export interface EcoImpactRule {
  id: string;
  quest_id: string;
  natural_system_id: string | null;
  target_indicator: string;
  comparison_type: string;
  target_value: unknown;
  reward_type: string;
  reward_amount: number;
  evaluation_period: string;
  is_active: boolean;
  is_fulfilled: boolean;
  fulfilled_at: string | null;
  created_by_user_id: string;
  created_at: string;
}

export interface EcoImpactEvent {
  id: string;
  rule_id: string | null;
  quest_id: string;
  natural_system_id: string | null;
  indicator_name: string;
  value_before: unknown;
  value_after: unknown;
  reward_type: string;
  reward_amount: number;
  narrative_text: string | null;
  beneficiary_user_ids: string[];
  created_at: string;
}

export interface EcoNarrative {
  id: string;
  natural_system_id: string | null;
  territory_id: string | null;
  quest_id: string | null;
  event_id: string | null;
  narrative_type: string;
  narrative_text: string;
  indicator_key: string | null;
  indicator_before: unknown;
  indicator_after: unknown;
  created_at: string;
}

/* ─── Hooks ─── */

export function useQuestEcoImpactRules(questId: string | undefined) {
  return useQuery<EcoImpactRule[]>({
    queryKey: ["eco-impact-rules", questId],
    enabled: !!questId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eco_impact_rules" as any)
        .select("*")
        .eq("quest_id", questId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EcoImpactRule[];
    },
  });
}

export function useCreateEcoImpactRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: {
      quest_id: string;
      natural_system_id?: string | null;
      target_indicator: string;
      comparison_type: string;
      target_value: unknown;
      reward_type: string;
      reward_amount: number;
      evaluation_period: string;
      created_by_user_id: string;
    }) => {
      const { error } = await supabase
        .from("eco_impact_rules" as any)
        .insert(rule as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["eco-impact-rules", vars.quest_id] });
    },
  });
}

export function useDeleteEcoImpactRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ruleId, questId }: { ruleId: string; questId: string }) => {
      const { error } = await supabase
        .from("eco_impact_rules" as any)
        .delete()
        .eq("id", ruleId);
      if (error) throw error;
      return questId;
    },
    onSuccess: (questId) => {
      qc.invalidateQueries({ queryKey: ["eco-impact-rules", questId] });
    },
  });
}

export function useQuestEcoImpactEvents(questId: string | undefined) {
  return useQuery<EcoImpactEvent[]>({
    queryKey: ["eco-impact-events", questId],
    enabled: !!questId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eco_impact_events" as any)
        .select("*")
        .eq("quest_id", questId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EcoImpactEvent[];
    },
  });
}

export function useEcoNarratives(naturalSystemId: string | undefined) {
  return useQuery<EcoNarrative[]>({
    queryKey: ["eco-narratives", naturalSystemId],
    enabled: !!naturalSystemId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eco_narratives" as any)
        .select("*")
        .eq("natural_system_id", naturalSystemId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as EcoNarrative[];
    },
  });
}

export function useEvaluateEcoImpact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (questId?: string) => {
      const { data, error } = await supabase.functions.invoke("evaluate-eco-impact", {
        body: questId ? { quest_id: questId } : {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eco-impact-events"] });
      qc.invalidateQueries({ queryKey: ["eco-narratives"] });
      qc.invalidateQueries({ queryKey: ["eco-impact-rules"] });
    },
  });
}
